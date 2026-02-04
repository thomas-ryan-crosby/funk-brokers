import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

const POSTS_COLLECTION = 'posts';
const USER_LIKES_COLLECTION = 'userLikes';

/**
 * Get post IDs the user has liked (for feed display).
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export const getLikedPostIds = async (userId) => {
  if (!userId) return [];
  try {
    const ref = doc(db, USER_LIKES_COLLECTION, userId);
    const snap = await getDoc(ref);
    const data = snap.data();
    const list = data?.postIds ?? [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Error fetching liked post IDs', err);
    return [];
  }
};

/**
 * Like a post.
 * @param {string} postId
 * @param {string} userId
 */
export const likePost = async (postId, userId) => {
  if (!postId || !userId) return;
  try {
    const likeRef = doc(db, POSTS_COLLECTION, postId, 'likes', userId);
    const postRef = doc(db, POSTS_COLLECTION, postId);
    const userLikesRef = doc(db, USER_LIKES_COLLECTION, userId);

    await setDoc(likeRef, { createdAt: new Date() });
    await updateDoc(postRef, { likeCount: increment(1) });

    const snap = await getDoc(userLikesRef);
    if (!snap.exists()) {
      await setDoc(userLikesRef, { postIds: [postId], updatedAt: new Date() });
    } else {
      await updateDoc(userLikesRef, { postIds: arrayUnion(postId), updatedAt: new Date() });
    }
    if (USE_SOCIAL_READS) syncLikeToApi(postId, userId);
  } catch (err) {
    console.error('Error liking post', err);
    throw err;
  }
};

/**
 * Unlike a post.
 * @param {string} postId
 * @param {string} userId
 */
export const unlikePost = async (postId, userId) => {
  if (!postId || !userId) return;
  try {
    const likeRef = doc(db, POSTS_COLLECTION, postId, 'likes', userId);
    const postRef = doc(db, POSTS_COLLECTION, postId);
    const userLikesRef = doc(db, USER_LIKES_COLLECTION, userId);

    await deleteDoc(likeRef);
    await updateDoc(postRef, { likeCount: increment(-1) });

    const snap = await getDoc(userLikesRef);
    if (snap.exists()) {
      await updateDoc(userLikesRef, { postIds: arrayRemove(postId), updatedAt: new Date() });
    }
    if (USE_SOCIAL_READS) syncUnlikeToApi(postId, userId);
  } catch (err) {
    console.error('Error unliking post', err);
    throw err;
  }
};
