// Firebase Client SDK - Auth only (no Firestore, Storage, or Functions)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebase-config';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;
