/**
 * GET /api/users?id= — get user profile by id
 * PUT /api/users — update profile (body: { id, name?, publicUsername?, phone?, role? })
 */

const { query } = require('../_db');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseBody(req) {
  const raw = req.body;
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function mapRowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    uid: row.id,
    email: row.email,
    name: row.name,
    publicUsername: row.public_username,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const id = (req.query && req.query.id) ? req.query.id.trim() : null;
    const search = (req.query && req.query.search) ? req.query.search.trim() : null;
    if (search) {
      if (search.length < 1) return res.status(200).json({ users: [] });
      try {
        const term = `%${search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        const result = await query(
          `SELECT * FROM users WHERE LOWER(COALESCE(name,'')) LIKE LOWER($1) OR LOWER(COALESCE(public_username,'')) LIKE LOWER($1) OR LOWER(COALESCE(email,'')) LIKE LOWER($1) LIMIT 20`,
          [term]
        );
        const users = result.rows.map(mapRowToUser).filter(Boolean);
        return res.status(200).json({ users: users.slice(0, 10) });
      } catch (err) {
        console.warn('[api/users search]', err?.message || err);
        return res.status(200).json({ users: [] });
      }
    }
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json(mapRowToUser(row));
    } catch (err) {
      console.warn('[api/users get]', err?.message || err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const id = body.id || body.uid;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      await query(
        `INSERT INTO users (id, email, name, public_username, phone, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now(), now())
         ON CONFLICT (id) DO UPDATE SET
           email = COALESCE(EXCLUDED.email, users.email),
           name = COALESCE(EXCLUDED.name, users.name),
           public_username = COALESCE(EXCLUDED.public_username, users.public_username),
           phone = COALESCE(EXCLUDED.phone, users.phone),
           role = COALESCE(EXCLUDED.role, users.role),
           updated_at = now()`,
        [
          id,
          body.email ?? null,
          body.name ?? null,
          body.publicUsername ?? body.public_username ?? null,
          body.phone ?? null,
          body.role ?? null,
        ]
      );
      return res.status(201).json({ id });
    } catch (err) {
      console.warn('[api/users post]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const id = body.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.publicUsername !== undefined) updates.public_username = body.publicUsername;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.role !== undefined) updates.role = body.role;
    if (body.email !== undefined) updates.email = body.email;
    if (body.saleProfile !== undefined) updates.sale_profile = body.saleProfile;
    if (body.purchaseProfile !== undefined) updates.purchase_profile = body.purchaseProfile;
    if (Object.keys(updates).length === 0) return res.status(200).json({ id });
    try {
      const setCols = Object.keys(updates).map((k, i) => {
        const val = updates[k];
        if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
          return `${k} = $${i + 1}::jsonb`;
        }
        return `${k} = $${i + 1}`;
      }).join(', ');
      const vals = Object.values(updates).map((v) => (v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v));
      vals.push(id);
      await query(
        `UPDATE users SET ${setCols}, updated_at = now() WHERE id = $${vals.length}`,
        vals
      );
      return res.status(200).json({ id });
    } catch (err) {
      console.warn('[api/users put]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
