// Authentication Service - Firebase Auth + Postgres profile only (Firestore removed)
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { get as cacheGet, set as cacheSet } from '../utils/ttlCache';
import { getUserProfileApi, updateUserProfileApi, upsertUserApi, searchUsersApi } from './usersApiService';

const SEARCH_USERS_CACHE_TTL_MS = 60 * 1000;

export const searchUsers = async (searchQuery) => {
  const q = String(searchQuery || '').trim().toLowerCase();
  if (!q) return [];
  const cacheKey = `searchUsers_${q}`;
  const cached = cacheGet(cacheKey, SEARCH_USERS_CACHE_TTL_MS);
  if (cached != null) return cached;
  const out = await searchUsersApi(q);
  cacheSet(cacheKey, out, SEARCH_USERS_CACHE_TTL_MS);
  return out;
};

export const signUp = async (email, password, userData = {}) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  if (userData.name) {
    await updateProfile(user, { displayName: userData.name });
  }
  const userProfile = {
    uid: user.uid,
    email: user.email,
    name: userData.name || '',
    phone: userData.phone || '',
    role: userData.role || 'seller',
    publicUsername: userData.publicUsername || null,
  };
  await upsertUserApi(user.uid, { ...userProfile, email: user.email });
  return { user, userProfile };
};

export const signIn = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const userProfile = await getUserProfileApi(user.uid).catch(() => null);
  return { user, userProfile };
};

export const logout = async () => {
  await signOut(auth);
};

export const getCurrentUser = () => auth.currentUser;

export const getUserProfile = async (uid) => {
  return getUserProfileApi(uid);
};

export const updateUserProfile = async (uid, updates) => {
  await updateUserProfileApi(uid, updates);
};

export const updateUserPassword = async (newPassword) => {
  if (!auth.currentUser) throw new Error('No authenticated user.');
  await updatePassword(auth.currentUser, newPassword);
};

export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
