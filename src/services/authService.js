// Authentication Service - Firebase Authentication operations
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const USERS_COLLECTION = 'users';

/**
 * Search users by name, publicUsername, or email (for @ mention suggestions).
 * Returns up to 10 matches; requires query length >= 1.
 */
export const searchUsers = async (searchQuery) => {
  const q = String(searchQuery || '').trim().toLowerCase();
  if (!q) return [];
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const qSnap = await getDocs(query(usersRef, limit(100)));
    const results = [];
    for (const docSnap of qSnap.docs) {
      if (results.length >= 10) break;
      const data = docSnap.data();
      const uid = docSnap.id;
      const name = (data.name || '').toLowerCase();
      const publicUsername = (data.publicUsername || '').toLowerCase();
      const email = (data.email || '').toLowerCase();
      const matches =
        name.includes(q) ||
        publicUsername.includes(q) ||
        (email && email.includes(q));
      if (matches)
        results.push({
          id: uid,
          name: data.name || '',
          publicUsername: data.publicUsername || '',
          email: data.email || '',
        });
    }
    return results.slice(0, 10);
  } catch (err) {
    console.error('searchUsers error', err);
    return [];
  }
};

/**
 * Sign up a new user
 */
export const signUp = async (email, password, userData = {}) => {
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name if provided
    if (userData.name) {
      await updateProfile(user, {
        displayName: userData.name,
      });
    }

    // Create user profile in Firestore
    const userProfile = {
      uid: user.uid,
      email: user.email,
      name: userData.name || '',
      phone: userData.phone || '',
      role: userData.role || 'seller', // seller, buyer, or both
      publicUsername: userData.publicUsername || null, // Public-facing display name
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, USERS_COLLECTION, user.uid), userProfile);

    return { user, userProfile };
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

/**
 * Sign in an existing user
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
    const userProfile = userDoc.exists() ? userDoc.data() : null;

    return { user, userProfile };
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

/**
 * Sign out current user
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (uid, updates) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(
      userRef,
      {
        ...updates,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Update current user's password
 */
export const updateUserPassword = async (newPassword) => {
  try {
    if (!auth.currentUser) {
      throw new Error('No authenticated user.');
    }
    await updatePassword(auth.currentUser, newPassword);
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
