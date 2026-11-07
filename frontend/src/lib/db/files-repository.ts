import { query } from "./postgres";
import { toValidUUID } from "./dag-repository";

export interface StoredFile {
  id: string;
  documentId: string | null;
  uploaderId: string | null;
  filename: string;
  mimeType: string;
  data: Buffer;
  sizeBytes: number;
  createdAt: number;
}

export class FilesRepository {
  private static tableEnsured = false;

  static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS document_files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID,
          uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
          filename VARCHAR(255) NOT NULL,
          mime_type VARCHAR(128) NOT NULL,
          data BYTEA NOT NULL,
          size_bytes INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_doc_files_doc ON document_files(document_id);
      `);
      this.tableEnsured = true;
    } catch (err) {
      console.warn("[FilesRepository] Table ensure notice:", (err as Error).message);
    }
  }

  static async saveFile(params: {
    documentId?: string | null;
    uploaderId?: string | null;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<{ id: string; url: string; filename: string; size: number }> {
    await this.ensureTable();

    let validDocId: string | null = null;
    if (params.documentId) {
      try {
        validDocId = toValidUUID(params.documentId);
      } catch {
        validDocId = null;
      }
    }

    let validUploaderId: string | null = null;
    if (params.uploaderId) {
      try {
        validUploaderId = toValidUUID(params.uploaderId);
      } catch {
        validUploaderId = null;
      }
    }

    const sql = `
      INSERT INTO document_files (document_id, uploader_id, filename, mime_type, data, size_bytes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, filename, size_bytes
    `;

    const res = await query<{
      id: string;
      filename: string;
      size_bytes: number;
    }>(sql, [
      validDocId,
      validUploaderId,
      params.filename,
      params.mimeType,
      params.buffer,
      params.buffer.length,
    ]);

    const row = res.rows[0];
    return {
      id: row.id,
      url: `/api/files/${row.id}`,
      filename: row.filename,
      size: row.size_bytes,
    };
  }

  static async getFile(id: string): Promise<StoredFile | null> {
    await this.ensureTable();
    let validId: string;
    try {
      validId = toValidUUID(id);
    } catch {
      return null;
    }

    const sql = `
      SELECT id, document_id, uploader_id, filename, mime_type, data, size_bytes, created_at
      FROM document_files
      WHERE id = $1
      LIMIT 1
    `;

    const res = await query<{
      id: string;
      document_id: string | null;
      uploader_id: string | null;
      filename: string;
      mime_type: string;
      data: Buffer;
      size_bytes: number;
      created_at: string;
    }>(sql, [validId]);

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      documentId: row.document_id,
      uploaderId: row.uploader_id,
      filename: row.filename,
      mimeType: row.mime_type,
      data: row.data,
      sizeBytes: row.size_bytes,
      createdAt: new Date(row.created_at).getTime(),
    };
  }
}
