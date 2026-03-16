const Redis = require('ioredis');

let redis = null;

function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
  }
  return redis;
}

async function redisHealthcheck() {
  const client = getRedis();
  if (!client) return { enabled: false, ok: false, mode: 'in-memory-fallback' };
  try {
    const pong = await client.ping();
    return { enabled: true, ok: pong === 'PONG', mode: 'redis' };
  } catch (error) {
    return { enabled: true, ok: false, mode: 'redis', message: error.message };
  }
}

module.exports = { getRedis, redisHealthcheck };
