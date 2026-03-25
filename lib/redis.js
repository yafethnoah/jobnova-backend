const Redis = require('ioredis');
const { hasRedis, allowLocalFallback, isProduction } = require('../config/env');
let redis = null;
let redisDisabledReason = '';
function disableRedis(reason) { redisDisabledReason = reason || 'unknown redis error'; if (redis) { try { redis.disconnect(); } catch {} } redis = null; }
function getRedis() {
  if (!hasRedis()) return null;
  if (redisDisabledReason) { if (isProduction && !allowLocalFallback) throw new Error(`Redis is disabled: ${redisDisabledReason}`); return null; }
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableReadyCheck: false, lazyConnect: true });
    redis.on('error', (error) => disableRedis(error?.message || 'redis error'));
  }
  return redis;
}
async function redisHealthcheck() {
  if (!hasRedis()) return { enabled: false, ok: false, mode: allowLocalFallback ? 'in-memory-fallback' : 'redis-required', reason: 'REDIS_URL missing' };
  if (redisDisabledReason) return { enabled: true, ok: false, mode: allowLocalFallback ? 'in-memory-fallback' : 'redis-required', reason: redisDisabledReason };
  const client = getRedis();
  if (!client) return { enabled: false, ok: false, mode: allowLocalFallback ? 'in-memory-fallback' : 'redis-required', reason: redisDisabledReason || 'redis unavailable' };
  try {
    if (client.status !== 'ready' && client.status !== 'connect') await client.connect();
    const pong = await client.ping();
    return { enabled: true, ok: pong === 'PONG', mode: 'redis' };
  } catch (error) {
    const message = error?.message || 'redis healthcheck failed';
    disableRedis(message);
    return { enabled: true, ok: false, mode: allowLocalFallback ? 'in-memory-fallback' : 'redis-required', message };
  }
}
module.exports = { getRedis, redisHealthcheck, disableRedis };
