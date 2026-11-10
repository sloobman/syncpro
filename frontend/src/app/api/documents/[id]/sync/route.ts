import { NextRequest, NextResponse } from "next/server";
import { getRedisPubSub } from "@/lib/db/redis";

// Map of documentId -> Set of active SSE client push callbacks
const docListeners = new Map<string, Set<(data: string) => void>>();
let isSubscriberInitialized = false;

function ensureGlobalSubscriber() {
  if (isSubscriberInitialized) return;
  try {
    const { sub } = getRedisPubSub();
    sub.on("message", (channel: string, message: string) => {
      const match = channel.match(/^syncpro:doc:([^:]+):events$/);
      if (match) {
        const docId = match[1];
        const listeners = docListeners.get(docId);
        if (listeners && listeners.size > 0) {
          for (const send of listeners) {
            try {
              send(message);
            } catch {
              // Ignore individual send errors
            }
          }
        }
      }
    });
    isSubscriberInitialized = true;
  } catch (err) {
    console.warn("[Sync SSE] Redis subscriber init error:", (err as Error).message);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  ensureGlobalSubscriber();

  let listeners = docListeners.get(id);
  if (!listeners) {
    listeners = new Set();
    docListeners.set(id, listeners);
    try {
      const { sub } = getRedisPubSub();
      await sub.subscribe(`syncpro:doc:${id}:events`);
    } catch (err) {
      console.warn(`[Sync SSE] Failed to subscribe to Redis channel for ${id}:`, (err as Error).message);
    }
  }

  const encoder = new TextEncoder();
  let keepAliveTimer: NodeJS.Timeout | null = null;
  let pushCallback: ((data: string) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", documentId: id })}\n\n`));

      // Push callback for incoming Redis broadcast events
      pushCallback = (message: string) => {
        try {
          controller.enqueue(encoder.encode(`event: crdt\ndata: ${message}\n\n`));
        } catch {
          // Stream closed
        }
      };

      listeners!.add(pushCallback);

      // Periodic SSE heartbeat (15s) to prevent proxy connection timeout
      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          if (keepAliveTimer) clearInterval(keepAliveTimer);
        }
      }, 15000);
    },
    cancel() {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      if (pushCallback && listeners) {
        listeners.delete(pushCallback);
        if (listeners.size === 0) {
          docListeners.delete(id);
          try {
            const { sub } = getRedisPubSub();
            sub.unsubscribe(`syncpro:doc:${id}:events`).catch(() => {});
          } catch {
            // Ignore
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { clientId, ops, cursor, delta } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const payload = JSON.stringify({
      type: "crdt-ops",
      clientId,
      ops: ops || [],
      cursor: cursor || null,
      delta: delta || null,
      json: body.json || null,
      timestamp: Date.now(),
    });

    const channel = `syncpro:doc:${id}:events`;

    try {
      const { pub } = getRedisPubSub();
      await pub.publish(channel, payload);
    } catch (err) {
      console.warn(`[Sync API] Redis publish fallback for ${id}:`, (err as Error).message);
      // Fallback: direct in-memory broadcast to local listeners
      const listeners = docListeners.get(id);
      if (listeners) {
        for (const send of listeners) {
          send(payload);
        }
      }
    }

    return NextResponse.json({ success: true, count: ops?.length || 0 });
  } catch (err) {
    console.error("[Sync API POST Error]:", err);
    return NextResponse.json({ error: "Failed to broadcast sync operations" }, { status: 500 });
  }
}
