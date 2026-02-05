/**
 * Social read API (Wave 4). Use when VITE_USE_SOCIAL_READS is true.
 */

function getSocialBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/social`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Social API error: ${res.status}`);
  return res.json();
}

/** Fetch feed/posts; on any error return [] so Feed stays usable (empty DB, reset, network). */
async function fetchPosts(fn) {
  try {
    const data = await fn();
    return Array.isArray(data?.posts) ? data.posts : [];
  } catch (_) {
    return [];
  }
}

export async function getForYouPosts(limit = 50, before = null) {
  const params = new URLSearchParams({ limit });
  if (before) params.set('before', before);
  const url = `${getSocialBase()}/feed/for-you?${params}`;
  return fetchPosts(() => fetchJson(url));
}

export async function getFollowingPosts(userId, limit = 50, before = null) {
  const params = new URLSearchParams({ userId, limit });
  if (before) params.set('before', before);
  const url = `${getSocialBase()}/feed/following?${params}`;
  return fetchPosts(() => fetchJson(url));
}

export async function getPostsByAuthorApi(authorId, limit = 100, before = null) {
  const params = new URLSearchParams({ authorId, limit });
  if (before) params.set('before', before);
  const url = `${getSocialBase()}/posts/by-author?${params}`;
  return fetchPosts(() => fetchJson(url));
}

/** Posts linked to a property (by property_id or property_address). Used for Community Posts on property detail. */
export async function getPostsForPropertyOrAddressApi(propertyId, address) {
  if (!propertyId && !address) return [];
  const params = new URLSearchParams();
  if (propertyId) params.set('propertyId', propertyId);
  if (address) params.set('address', address);
  const url = `${getSocialBase()}/feed/by-property?${params}`;
  return fetchPosts(() => fetchJson(url));
}

async function fetchJsonSafe(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function getLikedPostIdsApi(userId) {
  try {
    const url = `${getSocialBase()}/me/liked-post-ids?userId=${encodeURIComponent(userId)}`;
    const { ok, data } = await fetchJsonSafe(url);
    if (!ok) return [];
    return Array.isArray(data?.postIds) ? data.postIds : [];
  } catch (_) {
    return [];
  }
}

export async function getFollowingApi(userId) {
  try {
    const url = `${getSocialBase()}/me/following?userId=${encodeURIComponent(userId)}`;
    const { ok, data } = await fetchJsonSafe(url);
    if (!ok) return [];
    return Array.isArray(data?.following) ? data.following : [];
  } catch (_) {
    return [];
  }
}

export async function getCommentsForPostApi(postId) {
  try {
    const url = `${getSocialBase()}/posts/comments?postId=${encodeURIComponent(postId)}`;
    const { ok, data } = await fetchJsonSafe(url);
    if (!ok) return [];
    return Array.isArray(data?.comments) ? data.comments : [];
  } catch (_) {
    return [];
  }
}

export async function getFollowersApi(userId) {
  try {
    const url = `${getSocialBase()}/users/followers?userId=${encodeURIComponent(userId)}`;
    const { ok, data } = await fetchJsonSafe(url);
    if (!ok) return [];
    return Array.isArray(data?.followers) ? data.followers : [];
  } catch (_) {
    return [];
  }
}
