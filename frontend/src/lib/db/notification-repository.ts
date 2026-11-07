import { query } from "@/lib/db/postgres";
import { toValidUUID } from "@/lib/db/workspace-repository";

export type NotificationType = "comment" | "merge" | "invite" | "commit" | "system";

export interface DbNotificationRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: NotificationType;
  link?: string | null;
  createdAt: string;
}

let tableInitialized = false;

function formatRelativeTime(dateStr: string): string {
  try {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return "Только что";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} мин назад`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Вчера";
    if (diffDays < 7) return `${diffDays} дн назад`;

    const d = new Date(dateStr);
    return `${d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`;
  } catch {
    return "Недавно";
  }
}

export class NotificationRepository {
  /**
   * Ensures the notifications table and its indexes exist in PostgreSQL.
   */
  static async ensureTable(): Promise<void> {
    if (tableInitialized) return;

    const sql = `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(32) NOT NULL DEFAULT 'system',
        link TEXT,
        read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read);
    `;

    try {
      await query(sql);
      tableInitialized = true;
    } catch (err) {
      console.error("[NotificationRepository.ensureTable Error]:", err);
    }
  }

  /**
   * Creates a notification for a specific user.
   */
  static async createNotification(params: {
    userId: string;
    title: string;
    description: string;
    type?: NotificationType;
    link?: string | null;
  }): Promise<AppNotification | null> {
    await this.ensureTable();

    const validUserId = toValidUUID(params.userId);
    const type = params.type || "system";
    const link = params.link || null;

    const sql = `
      INSERT INTO notifications (user_id, title, description, type, link, read)
      VALUES ($1, $2, $3, $4, $5, false)
      RETURNING id, user_id, title, description, type, link, read, created_at
    `;

    try {
      const res = await query<DbNotificationRow>(sql, [
        validUserId,
        params.title,
        params.description,
        type,
        link,
      ]);

      const row = res.rows[0];
      if (!row) return null;

      return {
        id: row.id,
        title: row.title,
        desc: row.description,
        time: "Только что",
        unread: !row.read,
        type: (row.type as NotificationType) || "system",
        link: row.link,
        createdAt: row.created_at,
      };
    } catch (err) {
      console.error("[NotificationRepository.createNotification Error]:", err);
      return null;
    }
  }

  /**
   * Fetches notifications for a specific user.
   */
  static async getUserNotifications(userId: string, limit = 40): Promise<AppNotification[]> {
    await this.ensureTable();
    const validUserId = toValidUUID(userId);

    const sql = `
      SELECT id, user_id, title, description, type, link, read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    try {
      const res = await query<DbNotificationRow>(sql, [validUserId, limit]);

      // If user has 0 notifications (e.g. newly registered), create an initial welcome notification
      if (res.rows.length === 0) {
        const welcome = await this.createNotification({
          userId: validUserId,
          title: "Добро пожаловать в SyncPro!",
          description: "Ваше рабочее пространство готово к совместной работе. Создавайте документы и приглашайте коллег.",
          type: "system",
          link: "/dashboard",
        });
        return welcome ? [welcome] : [];
      }

      return res.rows.map((row) => ({
        id: row.id,
        title: row.title,
        desc: row.description,
        time: formatRelativeTime(row.created_at),
        unread: !row.read,
        type: (row.type as NotificationType) || "system",
        link: row.link,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error("[NotificationRepository.getUserNotifications Error]:", err);
      return [];
    }
  }

  /**
   * Returns the count of unread notifications for a user.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    await this.ensureTable();
    const validUserId = toValidUUID(userId);

    const sql = `
      SELECT COUNT(*)::int as unread_count
      FROM notifications
      WHERE user_id = $1 AND read = false
    `;

    try {
      const res = await query<{ unread_count: number }>(sql, [validUserId]);
      return res.rows[0]?.unread_count ?? 0;
    } catch (err) {
      console.error("[NotificationRepository.getUnreadCount Error]:", err);
      return 0;
    }
  }

  /**
   * Marks a specific notification as read.
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    await this.ensureTable();
    const validNotifId = toValidUUID(notificationId);
    const validUserId = toValidUUID(userId);

    const sql = `
      UPDATE notifications
      SET read = true
      WHERE id = $1 AND user_id = $2
    `;

    try {
      const res = await query(sql, [validNotifId, validUserId]);
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      console.error("[NotificationRepository.markAsRead Error]:", err);
      return false;
    }
  }

  /**
   * Marks all unread notifications for a user as read.
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    await this.ensureTable();
    const validUserId = toValidUUID(userId);

    const sql = `
      UPDATE notifications
      SET read = true
      WHERE user_id = $1 AND read = false
    `;

    try {
      const res = await query(sql, [validUserId]);
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      console.error("[NotificationRepository.markAllAsRead Error]:", err);
      return false;
    }
  }

  /**
   * Deletes a notification.
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    await this.ensureTable();
    const validNotifId = toValidUUID(notificationId);
    const validUserId = toValidUUID(userId);

    const sql = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
    `;

    try {
      const res = await query(sql, [validNotifId, validUserId]);
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      console.error("[NotificationRepository.deleteNotification Error]:", err);
      return false;
    }
  }

  /**
   * Broadcasts a notification to all members of a workspace (optionally excluding the actor).
   */
  static async notifyWorkspaceMembers(params: {
    workspaceId: string;
    excludeUserId?: string | null;
    title: string;
    description: string;
    type: NotificationType;
    link?: string | null;
  }): Promise<void> {
    await this.ensureTable();
    const validWsId = toValidUUID(params.workspaceId);
    const excludeId = params.excludeUserId ? toValidUUID(params.excludeUserId) : null;

    const sql = `
      SELECT user_id 
      FROM workspace_members 
      WHERE workspace_id = $1 ${excludeId ? "AND user_id != $2" : ""}
    `;
    const queryParams = excludeId ? [validWsId, excludeId] : [validWsId];

    try {
      const res = await query<{ user_id: string }>(sql, queryParams);
      for (const row of res.rows) {
        await this.createNotification({
          userId: row.user_id,
          title: params.title,
          description: params.description,
          type: params.type,
          link: params.link,
        });
      }
    } catch (err) {
      console.error("[NotificationRepository.notifyWorkspaceMembers Error]:", err);
    }
  }
}
