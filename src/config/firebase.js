// Firebase Client SDK - Auth only (no Firestore, Storage, or Functions)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { firebaseConfig } from './firebase-config';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
export { analytics };

export default app;
