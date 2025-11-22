/**
 * Profile Page - Complete Profile for All Roles
 * FeedHope Frontend - Profile Screen
 * Supports Donor, Volunteer, and Delivery roles
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs, serverTimestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase/config';
import { getMyDonations } from '../services/firebaseFood';
import { format } from 'date-fns';
import { FaUser, FaEdit, FaCheck, FaTimes, FaSpinner, FaMapMarkerAlt, FaPhone, FaEnvelope, FaHistory, FaImage } from 'react-icons/fa';

const ProfilePage = ({ role: propRole }) => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const [user, loading] = useAuthState(auth);
  
  // State
  const [viewingUserId, setViewingUserId] = useState(null);
  const [viewingUserRole, setViewingUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({
    daysActive: 0,
    totalDonations: 0,
    totalRequests: 0,
    totalDelivered: 0,
    totalAccepted: 0
  });
  const [loadingData, setLoadingData] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isViewingOtherProfile, setIsViewingOtherProfile] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    area: '',
    district: '',
    division: '',
    organizationName: '',
    address: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      // Check if viewing another user's profile
      const targetUserId = userId || user.uid;
      const targetRole = searchParams.get('role') || null;
      
      if (targetUserId !== user.uid) {
        setIsViewingOtherProfile(true);
        setViewingUserId(targetUserId);
        setViewingUserRole(targetRole);
        loadOtherProfile(targetUserId, targetRole);
      } else {
        setIsViewingOtherProfile(false);
        loadProfile();
        loadHistory();
      }
    }
  }, [user, loading, userId, searchParams]);

  const loadProfile = async () => {
    setLoadingData(true);
    try {
      // Get user document
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        navigate('/login');
        return;
      }

      const userData = userDoc.data();
      const userRole = propRole || userData.role;

      setUserProfile({
        id: userDoc.id,
        ...userData,
        role: userRole
      });

      // Load role-specific profile
      let profileDoc;
      if (userRole === 'donor') {
        profileDoc = await getDoc(doc(db, 'donors', user.uid));
      } else if (userRole === 'volunteer') {
        profileDoc = await getDoc(doc(db, 'volunteers', user.uid));
      } else if (userRole === 'delivery') {
        profileDoc = await getDoc(doc(db, 'delivery_persons', user.uid));
      }

      if (profileDoc && profileDoc.exists()) {
        const profile = { id: profileDoc.id, ...profileDoc.data() };
        setProfileData(profile);
        setFormData({
          name: profile.name || '',
          phone: profile.phone || '',
          area: profile.area || profile.location || '',
          district: profile.district || '',
          division: profile.division || '',
          organizationName: profile.organizationName || profile.organization_name || '',
          address: profile.address || ''
        });
      }

      // Load stats for own profile
      await loadStatsForUser(user.uid, userRole);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadOtherProfile = async (targetUserId, targetRole) => {
    setLoadingData(true);
    try {
      // Get user document
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      if (!userDoc.exists()) {
        alert('User profile not found');
        navigate(-1);
        return;
      }

      const userData = userDoc.data();
      const userRole = targetRole || userData.role;

      setUserProfile({
        id: userDoc.id,
        ...userData,
        role: userRole
      });

      // Load role-specific profile
      let profileDoc;
      if (userRole === 'donor') {
        profileDoc = await getDoc(doc(db, 'donors', targetUserId));
      } else if (userRole === 'volunteer') {
        profileDoc = await getDoc(doc(db, 'volunteers', targetUserId));
      } else if (userRole === 'delivery') {
        profileDoc = await getDoc(doc(db, 'delivery_persons', targetUserId));
      }

      if (profileDoc && profileDoc.exists()) {
        const profile = { id: profileDoc.id, ...profileDoc.data() };
        setProfileData(profile);
        setFormData({
          name: profile.name || '',
          phone: profile.phone || '',
          area: profile.area || profile.location || '',
          district: profile.district || '',
          division: profile.division || '',
          organizationName: profile.organizationName || profile.organization_name || '',
          address: profile.address || ''
        });
      }

      // Load stats and history for the viewed user
      await loadStatsForUser(targetUserId, userRole);
      await loadHistoryForUser(targetUserId, userRole);
    } catch (error) {
      console.error('Error loading other profile:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadStatsForUser = async (targetUserId, userRole) => {
    try {
      // Calculate days active (from account creation)
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      let daysActive = 0;
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const createdAt = userData.createdAt?.toDate || userData.date?.toDate;
        if (createdAt) {
          const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
          const daysDiff = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
          daysActive = Math.max(1, daysDiff);
        } else {
          daysActive = 1;
        }
      }

      let totalDonations = 0;
      let totalRequests = 0;
      let totalDelivered = 0;
      let totalAccepted = 0;

      if (userRole === 'donor') {
        // Count donations
        const donationsQuery = query(
          collection(db, 'food_donations'),
          where('donorId', '==', targetUserId),
          limit(200)
        );
        try {
          const donationsSnapshot = await getDocs(donationsQuery);
          totalDonations = donationsSnapshot.size;
        } catch (err) {
          // Fallback: query all and filter client-side
          const allQuery = query(collection(db, 'food_donations'), limit(500));
          const allSnapshot = await getDocs(allQuery);
          totalDonations = allSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.donorId === targetUserId || data.userId === targetUserId;
          }).length;
        }
      } else if (userRole === 'volunteer') {
        // Count accepted donations
        const acceptedQuery = query(
          collection(db, 'food_donations'),
          where('volunteerId', '==', targetUserId),
          limit(200)
        );
        try {
          const acceptedSnapshot = await getDocs(acceptedQuery);
          totalAccepted = acceptedSnapshot.size;
        } catch (err) {
          // Fallback
          const allQuery = query(collection(db, 'food_donations'), limit(500));
          const allSnapshot = await getDocs(allQuery);
          totalAccepted = allSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.volunteerId === targetUserId;
          }).length;
        }
        
        // Count requests
        const requestsQuery = query(
          collection(db, 'food_requests'),
          limit(200)
        );
        try {
          const requestsSnapshot = await getDocs(requestsQuery);
          totalRequests = requestsSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.userId === targetUserId || data.volunteerId === targetUserId;
          }).length;
        } catch (err) {
          totalRequests = 0;
        }
      } else if (userRole === 'delivery') {
        // Count delivered orders
        const deliveredQuery = query(
          collection(db, 'food_donations'),
          where('deliveryPersonId', '==', targetUserId),
          where('status', '==', 'delivered'),
          limit(200)
        );
        try {
          const deliveredSnapshot = await getDocs(deliveredQuery);
          totalDelivered = deliveredSnapshot.size;
        } catch (err) {
          // Fallback
          const allQuery = query(collection(db, 'food_donations'), limit(500));
          const allSnapshot = await getDocs(allQuery);
          totalDelivered = allSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.deliveryPersonId === targetUserId && data.status === 'delivered';
          }).length;
        }
      }

      setStats({
        daysActive,
        totalDonations,
        totalRequests,
        totalDelivered,
        totalAccepted
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadHistoryForUser = async (targetUserId, userRole) => {
    try {
      // First, try to load from food_history collection (new approach)
      // Get userId from profile if needed
      let userIdToQuery = targetUserId;
      
      // Try to get userId from profile document (profile documents have userId field)
      // Also check if targetUserId is already a userId (from users collection)
      let profileDoc;
      if (userRole === 'donor') {
        profileDoc = await getDoc(doc(db, 'donors', targetUserId));
      } else if (userRole === 'volunteer') {
        profileDoc = await getDoc(doc(db, 'volunteers', targetUserId));
      } else if (userRole === 'delivery') {
        profileDoc = await getDoc(doc(db, 'delivery_persons', targetUserId));
      }
      
      if (profileDoc && profileDoc.exists()) {
        const profileData = profileDoc.data();
        // Profile documents have userId field which is the actual user.uid
        if (profileData.userId) {
          userIdToQuery = profileData.userId;
        }
      } else {
        // If profile doesn't exist, targetUserId might already be the userId
        // Check if it's a valid userId by checking users collection
        const userDoc = await getDoc(doc(db, 'users', targetUserId));
        if (userDoc.exists()) {
          userIdToQuery = targetUserId;
        }
      }
      
      console.log('🔍 Loading history for:', { targetUserId, userRole, userIdToQuery });
      
      // Query food_history collection for this user's history
      // Try with orderBy first (requires composite index)
      let historyQuery;
      try {
        historyQuery = query(
          collection(db, 'food_history'),
          where('userId', '==', userIdToQuery),
          where('userRole', '==', userRole),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      } catch (indexErr) {
        // If composite index doesn't exist, query without orderBy
        console.log('⚠️ Composite index missing, querying without orderBy');
        historyQuery = query(
          collection(db, 'food_history'),
          where('userId', '==', userIdToQuery),
          where('userRole', '==', userRole),
          limit(50)
        );
      }
      
      try {
        const historySnapshot = await getDocs(historyQuery);
        const historyEntries = [];
        const donationIds = new Set();
        
        // Collect donation IDs from history
        historySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.donationId) {
            donationIds.add(data.donationId);
          }
        });
        
        // Fetch donation details for each history entry
        const donationPromises = Array.from(donationIds).map(async (donationId) => {
          try {
            const donationDoc = await getDoc(doc(db, 'food_donations', donationId));
            if (donationDoc.exists()) {
              return {
                id: donationDoc.id,
                ...donationDoc.data()
              };
            }
            return null;
          } catch (err) {
            console.error('Error fetching donation:', donationId, err);
            return null;
          }
        });
        
        const donationsData = await Promise.all(donationPromises);
        const validDonations = donationsData.filter(d => d !== null);
        
        // Map history entries with donation data
        historySnapshot.forEach((docSnap) => {
          const historyData = docSnap.data();
          const donation = validDonations.find(d => d.id === historyData.donationId);
          if (donation) {
            historyEntries.push({
              ...donation,
              historyDate: historyData.createdAt?.toDate ? historyData.createdAt.toDate() : new Date(),
              historyStatus: historyData.statusTo,
              date: donation.date?.toDate ? donation.date.toDate() : (donation.createdAt?.toDate ? donation.createdAt.toDate() : new Date())
            });
          }
        });
        
        // Sort by history date (most recent first)
        historyEntries.sort((a, b) => b.historyDate - a.historyDate);
        
        if (historyEntries.length > 0) {
          setDonations(historyEntries);
          return;
        }
      } catch (historyErr) {
        console.log('History query error, falling back to donations:', historyErr);
      }
      
      // Fallback: Load from food_donations collection (old approach)
      if (userRole === 'donor') {
        const q = query(
          collection(db, 'food_donations'),
          where('donorId', '==', targetUserId),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        try {
          const snapshot = await getDocs(q);
          const history = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            history.push({
              id: docSnap.id,
              ...data,
              date: data.date?.toDate ? data.date.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
            });
          });
          setDonations(history);
        } catch (err) {
          // Fallback: query all and filter
          const allQuery = query(collection(db, 'food_donations'), orderBy('createdAt', 'desc'), limit(200));
          const allSnapshot = await getDocs(allQuery);
          const history = [];
          allSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.donorId === targetUserId || data.userId === targetUserId) {
              history.push({
                id: docSnap.id,
                ...data,
                date: data.date?.toDate ? data.date.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
              });
            }
          });
          setDonations(history);
        }
      } else if (userRole === 'volunteer') {
        const q = query(
          collection(db, 'food_donations'),
          where('volunteerId', '==', targetUserId),
          orderBy('volunteerAcceptedAt', 'desc'),
          limit(50)
        );
        try {
          const snapshot = await getDocs(q);
          const history = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            history.push({
              id: docSnap.id,
              ...data,
              date: data.volunteerAcceptedAt?.toDate ? data.volunteerAcceptedAt.toDate() : new Date()
            });
          });
          setDonations(history);
        } catch (err) {
          // Fallback
          const allQuery = query(collection(db, 'food_donations'), orderBy('createdAt', 'desc'), limit(200));
          const allSnapshot = await getDocs(allQuery);
          const history = [];
          allSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.volunteerId === targetUserId) {
              history.push({
                id: docSnap.id,
                ...data,
                date: data.volunteerAcceptedAt?.toDate ? data.volunteerAcceptedAt.toDate() : new Date()
              });
            }
          });
          setDonations(history);
        }
      } else if (userRole === 'delivery') {
        const q = query(
          collection(db, 'food_donations'),
          where('deliveryPersonId', '==', targetUserId),
          orderBy('deliveryAcceptedAt', 'desc'),
          limit(50)
        );
        try {
          const snapshot = await getDocs(q);
          const history = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            history.push({
              id: docSnap.id,
              ...data,
              date: data.deliveryAcceptedAt?.toDate ? data.deliveryAcceptedAt.toDate() : new Date()
            });
          });
          setDonations(history);
        } catch (err) {
          // Fallback
          const allQuery = query(collection(db, 'food_donations'), orderBy('createdAt', 'desc'), limit(200));
          const allSnapshot = await getDocs(allQuery);
          const history = [];
          allSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.deliveryPersonId === targetUserId) {
              history.push({
                id: docSnap.id,
                ...data,
                date: data.deliveryAcceptedAt?.toDate ? data.deliveryAcceptedAt.toDate() : new Date()
              });
            }
          });
          setDonations(history);
        }
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadHistory = async () => {
    const targetUserId = viewingUserId || user.uid;
    const userRoleLocal = viewingUserRole || propRole || userProfile?.role;
    
    if (isViewingOtherProfile) {
      await loadHistoryForUser(targetUserId, userRoleLocal);
      await loadStatsForUser(targetUserId, userRoleLocal);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const userRole = propRole || userData.role;

      // Try loading from food_history collection first (new approach)
      console.log('🔍 Loading history for own profile:', { userId: user.uid, userRole });
      
      let historyQuery;
      try {
        // Try with orderBy first (requires composite index)
        historyQuery = query(
          collection(db, 'food_history'),
          where('userId', '==', user.uid),
          where('userRole', '==', userRole),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      } catch (indexErr) {
        // If composite index doesn't exist, query without orderBy
        console.log('⚠️ Composite index missing, querying without orderBy');
        historyQuery = query(
          collection(db, 'food_history'),
          where('userId', '==', user.uid),
          where('userRole', '==', userRole),
          limit(50)
        );
      }
      
      try {
        const historySnapshot = await getDocs(historyQuery);
        console.log('📚 History query result:', historySnapshot.size, 'entries found');
        
        const historyEntries = [];
        const donationIds = new Set();
        
        // Collect donation IDs from history
        historySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          console.log('📝 History entry:', { donationId: data.donationId, userId: data.userId, userRole: data.userRole, statusTo: data.statusTo });
          if (data.donationId) {
            donationIds.add(data.donationId);
          }
        });
        
        console.log('📦 Donation IDs to fetch:', Array.from(donationIds));
        
        // Fetch donation details for each history entry
        const donationPromises = Array.from(donationIds).map(async (donationId) => {
          try {
            const donationDoc = await getDoc(doc(db, 'food_donations', donationId));
            if (donationDoc.exists()) {
              return {
                id: donationDoc.id,
                ...donationDoc.data()
              };
            }
            return null;
          } catch (err) {
            console.error('Error fetching donation:', donationId, err);
            return null;
          }
        });
        
        const donationsData = await Promise.all(donationPromises);
        const validDonations = donationsData.filter(d => d !== null);
        
        console.log('✅ Valid donations fetched:', validDonations.length);
        
        // Map history entries with donation data
        historySnapshot.forEach((docSnap) => {
          const historyData = docSnap.data();
          const donation = validDonations.find(d => d.id === historyData.donationId);
          if (donation) {
            historyEntries.push({
              ...donation,
              historyDate: historyData.createdAt?.toDate ? historyData.createdAt.toDate() : new Date(),
              historyStatus: historyData.statusTo,
              date: donation.date?.toDate ? donation.date.toDate() : (donation.createdAt?.toDate ? donation.createdAt.toDate() : new Date())
            });
          }
        });
        
        // Sort by history date (most recent first)
        historyEntries.sort((a, b) => b.historyDate - a.historyDate);
        
        console.log('✅ Final history entries:', historyEntries.length);
        
        if (historyEntries.length > 0) {
          setDonations(historyEntries);
          return;
        } else {
          console.log('⚠️ No history entries found, falling back to donations collection');
        }
      } catch (historyErr) {
        console.error('❌ History query error, falling back to donations:', historyErr);
      }

      // Fallback: Load from food_donations collection (old approach)
      if (userRole === 'donor') {
        // Load donor's donations
        const result = await getMyDonations();
        if (result.success) {
          setDonations(result.data.map(d => ({
            ...d,
            date: d.date?.toDate ? d.date.toDate() : (d.createdAt?.toDate ? d.createdAt.toDate() : new Date())
          })));
        }
      } else if (userRole === 'volunteer') {
        // Load volunteer's accepted donations (fallback)
        console.log('📋 Loading volunteer history from donations (fallback)');
        const q = query(
          collection(db, 'food_donations'),
          where('volunteerId', '==', user.uid),
          limit(50)
        );
        try {
          const snapshot = await getDocs(q);
          const history = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            history.push({
              id: docSnap.id,
              ...data,
              date: data.volunteerAcceptedAt?.toDate ? data.volunteerAcceptedAt.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
            });
          });
          // Sort by date (most recent first)
          history.sort((a, b) => b.date - a.date);
          console.log('✅ Volunteer history from donations:', history.length);
          setDonations(history);
        } catch (err) {
          console.error('❌ Volunteer history query error:', err);
          // Fallback: query all and filter
          const allQuery = query(collection(db, 'food_donations'), limit(200));
          const allSnapshot = await getDocs(allQuery);
          const history = [];
          allSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.volunteerId === user.uid) {
              history.push({
                id: docSnap.id,
                ...data,
                date: data.volunteerAcceptedAt?.toDate ? data.volunteerAcceptedAt.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
              });
            }
          });
          // Sort by date (most recent first)
          history.sort((a, b) => b.date - a.date);
          console.log('✅ Volunteer history (fallback):', history.length);
          setDonations(history);
        }
      } else if (userRole === 'delivery') {
        // Load delivery person's orders (fallback)
        console.log('📋 Loading delivery history from donations (fallback)');
        const q = query(
          collection(db, 'food_donations'),
          where('deliveryPersonId', '==', user.uid),
          limit(50)
        );
        try {
          const snapshot = await getDocs(q);
          const history = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            history.push({
              id: docSnap.id,
              ...data,
              date: data.deliveryAcceptedAt?.toDate ? data.deliveryAcceptedAt.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
            });
          });
          // Sort by date (most recent first)
          history.sort((a, b) => b.date - a.date);
          console.log('✅ Delivery history from donations:', history.length);
          setDonations(history);
        } catch (err) {
          console.error('❌ Delivery history query error:', err);
          // Fallback: query all and filter
          const allQuery = query(collection(db, 'food_donations'), limit(200));
          const allSnapshot = await getDocs(allQuery);
          const history = [];
          allSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.deliveryPersonId === user.uid || data.assigned_to === user.uid) {
              history.push({
                id: docSnap.id,
                ...data,
                date: data.deliveryAcceptedAt?.toDate ? data.deliveryAcceptedAt.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
              });
            }
          });
          // Sort by date (most recent first)
          history.sort((a, b) => b.date - a.date);
          console.log('✅ Delivery history (fallback):', history.length);
          setDonations(history);
        }
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleAvatarUpload = async (e) => {
    // Prevent avatar upload if viewing another user's profile
    if (isViewingOtherProfile) {
      alert('You can only edit your own profile');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Image size must be less than 3MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarRef = ref(storage, `avatars/${user.uid}_${Date.now()}_${file.name}`);
      await uploadBytes(avatarRef, file);
      const avatarUrl = await getDownloadURL(avatarRef);

      // Update profile with avatar URL
      const userRole = propRole || userProfile?.role;
      let profileRef;
      if (userRole === 'donor') {
        profileRef = doc(db, 'donors', user.uid);
      } else if (userRole === 'volunteer') {
        profileRef = doc(db, 'volunteers', user.uid);
      } else if (userRole === 'delivery') {
        profileRef = doc(db, 'delivery_persons', user.uid);
      }

      if (profileRef) {
        await updateDoc(profileRef, {
          avatar: avatarUrl,
          updatedAt: serverTimestamp()
        });
        await loadProfile();
        alert('Avatar updated successfully!');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    // Prevent saving if viewing another user's profile
    if (isViewingOtherProfile) {
      alert('You can only edit your own profile');
      setEditing(false);
      return;
    }

    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      const userRole = propRole || userProfile?.role;
      let profileRef;
      
      if (userRole === 'donor') {
        profileRef = doc(db, 'donors', user.uid);
      } else if (userRole === 'volunteer') {
        profileRef = doc(db, 'volunteers', user.uid);
      } else if (userRole === 'delivery') {
        profileRef = doc(db, 'delivery_persons', user.uid);
      }

      if (profileRef) {
        await updateDoc(profileRef, {
          name: formData.name,
          phone: formData.phone,
          area: formData.area,
          district: formData.district,
          division: formData.division,
          organizationName: userRole === 'volunteer' ? formData.organizationName : undefined,
          organization_name: userRole === 'volunteer' ? formData.organizationName : undefined,
          address: formData.address,
          updatedAt: serverTimestamp()
        });

        await loadProfile();
        setEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    if (profileData) {
      setFormData({
        name: profileData.name || '',
        phone: profileData.phone || '',
        area: profileData.area || profileData.location || '',
        district: profileData.district || '',
        division: profileData.division || '',
        organizationName: profileData.organizationName || profileData.organization_name || '',
        address: profileData.address || ''
      });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: '#fef3c7', color: '#92400e', text: 'Pending' },
      available: { bg: '#dbeafe', color: '#1e40af', text: 'Available' },
      ongoing: { bg: '#e0e7ff', color: '#4338ca', text: 'Ongoing' },
      delivered: { bg: '#d1fae5', color: '#065f46', text: 'Delivered' },
      assigned: { bg: '#fef3c7', color: '#92400e', text: 'Assigned' },
      rejected: { bg: '#fee2e2', color: '#991b1b', text: 'Rejected' }
    };

    const badge = badges[status] || badges.pending;
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        background: badge.bg,
        color: badge.color
      }}>
        {badge.text}
      </span>
    );
  };

  // Use stats from state if available, otherwise calculate from donations
  const displayStats = stats.daysActive > 0 ? stats : {
    daysActive: 0,
    totalDonations: donations.length,
    totalRequests: 0,
    totalDelivered: donations.filter(d => d.status === 'delivered').length,
    totalAccepted: donations.length
  };

  const userRole = propRole || userProfile?.role;

  const styles = {
    container: {
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: '20px',
      paddingTop: '100px'
    },
    header: {
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    profileHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      marginBottom: '24px'
    },
    avatarContainer: {
      position: 'relative',
      width: '120px',
      height: '120px'
    },
    avatar: {
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      objectFit: 'cover',
      border: '4px solid #06C167'
    },
    avatarEditBtn: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      background: '#06C167',
      color: 'white',
      border: '3px solid white',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: '14px'
    },
    info: {
      flex: 1
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px',
      marginTop: '24px'
    },
    statCard: {
      background: 'linear-gradient(135deg, #e6fff3, #ffffff)',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      border: '1px solid #e5e7eb'
    },
    statValue: {
      fontSize: '28px',
      fontWeight: 700,
      color: '#06C167',
      marginBottom: '8px'
    },
    statLabel: {
      fontSize: '14px',
      color: '#6b7280',
      fontWeight: 600
    },
    section: {
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 600,
      color: '#374151'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '15px',
      outline: 'none'
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s'
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #06C167, #059669)',
      color: 'white'
    },
    btnSecondary: {
      background: '#e5e7eb',
      color: '#374151'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '12px',
      textAlign: 'left',
      borderBottom: '2px solid #e5e7eb',
      fontWeight: 600,
      color: '#374151'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e5e7eb',
      color: '#6b7280'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem',
      gap: '16px'
    }
  };

  if (loading || loadingData) {
    return (
      <div style={styles.loading}>
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={styles.header}>
          <div style={styles.profileHeader}>
            <div style={styles.avatarContainer}>
              {profileData?.avatar ? (
                <img src={profileData.avatar} alt="Avatar" style={styles.avatar} />
              ) : (
                <div style={{
                  ...styles.avatar,
                  background: 'linear-gradient(135deg, #06C167, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '48px'
                }}>
                  <FaUser />
                </div>
              )}
              {!isViewingOtherProfile && (
                <label style={styles.avatarEditBtn} title="Change avatar">
                  <FaImage />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
            </div>
            <div style={styles.info}>
              <h1 style={{ margin: 0, marginBottom: '8px', color: '#111827', fontSize: '28px' }}>
                {profileData?.name || userProfile?.name || 'User'}
              </h1>
              <p style={{ margin: 0, color: '#6b7280', marginBottom: '4px' }}>
                <FaEnvelope style={{ marginRight: '6px' }} />
                {userProfile?.email || user?.email}
              </p>
              <p style={{ margin: 0, color: '#6b7280', marginBottom: '8px', textTransform: 'capitalize' }}>
                Role: {userRole}
              </p>
              {!editing && !isViewingOtherProfile && (
                <button
                  onClick={() => setEditing(true)}
                  style={{ ...styles.button, ...styles.btnPrimary, marginTop: '8px' }}
                >
                  <FaEdit /> Edit Profile
                </button>
              )}
              {isViewingOtherProfile && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef3c7', borderRadius: '8px', color: '#92400e', fontSize: '14px', fontWeight: 600 }}>
                  👁️ Viewing another user's profile (Read-only)
                </div>
              )}
            </div>
          </div>

          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{displayStats.daysActive || 1}</div>
              <div style={styles.statLabel}>Days Active</div>
            </div>
            {userRole === 'donor' && (
              <>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: '#3b82f6' }}>{displayStats.totalDonations || 0}</div>
                  <div style={styles.statLabel}>Total Donations</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: '#10b981' }}>{displayStats.totalDelivered || 0}</div>
                  <div style={styles.statLabel}>Delivered</div>
                </div>
              </>
            )}
            {userRole === 'volunteer' && (
              <>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: '#f59e0b' }}>{displayStats.totalAccepted || 0}</div>
                  <div style={styles.statLabel}>Accepted Orders</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: '#10b981' }}>{displayStats.totalRequests || 0}</div>
                  <div style={styles.statLabel}>Food Requests</div>
                </div>
              </>
            )}
            {userRole === 'delivery' && (
              <>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: '#10b981' }}>{displayStats.totalDelivered || 0}</div>
                  <div style={styles.statLabel}>Delivered</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={{ margin: 0, marginBottom: '20px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaUser /> Profile Information
          </h2>

          {editing && !isViewingOtherProfile ? (
            <div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone (11 digits)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={styles.input}
                  maxLength={11}
                  pattern="[0-9]{11}"
                />
              </div>

              {userRole === 'volunteer' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Organization Name</label>
                  <input
                    type="text"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    style={styles.input}
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Area/Location</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>District</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Division</label>
                <input
                  type="text"
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    ...styles.button,
                    ...styles.btnPrimary,
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? (
                    <>
                      <FaSpinner className="spinner" /> Saving...
                    </>
                  ) : (
                    <>
                      <FaCheck /> Save
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  style={{ ...styles.button, ...styles.btnSecondary }}
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '12px', color: '#374151' }}>
                <strong>Name:</strong> {profileData?.name || '—'}
              </p>
              <p style={{ marginBottom: '12px', color: '#374151' }}>
                <strong><FaPhone style={{ marginRight: '6px' }} />Phone:</strong> {profileData?.phone || '—'}
              </p>
              {userRole === 'volunteer' && profileData?.organizationName && (
                <p style={{ marginBottom: '12px', color: '#374151' }}>
                  <strong>Organization:</strong> {profileData.organizationName}
                </p>
              )}
              <p style={{ marginBottom: '12px', color: '#374151' }}>
                <strong><FaMapMarkerAlt style={{ marginRight: '6px' }} />Location:</strong>{' '}
                {profileData?.area || profileData?.location || '—'}
              </p>
              {profileData?.district && (
                <p style={{ marginBottom: '12px', color: '#374151' }}>
                  <strong>District:</strong> {profileData.district}
                </p>
              )}
              {profileData?.division && (
                <p style={{ marginBottom: '12px', color: '#374151' }}>
                  <strong>Division:</strong> {profileData.division}
                </p>
              )}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={{ margin: 0, marginBottom: '20px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaHistory /> History
          </h2>

          {donations.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              No history yet.
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Food</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((donation) => (
                  <tr key={donation.id}>
                    <td style={styles.td}>{donation.food || donation.foodName}</td>
                    <td style={styles.td}>{donation.type || donation.foodType}</td>
                    <td style={styles.td}>{donation.quantity}</td>
                    <td style={styles.td}>{getStatusBadge(donation.status)}</td>
                    <td style={styles.td}>{format(donation.date, 'MMM dd, yyyy HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
