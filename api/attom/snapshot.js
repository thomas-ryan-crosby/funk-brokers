/**
 * GET /api/attom/snapshot?attomId=&lat=&lng=
 * Same contract as Firebase getPropertySnapshot. Cache in Redis (attom:snap:{attomId}).
 */

const { redisGet, redisSet } = require('../_redis');
const { attomFetchSnapshot, buildSectionExpiry } = require('../_attom');

const SNAPSHOT_TTL_SEC = 30 * 24 * 3600; // 30 days
const singleflight = new Map();

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const attomId = req.query.attomId;
  const latitude = parseFloat(req.query.lat);
  const longitude = parseFloat(req.query.lng);
  if (!attomId) {
    return res.status(400).json({ error: 'Missing attomId' });
  }

  const redisKey = `attom:snap:${attomId}`;

  try {
    const cached = await redisGet(redisKey);
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return res.json({ ...parsed, cache: 'redis' });
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: 'lat and lng required for cache miss' });
    }

    const result = await (async () => {
      if (singleflight.has(redisKey)) return singleflight.get(redisKey);
      const promise = (async () => {
        const delta = 0.002;
        const data = await attomFetchSnapshot({
          n: latitude + delta,
          s: latitude - delta,
          e: longitude + delta,
          w: longitude - delta,
        });
        const record = {
          attomId,
          payload: data,
          meta: {
            sectionExpiry: buildSectionExpiry(),
            hint: { latitude, longitude },
          },
        };
        await redisSet(redisKey, record, SNAPSHOT_TTL_SEC);
        return record;
      })();
      singleflight.set(redisKey, promise);
      promise.finally(() => singleflight.delete(redisKey));
      return promise;
    })();

    res.json({ ...result, cache: 'miss' });
  } catch (err) {
    console.error('[api/attom/snapshot]', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
};
