const Redis = require("ioredis");

let redisClient = null;

// Connect Redis
const connectRedis = async () => {
  try {
    redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      retryStrategy: (times) => {
        if (times > 5) {
          console.warn("⚠️ Redis disabled after multiple attempts. Using memory store.");
          return null;
        }
        return Math.min(times * 100, 2000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisClient.on("connect", () => console.log("✅ Redis connected"));

    redisClient.on("error", (err) => {
      console.warn("⚠️ Redis error:", err.message);
    });

    redisClient.on("reconnecting", () => {
      console.log("🔄 Redis reconnecting...");
    });

    await redisClient.connect();

  } catch (error) {
    console.warn("⚠️ Redis unavailable. Using in-memory fallback.");
    redisClient = null;
  }
};

// In-memory fallback store
const memoryStore = new Map();

const getRedisClient = () => redisClient;

// SET
const redisSet = async (key, value, ttlSeconds = null) => {
  try {
    if (redisClient) {
      if (ttlSeconds) {
        await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        await redisClient.set(key, JSON.stringify(value));
      }
    } else {
      memoryStore.set(key, {
        value,
        expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
    }
  } catch (err) {
    memoryStore.set(key, {
      value,
      expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }
};

// GET
const redisGet = async (key) => {
  try {
    if (redisClient) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const item = memoryStore.get(key);
      if (!item) return null;

      if (item.expires && Date.now() > item.expires) {
        memoryStore.delete(key);
        return null;
      }

      return item.value;
    }
  } catch (err) {
    const item = memoryStore.get(key);
    return item ? item.value : null;
  }
};

// DELETE
const redisDel = async (key) => {
  try {
    if (redisClient) {
      await redisClient.del(key);
    } else {
      memoryStore.delete(key);
    }
  } catch (err) {
    memoryStore.delete(key);
  }
};

// SET MEMBERS
const redisSmembers = async (key) => {
  try {
    if (redisClient) {
      return await redisClient.smembers(key);
    } else {
      const item = memoryStore.get(key);
      return item ? Array.from(item.value || []) : [];
    }
  } catch (err) {
    return [];
  }
};

// ADD SET MEMBER
const redisSadd = async (key, ...members) => {
  try {
    if (redisClient) {
      return await redisClient.sadd(key, ...members);
    } else {
      const item = memoryStore.get(key) || { value: new Set() };
      members.forEach((m) => item.value.add(m));
      memoryStore.set(key, item);
    }
  } catch (err) {}
};

// REMOVE SET MEMBER
const redisSrem = async (key, ...members) => {
  try {
    if (redisClient) {
      return await redisClient.srem(key, ...members);
    } else {
      const item = memoryStore.get(key);
      if (item) members.forEach((m) => item.value.delete(m));
    }
  } catch (err) {}
};

module.exports = {
  connectRedis,
  getRedisClient,
  redisSet,
  redisGet,
  redisDel,
  redisSmembers,
  redisSadd,
  redisSrem,
};