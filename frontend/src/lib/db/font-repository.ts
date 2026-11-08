import { query } from "./postgres";
import { toValidUUID } from "./dag-repository";

export interface DbFont {
  id: string;
  workspace_id: string | null;
  family_name: string;
  display_name: string;
  source_type: "google" | "custom_file" | "system";
  sha256_hash: string | null;
  file_url: string;
  format: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

export class FontRepository {
  private static tableEnsured = false;

  static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS fonts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
          family_name VARCHAR(128) NOT NULL,
          display_name VARCHAR(128) NOT NULL,
          source_type VARCHAR(32) NOT NULL,
          sha256_hash VARCHAR(64) UNIQUE,
          file_url TEXT NOT NULL,
          format VARCHAR(16),
          file_size_bytes INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_fonts_sha256 ON fonts(sha256_hash);
        CREATE INDEX IF NOT EXISTS idx_fonts_workspace ON fonts(workspace_id);
      `);
      this.tableEnsured = true;
    } catch (err) {
      console.warn("[FontRepository] Table ensure notice:", (err as Error).message);
    }
  }

  /**
   * Content-Addressable Storage check:
   * Finds an existing font by its unique SHA-256 hash.
   */
  static async findFontByHash(sha256Hash: string): Promise<DbFont | null> {
    await this.ensureTable();
    const res = await query<DbFont>(
      `SELECT * FROM fonts WHERE sha256_hash = $1 LIMIT 1`,
      [sha256Hash.toLowerCase().trim()]
    );
    return res.rows[0] || null;
  }

  /**
   * Saves a new font to the repository.
   */
  static async saveFont(params: {
    workspaceId?: string | null;
    familyName: string;
    displayName: string;
    sourceType: "google" | "custom_file" | "system";
    sha256Hash?: string | null;
    fileUrl: string;
    format?: string | null;
    fileSizeBytes?: number | null;
  }): Promise<DbFont> {
    await this.ensureTable();

    let validWorkspaceId: string | null = null;
    if (params.workspaceId) {
      try {
        validWorkspaceId = toValidUUID(params.workspaceId);
      } catch {
        validWorkspaceId = null;
      }
    }

    const cleanHash = params.sha256Hash ? params.sha256Hash.toLowerCase().trim() : null;

    // Check CAS deduplication
    if (cleanHash) {
      const existing = await this.findFontByHash(cleanHash);
      if (existing) {
        return existing;
      }
    }

    const res = await query<DbFont>(
      `INSERT INTO fonts (
        workspace_id, family_name, display_name, source_type,
        sha256_hash, file_url, format, file_size_bytes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        validWorkspaceId,
        params.familyName.trim(),
        params.displayName.trim(),
        params.sourceType,
        cleanHash,
        params.fileUrl.trim(),
        params.format || null,
        params.fileSizeBytes || null,
      ]
    );

    return res.rows[0];
  }

  /**
   * Retrieves all custom fonts available for the workspace or globally.
   */
  static async getFonts(workspaceId?: string | null): Promise<DbFont[]> {
    await this.ensureTable();
    let validWorkspaceId: string | null = null;
    if (workspaceId) {
      try {
        validWorkspaceId = toValidUUID(workspaceId);
      } catch {
        validWorkspaceId = null;
      }
    }

    let sql = `SELECT * FROM fonts`;
    const values: unknown[] = [];
    if (validWorkspaceId) {
      sql += ` WHERE workspace_id IS NULL OR workspace_id = $1`;
      values.push(validWorkspaceId);
    }
    sql += ` ORDER BY display_name ASC`;

    const res = await query<DbFont>(sql, values);
    return res.rows;
  }
}
