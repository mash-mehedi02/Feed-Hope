/**
 * Create Donation Page - Beautiful Single-Page Food Donation Form
 * FeedHope Frontend - Create Donation Screen (No Scroll, Compact Design)
 * Complete Bangladesh location system (Division → District → Area)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { auth } from '../firebase/config';
import { createFoodDonation } from '../services/firebaseFood';
import { getDivisions, getDistricts, getAreas } from '../services/firebaseLocations';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FaMapMarkerAlt, FaImage, FaSpinner, FaCheckCircle, FaLeaf, FaUtensils, FaBox, FaCrosshairs } from 'react-icons/fa';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Location Marker Component - Using ref to prevent re-render issues
function LocationMarker({ position, setPosition }) {
  const [markerPosition, setMarkerPosition] = useState(position);
  
  // Update marker position when prop changes (but not during drag)
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
      }
    },
  });

  // Ensure position is valid (array with 2 numbers)
  if (!markerPosition || !Array.isArray(markerPosition) || markerPosition.length !== 2 || 
      typeof markerPosition[0] !== 'number' || typeof markerPosition[1] !== 'number' ||
      isNaN(markerPosition[0]) || isNaN(markerPosition[1])) {
    return null;
  }

  const handleDragEnd = (e) => {
    try {
      const marker = e.target;
      if (!marker) {
        console.error('Marker not found in dragend event');
        return;
      }
      
      const latlng = marker.getLatLng();
      if (latlng && typeof latlng.lat === 'number' && typeof latlng.lng === 'number' &&
          !isNaN(latlng.lat) && !isNaN(latlng.lng)) {
        const newLat = latlng.lat;
        const newLng = latlng.lng;
        console.log('✅ Drag ended at:', newLat, newLng);
        
        // Update local state first (immediate visual feedback)
        setMarkerPosition([newLat, newLng]);
        
        // Then update parent state (triggers address geocoding)
        setPosition([newLat, newLng]);
      } else {
        console.error('Invalid latlng in dragend:', latlng);
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

const CreateDonationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, loading] = useAuthState(auth);
  const requestId = searchParams.get('request_id');

  // Form state
  const [formData, setFormData] = useState({
    food: '',
    type: 'veg',
    category: 'cooked-food',
    quantity: '',
    name: '',
    phone: '',
    division: '',
    district: '',
    area: '',
    address: '',
    donorNote: '',
    peopleServed: 1,
  });

  // Location state
  const [divisions, setDivisions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [mapPosition, setMapPosition] = useState([23.8103, 90.4125]); // Dhaka default coordinates
  const [locationAddress, setLocationAddress] = useState('');
  const [locationName, setLocationName] = useState(''); // Location name (school, building, etc.)
  const [mapReady, setMapReady] = useState(false);

  // Request link state
  const [linkedRequest, setLinkedRequest] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(false);

  // Form state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [focusedField, setFocusedField] = useState(null); // Track focused field for styling

  // Load user profile and linked request
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      checkUserRole();
      loadUserProfile();
      if (requestId) {
        loadLinkedRequest(requestId);
      }
    }
  }, [user, loading, requestId]);

  const checkUserRole = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role !== 'donor') {
          alert('Only donors can create food donations. Volunteers can create food requests.');
          navigate('/volunteer/dashboard');
          return;
        }
      }
    } catch (err) {
      console.error('Failed to check role:', err);
    }
  };

  // Load divisions on mount
  useEffect(() => {
    loadDivisions();
  }, []);

  // Load districts when division changes
  useEffect(() => {
    if (formData.division) {
      loadDistricts(formData.division);
    } else {
      setDistricts([]);
      setAreas([]);
    }
  }, [formData.division]);

  // Load areas when district changes
  useEffect(() => {
    if (formData.district) {
      loadAreas(formData.district);
    } else {
      setAreas([]);
    }
  }, [formData.district]);

  const loadUserProfile = async () => {
    setLoadingProfile(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        navigate('/login');
        return;
      }

      const userData = userDoc.data();
      if (userData.role === 'donor') {
        const donorDoc = await getDoc(doc(db, 'donors', user.uid));
        if (donorDoc.exists()) {
          const donorData = donorDoc.data();
          setUserProfile(donorData);
          setFormData(prev => ({
            ...prev,
            name: donorData.name || '',
            phone: donorData.phone || '',
            division: donorData.division || '',
            district: donorData.district || '',
            area: donorData.area || '',
            address: donorData.address || ''
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadLinkedRequest = async (id) => {
    setLoadingRequest(true);
    try {
      const requestDoc = await getDoc(doc(db, 'food_requests', id));
      if (requestDoc.exists()) {
        const requestData = requestDoc.data();
        const recipientCount = requestData.recipient_count || 0;
        const receivedCount = requestData.received_count || 0;
        const remaining = Math.max(0, recipientCount - receivedCount);
        
        setLinkedRequest({ 
          id: requestDoc.id, 
          ...requestData,
          remaining
        });
        setFormData(prev => ({
          ...prev,
          food: requestData.food_type || requestData.foodType || '',
          category: requestData.food_category || requestData.foodCategory || 'cooked-food',
          division: requestData.division || '',
          district: requestData.district || '',
          area: requestData.area || requestData.location || '',
          peopleServed: Math.min(1, remaining)
        }));
      }
    } catch (err) {
      console.error('Failed to load linked request:', err);
    } finally {
      setLoadingRequest(false);
    }
  };

  const loadDivisions = async () => {
    try {
      const result = await getDivisions();
      if (result.success) {
        setDivisions(result.data);
      }
    } catch (err) {
      console.error('Failed to load divisions:', err);
    }
  };

  const loadDistricts = async (divisionName) => {
    try {
      const result = await getDistricts(divisionName);
      if (result.success) {
        setDistricts(result.data);
      }
    } catch (err) {
      console.error('Failed to load districts:', err);
    }
  };

  const loadAreas = async (districtName) => {
    try {
      const result = await getAreas(districtName);
      if (result.success) {
        setAreas(result.data);
      }
    } catch (err) {
      console.error('Failed to load areas:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setError('Image size must be less than 3MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateLocation = async (lat, lng) => {
    // Validate coordinates
    if (typeof lat !== 'number' || typeof lng !== 'number' || 
        isNaN(lat) || isNaN(lng) || 
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error('Invalid coordinates:', lat, lng);
      return;
    }

    console.log('Updating location to:', lat, lng);
    
    // Update position state immediately
    setMapPosition([lat, lng]);
    setMapReady(true);
    
    // Update address asynchronously
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.address) {
        // Extract location name (school, building, varsity, organization, station, etc.)
        const locationNameParts = [
          data.address.school,
          data.address.university,
          data.address.college,
          data.address.building,
          data.address.amenity === 'university' ? data.address.name : null,
          data.address.amenity === 'school' ? data.address.name : null,
          data.address.amenity === 'college' ? data.address.name : null,
          data.address.amenity === 'hospital' ? data.address.name : null,
          data.address.amenity === 'railway_station' ? data.address.name : null,
          data.address.amenity === 'bus_station' ? data.address.name : null,
          data.address.amenity === 'marketplace' ? data.address.name : null,
          data.address.office,
          data.address.shop,
          data.address.name, // Generic name field
          data.address.brand, // For branded locations
          data.address['addr:office'] || data.address['addr:building'], // Building/office name
        ].filter(Boolean);
        
        const locationNameStr = locationNameParts[0] || '';
        setLocationName(locationNameStr);

        // Build full address WITHOUT location name (location name shown separately)
        const addressParts = [
          data.address.road_number || data.address.road,
          data.address.suburb || data.address.neighbourhood || data.address.area,
          data.address.city || data.address.town || data.address.village,
          data.address.postcode
        ].filter(Boolean);
        
        // If no location name, try to extract from display_name
        let fullAddress = addressParts.join(', ');
        
        // If display_name contains the location name better, use it
        if (data.display_name && !locationNameStr) {
          // Try to extract name from display_name (usually first part before comma)
          const displayParts = data.display_name.split(',');
          if (displayParts.length > 0 && displayParts[0].trim()) {
            const firstPart = displayParts[0].trim();
            // Check if first part looks like a location name (not a road number)
            if (!/^\d+/.test(firstPart) && firstPart.length > 3) {
              setLocationName(firstPart);
              fullAddress = data.display_name;
            }
          }
        }
        
        if (!fullAddress || fullAddress === ', ') {
          fullAddress = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
        
        console.log('Location name:', locationNameStr);
        console.log('Geocoded address:', fullAddress);
        setLocationAddress(fullAddress);
      } else if (data && data.display_name) {
        // Try to extract location name from display_name
        const displayParts = data.display_name.split(',');
        if (displayParts.length > 0) {
          const firstPart = displayParts[0].trim();
          if (firstPart && !/^\d+/.test(firstPart)) {
            setLocationName(firstPart);
          }
        }
        console.log('Using display_name:', data.display_name);
        setLocationAddress(data.display_name);
      } else {
        setLocationName('');
        setLocationAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setLocationName('');
      setLocationAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Validate coordinates
          if (typeof lat === 'number' && typeof lng === 'number' && 
              !isNaN(lat) && !isNaN(lng) &&
              lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            updateLocation(lat, lng);
          } else {
            alert('Invalid location data received. Please click on the map or drag the marker.');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Could not get your location. Please click on the map or drag the marker.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation not supported. Please click on the map or drag the marker.');
    }
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent double submission
    if (submitting) {
      console.log('⚠️ Already submitting, ignoring...');
      return;
    }

    setError('');

    // Validation
    if (!formData.food || !formData.food.trim()) {
      setError('Please enter food name');
      return;
    }

    if (!formData.quantity || !formData.quantity.trim()) {
      setError('Please enter quantity');
      return;
    }

    if (!formData.name || !formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!formData.phone || formData.phone.replace(/\D/g, '').length !== 11) {
      setError('Please enter valid 11-digit phone number');
      return;
    }

    if (!formData.area || !formData.area.trim()) {
      setError('Please select area');
      return;
    }

    if (!formData.address || !formData.address.trim()) {
      setError('Please enter address');
      return;
    }

    setSubmitting(true);
    setError('');

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('⏰ Submission timeout after 30 seconds');
      setError('Submission is taking too long. Please check your internet connection and try again.');
      setSubmitting(false);
    }, 30000); // 30 seconds timeout

    try {
      console.log('🚀 Starting donation submission...');
      console.log('Form data:', formData);
      console.log('Map position:', mapPosition);
      console.log('Location address:', locationAddress);

      // Check if Firebase is available
      const { getCurrentUser } = await import('../services/firebaseAuth');
      const user = getCurrentUser();
      if (!user) {
        clearTimeout(timeoutId);
        setError('You are not logged in. Please log in and try again.');
        setSubmitting(false);
        navigate('/login');
        return;
      }
      console.log('✅ User authenticated:', user.uid);

      const donationData = {
        food: formData.food,
        type: formData.type,
        category: formData.category,
        quantity: linkedRequest ? `${formData.peopleServed} people` : formData.quantity,
        location: formData.area,
        address: formData.address,
        phone: formData.phone,
        donorNote: formData.donorNote || '',
        requestId: linkedRequest ? requestId : null,
        peopleServed: linkedRequest ? formData.peopleServed : null,
        pickupLatitude: mapPosition && Array.isArray(mapPosition) && mapPosition.length >= 2 && typeof mapPosition[0] === 'number' ? mapPosition[0] : null,
        pickupLongitude: mapPosition && Array.isArray(mapPosition) && mapPosition.length >= 2 && typeof mapPosition[1] === 'number' ? mapPosition[1] : null,
        pickupAddressFull: locationAddress || locationName || (mapPosition && Array.isArray(mapPosition) && mapPosition.length >= 2 ? `${mapPosition[0]}, ${mapPosition[1]}` : ''),
        division: formData.division,
        district: formData.district,
        area: formData.area,
      };

      console.log('📦 Donation data prepared:', donationData);
      console.log('📸 Image file:', imageFile ? `${imageFile.name} (${imageFile.size} bytes)` : 'No image');

      const result = await createFoodDonation(donationData, imageFile);
      
      clearTimeout(timeoutId);
      console.log('✅ Donation result:', result);

      if (result && result.success) {
        console.log('✅ Donation created successfully! ID:', result.donationId);
        setSuccess(true);
        setError('');
        
        // Show success message for 2 seconds before redirecting
        setTimeout(() => {
          console.log('🔄 Redirecting to donor dashboard...');
          navigate('/donor/dashboard');
        }, 2000);
      } else {
        const errorMsg = result?.message || 'Failed to create donation. Please try again.';
        console.error('❌ Donation failed:', errorMsg);
        setError(errorMsg);
        setSubmitting(false);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('❌ Submit error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code
      });
      setError(err.message || 'An error occurred. Please check your internet connection and try again.');
      setSubmitting(false);
    }
  };

  if (loading || loadingProfile || loadingRequest) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #ffffff 100%)',
      padding: '12px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    card: {
      background: 'white',
      borderRadius: '24px',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      maxWidth: '1400px',
      width: '100%',
      maxHeight: 'calc(100vh - 24px)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      background: 'linear-gradient(135deg, #06C167, #059669)',
      padding: '20px 30px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0
    },
    headerTitle: {
      fontSize: '28px',
      fontWeight: 800,
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    closeBtn: {
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      color: 'white',
      fontSize: '24px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s'
    },
    body: {
      padding: '20px 30px',
      overflowY: 'auto',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '14px',
      flex: 1
    },
    col2: {
      gridColumn: 'span 2'
    },
    col4: {
      gridColumn: 'span 4'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    label: {
      fontSize: '13px',
      fontWeight: 700,
      color: '#1f2937',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '4px',
      letterSpacing: '0.01em'
    },
    input: {
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.3s ease',
      background: '#fafafa',
      color: '#111827',
      fontWeight: 500,
      width: '100%',
      boxSizing: 'border-box'
    },
    inputFocus: {
      borderColor: '#06C167',
      background: 'white',
      boxShadow: '0 0 0 4px rgba(6, 193, 103, 0.15)',
      transform: 'translateY(-1px)'
    },
    getInputStyle: (fieldName, focusedField) => ({
      padding: '12px 16px',
      border: `2px solid ${focusedField === fieldName ? '#06C167' : '#e5e7eb'}`,
      borderRadius: '12px',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.3s ease',
      background: focusedField === fieldName ? 'white' : '#fafafa',
      color: '#111827',
      fontWeight: 500,
      width: '100%',
      boxSizing: 'border-box',
      boxShadow: focusedField === fieldName ? '0 0 0 4px rgba(6, 193, 103, 0.15)' : 'none',
      transform: focusedField === fieldName ? 'translateY(-1px)' : 'none'
    }),
    getSelectStyle: (fieldName, focusedField) => ({
      padding: '12px 16px',
      border: `2px solid ${focusedField === fieldName ? '#06C167' : '#e5e7eb'}`,
      borderRadius: '12px',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.3s ease',
      background: focusedField === fieldName ? 'white' : '#fafafa',
      cursor: 'pointer',
      color: '#111827',
      fontWeight: 500,
      width: '100%',
      boxSizing: 'border-box',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 16px center',
      paddingRight: '40px',
      boxShadow: focusedField === fieldName ? '0 0 0 4px rgba(6, 193, 103, 0.15)' : 'none',
      transform: focusedField === fieldName ? 'translateY(-1px)' : 'none'
    }),
    radioGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '4px'
    },
    radioOption: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      cursor: 'pointer',
      padding: '10px 16px',
      borderRadius: '12px',
      border: '2px solid #e5e7eb',
      transition: 'all 0.3s ease',
      background: '#fafafa',
      fontWeight: 600,
      color: '#6b7280',
      fontSize: '14px'
    },
    radioOptionSelected: {
      borderColor: '#06C167',
      background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
      color: '#059669',
      boxShadow: '0 4px 12px rgba(6, 193, 103, 0.2)',
      transform: 'translateY(-2px)'
    },
    categoryGroup: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
      marginTop: '4px'
    },
    categoryOption: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      padding: '16px',
      borderRadius: '14px',
      border: '2px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: '#fafafa',
      transition: 'all 0.3s',
      background: '#fafafa'
    },
    categoryOptionSelected: {
      borderColor: '#06C167',
      background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
      transform: 'scale(1.05)'
    },
    categoryIcon: {
      fontSize: '24px',
      color: '#06C167'
    },
    mapContainer: {
      height: '220px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '2px solid #e5e7eb'
    },
    imageUpload: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      padding: '16px',
      border: '2px dashed #e5e7eb',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      background: '#fafafa'
    },
    imagePreview: {
      width: '100%',
      maxHeight: '120px',
      objectFit: 'cover',
      borderRadius: '8px'
    },
    imageInput: {
      display: 'none'
    },
    button: {
      padding: '12px 28px',
      borderRadius: '12px',
      border: 'none',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: '15px',
      transition: 'all 0.3s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #06C167, #059669)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(6, 193, 103, 0.3)'
    },
    btnSecondary: {
      background: '#e5e7eb',
      color: '#374151'
    },
    footer: {
      padding: '16px 30px',
      background: '#f9fafb',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      flexShrink: 0
    },
    error: {
      padding: '10px 14px',
      background: '#fee2e2',
      color: '#991b1b',
      borderRadius: '8px',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    success: {
      padding: '10px 14px',
      background: '#d1fae5',
      color: '#065f46',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    linkedRequest: {
      padding: '12px',
      background: '#fffbeb',
      border: '2px solid #fbbf24',
      borderRadius: '10px',
      fontSize: '13px',
      color: '#92400e'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>
            <FaUtensils /> Food Donate
          </h1>
          <button
            onClick={() => navigate('/donor/dashboard')}
            style={styles.closeBtn}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {linkedRequest && (
            <div style={styles.linkedRequest}>
              <strong>📌 Supporting Request:</strong> {linkedRequest.food_type || linkedRequest.foodType} - {linkedRequest.organization_name || linkedRequest.organizationName || 'Organization'}
            </div>
          )}

          {error && (
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#991b1b',
              fontWeight: 600,
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
            }}>
              <span style={{ fontSize: '18px' }}>⚠️</span> {error}
            </div>
          )}

          {success && (
            <div style={{
              background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
              border: '2px solid #06C167',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#059669',
              fontWeight: 600,
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(6, 193, 103, 0.2)'
            }}>
              <span style={{ fontSize: '18px' }}>✅</span> Donation submitted successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={styles.formGrid}>
              {/* Food Name */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Food Name *</label>
                  <input
                    type="text"
                    name="food"
                    value={formData.food}
                    onChange={handleChange}
                    placeholder="e.g., Rice, Biryani, Burger"
                    required
                    style={styles.getInputStyle('food', focusedField)}
                    onFocus={() => setFocusedField('food')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              {/* Meal Type */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Meal Type *</label>
                  <div style={styles.radioGroup}>
                    <label
                      style={{
                        ...styles.radioOption,
                        ...(formData.type === 'veg' ? styles.radioOptionSelected : {})
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, type: 'veg' }))}
                    >
                      <input type="radio" name="type" value="veg" checked={formData.type === 'veg'} onChange={handleChange} style={{ display: 'none' }} />
                      🥗 Veg
                    </label>
                    <label
                      style={{
                        ...styles.radioOption,
                        ...(formData.type === 'non-veg' ? styles.radioOptionSelected : {})
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, type: 'non-veg' }))}
                    >
                      <input type="radio" name="type" value="non-veg" checked={formData.type === 'non-veg'} onChange={handleChange} style={{ display: 'none' }} />
                      🍗 Non-veg
                    </label>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div style={styles.col4}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Category *</label>
                  <div style={styles.categoryGroup}>
                    <div
                      style={{
                        ...styles.categoryOption,
                        ...(formData.category === 'raw-food' ? styles.categoryOptionSelected : {})
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, category: 'raw-food' }))}
                    >
                      <FaLeaf style={styles.categoryIcon} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Raw</span>
                    </div>
                    <div
                      style={{
                        ...styles.categoryOption,
                        ...(formData.category === 'cooked-food' ? styles.categoryOptionSelected : {})
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, category: 'cooked-food' }))}
                    >
                      <FaUtensils style={styles.categoryIcon} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Cooked</span>
                    </div>
                    <div
                      style={{
                        ...styles.categoryOption,
                        ...(formData.category === 'packed-food' ? styles.categoryOptionSelected : {})
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, category: 'packed-food' }))}
                    >
                      <FaBox style={styles.categoryIcon} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Packed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Quantity {linkedRequest ? '(people)' : '(people/kg)'} *</label>
                  {linkedRequest ? (
                    <>
                      <input
                        type="range"
                        min="1"
                        max={linkedRequest.remaining || 1}
                        value={formData.peopleServed}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setFormData(prev => ({ ...prev, peopleServed: value }));
                        }}
                        style={{
                          width: '100%',
                          height: '8px',
                          borderRadius: '4px',
                          background: '#e5e7eb',
                          outline: 'none',
                          cursor: 'pointer',
                          marginBottom: '8px'
                        }}
                      />
                      <input
                        type="number"
                        name="peopleServed"
                        value={formData.peopleServed}
                        onChange={(e) => {
                          const value = Math.max(1, Math.min(linkedRequest.remaining || 1, parseInt(e.target.value) || 1));
                          setFormData(prev => ({ ...prev, peopleServed: value }));
                        }}
                        min="1"
                        max={linkedRequest.remaining || 1}
                        required
                        style={styles.getInputStyle('peopleServed', focusedField)}
                        onFocus={() => setFocusedField('peopleServed')}
                        onBlur={() => setFocusedField(null)}
                      />
                      {linkedRequest.remaining !== undefined && (
                        <p style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                          You can support up to <strong>{linkedRequest.remaining} people</strong> for this request.
                        </p>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="e.g., 50 kg, 100 people"
                      required
                      style={styles.getInputStyle('quantity', focusedField)}
                      onFocus={() => setFocusedField('quantity')}
                      onBlur={() => setFocusedField(null)}
                    />
                  )}
                </div>
              </div>

              {/* Name */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Your Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    required
                    style={styles.getInputStyle('name', focusedField)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              {/* Phone */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Phone (11 digits) *</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="01XXXXXXXXX"
                    maxLength={11}
                    pattern="[0-9]{11}"
                    required
                    style={styles.getInputStyle('phone', focusedField)}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                  />
                  />
                </div>
              </div>

              {/* Division */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><FaMapMarkerAlt /> Division</label>
                  <select
                    name="division"
                    value={formData.division}
                    onChange={handleChange}
                    style={styles.getSelectStyle('division', focusedField)}
                    onFocus={() => setFocusedField('division')}
                    onBlur={() => setFocusedField(null)}
                  >
                    <option value="">Select Division</option>
                    {divisions.map((div) => (
                      <option key={div.id || div.name} value={div.name}>
                        {div.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* District */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><FaMapMarkerAlt /> District</label>
                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    disabled={!formData.division}
                    style={{
                      ...styles.getSelectStyle('district', focusedField),
                      opacity: !formData.division ? 0.6 : 1,
                      cursor: !formData.division ? 'not-allowed' : 'pointer'
                    }}
                    onFocus={() => setFocusedField('district')}
                    onBlur={() => setFocusedField(null)}
                  >
                    <option value="">Select District</option>
                    {districts.map((dist) => (
                      <option key={dist.id || dist.name} value={dist.name}>
                        {dist.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Area */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><FaMapMarkerAlt /> Area / Location *</label>
                  <select
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    disabled={!formData.district}
                    required
                    style={{
                      ...styles.getSelectStyle('area', focusedField),
                      opacity: !formData.district ? 0.6 : 1,
                      cursor: !formData.district ? 'not-allowed' : 'pointer'
                    }}
                    onFocus={() => setFocusedField('area')}
                    onBlur={() => setFocusedField(null)}
                  >
                    <option value="">Select Area</option>
                    {areas.map((area) => (
                      <option key={area.id || area.name} value={area.name}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Full Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Road, Building, Block, etc."
                    required
                    style={styles.getInputStyle('food', focusedField)}
                    onFocus={() => setFocusedField('food')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              {/* Map */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>📍 Pickup Location</label>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    style={{
                      marginBottom: '8px',
                      padding: '8px 14px',
                      background: 'linear-gradient(135deg, #06C167, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      transition: 'all 0.3s',
                      boxShadow: '0 2px 8px rgba(6, 193, 103, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 193, 103, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(6, 193, 103, 0.3)';
                    }}
                  >
                    <FaCrosshairs /> Use My Current Location
                  </button>
                  <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
                    Click on map or drag the marker to set location
                  </p>
                  <div style={styles.mapContainer}>
                    {mapPosition && Array.isArray(mapPosition) && mapPosition.length === 2 && 
                     !isNaN(mapPosition[0]) && !isNaN(mapPosition[1]) && (
                      <MapContainer
                        center={mapPosition}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        whenReady={() => {
                          if (!mapReady) {
                            setMapReady(true);
                            console.log('Map ready, position:', mapPosition);
                          }
                        }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='© OpenStreetMap contributors'
                        />
                        <LocationMarker 
                          position={mapPosition} 
                          setPosition={(newPos) => {
                            console.log('Updating position from marker:', newPos);
                            if (Array.isArray(newPos) && newPos.length === 2 && 
                                typeof newPos[0] === 'number' && typeof newPos[1] === 'number') {
                              updateLocation(newPos[0], newPos[1]);
                            }
                          }} 
                        />
                      </MapContainer>
                    )}
                  </div>
                  {locationName && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '10px 14px', 
                      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', 
                      borderRadius: '10px',
                      border: '2px solid #86efac',
                      boxShadow: '0 2px 8px rgba(6, 193, 103, 0.1)'
                    }}>
                      <div style={{ fontSize: '14px', color: '#059669', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>📍</span>
                        <span>{locationName}</span>
                      </div>
                      {locationAddress && locationAddress !== locationName && (
                        <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5', paddingLeft: '26px' }}>
                          {locationAddress}
                        </div>
                      )}
                    </div>
                  )}
                  {!locationName && locationAddress && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '10px 14px', 
                      background: '#f0fdf4', 
                      borderRadius: '10px',
                      border: '1px solid #86efac'
                    }}>
                      <p style={{ fontSize: '12px', color: '#06C167', fontWeight: 600, margin: 0 }}>
                        📍 {locationAddress}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Upload */}
              <div style={styles.col2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Food Image</label>
                  <div
                    style={styles.imageUpload}
                    onClick={() => document.getElementById('imageInput')?.click()}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#06C167'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                  >
                    <input
                      id="imageInput"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={styles.imageInput}
                    />
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" style={styles.imagePreview} />
                    ) : (
                      <>
                        <FaImage style={{ fontSize: '32px', color: '#06C167' }} />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Click to upload image</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Donor Note */}
              {linkedRequest && (
                <div style={styles.col4}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Note (Optional)</label>
                    <textarea
                      name="donorNote"
                      value={formData.donorNote}
                      onChange={handleChange}
                      placeholder="Any additional information..."
                      rows="2"
                      style={{
                        ...styles.getInputStyle('donorNote', focusedField),
                        resize: 'vertical',
                        minHeight: '60px'
                      }}
                      onFocus={() => setFocusedField('donorNote')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            type="button"
            onClick={() => navigate('/donor/dashboard')}
            style={{ ...styles.button, ...styles.btnSecondary }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              console.log('🔘 Submit button clicked');
              handleSubmit(e);
            }}
            disabled={submitting}
            style={{
              ...styles.button,
              ...styles.btnPrimary,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
              position: 'relative'
            }}
          >
            {submitting ? (
              <>
                <FaSpinner className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> Submitting...
              </>
            ) : (
              <>
                <FaCheckCircle /> Submit Donation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateDonationPage;
