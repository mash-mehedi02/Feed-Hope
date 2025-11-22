/**
 * Firebase Configuration
 * FeedHope - Firebase Setup
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Analytics is optional and often blocked by ad blockers - make it lazy loaded

// Your web app's Firebase configuration
// Use environment variables for production, fallback to hardcoded values for development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDBWyAaRX0QB-Wsg4FdpkYwcUeeNotnVjw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "feedhope-6f775.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "feedhope-6f775",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "feedhope-6f775.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "895269062804",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:895269062804:web:81515392df0318b3ec0c81",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-1VTBMD9Y8L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics is optional - lazy load it to avoid blocking app initialization
// Many ad blockers block firebase analytics, so we make it completely optional
export const analytics = null; // Set to null - we don't need analytics for the app to work

export default app;

