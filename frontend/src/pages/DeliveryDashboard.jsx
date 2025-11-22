/**
 * Delivery Dashboard - Complete Delivery Person Dashboard
 * FeedHope Frontend - Delivery Dashboard Screen
 * Professional modern design with navbar, profile section, and tabs
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { auth, db } from '../firebase/config';
import { format } from 'date-fns';
import { 
  FaCheckCircle, 
  FaSpinner, 
  FaMapMarkerAlt, 
  FaPhone, 
  FaUser, 
  FaClock, 
  FaMotorcycle, 
  FaExclamationTriangle,
  FaHeart,
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaHome,
  FaTruck,
  FaUtensils,
  FaGift,
  FaRoute,
  FaHandHoldingHeart
} from 'react-icons/fa';
import { acceptAsDelivery, markDelivered } from '../services/firebaseFood';
import { logoutUser } from '../services/firebaseAuth';
import OrderTrackingModal from '../components/OrderTrackingModal';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons for pickup and delivery
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  
  // Data state
  const [pendingOrders, setPendingOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  
  // Action state
  const [actioning, setActioning] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDeliveredModal, setShowDeliveredModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeOrder, setRouteOrder] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [acceptedOrder, setAcceptedOrder] = useState(null);
  const [acceptedOrderRouteData, setAcceptedOrderRouteData] = useState(null);
  const [loadingAcceptedRoute, setLoadingAcceptedRoute] = useState(false);
  
  // Navigation state
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'myOrders'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load route data when routeOrder is set
  useEffect(() => {
    if (routeOrder && showRouteModal) {
      const pickupLat = parseFloat(routeOrder.pickup_latitude || routeOrder.pickupLatitude);
      const pickupLng = parseFloat(routeOrder.pickup_longitude || routeOrder.pickupLongitude);
      const deliveryLat = parseFloat(routeOrder.deliveryLatitude || routeOrder.delivery_latitude);
      const deliveryLng = parseFloat(routeOrder.deliveryLongitude || routeOrder.delivery_longitude);

      if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
        loadRouteData(pickupLat, pickupLng, deliveryLat, deliveryLng);
      }
    }
  }, [routeOrder, showRouteModal]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadUserProfile();
      loadOrders();
      
      // Set up real-time listener for relevant orders only
      // Listen to available and pending orders (where volunteer might accept)
      let unsubscribe1, unsubscribe2;
      
      try {
        // Listen to available orders
        const availableQuery = query(
          collection(db, 'food_donations'),
          where('status', '==', 'available'),
          limit(50)
        );
        
        unsubscribe1 = onSnapshot(
          availableQuery,
          (snapshot) => {
            console.log('🔄 [REALTIME] Available orders updated:', snapshot.size);
            loadOrders();
          },
          (error) => {
            console.error('❌ [REALTIME] Available orders listener error:', error);
          }
        );

        // Listen to pending orders (volunteer-accepted)
        const pendingQuery = query(
          collection(db, 'food_donations'),
          where('status', '==', 'pending'),
          limit(50)
        );
        
        unsubscribe2 = onSnapshot(
          pendingQuery,
          (snapshot) => {
            console.log('🔄 [REALTIME] Pending orders updated:', snapshot.size);
            loadOrders();
          },
          (error) => {
            console.error('❌ [REALTIME] Pending orders listener error:', error);
          }
        );
      } catch (err) {
        console.warn('⚠️ Real-time listeners not available (index might be missing), using polling instead');
      }

      // Cleanup listeners on unmount
      return () => {
        if (unsubscribe1) unsubscribe1();
        if (unsubscribe2) unsubscribe2();
      };
    }
  }, [user, loading]);

  const loadUserProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'delivery') {
          const deliveryDoc = await getDoc(doc(db, 'delivery_persons', user.uid));
          if (deliveryDoc.exists()) {
            setUserProfile({ id: deliveryDoc.id, ...deliveryDoc.data(), email: user.email });
          } else {
            setUserProfile({ ...userData, email: user.email });
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadOrders = async () => {
    setLoadingData(true);
    try {
      // MODERN FOOD DONATION SYSTEM - DELIVERY ORDER QUERY
      // Strategy: Fetch ALL relevant orders and filter client-side for maximum flexibility
      
      console.log('🚚 Loading delivery orders for:', userProfile?.name || user?.email);
      
      // Get ALL orders that could be available for delivery:
      // 1. status='available' AND admin_approved_by exists (admin approved, waiting for volunteer/delivery)
      // 2. status='pending' AND volunteerId exists (volunteer accepted, waiting for delivery)
      // 3. NOT already assigned (deliveryPersonId is null)
      
      // Query 1: Available orders (admin approved, no volunteer yet)
      let availableQuery;
      try {
        availableQuery = query(
          collection(db, 'food_donations'),
          where('status', '==', 'available'),
          limit(200)
        );
      } catch (err) {
        console.error('Query error:', err);
        availableQuery = query(
          collection(db, 'food_donations'),
          limit(200)
        );
      }

      // Query 2: Pending orders (could be volunteer-accepted or just pending)
      let pendingQuery;
      try {
        pendingQuery = query(
          collection(db, 'food_donations'),
          where('status', '==', 'pending'),
          limit(200)
        );
      } catch (err) {
        console.error('Query error:', err);
        pendingQuery = query(
          collection(db, 'food_donations'),
          limit(200)
        );
      }

      const [availableSnapshot, pendingSnapshot] = await Promise.all([
        getDocs(availableQuery),
        getDocs(pendingQuery)
      ]);
      
      console.log('📊 Query Results:', {
        available: availableSnapshot.size,
        pending: pendingSnapshot.size
      });

      const pending = [];
      const orderIds = new Set(); // Track IDs to avoid duplicates

      // Process available orders (status='available')
      availableSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const orderId = docSnap.id;
        
        // Skip if already added
        if (orderIds.has(orderId)) return;
        
        // Only include admin-approved orders
        if (!data.admin_approved_by) return;
        
        // Skip if already accepted by volunteer (will be in pending query)
        if (data.volunteerId) return;
        
        // Skip if already assigned to delivery person
        if (data.deliveryPersonId || data.assigned_to) return;
        
        // Location matching (flexible)
        const deliveryArea = userProfile?.area || userProfile?.location || '';
        const orderArea = data.area || data.location || data.deliveryArea || '';
        
        // Include if: no delivery area set, or areas match, or order has no area
        const orderAreaLower = (orderArea || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const deliveryAreaLower = (deliveryArea || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const shouldInclude = !deliveryArea || !orderArea || 
                              orderAreaLower.includes(deliveryAreaLower) || 
                              deliveryAreaLower.includes(orderAreaLower);
        
        if (shouldInclude) {
          let orderDate;
          if (data.date?.toDate) {
            orderDate = data.date.toDate();
          } else if (data.createdAt?.toDate) {
            orderDate = data.createdAt.toDate();
          } else {
            orderDate = new Date();
          }

          pending.push({
            id: orderId,
            ...data,
            date: orderDate,
            source: 'available',
            priority: 1 // Available orders have lower priority
          });
          orderIds.add(orderId);
          console.log('✅ [AVAILABLE] Added order:', orderId, data.food || data.foodName);
        }
      });

      // Process pending orders (status='pending') - FOCUS ON VOLUNTEER-ACCEPTED ORDERS
      pendingSnapshot.forEach((docSnap) => {
        const orderId = docSnap.id;
        
        // Skip if already added
        if (orderIds.has(orderId)) return;

        const data = docSnap.data();
        
        // CRITICAL: Only include orders with volunteerId (volunteer has accepted)
        if (!data.volunteerId) {
          return; // Skip pending orders without volunteerId
        }
        
        // Skip if already assigned to delivery person
        if (data.deliveryPersonId || data.assigned_to) {
          return;
        }
        
        // Skip if not admin-approved (shouldn't happen, but safety check)
        if (!data.admin_approved_by) {
          return;
        }
        
        // Location matching (flexible - show delivery location if set, else pickup location)
        const deliveryArea = userProfile?.area || userProfile?.location || '';
        const orderDeliveryArea = data.deliveryArea || data.delivery_address_full || '';
        const orderPickupArea = data.area || data.location || '';
        const matchArea = orderDeliveryArea || orderPickupArea;
        
        const orderAreaLower = (matchArea || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const deliveryAreaLower = (deliveryArea || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Include volunteer-accepted orders (they need delivery urgently)
        const shouldInclude = !deliveryArea || !matchArea || 
                              orderAreaLower.includes(deliveryAreaLower) || 
                              deliveryAreaLower.includes(orderAreaLower);
        
        if (shouldInclude) {
          // Use volunteer accepted date if available
          let orderDate;
          if (data.volunteerAcceptedAt?.toDate) {
            orderDate = data.volunteerAcceptedAt.toDate();
          } else if (data.date?.toDate) {
            orderDate = data.date.toDate();
          } else if (data.createdAt?.toDate) {
            orderDate = data.createdAt.toDate();
          } else {
            orderDate = new Date();
          }

          pending.push({
            id: orderId,
            ...data,
            date: orderDate,
            source: 'volunteer_accepted',
            priority: 2 // Volunteer-accepted orders have higher priority
          });
          orderIds.add(orderId);
          console.log('✅ [VOLUNTEER-ACCEPTED] Added order:', orderId, data.food || data.foodName, 'volunteerId:', data.volunteerId);
        }
      });
      
      // Sort by priority (volunteer-accepted first), then by date (newest first)
      pending.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.date - a.date;
      });

      console.log('📦 FINAL RESULTS:', {
        total: pending.length,
        available: pending.filter(p => p.source === 'available').length,
        volunteerAccepted: pending.filter(p => p.source === 'volunteer_accepted').length,
        orders: pending.map(p => ({
          id: p.id,
          food: p.food || p.foodName,
          status: p.status,
          volunteerId: p.volunteerId,
          source: p.source
        }))
      });

      setPendingOrders(pending);

      // Load my orders (ongoing and assigned)
      const myOrdersQuery = query(
        collection(db, 'food_donations'),
        where('deliveryPersonId', '==', user.uid),
        orderBy('deliveryAcceptedAt', 'desc'),
        limit(50)
      );

      try {
        const myOrdersSnapshot = await getDocs(myOrdersQuery);
        const my = [];

        myOrdersSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          my.push({
            id: docSnap.id,
            ...data,
            date: data.date?.toDate ? data.date.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
          });
        });

        // Also check by status='ongoing' and deliveryPersonId
        const ongoingQuery = query(
          collection(db, 'food_donations'),
          where('status', '==', 'ongoing'),
          where('deliveryPersonId', '==', user.uid),
          orderBy('deliveryAcceptedAt', 'desc'),
          limit(50)
        );

        try {
          const ongoingSnapshot = await getDocs(ongoingQuery);
          ongoingSnapshot.forEach((docSnap) => {
            const exists = my.find(o => o.id === docSnap.id);
            if (!exists) {
              const data = docSnap.data();
              my.push({
                id: docSnap.id,
                ...data,
                date: data.date?.toDate ? data.date.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
              });
            }
          });
        } catch (err) {
          // Fallback: query all and filter client-side
          const allQuery = query(collection(db, 'food_donations'), where('status', '==', 'ongoing'), limit(100));
          const allSnapshot = await getDocs(allQuery);
          allSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.deliveryPersonId === user.uid) {
              const exists = my.find(o => o.id === docSnap.id);
              if (!exists) {
                my.push({
                  id: docSnap.id,
                  ...data,
                  date: data.date?.toDate ? data.date.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
                });
              }
            }
          });
        }

        setMyOrders(my);
      } catch (err) {
        console.error('Error loading my orders:', err);
        // Fallback: query all and filter
        const allQuery = query(collection(db, 'food_donations'), limit(200));
        const allSnapshot = await getDocs(allQuery);
        const my = [];
        allSnapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if ((data.deliveryPersonId === user.uid || data.assigned_to === user.uid) && 
              (data.status === 'ongoing' || data.status === 'assigned' || data.status === 'delivered')) {
            my.push({
              id: docSnap.id,
              ...data,
              date: data.date?.toDate ? data.date.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
            });
          }
        });
        setMyOrders(my);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to accept this delivery order?')) {
      return;
    }

    setActioning(true);
    try {
      const result = await acceptAsDelivery(orderId);
      
      if (result.success) {
        // Reload orders to get updated data
        await loadOrders();
        
        // Get the updated order with all details
        const orderRef = doc(db, 'food_donations', orderId);
        const updatedDoc = await getDoc(orderRef);
        
        if (updatedDoc.exists()) {
          const updatedOrder = {
            id: updatedDoc.id,
            ...updatedDoc.data(),
            date: updatedDoc.data().date?.toDate?.() || updatedDoc.data().createdAt?.toDate?.() || new Date()
          };
          
          // Set accepted order and show details modal
          setAcceptedOrder(updatedOrder);
          setShowOrderDetailsModal(true);
          
          // Load route data if coordinates are available
          const pickupLat = parseFloat(updatedOrder.pickup_latitude || updatedOrder.pickupLatitude);
          const pickupLng = parseFloat(updatedOrder.pickup_longitude || updatedOrder.pickupLongitude);
          const deliveryLat = parseFloat(updatedOrder.deliveryLatitude || updatedOrder.delivery_latitude);
          const deliveryLng = parseFloat(updatedOrder.deliveryLongitude || updatedOrder.delivery_longitude);
          
          if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
            loadAcceptedOrderRoute(pickupLat, pickupLng, deliveryLat, deliveryLng);
          }
        } else {
          alert('Order accepted! You can now deliver it.');
        }
      } else {
        alert(result.message || 'Failed to accept order. It may have been accepted by someone else.');
      }
    } catch (error) {
      console.error('Accept order error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setActioning(false);
    }
  };

  // Load route data for route modal - Shows actual road path
  const loadRouteData = async (pickupLat, pickupLng, deliveryLat, deliveryLng) => {
    setLoadingRoute(true);
    setRouteData(null); // Reset route data
    try {
      // Use OSRM API to get actual driving route through roads (shows real road path)
      const url = `https://router.projectosrm.org/route/v1/driving/${pickupLng},${pickupLat};${deliveryLng},${deliveryLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('🗺️ Route API Response:', data);
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Convert GeoJSON coordinates from [lng, lat] to [lat, lng] for Leaflet
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        const distance = (route.distance / 1000).toFixed(2); // Convert meters to km
        const duration = Math.round(route.duration / 60); // Convert seconds to minutes
        
        console.log('✅ Route loaded:', {
          coordinatesCount: coordinates.length,
          distance: `${distance} km`,
          duration: `${duration} min`
        });
        
        setRouteData({
          coordinates,
          distance,
          duration
        });
      } else {
        console.error('❌ Route API Error:', data);
      }
    } catch (error) {
      console.error('❌ Error loading route:', error);
    } finally {
      setLoadingRoute(false);
    }
  };

  // Load route data for accepted order
  const loadAcceptedOrderRoute = async (pickupLat, pickupLng, deliveryLat, deliveryLng) => {
    setLoadingAcceptedRoute(true);
    try {
      const url = `https://router.projectosrm.org/route/v1/driving/${pickupLng},${pickupLat};${deliveryLng},${deliveryLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
        const distance = (route.distance / 1000).toFixed(2); // Convert to km
        const duration = Math.round(route.duration / 60); // Convert to minutes
        
        setAcceptedOrderRouteData({
          coordinates,
          distance,
          duration
        });
      }
    } catch (error) {
      console.error('Error loading route:', error);
    } finally {
      setLoadingAcceptedRoute(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!selectedOrder) return;

    setActioning(true);
    try {
      const result = await markDelivered(selectedOrder.id);
      
      if (result.success) {
        alert('Delivery completed! Order has been handed over. Status changed to "Delivered". Thank you for your service.');
        setShowDeliveredModal(false);
        setSelectedOrder(null);
        await loadOrders();
      } else {
        alert(result.message || 'Failed to mark as delivered.');
      }
    } catch (error) {
      console.error('Mark delivered error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setActioning(false);
    }
  };

  const openDeliveredModal = (order) => {
    setSelectedOrder(order);
    setShowDeliveredModal(true);
  };

  const closeDeliveredModal = () => {
    setShowDeliveredModal(false);
    setSelectedOrder(null);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  // Stats
  const stats = {
    pending: pendingOrders.length,
    myActive: myOrders.filter(o => o.status === 'ongoing' || o.status === 'assigned').length,
    myDelivered: myOrders.filter(o => o.status === 'delivered').length,
    totalMy: myOrders.length
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)',
      paddingBottom: '40px'
    },
    topBar: {
      background: 'linear-gradient(135deg, #06C167 0%, #059669 100%)',
      color: 'white',
      padding: '12px 30px',
      boxShadow: '0 2px 10px rgba(6, 193, 103, 0.2)',
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
      color: '#06C167',
      background: '#ecfdf5'
    },
    navLinkHover: {
      color: '#06C167',
      background: '#ecfdf5'
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
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
    },
    feedTabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      borderBottom: '2px solid #e5e7eb',
      paddingBottom: '0'
    },
    feedTab: {
      padding: '12px 24px',
      background: 'transparent',
      border: 'none',
      borderBottom: '3px solid transparent',
      color: '#6b7280',
      fontWeight: 600,
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    feedTabActive: {
      color: '#06C167',
      borderBottomColor: '#06C167',
      background: '#ecfdf5'
    },
    ordersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '20px',
      marginTop: '24px'
    },
    orderCard: {
      background: 'linear-gradient(135deg, #f0fdf4, #ffffff)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
      borderLeft: '4px solid #06C167',
      transition: 'all 0.3s'
    },
    orderCardMy: {
      background: 'linear-gradient(135deg, #eff6ff, #ffffff)',
      borderLeftColor: '#3b82f6'
    },
    orderImage: {
      width: '100%',
      height: '200px',
      objectFit: 'cover',
      borderRadius: '12px',
      marginBottom: '16px',
      background: 'linear-gradient(135deg, #e6fff3, #d1fae5)'
    },
    orderHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '16px'
    },
    orderTitle: {
      fontSize: '20px',
      fontWeight: 700,
      color: '#111827',
      margin: 0
    },
    orderMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      marginBottom: '16px',
      fontSize: '14px',
      color: '#6b7280'
    },
    orderMetaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    actionButtons: {
      display: 'flex',
      gap: '12px',
      marginTop: '16px'
    },
    btnAccept: {
      background: 'linear-gradient(135deg, #06C167, #059669)',
      color: 'white',
      width: '100%'
    },
    btnDelivered: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: 'white',
      width: '100%'
    },
    btnClose: {
      background: '#e5e7eb',
      color: '#374151'
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
      maxWidth: '500px',
      width: '100%',
      padding: '24px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '4rem 2rem',
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
      lineHeight: '1.6'
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
        <FaSpinner className="spinner" style={{ fontSize: '48px', color: '#06C167' }} />
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
            onClick={() => setActiveTab('available')}
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
                  {userProfile?.name || user?.displayName || 'Delivery Person'}
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
              onClick={() => { setActiveTab('available'); setMobileMenuOpen(false); }}
              style={{
                ...styles.navLink,
                ...(activeTab === 'available' ? styles.navLinkActive : {})
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'available') {
                  Object.assign(e.currentTarget.style, {
                    color: styles.navLinkHover.color,
                    background: styles.navLinkHover.background
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'available') {
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
              onClick={() => { setActiveTab('myOrders'); setMobileMenuOpen(false); }}
              style={{
                ...styles.navLink,
                ...(activeTab === 'myOrders' ? styles.navLinkActive : {})
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'myOrders') {
                  Object.assign(e.currentTarget.style, {
                    color: styles.navLinkHover.color,
                    background: styles.navLinkHover.background
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'myOrders') {
                  Object.assign(e.currentTarget.style, {
                    color: styles.navLink.color,
                    background: styles.navLink.background
                  });
                }
              }}
            >
              <FaTruck /> My Orders
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
              onClick={() => { setActiveTab('available'); setMobileMenuOpen(false); }}
              style={{
                ...styles.navLink,
                ...(activeTab === 'available' ? styles.navLinkActive : {}),
                width: '100%',
                justifyContent: 'flex-start'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'available') {
                  Object.assign(e.currentTarget.style, {
                    color: styles.navLinkHover.color,
                    background: styles.navLinkHover.background
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'available') {
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
              onClick={() => { setActiveTab('myOrders'); setMobileMenuOpen(false); }}
              style={{
                ...styles.navLink,
                ...(activeTab === 'myOrders' ? styles.navLinkActive : {}),
                width: '100%',
                justifyContent: 'flex-start'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'myOrders') {
                  Object.assign(e.currentTarget.style, {
                    color: styles.navLinkHover.color,
                    background: styles.navLinkHover.background
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'myOrders') {
                  Object.assign(e.currentTarget.style, {
                    color: styles.navLink.color,
                    background: styles.navLink.background
                  });
                }
              }}
            >
              <FaTruck /> My Orders
            </button>
            <button
              onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}
              style={{ ...styles.navLink, width: '100%', justifyContent: 'flex-start' }}
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
        )}
      </div>

      <div style={styles.content}>
        {/* Welcome Card */}
        <div style={styles.welcomeCard}>
          <h1 style={styles.welcomeTitle}>
            Welcome back, {userProfile?.name || 'Delivery Person'}! 🚚
          </h1>
          <p style={styles.welcomeSubtitle}>
            Accept delivery orders and help connect food with those in need.
          </p>

          {/* Stats Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.pending}</div>
              <div style={styles.statLabel}>Available Orders</div>
            </div>
            <div style={{ ...styles.statCard, borderLeftColor: '#3b82f6' }}>
              <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.myActive}</div>
              <div style={styles.statLabel}>Active Orders</div>
            </div>
            <div style={{ ...styles.statCard, borderLeftColor: '#10b981' }}>
              <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.myDelivered}</div>
              <div style={styles.statLabel}>Delivered</div>
            </div>
            <div style={{ ...styles.statCard, borderLeftColor: '#8b5cf6' }}>
              <div style={{ ...styles.statValue, color: '#8b5cf6' }}>{stats.totalMy}</div>
              <div style={styles.statLabel}>Total Orders</div>
            </div>
          </div>
        </div>

        {/* Feed Section */}
        <div style={styles.feedSection}>
          {/* Tabs */}
          <div style={styles.feedTabs}>
            <button
              onClick={() => setActiveTab('available')}
              style={{
                ...styles.feedTab,
                ...(activeTab === 'available' ? styles.feedTabActive : {})
              }}
            >
              <FaUtensils /> Available Orders ({pendingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('myOrders')}
              style={{
                ...styles.feedTab,
                ...(activeTab === 'myOrders' ? styles.feedTabActive : {})
              }}
            >
              <FaTruck /> My Orders ({stats.totalMy})
            </button>
          </div>

          {/* Available Orders Tab */}
          {activeTab === 'available' && (
            <div>
              {pendingOrders.length === 0 ? (
                <div style={styles.emptyState}>
                  <FaExclamationTriangle style={styles.emptyIcon} />
                  <h3 style={styles.emptyTitle}>No available orders</h3>
                  <p style={styles.emptyText}>
                    No available orders in your area at the moment. Orders will appear here when volunteers accept donations.
                  </p>
                  {userProfile && !userProfile.area && !userProfile.location && (
                    <p style={{ marginTop: '20px', fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>
                      💡 Tip: Update your profile with your delivery area to see more orders.
                    </p>
                  )}
                </div>
              ) : (
                <div style={styles.ordersGrid}>
                  {pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      style={styles.orderCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                      }}
                    >
                      {order.food_image && (
                        <img
                          src={order.food_image}
                          alt={order.food || order.foodName}
                          style={styles.orderImage}
                        />
                      )}
                      {!order.food_image && (
                        <div style={{
                          ...styles.orderImage,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #e6fff3, #d1fae5)',
                          color: '#06C167',
                          fontSize: '48px'
                        }}>
                          <FaUtensils />
                        </div>
                      )}

                      <div style={styles.orderHeader}>
                        <h3 style={styles.orderTitle}>{order.food || order.foodName}</h3>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: order.status === 'pending' && order.volunteerId ? '#fef3c7' : '#dbeafe',
                          color: order.status === 'pending' && order.volunteerId ? '#92400e' : '#1e40af'
                        }}>
                          {order.status === 'pending' && order.volunteerId ? 'Pending Delivery' : 'Available'}
                        </span>
                      </div>

                      <div style={styles.orderMeta}>
                        <div 
                          style={{ ...styles.orderMetaItem, cursor: 'pointer', color: '#06C167' }}
                          onClick={() => {
                            const donorId = order.donorId || order.userId;
                            if (donorId) {
                              navigate(`/profile/${donorId}?role=donor`);
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#06C167';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#6b7280';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          <FaUser style={{ color: '#06C167' }} />
                          <strong>Donor:</strong> <span style={{ color: '#06C167', fontWeight: 600 }}>{order.name || 'Anonymous'}</span>
                        </div>
                        <div style={styles.orderMetaItem}>
                          <FaMapMarkerAlt style={{ color: '#06C167' }} />
                          {order.location || order.area || 'Location'}
                        </div>
                        {order.delivery_address_full && (
                          <div style={styles.orderMetaItem}>
                            <FaMapMarkerAlt style={{ color: '#f59e0b' }} />
                            Delivery: {order.delivery_address_full}
                          </div>
                        )}
                        <div style={styles.orderMetaItem}>
                          <FaClock style={{ color: '#6b7280' }} />
                          {format(order.date, 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Type:</strong> {order.type || order.foodType} | <strong>Category:</strong> {order.category}
                      </div>
                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Quantity:</strong> {order.quantity}
                      </div>

                      {/* Order Details Card - Simple & Clickable - Show if delivery person has accepted */}
                      {(order.deliveryPersonId === user?.uid || order.assigned_to === user?.uid || order.delivery_by === user?.uid) && (
                        <div
                          onClick={() => {
                            setAcceptedOrder(order);
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

                      {/* View Route Button - Only show if not accepted */}
                      {!(order.deliveryPersonId === user?.uid || order.assigned_to === user?.uid) && 
                       (order.pickup_latitude && order.pickup_longitude && 
                        (order.deliveryLatitude || order.delivery_latitude) && 
                        (order.deliveryLongitude || order.delivery_longitude)) && (
                        <button
                          onClick={() => {
                            setRouteOrder(order);
                            setShowRouteModal(true);
                          }}
                          style={{
                            ...styles.btn,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: 'white',
                            width: '100%',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <FaRoute /> View Route on Map
                        </button>
                      )}

                      {/* Accept Button - Only show if not already accepted */}
                      {!(order.deliveryPersonId === user?.uid || order.assigned_to === user?.uid || order.delivery_by === user?.uid) && (
                        <button
                          onClick={() => handleAcceptOrder(order.id)}
                          disabled={actioning}
                          style={{
                            ...styles.btn,
                            ...styles.btnAccept,
                            width: '100%',
                            opacity: actioning ? 0.6 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!actioning) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 193, 103, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {actioning ? (
                            <>
                              <FaSpinner className="spinner" /> Processing...
                            </>
                          ) : (
                            <>
                              <FaCheckCircle /> Accept Order
                            </>
                          )}
                        </button>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Orders Tab */}
          {activeTab === 'myOrders' && (
            <div>
              {myOrders.length === 0 ? (
                <div style={styles.emptyState}>
                  <FaMotorcycle style={styles.emptyIcon} />
                  <h3 style={styles.emptyTitle}>No orders yet</h3>
                  <p style={styles.emptyText}>
                    You haven't accepted any delivery orders yet. Check the "Available Orders" tab to find orders to deliver.
                  </p>
                </div>
              ) : (
                <div style={styles.ordersGrid}>
                  {myOrders.map((order) => (
                    <div
                      key={order.id}
                      style={{ ...styles.orderCard, ...styles.orderCardMy }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                      }}
                    >
                      {order.food_image && (
                        <img
                          src={order.food_image}
                          alt={order.food || order.foodName}
                          style={styles.orderImage}
                        />
                      )}
                      {!order.food_image && (
                        <div style={{
                          ...styles.orderImage,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                          color: '#3b82f6',
                          fontSize: '48px'
                        }}>
                          <FaUtensils />
                        </div>
                      )}

                      <div style={styles.orderHeader}>
                        <h3 style={styles.orderTitle}>{order.food || order.foodName}</h3>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: order.status === 'delivered' ? '#d1fae5' : '#e0e7ff',
                          color: order.status === 'delivered' ? '#065f46' : '#4338ca'
                        }}>
                          {order.status === 'delivered' ? 'Delivered' : 'On-going'}
                        </span>
                      </div>

                      <div style={styles.orderMeta}>
                        <div 
                          style={{ ...styles.orderMetaItem, cursor: 'pointer', color: '#3b82f6' }}
                          onClick={() => {
                            const donorId = order.donorId || order.userId;
                            if (donorId) {
                              navigate(`/profile/${donorId}?role=donor`);
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#3b82f6';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#6b7280';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          <FaUser style={{ color: '#3b82f6' }} />
                          <strong>Donor:</strong> <span style={{ color: '#3b82f6', fontWeight: 600 }}>{order.name || 'Anonymous'}</span>
                        </div>
                        <div style={styles.orderMetaItem}>
                          <FaMapMarkerAlt style={{ color: '#3b82f6' }} />
                          {order.location || order.area || 'Location'}
                        </div>
                        {order.delivery_address_full && (
                          <div style={styles.orderMetaItem}>
                            <FaMapMarkerAlt style={{ color: '#f59e0b' }} />
                            Delivery: {order.delivery_address_full}
                          </div>
                        )}
                        <div style={styles.orderMetaItem}>
                          <FaClock style={{ color: '#6b7280' }} />
                          {format(order.date, 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Type:</strong> {order.type || order.foodType} | <strong>Category:</strong> {order.category}
                      </div>
                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Quantity:</strong> {order.quantity}
                      </div>

                      {/* Track Order Button */}
                      <button
                        onClick={() => {
                          setTrackingOrder(order);
                          setShowTrackingModal(true);
                        }}
                        style={{
                          ...styles.btn,
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          color: 'white',
                          width: '100%',
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
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

                      {order.status !== 'delivered' && (
                        <button
                          onClick={() => openDeliveredModal(order)}
                          disabled={actioning}
                          style={{
                            ...styles.btn,
                            ...styles.btnDelivered,
                            width: '100%',
                            opacity: actioning ? 0.6 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!actioning) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <FaHandHoldingHeart /> Hand Over
                        </button>
                      )}
                      {order.status === 'delivered' && (
                        <div style={{
                          padding: '12px',
                          background: '#d1fae5',
                          borderRadius: '8px',
                          textAlign: 'center',
                          color: '#065f46',
                          fontWeight: 600,
                          marginTop: '16px'
                        }}>
                          ✅ Delivered Successfully
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

      {/* Delivered Confirmation Modal */}
      {showDeliveredModal && selectedOrder && (
        <div style={styles.modal} onClick={closeDeliveredModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0, marginBottom: '20px', color: '#111827' }}>Hand Over Delivery</h2>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>
              Have you successfully handed over <strong>{selectedOrder.food}</strong> to the recipient? This will mark the delivery as complete.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={closeDeliveredModal} style={{ ...styles.btn, ...styles.btnClose }}>
                Cancel
              </button>
              <button
                onClick={handleMarkDelivered}
                disabled={actioning}
                style={{
                  ...styles.btn,
                  ...styles.btnDelivered,
                  opacity: actioning ? 0.6 : 1
                }}
              >
                {actioning ? (
                  <>
                    <FaSpinner className="spinner" /> Processing...
                  </>
                ) : (
                  <>
                    <FaHandHoldingHeart /> Hand Over (Complete Delivery)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Route Modal - Foodpanda Style (Left: Details, Right: Map) */}
      {showRouteModal && routeOrder && (() => {
        const pickupLat = parseFloat(routeOrder.pickup_latitude || routeOrder.pickupLatitude);
        const pickupLng = parseFloat(routeOrder.pickup_longitude || routeOrder.pickupLongitude);
        const deliveryLat = parseFloat(routeOrder.deliveryLatitude || routeOrder.delivery_latitude);
        const deliveryLng = parseFloat(routeOrder.deliveryLongitude || routeOrder.delivery_longitude);

        if (!pickupLat || !pickupLng || !deliveryLat || !deliveryLng) {
          return null;
        }

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }} onClick={() => {
            setShowRouteModal(false);
            setRouteData(null);
            setRouteOrder(null);
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '1200px',
              height: '90vh',
              maxHeight: '800px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 70px rgba(0,0,0,0.5)'
            }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #06C167, #059669)',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'white'
              }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaRoute /> Delivery Route
                </h2>
                <button
                  onClick={() => {
                    setShowRouteModal(false);
                    setRouteData(null);
                    setRouteOrder(null);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  }}
                >
                  <FaTimes />
                </button>
              </div>

              {/* Content - Split Layout */}
              <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden'
              }}>
                {/* Left Panel - Order Details */}
                <div style={{
                  width: '400px',
                  flexShrink: 0,
                  background: 'white',
                  borderRight: '1px solid #e5e7eb',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Order Info Card */}
                  <div style={{
                    padding: '24px',
                    borderBottom: '1px solid #e5e7eb'
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
                          {routeOrder.phoneno || routeOrder.phone || 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                        <FaClock style={{ fontSize: '14px' }} />
                        <span style={{ fontSize: '14px' }}>
                          {format(routeOrder.date || routeOrder.createdAt?.toDate?.() || new Date(), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        <strong>Type:</strong> {routeOrder.type || routeOrder.foodType || 'N/A'} | <strong>Category:</strong> {routeOrder.category || 'N/A'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        <strong>Quantity:</strong> {routeOrder.quantity} {routeOrder.quantity_unit || 'servings'}
                      </div>
                    </div>
                  </div>

                  {/* Route Stats */}
                  {routeData && (
                    <div style={{
                      padding: '20px 24px',
                      background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                      borderBottom: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-around',
                      gap: '20px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>Estimated Time</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#06C167' }}>
                          {routeData.duration ? `${routeData.duration} min` : 'Calculating...'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>Distance</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#06C167' }}>
                          {routeData.distance} km
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FROM/TO Addresses */}
                  <div style={{
                    padding: '24px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <div style={{ marginBottom: '20px' }}>
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
                        {routeOrder.pickup_address_full || routeOrder.address || routeOrder.location || routeOrder.area || 'Pickup Location'}
                      </div>
                    </div>

                    <div style={{
                      height: '1px',
                      background: '#e5e7eb',
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
                        {routeOrder.deliveryAddressFull || routeOrder.delivery_address_full || routeOrder.deliveryAddress || 'Delivery Location'}
                      </div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div style={{
                    padding: '24px',
                    marginTop: 'auto'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #06C167, #059669)',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      boxShadow: '0 4px 12px rgba(6, 193, 103, 0.3)'
                    }}>
                      {routeOrder.food_image ? (
                        <img
                          src={routeOrder.food_image}
                          alt={routeOrder.food || routeOrder.foodName}
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
                          {routeOrder.food || routeOrder.foodName}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
                          {routeOrder.type || routeOrder.foodType || 'N/A'} • {routeOrder.quantity} {routeOrder.quantity_unit || 'servings'}
                        </div>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>
                          {routeOrder.category || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Accept Button */}
                    {!(routeOrder.deliveryPersonId === user?.uid || routeOrder.assigned_to === user?.uid) && (
                      <button
                        onClick={() => {
                          handleAcceptOrder(routeOrder.id);
                          setShowRouteModal(false);
                          setRouteData(null);
                          setRouteOrder(null);
                        }}
                        disabled={actioning}
                        style={{
                          width: '100%',
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
                          marginTop: '16px',
                          boxShadow: '0 4px 12px rgba(6, 193, 103, 0.3)',
                          transition: 'all 0.2s',
                          opacity: actioning ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!actioning) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 193, 103, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 193, 103, 0.3)';
                        }}
                      >
                        {actioning ? (
                          <>
                            <FaSpinner className="spinner" /> Processing...
                          </>
                        ) : (
                          <>
                            <FaCheckCircle /> Accept Order
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Panel - Map */}
                <div style={{
                  flex: 1,
                  position: 'relative',
                  background: '#f3f4f6'
                }}>
                  {loadingRoute && !routeData ? (
                    <div style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6b7280',
                      fontSize: '14px',
                      fontWeight: 600,
                      gap: '12px'
                    }}>
                      <FaSpinner className="spinner" style={{ fontSize: '24px', color: '#06C167' }} />
                      <div>Calculating route through roads...</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
                        Finding best path for delivery
                      </div>
                    </div>
                  ) : (
                    <MapContainer
                      key={`${pickupLat}-${pickupLng}-${deliveryLat}-${deliveryLng}-${routeData ? 'routed' : 'noroute'}`}
                      center={[(pickupLat + deliveryLat) / 2, (pickupLng + deliveryLng) / 2]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={true}
                      whenCreated={(mapInstance) => {
                        setTimeout(() => {
                          const bounds = L.latLngBounds([[pickupLat, pickupLng], [deliveryLat, deliveryLng]]);
                          if (routeData && routeData.coordinates) {
                            routeData.coordinates.forEach(coord => bounds.extend(coord));
                          }
                          mapInstance.fitBounds(bounds.pad(0.2));
                        }, 100);
                      }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='© OpenStreetMap contributors'
                      />
                      
                      {/* Pickup Marker */}
                      <Marker
                        position={[pickupLat, pickupLng]}
                        icon={pickupIcon}
                      >
                        <Popup>
                          <div style={{ padding: '6px', minWidth: '150px' }}>
                            <strong style={{ color: '#10b981', fontSize: '13px' }}>📍 Pickup</strong>
                            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                              {routeOrder.pickup_address_full || routeOrder.address || routeOrder.location || routeOrder.area || 'Location'}
                            </div>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Delivery Marker */}
                      <Marker
                        position={[deliveryLat, deliveryLng]}
                        icon={deliveryIcon}
                      >
                        <Popup>
                          <div style={{ padding: '6px', minWidth: '150px' }}>
                            <strong style={{ color: '#ef4444', fontSize: '13px' }}>🚚 Delivery</strong>
                            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                              {routeOrder.deliveryAddressFull || routeOrder.delivery_address_full || routeOrder.deliveryAddress || 'Delivery Location'}
                            </div>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Route Line - Shows actual road path */}
                      {routeData && routeData.coordinates && routeData.coordinates.length > 0 ? (
                        <Polyline
                          positions={routeData.coordinates}
                          color="#06C167"
                          weight={6}
                          opacity={0.9}
                          smoothFactor={0}
                          lineCap="round"
                          lineJoin="round"
                        />
                      ) : (
                        <Polyline
                          positions={[
                            [pickupLat, pickupLng],
                            [deliveryLat, deliveryLng]
                          ]}
                          color="#f59e0b"
                          weight={4}
                          opacity={0.5}
                          dashArray="10, 10"
                        />
                      )}
                    </MapContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
          setAcceptedOrderRouteData(null);
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '800px',
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
                  Order Accepted!
                </h2>
                <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                  You can now deliver this order
                </p>
              </div>
              <button
                onClick={() => {
                  setShowOrderDetailsModal(false);
                  setAcceptedOrder(null);
                  setAcceptedOrderRouteData(null);
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

            {/* Order Details Card */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '2px solid #e5e7eb'
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
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  <strong>Type:</strong> {acceptedOrder.type || acceptedOrder.foodType || 'N/A'} | <strong>Category:</strong> {acceptedOrder.category || 'N/A'}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  <strong>Quantity:</strong> {acceptedOrder.quantity} {acceptedOrder.quantity_unit || 'servings'}
                </div>
              </div>
            </div>

            {/* Map Section - Show if coordinates available */}
            {(() => {
              const pickupLat = parseFloat(acceptedOrder.pickup_latitude || acceptedOrder.pickupLatitude);
              const pickupLng = parseFloat(acceptedOrder.pickup_longitude || acceptedOrder.pickupLongitude);
              const deliveryLat = parseFloat(acceptedOrder.deliveryLatitude || acceptedOrder.delivery_latitude);
              const deliveryLng = parseFloat(acceptedOrder.deliveryLongitude || acceptedOrder.delivery_longitude);

              if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
                return (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      background: 'white',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: '2px solid #e5e7eb'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #06C167, #059669)',
                        padding: '16px 20px',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <FaMapMarkerAlt /> Delivery Route on Map
                      </div>
                      
                      <div style={{ height: '400px', position: 'relative', background: '#f3f4f6' }}>
                        {loadingAcceptedRoute ? (
                          <div style={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            fontSize: '14px',
                            fontWeight: 600
                          }}>
                            <FaSpinner className="spinner" style={{ marginRight: '10px', fontSize: '18px', color: '#06C167' }} />
                            Calculating route...
                          </div>
                        ) : (
                          <MapContainer
                            key={`accepted-${pickupLat}-${pickupLng}-${deliveryLat}-${deliveryLng}-${acceptedOrderRouteData ? 'routed' : 'noroute'}`}
                            center={[(pickupLat + deliveryLat) / 2, (pickupLng + deliveryLng) / 2]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                            whenCreated={(mapInstance) => {
                              setTimeout(() => {
                                const bounds = L.latLngBounds([[pickupLat, pickupLng], [deliveryLat, deliveryLng]]);
                                if (acceptedOrderRouteData && acceptedOrderRouteData.coordinates) {
                                  acceptedOrderRouteData.coordinates.forEach(coord => bounds.extend(coord));
                                }
                                mapInstance.fitBounds(bounds.pad(0.2));
                              }, 100);
                            }}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='© OpenStreetMap contributors'
                            />
                            
                            {/* Pickup Marker */}
                            <Marker
                              position={[pickupLat, pickupLng]}
                              icon={pickupIcon}
                            >
                              <Popup>
                                <div style={{ padding: '6px', minWidth: '150px' }}>
                                  <strong style={{ color: '#10b981', fontSize: '13px' }}>📍 Pickup</strong>
                                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                                    {acceptedOrder.pickup_address_full || acceptedOrder.address || acceptedOrder.location || acceptedOrder.area || 'Location'}
                                  </div>
                                </div>
                              </Popup>
                            </Marker>

                            {/* Delivery Marker */}
                            <Marker
                              position={[deliveryLat, deliveryLng]}
                              icon={deliveryIcon}
                            >
                              <Popup>
                                <div style={{ padding: '6px', minWidth: '150px' }}>
                                  <strong style={{ color: '#ef4444', fontSize: '13px' }}>🚚 Delivery</strong>
                                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                                    {acceptedOrder.deliveryAddressFull || acceptedOrder.delivery_address_full || acceptedOrder.deliveryAddress || 'Delivery Location'}
                                  </div>
                                </div>
                              </Popup>
                            </Marker>

                            {/* Route Line */}
                            {acceptedOrderRouteData && acceptedOrderRouteData.coordinates ? (
                              <Polyline
                                positions={acceptedOrderRouteData.coordinates}
                                color="#06C167"
                                weight={5}
                                opacity={0.85}
                                smoothFactor={1}
                                lineCap="round"
                                lineJoin="round"
                              />
                            ) : (
                              <Polyline
                                positions={[
                                  [pickupLat, pickupLng],
                                  [deliveryLat, deliveryLng]
                                ]}
                                color="#06C167"
                                weight={5}
                                opacity={0.7}
                                dashArray="10, 10"
                              />
                            )}
                          </MapContainer>
                        )}
                      </div>
                      
                      {/* Route Stats */}
                      {acceptedOrderRouteData && (
                        <div style={{
                          padding: '16px 20px',
                          background: 'white',
                          borderTop: '1px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-around',
                          gap: '20px'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Estimated Time</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#06C167' }}>
                              {acceptedOrderRouteData.duration ? `${acceptedOrderRouteData.duration} min` : 'Calculating...'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Distance</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#06C167' }}>
                              {acceptedOrderRouteData.distance} km
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

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
                  setAcceptedOrderRouteData(null);
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

export default DeliveryDashboard;
