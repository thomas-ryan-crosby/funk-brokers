import { doc, getDoc, setDoc, updateDoc, arrayRemove, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const USER_FOLLOWING_COLLECTION = 'userFollowing';

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
 * Get list of user IDs who follow the given user (followers).
 * @param {string} userId - user's uid
 * @returns {Promise<string[]>}
 */
export const getFollowers = async (userId) => {
  if (!userId) return [];
  try {
    const ref = collection(db, USER_FOLLOWING_COLLECTION);
    const q = query(ref, where('following', 'array-contains', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.id);
  } catch (err) {
    console.error('Error fetching followers', err);
    return [];
  }
};
