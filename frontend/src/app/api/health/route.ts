import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import { getRedisClient } from "@/lib/db/redis";
import { getS3Client } from "@/lib/db/s3";
import { ListBucketsCommand } from "@aws-sdk/client-s3";

export async function GET() {
  const health: Record<string, { status: "up" | "down" | "degraded"; latencyMs?: number }> = {};

  // 1. PostgreSQL check
  const pgStart = Date.now();
  try {
    const res = await query("SELECT 1 as ping");
    health.postgres = {
      status: res.rows.length > 0 ? "up" : "degraded",
      latencyMs: Date.now() - pgStart,
    };
  } catch {
    health.postgres = {
      status: "down",
      latencyMs: Date.now() - pgStart,
    };
  }

  // 2. Redis check
  const redisStart = Date.now();
  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    health.redis = {
      status: pong === "PONG" ? "up" : "degraded",
      latencyMs: Date.now() - redisStart,
    };
  } catch {
    health.redis = {
      status: "down",
      latencyMs: Date.now() - redisStart,
    };
  }

  // 3. S3 / MinIO check
  const s3Start = Date.now();
  try {
    const s3 = getS3Client();
    await s3.send(new ListBucketsCommand({}));
    health.minio_s3 = {
      status: "up",
      latencyMs: Date.now() - s3Start,
    };
  } catch {
    health.minio_s3 = {
      status: "down",
      latencyMs: Date.now() - s3Start,
    };
  }

  const isHealthy = Object.values(health).every((h) => h.status === "up");

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: health,
    },
    { status: isHealthy ? 200 : 207 }
  );
}
