// Post Service - Postgres/social API only (Firestore removed)
import {
  createPostViaApi,
  deletePostViaApi,
  createCommentViaApi,
} from './socialApiWrite';
import {
  getCommentsForPostApi,
  getPostsForPropertyOrAddressApi,
  getPostsByAuthorApi,
  getForYouPosts,
  getFollowingPosts,
} from './socialApiService';

/** Sort posts by createdAt desc. */
const sortPostsByDate = (list) => {
  list.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return bDate - aDate;
  });
};

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export const createPost = async (data) => {
  const payload = {
    ...data,
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const id = generateId();
  const apiId = await createPostViaApi({ id, ...payload });
  return apiId ?? id;
};

const POSTS_BY_AUTHOR_LIMIT = 100;

export const getPostsByAuthor = async (authorId) => {
  if (!authorId) return [];
  return getPostsByAuthorApi(authorId, POSTS_BY_AUTHOR_LIMIT);
};

export const getAllPosts = async (limitCount = 50) => {
  return getForYouPosts(limitCount);
};

export const getPostsByAuthors = async (authorIds) => {
  if (!authorIds || authorIds.length === 0) return [];
  const arrays = await Promise.all(
    authorIds.map((id) => getPostsByAuthorApi(id, 50))
  );
  const list = arrays.flat();
  sortPostsByDate(list);
  return list;
};

export const getPostsForProperties = async (propertyIds) => {
  if (!propertyIds || propertyIds.length === 0) return [];
  const arrays = await Promise.all(
    propertyIds.map((id) => getPostsForPropertyOrAddressApi(id, null))
  );
  const list = arrays.flat();
  sortPostsByDate(list);
  return list;
};

export const getPostsForProperty = async (propertyId) => {
  if (!propertyId) return [];
  return getPostsForPropertyOrAddressApi(propertyId, null);
};

export const getPostsForAddress = async (address) => {
  if (!address) return [];
  return getPostsForPropertyOrAddressApi(null, address);
};

export const getPostsForPropertyOrAddress = async (propertyId, address) => {
  return getPostsForPropertyOrAddressApi(propertyId, address);
};

export const deletePost = async (postId) => {
  if (!postId) return;
  await deletePostViaApi(postId);
};

export const addComment = async (postId, data) => {
  if (!postId) throw new Error('postId is required');
  const id = generateId();
  const payload = {
    postId,
    id,
    authorId: data.authorId,
    authorName: data.authorName,
    body: data.body ?? '',
    createdAt: data.createdAt || new Date(),
  };
  await createCommentViaApi(payload);
  return id;
};

export const getCommentsForPost = async (postId) => {
  if (!postId) return [];
  return getCommentsForPostApi(postId);
};

/** No-op: comment count is maintained by the API when adding comments. */
export const setPostCommentCount = async () => {};
