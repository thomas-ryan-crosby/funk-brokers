/**
 * Favorites via Postgres API (when USE_POSTGRES_FOR_ALL).
 */

function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/favorites`;
}

async function fetchJsonSafe(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function addToFavoritesApi(userId, propertyId) {
  const res = await fetch(getBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, propertyId }),
  });
  if (!res.ok) throw new Error(`Add favorite failed: ${res.status}`);
  const data = await res.json();
  return data.id;
}

export async function removeFromFavoritesApi(userId, propertyId) {
  const res = await fetch(getBase(), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, propertyId }),
  });
  if (!res.ok) throw new Error(`Remove favorite failed: ${res.status}`);
}

export async function getFavoriteApi(userId, propertyId) {
  const url = `${getBase()}?userId=${encodeURIComponent(userId)}&propertyId=${encodeURIComponent(propertyId)}`;
  const { ok, data } = await fetchJsonSafe(url);
  if (!ok || data == null) return null;
  return { id: data.id, userId: data.userId, propertyId: data.propertyId, createdAt: data.createdAt };
}

export async function getUserFavoriteIdsApi(userId) {
  const url = `${getBase()}?userId=${encodeURIComponent(userId)}`;
  const { ok, data } = await fetchJsonSafe(url);
  if (!ok) return [];
  return Array.isArray(data?.propertyIds) ? data.propertyIds : [];
}

export async function getFavoriteCountForPropertyApi(propertyId) {
  const url = `${getBase()}?propertyId=${encodeURIComponent(propertyId)}&count=1`;
  const { ok, data } = await fetchJsonSafe(url);
  if (!ok) return 0;
  return Number(data?.count) || 0;
}

export async function getFavoritesForPropertyApi(propertyId, getUserProfile) {
  const url = `${getBase()}?propertyId=${encodeURIComponent(propertyId)}`;
  const { ok, data } = await fetchJsonSafe(url);
  const list = Array.isArray(data?.favorites) ? data.favorites : [];
  if (!getUserProfile) return list;
  const hydrated = await Promise.all(
    list.slice(0, 20).map(async (fav) => {
      let userProfile = null;
      try {
        userProfile = await getUserProfile(fav.userId);
      } catch (_) {}
      return { ...fav, userProfile };
    })
  );
  const rest = list.slice(20).map((f) => ({ ...f, userProfile: null }));
  return [...hydrated, ...rest].sort((a, b) => {
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });
}
