import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

const POSTS_COLLECTION = 'posts';

export const createPost = async (data) => {
  const payload = {
    ...data,
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
