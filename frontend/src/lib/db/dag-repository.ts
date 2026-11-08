import crypto from "crypto";
import { query } from "./postgres";
import type { MerkleCommit } from "@/lib/merkle-dag/types";
import { computeCommitHash } from "@/lib/merkle-dag/hash";

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
  headCommitId?: string;
  created_at: string;
}

export interface DbCommitRow {
  id: string;
  document_id: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string | null;
  message: string;
  crdt_delta_storage_path: string;
  snapshot_storage_path: string | null;
  created_at: string;
  parents: string[];
  branch: string;
  content?: string | null;
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
   * Ensures table columns exist for branch and content tracking.
   */
  static async ensureSchema(): Promise<void> {
    try {
      await query(`
        ALTER TABLE commits ADD COLUMN IF NOT EXISTS branch VARCHAR(64) DEFAULT 'main';
        ALTER TABLE commits ADD COLUMN IF NOT EXISTS content TEXT;
      `);
    } catch {
      // Ignore if columns already exist or concurrent migration
    }
  }

  /**
   * Loads all commits for a given document, including their DAG parent links.
   */
  static async getCommitsByDocument(documentId: string): Promise<MerkleCommit[]> {
    await this.ensureSchema();
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
        c.content,
        u.name as author_name,
        u.avatar_url as author_avatar,
        COALESCE(
          (
            SELECT array_agg(cp.parent_commit_id ORDER BY cp.parent_order ASC)
            FROM commit_parents cp
            WHERE cp.commit_id = c.id
          ),
          ARRAY[]::text[]
        ) as parents,
        COALESCE(
          c.branch,
          (
            SELECT b.name
            FROM branches b
            WHERE b.document_id = c.document_id AND b.head_commit_id = c.id
            LIMIT 1
          ),
          'main'
        ) as branch
      FROM commits c
      LEFT JOIN users u ON u.id = c.author_id
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
      content: row.content || null,
      stateVector: {},
      message: row.message,
      author: {
        userId: row.author_id,
        name: row.author_name || (row.author_id === "00000000-0000-0000-0000-000000000000" ? "SyncPro Core Engine" : "Пользователь"),
        avatarUrl: row.author_avatar || null,
      },
      timestamp: new Date(row.created_at).getTime(),
      branch: row.branch,
    }));
  }

  /**
   * Saves a new Merkle Commit and links its DAG parent nodes atomically.
   */
  static async saveCommit(commit: MerkleCommit): Promise<void> {
    await this.ensureSchema();
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

      // 3. Insert commit with branch and content snapshot
      await query(
        `INSERT INTO commits (
           id,
           document_id,
           author_id,
           message,
           crdt_delta_storage_path,
           snapshot_storage_path,
           created_at,
           branch,
           content
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           snapshot_storage_path = COALESCE(EXCLUDED.snapshot_storage_path, commits.snapshot_storage_path),
           content = COALESCE(EXCLUDED.content, commits.content),
           branch = COALESCE(EXCLUDED.branch, commits.branch)`,
        [
          commit.id,
          validDocId,
          validAuthorId,
          commit.message,
          commit.crdtDeltaStoragePath,
          commit.snapshotStoragePath || null,
          new Date(commit.timestamp),
          commit.branch || "main",
          commit.content || null,
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
   * Creates a real initial commit in PostgreSQL for a new document.
   */
  static async createInitialCommit(
    documentId: string,
    authorId: string,
    initialContent: string,
    authorName = "Автор документа"
  ): Promise<MerkleCommit> {
    await this.ensureSchema();
    const validDocId = toValidUUID(documentId);
    let validAuthorId = "00000000-0000-0000-0000-000000000000";
    try {
      validAuthorId = toValidUUID(authorId);
    } catch {
      validAuthorId = "00000000-0000-0000-0000-000000000000";
    }

    const timestamp = Date.now();
    const payload = {
      documentId: validDocId,
      parents: [],
      deltaSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      stateVector: { 0: 0 },
      message: "Начальный коммит (создание документа)",
      author: {
        userId: validAuthorId,
        name: authorName,
        avatarUrl: null,
      },
      timestamp,
      branch: "main",
    };

    const commitId = await computeCommitHash(payload);
    const commit: MerkleCommit = {
      ...payload,
      id: commitId,
      crdtDeltaStoragePath: `deltas/${validDocId}/${commitId}.bin`,
      snapshotStoragePath: null,
      content: initialContent || "",
    };

    await this.saveCommit(commit);
    return commit;
  }

  /**
   * Retrieves all ancestor hashes of a commit using recursive SQL CTE.
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
    await this.ensureSchema();
    const validId = toValidUUID(documentId);
    const res = await query<DbBranch>(
      `SELECT document_id, name, head_commit_id, created_at
       FROM branches
       WHERE document_id = $1
       ORDER BY name ASC`,
      [validId]
    );
    return res.rows.map((b) => {
      const headId = (b.head_commit_id || "").trim();
      return {
        ...b,
        head_commit_id: headId,
        headCommitId: headId,
      };
    });
  }

  /**
   * Creates or updates a branch pointing to a specific commit.
   */
  static async createBranch(documentId: string, branchName: string, fromCommitId: string): Promise<DbBranch> {
    await this.ensureSchema();
    const validDocId = toValidUUID(documentId);
    const cleanName = branchName.trim().replace(/\s+/g, "-");
    const cleanCommitId = fromCommitId.trim();

    // Ensure commit exists
    const commitCheck = await query(`SELECT id FROM commits WHERE id = $1 AND document_id = $2`, [
      cleanCommitId,
      validDocId,
    ]);
    if (commitCheck.rows.length === 0) {
      throw new Error(`Базовый коммит ${cleanCommitId.slice(0, 7)} не найден`);
    }

    const sql = `
      INSERT INTO branches (document_id, name, head_commit_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (document_id, name)
      DO UPDATE SET head_commit_id = EXCLUDED.head_commit_id
      RETURNING document_id, name, head_commit_id, created_at
    `;
    const res = await query<DbBranch>(sql, [validDocId, cleanName, cleanCommitId]);
    const headId = (res.rows[0].head_commit_id || "").trim();
    return {
      ...res.rows[0],
      head_commit_id: headId,
      headCommitId: headId,
    };
  }

  /**
   * Deletes a branch (cannot delete main).
   */
  static async deleteBranch(documentId: string, branchName: string): Promise<boolean> {
    if (branchName === "main") {
      throw new Error("Нельзя удалить основную ветку main");
    }
    const validDocId = toValidUUID(documentId);
    const res = await query(`DELETE FROM branches WHERE document_id = $1 AND name = $2`, [
      validDocId,
      branchName,
    ]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Reverts document state to a previous commit by creating a new commit on the target branch.
   */
  static async revertCommit(
    documentId: string,
    commitId: string,
    branch: string,
    user: { id: string; name: string }
  ): Promise<MerkleCommit> {
    await this.ensureSchema();
    const validDocId = toValidUUID(documentId);
    const targetRes = await query<DbCommitRow>(
      `SELECT * FROM commits WHERE id = $1 AND document_id = $2`,
      [commitId.trim(), validDocId]
    );
    if (targetRes.rows.length === 0) {
      throw new Error("Целевой коммит для отката не найден");
    }
    const targetCommit = targetRes.rows[0];

    // Find current head of branch
    const branchRes = await query<{ head_commit_id: string }>(
      `SELECT head_commit_id FROM branches WHERE document_id = $1 AND name = $2`,
      [validDocId, branch]
    );
    const currentHead = branchRes.rows[0]?.head_commit_id?.trim() || commitId.trim();

    const targetContent = targetCommit.content || "";
    const revertMessage = `Откат к версии ${commitId.slice(0, 7)}: ${targetCommit.message}`;

    const payload = {
      documentId: validDocId,
      parents: [currentHead],
      deltaSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      stateVector: {},
      message: revertMessage,
      author: {
        userId: user.id,
        name: user.name,
        avatarUrl: null,
      },
      timestamp: Date.now(),
      branch,
    };

    const newCommitId = await computeCommitHash(payload);
    const newCommit: MerkleCommit = {
      ...payload,
      id: newCommitId,
      crdtDeltaStoragePath: `deltas/${validDocId}/${newCommitId}.bin`,
      snapshotStoragePath: null,
      content: targetContent,
    };

    await this.saveCommit(newCommit);

    // Update document content in documents table
    await query(`UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2`, [
      targetContent,
      validDocId,
    ]);

    return newCommit;
  }

  /**
   * Deletes a commit from the Merkle DAG safely relinking parent and branch references.
   */
  static async deleteCommit(
    documentId: string,
    commitId: string
  ): Promise<{ success: boolean; newHeadCommitId?: string }> {
    await this.ensureSchema();
    const validDocId = toValidUUID(documentId);
    const cleanCommitId = commitId.trim();

    // Check count of commits for document
    const countRes = await query<{ count: string }>(
      `SELECT count(*) as count FROM commits WHERE document_id = $1`,
      [validDocId]
    );
    if (parseInt(countRes.rows[0].count, 10) <= 1) {
      throw new Error("Нельзя удалить единственный корневой коммит документа");
    }

    await query("BEGIN");
    try {
      // Find parents of commit to delete
      const parentsRes = await query<{ parent_commit_id: string }>(
        `SELECT parent_commit_id FROM commit_parents WHERE commit_id = $1 ORDER BY parent_order ASC`,
        [cleanCommitId]
      );
      const parentIds = parentsRes.rows.map((r) => r.parent_commit_id.trim());
      const fallbackHead = parentIds[0] || null;

      // Check if branches point to this commit
      const branchesRes = await query<{ name: string }>(
        `SELECT name FROM branches WHERE document_id = $1 AND head_commit_id = $2`,
        [validDocId, cleanCommitId]
      );

      for (const b of branchesRes.rows) {
        if (fallbackHead) {
          await query(
            `UPDATE branches SET head_commit_id = $1 WHERE document_id = $2 AND name = $3`,
            [fallbackHead, validDocId, b.name]
          );
        } else {
          const otherRes = await query<{ id: string }>(
            `SELECT id FROM commits WHERE document_id = $1 AND id != $2 ORDER BY created_at DESC LIMIT 1`,
            [validDocId, cleanCommitId]
          );
          if (otherRes.rows.length > 0) {
            await query(
              `UPDATE branches SET head_commit_id = $1 WHERE document_id = $2 AND name = $3`,
              [otherRes.rows[0].id.trim(), validDocId, b.name]
            );
          }
        }
      }

      // Relink child commits
      const childrenRes = await query<{ commit_id: string; parent_order: number }>(
        `SELECT commit_id, parent_order FROM commit_parents WHERE parent_commit_id = $1`,
        [cleanCommitId]
      );
      for (const child of childrenRes.rows) {
        await query(
          `DELETE FROM commit_parents WHERE commit_id = $1 AND parent_commit_id = $2`,
          [child.commit_id, cleanCommitId]
        );
        for (let o = 0; o < parentIds.length; o++) {
          await query(
            `INSERT INTO commit_parents (commit_id, parent_commit_id, parent_order)
             VALUES ($1, $2, $3)
             ON CONFLICT (commit_id, parent_commit_id) DO NOTHING`,
            [child.commit_id, parentIds[o], child.parent_order + o]
          );
        }
      }

      // Delete commit links and commit record
      await query(`DELETE FROM commit_parents WHERE commit_id = $1`, [cleanCommitId]);
      await query(`DELETE FROM commits WHERE id = $1 AND document_id = $2`, [
        cleanCommitId,
        validDocId,
      ]);

      await query("COMMIT");
      return { success: true, newHeadCommitId: fallbackHead || undefined };
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  }
}
