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

// Analytics is optional - lazy load it to avoid blocking app initialization
// Many ad blockers block firebase analytics, so we make it completely optional
export const analytics = null; // Set to null - we don't need analytics for the app to work

export default app;

