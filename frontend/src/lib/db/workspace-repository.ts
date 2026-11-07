import crypto from "crypto";
import { query } from "./postgres";
import type { Workspace, Document } from "@/types";

export interface DbWorkspaceRow {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  owner_id: string;
  created_at: string;
  document_count: number;
  member_count: number;
}

export interface DbDocumentRow {
  id: string;
  workspace_id: string | null;
  title: string;
  content: string | null;
  default_branch: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function toValidUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  const hash = crypto.createHash("md5").update(id).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export class WorkspaceRepository {
  /**
   * Retrieves all workspaces for a given user (either owner or member).
   */
  static async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const validUserId = toValidUUID(userId);
    const sql = `
      SELECT 
        w.id,
        w.name,
        COALESCE(w.description, '') as description,
        COALESCE(w.icon_emoji, '📁') as icon_emoji,
        w.owner_id,
        w.created_at,
        COALESCE(
          (SELECT count(*)::int FROM documents d WHERE d.workspace_id = w.id),
          0
        ) as document_count,
        COALESCE(
          (SELECT count(*)::int FROM workspace_members wm WHERE wm.workspace_id = w.id),
          1
        ) as member_count
      FROM workspaces w
      WHERE w.owner_id = $1 
         OR EXISTS (
           SELECT 1 FROM workspace_members wm 
           WHERE wm.workspace_id = w.id AND wm.user_id = $1
         )
      ORDER BY w.created_at DESC
    `;

    try {
      const res = await query<DbWorkspaceRow>(sql, [validUserId]);
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: r.description,
        iconEmoji: r.icon_emoji,
        ownerId: r.owner_id,
        memberCount: r.member_count,
        documentCount: r.document_count,
        createdAt: r.created_at,
        updatedAt: r.created_at,
      }));
    } catch (err) {
      console.error("[WorkspaceRepository.getUserWorkspaces error]:", err);
      return [];
    }
  }

  /**
   * Creates a new workspace in PostgreSQL.
   */
  static async createWorkspace(params: {
    id?: string;
    name: string;
    description?: string;
    iconEmoji?: string;
    ownerId: string;
  }): Promise<Workspace> {
    const validId = params.id ? toValidUUID(params.id) : crypto.randomUUID();
    const validOwnerId = toValidUUID(params.ownerId);

    const sql = `
      INSERT INTO workspaces (id, name, description, icon_emoji, owner_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, icon_emoji, owner_id, created_at
    `;

    const res = await query<DbWorkspaceRow>(sql, [
      validId,
      params.name,
      params.description || "",
      params.iconEmoji || "📁",
      validOwnerId,
    ]);

    const row = res.rows[0];

    // Add owner to workspace_members
    try {
      await query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT DO NOTHING`,
        [row.id, validOwnerId]
      );
    } catch {
      // ignore
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: row.description,
      iconEmoji: row.icon_emoji,
      ownerId: row.owner_id,
      memberCount: 1,
      documentCount: 0,
      createdAt: row.created_at,
      updatedAt: row.created_at,
    };
  }

  /**
   * Retrieves a single workspace by ID.
   */
  static async getWorkspaceById(id: string): Promise<Workspace | null> {
    const validId = toValidUUID(id);
    const sql = `
      SELECT 
        w.id,
        w.name,
        COALESCE(w.description, '') as description,
        COALESCE(w.icon_emoji, '📁') as icon_emoji,
        w.owner_id,
        w.created_at,
        COALESCE(
          (SELECT count(*)::int FROM documents d WHERE d.workspace_id = w.id),
          0
        ) as document_count,
        COALESCE(
          (SELECT count(*)::int FROM workspace_members wm WHERE wm.workspace_id = w.id),
          1
        ) as member_count
      FROM workspaces w
      WHERE w.id = $1
    `;

    try {
      const res = await query<DbWorkspaceRow>(sql, [validId]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: r.description,
        iconEmoji: r.icon_emoji,
        ownerId: r.owner_id,
        memberCount: r.member_count,
        documentCount: r.document_count,
        createdAt: r.created_at,
        updatedAt: r.created_at,
      };
    } catch (err) {
      console.error("[WorkspaceRepository.getWorkspaceById error]:", err);
      return null;
    }
  }

  /**
   * Retrieves all documents for a given workspace.
   */
  static async getWorkspaceDocuments(workspaceId: string): Promise<Document[]> {
    const validWsId = toValidUUID(workspaceId);
    const sql = `
      SELECT 
        id,
        workspace_id,
        title,
        default_branch,
        created_by,
        created_at,
        updated_at
      FROM documents
      WHERE workspace_id = $1
      ORDER BY updated_at DESC
    `;

    try {
      const res = await query<DbDocumentRow>(sql, [validWsId]);
      return res.rows.map((r) => ({
        id: r.id,
        workspaceId: r.workspace_id || "",
        title: r.title,
        defaultBranch: r.default_branch || "main",
        createdBy: r.created_by || "user",
        wordCount: 0,
        isFavorite: false,
        isArchived: false,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (err) {
      console.error("[WorkspaceRepository.getWorkspaceDocuments error]:", err);
      return [];
    }
  }

  /**
   * Creates a new document.
   */
  static async createDocument(params: {
    id?: string;
    workspaceId?: string;
    title: string;
    content?: string;
    createdBy?: string;
  }): Promise<Document> {
    const validId = params.id ? toValidUUID(params.id) : crypto.randomUUID();
    const validWsId = params.workspaceId ? toValidUUID(params.workspaceId) : null;
    const validUserId = params.createdBy ? toValidUUID(params.createdBy) : null;

    const sql = `
      INSERT INTO documents (id, workspace_id, title, content, created_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE 
        SET title = EXCLUDED.title,
            updated_at = NOW()
      RETURNING *
    `;

    const res = await query<DbDocumentRow>(sql, [
      validId,
      validWsId,
      params.title,
      params.content || "",
      validUserId,
    ]);

    const row = res.rows[0];
    return {
      id: row.id,
      workspaceId: row.workspace_id || "",
      title: row.title,
      defaultBranch: row.default_branch || "main",
      createdBy: row.created_by || "",
      wordCount: 0,
      isFavorite: false,
      isArchived: false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Updates an existing document (title, content, updated_at).
   */
  static async updateDocument(
    id: string,
    updates: { title?: string; content?: string }
  ): Promise<boolean> {
    const validId = toValidUUID(id);
    const sets: string[] = ["updated_at = NOW()"];
    const vals: (string | null)[] = [validId];

    if (updates.title !== undefined) {
      vals.push(updates.title);
      sets.push(`title = $${vals.length}`);
    }

    if (updates.content !== undefined) {
      vals.push(updates.content);
      sets.push(`content = $${vals.length}`);
    }

    const sql = `UPDATE documents SET ${sets.join(", ")} WHERE id = $1`;
    try {
      const res = await query(sql, vals);
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      console.error("[WorkspaceRepository.updateDocument error]:", err);
      return false;
    }
  }

  /**
   * Retrieves document metadata and content.
   */
  static async getDocumentById(id: string): Promise<{ document: Document; content: string } | null> {
    const validId = toValidUUID(id);
    const sql = `SELECT * FROM documents WHERE id = $1`;

    try {
      const res = await query<DbDocumentRow>(sql, [validId]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        document: {
          id: row.id,
          workspaceId: row.workspace_id || "",
          title: row.title,
          defaultBranch: row.default_branch || "main",
          createdBy: row.created_by || "",
          wordCount: 0,
          isFavorite: false,
          isArchived: false,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        content: row.content || "",
      };
    } catch (err) {
      console.error("[WorkspaceRepository.getDocumentById error]:", err);
      return null;
    }
  }
}
