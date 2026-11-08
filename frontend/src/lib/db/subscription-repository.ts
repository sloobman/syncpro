import { query } from "./postgres";

export type SubscriptionPlan = "free" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "trial" | "expired" | "cancelled";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string | null;
  storage_limit_bytes: number;
  max_workspaces: number;
  created_at: string;
  updated_at: string;
}

export interface UserSubscriptionDetails {
  subscription: SubscriptionRow;
  storageUsedBytes: number;
  workspacesCount: number;
  documentsCount: number;
  canUseCustomFonts: boolean;
}

export const PLAN_LIMITS = {
  free: {
    storageLimitBytes: 100 * 1024 * 1024, // 100 MB
    maxWorkspaces: 3,
    customFonts: false,
    name: "Free",
  },
  pro: {
    storageLimitBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    maxWorkspaces: 20,
    customFonts: true,
    name: "Pro",
  },
  enterprise: {
    storageLimitBytes: 100 * 1024 * 1024 * 1024, // 100 GB
    maxWorkspaces: 100,
    customFonts: true,
    name: "Enterprise",
  },
};

export class SubscriptionRepository {
  private static tableEnsured = false;

  static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          plan VARCHAR(32) NOT NULL DEFAULT 'free',
          status VARCHAR(32) NOT NULL DEFAULT 'active',
          starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ,
          storage_limit_bytes BIGINT NOT NULL DEFAULT 104857600,
          max_workspaces INTEGER NOT NULL DEFAULT 3,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
      `);
      this.tableEnsured = true;
    } catch (err) {
      console.warn("[SubscriptionRepository] ensureTable notice:", (err as Error).message);
    }
  }

  /**
   * Retrieves or automatically initializes a user's subscription.
   */
  static async getSubscription(userId: string): Promise<UserSubscriptionDetails> {
    await this.ensureTable();

    let res = await query<SubscriptionRow>(
      `SELECT id, user_id, plan, status, starts_at, expires_at, storage_limit_bytes, max_workspaces, created_at, updated_at
       FROM subscriptions
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (!res.rows[0]) {
      // Create default free subscription
      const inserted = await query<SubscriptionRow>(
        `INSERT INTO subscriptions (user_id, plan, status, storage_limit_bytes, max_workspaces)
         VALUES ($1, 'free', 'active', $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
         RETURNING id, user_id, plan, status, starts_at, expires_at, storage_limit_bytes, max_workspaces, created_at, updated_at`,
        [userId, PLAN_LIMITS.free.storageLimitBytes, PLAN_LIMITS.free.maxWorkspaces]
      );
      res = inserted;
    }

    const sub = res.rows[0];

    // Check if subscription has expired
    if (sub.expires_at && new Date(sub.expires_at).getTime() < Date.now() && sub.status === "active") {
      await query(
        `UPDATE subscriptions
         SET status = 'expired', updated_at = NOW()
         WHERE id = $1`,
        [sub.id]
      );
      sub.status = "expired";
    }

    // Calculate user's storage used across files and fonts
    let storageUsed = 0;
    try {
      const filesRes = await query<{ total: string }>(
        `SELECT COALESCE(SUM(df.size_bytes), 0) as total
         FROM document_files df
         JOIN documents d ON d.id = df.document_id
         JOIN workspaces w ON w.id = d.workspace_id
         WHERE w.owner_id = $1`,
        [userId]
      );
      if (filesRes.rows[0]) {
        storageUsed += parseInt(filesRes.rows[0].total, 10) || 0;
      }

      const fontsRes = await query<{ total: string }>(
        `SELECT COALESCE(SUM(f.file_size_bytes), 0) as total
         FROM fonts f
         JOIN workspaces w ON w.id = f.workspace_id
         WHERE w.owner_id = $1`,
        [userId]
      );
      if (fontsRes.rows[0]) {
        storageUsed += parseInt(fontsRes.rows[0].total, 10) || 0;
      }
    } catch {
      // fallback
    }

    // Workspaces count
    let wsCount = 0;
    try {
      const wsRes = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM workspaces WHERE owner_id = $1`,
        [userId]
      );
      wsCount = parseInt(wsRes.rows[0]?.count || "0", 10);
    } catch {
      // fallback
    }

    // Documents count
    let docCount = 0;
    try {
      const docRes = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM documents WHERE created_by = $1 AND is_deleted = false`,
        [userId]
      );
      docCount = parseInt(docRes.rows[0]?.count || "0", 10);
    } catch {
      // fallback
    }

    const isActiveProOrEnterprise =
      (sub.plan === "pro" || sub.plan === "enterprise") &&
      (sub.status === "active" || sub.status === "trial");

    return {
      subscription: sub,
      storageUsedBytes: storageUsed,
      workspacesCount: wsCount,
      documentsCount: docCount,
      canUseCustomFonts: isActiveProOrEnterprise,
    };
  }

  /**
   * Updates an existing subscription or sets a new plan for user.
   */
  static async updateSubscription(
    userId: string,
    data: {
      plan?: SubscriptionPlan;
      status?: SubscriptionStatus;
      storageLimitBytes?: number;
      maxWorkspaces?: number;
      expiresAt?: Date | null;
    }
  ): Promise<SubscriptionRow> {
    await this.ensureTable();

    const plan = data.plan || "free";
    const limits = PLAN_LIMITS[plan];
    const storageLimit = data.storageLimitBytes !== undefined ? data.storageLimitBytes : limits.storageLimitBytes;
    const maxWs = data.maxWorkspaces !== undefined ? data.maxWorkspaces : limits.maxWorkspaces;
    const status = data.status || "active";
    const expiresAt = data.expiresAt !== undefined ? (data.expiresAt ? data.expiresAt.toISOString() : null) : null;

    const res = await query<SubscriptionRow>(
      `INSERT INTO subscriptions (user_id, plan, status, storage_limit_bytes, max_workspaces, expires_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         plan = EXCLUDED.plan,
         status = EXCLUDED.status,
         storage_limit_bytes = EXCLUDED.storage_limit_bytes,
         max_workspaces = EXCLUDED.max_workspaces,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()
       RETURNING id, user_id, plan, status, starts_at, expires_at, storage_limit_bytes, max_workspaces, created_at, updated_at`,
      [userId, plan, status, storageLimit, maxWs, expiresAt]
    );

    return res.rows[0];
  }
}
