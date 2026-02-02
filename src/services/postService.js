import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, where, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

const POSTS_COLLECTION = 'posts';

/** Sort posts by createdAt desc. */
const sortPostsByDate = (list) => {
  list.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return bDate - aDate;
  });
  return list;
};

export const createPost = async (data) => {
  const payload = {
    ...data,
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const ref = await addDoc(collection(db, POSTS_COLLECTION), payload);
  return ref.id;
};

export const getPostsByAuthor = async (authorId) => {
  if (!authorId) return [];
  const q = query(
    collection(db, POSTS_COLLECTION),
    where('authorId', '==', authorId)
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  list.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return bDate - aDate;
  });
  return list;
};

/**
 * Get all posts on the platform, most recent first.
 * @param {number} limitCount - max number of posts (default 50)
 * @returns {Promise<Array>}
 */
export const getAllPosts = async (limitCount = 50) => {
  try {
    const q = query(
      collection(db, POSTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (err) {
    console.error('getAllPosts error', err);
    return [];
  }
};

/**
 * Get posts by multiple authors, sorted by date desc.
 * @param {string[]} authorIds - up to 30 authors (Firestore 'in' limit is 10, so we chunk)
 * @returns {Promise<Array>}
 */
export const getPostsByAuthors = async (authorIds) => {
  if (!authorIds || authorIds.length === 0) return [];
  const list = [];
  const chunkSize = 10;
  for (let i = 0; i < authorIds.length; i += chunkSize) {
    const chunk = authorIds.slice(i, i + chunkSize);
    const q = query(
      collection(db, POSTS_COLLECTION),
      where('authorId', 'in', chunk)
    );
    const snap = await getDocs(q);
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  }
  return sortPostsByDate(list);
};

export const getPostsForProperties = async (propertyIds) => {
  if (!propertyIds || propertyIds.length === 0) return [];
  const chunks = [];
  const list = [];
  for (let i = 0; i < propertyIds.length; i += 10) {
    chunks.push(propertyIds.slice(i, i + 10));
  }
  for (const chunk of chunks) {
    const q = query(
      collection(db, POSTS_COLLECTION),
      where('propertyId', 'in', chunk)
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
  }
  list.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return bDate - aDate;
  });
  return list;
};

export const getPostsForProperty = async (propertyId) => {
  if (!propertyId) return [];
  const q = query(
    collection(db, POSTS_COLLECTION),
    where('propertyId', '==', propertyId)
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  list.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return bDate - aDate;
  });
  return list;
};

export const getPostsForAddress = async (address) => {
  if (!address) return [];
  const q = query(
    collection(db, POSTS_COLLECTION),
    where('propertyAddress', '==', address)
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  list.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return bDate - aDate;
  });
  return list;
};

export const getPostsForPropertyOrAddress = async (propertyId, address) => {
  const byProperty = await getPostsForProperty(propertyId);
  if (byProperty.length > 0) return byProperty;
  if (address) {
    const byAddress = await getPostsForAddress(address);
    return byAddress;
  }
  return [];
};

export const deletePost = async (postId) => {
  if (!postId) return;
  await deleteDoc(doc(db, POSTS_COLLECTION, postId));
};

export const addComment = async (postId, data) => {
  if (!postId) throw new Error('postId is required');
  const payload = {
    ...data,
    createdAt: new Date(),
  };
  const ref = await addDoc(collection(db, POSTS_COLLECTION, postId, 'comments'), payload);
  await updateDoc(doc(db, POSTS_COLLECTION, postId), { commentCount: increment(1) });
  return ref.id;
};

export const getCommentsForPost = async (postId) => {
  if (!postId) return [];
  const q = query(
    collection(db, POSTS_COLLECTION, postId, 'comments'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  return list;
};

/**
 * Set commentCount on a post (e.g. backfill after loading comments).
 * @param {string} postId
 * @param {number} count
 */
export const setPostCommentCount = async (postId, count) => {
  if (!postId || count == null) return;
  await updateDoc(doc(db, POSTS_COLLECTION, postId), { commentCount: count });
};
