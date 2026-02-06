/**
 * GET /api/addresses/map?n=&s=&e=&w=&zoom=
 * Returns address pins from OpenAddresses PostGIS data.
 * Redis cache with 1-hour TTL (data is static).
 */

const { query } = require('../_db');
const { redisGet, redisSet } = require('../_redis');

const CACHE_TTL_SEC = 60 * 60; // 1 hour
const MAX_RESULTS = 500;
const singleflight = new Map();

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function round4(v) {
  return Math.round(v * 1e4) / 1e4;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const n = parseFloat(req.query.n);
  const s = parseFloat(req.query.s);
  const e = parseFloat(req.query.e);
  const w = parseFloat(req.query.w);
  const zoom = parseInt(req.query.zoom, 10);

  if (!Number.isFinite(n) || !Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(w) || !Number.isFinite(zoom)) {
    return res.status(400).json({ error: 'Missing or invalid n,s,e,w,zoom' });
  }

  const redisKey = `oa:map:${round4(n)}_${round4(s)}_${round4(e)}_${round4(w)}_${zoom}`;

  try {
    const cached = await redisGet(redisKey);
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return res.json({ addresses: parsed.addresses || [], cache: 'redis' });
    }

    const result = await (async () => {
      if (singleflight.has(redisKey)) return singleflight.get(redisKey);
      const promise = (async () => {
        const { rows } = await query(
          `SELECT
             COALESCE(number || ' ', '') || street AS address,
             ST_Y(geom) AS latitude,
             ST_X(geom) AS longitude
           FROM address_points
           WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
           LIMIT $5`,
          [w, s, e, n, MAX_RESULTS]
        );
        const addresses = rows.map((r) => ({
          address: r.address,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        }));
        await redisSet(redisKey, { addresses }, CACHE_TTL_SEC);
        return { addresses };
      })();
      singleflight.set(redisKey, promise);
      promise.finally(() => singleflight.delete(redisKey));
      return promise;
    })();

    res.json({ ...result, cache: 'miss' });
  } catch (err) {
    console.error('[api/addresses/map]', err);
    res.status(502).json({ error: 'Database query failed' });
  }
};
