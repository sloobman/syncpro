import { query } from "./postgres";
import { toValidUUID } from "./dag-repository";

export interface DocumentComment {
  id: string;
  documentId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: number;
}

export class CommentsRepository {
  private static tableEnsured = false;

  static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS document_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_doc_comments_doc ON document_comments(document_id, created_at ASC);
      `);
      this.tableEnsured = true;
    } catch (err) {
      console.warn("[CommentsRepository] Table ensure notice:", (err as Error).message);
    }
  }

  static async getComments(documentId: string): Promise<DocumentComment[]> {
    await this.ensureTable();
    const validDocId = toValidUUID(documentId);

    try {
      const sql = `
        SELECT 
          c.id,
          c.document_id,
          c.author_id,
          c.content,
          c.created_at,
          u.name as author_name,
          u.avatar_url as author_avatar
        FROM document_comments c
        LEFT JOIN users u ON u.id = c.author_id
        WHERE c.document_id = $1
        ORDER BY c.created_at ASC
      `;

      const res = await query<{
        id: string;
        document_id: string;
        author_id: string;
        content: string;
        created_at: string;
        author_name: string | null;
        author_avatar: string | null;
      }>(sql, [validDocId]);

      return res.rows.map((row) => ({
        id: row.id,
        documentId: row.document_id,
        authorId: row.author_id,
        authorName: row.author_name || "Пользователь",
        authorAvatarUrl: row.author_avatar || null,
        content: row.content,
        createdAt: new Date(row.created_at).getTime(),
      }));
    } catch (err) {
      console.warn("[CommentsRepository] getComments error:", (err as Error).message);
      return [];
    }
  }

  static async addComment(params: {
    documentId: string;
    authorId: string;
    content: string;
  }): Promise<DocumentComment> {
    await this.ensureTable();
    const validDocId = toValidUUID(params.documentId);
    let validAuthorId = "00000000-0000-0000-0000-000000000000";
    try {
      validAuthorId = toValidUUID(params.authorId);
    } catch {
      validAuthorId = "00000000-0000-0000-0000-000000000000";
    }

    // Ensure document exists
    await query(
      `INSERT INTO documents (id, title, default_branch)
       VALUES ($1, 'Документ SyncPro', 'main')
       ON CONFLICT (id) DO NOTHING`,
      [validDocId]
    );

    const sql = `
      INSERT INTO document_comments (document_id, author_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, document_id, author_id, content, created_at
    `;

    const res = await query<{
      id: string;
      document_id: string;
      author_id: string;
      content: string;
      created_at: string;
    }>(sql, [validDocId, validAuthorId, params.content]);

    const row = res.rows[0];

    // Fetch author info
    const userRes = await query<{ name: string; avatar_url: string | null }>(
      `SELECT name, avatar_url FROM users WHERE id = $1 LIMIT 1`,
      [validAuthorId]
    );

    const author = userRes.rows[0];

    return {
      id: row.id,
      documentId: row.document_id,
      authorId: row.author_id,
      authorName: author?.name || "Пользователь",
      authorAvatarUrl: author?.avatar_url || null,
      content: row.content,
      createdAt: new Date(row.created_at).getTime(),
    };
  }
}
