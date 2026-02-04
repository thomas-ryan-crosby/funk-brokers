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

export async function getForYouPosts(limit = 50, before = null) {
  const params = new URLSearchParams({ limit });
  if (before) params.set('before', before);
  const url = `${getSocialBase()}/feed/for-you?${params}`;
  const data = await fetchJson(url);
  return data.posts || [];
}

export async function getFollowingPosts(userId, limit = 50, before = null) {
  const params = new URLSearchParams({ userId, limit });
  if (before) params.set('before', before);
  const url = `${getSocialBase()}/feed/following?${params}`;
  const data = await fetchJson(url);
  return data.posts || [];
}

export async function getPostsByAuthorApi(authorId, limit = 100, before = null) {
  const params = new URLSearchParams({ authorId, limit });
  if (before) params.set('before', before);
  const url = `${getSocialBase()}/posts/by-author?${params}`;
  const data = await fetchJson(url);
  return data.posts || [];
}
