// Feedback service - Postgres API only (Firestore removed)
import { get as cacheGet, set as cacheSet, remove as cacheRemove } from '../utils/ttlCache';
import { getFeedbackListApi, createFeedbackApi } from './feedbackApiService';

const FEEDBACK_LIST_CACHE_KEY = 'feedback_list';
const FEEDBACK_CACHE_TTL_MS = 2 * 60 * 1000;

export const createFeedback = async (data) => {
  const payload = {
    userId: data.userId || null,
    authorName: data.authorName || null,
    body: (data.body || '').trim(),
    type: data.type || 'feedback',
    section: (data.section || '').trim() || null,
  };
  const id = await createFeedbackApi(payload);
  cacheRemove(FEEDBACK_LIST_CACHE_KEY);
  return id;
};

export const getFeedbackList = async (limitCount = 100, opts = {}) => {
  if (!opts.skipCache) {
    const cached = cacheGet(FEEDBACK_LIST_CACHE_KEY, FEEDBACK_CACHE_TTL_MS);
    if (cached != null) return cached;
  }
  const list = await getFeedbackListApi(limitCount);
  cacheSet(FEEDBACK_LIST_CACHE_KEY, list, FEEDBACK_CACHE_TTL_MS);
  return list;
};
