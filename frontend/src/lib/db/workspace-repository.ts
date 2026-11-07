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

export interface WorkspaceMemberInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export interface DbMemberRow {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

export function toValidUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  const hash = crypto.createHash("md5").update(id).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export class WorkspaceRepository {
  /**
   * Checks whether the user is owner or invited member of the workspace.
   */
  static async isUserMemberOrOwner(workspaceId: string, userId: string): Promise<boolean> {
    const validWsId = toValidUUID(workspaceId);
    const validUserId = toValidUUID(userId);

    const sql = `
      SELECT 1 FROM workspaces w
      WHERE w.id = $1 AND (
        w.owner_id = $2 OR
        EXISTS (
          SELECT 1 FROM workspace_members wm
          WHERE wm.workspace_id = $1 AND wm.user_id = $2
        )
      )
      LIMIT 1
    `;

    try {
      const res = await query(sql, [validWsId, validUserId]);
      return res.rows.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves all workspaces accessible to a user (owned or invited).
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
         ON CONFLICT (workspace_id, user_id) DO NOTHING`,
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
   * Creates a default private workspace and welcome document for a newly registered user.
   */
  static async createDefaultWorkspaceForUser(userId: string, userName: string): Promise<Workspace> {
    const wsName = `Личное пространство ${userName}`;
    const ws = await this.createWorkspace({
      name: wsName,
      description: "Ваше персональное рабочее пространство для заметок и документов",
      iconEmoji: "🚀",
      ownerId: userId,
    });

    // Create welcome document
    const welcomeText = `# Добро пожаловать в SyncPro!

Поздравляем с началом работы. SyncPro — это защищенная распределенная среда для совместного редактирования с локальной автономностью и контролем версий.

## Возможности вашей рабочей области
- **Совместное редактирование по приглашению:** Приглашайте коллег через диалог «Участники» в правом верхнем углу. Другие пользователи не увидят ваши документы без вашего приглашения.
- **Автономность:** Редактор сохраняет ваши изменения локально и мгновенно синхронизирует их при подключении к сети.
- **История версий (Merkle-DAG):** Каждая правка фиксируется криптографическим коммитом. Вы можете перемещаться во времени и объединять ветки без конфликтов.

Нажмите **«Новый документ»** на панели сверху, чтобы создать свой следующий проект!`;

    await this.createDocument({
      workspaceId: ws.id,
      title: "Начало работы со SyncPro",
      content: welcomeText,
      createdBy: userId,
    });

    return ws;
  }

  /**
   * Retrieves a single workspace by ID with strict access control.
   */
  static async getWorkspaceById(id: string, userId?: string): Promise<Workspace | null> {
    const validId = toValidUUID(id);

    if (userId) {
      const hasAccess = await this.isUserMemberOrOwner(validId, userId);
      if (!hasAccess) return null;
    }

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
   * Retrieves members of a workspace.
   */
  static async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberInfo[]> {
    const validWsId = toValidUUID(workspaceId);
    const sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        wm.role,
        COALESCE(wm.joined_at, w.created_at) as joined_at
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      JOIN workspaces w ON w.id = wm.workspace_id
      WHERE wm.workspace_id = $1
      ORDER BY 
        CASE WHEN wm.role = 'owner' THEN 0 ELSE 1 END,
        wm.joined_at ASC
    `;

    try {
      const res = await query<DbMemberRow>(sql, [validWsId]);
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        avatarUrl: r.avatar_url,
        role: r.role === "owner" ? "Владелец" : r.role === "admin" ? "Администратор" : "Редактор",
        joinedAt: r.joined_at,
      }));
    } catch (err) {
      console.error("[WorkspaceRepository.getWorkspaceMembers error]:", err);
      return [];
    }
  }

  /**
   * Invites a member by email to a workspace.
   * If user already exists in DB, adds them directly to workspace_members.
   * Otherwise saves pending invitation so they join automatically when they register.
   */
  static async inviteMember(params: {
    workspaceId: string;
    email: string;
    role: string;
    inviterId: string;
  }): Promise<{ success: boolean; isPending: boolean; message: string }> {
    const validWsId = toValidUUID(params.workspaceId);
    const validInviterId = toValidUUID(params.inviterId);
    const email = params.email.trim().toLowerCase();

    // Verify inviter has access
    const isAllowed = await this.isUserMemberOrOwner(validWsId, validInviterId);
    if (!isAllowed) {
      return { success: false, isPending: false, message: "Нет прав на приглашение участников" };
    }

    // Check if user exists
    const userRes = await query(`SELECT id, name, email FROM users WHERE LOWER(email) = $1`, [email]);

    if (userRes.rows.length > 0) {
      const targetUser = userRes.rows[0];
      await query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (workspace_id, user_id) 
         DO UPDATE SET role = EXCLUDED.role`,
        [validWsId, targetUser.id, params.role]
      );
      return {
        success: true,
        isPending: false,
        message: `Пользователь ${targetUser.name} (${email}) успешно добавлен в рабочее пространство`,
      };
    } else {
      // Save to workspace_invitations
      try {
        await query(
          `INSERT INTO workspace_invitations (workspace_id, email, role, inviter_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (workspace_id, email)
           DO UPDATE SET role = EXCLUDED.role`,
          [validWsId, email, params.role, validInviterId]
        );
      } catch {
        // ignore
      }
      return {
        success: true,
        isPending: true,
        message: `Приглашение отправлено на ${email}. Доступ откроется сразу после регистрации`,
      };
    }
  }

  /**
   * Claims all pending invitations for a newly registered or logged in user.
   */
  static async claimPendingInvitations(userId: string, email: string): Promise<number> {
    const validUserId = toValidUUID(userId);
    const cleanEmail = email.trim().toLowerCase();

    const sql = `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      SELECT wi.workspace_id, $1, wi.role
      FROM workspace_invitations wi
      WHERE LOWER(wi.email) = $2
      ON CONFLICT (workspace_id, user_id) DO NOTHING
    `;

    try {
      const res = await query(sql, [validUserId, cleanEmail]);
      await query(`DELETE FROM workspace_invitations WHERE LOWER(email) = $1`, [cleanEmail]);
      return res.rowCount ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Retrieves all documents for a given workspace with access check.
   */
  static async getWorkspaceDocuments(workspaceId: string, userId?: string): Promise<Document[]> {
    const validWsId = toValidUUID(workspaceId);

    if (userId) {
      const hasAccess = await this.isUserMemberOrOwner(validWsId, userId);
      if (!hasAccess) return [];
    }

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
    let validWsId = params.workspaceId ? toValidUUID(params.workspaceId) : null;
    const validUserId = params.createdBy ? toValidUUID(params.createdBy) : null;

    if (!validWsId && validUserId) {
      const userWorkspaces = await this.getUserWorkspaces(validUserId);
      if (userWorkspaces.length > 0) {
        validWsId = userWorkspaces[0].id;
      }
    }

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
    updates: { title?: string; content?: string },
    userId?: string
  ): Promise<boolean> {
    const validId = toValidUUID(id);

    if (userId) {
      const doc = await this.getDocumentById(id, userId);
      if (!doc) return false;
    }

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
   * Retrieves document metadata and content with access verification.
   */
  static async getDocumentById(
    id: string,
    userId?: string
  ): Promise<{ document: Document; content: string } | null> {
    const validId = toValidUUID(id);
    const sql = `SELECT * FROM documents WHERE id = $1`;

    try {
      const res = await query<DbDocumentRow>(sql, [validId]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      if (userId && row.workspace_id) {
        const hasAccess = await this.isUserMemberOrOwner(row.workspace_id, userId);
        if (!hasAccess && row.created_by !== toValidUUID(userId)) {
          return null;
        }
      }

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
