/**
 * GET /api/attom/lookup?lat=&lng=&address=
 * On-demand ATTOM lookup for a specific property by lat/lng.
 * Called when a user clicks a gray dot (OpenAddresses pin) to get full parcel data.
 * Redis cache 30 days by rounded lat/lng.
 */

const { redisGet, redisSet } = require('../_redis');
const {
  normalizeAddress,
  attomFetchSnapshot,
  resolveAttomIdFromSnapshot,
  buildSectionExpiry,
} = require('../_attom');

const LOOKUP_TTL_SEC = 30 * 24 * 3600; // 30 days
const SNAPSHOT_TTL_SEC = 30 * 24 * 3600; // 30 days
const DELTA = 0.002; // ~220m bounding box around point
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

  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const address = req.query.address || '';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Missing or invalid lat,lng' });
  }

  const roundedLat = round4(lat);
  const roundedLng = round4(lng);
  const redisKey = `attom:lookup:${roundedLat}_${roundedLng}`;

  try {
    const cached = await redisGet(redisKey);
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return res.json({ ...parsed, cache: 'redis' });
    }

    const result = await (async () => {
      if (singleflight.has(redisKey)) return singleflight.get(redisKey);
      const promise = (async () => {
        const bounds = {
          n: lat + DELTA,
          s: lat - DELTA,
          e: lng + DELTA,
          w: lng - DELTA,
        };
        const data = await attomFetchSnapshot(bounds);
        const normalized = address ? normalizeAddress(address) : '';
        const match = resolveAttomIdFromSnapshot(data, normalized);

        if (!match) {
          const noResult = { attomId: null, parcel: null };
          await redisSet(redisKey, noResult, 60 * 60); // cache miss for 1 hour
          return noResult;
        }

        // Pre-cache the full snapshot for PropertyDetail
        const snapshotKey = `attom:snap:${match.attomId}`;
        const snapshotRecord = {
          attomId: match.attomId,
          payload: data,
          meta: {
            sectionExpiry: buildSectionExpiry(),
            hint: { latitude: match.latitude, longitude: match.longitude },
          },
        };
        await redisSet(snapshotKey, snapshotRecord, SNAPSHOT_TTL_SEC);

        const lookupRecord = {
          attomId: match.attomId,
          parcel: match,
        };
        await redisSet(redisKey, lookupRecord, LOOKUP_TTL_SEC);
        return lookupRecord;
      })();
      singleflight.set(redisKey, promise);
      promise.finally(() => singleflight.delete(redisKey));
      return promise;
    })();

    res.json(result ? { ...result, cache: 'miss' } : { attomId: null, parcel: null });
  } catch (err) {
    console.error('[api/attom/lookup]', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
};
