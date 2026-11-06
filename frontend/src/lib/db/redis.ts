import Redis from "ioredis";

let redisClient: Redis | null = null;
let redisPubClient: Redis | null = null;
let redisSubClient: Redis | null = null;

function createRedisInstance(): Redis {
  const host = process.env.REDIS_HOST || "redis";
  const port = Number.parseInt(process.env.REDIS_PORT || "6379", 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  const client = new Redis({
    host,
    port,
    password,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  client.on("error", (err) => {
    console.error("[Redis Error]:", err.message);
  });

  return client;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisInstance();
  }
  return redisClient;
}

export function getRedisPubSub(): { pub: Redis; sub: Redis } {
  if (!redisPubClient) {
    redisPubClient = createRedisInstance();
  }
  if (!redisSubClient) {
    redisSubClient = createRedisInstance();
  }
  return { pub: redisPubClient, sub: redisSubClient };
}
