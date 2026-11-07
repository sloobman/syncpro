import crypto from "crypto";
import { query } from "./postgres";
import type { Workspace, Document, MemberRole } from "@/types";

export interface DbWorkspaceRow {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  owner_id: string;
  created_at: string;
  document_count: number;
  member_count: number;
  current_user_role?: string;
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
  role: MemberRole;
  roleTitle: string;
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
   * Retrieves the user's role in the workspace ('owner', 'editor', 'commenter', 'viewer')
   * or null if the user is not a member.
   */
  static async getUserRoleInWorkspace(workspaceId: string, userId: string): Promise<MemberRole | null> {
    const validWsId = toValidUUID(workspaceId);
    const validUserId = toValidUUID(userId);

    try {
      const wsSql = `SELECT owner_id FROM workspaces WHERE id = $1`;
      const wsRes = await query<{ owner_id: string }>(wsSql, [validWsId]);
      if (wsRes.rows.length === 0) return null;
      if (wsRes.rows[0].owner_id === validUserId) return "owner";

      const memSql = `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`;
      const memRes = await query<{ role: string }>(memSql, [validWsId, validUserId]);
      if (memRes.rows.length > 0) {
        const rawRole = (memRes.rows[0].role || "").toLowerCase();
        if (rawRole === "owner") return "owner";
        if (rawRole === "commenter") return "commenter";
        if (rawRole === "viewer" || rawRole === "reader") return "viewer";
        return "editor";
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Checks whether the user can edit in this workspace (owner, editor).
   * Viewers and commenters cannot create, delete, or edit documents.
   */
  static async canUserEditWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    const role = await this.getUserRoleInWorkspace(workspaceId, userId);
    return role === "owner" || role === "editor";
  }

  /**
   * Checks whether the user can manage workspace settings and members (owner only).
   */
  static async canUserManageWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    const role = await this.getUserRoleInWorkspace(workspaceId, userId);
    return role === "owner";
  }

  /**
   * Checks whether the user can edit a specific document.
   */
  static async canUserEditDocument(documentId: string, userId: string): Promise<boolean> {
    const validDocId = toValidUUID(documentId);
    const validUserId = toValidUUID(userId);

    try {
      const docSql = `SELECT workspace_id, created_by FROM documents WHERE id = $1`;
      const docRes = await query<{ workspace_id: string | null; created_by: string | null }>(docSql, [validDocId]);
      if (docRes.rows.length === 0) return false;

      const row = docRes.rows[0];
      if (row.workspace_id) {
        return this.canUserEditWorkspace(row.workspace_id, userId);
      }
      return row.created_by === validUserId;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves all workspaces accessible to a user (owned or invited) with user's role.
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
        ) as member_count,
        CASE
          WHEN w.owner_id = $1 THEN 'owner'
          ELSE COALESCE(
            (SELECT wm.role FROM workspace_members wm WHERE wm.workspace_id = w.id AND wm.user_id = $1 LIMIT 1),
            'viewer'
          )
        END as current_user_role
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
      return res.rows.map((r) => {
        const rawRole = (r.current_user_role || (r.owner_id === validUserId ? "owner" : "viewer")).toLowerCase();
        const role: MemberRole =
          rawRole === "owner"
            ? "owner"
            : rawRole === "commenter"
            ? "commenter"
            : rawRole === "viewer" || rawRole === "reader"
            ? "viewer"
            : "editor";

        return {
          id: r.id,
          name: r.name,
          slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: r.description,
          iconEmoji: r.icon_emoji,
          ownerId: r.owner_id,
          currentUserRole: role,
          memberCount: r.member_count,
          documentCount: r.document_count,
          createdAt: r.created_at,
          updatedAt: r.created_at,
        };
      });
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
      currentUserRole: "owner",
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
- **Гибкие роли:** Выбирайте права «Редактор», «Читатель» или «Комменты». Читатели могут знакомиться с материалами без риска случайных изменений.
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
    const validUserId = userId ? toValidUUID(userId) : null;

    if (validUserId) {
      const hasAccess = await this.isUserMemberOrOwner(validId, validUserId);
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
        ) as member_count,
        CASE
          WHEN $2::uuid IS NOT NULL AND w.owner_id = $2::uuid THEN 'owner'
          ELSE COALESCE(
            (SELECT wm.role FROM workspace_members wm WHERE wm.workspace_id = w.id AND wm.user_id = $2::uuid LIMIT 1),
            'viewer'
          )
        END as current_user_role
      FROM workspaces w
      WHERE w.id = $1
    `;

    try {
      const res = await query<DbWorkspaceRow>(sql, [validId, validUserId]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      const rawRole = (r.current_user_role || (validUserId && r.owner_id === validUserId ? "owner" : "viewer")).toLowerCase();
      const role: MemberRole =
        rawRole === "owner"
          ? "owner"
          : rawRole === "commenter"
          ? "commenter"
          : rawRole === "viewer" || rawRole === "reader"
          ? "viewer"
          : "editor";

      return {
        id: r.id,
        name: r.name,
        slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: r.description,
        iconEmoji: r.icon_emoji,
        ownerId: r.owner_id,
        currentUserRole: role,
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
      return res.rows.map((r) => {
        const cleanRole = (r.role || "").toLowerCase();
        let roleTitle = "Редактор";
        let normalizedRole: MemberRole = "editor";

        if (cleanRole === "owner") {
          roleTitle = "Владелец";
          normalizedRole = "owner";
        } else if (cleanRole === "admin") {
          roleTitle = "Администратор";
          normalizedRole = "editor";
        } else if (cleanRole === "editor" || cleanRole === "member") {
          roleTitle = "Редактор";
          normalizedRole = "editor";
        } else if (cleanRole === "commenter") {
          roleTitle = "Комменты";
          normalizedRole = "commenter";
        } else if (cleanRole === "viewer" || cleanRole === "reader") {
          roleTitle = "Читатель";
          normalizedRole = "viewer";
        }

        return {
          id: r.id,
          name: r.name,
          email: r.email,
          avatarUrl: r.avatar_url,
          role: normalizedRole,
          roleTitle,
          joinedAt: r.joined_at,
        };
      });
    } catch (err) {
      console.error("[WorkspaceRepository.getWorkspaceMembers error]:", err);
      return [];
    }
  }

  /**
   * Invites a member by email to a workspace or updates their role.
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

    // Verify inviter has management access
    const canManage = await this.canUserManageWorkspace(validWsId, validInviterId);
    if (!canManage) {
      return {
        success: false,
        isPending: false,
        message: "Только владелец пространства может приглашать участников или изменять роли",
      };
    }

    const rawRole = (params.role || "editor").toLowerCase();
    const validRole = ["editor", "commenter", "viewer"].includes(rawRole)
      ? rawRole
      : "viewer";

    const roleName =
      validRole === "viewer"
        ? "Читатель"
        : validRole === "commenter"
        ? "Комментатор"
        : "Редактор";

    // Check if user exists
    const userRes = await query(`SELECT id, name, email FROM users WHERE LOWER(email) = $1`, [email]);

    if (userRes.rows.length > 0) {
      const targetUser = userRes.rows[0];
      await query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (workspace_id, user_id) 
         DO UPDATE SET role = EXCLUDED.role`,
        [validWsId, targetUser.id, validRole]
      );
      return {
        success: true,
        isPending: false,
        message: `Пользователь ${targetUser.name} (${email}) успешно назначен на роль «${roleName}»`,
      };
    } else {
      // Save to workspace_invitations
      try {
        await query(
          `INSERT INTO workspace_invitations (workspace_id, email, role, inviter_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (workspace_id, email)
           DO UPDATE SET role = EXCLUDED.role`,
          [validWsId, email, validRole, validInviterId]
        );
      } catch {
        // ignore
      }
      return {
        success: true,
        isPending: true,
        message: `Приглашение с ролью «${roleName}» отправлено на ${email}. Доступ откроется сразу после регистрации`,
      };
    }
  }

  /**
   * Removes a member from a workspace.
   */
  static async removeMember(params: {
    workspaceId: string;
    targetUserId: string;
    requesterId: string;
  }): Promise<{ success: boolean; message: string }> {
    const validWsId = toValidUUID(params.workspaceId);
    const validTargetId = toValidUUID(params.targetUserId);
    const validRequesterId = toValidUUID(params.requesterId);

    const canManage = await this.canUserManageWorkspace(validWsId, validRequesterId);
    if (!canManage) {
      return { success: false, message: "Только владелец может удалять участников" };
    }

    const ws = await query<{ owner_id: string }>(`SELECT owner_id FROM workspaces WHERE id = $1`, [validWsId]);
    if (ws.rows.length > 0 && ws.rows[0].owner_id === validTargetId) {
      return { success: false, message: "Нельзя удалить владельца пространства" };
    }

    try {
      await query(`DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`, [
        validWsId,
        validTargetId,
      ]);
      return { success: true, message: "Участник успешно удален из пространства" };
    } catch {
      return { success: false, message: "Ошибка удаления участника" };
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
      ON CONFLICT (workspace_id, user_id) 
      DO UPDATE SET role = EXCLUDED.role
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
   * Retrieves all documents for a given workspace with access check and user role.
   */
  static async getWorkspaceDocuments(workspaceId: string, userId?: string): Promise<Document[]> {
    const validWsId = toValidUUID(workspaceId);

    let userRole: MemberRole = "viewer";
    let canEdit = false;

    if (userId) {
      const hasAccess = await this.isUserMemberOrOwner(validWsId, userId);
      if (!hasAccess) return [];
      const role = await this.getUserRoleInWorkspace(validWsId, userId);
      if (role) {
        userRole = role;
        canEdit = role === "owner" || role === "editor";
      }
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
        currentUserRole: userRole,
        canEdit,
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
      currentUserRole: "owner",
      canEdit: true,
      wordCount: 0,
      isFavorite: false,
      isArchived: false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Updates an existing document (title, content, updated_at) with strict edit permission check.
   */
  static async updateDocument(
    id: string,
    updates: { title?: string; content?: string },
    userId?: string
  ): Promise<boolean> {
    const validId = toValidUUID(id);

    if (userId) {
      const canEdit = await this.canUserEditDocument(id, userId);
      if (!canEdit) {
        console.warn(`[WorkspaceRepository.updateDocument] User ${userId} denied edit access to doc ${id}`);
        return false;
      }
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
   * Retrieves document metadata and content with access verification and edit rights.
   */
  static async getDocumentById(
    id: string,
    userId?: string
  ): Promise<{
    document: Document;
    content: string;
    userRole: MemberRole;
    canEdit: boolean;
  } | null> {
    const validId = toValidUUID(id);
    const sql = `SELECT * FROM documents WHERE id = $1`;

    try {
      const res = await query<DbDocumentRow>(sql, [validId]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      let userRole: MemberRole = "viewer";
      let canEdit = false;

      if (userId) {
        const validUserId = toValidUUID(userId);
        if (row.workspace_id) {
          const hasAccess = await this.isUserMemberOrOwner(row.workspace_id, userId);
          if (!hasAccess && row.created_by !== validUserId) {
            return null;
          }
          const role = await this.getUserRoleInWorkspace(row.workspace_id, userId);
          if (role) {
            userRole = role;
            canEdit = role === "owner" || role === "editor";
          }
        } else {
          if (row.created_by !== validUserId) {
            return null;
          }
          userRole = "owner";
          canEdit = true;
        }
      }

      return {
        document: {
          id: row.id,
          workspaceId: row.workspace_id || "",
          title: row.title,
          defaultBranch: row.default_branch || "main",
          createdBy: row.created_by || "",
          currentUserRole: userRole,
          canEdit,
          wordCount: 0,
          isFavorite: false,
          isArchived: false,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        content: row.content || "",
        userRole,
        canEdit,
      };
    } catch (err) {
      console.error("[WorkspaceRepository.getDocumentById error]:", err);
      return null;
    }
  }
}
