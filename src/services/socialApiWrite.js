/**
 * Social write API (Wave 4 dual-write). Call after Firestore write when USE_SOCIAL_READS is true.
 * Non-blocking: fire-and-forget so Firestore remains source of truth; Postgres is synced for read path.
 */

function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/social`;
}

async function postJson(path, body) {
  const res = await fetch(`${getBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 501 || res.status === 502) return null;
  if (!res.ok) throw new Error(`Social write: ${res.status}`);
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function deleteJson(path, body) {
  const res = await fetch(`${getBase()}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 501 || res.status === 502) return;
  if (!res.ok) throw new Error(`Social write: ${res.status}`);
}

/** Create post in Postgres only (when USE_SOCIAL_READS). Returns Promise<{ id } | null>. Payload: { id, authorId, authorName, type, body, propertyId?, propertyAddress?, imageUrl?, pollOptions?, hashtags?, userTags?, likeCount, commentCount, createdAt, updatedAt } */
export async function createPostViaApi(payload) {
  const data = await postJson('/create-post', payload);
  return data?.id ?? null;
}

/** Sync a new post to Postgres (dual-write). Payload: { id, authorId, authorName, ... } */
export function syncPost(payload) {
  postJson('/create-post', payload).catch((err) => console.warn('[socialApiWrite] syncPost', err));
}

/** Sync a new comment. Payload: { postId, id, authorId, authorName, body, createdAt } */
export function syncComment(payload) {
  postJson('/create-comment', payload).catch((err) => console.warn('[socialApiWrite] syncComment', err));
}

/** Sync like (postId, userId). */
export function syncLike(postId, userId) {
  postJson('/like', { postId, userId }).catch((err) => console.warn('[socialApiWrite] syncLike', err));
}

/** Like post in Postgres only (when USE_SOCIAL_READS). Await this. */
export function likePostViaApi(postId, userId) {
  return postJson('/like', { postId, userId });
}

/** Sync unlike (postId, userId). */
export function syncUnlike(postId, userId) {
  deleteJson('/like', { postId, userId }).catch((err) => console.warn('[socialApiWrite] syncUnlike', err));
}

/** Unlike post in Postgres only (when USE_SOCIAL_READS). Await this. */
export function unlikePostViaApi(postId, userId) {
  return deleteJson('/like', { postId, userId });
}

/** Sync follow (followerId, followingId). */
export function syncFollow(followerId, followingId) {
  postJson('/follow', { followerId, followingId }).catch((err) => console.warn('[socialApiWrite] syncFollow', err));
}

/** Follow in Postgres only (when USE_SOCIAL_READS). Await this. */
export function followUserViaApi(followerId, followingId) {
  return postJson('/follow', { followerId, followingId });
}

/** Sync unfollow (followerId, followingId). */
export function syncUnfollow(followerId, followingId) {
  deleteJson('/follow', { followerId, followingId }).catch((err) => console.warn('[socialApiWrite] syncUnfollow', err));
}

/** Unfollow in Postgres only (when USE_SOCIAL_READS). Await this. */
export function unfollowUserViaApi(followerId, followingId) {
  return deleteJson('/follow', { followerId, followingId });
}

/** Delete post from Postgres only (when USE_SOCIAL_READS). */
export function deletePostViaApi(postId) {
  return fetch(`${getBase()}/delete-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: postId }),
  }).catch((err) => console.warn('[socialApiWrite] deletePostViaApi', err));
}
