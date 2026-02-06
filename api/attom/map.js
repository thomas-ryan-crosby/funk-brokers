/**
 * GET /api/attom/map?n=&s=&e=&w=&zoom=
 * CompsMap only — browse map now uses /api/addresses/map (OpenAddresses).
 * Same contract as Firebase getMapParcels. Cache in Redis (attom:map:{tileKey}).
 */

const { redisGet, redisSet } = require('../_redis');
const {
  tileKeyForCenter,
  attomFetchSnapshot,
  mapAttomToLightweight,
} = require('../_attom');

const MAP_TILE_TTL_SEC = 30 * 60; // 30 min
const singleflight = new Map();

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  let n, s, e, w, zoom;
  if (req.method === 'POST' && req.body && typeof req.body === 'object') {
    n = req.body.n;
    s = req.body.s;
    e = req.body.e;
    w = req.body.w;
    zoom = req.body.zoom;
  } else {
    n = req.query.n;
    s = req.query.s;
    e = req.query.e;
    w = req.query.w;
    zoom = req.query.zoom;
  }
  n = parseFloat(n);
  s = parseFloat(s);
  e = parseFloat(e);
  w = parseFloat(w);
  zoom = parseInt(zoom, 10);
  if (!Number.isFinite(n) || !Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(w) || !Number.isFinite(zoom)) {
    res.status(400).json({ error: 'Missing or invalid n,s,e,w,zoom' });
    return;
  }

  const centerLat = (n + s) / 2;
  const centerLng = (e + w) / 2;
  const tileKey = tileKeyForCenter(centerLat, centerLng, zoom);
  const redisKey = `attom:map:${tileKey}`;

  try {
    const cached = await redisGet(redisKey);
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return res.json({ parcels: parsed.parcels || [], tileKey, cache: 'redis' });
    }

    const result = await (async () => {
      if (singleflight.has(redisKey)) return singleflight.get(redisKey);
      const promise = (async () => {
        const data = await attomFetchSnapshot({ n, s, e, w });
        const list = data.property ?? data.properties ?? data ?? [];
        const arr = Array.isArray(list) ? list : [list];
        const parcels = mapAttomToLightweight(arr);
        await redisSet(redisKey, { parcels, tileKey }, MAP_TILE_TTL_SEC);
        return { parcels, tileKey };
      })();
      singleflight.set(redisKey, promise);
      promise.finally(() => singleflight.delete(redisKey));
      return promise;
    })();

    res.json({ ...result, cache: 'miss' });
  } catch (err) {
    console.error('[api/attom/map]', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
};
