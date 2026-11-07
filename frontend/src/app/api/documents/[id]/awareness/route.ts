import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/db/redis";
import { getUserFromRequest } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await params;
  const key = `syncpro:awareness:${id}`;

  try {
    const redis = getRedisClient();
    const members = await redis.hgetall(key);
    const users = Object.entries(members).map(([clientId, dataJson]) => {
      try {
        return { clientId, ...JSON.parse(dataJson) };
      } catch {
        return { clientId, raw: dataJson };
      }
    });

    return NextResponse.json({
      documentId: id,
      activeUsersCount: users.length,
      users,
      source: "redis",
    });
  } catch (err) {
    console.warn(`[Awareness API] Redis fallback for ${id}:`, (err as Error).message);
    return NextResponse.json({
      documentId: id,
      activeUsersCount: 1,
      users: [
        {
          clientId: "local",
          user: { name: "Вы", color: "#3b82f6" },
          cursor: { blockId: "root", offset: 0 },
          updatedAt: Date.now(),
        },
      ],
      source: "fallback",
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { clientId, state } = body;

  if (!clientId || !state) {
    return NextResponse.json({ error: "clientId and state required" }, { status: 400 });
  }

  const key = `syncpro:awareness:${id}`;
  try {
    const redis = getRedisClient();
    await redis.hset(key, String(clientId), JSON.stringify({ ...state, updatedAt: Date.now() }));
    // TTL of 60 seconds for ephemeral state
    await redis.expire(key, 60);

    return NextResponse.json({ success: true, clientId, documentId: id });
  } catch (err) {
    console.warn(`[Awareness API] Redis save fallback:`, (err as Error).message);
    return NextResponse.json({ success: true, fallback: true });
  }
}
