import { doc, getDoc, setDoc, updateDoc, arrayRemove, arrayUnion, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { USE_SOCIAL_READS } from '../config/featureFlags';
import { syncFollow as syncFollowToApi, syncUnfollow as syncUnfollowToApi } from './socialApiWrite';

const USER_FOLLOWING_COLLECTION = 'userFollowing';
/** Max followers read per getFollowers (Firestore cost control). */
const FOLLOWERS_QUERY_LIMIT = 100;

/**
 * Get list of user IDs that the given user is following.
 * @param {string} userId - user's uid
 * @returns {Promise<string[]>}
 */
export const getFollowing = async (userId) => {
  if (!userId) return [];
  try {
    const ref = doc(db, USER_FOLLOWING_COLLECTION, userId);
    const snap = await getDoc(ref);
    const data = snap.data();
    const list = data?.following ?? [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Error fetching following list', err);
    return [];
  }
};

/**
 * Follow a user.
 * @param {string} followerId - current user's uid
 * @param {string} followingId - user to follow
 */
export const followUser = async (followerId, followingId) => {
  if (!followerId || !followingId || followerId === followingId) return;
  try {
    const ref = doc(db, USER_FOLLOWING_COLLECTION, followerId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { following: [followingId], updatedAt: new Date() });
    } else {
      await updateDoc(ref, {
        following: arrayUnion(followingId),
        updatedAt: new Date(),
      });
    }
  } catch (err) {
    console.error('Error following user', err);
    throw err;
  }
};

/**
 * Unfollow a user.
 * @param {string} followerId - current user's uid
 * @param {string} followingId - user to unfollow
 */
export const unfollowUser = async (followerId, followingId) => {
  if (!followerId || !followingId) return;
  try {
    const ref = doc(db, USER_FOLLOWING_COLLECTION, followerId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await updateDoc(ref, {
      following: arrayRemove(followingId),
      updatedAt: new Date(),
    });
    if (USE_SOCIAL_READS) syncUnfollowToApi(followerId, followingId);
  } catch (err) {
    console.error('Error unfollowing user', err);
    throw err;
  }
};

/**
 * Check if current user is following target user.
 * @param {string} followerId - current user's uid
 * @param {string} followingId - target user's uid
 * @returns {Promise<boolean>}
 */
export const isFollowing = async (followerId, followingId) => {
  if (!followerId || !followingId) return false;
  const list = await getFollowing(followerId);
  return list.includes(followingId);
};

/**
 * Get list of user IDs who follow the given user (followers). Capped at FOLLOWERS_QUERY_LIMIT.
 * @param {string} userId - user's uid
 * @returns {Promise<string[]>}
 */
export const getFollowers = async (userId) => {
  if (!userId) return [];
  try {
    const ref = collection(db, USER_FOLLOWING_COLLECTION);
    const q = query(ref, where('following', 'array-contains', userId), limit(FOLLOWERS_QUERY_LIMIT));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.id);
  } catch (err) {
    console.error('Error fetching followers', err);
    return [];
  }
};
