/**
 * Volunteer Dashboard - Modern Homepage with Feed
 * FeedHope Frontend - Volunteer/NGO Homepage Screen
 * Complete modern UI with donation approval, requests management, and feed
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaMapMarkerAlt, 
  FaSpinner, 
  FaEye, 
  FaClock, 
  FaHeart,
  FaSignOutAlt,
  FaUserCircle,
  FaExclamationTriangle,
  FaHandHoldingHeart,
  FaChartLine,
  FaUtensils,
  FaLocationArrow,
  FaCrosshairs,
  FaUser,
  FaBars,
  FaTimes,
  FaHome,
  FaGift,
  FaPhone
} from 'react-icons/fa';
import { logoutUser } from '../services/firebaseAuth';
import { getAvailableDonations, acceptAsVolunteer } from '../services/firebaseFood';
import OrderTrackingModal from '../components/OrderTrackingModal';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Delivery Location Marker Component
function DeliveryLocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          setPosition([marker.getLatLng().lat, marker.getLatLng().lng]);
        },
      }}
    >
      <Popup>Delivery Location</Popup>
    </Marker>
  );
}

const VolunteerDashboard = () => {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  
  // Data state
  const [userProfile, setUserProfile] = useState(null);
  const [allDonations, setAllDonations] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [availableDonations, setAvailableDonations] = useState([]); // Available food donations
  const [requests, setRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  
  // Modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [approvalAction, setApprovalAction] = useState(null); // 'approve' or 'reject'
  const [deliveryMapPosition, setDeliveryMapPosition] = useState([23.8103, 90.4125]); // Default: Dhaka
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [acceptedOrder, setAcceptedOrder] = useState(null);

  // Active tab state - default to 'feed' to show available donations
  const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'pending', 'all', 'requests'
  
  // Navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadUserProfile();
      loadDonations();
      loadAvailableDonations();
      loadRequests();
    }
  }, [user, loading]);

  const loadUserProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        navigate('/login');
        return;
      }

      const userData = userDoc.data();
      if (userData.role === 'volunteer') {
        const volunteerDoc = await getDoc(doc(db, 'volunteers', user.uid));
        if (volunteerDoc.exists()) {
          setUserProfile({ id: volunteerDoc.id, ...volunteerDoc.data(), email: user.email });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadAvailableDonations = async () => {
    try {
      // Load ALL food donations for feed (pending, available, ongoing, delivered - but not rejected)
      let q;
      try {
        q = query(
          collection(db, 'food_donations'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      } catch (err) {
        // Fallback if createdAt index doesn't exist
        q = query(
          collection(db, 'food_donations'),
          orderBy('date', 'desc'),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      const donations = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // Exclude rejected donations from feed
        if (data.status === 'rejected') return;

        let donationDate;
        if (data.date?.toDate) {
          donationDate = data.date.toDate();
        } else if (data.createdAt?.toDate) {
          donationDate = data.createdAt.toDate();
        } else {
          donationDate = new Date();
        }

        // Determine if this needs approval (pending without admin approval)
        const isPendingApproval = data.status === 'pending' && !data.admin_approved_by && !data.volunteerId;

        donations.push({
          id: docSnap.id,
          ...data,
          date: donationDate,
          isPendingApproval
        });
      });

      // Sort by date (newest first)
      donations.sort((a, b) => b.date - a.date);
      
      setAvailableDonations(donations);
    } catch (error) {
      console.error('Error loading feed donations:', error);
      setAvailableDonations([]);
    }
  };

  const loadDonations = async () => {
    setLoadingData(true);
    try {
      // Get pending donations (status = 'pending')
      let pendingQuery;
      try {
        pendingQuery = query(
          collection(db, 'food_donations'),
          where('status', '==', 'pending'),
          orderBy('date', 'desc'),
          limit(100)
        );
      } catch (err) {
        pendingQuery = query(
          collection(db, 'food_donations'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const pendingSnapshot = await getDocs(pendingQuery);
      const pending = [];
      pendingSnapshot.forEach((doc) => {
        const data = doc.data();
        let donationDate;
        if (data.date?.toDate) {
          donationDate = data.date.toDate();
        } else if (data.createdAt?.toDate) {
          donationDate = data.createdAt.toDate();
        } else {
          donationDate = new Date();
        }

        pending.push({
          id: doc.id,
          ...data,
          date: donationDate
        });
      });

      setPendingDonations(pending);

      // Get all donations (for stats) - without orderBy to avoid index issues
      const allQuery = query(
        collection(db, 'food_donations'),
        limit(200)
      );

      const allSnapshot = await getDocs(allQuery);
      const all = [];
      allSnapshot.forEach((doc) => {
        const data = doc.data();
        let donationDate;
        if (data.date?.toDate) {
          donationDate = data.date.toDate();
        } else if (data.createdAt?.toDate) {
          donationDate = data.createdAt.toDate();
        } else {
          donationDate = new Date();
        }

        all.push({
          id: doc.id,
          ...data,
          date: donationDate
        });
      });

      // Sort by date manually
      all.sort((a, b) => b.date - a.date);

      setAllDonations(all);
    } catch (error) {
      console.error('Error loading donations:', error);
      setPendingDonations([]);
      setAllDonations([]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      let q;
      try {
        q = query(
          collection(db, 'food_requests'),
          orderBy('date', 'desc'),
          limit(50)
        );
      } catch (err) {
        q = query(
          collection(db, 'food_requests'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }

      const querySnapshot = await getDocs(q);
      const requestsList = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'pending' || data.status === 'matched' || !data.status || data.status === 'active') {
          let requestDate;
          if (data.date?.toDate) {
            requestDate = data.date.toDate();
          } else if (data.createdAt?.toDate) {
            requestDate = data.createdAt.toDate();
          } else {
            requestDate = new Date();
          }

          const recipientCount = data.recipient_count || 0;
          const receivedCount = data.received_count || 0;
          const progress = recipientCount > 0 ? (receivedCount / recipientCount) * 100 : 0;

          requestsList.push({
            id: docSnap.id,
            ...data,
            date: requestDate,
            progress,
            remaining: Math.max(0, recipientCount - receivedCount)
          });
        }
      });

      requestsList.sort((a, b) => b.date - a.date);
      setRequests(requestsList);
    } catch (error) {
      console.error('Error loading requests:', error);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const updateDeliveryLocation = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.address) {
        const address = [
          data.address.road_number || data.address.road,
          data.address.suburb || data.address.neighbourhood || data.address.area,
          data.address.city || data.address.town || data.address.village,
          data.address.postcode
        ].filter(Boolean).join(', ') || data.display_name;
        
        setDeliveryAddress(address);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setDeliveryAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  useEffect(() => {
    if (deliveryMapPosition && deliveryMapPosition[0] && deliveryMapPosition[1]) {
      updateDeliveryLocation(deliveryMapPosition[0], deliveryMapPosition[1]);
    }
  }, [deliveryMapPosition]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setDeliveryMapPosition([lat, lng]);
        },
        (error) => {
          alert('Could not get your location. Please click on the map.');
        }
      );
    } else {
      alert('Geolocation not supported. Please click on the map.');
    }
  };

  const openApprovalModal = (donation, action) => {
    setSelectedDonation(donation);
    setApprovalAction(action);
    setShowApprovalModal(true);
    
    // Reset delivery location
    if (action === 'approve') {
      setDeliveryMapPosition([23.8103, 90.4125]);
      setDeliveryAddress('');
    }
  };

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setSelectedDonation(null);
    setApprovalAction(null);
  };

  const handleApprove = async () => {
    if (!selectedDonation) return;

    setUpdating(true);
    try {
      const donationRef = doc(db, 'food_donations', selectedDonation.id);
      
      // Update donation status to 'available' and set admin approval
      await updateDoc(donationRef, {
        status: 'available',
        admin_approved_by: user.uid,
        admin_approved_at: serverTimestamp(),
        delivery_latitude: deliveryMapPosition[0] || null,
        delivery_longitude: deliveryMapPosition[1] || null,
        delivery_address_full: deliveryAddress || null,
        updatedAt: serverTimestamp()
      });

      // Create notification for delivery persons
      await addDoc(collection(db, 'notifications'), {
        type: 'new_order',
        message: `New food order available: ${selectedDonation.food} - ${selectedDonation.location}`,
        donationId: selectedDonation.id,
        createdAt: serverTimestamp(),
        isRead: false
      });

      // Reload donations
      await loadDonations();
      await loadAvailableDonations();
      
      closeApprovalModal();
      alert('Order approved and available for delivery!');
    } catch (error) {
      console.error('Approve error:', error);
      alert('Failed to approve donation. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDonation) return;

    setUpdating(true);
    try {
      const donationRef = doc(db, 'food_donations', selectedDonation.id);
      
      await updateDoc(donationRef, {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });

      // Reload donations
      await loadDonations();
      
      closeApprovalModal();
      alert('Donation rejected.');
    } catch (error) {
      console.error('Reject error:', error);
      alert('Failed to reject donation. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const openAcceptModal = (donation) => {
    setSelectedDonation(donation);
    setShowAcceptModal(true);
    
    // Reset delivery location
    setDeliveryMapPosition([23.8103, 90.4125]);
    setDeliveryAddress('');
  };

  const closeAcceptModal = () => {
    setShowAcceptModal(false);
    setSelectedDonation(null);
  };

  const handleAcceptAsVolunteer = async () => {
    if (!selectedDonation) return;

    setUpdating(true);
    try {
      const deliveryData = {
        deliveryAddress: deliveryAddress,
        deliveryLatitude: deliveryMapPosition[0] || null,
        deliveryLongitude: deliveryMapPosition[1] || null,
        deliveryAddressFull: deliveryAddress || null,
        deliveryDivision: userProfile?.division || null,
        deliveryDistrict: userProfile?.district || null,
        deliveryArea: userProfile?.area || null
      };

      const result = await acceptAsVolunteer(selectedDonation.id, deliveryData);

      if (result.success) {
        // Reload donations to get updated data
        await loadDonations();
        await loadAvailableDonations();
        
        // Get the updated donation with all details
        const donationRef = doc(db, 'food_donations', selectedDonation.id);
        const updatedDoc = await getDoc(donationRef);
        
        if (updatedDoc.exists()) {
          const updatedDonation = {
            id: updatedDoc.id,
            ...updatedDoc.data(),
            date: updatedDoc.data().date?.toDate?.() || updatedDoc.data().createdAt?.toDate?.() || new Date()
          };
          
          // Set accepted order and show details modal
          setAcceptedOrder(updatedDonation);
          setShowOrderDetailsModal(true);
          closeAcceptModal();
        } else {
          closeAcceptModal();
          alert('✅ Donation accepted! Delivery person will be notified.');
        }
      } else {
        alert(result.message || 'Failed to accept donation. Please try again.');
      }
    } catch (error) {
      console.error('Accept error:', error);
      alert('Failed to accept donation. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const getStatusBadge = (donation) => {
    // Handle both object and string status
    const donationObj = typeof donation === 'object' ? donation : { status: donation };
    const status = donationObj.status;
    
    // Determine badge based on status and context
    let badgeText = '';
    let badgeBg = '';
    let badgeColor = '';
    
    if (status === 'pending') {
      // If volunteerId is set, volunteer has accepted - waiting for delivery
      if (donationObj.volunteerId) {
        badgeText = 'Find a Rider';
        badgeBg = '#fef3c7';
        badgeColor = '#92400e';
      } else if (!donationObj.admin_approved_by) {
        // Pending approval from volunteer
        badgeText = 'Pending Approval';
        badgeBg = '#fef3c7';
        badgeColor = '#92400e';
      } else {
        badgeText = 'Pending';
        badgeBg = '#fef3c7';
        badgeColor = '#92400e';
      }
    } else if (status === 'available') {
      badgeText = 'Available';
      badgeBg = '#dbeafe';
      badgeColor = '#1e40af';
    } else if (status === 'ongoing') {
      badgeText = 'On-going';
      badgeBg = '#e0e7ff';
      badgeColor = '#4338ca';
    } else if (status === 'delivered') {
      badgeText = 'Delivered';
      badgeBg = '#d1fae5';
      badgeColor = '#065f46';
    } else if (status === 'rejected') {
      badgeText = 'Rejected';
      badgeBg = '#fee2e2';
      badgeColor = '#991b1b';
    } else {
      badgeText = 'Pending';
      badgeBg = '#fef3c7';
      badgeColor = '#92400e';
    }

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        background: badgeBg,
        color: badgeColor
      }}>
        {badgeText}
      </span>
    );
  };

  // Calculate stats
  const stats = {
    total: allDonations.length,
    pending: pendingDonations.length,
    available: allDonations.filter(d => d.status === 'available').length,
    assigned: allDonations.filter(d => d.status === 'assigned' || d.status === 'ongoing').length,
    delivered: allDonations.filter(d => d.status === 'delivered').length,
    rejected: allDonations.filter(d => d.status === 'rejected').length,
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
      paddingBottom: '40px'
    },
    topBar: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: 'white',
      padding: '12px 30px',
      boxShadow: '0 2px 10px rgba(245, 158, 11, 0.2)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    topBarContent: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '20px'
    },
    logo: {
      fontSize: '24px',
      fontWeight: 800,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer'
    },
    navBar: {
      background: 'white',
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      position: 'sticky',
      top: '56px',
      zIndex: 99,
      borderBottom: '1px solid #e5e7eb',
      marginBottom: '30px'
    },
    navContent: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '0 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    navLinks: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    navLink: {
      padding: '14px 20px',
      color: '#6b7280',
      textDecoration: 'none',
      fontWeight: 600,
      fontSize: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      borderRadius: '8px',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      border: 'none',
      background: 'transparent',
      position: 'relative',
      whiteSpace: 'nowrap'
    },
    navLinkActive: {
      color: '#f59e0b',
      background: '#fffbeb'
    },
    navLinkHover: {
      color: '#f59e0b',
      background: '#fffbeb'
    },
    mobileMenuButton: {
      display: 'none',
      background: 'transparent',
      border: 'none',
      color: 'white',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '8px'
    },
    mobileMenu: {
      display: 'none',
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      background: 'white',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      flexDirection: 'column',
      padding: '20px',
      gap: '8px'
    },
    header: {
      background: 'transparent',
      color: 'white',
      padding: '0',
      boxShadow: 'none',
      marginBottom: '0'
    },
    headerContent: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '20px'
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    },
    avatar: {
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      border: '2px solid rgba(255,255,255,0.3)'
    },
    userDetails: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    userName: {
      fontSize: '20px',
      fontWeight: 700,
      color: 'white'
    },
    userEmail: {
      fontSize: '14px',
      color: 'rgba(255,255,255,0.9)',
      opacity: 0.9
    },
    headerActions: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    btn: {
      padding: '10px 20px',
      borderRadius: '12px',
      border: 'none',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s',
      fontSize: '15px'
    },
    btnPrimary: {
      background: 'rgba(255,255,255,0.2)',
      color: 'white',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.3)'
    },
    btnDanger: {
      background: 'rgba(239, 68, 68, 0.9)',
      color: 'white'
    },
    content: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px'
    },
    welcomeCard: {
      background: 'white',
      borderRadius: '20px',
      padding: '30px',
      marginBottom: '30px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      border: '1px solid rgba(245, 158, 11, 0.1)'
    },
    welcomeTitle: {
      fontSize: '32px',
      fontWeight: 800,
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      marginBottom: '10px'
    },
    welcomeSubtitle: {
      fontSize: '18px',
      color: '#6b7280',
      marginBottom: '30px'
    },
    quickActions: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    actionCard: {
      background: 'linear-gradient(135deg, #f59e0b, #f97316)',
      borderRadius: '16px',
      padding: '25px',
      color: 'white',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      textAlign: 'center'
    },
    actionIcon: {
      fontSize: '36px',
      opacity: 0.9
    },
    actionTitle: {
      fontSize: '18px',
      fontWeight: 700
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    statCard: {
      background: 'white',
      borderRadius: '16px',
      padding: '25px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
      borderLeft: '4px solid #f59e0b',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    statValue: {
      fontSize: '36px',
      fontWeight: 800,
      color: '#f59e0b'
    },
    statLabel: {
      fontSize: '14px',
      color: '#6b7280',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    feedSection: {
      background: 'white',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      marginBottom: '30px'
    },
    sectionTitle: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#111827',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    tabs: {
      display: 'flex',
      gap: '12px',
      marginBottom: '25px',
      borderBottom: '2px solid #e5e7eb',
      paddingBottom: '12px',
      flexWrap: 'wrap'
    },
    tab: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      background: 'transparent',
      color: '#6b7280',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s',
      fontSize: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    tabActive: {
      color: '#f59e0b',
      background: '#fffbeb',
      borderBottom: '2px solid #f59e0b'
    },
    donationsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '24px'
    },
    donationCard: {
      background: 'linear-gradient(135deg, #fff7ed, #ffffff)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
      borderLeft: '4px solid #f59e0b',
      transition: 'all 0.3s',
      cursor: 'pointer'
    },
    donationCardHover: {
      transform: 'translateY(-8px)',
      boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
    },
    donationHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '16px'
    },
    donationTitle: {
      fontSize: '20px',
      fontWeight: 700,
      color: '#111827',
      marginBottom: '8px'
    },
    donationMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      marginBottom: '16px',
      fontSize: '14px',
      color: '#6b7280'
    },
    donationMetaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    donationImage: {
      width: '100%',
      height: '200px',
      objectFit: 'cover',
      borderRadius: '12px',
      marginBottom: '16px',
      background: 'linear-gradient(135deg, #fff7ed, #fed7aa)'
    },
    actionButtons: {
      display: 'flex',
      gap: '12px',
      marginTop: '16px'
    },
    btnApprove: {
      flex: 1,
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '15px',
      transition: 'all 0.3s',
      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
    },
    btnReject: {
      flex: 1,
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '15px',
      transition: 'all 0.3s',
      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      background: 'white',
      borderRadius: '20px',
      maxWidth: '900px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      padding: '30px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    modalTitle: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#111827'
    },
    mapContainer: {
      height: '400px',
      width: '100%',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '16px',
      border: '2px solid #e5e7eb'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#6b7280'
    },
    emptyIcon: {
      fontSize: '64px',
      color: '#d1d5db',
      marginBottom: '20px'
    },
    emptyTitle: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#374151',
      marginBottom: '12px'
    },
    emptyText: {
      fontSize: '16px',
      color: '#6b7280',
      marginBottom: '24px'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      gap: '20px'
    }
  };

  if (loading || loadingData) {
    return (
      <div style={styles.loading}>
        <FaSpinner className="spinner" style={{ fontSize: '48px', color: '#f59e0b' }} />
        <p style={{ fontSize: '18px', color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarContent}>
          <div 
            style={styles.logo}
            onClick={() => setActiveTab('feed')}
          >
            <FaHeart /> FeedHope
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={styles.avatar}>
                {userProfile?.avatar ? (
                  <img 
                    src={userProfile.avatar} 
                    alt="Avatar" 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <FaUserCircle />
                )}
              </div>
              <div style={styles.userDetails}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>
                  {userProfile?.name || user?.displayName || 'Volunteer'}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>
                  {user?.email || ''}
                </div>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={styles.mobileMenuButton}
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
            <div style={styles.headerActions}>
              <button
                onClick={handleLogout}
                style={{ ...styles.btn, ...styles.btnDanger }}
              >
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div style={styles.navBar}>
        <div style={styles.navContent}>
          <div style={styles.navLinks}>
            <button
              onClick={() => { setActiveTab('feed'); setMobileMenuOpen(false); }}
              style={{
                ...styles.navLink,
                ...(activeTab === 'feed' ? styles.navLinkActive : {})
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'feed') {
                  Object.assign(e.currentTarget.style, {
                    color: styles.navLinkHover.color,
                    background: styles.navLinkHover.background
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'feed') {
                  Object.assign(e.currentTarget.style, {
                    color: styles.navLink.color,
                    background: styles.navLink.background
                  });
                }
              }}
            >
              <FaHome /> Dashboard
            </button>
            <button
              onClick={() => { navigate('/volunteer/create-request'); setMobileMenuOpen(false); }}
              style={styles.navLink}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, {
                  color: styles.navLinkHover.color,
                  background: styles.navLinkHover.background
                });
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, {
                  color: styles.navLink.color,
                  background: styles.navLink.background
                });
              }}
            >
              <FaHandHoldingHeart /> Food Request
            </button>
            <button
              onClick={() => { setActiveTab('all'); setMobileMenuOpen(false); }}
              style={{
                ...styles.navLink,
                ...(activeTab === 'all' ? styles.navLinkActive : {})
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'all') {
                  Object.assign(e.currentTarget.style, {
                    color: styles.navLinkHover.color,
                    background: styles.navLinkHover.background
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'all') {
                  Object.assign(e.currentTarget.style, {
                    color: styles.navLink.color,
                    background: styles.navLink.background
                  });
                }
              }}
            >
              <FaGift /> Donations
            </button>
            <button
              onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}
              style={styles.navLink}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, {
                  color: styles.navLinkHover.color,
                  background: styles.navLinkHover.background
                });
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, {
                  color: styles.navLink.color,
                  background: styles.navLink.background
                });
              }}
            >
              <FaUserCircle /> Profile
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{ ...styles.mobileMenu, display: 'flex' }}>
            <button
              onClick={() => { setActiveTab('feed'); setMobileMenuOpen(false); }}
              style={{
                ...styles.navLink,
                ...(activeTab === 'feed' ? styles.navLinkActive : {}),
                width: '100%',
                justifyContent: 'flex-start'
              }}
            >
              <FaHome /> Dashboard
            </button>
            <button
              onClick={() => { navigate('/volunteer/create-request'); setMobileMenuOpen(false); }}
              style={{ ...styles.navLink, width: '100%', justifyContent: 'flex-start' }}
            >
              <FaHandHoldingHeart /> Food Request
            </button>
            <button
              onClick={() => { setActiveTab('all'); setMobileMenuOpen(false); }}
              style={{
                ...styles.navLink,
                ...(activeTab === 'all' ? styles.navLinkActive : {}),
                width: '100%',
                justifyContent: 'flex-start'
              }}
            >
              <FaGift /> Donations
            </button>
            <button
              onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}
              style={{ ...styles.navLink, width: '100%', justifyContent: 'flex-start' }}
            >
              <FaUserCircle /> Profile
            </button>
          </div>
        )}
      </div>

      <div style={styles.content}>
        {/* Welcome Card */}
        <div style={styles.welcomeCard}>
          <h1 style={styles.welcomeTitle}>
            Welcome back, {userProfile?.name || 'Volunteer'}! 🙏
          </h1>
          <p style={styles.welcomeSubtitle}>
            Manage food donations and help connect food with those in need.
          </p>

          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <div
              style={styles.actionCard}
              onClick={() => navigate('/volunteer/create-request')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(245, 158, 11, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.3)';
              }}
            >
              <FaHandHoldingHeart style={styles.actionIcon} />
              <div style={styles.actionTitle}>Request Food</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Create a food request
              </div>
            </div>
            <div
              style={styles.actionCard}
              onClick={() => setActiveTab('pending')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(245, 158, 11, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.3)';
              }}
            >
              <FaCheckCircle style={styles.actionIcon} />
              <div style={styles.actionTitle}>Review Donations</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {stats.pending} pending approvals
              </div>
            </div>
            <div
              style={styles.actionCard}
              onClick={() => navigate('/volunteer/create-request')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(245, 158, 11, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.3)';
              }}
            >
              <FaHandHoldingHeart style={styles.actionIcon} />
              <div style={styles.actionTitle}>Request Food</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Create a food request for your organization
              </div>
            </div>
            <div
              style={styles.actionCard}
              onClick={() => navigate('/newsfeed')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(245, 158, 11, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.3)';
              }}
            >
              <FaUtensils style={styles.actionIcon} />
              <div style={styles.actionTitle}>View Feed</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Browse all donations & requests
              </div>
            </div>
            <div
              style={styles.actionCard}
              onClick={() => navigate('/profile')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(245, 158, 11, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.3)';
              }}
            >
              <FaChartLine style={styles.actionIcon} />
              <div style={styles.actionTitle}>Analytics</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                View statistics & reports
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.pending}</div>
              <div style={styles.statLabel}>Pending Approval</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.available}</div>
              <div style={styles.statLabel}>Available</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#8b5cf6' }}>{stats.assigned}</div>
              <div style={styles.statLabel}>In Progress</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.delivered}</div>
              <div style={styles.statLabel}>Delivered</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#ef4444' }}>{stats.rejected}</div>
              <div style={styles.statLabel}>Rejected</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#6b7280' }}>{stats.total}</div>
              <div style={styles.statLabel}>Total Donations</div>
            </div>
          </div>
        </div>

        {/* Feed Section */}
        <div style={styles.feedSection}>
          <h2 style={styles.sectionTitle}>
            <FaHeart style={{ color: '#f59e0b' }} />
            Donation Management
          </h2>

          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              style={{
                ...styles.tab,
                ...(activeTab === 'feed' ? styles.tabActive : {})
              }}
            >
              <FaUtensils /> Available Food ({availableDonations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                ...styles.tab,
                ...(activeTab === 'pending' ? styles.tabActive : {})
              }}
            >
              <FaExclamationTriangle /> Pending Approval ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                ...styles.tab,
                ...(activeTab === 'all' ? styles.tabActive : {})
              }}
            >
              <FaUtensils /> All Donations ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              style={{
                ...styles.tab,
                ...(activeTab === 'requests' ? styles.tabActive : {})
              }}
            >
              <FaHandHoldingHeart /> Food Requests ({requests.length})
            </button>
          </div>

          {/* Feed Tab - Available Food */}
          {activeTab === 'feed' && (
            <div>
              {availableDonations.length === 0 ? (
                <div style={styles.emptyState}>
                  <FaUtensils style={styles.emptyIcon} />
                  <h3 style={styles.emptyTitle}>No available food donations</h3>
                  <p style={styles.emptyText}>
                    Available food donations will appear here. Donors need to submit donations and they need to be approved first.
                  </p>
                </div>
              ) : (
                <div style={styles.donationsGrid}>
                  {availableDonations.map((donation) => (
                    <div
                      key={donation.id}
                      style={styles.donationCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                      }}
                    >
                      {donation.food_image && (
                        <img
                          src={donation.food_image}
                          alt={donation.food || donation.foodName}
                          style={styles.donationImage}
                        />
                      )}
                      {!donation.food_image && (
                        <div style={{
                          ...styles.donationImage,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#f59e0b',
                          fontSize: '48px'
                        }}>
                          <FaUtensils />
                        </div>
                      )}

                      <div style={styles.donationHeader}>
                        <h3 style={styles.donationTitle}>{donation.food || donation.foodName}</h3>
                        {getStatusBadge(donation)}
                      </div>

                      <div style={styles.donationMeta}>
                        <div 
                          style={{ ...styles.donationMetaItem, cursor: 'pointer' }}
                          onClick={() => {
                            const donorId = donation.donorId || donation.userId;
                            if (donorId) {
                              navigate(`/profile/${donorId}?role=donor`);
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#f59e0b';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#6b7280';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          <FaUser style={{ color: '#f59e0b' }} />
                          <strong>Donor:</strong> <span style={{ color: '#f59e0b', fontWeight: 600 }}>{donation.name || 'Anonymous'}</span>
                        </div>
                        <div style={styles.donationMetaItem}>
                          <FaMapMarkerAlt style={{ color: '#f59e0b' }} />
                          {donation.location || donation.area || 'Location'}
                        </div>
                        <div style={styles.donationMetaItem}>
                          <FaClock style={{ color: '#6b7280' }} />
                          {format(donation.date, 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Type:</strong> {donation.type || donation.foodType} | <strong>Category:</strong> {donation.category}
                      </div>
                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Quantity:</strong> {donation.quantity}
                      </div>

                      {/* Order Details Card - Simple & Clickable - Show if volunteer has accepted */}
                      {donation.volunteerId === user?.uid && (
                        <div
                          onClick={() => {
                            setAcceptedOrder(donation);
                            setShowOrderDetailsModal(true);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '12px',
                            border: '2px solid #10b981',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            textAlign: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
                            e.currentTarget.style.borderColor = '#06C167';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = '#10b981';
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#065f46',
                            fontSize: '16px',
                            fontWeight: 700
                          }}>
                            <FaCheckCircle style={{ color: '#10b981', fontSize: '18px' }} />
                            Order Details
                          </div>
                          <div style={{
                            marginTop: '8px',
                            color: '#059669',
                            fontSize: '13px',
                            fontWeight: 600
                          }}>
                            👆 Click to view details
                          </div>
                        </div>
                      )}

                      <div style={styles.actionButtons}>
                        {donation.isPendingApproval ? (
                          <>
                            <button
                              onClick={() => openApprovalModal(donation, 'approve')}
                              style={styles.btnApprove}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
                              }}
                            >
                              <FaCheckCircle /> Approve
                            </button>
                            <button
                              onClick={() => openApprovalModal(donation, 'reject')}
                              style={styles.btnReject}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
                              }}
                            >
                              <FaTimesCircle /> Reject
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Only show Accept button if not already accepted by this volunteer */}
                            {donation.volunteerId !== user?.uid && donation.status === 'available' && !donation.volunteerId && (
                              <button
                                onClick={() => openAcceptModal(donation)}
                                style={styles.btnApprove}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
                                }}
                              >
                                <FaCheckCircle /> Accept & Set Delivery Location
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <div>
              {pendingDonations.length === 0 ? (
                <div style={styles.emptyState}>
                  <FaCheckCircle style={styles.emptyIcon} />
                  <h3 style={styles.emptyTitle}>No pending donations</h3>
                  <p style={styles.emptyText}>
                    All donations have been reviewed. Great work! 🎉
                  </p>
                </div>
              ) : (
                <div style={styles.donationsGrid}>
                  {pendingDonations.map((donation) => (
                    <div
                      key={donation.id}
                      style={styles.donationCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                      }}
                    >
                      {donation.food_image && (
                        <img
                          src={donation.food_image}
                          alt={donation.food || donation.foodName}
                          style={styles.donationImage}
                        />
                      )}
                      {!donation.food_image && (
                        <div style={{
                          ...styles.donationImage,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#f59e0b',
                          fontSize: '48px'
                        }}>
                          <FaUtensils />
                        </div>
                      )}

                      <div style={styles.donationHeader}>
                        <h3 style={styles.donationTitle}>{donation.food || donation.foodName}</h3>
                        {getStatusBadge(donation)}
                      </div>

                      <div style={styles.donationMeta}>
                        <div 
                          style={{ ...styles.donationMetaItem, cursor: 'pointer' }}
                          onClick={() => {
                            const donorId = donation.donorId || donation.userId;
                            if (donorId) {
                              navigate(`/profile/${donorId}?role=donor`);
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#f59e0b';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#6b7280';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          <FaUser style={{ color: '#f59e0b' }} />
                          <strong>Donor:</strong> <span style={{ color: '#f59e0b', fontWeight: 600 }}>{donation.name || 'Anonymous'}</span>
                        </div>
                        <div style={styles.donationMetaItem}>
                          <FaMapMarkerAlt style={{ color: '#f59e0b' }} />
                          {donation.location || donation.area || 'Location'}
                        </div>
                        <div style={styles.donationMetaItem}>
                          <FaClock style={{ color: '#6b7280' }} />
                          {format(donation.date, 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Type:</strong> {donation.type || donation.foodType} | <strong>Category:</strong> {donation.category}
                      </div>
                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Quantity:</strong> {donation.quantity}
                      </div>

                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => openApprovalModal(donation, 'approve')}
                          style={styles.btnApprove}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
                          }}
                        >
                          <FaCheckCircle /> Approve
                        </button>
                        <button
                          onClick={() => openApprovalModal(donation, 'reject')}
                          style={styles.btnReject}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
                          }}
                        >
                          <FaTimesCircle /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All Donations Tab */}
          {activeTab === 'all' && (
            <div>
              {allDonations.length === 0 ? (
                <div style={styles.emptyState}>
                  <FaUtensils style={styles.emptyIcon} />
                  <h3 style={styles.emptyTitle}>No donations yet</h3>
                  <p style={styles.emptyText}>
                    Donations will appear here once donors start contributing.
                  </p>
                </div>
              ) : (
                <div style={styles.donationsGrid}>
                  {allDonations.map((donation) => (
                    <div
                      key={donation.id}
                      style={styles.donationCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                      }}
                    >
                      {donation.food_image && (
                        <img
                          src={donation.food_image}
                          alt={donation.food || donation.foodName}
                          style={styles.donationImage}
                        />
                      )}
                      {!donation.food_image && (
                        <div style={{
                          ...styles.donationImage,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#f59e0b',
                          fontSize: '48px'
                        }}>
                          <FaUtensils />
                        </div>
                      )}

                      <div style={styles.donationHeader}>
                        <h3 style={styles.donationTitle}>{donation.food || donation.foodName}</h3>
                        {getStatusBadge(donation)}
                      </div>

                      <div style={styles.donationMeta}>
                        <div 
                          style={{ ...styles.donationMetaItem, cursor: 'pointer' }}
                          onClick={() => {
                            const donorId = donation.donorId || donation.userId;
                            if (donorId) {
                              navigate(`/profile/${donorId}?role=donor`);
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#f59e0b';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#6b7280';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          <FaUser style={{ color: '#f59e0b' }} />
                          <strong>Donor:</strong> <span style={{ color: '#f59e0b', fontWeight: 600 }}>{donation.name || 'Anonymous'}</span>
                        </div>
                        <div style={styles.donationMetaItem}>
                          <FaMapMarkerAlt style={{ color: '#f59e0b' }} />
                          {donation.location || donation.area || 'Location'}
                        </div>
                        <div style={styles.donationMetaItem}>
                          <FaClock style={{ color: '#6b7280' }} />
                          {format(donation.date, 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Type:</strong> {donation.type || donation.foodType} | <strong>Category:</strong> {donation.category}
                      </div>
                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Quantity:</strong> {donation.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div>
              {loadingRequests ? (
                <div style={styles.loading}>
                  <FaSpinner className="spinner" style={{ fontSize: '32px', color: '#f59e0b' }} />
                  <p>Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div style={styles.emptyState}>
                  <FaHandHoldingHeart style={styles.emptyIcon} />
                  <h3 style={styles.emptyTitle}>No requests yet</h3>
                  <p style={styles.emptyText}>
                    Food requests will appear here once volunteers post them.
                  </p>
                </div>
              ) : (
                <div style={styles.donationsGrid}>
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      style={styles.donationCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                      }}
                    >
                      <div style={styles.donationHeader}>
                        <h3 style={styles.donationTitle}>{request.food_type || request.foodType || 'Food Request'}</h3>
                        {getStatusBadge(request.status)}
                      </div>

                      {request.organization_name && (
                        <div style={{ marginBottom: '12px', fontSize: '15px', color: '#374151' }}>
                          <strong>Organization:</strong> {request.organization_name}
                        </div>
                      )}

                      <div style={styles.donationMeta}>
                        <div style={styles.donationMetaItem}>
                          <FaMapMarkerAlt style={{ color: '#f59e0b' }} />
                          {request.location || request.area || 'Location'}
                        </div>
                        <div style={styles.donationMetaItem}>
                          <FaClock style={{ color: '#6b7280' }} />
                          {format(request.date, 'MMM dd, yyyy')}
                        </div>
                        {request.urgency && (
                          <div style={styles.donationMetaItem}>
                            <strong>Urgency:</strong> {request.urgency}
                          </div>
                        )}
                      </div>

                      {request.purpose && (
                        <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
                          {request.purpose}
                        </p>
                      )}

                      {request.recipient_count > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{
                            width: '100%',
                            height: '12px',
                            borderRadius: '999px',
                            background: '#f3f4f6',
                            overflow: 'hidden',
                            marginBottom: '8px'
                          }}>
                            <div
                              style={{
                                height: '100%',
                                borderRadius: '999px',
                                background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                                width: `${Math.min(request.progress, 100)}%`,
                                transition: 'width 0.3s'
                              }}
                            />
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: '#6b7280',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>
                              <strong>{request.received_count || 0}</strong> / {request.recipient_count} people served
                            </span>
                            <span>{Math.round(request.progress)}%</span>
                          </div>
                          {request.remaining > 0 && (
                            <p style={{ fontSize: '13px', color: '#f59e0b', marginTop: '8px', fontWeight: 600 }}>
                              Still need: {request.remaining} people
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Accept as Volunteer Modal */}
      {showAcceptModal && selectedDonation && (
        <div style={styles.modal} onClick={closeAcceptModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Accept Donation & Set Delivery Location</h2>
              <button
                onClick={closeAcceptModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {/* Order Details Card */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb'
            }}>
              {/* Phone and Date */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#06C167' }}>
                  <FaPhone style={{ fontSize: '16px' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    {selectedDonation.phoneno || selectedDonation.phone || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                  <FaClock style={{ fontSize: '14px' }} />
                  <span style={{ fontSize: '14px' }}>
                    {format(selectedDonation.date || selectedDonation.createdAt?.toDate?.() || new Date(), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              </div>

              {/* Order Details */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  <strong>Type:</strong> {selectedDonation.type || selectedDonation.foodType || 'N/A'} | <strong>Category:</strong> {selectedDonation.category || 'N/A'}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  <strong>Quantity:</strong> {selectedDonation.quantity} {selectedDonation.quantity_unit || 'servings'}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => {
                    setTrackingOrder(selectedDonation);
                    setShowTrackingModal(true);
                  }}
                  disabled={!selectedDonation.pickup_latitude || !selectedDonation.pickup_longitude}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: (!selectedDonation.pickup_latitude || !selectedDonation.pickup_longitude) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: (!selectedDonation.pickup_latitude || !selectedDonation.pickup_longitude) ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDonation.pickup_latitude && selectedDonation.pickup_longitude) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <FaMapMarkerAlt /> View Route on Map
                </button>
              </div>
            </div>

            {/* FROM/TO Addresses */}
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              border: '2px solid #d1fae5'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  fontWeight: 600
                }}>
                  FROM
                </div>
                <div style={{
                  fontSize: '15px',
                  color: '#111827',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FaMapMarkerAlt style={{ color: '#10b981', fontSize: '18px' }} />
                  {selectedDonation.pickup_address_full || selectedDonation.address || selectedDonation.location || selectedDonation.area || 'Pickup Location'}
                </div>
              </div>

              <div style={{
                height: '1px',
                background: '#d1fae5',
                margin: '16px 0'
              }} />

              <div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  fontWeight: 600
                }}>
                  TO
                </div>
                <div style={{
                  fontSize: '15px',
                  color: '#111827',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  minHeight: '48px'
                }}>
                  {deliveryAddress ? (
                    <>
                      <FaMapMarkerAlt style={{ color: '#ef4444', fontSize: '18px' }} />
                      {deliveryAddress}
                    </>
                  ) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                      Click on map to set delivery location
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div style={{
              background: 'linear-gradient(135deg, #06C167, #059669)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(6, 193, 103, 0.3)'
            }}>
              {selectedDonation.food_image ? (
                <img
                  src={selectedDonation.food_image}
                  alt={selectedDonation.food || selectedDonation.foodName}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    background: 'white'
                  }}
                />
              ) : (
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  color: 'white'
                }}>
                  <FaUtensils />
                </div>
              )}
              <div style={{ flex: 1, color: 'white' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                  {selectedDonation.food || selectedDonation.foodName}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
                  {selectedDonation.type || selectedDonation.foodType || 'N/A'} • {selectedDonation.quantity} {selectedDonation.quantity_unit || 'servings'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  {selectedDonation.category || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                Set Delivery Location (click on map or drag marker)
              </label>
              <button
                onClick={getCurrentLocation}
                style={{
                  marginBottom: '12px',
                  padding: '8px 16px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
              >
                <FaCrosshairs /> Use My Location
              </button>
              <div style={styles.mapContainer}>
                <MapContainer
                  center={deliveryMapPosition}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© OpenStreetMap contributors'
                  />
                  <DeliveryLocationMarker
                    position={deliveryMapPosition}
                    setPosition={setDeliveryMapPosition}
                  />
                </MapContainer>
              </div>
              {deliveryAddress && (
                <p style={{ marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>
                  <strong>Delivery Address:</strong> {deliveryAddress}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeAcceptModal}
                disabled={updating}
                style={{
                  padding: '12px 24px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptAsVolunteer}
                disabled={updating || !deliveryAddress}
                style={{
                  padding: '12px 24px',
                  background: updating || !deliveryAddress ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: updating || !deliveryAddress ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '15px',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}
              >
                {updating ? (
                  <>
                    <FaSpinner className="spinner" /> Processing...
                  </>
                ) : (
                  <>
                    <FaCheckCircle /> Accept & Notify Delivery
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedDonation && (
        <div style={styles.modal} onClick={closeApprovalModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {approvalAction === 'approve' ? 'Approve Donation' : 'Reject Donation'}
              </h2>
              <button
                onClick={closeApprovalModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                {selectedDonation.food || selectedDonation.foodName}
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                <strong>Donor:</strong> {selectedDonation.name || 'Anonymous'}
              </p>
              <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                <strong>Location:</strong> {selectedDonation.location || selectedDonation.area || 'N/A'}
              </p>
              <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                <strong>Quantity:</strong> {selectedDonation.quantity}
              </p>
            </div>

            {approvalAction === 'approve' && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                    Set Delivery Location (click on map or drag marker)
                  </label>
                  <button
                    onClick={getCurrentLocation}
                    style={{
                      marginBottom: '12px',
                      padding: '8px 16px',
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <FaCrosshairs /> Use My Location
                  </button>
                  <div style={styles.mapContainer}>
                    <MapContainer
                      center={deliveryMapPosition}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='© OpenStreetMap contributors'
                      />
                      <DeliveryLocationMarker
                        position={deliveryMapPosition}
                        setPosition={setDeliveryMapPosition}
                      />
                    </MapContainer>
                  </div>
                  {deliveryAddress && (
                    <p style={{ marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>
                      <strong>Address:</strong> {deliveryAddress}
                    </p>
                  )}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeApprovalModal}
                disabled={updating}
                style={{
                  padding: '12px 24px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                Cancel
              </button>
              {approvalAction === 'approve' ? (
                <button
                  onClick={handleApprove}
                  disabled={updating || !deliveryAddress}
                  style={{
                    padding: '12px 24px',
                    background: updating || !deliveryAddress ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: updating || !deliveryAddress ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '15px',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {updating ? (
                    <>
                      <FaSpinner className="spinner" /> Processing...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> Approve & Set Location
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleReject}
                  disabled={updating}
                  style={{
                    padding: '12px 24px',
                    background: updating ? '#9ca3af' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: updating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '15px',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  {updating ? (
                    <>
                      <FaSpinner className="spinner" /> Processing...
                    </>
                  ) : (
                    <>
                      <FaTimesCircle /> Reject Donation
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Tracking Modal */}
      {showTrackingModal && trackingOrder && (
        <OrderTrackingModal
          order={trackingOrder}
          onClose={() => {
            setShowTrackingModal(false);
            setTrackingOrder(null);
          }}
        />
      )}

      {/* Order Details Modal - Shown after accepting */}
      {showOrderDetailsModal && acceptedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => {
          setShowOrderDetailsModal(false);
          setAcceptedOrder(null);
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 70px rgba(0,0,0,0.4)',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '20px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  color: '#111827',
                  fontSize: '24px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #06C167, #059669)',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}>
                    <FaCheckCircle style={{ color: 'white', fontSize: '20px' }} />
                  </span>
                  Order Details
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowOrderDetailsModal(false);
                  setAcceptedOrder(null);
                }}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '10px',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: '20px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.transform = 'rotate(90deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.transform = 'rotate(0deg)';
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Phone and Date */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#06C167' }}>
                <FaPhone style={{ fontSize: '16px' }} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                  {acceptedOrder.phoneno || acceptedOrder.phone || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                <FaClock style={{ fontSize: '14px' }} />
                <span style={{ fontSize: '14px' }}>
                  {format(acceptedOrder.date || acceptedOrder.createdAt?.toDate?.() || new Date(), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            </div>

            {/* Order Details */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                <strong>Type:</strong> {acceptedOrder.type || acceptedOrder.foodType || 'N/A'} | <strong>Category:</strong> {acceptedOrder.category || 'N/A'}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                <strong>Quantity:</strong> {acceptedOrder.quantity} {acceptedOrder.quantity_unit || 'servings'}
              </div>
            </div>

            {/* FROM/TO Addresses */}
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              border: '2px solid #d1fae5'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  fontWeight: 600
                }}>
                  FROM
                </div>
                <div style={{
                  fontSize: '15px',
                  color: '#111827',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FaMapMarkerAlt style={{ color: '#10b981', fontSize: '18px' }} />
                  {acceptedOrder.pickup_address_full || acceptedOrder.address || acceptedOrder.location || acceptedOrder.area || 'Pickup Location'}
                </div>
              </div>

              <div style={{
                height: '1px',
                background: '#d1fae5',
                margin: '16px 0'
              }} />

              <div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  fontWeight: 600
                }}>
                  TO
                </div>
                <div style={{
                  fontSize: '15px',
                  color: '#111827',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FaMapMarkerAlt style={{ color: '#ef4444', fontSize: '18px' }} />
                  {acceptedOrder.deliveryAddressFull || acceptedOrder.delivery_address_full || acceptedOrder.deliveryAddress || 'Delivery Location'}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div style={{
              background: 'linear-gradient(135deg, #06C167, #059669)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(6, 193, 103, 0.3)'
            }}>
              {acceptedOrder.food_image ? (
                <img
                  src={acceptedOrder.food_image}
                  alt={acceptedOrder.food || acceptedOrder.foodName}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    background: 'white'
                  }}
                />
              ) : (
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  color: 'white'
                }}>
                  <FaUtensils />
                </div>
              )}
              <div style={{ flex: 1, color: 'white' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                  {acceptedOrder.food || acceptedOrder.foodName}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
                  {acceptedOrder.type || acceptedOrder.foodType || 'N/A'} • {acceptedOrder.quantity} {acceptedOrder.quantity_unit || 'servings'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  {acceptedOrder.category || 'N/A'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowOrderDetailsModal(false);
                  setAcceptedOrder(null);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '15px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setTrackingOrder(acceptedOrder);
                  setShowTrackingModal(true);
                  setShowOrderDetailsModal(false);
                  setAcceptedOrder(null);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'linear-gradient(135deg, #06C167, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(6, 193, 103, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 193, 103, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 193, 103, 0.3)';
                }}
              >
                <FaMapMarkerAlt /> Track Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;
