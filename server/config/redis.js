const Redis = require('ioredis');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    await redisClient.connect();
    console.log('✅ Redis connected');
  } catch (err) {
    console.warn('⚠️ Redis unavailable, running without cache:', err.message);
    redisClient = null;
  }
};

const getRedis = () => redisClient;

module.exports = { connectRedis, getRedis };
