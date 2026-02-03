/**
 * POST /api/places/details
 * Body: { placeId, sessionToken?, fields? }
 * Proxies to Google Place Details (Legacy) REST. Session token for billing.
 */

const LEGACY_DETAILS = 'https://maps.googleapis.com/maps/api/place/details/json';

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

  const { placeId, sessionToken, fields = 'address_components,formatted_address,geometry' } = req.body || {};
  if (!placeId || typeof placeId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid placeId' });
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key,
    fields: typeof fields === 'string' ? fields : 'address_components,formatted_address,geometry',
  });
  if (sessionToken && typeof sessionToken === 'string') {
    params.set('sessiontoken', sessionToken);
  }

  try {
    const url = `${LEGACY_DETAILS}?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error_message) {
      console.error('[api/places/details]', data.error_message);
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[api/places/details]', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
};
