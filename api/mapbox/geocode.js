/**
 * GET /api/mapbox/geocode?q=...&limit=5&types=address,place
 * Proxies Mapbox Geocoding v5 (forward). Token server-side only.
 */
const GEOCODE_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Mapbox access token not configured' });
  }

  const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    return res.status(400).json({ error: 'Missing query (q)' });
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 10);
  const types = (req.query.types || 'address,place').toString();
  const country = (req.query.country || 'US').toString();

  try {
    const encoded = encodeURIComponent(q);
    const params = new URLSearchParams({
      access_token: token,
      limit: String(limit),
      types,
      country,
      autocomplete: 'true',
    });
    const url = `${GEOCODE_BASE}/${encoded}.json?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      console.error('[api/mapbox/geocode]', data?.message || response.status);
      return res.status(response.status === 401 ? 401 : 502).json(data || { error: 'Upstream error' });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[api/mapbox/geocode]', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
};
