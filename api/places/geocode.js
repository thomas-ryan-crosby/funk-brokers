/**
 * POST /api/places/geocode
 * Body: { address }
 * Proxies to Google Geocoding API. Returns first result.
 */

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

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

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  const { address } = req.body || {};
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid address' });
  }

  const params = new URLSearchParams({ address: address.trim(), key });

  try {
    const url = `${GEOCODE_URL}?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error_message) {
      console.error('[api/places/geocode]', data.error_message);
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[api/places/geocode]', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
};
