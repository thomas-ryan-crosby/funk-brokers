/**
 * POST /api/persona/inquiry — create Persona inquiry (body: { name, dob, email, templateId })
 * Forwards to Persona API. Requires PERSONA_API_KEY env.
 */

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseBody(req) {
  const raw = req.body;
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
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

  let body;
  try {
    body = parseBody(req);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const apiKey = process.env.PERSONA_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Persona not configured. Set PERSONA_API_KEY.' });
  }

  const templateId = (body.templateId || body['inquiry-template-id'] || '').trim();
  if (!templateId) {
    return res.status(400).json({ error: 'Missing templateId' });
  }

  const payload = {
    data: {
      type: 'inquiry',
      attributes: {
        'inquiry-template-id': templateId,
        'reference-id': body.referenceId || body.reference_id || null,
        'fields': {
          'name-first': body.name?.split(/\s+/)[0] || body.name || '',
          'name-last': body.name?.split(/\s+/).slice(1).join(' ') || '',
          'birthdate': body.dob || '',
          'email-address': body.email || '',
        },
      },
    },
  };
  // Remove empty field values so Persona doesn't complain
  const fields = payload.data.attributes.fields;
  Object.keys(fields).forEach((k) => { if (fields[k] === '' || fields[k] == null) delete fields[k]; });

  try {
    const personaRes = await fetch('https://withpersona.com/api/v1/inquiries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await personaRes.json().catch(() => ({}));
    if (!personaRes.ok) {
      return res.status(personaRes.status).json({ error: data.errors?.[0]?.title || data.error || 'Persona API error' });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.warn('[api/persona/inquiry]', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
};
