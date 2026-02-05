/**
 * User profile read/write via Postgres API.
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

export async function searchUsersApi(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  try {
    const res = await fetch(`${getBase()}?search=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data?.users) ? data.users : [];
    return list.map((u) => ({ id: u.id, name: u.name || '', publicUsername: u.publicUsername || '', email: u.email || '' }));
  } catch (err) {
    console.error('searchUsersApi', err);
    return [];
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

function getSavedSearchesBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/saved-searches`;
}

export async function getSavedSearchesApi(userId) {
  if (!userId) return [];
  const res = await fetch(`${getSavedSearchesBase()}?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.savedSearches) ? data.savedSearches : [];
}

export async function addSavedSearchApi(userId, { name, filters }) {
  const res = await fetch(getSavedSearchesBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, name: name || 'My search', filters: filters || {} }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Add saved search failed: ${res.status}`);
  }
  const data = await res.json().catch(() => ({}));
  return data?.id;
}

export async function removeSavedSearchApi(searchId) {
  if (!searchId) throw new Error('searchId is required');
  const res = await fetch(getSavedSearchesBase(), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: searchId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Remove saved search failed: ${res.status}`);
  }
}
