/**
 * Order Tracking Modal - Professional Food Delivery Tracking
 * Shows order status with map, delivery person info, timeline, and order summary
 * Similar to Uber Eats / Swiggy / Zomato order tracking
 */

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  FaTimes,
  FaPhone,
  FaMotorcycle,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaUtensils,
  FaArrowLeft,
  FaSearch,
  FaCompass,
  FaPlus,
  FaMinus,
  FaSpinner,
  FaUser
} from 'react-icons/fa';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons - Orange/Amber for pickup, Red for delivery
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
});

const vehicleIcon = new L.DivIcon({
  html: `<div style="
    background: #1f2937; 
    width: 24px; 
    height: 24px; 
    border-radius: 50%; 
    border: 3px solid white; 
    box-shadow: 0 3px 8px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: white;
  ">🚚</div>`,
  className: 'custom-vehicle-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const OrderTrackingModal = ({ order, onClose }) => {
  const [deliveryPerson, setDeliveryPerson] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapBounds, setMapBounds] = useState(null);

  useEffect(() => {
    if (order) {
      loadDeliveryPerson();
      calculateRoute();
    }
  }, [order]);

  const loadDeliveryPerson = async () => {
    if (!order?.deliveryPersonId && !order?.assigned_to && !order?.delivery_by) {
      setLoading(false);
      return;
    }

    try {
      const deliveryPersonId = order.deliveryPersonId || order.assigned_to || order.delivery_by;
      const deliveryDoc = await getDoc(doc(db, 'users', deliveryPersonId));
      
      if (deliveryDoc.exists()) {
        const deliveryData = deliveryDoc.data();
        const profileDoc = await getDoc(doc(db, 'delivery_persons', deliveryPersonId));
        setDeliveryPerson({
          id: deliveryPersonId,
          ...deliveryData,
          ...(profileDoc.exists() ? profileDoc.data() : {})
        });
      }
    } catch (error) {
      console.error('Failed to load delivery person:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRoute = async () => {
    if (!order) return;

    const pickupLat = parseFloat(order.pickup_latitude || order.pickupLatitude);
    const pickupLng = parseFloat(order.pickup_longitude || order.pickupLongitude);
    const deliveryLat = parseFloat(order.deliveryLatitude || order.delivery_latitude);
    const deliveryLng = parseFloat(order.deliveryLongitude || order.delivery_longitude);

    if (!pickupLat || !pickupLng || !deliveryLat || !deliveryLng) {
      return;
    }

    try {
      // Use OSRM API for route calculation
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${deliveryLng},${deliveryLat}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
        
        setRouteData({
          coordinates,
          distance: (route.distance / 1000).toFixed(1), // Convert to km
          duration: Math.round(route.duration / 60) // Convert to minutes
        });

        // Set map bounds
        const bounds = L.latLngBounds(coordinates);
        setMapBounds(bounds);
      }
    } catch (error) {
      console.error('Failed to calculate route:', error);
    }
  };

  const getOrderStatus = () => {
    if (order.status === 'delivered') return 'delivered';
    if (order.status === 'ongoing') return 'on_way';
    if (order.status === 'pending' && order.volunteerId) return 'picking';
    return 'pending';
  };

  const getStatusTimeline = () => {
    const status = getOrderStatus();
    
    return [
      {
        stage: 'picking',
        label: 'Order Picking',
        icon: FaMotorcycle,
        time: '3 mins',
        completed: status !== 'pending' && status !== 'available',
        active: status === 'picking'
      },
      {
        stage: 'on_way',
        label: 'On the way',
        icon: FaUtensils,
        time: routeData ? `${routeData.duration} mins` : '10 mins',
        completed: status === 'delivered',
        active: status === 'on_way'
      },
      {
        stage: 'delivered',
        label: 'Delivered',
        icon: FaMapMarkerAlt,
        time: order.delivered_at ? new Date(order.delivered_at.toDate?.() || order.delivered_at).toLocaleTimeString() : '',
        completed: status === 'delivered',
        active: status === 'delivered'
      }
    ];
  };

  const pickupLat = parseFloat(order?.pickup_latitude || order?.pickupLatitude);
  const pickupLng = parseFloat(order?.pickup_longitude || order?.pickupLongitude);
  const deliveryLat = parseFloat(order?.deliveryLatitude || order?.delivery_latitude);
  const deliveryLng = parseFloat(order?.deliveryLongitude || order?.delivery_longitude);

  const hasValidCoords = pickupLat && pickupLng && deliveryLat && deliveryLng;
  const status = getOrderStatus();
  const timeline = getStatusTimeline();

  const styles = {
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'white',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    header: {
      position: 'relative',
      padding: '16px 20px',
      background: 'white',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      flexShrink: 0
    },
    contentWrapper: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden'
    },
    leftPanel: {
      width: '400px',
      flexShrink: 0,
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      borderRight: '1px solid #e5e7eb'
    },
    mapContainer: {
      flex: 1,
      position: 'relative',
      background: '#f3f4f6'
    },
    mapControls: {
      position: 'absolute',
      top: '80px',
      right: '16px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    controlButton: {
      background: 'white',
      border: 'none',
      borderRadius: '8px',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontSize: '16px',
      color: '#374151'
    },
    deliveryPersonCard: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      margin: '20px',
      borderRadius: '16px',
      boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)'
    },
    avatar: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      color: 'white',
      border: '3px solid rgba(255,255,255,0.3)'
    },
    deliveryPersonInfo: {
      flex: 1,
      color: 'white'
    },
    deliveryPersonName: {
      fontSize: '18px',
      fontWeight: 700,
      marginBottom: '4px'
    },
    deliveryPersonRole: {
      fontSize: '14px',
      opacity: 0.9
    },
    phoneButton: {
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      borderRadius: '12px',
      width: '48px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: '20px',
      color: 'white',
      transition: 'all 0.2s'
    },
    timeline: {
      padding: '0 20px 24px',
      background: 'white',
      flex: 1
    },
    timelineItem: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      position: 'relative'
    },
    timelineIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      flexShrink: 0,
      zIndex: 2,
      border: '3px solid white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    },
    timelineLine: {
      position: 'absolute',
      left: '24px',
      top: '56px',
      bottom: '-32px',
      width: '3px',
      background: '#e5e7eb',
      zIndex: 1
    },
    timelineContent: {
      flex: 1,
      paddingTop: '8px'
    },
    timelineLabel: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#111827',
      marginBottom: '4px'
    },
    timelineTime: {
      fontSize: '14px',
      color: '#6b7280'
    },
    orderSummary: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      margin: '0 20px 20px',
      borderRadius: '16px',
      boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
      flexShrink: 0
    },
    foodImage: {
      width: '80px',
      height: '80px',
      borderRadius: '12px',
      objectFit: 'cover',
      background: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      color: '#f59e0b',
      border: '2px solid rgba(255,255,255,0.3)'
    },
    orderInfo: {
      flex: 1,
      color: 'white'
    },
    orderName: {
      fontSize: '18px',
      fontWeight: 700,
      marginBottom: '4px'
    },
    orderDetails: {
      fontSize: '14px',
      opacity: 0.9,
      marginBottom: '4px'
    },
    orderPrice: {
      fontSize: '20px',
      fontWeight: 700,
      marginLeft: 'auto'
    }
  };

  if (!order) return null;

  return (
    <div style={styles.modal}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            left: '20px',
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#374151'
          }}
        >
          <FaArrowLeft />
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
          Order Tracking
        </h2>
      </div>

      {/* Content Wrapper - Left Panel (Details) + Right Panel (Map) */}
      <div style={styles.contentWrapper}>
        {/* Left Panel - Details */}
        <div style={styles.leftPanel}>
          {/* Delivery Person Card */}
          {deliveryPerson && (
            <div style={styles.deliveryPersonCard}>
              <div style={styles.avatar}>
                {deliveryPerson.avatar ? (
                  <img
                    src={deliveryPerson.avatar}
                    alt={deliveryPerson.name}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <FaUser />
                )}
              </div>
              <div style={styles.deliveryPersonInfo}>
                <div style={styles.deliveryPersonName}>
                  {deliveryPerson.name || deliveryPerson.displayName || 'Delivery Person'}
                </div>
                <div style={styles.deliveryPersonRole}>Delivery boy</div>
              </div>
              {deliveryPerson.phone && (
                <a
                  href={`tel:${deliveryPerson.phone}`}
                  style={styles.phoneButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  }}
                >
                  <FaPhone />
                </a>
              )}
            </div>
          )}

          {/* Status Timeline */}
          <div style={styles.timeline}>
            {timeline.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === timeline.length - 1;
              
              return (
                <div key={item.stage} style={styles.timelineItem}>
                  <div
                    style={{
                      ...styles.timelineIcon,
                      background: item.completed
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : item.active
                        ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                        : '#e5e7eb',
                      color: item.completed || item.active ? 'white' : '#9ca3af'
                    }}
                  >
                    <Icon />
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        ...styles.timelineLine,
                        background: item.completed 
                          ? 'linear-gradient(to bottom, #f59e0b, #fbbf24, #e5e7eb)' 
                          : item.active
                          ? 'linear-gradient(to bottom, #fbbf24, #e5e7eb)'
                          : '#e5e7eb'
                      }}
                    />
                  )}
                  <div style={styles.timelineContent}>
                    <div
                      style={{
                        ...styles.timelineLabel,
                        color: item.active || item.completed ? '#111827' : '#9ca3af'
                      }}
                    >
                      {item.label}
                    </div>
                    <div style={styles.timelineTime}>
                      {item.active ? `Estimated time: ${item.time}` : item.completed ? (item.time || 'Completed') : `Estimated time: ${item.time}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div style={styles.orderSummary}>
            {order.food_image ? (
              <img
                src={order.food_image}
                alt={order.food || order.foodName}
                style={styles.foodImage}
              />
            ) : (
              <div style={styles.foodImage}>
                <FaUtensils />
              </div>
            )}
            <div style={styles.orderInfo}>
              <div style={styles.orderName}>{order.food || order.foodName}</div>
              <div style={styles.orderDetails}>
                {order.quantity} {order.quantity_unit || 'servings'}
                {order.type && ` • ${order.type}`}
              </div>
            </div>
            {order.estimated_value && (
              <div style={styles.orderPrice}>
                Rs {order.estimated_value}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div style={styles.mapContainer}>
        {hasValidCoords ? (
          <MapContainer
            center={[(pickupLat + deliveryLat) / 2, (pickupLng + deliveryLng) / 2]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            whenCreated={(mapInstance) => {
              if (mapBounds) {
                mapInstance.fitBounds(mapBounds.pad(0.2));
              }
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© OpenStreetMap contributors'
            />
            
            {/* Pickup Marker */}
            <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
              <Popup>
                <div style={{ padding: '8px' }}>
                  <strong style={{ color: '#10b981', fontSize: '14px' }}>📍 Pickup Location</strong>
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                    {order.pickup_address_full || order.address || 'Pickup Location'}
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* Delivery Marker */}
            <Marker position={[deliveryLat, deliveryLng]} icon={deliveryIcon}>
              <Popup>
                <div style={{ padding: '8px' }}>
                  <strong style={{ color: '#ef4444', fontSize: '14px' }}>🚚 Delivery Location</strong>
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                    {order.deliveryAddressFull || order.delivery_address_full || order.deliveryAddress || 'Delivery Location'}
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* Route Line - Always show route between pickup and delivery */}
            {routeData && routeData.coordinates && routeData.coordinates.length > 0 && (
              <>
                {status === 'on_way' || status === 'delivered' ? (
                  <>
                    {/* Dashed red line for completed/past route segment */}
                    <Polyline
                      positions={routeData.coordinates.slice(0, Math.floor(routeData.coordinates.length * 0.7))}
                      color="#ef4444"
                      weight={5}
                      opacity={0.7}
                      dashArray="15, 8"
                    />
                    {/* Solid red line for current route segment (if on the way) */}
                    {status === 'on_way' && (
                      <Polyline
                        positions={routeData.coordinates.slice(Math.floor(routeData.coordinates.length * 0.7))}
                        color="#ef4444"
                        weight={6}
                        opacity={1}
                      />
                    )}
                    {/* Solid red line for completed route (if delivered) */}
                    {status === 'delivered' && (
                      <Polyline
                        positions={routeData.coordinates.slice(Math.floor(routeData.coordinates.length * 0.7))}
                        color="#ef4444"
                        weight={6}
                        opacity={0.9}
                      />
                    )}
                  </>
                ) : (
                  /* Full route line for pending/picking status - orange/red */
                  <Polyline
                    positions={routeData.coordinates}
                    color="#f59e0b"
                    weight={5}
                    opacity={0.8}
                  />
                )}
              </>
            )}

            {/* Vehicle Marker (if on the way) - shows delivery person location */}
            {status === 'on_way' && routeData && routeData.coordinates && routeData.coordinates.length > 0 && (
              <Marker
                position={routeData.coordinates[Math.floor(routeData.coordinates.length * 0.7)]}
                icon={vehicleIcon}
              >
                <Popup>
                  <div style={{ padding: '8px', textAlign: 'center' }}>
                    <strong style={{ fontSize: '14px', color: '#1f2937' }}>🚚 Delivery Vehicle</strong>
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                      On the way to delivery
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3f4f6',
            color: '#6b7280'
          }}>
            <div style={{ textAlign: 'center' }}>
              <FaMapMarkerAlt style={{ fontSize: '48px', marginBottom: '16px', color: '#d1d5db' }} />
              <div style={{ fontSize: '16px' }}>Map unavailable - Location data missing</div>
            </div>
          </div>
        )}

        {/* Map Controls */}
        <div style={styles.mapControls}>
          <button style={styles.controlButton} title="Search">
            <FaSearch />
          </button>
          <button style={styles.controlButton} title="Compass">
            <FaCompass />
          </button>
          <button style={styles.controlButton} title="Zoom In">
            <FaPlus />
          </button>
          <button style={styles.controlButton} title="Zoom Out">
            <FaMinus />
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingModal;

