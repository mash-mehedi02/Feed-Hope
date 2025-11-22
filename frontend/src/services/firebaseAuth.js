/**
 * Firebase Authentication Service
 * FeedHope - Auth Functions
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

/**
 * Register new user
 */
export const registerUser = async (email, password, role, profileData) => {
  try {
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Update user display name
    await updateProfile(user, {
      displayName: profileData.name
    });

    // 3. Create user document in Firestore
    const userDoc = {
      email: email,
      role: role,
      emailVerified: user.emailVerified,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);

    // 4. Create role-specific profile
    let profileRef;
    if (role === 'donor') {
      profileRef = doc(db, 'donors', user.uid);
      await setDoc(profileRef, {
        userId: user.uid,
        name: profileData.name,
        phone: profileData.phone,
        gender: profileData.gender || null,
        division: profileData.division || null,
        district: profileData.district || null,
        area: profileData.area || null,
        address: profileData.address || null,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else if (role === 'volunteer') {
      profileRef = doc(db, 'volunteers', user.uid);
      await setDoc(profileRef, {
        userId: user.uid,
        name: profileData.name,
        organizationName: profileData.organizationName || null,
        phone: profileData.phone,
        division: profileData.division || null,
        district: profileData.district || null,
        area: profileData.area || null,
        address: profileData.address || null,
        avatar: null,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else if (role === 'delivery') {
      profileRef = doc(db, 'delivery_persons', user.uid);
      await setDoc(profileRef, {
        userId: user.uid,
        name: profileData.name,
        phone: profileData.phone,
        division: profileData.division || null,
        district: profileData.district || null,
        area: profileData.area || null,
        address: profileData.address || null,
        vehicleType: profileData.vehicleType || null,
        avatar: null,
        availabilityStatus: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // 5. Update user document with profileId
    await setDoc(doc(db, 'users', user.uid), {
      ...userDoc,
      profileId: user.uid
    }, { merge: true });

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        role: role,
        emailVerified: user.emailVerified
      }
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Login user
 */
export const loginUser = async (email, password, role) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Verify user role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (userData.role !== role) {
      await signOut(auth);
      throw new Error(`Invalid role. Expected ${role}, but user is ${userData.role}`);
    }

    // Get profile data
    let profile = null;
    if (role === 'donor') {
      const profileDoc = await getDoc(doc(db, 'donors', user.uid));
      if (profileDoc.exists()) {
        profile = { id: profileDoc.id, ...profileDoc.data() };
      }
    } else if (role === 'volunteer') {
      const profileDoc = await getDoc(doc(db, 'volunteers', user.uid));
      if (profileDoc.exists()) {
        profile = { id: profileDoc.id, ...profileDoc.data() };
      }
    } else if (role === 'delivery') {
      const profileDoc = await getDoc(doc(db, 'delivery_persons', user.uid));
      if (profileDoc.exists()) {
        profile = { id: profileDoc.id, ...profileDoc.data() };
      }
    }

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        role: role,
        emailVerified: user.emailVerified,
        profile: profile
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Logout user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Auth state observer
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId, role) => {
  try {
    let profileRef;
    if (role === 'donor') {
      profileRef = doc(db, 'donors', userId);
    } else if (role === 'volunteer') {
      profileRef = doc(db, 'volunteers', userId);
    } else if (role === 'delivery') {
      profileRef = doc(db, 'delivery_persons', userId);
    } else {
      throw new Error('Invalid role');
    }

    const profileDoc = await getDoc(profileRef);
    if (profileDoc.exists()) {
      return {
        success: true,
        profile: { id: profileDoc.id, ...profileDoc.data() }
      };
    } else {
      return {
        success: false,
        message: 'Profile not found'
      };
    }
  } catch (error) {
    console.error('Get profile error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

