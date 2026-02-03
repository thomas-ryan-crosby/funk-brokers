/**
 * POST /api/attom/address
 * Body: { address, n, s, e, w }
 * Same contract as Firebase resolveAddress. Cache in Redis (attom:addr:{normalizedAddress}).
 */

const { redisGet, redisSet } = require('../_redis');
const {
  normalizeAddress,
  attomFetchSnapshot,
  resolveAttomIdFromSnapshot,
  buildSectionExpiry,
} = require('../_attom');

const ADDRESS_TTL_SEC = 120 * 24 * 3600; // 120 days
const SNAPSHOT_TTL_SEC = 30 * 24 * 3600; // 30 days
const singleflight = new Map();

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, n, s, e, w } = req.body || {};
  if (!address) {
    return res.status(400).json({ error: 'Missing address' });
  }
  const bounds = {
    n: parseFloat(n),
    s: parseFloat(s),
    e: parseFloat(e),
    w: parseFloat(w),
  };
  if (!Number.isFinite(bounds.n) || !Number.isFinite(bounds.s) || !Number.isFinite(bounds.e) || !Number.isFinite(bounds.w)) {
    return res.status(400).json({ error: 'Missing bounds' });
  }

  const normalized = normalizeAddress(address);
  const addressKey = normalized || `lat:${bounds.n}-${bounds.e}`;
  const redisKey = `attom:addr:${addressKey}`;

  try {
    const cached = await redisGet(redisKey);
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return res.json({ ...parsed, cache: 'redis' });
    }

    const result = await (async () => {
      if (singleflight.has(redisKey)) return singleflight.get(redisKey);
      const promise = (async () => {
        const data = await attomFetchSnapshot(bounds);
        const match = resolveAttomIdFromSnapshot(data, normalized);
        if (!match) return null;
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
        const addressRecord = { addressKey, attomId: match.attomId, parcel: match };
        await redisSet(redisKey, addressRecord, ADDRESS_TTL_SEC);
        return addressRecord;
      })();
      singleflight.set(redisKey, promise);
      promise.finally(() => singleflight.delete(redisKey));
      return promise;
    })();

    res.json(result ? { ...result, cache: 'miss' } : { attomId: null, parcel: null });
  } catch (err) {
    console.error('[api/attom/address]', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
};
