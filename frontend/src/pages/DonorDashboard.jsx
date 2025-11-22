/**
 * Donor Dashboard - Modern Homepage with Feed
 * FeedHope Frontend - Donor Homepage Screen
 * Complete modern UI with food donation and volunteer requests feed
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getMyDonations } from '../services/firebaseFood';
import { logoutUser } from '../services/firebaseAuth';
import { format } from 'date-fns';
import { 
  FaHeart, 
  FaMapMarkerAlt, 
  FaClock, 
  FaUser, 
  FaPlus, 
  FaSignOutAlt, 
  FaUserCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaUtensils,
  FaHandHoldingHeart,
  FaChartLine,
  FaPhone,
  FaTimes,
  FaCrosshairs
} from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createFoodDonation } from '../services/firebaseFood';
import OrderTrackingModal from '../components/OrderTrackingModal';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Location Marker Component for Contribution Modal
function LocationMarker({ position, setPosition, onPositionChange }) {
  const [markerPosition, setMarkerPosition] = useState(position);
  
  useEffect(() => {
    if (position && Array.isArray(position) && position.length === 2) {
      setMarkerPosition(position);
    }
  }, [position]);

  const map = useMapEvents({
    click(e) {
      if (e.latlng && e.latlng.lat && e.latlng.lng) {
        const newPos = [e.latlng.lat, e.latlng.lng];
        setMarkerPosition(newPos);
        setPosition(newPos);
        if (onPositionChange) {
          onPositionChange(newPos);
        }
      }
    },
  });

  if (!markerPosition || !Array.isArray(markerPosition) || markerPosition.length !== 2 || 
      typeof markerPosition[0] !== 'number' || typeof markerPosition[1] !== 'number' ||
      isNaN(markerPosition[0]) || isNaN(markerPosition[1])) {
    return null;
  }

  const handleDragEnd = (e) => {
    try {
      const marker = e.target;
      if (!marker) return;
      
      const latlng = marker.getLatLng();
      if (latlng && typeof latlng.lat === 'number' && typeof latlng.lng === 'number' &&
          !isNaN(latlng.lat) && !isNaN(latlng.lng)) {
        const newPos = [latlng.lat, latlng.lng];
        setMarkerPosition(newPos);
        setPosition(newPos);
        if (onPositionChange) {
          onPositionChange(newPos);
        }
      }
    } catch (error) {
      console.error('Error in dragend:', error);
    }
  };

  return (
    <Marker
      position={markerPosition}
      draggable={true}
      eventHandlers={{
        dragend: handleDragEnd,
      }}
    />
  );
}

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [user, loadingAuth] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    total_donations: 0,
    active_donations: 0,
    delivered_donations: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  
  // Contribution modal state
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [contributionForm, setContributionForm] = useState({
    peopleServed: 1,
    address: '',
    phone: '',
    pickupLatitude: null,
    pickupLongitude: null,
    pickupAddressFull: ''
  });
  const [submittingContribution, setSubmittingContribution] = useState(false);
  const [mapPosition, setMapPosition] = useState([23.8103, 90.4125]); // Default: Dhaka
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [geocodingLocation, setGeocodingLocation] = useState(false);

  useEffect(() => {
    if (!loadingAuth && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadProfile();
      loadDonations();
      loadRequests();
    }
  }, [user, loadingAuth, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        navigate('/login');
        return;
      }

      const userData = userDoc.data();
      
      const donorDoc = await getDoc(doc(db, 'donors', user.uid));
      if (donorDoc.exists()) {
        setUserProfile({ id: donorDoc.id, ...donorDoc.data(), email: user.email });
      }

      const donationsResult = await getMyDonations();
      if (donationsResult.success) {
        const allDonations = donationsResult.data;
        setStats({
          total_donations: allDonations.length,
          active_donations: allDonations.filter(d => d.status === 'available' || d.status === 'pending' || d.status === 'ongoing').length,
          delivered_donations: allDonations.filter(d => d.status === 'delivered').length
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const loadDonations = async () => {
    try {
      const result = await getMyDonations();
      if (result.success) {
        setDonations(result.data.map(d => ({
          ...d,
          date: d.date?.toDate ? d.date.toDate() : (d.createdAt?.toDate ? d.createdAt.toDate() : new Date())
        })));
      }
    } catch (err) {
      console.error('Failed to load donations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      // Get all food requests (pending, matched, active)
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
        // Filter by status client-side
        if (data.status === 'pending' || data.status === 'matched' || !data.status || data.status === 'active') {
          // Format date
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

      // Sort by date manually
      requestsList.sort((a, b) => b.date - a.date);
      setRequests(requestsList);
    } catch (error) {
      console.error('Error loading requests:', error);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  // Reverse geocoding to get address from coordinates
  const geocodeLocation = async (lat, lng) => {
    setGeocodingLocation(true);
    try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
      
      const response = await fetch(geocodeUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'FeedHope/1.0 (Food Donation System)',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.address) {
        // Extract location name (building, school, hospital, etc.)
        const locationNameParts = [
          data.address.building,
          data.address.school,
          data.address.hospital,
          data.address.university || data.address.college,
          data.address.name,
          data.address.amenity,
          data.address.office
        ].filter(Boolean);
        
        const locationName = locationNameParts[0] || '';
        
        // Build full address
        const addressParts = [
          data.address.road_number || data.address.road,
          data.address.suburb || data.address.neighbourhood || data.address.area,
          data.address.city || data.address.town || data.address.village,
          data.address.postcode
        ].filter(Boolean);
        
        let fullAddress = addressParts.join(', ');
        
        // If display_name is better, use it
        if (data.display_name && (!fullAddress || fullAddress.length < 15)) {
          fullAddress = data.display_name;
        }
        
        if (locationName) {
          setSelectedLocationName(locationName);
        } else if (data.display_name) {
          // Try to extract name from display_name
          const displayParts = data.display_name.split(',');
          if (displayParts.length > 0) {
            const firstPart = displayParts[0].trim();
            if (firstPart && !/^\d+/.test(firstPart)) {
              setSelectedLocationName(firstPart);
            }
          }
        }
        
        // Update form with full address
        setContributionForm(prev => ({
          ...prev,
          pickupAddressFull: fullAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }));
      } else if (data && data.display_name) {
        setSelectedLocationName(data.display_name.split(',')[0].trim());
        setContributionForm(prev => ({
          ...prev,
          pickupAddressFull: data.display_name
        }));
      } else {
        setSelectedLocationName('');
        setContributionForm(prev => ({
          ...prev,
          pickupAddressFull: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSelectedLocationName('');
      setContributionForm(prev => ({
        ...prev,
        pickupAddressFull: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      }));
    } finally {
      setGeocodingLocation(false);
    }
  };

  // Get current location for contribution modal
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapPosition([lat, lng]);
        setContributionForm(prev => ({
          ...prev,
          pickupLatitude: lat,
          pickupLongitude: lng
        }));
        // Geocode the location
        await geocodeLocation(lat, lng);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Failed to get your location. Please select on map manually.');
      }
    );
  };

  // Handle map position change
  const handleMapPositionChange = async (newPosition) => {
    const [lat, lng] = newPosition;
    setMapPosition(newPosition);
    setContributionForm(prev => ({
      ...prev,
      pickupLatitude: lat,
      pickupLongitude: lng
    }));
    // Geocode the new location
    await geocodeLocation(lat, lng);
  };

  // Handle contribution submission
  const handleSubmitContribution = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    // Validate
    if (contributionForm.peopleServed < 1) {
      alert('Please select at least 1 person to serve.');
      return;
    }

    if (contributionForm.peopleServed > selectedRequest.remaining) {
      alert(`Maximum contribution allowed: ${selectedRequest.remaining} people`);
      return;
    }

    if (!contributionForm.address) {
      alert('Please enter pickup address.');
      return;
    }

    if (!contributionForm.phone || !/^\d{11}$/.test(contributionForm.phone)) {
      alert('Please enter a valid 11-digit phone number.');
      return;
    }

    setSubmittingContribution(true);
    try {
      const donationData = {
        food: selectedRequest.food_type || selectedRequest.foodType || '',
        type: 'veg', // Default, can be updated
        category: selectedRequest.food_category || selectedRequest.foodCategory || 'cooked-food',
        quantity: `${contributionForm.peopleServed} people`,
        location: selectedRequest.location || selectedRequest.area || '',
        address: contributionForm.address,
        phone: contributionForm.phone,
        requestId: selectedRequest.id,
        peopleServed: contributionForm.peopleServed,
        pickupLatitude: contributionForm.pickupLatitude,
        pickupLongitude: contributionForm.pickupLongitude,
        pickupAddressFull: contributionForm.pickupAddressFull || contributionForm.address,
        division: selectedRequest.division || null,
        district: selectedRequest.district || null,
        area: selectedRequest.area || selectedRequest.location || null
      };

      const result = await createFoodDonation(donationData, null);

      if (result.success) {
        alert(`Thank you! Your contribution for ${contributionForm.peopleServed} people has been submitted.`);
        setShowContributionModal(false);
        setSelectedRequest(null);
        // Reload requests to update progress
        await loadRequests();
        // Reload donations
        await loadDonations();
      } else {
        alert(result.message || 'Failed to submit contribution. Please try again.');
      }
    } catch (error) {
      console.error('Contribution error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setSubmittingContribution(false);
    }
  };

  const getStatusBadge = (donation) => {
    // Handle both object and string status
    const donationObj = typeof donation === 'object' ? donation : { status: donation };
    const status = donationObj.status;
    
    // Donor sees: Available until delivered, then Delivered
    let badgeText = '';
    let badgeBg = '';
    let badgeColor = '';
    
    if (status === 'delivered') {
      badgeText = 'Delivered';
      badgeBg = '#d1fae5';
      badgeColor = '#065f46';
    } else if (status === 'ongoing') {
      badgeText = 'In Transit';
      badgeBg = '#e0e7ff';
      badgeColor = '#4338ca';
    } else if (status === 'rejected') {
      badgeText = 'Rejected';
      badgeBg = '#fee2e2';
      badgeColor = '#991b1b';
    } else if (status === 'pending' && !donationObj.admin_approved_by) {
      // Pending approval
      badgeText = 'Pending Approval';
      badgeBg = '#fef3c7';
      badgeColor = '#92400e';
    } else {
      // Available, pending with volunteerId, or any other status
      badgeText = 'Available';
      badgeBg = '#dbeafe';
      badgeColor = '#1e40af';
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

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      paddingBottom: '40px'
    },
    header: {
      background: 'linear-gradient(135deg, #06C167 0%, #059669 100%)',
      color: 'white',
      padding: '20px 30px',
      boxShadow: '0 4px 20px rgba(6, 193, 103, 0.3)',
      marginBottom: '30px'
    },
    headerContent: {
      maxWidth: '1200px',
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
      border: '1px solid rgba(6, 193, 103, 0.1)'
    },
    welcomeTitle: {
      fontSize: '32px',
      fontWeight: 800,
      background: 'linear-gradient(135deg, #06C167, #059669)',
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
      background: 'linear-gradient(135deg, #06C167, #10b981)',
      borderRadius: '16px',
      padding: '25px',
      color: 'white',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 8px 20px rgba(6, 193, 103, 0.3)',
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
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    statCard: {
      background: 'white',
      borderRadius: '16px',
      padding: '25px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
      borderLeft: '4px solid #06C167',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    statValue: {
      fontSize: '36px',
      fontWeight: 800,
      color: '#06C167'
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
      paddingBottom: '12px'
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
      color: '#06C167',
      background: '#f0fdf4',
      borderBottom: '2px solid #06C167'
    },
    requestsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '24px'
    },
    requestCard: {
      background: 'linear-gradient(135deg, #fff7ed, #ffffff)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
      borderLeft: '4px solid #f59e0b',
      transition: 'all 0.3s',
      cursor: 'pointer'
    },
    requestCardHover: {
      transform: 'translateY(-8px)',
      boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
    },
    requestHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '16px'
    },
    requestTitle: {
      fontSize: '20px',
      fontWeight: 700,
      color: '#111827',
      marginBottom: '8px'
    },
    requestMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      marginBottom: '16px',
      fontSize: '14px',
      color: '#6b7280'
    },
    requestMetaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    progressBar: {
      width: '100%',
      height: '12px',
      borderRadius: '999px',
      background: '#f3f4f6',
      overflow: 'hidden',
      marginBottom: '12px'
    },
    progressFill: {
      height: '100%',
      borderRadius: '999px',
      background: 'linear-gradient(90deg, #06C167, #10b981)',
      transition: 'width 0.3s'
    },
    progressText: {
      fontSize: '13px',
      color: '#6b7280',
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '16px'
    },
    btnSupport: {
      width: '100%',
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #06C167, #059669)',
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
      boxShadow: '0 4px 15px rgba(6, 193, 103, 0.3)'
    },
    donationsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '24px'
    },
    donationCard: {
      background: 'linear-gradient(135deg, #f0fdf4, #ffffff)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
      borderLeft: '4px solid #06C167',
      transition: 'all 0.3s'
    },
    donationCardHover: {
      transform: 'translateY(-8px)',
      boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
    },
    donationImage: {
      width: '100%',
      height: '200px',
      objectFit: 'cover',
      borderRadius: '12px',
      marginBottom: '16px',
      background: 'linear-gradient(135deg, #e6fff3, #d1fae5)'
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

  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'donations'

  if (loadingAuth || loading) {
    return (
      <div style={styles.loading}>
        <FaSpinner className="spinner" style={{ fontSize: '48px', color: '#06C167' }} />
        <p style={{ fontSize: '18px', color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.userInfo}>
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
              <div style={styles.userName}>
                {userProfile?.name || user?.displayName || 'Donor'}
              </div>
              <div style={styles.userEmail}>
                {user?.email || ''}
              </div>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button
              onClick={() => navigate('/profile')}
              style={{ ...styles.btn, ...styles.btnPrimary }}
            >
              <FaUserCircle /> Profile
            </button>
            <button
              onClick={handleLogout}
              style={{ ...styles.btn, ...styles.btnDanger }}
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {/* Welcome Card */}
        <div style={styles.welcomeCard}>
          <h1 style={styles.welcomeTitle}>
            Welcome back, {userProfile?.name || 'Donor'}! 👋
          </h1>
          <p style={styles.welcomeSubtitle}>
            Make a difference today. Donate food and support those in need.
          </p>

          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <div
              style={styles.actionCard}
              onClick={() => navigate('/donor/create-donation')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(6, 193, 103, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(6, 193, 103, 0.3)';
              }}
            >
              <FaHandHoldingHeart style={styles.actionIcon} />
              <div style={styles.actionTitle}>Donate Food</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Share food with those in need
              </div>
            </div>
            <div
              style={styles.actionCard}
              onClick={() => navigate('/newsfeed')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(6, 193, 103, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(6, 193, 103, 0.3)';
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
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(6, 193, 103, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(6, 193, 103, 0.3)';
              }}
            >
              <FaChartLine style={styles.actionIcon} />
              <div style={styles.actionTitle}>My Stats</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                View your donation history
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.total_donations}</div>
              <div style={styles.statLabel}>Total Donations</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.active_donations}</div>
              <div style={styles.statLabel}>Active</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.delivered_donations}</div>
              <div style={styles.statLabel}>Delivered</div>
            </div>
          </div>
        </div>

        {/* Feed Section */}
        <div style={styles.feedSection}>
          <h2 style={styles.sectionTitle}>
            <FaHeart style={{ color: '#06C167' }} />
            Community Feed
          </h2>

          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              style={{
                ...styles.tab,
                ...(activeTab === 'requests' ? styles.tabActive : {})
              }}
            >
              <FaExclamationTriangle /> Volunteer Requests ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('donations')}
              style={{
                ...styles.tab,
                ...(activeTab === 'donations' ? styles.tabActive : {})
              }}
            >
              <FaUtensils /> My Donations ({donations.length})
            </button>
          </div>

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div>
              {loadingRequests ? (
                <div style={styles.loading}>
                  <FaSpinner className="spinner" style={{ fontSize: '32px', color: '#06C167' }} />
                  <p>Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div style={styles.emptyState}>
                  <FaExclamationTriangle style={styles.emptyIcon} />
                  <h3 style={styles.emptyTitle}>No requests yet</h3>
                  <p style={styles.emptyText}>
                    Volunteers haven't posted any food requests at the moment.
                  </p>
                </div>
              ) : (
                <div style={styles.requestsGrid}>
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      style={styles.requestCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                      }}
                    >
                      <div style={styles.requestHeader}>
                        <h3 style={styles.requestTitle}>{request.food_type || request.foodType || 'Food Request'}</h3>
                        {getStatusBadge(request.status)}
                      </div>

                      {request.organization_name && (
                        <div style={{ marginBottom: '12px', fontSize: '15px', color: '#374151' }}>
                          <strong>Organization:</strong> {request.organization_name}
                        </div>
                      )}

                      <div style={styles.requestMeta}>
                        <div style={styles.requestMetaItem}>
                          <FaMapMarkerAlt style={{ color: '#f59e0b' }} />
                          {request.location || request.area || 'Location'}
                        </div>
                        <div style={styles.requestMetaItem}>
                          <FaClock style={{ color: '#6b7280' }} />
                          {format(request.date, 'MMM dd, yyyy')}
                        </div>
                        {request.urgency && (
                          <div style={styles.requestMetaItem}>
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
                          <div style={styles.progressBar}>
                            <div
                              style={{
                                ...styles.progressFill,
                                width: `${Math.min(request.progress, 100)}%`
                              }}
                            />
                          </div>
                          <div style={styles.progressText}>
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

                      {request.status !== 'fulfilled' && request.remaining > 0 && (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowContributionModal(true);
                            setContributionForm({
                              peopleServed: Math.min(1, request.remaining || 1),
                              address: userProfile?.address || '',
                              phone: userProfile?.phone || '',
                              pickupLatitude: null,
                              pickupLongitude: null,
                              pickupAddressFull: ''
                            });
                          }}
                          style={styles.btnSupport}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 193, 103, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(6, 193, 103, 0.3)';
                          }}
                        >
                          <FaHandHoldingHeart /> Support This Request
                        </button>
                      )}

                      {request.status === 'fulfilled' && (
                        <div style={{
                          padding: '12px',
                          background: '#d1fae5',
          color: '#065f46',
          borderRadius: '8px',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '14px'
                        }}>
                          <FaCheckCircle /> Request Fulfilled!
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Donations Tab */}
          {activeTab === 'donations' && (
            <div>
              {donations.length === 0 ? (
                <div style={styles.emptyState}>
                  <FaUtensils style={styles.emptyIcon} />
                  <h3 style={styles.emptyTitle}>No donations yet</h3>
                  <p style={styles.emptyText}>
                    Start making a difference! Create your first food donation.
                  </p>
                  <button
                    onClick={() => navigate('/donor/create-donation')}
                    style={{
                      ...styles.btnSupport,
                      maxWidth: '300px',
                      margin: '0 auto'
                    }}
                  >
                    <FaPlus /> Create First Donation
                  </button>
                </div>
              ) : (
                <div style={styles.donationsGrid}>
                  {donations.map((donation) => (
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
                          color: '#06C167',
                          fontSize: '48px'
                        }}>
                          <FaUtensils />
                        </div>
                      )}

                      <div style={styles.requestHeader}>
                        <h3 style={styles.requestTitle}>{donation.food || donation.foodName}</h3>
                        {getStatusBadge(donation)}
                      </div>

                      <div style={styles.requestMeta}>
                        <div style={styles.requestMetaItem}>
                          <FaMapMarkerAlt style={{ color: '#06C167' }} />
                          {donation.location || donation.area || 'Location'}
                        </div>
                        <div style={styles.requestMetaItem}>
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

                      {/* Track Order Button - Show for ongoing or delivered orders */}
                      {(donation.status === 'ongoing' || donation.status === 'delivered' || 
                        (donation.status === 'pending' && donation.volunteerId)) && (
                        <button
                          onClick={() => {
                            setTrackingOrder(donation);
                            setShowTrackingModal(true);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '12px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <FaMapMarkerAlt /> Track Order
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

      {/* Contribution Modal */}
      {showContributionModal && selectedRequest && (
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
          padding: '20px',
          overflow: 'auto'
        }} onClick={() => {
          if (!submittingContribution) {
            setShowContributionModal(false);
            setSelectedRequest(null);
          }
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '900px',
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
                  <FaHandHoldingHeart style={{ color: '#06C167' }} />
                  Support This Request
                </h2>
                <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                  {selectedRequest.food_type || selectedRequest.foodType || 'Food Request'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!submittingContribution) {
                    setShowContributionModal(false);
                    setSelectedRequest(null);
                  }
                }}
                disabled={submittingContribution}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '10px',
                  width: '40px',
                  height: '40px',
                  cursor: submittingContribution ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: '20px',
                  transition: 'all 0.2s',
                  opacity: submittingContribution ? 0.5 : 1
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Request Summary */}
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              border: '2px solid #d1fae5'
            }}>
              <div style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: '#065f46' }}>
                Request Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px', color: '#374151' }}>
                <div>
                  <strong>Food:</strong> {selectedRequest.food_type || selectedRequest.foodType || 'N/A'}
                </div>
                <div>
                  <strong>Location:</strong> {selectedRequest.location || selectedRequest.area || 'N/A'}
                </div>
                <div>
                  <strong>Recipients:</strong> {selectedRequest.recipient_count || 0} people
                </div>
                <div>
                  <strong>Still need:</strong> <span style={{ color: '#f59e0b', fontWeight: 700 }}>{selectedRequest.remaining || 0} people</span>
                </div>
              </div>
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#d1fae5',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#065f46',
                fontWeight: 600
              }}>
                ✅ Thank you! Your donation will directly support this specific need.
              </div>
            </div>

            {/* Contribution Form */}
            <form onSubmit={handleSubmitContribution}>
              {/* How many people will you feed? */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#111827'
                }}>
                  How many people will you feed? *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <input
                    type="range"
                    min="1"
                    max={selectedRequest.remaining || 1}
                    value={contributionForm.peopleServed}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setContributionForm(prev => ({ ...prev, peopleServed: value }));
                    }}
                    style={{
                      flex: 1,
                      height: '8px',
                      borderRadius: '4px',
                      background: '#e5e7eb',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="number"
                    min="1"
                    max={selectedRequest.remaining || 1}
                    value={contributionForm.peopleServed}
                    onChange={(e) => {
                      const value = Math.max(1, Math.min(selectedRequest.remaining || 1, parseInt(e.target.value) || 1));
                      setContributionForm(prev => ({ ...prev, peopleServed: value }));
                    }}
                    style={{
                      width: '80px',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 600,
                      textAlign: 'center'
                    }}
                  />
                </div>
                <p style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                  You can support up to <strong>{selectedRequest.remaining || 0} people</strong> for this request.
                </p>
              </div>

              {/* Pickup Address */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#111827'
                }}>
                  Pickup Address (you can adjust road/house) *
                </label>
                <input
                  type="text"
                  value={contributionForm.address}
                  onChange={(e) => setContributionForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="House, Road, Block"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#06C167'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#111827'
                }}>
                  Phone Number *
                </label>
                <input
                  type="text"
                  value={contributionForm.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setContributionForm(prev => ({ ...prev, phone: value }));
                  }}
                  placeholder="01XXXXXXXXX"
                  required
                  maxLength="11"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#06C167'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Location on Map */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#111827'
                }}>
                  Location on Map (Optional - Drag marker to select exact location)
                </label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={geocodingLocation}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: geocodingLocation
                      ? '#9ca3af'
                      : 'linear-gradient(135deg, #06C167, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: geocodingLocation ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    transition: 'all 0.2s',
                    opacity: geocodingLocation ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!geocodingLocation) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 193, 103, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {geocodingLocation ? (
                    <>
                      <FaSpinner className="spinner" /> Getting location...
                    </>
                  ) : (
                    <>
                      <FaCrosshairs /> Get My Current Location
                    </>
                  )}
                </button>
                
                {/* Selected Location Name Display */}
                {(selectedLocationName || contributionForm.pickupAddressFull) && (
                  <div style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    border: '2px solid #d1fae5'
                  }}>
                    {selectedLocationName && (
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#065f46',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <FaMapMarkerAlt style={{ color: '#06C167' }} />
                        {selectedLocationName}
                      </div>
                    )}
                    {contributionForm.pickupAddressFull && (
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        marginTop: selectedLocationName ? '4px' : '0'
                      }}>
                        {contributionForm.pickupAddressFull}
                      </div>
                    )}
                  </div>
                )}
                
                <div style={{
                  height: '300px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '2px solid #e5e7eb',
                  position: 'relative'
                }}>
                  {geocodingLocation && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'rgba(255, 255, 255, 0.95)',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#06C167'
                    }}>
                      <FaSpinner className="spinner" /> Looking up address...
                    </div>
                  )}
                  <MapContainer
                    center={mapPosition}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='© OpenStreetMap contributors'
                    />
                    <LocationMarker 
                      position={mapPosition} 
                      setPosition={(pos) => {
                        setMapPosition(pos);
                        setContributionForm(prev => ({
                          ...prev,
                          pickupLatitude: pos[0],
                          pickupLongitude: pos[1]
                        }));
                      }}
                      onPositionChange={handleMapPositionChange}
                    />
                  </MapContainer>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingContribution}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: submittingContribution 
                    ? '#9ca3af' 
                    : 'linear-gradient(135deg, #06C167, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: submittingContribution ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!submittingContribution) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 193, 103, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {submittingContribution ? (
                  <>
                    <FaSpinner className="spinner" /> Processing...
                  </>
                ) : (
                  <>
                    <FaHandHoldingHeart /> Support this request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonorDashboard;
