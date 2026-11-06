import { Pool, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    } else {
      pool = new Pool({
        host: process.env.POSTGRES_HOST || "postgres",
        port: Number.parseInt(process.env.POSTGRES_PORT || "5432", 10),
        database: process.env.POSTGRES_DB || "syncpro_prod",
        user: process.env.POSTGRES_USER || "syncpro",
        password: process.env.POSTGRES_PASSWORD || "syncpro_secret",
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }

    pool.on("error", (err) => {
      console.error("[PostgreSQL Pool Error]:", err);
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const client = getDbPool();
  try {
    const res = await client.query<T>(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[Slow Query] ${duration}ms: ${text.slice(0, 100)}`);
    }
    return res;
  } catch (error) {
    console.error(`[DB Query Error] Query: ${text}`, error);
    throw error;
  }
}
