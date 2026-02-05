// Follow Service - Postgres/social API only (Firestore removed)
import { getFollowingApi, getFollowersApi } from './socialApiService';
import { followUserViaApi, unfollowUserViaApi } from './socialApiWrite';

export const getFollowing = async (userId) => {
  if (!userId) return [];
  return getFollowingApi(userId);
};

export const followUser = async (followerId, followingId) => {
  if (!followerId || !followingId || followerId === followingId) return;
  await followUserViaApi(followerId, followingId);
};

export const unfollowUser = async (followerId, followingId) => {
  if (!followerId || !followingId) return;
  await unfollowUserViaApi(followerId, followingId);
};

export const isFollowing = async (followerId, followingId) => {
  if (!followerId || !followingId) return false;
  const list = await getFollowing(followerId);
  return list.includes(followingId);
};

export const getFollowers = async (userId) => {
  if (!userId) return [];
  return getFollowersApi(userId);
};
