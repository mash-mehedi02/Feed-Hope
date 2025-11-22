/**
 * Firebase Notifications Service
 * FeedHope - Notification Functions
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getCurrentUser } from './firebaseAuth';

/**
 * Get user notifications
 */
export const getNotifications = async (unreadOnly = false) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get user role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User not found');
    
    const userData = userDoc.data();

    // Build query
    let q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('userRole', '==', userData.role),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (unreadOnly) {
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('userRole', '==', userData.role),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const querySnapshot = await getDocs(q);
    const notifications = [];

    querySnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Get unread count
    const unreadQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('userRole', '==', userData.role),
      where('isRead', '==', false)
    );
    const unreadSnapshot = await getDocs(unreadQuery);

    return {
      success: true,
      data: {
        notifications,
        unreadCount: unreadSnapshot.size
      }
    };
  } catch (error) {
    console.error('Get notifications error:', error);
    return {
      success: false,
      message: error.message,
      data: {
        notifications: [],
        unreadCount: 0
      }
    };
  }
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const notificationRef = doc(db, 'notifications', notificationId);
    
    // Verify ownership
    const notificationDoc = await getDoc(notificationRef);
    if (!notificationDoc.exists()) {
      throw new Error('Notification not found');
    }

    const notification = notificationDoc.data();
    if (notification.userId !== user.uid) {
      throw new Error('Not authorized');
    }

    await updateDoc(notificationRef, {
      isRead: true
    });

    return {
      success: true,
      message: 'Notification marked as read'
    };
  } catch (error) {
    console.error('Mark notification read error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get user role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User not found');
    
    const userData = userDoc.data();

    // Get all unread notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('userRole', '==', userData.role),
      where('isRead', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        isRead: true
      });
    });

    await batch.commit();

    return {
      success: true,
      message: 'All notifications marked as read'
    };
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

