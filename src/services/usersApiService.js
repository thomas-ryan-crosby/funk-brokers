/**
 * User profile read/write via Postgres API (when USE_POSTGRES_FOR_ALL).
 */

function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/users`;
}

export async function getUserProfileApi(uid) {
  try {
    const res = await fetch(`${getBase()}?id=${encodeURIComponent(uid)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Users API: ${res.status}`);
    const data = await res.json();
    return data && data.id ? { id: data.id, ...data } : null;
  } catch (err) {
    console.error('getUserProfileApi', err);
    throw err;
  }
}

export async function upsertUserApi(uid, profile = {}) {
  const res = await fetch(getBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: uid,
      email: profile.email,
      name: profile.name,
      publicUsername: profile.publicUsername ?? profile.public_username,
      phone: profile.phone,
      role: profile.role,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upsert user failed: ${res.status}`);
  }
}

export async function updateUserProfileApi(uid, updates) {
  const res = await fetch(getBase(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: uid, ...updates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Profile update failed: ${res.status}`);
  }
}
