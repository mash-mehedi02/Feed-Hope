/**
 * Firebase Configuration
 * FeedHope - Firebase Setup
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBWyAaRX0QB-Wsg4FdpkYwcUeeNotnVjw",
  authDomain: "feedhope-6f775.firebaseapp.com",
  projectId: "feedhope-6f775",
  storageBucket: "feedhope-6f775.firebasestorage.app",
  messagingSenderId: "895269062804",
  appId: "1:895269062804:web:81515392df0318b3ec0c81",
  measurementId: "G-1VTBMD9Y8L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

export { analytics };

export default app;

