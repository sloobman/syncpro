import { query } from "@/lib/db/postgres";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
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
    timezone: "Europe/Moscow",
    locale: "ru",
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class UserRepository {
  static async findByEmail(email: string): Promise<UserRow | null> {
    const res = await query<UserRow>(
      `SELECT id, email, name, password_hash, avatar_url, role, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );
    return res.rows[0] || null;
  }

  static async findById(id: string): Promise<SafeUser | null> {
    const res = await query<UserRow>(
      `SELECT id, email, name, password_hash, avatar_url, role, created_at, updated_at
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
  }): Promise<SafeUser> {
    const userRes = await query<UserRow>(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES (LOWER($1), $2, $3, $4)
       RETURNING id, email, name, password_hash, avatar_url, role, created_at, updated_at`,
      [data.email.trim(), data.name.trim(), data.passwordHash, data.role || "user"]
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
       RETURNING id, email, name, password_hash, avatar_url, role, created_at, updated_at`,
      values
    );
    if (!res.rows[0]) return null;
    return rowToSafeUser(res.rows[0]);
  }

  static async updatePassword(id: string, passwordHash: string): Promise<boolean> {
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
