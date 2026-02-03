/**
 * Upstash Redis helpers for ATTOM cache (Wave 2).
 * Env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN.
 */

const { Redis } = require('@upstash/redis');

let _redis = null;

function getRedis() {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error('Upstash Redis not configured');
    _redis = new Redis({ url, token });
  }
  return _redis;
}

async function redisGet(key) {
  const v = await getRedis().get(key);
  return v;
}

async function redisSet(key, value, ttlSeconds) {
  await getRedis().set(key, typeof value === 'string' ? value : JSON.stringify(value), { ex: ttlSeconds });
}

module.exports = { redisGet, redisSet };
