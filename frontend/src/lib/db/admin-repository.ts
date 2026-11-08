import { query } from "./postgres";
import { hashPassword } from "@/lib/auth/password";
import { SubscriptionRepository, SubscriptionPlan } from "./subscription-repository";
import { VerificationRepository } from "./verification-repository";

export interface SystemMetrics {
  totalUsers: number;
  verifiedUsers: number;
  blockedUsers: number;
  plans: {
    free: number;
    pro: number;
    enterprise: number;
  };
  totalWorkspaces: number;
  totalDocuments: number;
  deletedDocuments: number;
  totalCommits: number;
  totalStorageBytes: number;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  status: string;
  plan: string;
  subscriptionStatus: string;
  expiresAt: string | null;
  workspacesCount: number;
  documentsCount: number;
  createdAt: string;
}

export interface AdminWorkspaceListItem {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  documentCount: number;
  createdAt: string;
}

export interface AdminDocumentListItem {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  createdById: string;
  authorName: string;
  authorEmail: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export class AdminRepository {
  private static tableEnsured = false;

  static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await VerificationRepository.ensureTable();
      await SubscriptionRepository.ensureTable();

      await query(`
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(64) NOT NULL,
          target_type VARCHAR(32) NOT NULL,
          target_id TEXT,
          details JSONB,
          ip_address VARCHAR(45),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
      `);

      this.tableEnsured = true;
    } catch (err) {
      console.warn("[AdminRepository] ensureTable notice:", (err as Error).message);
    }
  }

  static async logAction(params: {
    actorId?: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    details?: Record<string, unknown>;
    ipAddress?: string | null;
  }): Promise<void> {
    await this.ensureTable();
    try {
      await query(
        `INSERT INTO audit_logs (actor_id, action, target_type, target_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          params.actorId || null,
          params.action,
          params.targetType,
          params.targetId || null,
          params.details ? JSON.stringify(params.details) : null,
          params.ipAddress || null,
        ]
      );
    } catch (err) {
      console.error("[AdminRepository.logAction error]:", err);
    }
  }

  static async getMetrics(): Promise<SystemMetrics> {
    await this.ensureTable();

    // Users counts
    const usersRes = await query<{
      total: string;
      verified: string;
      blocked: string;
    }>(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked
      FROM users
      WHERE role != 'system'
    `);

    // Subscriptions
    const subRes = await query<{ plan: string; count: string }>(`
      SELECT COALESCE(plan, 'free') as plan, COUNT(*) as count
      FROM subscriptions
      GROUP BY plan
    `);

    const plansCount = { free: 0, pro: 0, enterprise: 0 };
    for (const r of subRes.rows) {
      if (r.plan === "pro") plansCount.pro = parseInt(r.count, 10);
      else if (r.plan === "enterprise") plansCount.enterprise = parseInt(r.count, 10);
      else plansCount.free = parseInt(r.count, 10);
    }

    // Workspaces
    const wsRes = await query<{ count: string }>(`SELECT COUNT(*) as count FROM workspaces`);

    // Documents
    const docRes = await query<{
      total: string;
      deleted: string;
    }>(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted
      FROM documents
    `);

    // Commits
    const commitsRes = await query<{ count: string }>(`SELECT COUNT(*) as count FROM commits`);

    // Storage
    let totalStorage = 0;
    try {
      const storageRes = await query<{ total: string }>(`
        SELECT (
          COALESCE((SELECT SUM(size_bytes) FROM document_files), 0) +
          COALESCE((SELECT SUM(file_size_bytes) FROM fonts), 0)
        ) as total
      `);
      if (storageRes.rows[0]) {
        totalStorage = parseInt(storageRes.rows[0].total, 10) || 0;
      }
    } catch {
      // fallback
    }

    return {
      totalUsers: parseInt(usersRes.rows[0]?.total || "0", 10),
      verifiedUsers: parseInt(usersRes.rows[0]?.verified || "0", 10),
      blockedUsers: parseInt(usersRes.rows[0]?.blocked || "0", 10),
      plans: plansCount,
      totalWorkspaces: parseInt(wsRes.rows[0]?.count || "0", 10),
      totalDocuments: parseInt(docRes.rows[0]?.total || "0", 10),
      deletedDocuments: parseInt(docRes.rows[0]?.deleted || "0", 10),
      totalCommits: parseInt(commitsRes.rows[0]?.count || "0", 10),
      totalStorageBytes: totalStorage,
    };
  }

  static async listUsers(options?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: AdminUserListItem[]; total: number }> {
    await this.ensureTable();

    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["u.role != 'system'"];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (options?.search && options.search.trim()) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      values.push(`%${options.search.trim()}%`);
      paramIndex++;
    }

    if (options?.role && options.role !== "all") {
      conditions.push(`u.role = $${paramIndex}`);
      values.push(options.role);
      paramIndex++;
    }

    if (options?.status && options.status !== "all") {
      conditions.push(`u.status = $${paramIndex}`);
      values.push(options.status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users u ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || "0", 10);

    const listRes = await query<{
      id: string;
      name: string;
      email: string;
      role: string;
      email_verified: boolean;
      status: string;
      plan: string | null;
      sub_status: string | null;
      expires_at: string | null;
      ws_count: string;
      doc_count: string;
      created_at: string;
    }>(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         COALESCE(u.email_verified, false) as email_verified,
         COALESCE(u.status, 'active') as status,
         s.plan,
         s.status as sub_status,
         s.expires_at,
         COALESCE(w.cnt, 0) as ws_count,
         COALESCE(d.cnt, 0) as doc_count,
         u.created_at
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       LEFT JOIN (
         SELECT owner_id, COUNT(*) as cnt FROM workspaces GROUP BY owner_id
       ) w ON w.owner_id = u.id
       LEFT JOIN (
         SELECT created_by, COUNT(*) as cnt FROM documents WHERE is_deleted = false GROUP BY created_by
       ) d ON d.created_by = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset]
    );

    const users: AdminUserListItem[] = listRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      emailVerified: Boolean(r.email_verified),
      status: r.status,
      plan: r.plan || "free",
      subscriptionStatus: r.sub_status || "active",
      expiresAt: r.expires_at,
      workspacesCount: parseInt(r.ws_count, 10),
      documentsCount: parseInt(r.doc_count, 10),
      createdAt: r.created_at,
    }));

    return { users, total };
  }

  static async forceVerifyEmail(
    adminId: string,
    userId: string,
    ipAddress?: string
  ): Promise<boolean> {
    await this.ensureTable();
    const res = await query(
      `UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    if ((res.rowCount ?? 0) > 0) {
      await this.logAction({
        actorId: adminId,
        action: "user.force_verify_email",
        targetType: "user",
        targetId: userId,
        ipAddress,
      });
      return true;
    }
    return false;
  }

  static async updateUserStatus(
    adminId: string,
    userId: string,
    status: "active" | "blocked",
    ipAddress?: string
  ): Promise<boolean> {
    await this.ensureTable();
    const res = await query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, userId]
    );

    if ((res.rowCount ?? 0) > 0) {
      await this.logAction({
        actorId: adminId,
        action: `user.${status === "blocked" ? "block" : "unblock"}`,
        targetType: "user",
        targetId: userId,
        details: { newStatus: status },
        ipAddress,
      });
      return true;
    }
    return false;
  }

  static async updateUserRole(
    adminId: string,
    userId: string,
    role: "user" | "admin",
    ipAddress?: string
  ): Promise<boolean> {
    await this.ensureTable();
    const res = await query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
      [role, userId]
    );

    if ((res.rowCount ?? 0) > 0) {
      await this.logAction({
        actorId: adminId,
        action: "user.change_role",
        targetType: "user",
        targetId: userId,
        details: { newRole: role },
        ipAddress,
      });
      return true;
    }
    return false;
  }

  static async resetUserPassword(
    adminId: string,
    userId: string,
    newPasswordPlain: string,
    ipAddress?: string
  ): Promise<boolean> {
    await this.ensureTable();
    const hashed = await hashPassword(newPasswordPlain);
    const res = await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hashed, userId]
    );

    if ((res.rowCount ?? 0) > 0) {
      await this.logAction({
        actorId: adminId,
        action: "user.reset_password",
        targetType: "user",
        targetId: userId,
        ipAddress,
      });
      return true;
    }
    return false;
  }

  static async updateUserPlan(
    adminId: string,
    userId: string,
    plan: SubscriptionPlan,
    durationDays = 30,
    ipAddress?: string
  ): Promise<boolean> {
    await this.ensureTable();

    const expiresAt = plan === "free" ? null : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    await SubscriptionRepository.updateSubscription(userId, {
      plan,
      status: "active",
      expiresAt,
    });

    await this.logAction({
      actorId: adminId,
      action: "user.change_plan",
      targetType: "user",
      targetId: userId,
      details: { plan, durationDays, expiresAt },
      ipAddress,
    });

    return true;
  }

  static async listWorkspaces(options?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ workspaces: AdminWorkspaceListItem[]; total: number }> {
    await this.ensureTable();

    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (options?.search && options.search.trim()) {
      conditions.push(`(w.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
      values.push(`%${options.search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM workspaces w LEFT JOIN users u ON u.id = w.owner_id ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || "0", 10);

    const listRes = await query<{
      id: string;
      name: string;
      owner_id: string;
      owner_name: string;
      owner_email: string;
      member_count: string;
      doc_count: string;
      created_at: string;
    }>(
      `SELECT
         w.id,
         w.name,
         w.owner_id,
         COALESCE(u.name, 'Без владельца') as owner_name,
         COALESCE(u.email, '—') as owner_email,
         COALESCE(m.cnt, 0) as member_count,
         COALESCE(d.cnt, 0) as doc_count,
         w.created_at
       FROM workspaces w
       LEFT JOIN users u ON u.id = w.owner_id
       LEFT JOIN (
         SELECT workspace_id, COUNT(*) as cnt FROM workspace_members GROUP BY workspace_id
       ) m ON m.workspace_id = w.id
       LEFT JOIN (
         SELECT workspace_id, COUNT(*) as cnt FROM documents WHERE is_deleted = false GROUP BY workspace_id
       ) d ON d.workspace_id = w.id
       ${whereClause}
       ORDER BY w.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset]
    );

    const workspaces: AdminWorkspaceListItem[] = listRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      ownerId: r.owner_id,
      ownerName: r.owner_name,
      ownerEmail: r.owner_email,
      memberCount: parseInt(r.member_count, 10),
      documentCount: parseInt(r.doc_count, 10),
      createdAt: r.created_at,
    }));

    return { workspaces, total };
  }

  static async transferWorkspaceOwnership(
    adminId: string,
    workspaceId: string,
    newOwnerEmailOrId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureTable();

    // Find new owner
    const userRes = await query<{ id: string; email: string; name: string }>(
      `SELECT id, email, name FROM users WHERE id::text = $1 OR LOWER(email) = LOWER($1) LIMIT 1`,
      [newOwnerEmailOrId.trim()]
    );
    const newOwner = userRes.rows[0];
    if (!newOwner) {
      return { success: false, error: "Новый владелец не найден" };
    }

    // Update workspace owner
    const wsRes = await query(
      `UPDATE workspaces SET owner_id = $1, updated_at = NOW() WHERE id = $2`,
      [newOwner.id, workspaceId]
    );

    if ((wsRes.rowCount ?? 0) === 0) {
      return { success: false, error: "Рабочее пространство не найдено" };
    }

    // Ensure member record exists as owner
    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner'`,
      [workspaceId, newOwner.id]
    );

    await this.logAction({
      actorId: adminId,
      action: "workspace.transfer_ownership",
      targetType: "workspace",
      targetId: workspaceId,
      details: { newOwnerId: newOwner.id, newOwnerEmail: newOwner.email },
      ipAddress,
    });

    return { success: true };
  }

  static async listDocuments(options?: {
    search?: string;
    includeDeleted?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ documents: AdminDocumentListItem[]; total: number }> {
    await this.ensureTable();

    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (!options?.includeDeleted) {
      conditions.push(`d.is_deleted = false`);
    }

    if (options?.search && options.search.trim()) {
      conditions.push(`(d.title ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR w.name ILIKE $${paramIndex})`);
      values.push(`%${options.search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM documents d
       LEFT JOIN users u ON u.id = d.created_by
       LEFT JOIN workspaces w ON w.id = d.workspace_id
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || "0", 10);

    const listRes = await query<{
      id: string;
      title: string;
      workspace_id: string;
      workspace_name: string;
      created_by: string;
      author_name: string;
      author_email: string;
      is_deleted: boolean;
      deleted_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT
         d.id,
         d.title,
         d.workspace_id,
         COALESCE(w.name, 'Без пространства') as workspace_name,
         d.created_by,
         COALESCE(u.name, 'Аноним') as author_name,
         COALESCE(u.email, '—') as author_email,
         COALESCE(d.is_deleted, false) as is_deleted,
         d.deleted_at,
         d.created_at,
         d.updated_at
       FROM documents d
       LEFT JOIN users u ON u.id = d.created_by
       LEFT JOIN workspaces w ON w.id = d.workspace_id
       ${whereClause}
       ORDER BY d.updated_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset]
    );

    const documents: AdminDocumentListItem[] = listRes.rows.map((r) => ({
      id: r.id,
      title: r.title,
      workspaceId: r.workspace_id,
      workspaceName: r.workspace_name,
      createdById: r.created_by,
      authorName: r.author_name,
      authorEmail: r.author_email,
      isDeleted: Boolean(r.is_deleted),
      deletedAt: r.deleted_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return { documents, total };
  }

  static async transferDocumentOwnership(
    adminId: string,
    documentId: string,
    newOwnerEmailOrId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureTable();

    const userRes = await query<{ id: string; email: string; name: string }>(
      `SELECT id, email, name FROM users WHERE id::text = $1 OR LOWER(email) = LOWER($1) LIMIT 1`,
      [newOwnerEmailOrId.trim()]
    );
    const newOwner = userRes.rows[0];
    if (!newOwner) {
      return { success: false, error: "Новый владелец не найден" };
    }

    const docRes = await query(
      `UPDATE documents SET created_by = $1, updated_at = NOW() WHERE id = $2`,
      [newOwner.id, documentId]
    );

    if ((docRes.rowCount ?? 0) === 0) {
      return { success: false, error: "Документ не найден" };
    }

    await this.logAction({
      actorId: adminId,
      action: "document.transfer_ownership",
      targetType: "document",
      targetId: documentId,
      details: { newOwnerId: newOwner.id, newOwnerEmail: newOwner.email },
      ipAddress,
    });

    return { success: true };
  }

  static async restoreDocument(
    adminId: string,
    documentId: string,
    ipAddress?: string
  ): Promise<boolean> {
    await this.ensureTable();
    const res = await query(
      `UPDATE documents SET is_deleted = false, deleted_at = NULL, updated_at = NOW() WHERE id = $1`,
      [documentId]
    );

    if ((res.rowCount ?? 0) > 0) {
      await this.logAction({
        actorId: adminId,
        action: "document.restore",
        targetType: "document",
        targetId: documentId,
        ipAddress,
      });
      return true;
    }
    return false;
  }

  static async softDeleteDocument(
    adminId: string,
    documentId: string,
    ipAddress?: string
  ): Promise<boolean> {
    await this.ensureTable();
    const res = await query(
      `UPDATE documents SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [documentId]
    );

    if ((res.rowCount ?? 0) > 0) {
      await this.logAction({
        actorId: adminId,
        action: "document.delete",
        targetType: "document",
        targetId: documentId,
        ipAddress,
      });
      return true;
    }
    return false;
  }

  static async listAuditLogs(options?: {
    limit?: number;
    offset?: number;
  }): Promise<AuditLogItem[]> {
    await this.ensureTable();
    const limit = Math.min(100, Math.max(1, options?.limit || 50));
    const offset = Math.max(0, options?.offset || 0);

    const res = await query<{
      id: string;
      actor_id: string | null;
      actor_name: string;
      actor_email: string;
      action: string;
      target_type: string;
      target_id: string | null;
      details: Record<string, unknown> | null;
      ip_address: string | null;
      created_at: string;
    }>(
      `SELECT
         a.id,
         a.actor_id,
         COALESCE(u.name, 'Система') as actor_name,
         COALESCE(u.email, 'system@syncpro.dev') as actor_email,
         a.action,
         a.target_type,
         a.target_id,
         a.details,
         a.ip_address,
         a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorEmail: r.actor_email,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      details: r.details,
      ipAddress: r.ip_address,
      createdAt: r.created_at,
    }));
  }
}
