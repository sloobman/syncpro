import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/db/redis";
import { getUserFromRequest } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const key = `syncpro:awareness:${id}`;
  const now = Date.now();

  try {
    const redis = getRedisClient();
    const members = await redis.hgetall(key);
    const expiredKeys: string[] = [];

    const activeUsers = Object.entries(members).flatMap(([clientId, dataJson]) => {
      try {
        const parsed = JSON.parse(dataJson);
        // Exclude users inactive for more than 10 seconds
        if (now - (parsed.updatedAt || 0) > 10000) {
          expiredKeys.push(clientId);
          return [];
        }
        return [
          {
            clientId,
            id: parsed.user?.id || clientId,
            name: parsed.user?.name || "Участник",
            avatarUrl: parsed.user?.avatarUrl || null,
            color: parsed.user?.color || "bg-primary",
            cursor: parsed.cursor || null,
            updatedAt: parsed.updatedAt || now,
          },
        ];
      } catch {
        return [];
      }
    });

    // Cleanup expired users from Redis in background
    if (expiredKeys.length > 0) {
      redis.hdel(key, ...expiredKeys).catch(() => {});
    }

    return NextResponse.json({
      documentId: id,
      activeUsersCount: activeUsers.length,
      users: activeUsers,
      source: "redis",
    });
  } catch (err) {
    console.warn(`[Awareness API] Redis fallback for ${id}:`, (err as Error).message);
    const user = getUserFromRequest(request);
    return NextResponse.json({
      documentId: id,
      activeUsersCount: 1,
      users: [
        {
          clientId: "local",
          id: user?.id || "local-user",
          name: user?.name ? `${user.name} (Вы)` : "Вы",
          avatarUrl: (user as { avatarUrl?: string | null })?.avatarUrl || null,
          color: "bg-primary",
          cursor: { blockId: "root", offset: 0 },
          updatedAt: now,
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
  const { id } = await params;
  const body = await request.json();
  const { clientId, state } = body;

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const key = `syncpro:awareness:${id}`;
  try {
    const redis = getRedisClient();

    if (body.action === "leave" || state === null) {
      await redis.hdel(key, String(clientId));
      return NextResponse.json({ success: true, removed: clientId });
    }

    // Ensure state contains authenticated user's real identity if available
    const userState = {
      ...state,
      user: {
        id: user?.id || state?.user?.id || clientId,
        name: user?.name || state?.user?.name || "Участник",
        avatarUrl: (user as { avatarUrl?: string | null })?.avatarUrl || state?.user?.avatarUrl || null,
        color: state?.user?.color || "bg-primary",
      },
      cursor: state?.cursor || null,
      updatedAt: Date.now(),
    };

    await redis.hset(key, String(clientId), JSON.stringify(userState));
    await redis.expire(key, 60);

    return NextResponse.json({ success: true, clientId, documentId: id });
  } catch (err) {
    console.warn(`[Awareness API] Redis save fallback:`, (err as Error).message);
    return NextResponse.json({ success: true, fallback: true });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    try {
      const body = await request.json();
      clientId = body.clientId;
    } catch {
      // Body empty
    }
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const key = `syncpro:awareness:${id}`;
  try {
    const redis = getRedisClient();
    await redis.hdel(key, String(clientId));
    return NextResponse.json({ success: true, removed: clientId });
  } catch (err) {
    console.warn(`[Awareness API] Redis delete error:`, (err as Error).message);
    return NextResponse.json({ success: true, fallback: true });
  }
}
