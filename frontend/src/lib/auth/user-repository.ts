import { query } from "@/lib/db/postgres";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  avatar_url: string | null;
  role: string;
  email_verified: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
  status: string;
  timezone: string;
  locale: "ru" | "en";
  createdAt: string;
  updatedAt: string;
}

function rowToSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role || "user",
    emailVerified: Boolean(row.email_verified),
    status: row.status || "active",
    timezone: "Europe/Moscow",
    locale: "ru",
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class UserRepository {
  private static tableEnsured = false;

  static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'active';
        UPDATE users SET email_verified = true WHERE role IN ('admin', 'system');
      `);
      this.tableEnsured = true;
    } catch (err) {
      console.warn("[UserRepository] ensureTable notice:", (err as Error).message);
    }
  }

  static async findByEmail(email: string): Promise<UserRow | null> {
    await this.ensureTable();
    const res = await query<UserRow>(
      `SELECT id, email, name, password_hash, avatar_url, role,
              COALESCE(email_verified, false) AS email_verified,
              COALESCE(status, 'active') AS status,
              created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );
    return res.rows[0] || null;
  }

  static async findById(id: string): Promise<SafeUser | null> {
    await this.ensureTable();
    const res = await query<UserRow>(
      `SELECT id, email, name, password_hash, avatar_url, role,
              COALESCE(email_verified, false) AS email_verified,
              COALESCE(status, 'active') AS status,
              created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    if (!res.rows[0]) return null;
    return rowToSafeUser(res.rows[0]);
  }

  static async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: string;
    emailVerified?: boolean;
    status?: string;
  }): Promise<SafeUser> {
    await this.ensureTable();
    const role = data.role || "user";
    const emailVerified = data.emailVerified !== undefined ? data.emailVerified : false;
    const status = data.status || "active";

    const userRes = await query<UserRow>(
      `INSERT INTO users (email, name, password_hash, role, email_verified, status)
       VALUES (LOWER($1), $2, $3, $4, $5, $6)
       RETURNING id, email, name, password_hash, avatar_url, role, email_verified, status, created_at, updated_at`,
      [data.email.trim(), data.name.trim(), data.passwordHash, role, emailVerified, status]
    );
    const user = userRes.rows[0];

    // Automatically create default workspace for the user
    try {
      const wsRes = await query<{ id: string }>(
        `INSERT INTO workspaces (name, owner_id)
         VALUES ($1, $2)
         RETURNING id`,
        [`Рабочее пространство ${user.name}`, user.id]
      );
      if (wsRes.rows[0]) {
        await query(
          `INSERT INTO workspace_members (workspace_id, user_id, role)
           VALUES ($1, $2, 'owner')
           ON CONFLICT DO NOTHING`,
          [wsRes.rows[0].id, user.id]
        );
      }
    } catch (wsErr) {
      console.error("[UserRepository] Failed to create default workspace:", wsErr);
    }

    return rowToSafeUser(user);
  }

  static async updateProfile(
    id: string,
    data: { name?: string; avatarUrl?: string | null }
  ): Promise<SafeUser | null> {
    await this.ensureTable();
    const updates: string[] = ["updated_at = NOW()"];
    const values: (string | null)[] = [id];
    let paramIdx = 2;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      values.push(data.name.trim() || null);
    }

    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIdx++}`);
      values.push(data.avatarUrl || null);
    }

    const res = await query<UserRow>(
      `UPDATE users
       SET ${updates.join(", ")}
       WHERE id = $1
       RETURNING id, email, name, password_hash, avatar_url, role,
                 COALESCE(email_verified, false) AS email_verified,
                 COALESCE(status, 'active') AS status,
                 created_at, updated_at`,
      values
    );
    if (!res.rows[0]) return null;
    return rowToSafeUser(res.rows[0]);
  }

  static async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    await this.ensureTable();
    const res = await query(
      `UPDATE users
       SET password_hash = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [id, passwordHash]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
