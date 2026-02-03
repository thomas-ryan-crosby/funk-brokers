/**
 * POST /api/places/autocomplete
 * Body: { input, sessionToken?, types?, components? }
 * Proxies to Google Place Autocomplete (Legacy) REST. Session token for billing.
 */

const LEGACY_AUTOCOMPLETE = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

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

  const { input, sessionToken, types = 'address', components = 'country:us' } = req.body || {};
  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid input' });
  }

  const params = new URLSearchParams({
    input: input.trim(),
    key,
    types: typeof types === 'string' ? types : 'address',
    components: typeof components === 'string' ? components : 'country:us',
  });
  if (sessionToken && typeof sessionToken === 'string') {
    params.set('sessiontoken', sessionToken);
  }

  try {
    const url = `${LEGACY_AUTOCOMPLETE}?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error_message) {
      console.error('[api/places/autocomplete]', data.error_message);
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[api/places/autocomplete]', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
};
