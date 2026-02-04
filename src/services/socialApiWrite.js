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
  if (res.status === 501) return; // DB not configured
  if (!res.ok) throw new Error(`Social write: ${res.status}`);
}

async function deleteJson(path, body) {
  const res = await fetch(`${getBase()}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 501) return;
  if (!res.ok) throw new Error(`Social write: ${res.status}`);
}

/** Sync a new post to Postgres. Payload: { id, authorId, authorName, type, body, propertyId?, propertyAddress?, imageUrl?, pollOptions?, hashtags?, userTags?, likeCount, commentCount, createdAt, updatedAt } */
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

/** Sync unlike (postId, userId). */
export function syncUnlike(postId, userId) {
  deleteJson('/like', { postId, userId }).catch((err) => console.warn('[socialApiWrite] syncUnlike', err));
}

/** Sync follow (followerId, followingId). */
export function syncFollow(followerId, followingId) {
  postJson('/follow', { followerId, followingId }).catch((err) => console.warn('[socialApiWrite] syncFollow', err));
}

/** Sync unfollow (followerId, followingId). */
export function syncUnfollow(followerId, followingId) {
  deleteJson('/follow', { followerId, followingId }).catch((err) => console.warn('[socialApiWrite] syncUnfollow', err));
}
