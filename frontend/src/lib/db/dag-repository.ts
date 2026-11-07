import crypto from "crypto";
import { query } from "./postgres";
import type { MerkleCommit } from "@/lib/merkle-dag/types";

export interface DbDocument {
  id: string;
  title: string;
  default_branch: string;
  created_at: string;
}

export interface DbBranch {
  document_id: string;
  name: string;
  head_commit_id: string;
  created_at: string;
}

export interface DbCommitRow {
  id: string;
  document_id: string;
  author_id: string;
  message: string;
  crdt_delta_storage_path: string;
  snapshot_storage_path: string | null;
  created_at: string;
  parents: string[];
  branch: string;
}

export function toValidUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  const hash = crypto.createHash("md5").update(id).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export class MerkleDAGRepository {
  /**
   * Ensures document exists in PostgreSQL. If not, creates it.
   */
  static async ensureDocument(id: string, title = "Безымянный документ"): Promise<DbDocument> {
    const validId = toValidUUID(id);
    const res = await query<DbDocument>(
      `INSERT INTO documents (id, title, default_branch)
       VALUES ($1, $2, 'main')
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
       RETURNING *`,
      [validId, title]
    );
    return res.rows[0];
  }

  /**
   * Loads all commits for a given document, including their DAG parent links.
   */
  static async getCommitsByDocument(documentId: string): Promise<MerkleCommit[]> {
    const validId = toValidUUID(documentId);
    const sql = `
      SELECT 
        c.id,
        c.document_id,
        c.author_id,
        c.message,
        c.crdt_delta_storage_path,
        c.snapshot_storage_path,
        c.created_at,
        COALESCE(
          (
            SELECT array_agg(cp.parent_commit_id ORDER BY cp.parent_order ASC)
            FROM commit_parents cp
            WHERE cp.commit_id = c.id
          ),
          ARRAY[]::text[]
        ) as parents,
        COALESCE(
          (
            SELECT b.name
            FROM branches b
            WHERE b.document_id = c.document_id AND b.head_commit_id = c.id
            LIMIT 1
          ),
          'main'
        ) as branch
      FROM commits c
      WHERE c.document_id = $1
      ORDER BY c.created_at ASC
    `;

    const res = await query<DbCommitRow>(sql, [validId]);

    return res.rows.map((row) => ({
      id: row.id.trim(),
      documentId: row.document_id,
      parents: (row.parents || []).map((p) => p.trim()),
      deltaSha256: row.id.trim(),
      crdtDeltaStoragePath: row.crdt_delta_storage_path,
      snapshotStoragePath: row.snapshot_storage_path,
      stateVector: {},
      message: row.message,
      author: {
        userId: row.author_id,
        name: row.author_id === "00000000-0000-0000-0000-000000000000" ? "SyncPro Core Engine" : "Пользователь",
        avatarUrl: null,
      },
      timestamp: new Date(row.created_at).getTime(),
      branch: row.branch,
    }));
  }

  /**
   * Saves a new Merkle Commit and links its DAG parent nodes atomically.
   */
  static async saveCommit(commit: MerkleCommit): Promise<void> {
    const validDocId = toValidUUID(commit.documentId);
    let validAuthorId = "00000000-0000-0000-0000-000000000000";
    if (commit.author?.userId) {
      try {
        validAuthorId = toValidUUID(commit.author.userId);
      } catch {
        validAuthorId = "00000000-0000-0000-0000-000000000000";
      }
    }

    await query("BEGIN");
    try {
      // 1. Ensure system author exists in users
      await query(
        `INSERT INTO users (id, email, name, password_hash, role)
         VALUES ($1, $2, $3, '$2a$12$systemdummyhash', 'system')
         ON CONFLICT (id) DO NOTHING`,
        [validAuthorId, `user-${validAuthorId}@syncpro.dev`, commit.author?.name || "Пользователь"]
      );

      // 2. Ensure document exists
      await query(
        `INSERT INTO documents (id, title, default_branch)
         VALUES ($1, 'Документ SyncPro', 'main')
         ON CONFLICT (id) DO NOTHING`,
        [validDocId]
      );

      // 3. Insert commit
      await query(
        `INSERT INTO commits (
           id,
           document_id,
           author_id,
           message,
           crdt_delta_storage_path,
           snapshot_storage_path,
           created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           snapshot_storage_path = COALESCE(EXCLUDED.snapshot_storage_path, commits.snapshot_storage_path)`,
        [
          commit.id,
          validDocId,
          validAuthorId,
          commit.message,
          commit.crdtDeltaStoragePath,
          commit.snapshotStoragePath || null,
          new Date(commit.timestamp),
        ]
      );

      // 4. Insert commit parent edges
      if (commit.parents && commit.parents.length > 0) {
        for (let order = 0; order < commit.parents.length; order++) {
          const parentId = commit.parents[order];
          await query(
            `INSERT INTO commit_parents (commit_id, parent_commit_id, parent_order)
             VALUES ($1, $2, $3)
             ON CONFLICT (commit_id, parent_commit_id) DO NOTHING`,
            [commit.id, parentId, order]
          );
        }
      }

      // 5. Update branch head pointer
      await query(
        `INSERT INTO branches (document_id, name, head_commit_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (document_id, name)
         DO UPDATE SET head_commit_id = EXCLUDED.head_commit_id`,
        [validDocId, commit.branch || "main", commit.id]
      );

      await query("COMMIT");
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  }

  /**
   * Retrieves all ancestor hashes of a commit using recursive SQL CTE (Ancestry Traversal).
   */
  static async getAncestors(commitId: string): Promise<string[]> {
    const sql = `
      WITH RECURSIVE Ancestors AS (
        SELECT parent_commit_id, 1 as depth
        FROM commit_parents
        WHERE commit_id = $1
        UNION ALL
        SELECT cp.parent_commit_id, a.depth + 1
        FROM commit_parents cp
        INNER JOIN Ancestors a ON cp.commit_id = a.parent_commit_id
      )
      SELECT DISTINCT parent_commit_id FROM Ancestors;
    `;
    const res = await query<{ parent_commit_id: string }>(sql, [commitId]);
    return res.rows.map((r) => r.parent_commit_id.trim());
  }

  /**
   * Retrieves all branches of a document.
   */
  static async getBranches(documentId: string): Promise<DbBranch[]> {
    const validId = toValidUUID(documentId);
    const res = await query<DbBranch>(
      `SELECT document_id, name, head_commit_id, created_at
       FROM branches
       WHERE document_id = $1
       ORDER BY name ASC`,
      [validId]
    );
    return res.rows.map((b) => ({ ...b, head_commit_id: b.head_commit_id.trim() }));
  }
}
