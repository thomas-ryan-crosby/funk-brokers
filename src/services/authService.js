// Authentication Service - Firebase Authentication operations
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const USERS_COLLECTION = 'users';

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
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
