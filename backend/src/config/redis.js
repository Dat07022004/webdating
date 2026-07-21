import { createClient } from "redis";
import { ENV } from "./env.js";

let redisClient = null;
let redisReady = false;
let redisConnectPromise = null;

export async function connectRedis() {
  if (!ENV.REDIS_URL) {
    return null;
  }

  if (redisReady && redisClient) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  redisClient = createClient({ url: ENV.REDIS_URL });

  redisClient.on("error", (error) => {
    redisReady = false;
    console.error("[Redis] Client error:", error.message);
  });

  redisClient.on("ready", () => {
    redisReady = true;
    console.log("[Redis] Connected");
  });

  redisClient.on("end", () => {
    redisReady = false;
    console.warn("[Redis] Connection ended");
  });

  redisConnectPromise = redisClient
    .connect()
    .then(() => redisClient)
    .catch((error) => {
      redisReady = false;
      redisConnectPromise = null;
      console.error("[Redis] Connection failed:", error.message);
      return null;
    });

  return redisConnectPromise;
}

export function getRedisClient() {
  if (!redisReady || !redisClient) {
    return null;
  }

  return redisClient;
}

export async function createRedisDuplicate() {
  if (!ENV.REDIS_URL) {
    return null;
  }

  const client = createClient({ url: ENV.REDIS_URL });
  client.on("error", (error) => {
    console.error("[Redis] Duplicate client error:", error.message);
  });
  await client.connect();
  return client;
}
