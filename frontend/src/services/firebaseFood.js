/**
 * Firebase Food Donation Service
 * FeedHope - Food Donation Functions
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getCurrentUser } from './firebaseAuth';
import { uploadImageToCloudinary } from './cloudinary';

/**
 * Create food donation
 */
export const createFoodDonation = async (donationData, imageFile) => {
  try {
    console.log('🔥 createFoodDonation called with:', { donationData, hasImage: !!imageFile });
    
    // Check if Firebase services are available
    if (!db) {
      console.error('❌ Firestore database not initialized');
      throw new Error('Database not initialized. Please refresh the page.');
    }
    console.log('✅ Firestore database initialized');
    
    const user = getCurrentUser();
    if (!user) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated. Please log in and try again.');
    }
    console.log('✅ User authenticated:', user.uid, user.email);

    // Get user profile to get donorId
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      console.error('❌ User document not found');
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const donorId = userData.profileId || user.uid; // Use profileId or fallback to uid
    console.log('✅ Donor ID:', donorId);

    // Upload image to Cloudinary if provided
    let imageUrl = null;
    if (imageFile) {
      try {
        imageUrl = await uploadImageToCloudinary(imageFile, 'feedhope/food_images');
        console.log('✅ Image uploaded to Cloudinary:', imageUrl);
      } catch (imageError) {
        console.error('❌ Image upload error:', imageError);
        throw new Error(`Image upload failed: ${imageError.message}`);
      }
    } else {
      console.log('ℹ️ No image provided');
    }

    // Get donor profile for name and email
    const donorDoc = await getDoc(doc(db, 'donors', user.uid));
    const donorData = donorDoc.exists() ? donorDoc.data() : {};
    const donorEmail = user.email;
    const donorName = donorData.name || user.displayName || 'Donor';
    console.log('✅ Donor info:', { donorName, donorEmail });

    // Create donation document (matching PHP database structure)
    console.log('📝 Creating donation document...');
    
    const donationDataObj = {
      // Core fields (matching PHP food_donations table)
      donorId: donorId, // IMPORTANT: Save donorId for queries
      userId: user.uid, // Also save userId for direct access
      name: donorName,
      email: donorEmail,
      food: donationData.food || donationData.foodName,
      type: donationData.type || donationData.foodType,
      category: donationData.category,
      quantity: donationData.quantity,
      phoneno: donationData.phone || donationData.contactPhone,
      location: donationData.location || donationData.area,
      address: donationData.address || donationData.pickupAddress,
      food_image: imageUrl,
      
      // Location fields
      pickup_latitude: donationData.pickupLatitude || null,
      pickup_longitude: donationData.pickupLongitude || null,
      pickup_address_full: donationData.pickupAddressFull || null,
      
      // Division/District/Area chain
      division: donationData.division || null,
      district: donationData.district || null,
      area: donationData.area || null,
      
      // Link to request
      request_id: donationData.requestId || null,
      donor_note: donationData.donorNote || null,
      people_served: donationData.peopleServed || null,
      
      // Status workflow (PHP: pending -> available -> assigned -> delivered)
      status: 'pending', // Start as pending (admin needs to approve)
      assigned_to: null,
      delivery_by: null,
      volunteerId: null, // For volunteer acceptance
      deliveryPersonId: null, // For delivery acceptance
      admin_approved_by: null,
      admin_approved_at: null,
      
      // Additional fields
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Wrap in Promise.race with timeout to detect hanging operations
    const donationPromise = addDoc(collection(db, 'food_donations'), donationDataObj);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Firestore write operation timed out. Please check your internet connection and Firestore database permissions.'));
      }, 25000); // 25 seconds timeout for Firestore operation
    });
    
    let donationRef;
    try {
      donationRef = await Promise.race([donationPromise, timeoutPromise]);
      console.log('✅ Donation document created:', donationRef.id);
    } catch (writeError) {
      console.error('❌ Firestore write error:', writeError);
      if (writeError.code === 'permission-denied') {
        throw new Error('Permission denied. Please check Firestore security rules or contact support.');
      } else if (writeError.message && writeError.message.includes('timeout')) {
        throw writeError;
      } else {
        throw new Error(`Failed to save donation: ${writeError.message || 'Unknown error'}`);
      }
    }

    // Update food request if linked
    if (donationData.requestId && donationData.peopleServed) {
      console.log('🔄 Updating linked food request:', donationData.requestId);
      const requestRef = doc(db, 'food_requests', donationData.requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (requestDoc.exists()) {
        const requestData = requestDoc.data();
        const currentReceivedCount = requestData.received_count || 0;
        const recipientCount = requestData.recipient_count || 0;
        const remaining = Math.max(0, recipientCount - currentReceivedCount);
        
        // Validate contribution doesn't exceed remaining need
        if (donationData.peopleServed > remaining) {
          console.warn(`⚠️ Contribution (${donationData.peopleServed}) exceeds remaining need (${remaining}). Using remaining.`);
          // Update donation to reflect actual contribution
          donationData.peopleServed = remaining;
        }
        
        const newReceivedCount = currentReceivedCount + donationData.peopleServed;
        const newStatus = newReceivedCount >= recipientCount ? 'fulfilled' : 'matched';
        
        await updateDoc(requestRef, {
          received_count: newReceivedCount,
          status: newStatus,
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Updated request: ${currentReceivedCount} → ${newReceivedCount} / ${recipientCount}`);
      }
    }

    // Create history entry
    console.log('📚 Creating history entry...');
    await addDoc(collection(db, 'food_history'), {
      donationId: donationRef.id,
      statusFrom: null,
      statusTo: 'pending',
      changedById: user.uid,
      changedByRole: 'donor',
      changedByName: donorName,
      notes: 'Donation created',
      createdAt: serverTimestamp()
    });
    console.log('✅ History entry created');

    console.log('🎉 Donation creation completed successfully!');
    return {
      success: true,
      donationId: donationRef.id
    };
  } catch (error) {
    console.error('❌ Create donation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    return {
      success: false,
      message: error.message || 'Failed to create donation. Please try again.'
    };
  }
};

/**
 * Create food request (for volunteers/NGOs)
 */
export const createFoodRequest = async (requestData) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User not found');
    
    const userData = userDoc.data();
    const volunteerId = userData.profileId || user.uid;

    // Get volunteer profile for name and organization
    const volunteerDoc = await getDoc(doc(db, 'volunteers', user.uid));
    const volunteerData = volunteerDoc.exists() ? volunteerDoc.data() : {};
    const volunteerEmail = user.email;
    const volunteerName = volunteerData.name || user.displayName || 'Volunteer';
    const organizationName = volunteerData.organizationName || volunteerData.organization_name || requestData.organizationName || null;

    // Create request document (matching PHP database structure)
    const requestRef = await addDoc(collection(db, 'food_requests'), {
      // Core fields (matching PHP food_requests table)
      volunteerId: volunteerId,
      userId: user.uid,
      name: volunteerName,
      email: volunteerEmail,
      organization_name: organizationName,
      organizationName: organizationName, // Alias for consistency
      
      // Food details
      food_type: requestData.foodType || requestData.food_type,
      foodType: requestData.foodType || requestData.food_type, // Alias
      food_category: requestData.foodCategory || requestData.category || requestData.food_category,
      foodCategory: requestData.foodCategory || requestData.category || requestData.food_category, // Alias
      quantity_needed: requestData.quantityNeeded || requestData.quantity_needed,
      quantityNeeded: requestData.quantityNeeded || requestData.quantity_needed, // Alias
      quantity_unit: requestData.quantityUnit || requestData.quantity_unit || null,
      quantityUnit: requestData.quantityUnit || requestData.quantity_unit || null, // Alias
      
      // Purpose and recipients
      purpose: requestData.purpose,
      recipient_count: requestData.recipientCount || requestData.recipient_count || null,
      recipientCount: requestData.recipientCount || requestData.recipient_count || null, // Alias
      received_count: 0,
      receivedCount: 0, // Alias
      
      // Location
      location: requestData.location || requestData.area,
      area: requestData.area || requestData.location,
      address: requestData.address,
      division: requestData.division || null,
      district: requestData.district || null,
      
      // Contact
      phoneno: requestData.phone || requestData.phoneno,
      phone: requestData.phone || requestData.phoneno, // Alias
      
      // Urgency and timing
      urgency: requestData.urgency || 'medium',
      required_date: requestData.requiredDate || requestData.required_date || null,
      requiredDate: requestData.requiredDate || requestData.required_date || null, // Alias
      notes: requestData.notes || null,
      
      // Status
      status: 'pending',
      matched_with: null,
      matchedWith: null, // Alias
      
      // Timestamps
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      requestId: requestRef.id
    };
  } catch (error) {
    console.error('Create food request error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Get available food donations (for volunteers)
 */
export const getAvailableDonations = async (filters = {}) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    let q = query(
      collection(db, 'food_donations'),
      where('status', '==', 'available'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    // Apply area filter
    if (filters.area) {
      q = query(
        collection(db, 'food_donations'),
        where('status', '==', 'available'),
        where('pickupArea', '==', filters.area),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else if (filters.district) {
      q = query(
        collection(db, 'food_donations'),
        where('status', '==', 'available'),
        where('pickupDistrict', '==', filters.district),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else if (filters.division) {
      q = query(
        collection(db, 'food_donations'),
        where('status', '==', 'available'),
        where('pickupDivision', '==', filters.division),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const querySnapshot = await getDocs(q);
    const donations = [];

    for (const docSnap of querySnapshot.docs) {
      const donation = { id: docSnap.id, ...docSnap.data() };
      
      // Get donor info
      if (donation.donorId) {
        const donorDoc = await getDoc(doc(db, 'donors', donation.donorId));
        if (donorDoc.exists()) {
          donation.donor = { id: donorDoc.id, ...donorDoc.data() };
        }
      }

      donations.push(donation);
    }

    return {
      success: true,
      data: donations
    };
  } catch (error) {
    console.error('Get available donations error:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
};

/**
 * Accept donation as volunteer
 */
export const acceptAsVolunteer = async (donationId, deliveryData) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User not found');
    
    const userData = userDoc.data();
    // Use user.uid as volunteerId (volunteer profile doc ID is same as user.uid)
    const volunteerId = user.uid;

    // Get donation
    const donationRef = doc(db, 'food_donations', donationId);
    const donationDoc = await getDoc(donationRef);
    
    if (!donationDoc.exists()) {
      throw new Error('Donation not found');
    }

    const donation = donationDoc.data();

    // Validate status
    if (donation.status !== 'available') {
      throw new Error(`Donation is not available. Current status: ${donation.status}`);
    }

    if (donation.volunteerId) {
      throw new Error('Donation already accepted by another volunteer');
    }

    // Use batch write for atomicity
    const batch = writeBatch(db);

    // Update donation
    batch.update(donationRef, {
      status: 'pending',
      volunteerId: volunteerId,
      volunteerAcceptedAt: serverTimestamp(),
      deliveryAddress: deliveryData.deliveryAddress,
      deliveryDivision: deliveryData.deliveryDivision,
      deliveryDistrict: deliveryData.deliveryDistrict,
      deliveryArea: deliveryData.deliveryArea,
      deliveryLatitude: deliveryData.deliveryLatitude || null,
      deliveryLongitude: deliveryData.deliveryLongitude || null,
      deliveryAddressFull: deliveryData.deliveryAddressFull || null,
      updatedAt: serverTimestamp()
    });

    // Get volunteer name
    const volunteerDoc = await getDoc(doc(db, 'volunteers', volunteerId));
    const volunteerName = volunteerDoc.exists() ? volunteerDoc.data().name : null;

    // Create history entry
    const historyRef = doc(collection(db, 'food_history'));
    batch.set(historyRef, {
      donationId: donationId,
      statusFrom: 'available',
      statusTo: 'pending',
      changedById: user.uid,
      changedByRole: 'volunteer',
      changedByName: volunteerName,
      notes: null,
      createdAt: serverTimestamp()
    });

    // Create notifications
    // Get donor userId
    const donorDoc = await getDoc(doc(db, 'donors', donation.donorId));
    if (donorDoc.exists()) {
      const donorUserId = donorDoc.data().userId;
      const donorNotifRef = doc(collection(db, 'notifications'));
      batch.set(donorNotifRef, {
        userId: donorUserId,
        userRole: 'donor',
        type: 'volunteer_accepted',
        title: 'Volunteer Accepted Your Donation',
        message: 'A volunteer has accepted your food donation. Delivery will be arranged soon.',
        relatedId: donationId,
        relatedType: 'food_donation',
        isRead: false,
        createdAt: serverTimestamp()
      });
    }

    // CRITICAL: Create notification for ALL delivery persons in the area
    // This ensures delivery persons are notified when a volunteer accepts
    // Note: We'll query for delivery persons by area/district later
    const deliveryNotifRef = doc(collection(db, 'notifications'));
    batch.set(deliveryNotifRef, {
      type: 'volunteer_accepted_order',
      userRole: 'delivery', // For all delivery persons
      title: 'New Delivery Order Available',
      message: `A volunteer has accepted a donation. Pickup: ${donation.location || donation.area || 'Location'}. Delivery needed.`,
      relatedId: donationId,
      relatedType: 'food_donation',
      area: deliveryData.deliveryArea || donation.area,
      district: deliveryData.deliveryDistrict || donation.district,
      division: deliveryData.deliveryDivision || donation.division,
      isRead: false,
      createdAt: serverTimestamp()
    });

    console.log('✅ [VOLUNTEER ACCEPT] Created notifications for donor and delivery persons:', donationId);

    // Commit batch
    await batch.commit();

    return {
      success: true,
      message: 'Donation accepted successfully'
    };
  } catch (error) {
    console.error('Accept as volunteer error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Get pending deliveries (for delivery persons)
 */
export const getPendingDeliveries = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get delivery person's area
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User not found');
    
    const userData = userDoc.data();
    const deliveryProfileDoc = await getDoc(doc(db, 'delivery_persons', userData.profileId));
    
    if (!deliveryProfileDoc.exists()) {
      throw new Error('Delivery profile not found');
    }

    const deliveryProfile = deliveryProfileDoc.data();

    // Build query - show pending orders in same area/district/division
    let q;
    if (deliveryProfile.area) {
      q = query(
        collection(db, 'food_donations'),
        where('status', '==', 'available'),
        where('area', '==', deliveryProfile.area),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else if (deliveryProfile.district) {
      q = query(
        collection(db, 'food_donations'),
        where('status', '==', 'available'),
        where('district', '==', deliveryProfile.district),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      // If no area/district, show all available orders
      q = query(
        collection(db, 'food_donations'),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const querySnapshot = await getDocs(q);
    const deliveries = [];

    for (const docSnap of querySnapshot.docs) {
      const delivery = { id: docSnap.id, ...docSnap.data() };
      deliveries.push(delivery);
    }

    return {
      success: true,
      data: deliveries
    };
  } catch (error) {
    console.error('Get pending deliveries error:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
};

/**
 * Accept delivery
 */
export const acceptAsDelivery = async (donationId) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User not found');
    
    const userData = userDoc.data();
    const deliveryId = userData.profileId || user.uid; // Use profileId or fallback to uid

    // Get donation
    const donationRef = doc(db, 'food_donations', donationId);
    const donationDoc = await getDoc(donationRef);
    
    if (!donationDoc.exists()) {
      throw new Error('Donation not found');
    }

    const donation = donationDoc.data();

    // Validate status - check both 'pending' (volunteer accepted) and 'available' (admin approved, ready for delivery)
    if (donation.status !== 'pending' && donation.status !== 'available') {
      throw new Error(`Donation is not available for delivery. Current status: ${donation.status}`);
    }

    // Only check deliveryPersonId if status is 'pending' (already accepted by volunteer)
    // If status is 'available', it's ready for any delivery person
    if (donation.status === 'pending' && donation.deliveryPersonId) {
      throw new Error('Donation already accepted by another delivery person');
    }

    // If status is 'available', check assigned_to or deliveryPersonId
    if (donation.status === 'available' && (donation.assigned_to || donation.deliveryPersonId)) {
      throw new Error('Donation already assigned to another delivery person');
    }

    // Use batch write
    const batch = writeBatch(db);

    // Update donation - set status to 'ongoing' and assign to delivery person
    // CRITICAL: Ensure all delivery-related fields are set
    batch.update(donationRef, {
      status: 'ongoing',
      deliveryPersonId: user.uid, // Primary field
      assigned_to: user.uid, // Compatibility field
      delivery_by: user.uid, // Compatibility field
      deliveryAcceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ [DELIVERY ACCEPT] Updating donation:', donationId, {
      status: 'ongoing',
      deliveryPersonId: user.uid,
      previousStatus: donation.status,
      hadVolunteerId: !!donation.volunteerId
    });

    // Get delivery person name
    const deliveryDoc = await getDoc(doc(db, 'delivery_persons', deliveryId || user.uid));
    const deliveryName = deliveryDoc.exists() ? deliveryDoc.data().name : null;

    // Create history entry
    const historyRef = doc(collection(db, 'food_history'));
    batch.set(historyRef, {
      donationId: donationId,
      statusFrom: donation.status, // Keep original status
      statusTo: 'ongoing',
      changedById: user.uid,
      changedByRole: 'delivery',
      changedByName: deliveryName,
      notes: null,
      createdAt: serverTimestamp()
    });

    // Create notifications for donor and volunteer
    // Get donor userId
    const donorDoc = await getDoc(doc(db, 'donors', donation.donorId));
    if (donorDoc.exists()) {
      const donorUserId = donorDoc.data().userId;
      const donorNotifRef = doc(collection(db, 'notifications'));
      batch.set(donorNotifRef, {
        userId: donorUserId,
        userRole: 'donor',
        type: 'delivery_accepted',
        title: 'Delivery Started',
        message: 'A delivery person has accepted your food donation. It is now on the way.',
        relatedId: donationId,
        relatedType: 'food_donation',
        isRead: false,
        createdAt: serverTimestamp()
      });
    }

    // Get volunteer userId (if volunteer accepted it)
    if (donation.volunteerId) {
      const volunteerDoc = await getDoc(doc(db, 'volunteers', donation.volunteerId));
      if (volunteerDoc.exists()) {
        const volunteerUserId = volunteerDoc.data().userId;
        const volunteerNotifRef = doc(collection(db, 'notifications'));
        batch.set(volunteerNotifRef, {
          userId: volunteerUserId,
          userRole: 'volunteer',
          type: 'delivery_accepted',
          title: 'Delivery Started',
          message: 'A delivery person has accepted the donation. It is now on the way.',
          relatedId: donationId,
          relatedType: 'food_donation',
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
    }

    // Commit batch
    await batch.commit();

    return {
      success: true,
      message: 'Delivery accepted successfully'
    };
  } catch (error) {
    console.error('Accept as delivery error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Mark donation as delivered
 */
export const markDelivered = async (donationId) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User not found');
    
    const userData = userDoc.data();
    const deliveryId = userData.profileId || user.uid;

    // Get donation
    const donationRef = doc(db, 'food_donations', donationId);
    const donationDoc = await getDoc(donationRef);
    
    if (!donationDoc.exists()) {
      throw new Error('Donation not found');
    }

    const donation = donationDoc.data();

    // Validate
    if (donation.deliveryPersonId !== deliveryId && donation.assigned_to !== user.uid) {
      throw new Error('This donation is not assigned to you');
    }

    if (donation.status !== 'ongoing' && donation.status !== 'assigned') {
      throw new Error(`Donation is not ongoing. Current status: ${donation.status}`);
    }

    // Use batch write
    const batch = writeBatch(db);

    // Update donation
    batch.update(donationRef, {
      status: 'delivered',
      deliveredAt: serverTimestamp(),
      deliveryCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Get delivery person name
    const deliveryDoc = await getDoc(doc(db, 'delivery_persons', deliveryId || user.uid));
    const deliveryName = deliveryDoc.exists() ? deliveryDoc.data().name : null;

    // Get donor info for history
    let donorUserId = null;
    let donorName = null;
    const donorDoc = await getDoc(doc(db, 'donors', donation.donorId));
    if (donorDoc.exists()) {
      const donorData = donorDoc.data();
      donorUserId = donorData.userId;
      donorName = donorData.name || null;
    }

    // Get volunteer info for history
    let volunteerUserId = null;
    let volunteerName = null;
    if (donation.volunteerId) {
      const volunteerDoc = await getDoc(doc(db, 'volunteers', donation.volunteerId));
      if (volunteerDoc.exists()) {
        const volunteerData = volunteerDoc.data();
        volunteerUserId = volunteerData.userId;
        volunteerName = volunteerData.name || null;
      }
    }

    // Create history entries for all 3 parties (donor, volunteer, delivery)
    // 1. History entry for DONOR
    if (donorUserId) {
      const donorHistoryRef = doc(collection(db, 'food_history'));
      batch.set(donorHistoryRef, {
        donationId: donationId,
        statusFrom: donation.status,
        statusTo: 'delivered',
        userId: donorUserId, // Add userId to track user-specific history
        userRole: 'donor',
        changedById: user.uid,
        changedByRole: 'delivery',
        changedByName: deliveryName,
        notes: 'Order delivered - added to donor history',
        createdAt: serverTimestamp()
      });
    }

    // 2. History entry for VOLUNTEER
    if (volunteerUserId) {
      const volunteerHistoryRef = doc(collection(db, 'food_history'));
      batch.set(volunteerHistoryRef, {
        donationId: donationId,
        statusFrom: donation.status,
        statusTo: 'delivered',
        userId: volunteerUserId, // Add userId to track user-specific history
        userRole: 'volunteer',
        changedById: user.uid,
        changedByRole: 'delivery',
        changedByName: deliveryName,
        notes: 'Order delivered - added to volunteer history',
        createdAt: serverTimestamp()
      });
    }

    // 3. History entry for DELIVERY PERSON
    const deliveryHistoryRef = doc(collection(db, 'food_history'));
    batch.set(deliveryHistoryRef, {
      donationId: donationId,
      statusFrom: donation.status,
      statusTo: 'delivered',
      userId: user.uid, // Add userId to track user-specific history
      userRole: 'delivery',
      changedById: user.uid,
      changedByRole: 'delivery',
      changedByName: deliveryName,
      notes: 'Order delivered - added to delivery history',
      createdAt: serverTimestamp()
    });

    // Create notifications for donor and volunteer
    // Get donor userId (already fetched above)
    if (donorUserId) {
      const donorNotifRef = doc(collection(db, 'notifications'));
      batch.set(donorNotifRef, {
        userId: donorUserId,
        userRole: 'donor',
        type: 'delivered',
        title: 'Delivery Completed',
        message: 'Your food donation has been successfully delivered!',
        relatedId: donationId,
        relatedType: 'food_donation',
        isRead: false,
        createdAt: serverTimestamp()
      });
    }

    // Get volunteer userId (already fetched above)
    if (volunteerUserId) {
      const volunteerNotifRef = doc(collection(db, 'notifications'));
      batch.set(volunteerNotifRef, {
        userId: volunteerUserId,
        userRole: 'volunteer',
        type: 'delivered',
        title: 'Delivery Completed',
        message: 'The food donation has been successfully delivered!',
        relatedId: donationId,
        relatedType: 'food_donation',
        isRead: false,
        createdAt: serverTimestamp()
      });
    }

    // Commit batch
    await batch.commit();

    return {
      success: true,
      message: 'Donation marked as delivered successfully'
    };
  } catch (error) {
    console.error('Mark delivered error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Get my donations (for donor)
 */
export const getMyDonations = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User not found');
    
    const userData = userDoc.data();
    const donorId = userData.profileId || user.uid;

    // Get donations - try by donorId first, then fallback to userId/email
    let q;
    try {
      q = query(
        collection(db, 'food_donations'),
        where('donorId', '==', donorId || user.uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      var querySnapshot = await getDocs(q);
    } catch (err) {
      // If index doesn't exist or query fails, try by userId or email
      console.warn('Query by donorId failed, trying alternative:', err);
      try {
        // Try by userId
        q = query(
          collection(db, 'food_donations'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        querySnapshot = await getDocs(q);
      } catch (err2) {
        // Last resort: query all and filter client-side
        console.warn('Query by userId failed, filtering client-side:', err2);
        q = query(
          collection(db, 'food_donations'),
          orderBy('createdAt', 'desc'),
          limit(200)
        );
        const allSnapshot = await getDocs(q);
        querySnapshot = {
          docs: allSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.donorId === (donorId || user.uid) || 
                   data.userId === user.uid || 
                   data.email === user.email;
          })
        };
      }
    }

    const donations = [];

    for (const docSnap of querySnapshot.docs) {
      const donation = { id: docSnap.id, ...docSnap.data() };
      
      // Get volunteer and delivery info
      if (donation.volunteerId) {
        try {
          const volunteerDoc = await getDoc(doc(db, 'volunteers', donation.volunteerId));
          if (volunteerDoc.exists()) {
            donation.volunteer = { id: volunteerDoc.id, ...volunteerDoc.data() };
          }
        } catch (err) {
          console.warn('Error loading volunteer:', err);
        }
      }

      if (donation.deliveryPersonId) {
        try {
          const deliveryDoc = await getDoc(doc(db, 'delivery_persons', donation.deliveryPersonId));
          if (deliveryDoc.exists()) {
            donation.deliveryPerson = { id: deliveryDoc.id, ...deliveryDoc.data() };
          }
        } catch (err) {
          console.warn('Error loading delivery person:', err);
        }
      }

      // Format date
      if (donation.date?.toDate) {
        donation.date = donation.date.toDate();
      } else if (donation.createdAt?.toDate) {
        donation.date = donation.createdAt.toDate();
      } else {
        donation.date = new Date();
      }

      donations.push(donation);
    }

    return {
      success: true,
      data: donations
    };
  } catch (error) {
    console.error('Get my donations error:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
};
