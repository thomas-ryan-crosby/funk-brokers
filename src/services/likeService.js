// Like Service - Postgres/social API only (Firestore removed)
import { getLikedPostIdsApi } from './socialApiService';
import { likePostViaApi, unlikePostViaApi } from './socialApiWrite';

export const getLikedPostIds = async (userId) => {
  if (!userId) return [];
  return getLikedPostIdsApi(userId);
};

export const likePost = async (postId, userId) => {
  if (!postId || !userId) return;
  await likePostViaApi(postId, userId);
};

export const unlikePost = async (postId, userId) => {
  if (!postId || !userId) return;
  await unlikePostViaApi(postId, userId);
};
