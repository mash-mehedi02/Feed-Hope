/**
 * Food Newsfeed Page - Complete Feed View
 * FeedHope Frontend - Food Newsfeed Screen
 * Implements all features from food_newsfeed.php
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { format } from 'date-fns';
import { FaMapMarkerAlt, FaUser, FaClock, FaCheckCircle, FaHeart, FaExclamationTriangle } from 'react-icons/fa';

const FoodNewsfeedPage = () => {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState('donations'); // 'donations' or 'requests'
  
  // Data state
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadDonations();
      loadRequests();
    }
  }, [user, loading]);

  const loadDonations = async () => {
    setLoadingDonations(true);
    try {
      // Get all donations (Firestore doesn't support != operator easily, so we'll filter client-side)
      let q;
      try {
        q = query(
          collection(db, 'food_donations'),
          orderBy('date', 'desc'),
          limit(100)
        );
      } catch (err) {
        // If date index doesn't exist, use createdAt
        q = query(
          collection(db, 'food_donations'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const querySnapshot = await getDocs(q);
      const donationsList = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        
        // Skip rejected donations
        if (data.status === 'rejected') continue;
        
        // Get donor name
        let donorName = data.name || 'Anonymous';

        // Format date
        let donationDate;
        if (data.date?.toDate) {
          donationDate = data.date.toDate();
        } else if (data.createdAt?.toDate) {
          donationDate = data.createdAt.toDate();
        } else {
          donationDate = new Date();
        }

        donationsList.push({
          id: docSnap.id,
          ...data,
          donorName,
          date: donationDate
        });
      }

      setDonations(donationsList);
    } catch (error) {
      console.error('Error loading donations:', error);
      // Fallback: try without orderBy
      try {
        const q = query(collection(db, 'food_donations'), limit(100));
        const snapshot = await getDocs(q);
        const donationsList = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status !== 'rejected') {
            donationsList.push({
              id: docSnap.id,
              ...data,
              donorName: data.name || 'Anonymous',
              date: data.date?.toDate ? data.date.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
            });
          }
        });
        // Sort by date manually
        donationsList.sort((a, b) => b.date - a.date);
        setDonations(donationsList);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        setDonations([]);
      }
    } finally {
      setLoadingDonations(false);
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      // Get all requests (Firestore doesn't support 'in' with orderBy easily)
      let q;
      try {
        q = query(
          collection(db, 'food_requests'),
          orderBy('date', 'desc'),
          limit(100)
        );
      } catch (err) {
        // If date index doesn't exist, use createdAt
        q = query(
          collection(db, 'food_requests'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const querySnapshot = await getDocs(q);
      const requestsList = [];

      for (const docSnap of querySnapshot.docs) {
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

          requestsList.push({
            id: docSnap.id,
            ...data,
            date: requestDate
          });
        }
      }

      // Sort by date manually (in case orderBy failed)
      requestsList.sort((a, b) => b.date - a.date);

      setRequests(requestsList);
    } catch (error) {
      console.error('Error loading requests:', error);
      // Fallback: try without orderBy
      try {
        const q = query(collection(db, 'food_requests'), limit(100));
        const snapshot = await getDocs(q);
        const requestsList = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === 'pending' || data.status === 'matched' || !data.status || data.status === 'active') {
            requestsList.push({
              id: docSnap.id,
              ...data,
              date: data.date?.toDate ? data.date.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
            });
          }
        });
        requestsList.sort((a, b) => b.date - a.date);
        setRequests(requestsList);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        setRequests([]);
      }
    } finally {
      setLoadingRequests(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: '#fef3c7', color: '#92400e', text: 'Pending Approval' },
      available: { bg: '#dbeafe', color: '#1e40af', text: 'Available' },
      assigned: { bg: '#e0e7ff', color: '#4338ca', text: 'Assigned' },
      delivered: { bg: '#d1fae5', color: '#065f46', text: 'Delivered' },
      matched: { bg: '#fef3c7', color: '#92400e', text: 'Matched' },
      fulfilled: { bg: '#d1fae5', color: '#065f46', text: 'Fulfilled' }
    };

    const badge = badges[status] || badges.pending;
    return (
      <span style={{
        display: 'inline-block',
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        background: badge.bg,
        color: badge.color
      }}>
        {badge.text}
      </span>
    );
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '20px',
      paddingTop: '100px'
    },
    header: {
      textAlign: 'center',
      marginBottom: '3rem'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 700,
      background: 'linear-gradient(135deg, #06C167, #059669)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      marginBottom: '1rem'
    },
    tabs: {
      display: 'flex',
      justifyContent: 'center',
      gap: '1rem',
      margin: '2rem 0'
    },
    tabBtn: {
      padding: '1rem 2.5rem',
      border: '2px solid #e5e7eb',
      background: 'white',
      borderRadius: '12px',
      fontWeight: 600,
      fontSize: '1rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: '#6b7280'
    },
    tabBtnActive: {
      background: 'linear-gradient(135deg, #06C167, #10b981)',
      color: 'white',
      borderColor: '#06C167',
      boxShadow: '0 4px 12px rgba(6, 193, 103, 0.3)'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '2rem',
      marginBottom: '3rem'
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      borderLeft: '4px solid #06C167'
    },
    cardRequest: {
      borderLeftColor: '#f59e0b'
    },
    cardHover: {
      transform: 'translateY(-8px)',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
    },
    imageContainer: {
      width: '100%',
      height: '250px',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #f0f0f0, #e0e0e0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    placeholderImage: {
      fontSize: '3rem',
      color: '#06C167'
    },
    content: {
      padding: '1.5rem'
    },
    title: {
      fontSize: '1.3rem',
      fontWeight: 600,
      color: '#111827',
      marginBottom: '0.5rem'
    },
    meta: {
      display: 'flex',
      gap: '1rem',
      marginBottom: '1rem',
      flexWrap: 'wrap'
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.9rem',
      color: '#6b7280'
    },
    location: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: '#6b7280',
      fontSize: '0.9rem',
      marginBottom: '1rem'
    },
    progressBar: {
      width: '100%',
      height: '10px',
      borderRadius: '999px',
      background: '#f3f4f6',
      overflow: 'hidden',
      marginBottom: '0.5rem'
    },
    progressFill: {
      height: '100%',
      borderRadius: '999px',
      background: 'linear-gradient(90deg, #06C167, #a7f3d0)',
      transition: 'width 0.3s ease'
    },
    progressText: {
      fontSize: '0.9rem',
      color: '#6b7280',
      display: 'flex',
      justifyContent: 'space-between'
    },
    empty: {
      textAlign: 'center',
      padding: '4rem 2rem',
      color: '#6b7280'
    },
    emptyIcon: {
      fontSize: '4rem',
      color: '#a7f3d0',
      marginBottom: '1rem'
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

  if (loading || loadingDonations || (activeTab === 'requests' && loadingRequests)) {
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
          <h1 style={styles.title}>Food Donations & Requests</h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            View all available food donations and requests
          </p>
        </div>

        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => setActiveTab('donations')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'donations' ? styles.tabBtnActive : {})
            }}
          >
            <FaHeart /> Donations ({donations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'requests' ? styles.tabBtnActive : {})
            }}
          >
            <FaExclamationTriangle /> Requests ({requests.length})
          </button>
        </div>

        {activeTab === 'donations' && (
          <div>
            {donations.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>
                  <FaHeart />
                </div>
                <h3>No donations yet</h3>
                <p>Be the first to donate food!</p>
                <button
                  onClick={() => navigate('/donor/create-donation')}
                  style={{
                    marginTop: '20px',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #06C167, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '999px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Donate Food Now
                </button>
              </div>
            ) : (
              <div style={styles.grid}>
                {donations.map((donation) => (
                  <div key={donation.id} style={styles.card} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.25)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
                  }}>
                    <div style={styles.imageContainer}>
                      {donation.food_image ? (
                        <img src={donation.food_image} alt={donation.food} style={styles.image} />
                      ) : (
                        <div style={styles.placeholderImage}>
                          <FaHeart />
                        </div>
                      )}
                    </div>
                    <div style={styles.content}>
                      <h3 style={styles.title}>{donation.food}</h3>
                      <div style={styles.meta}>
                        <div style={styles.metaItem}>
                          <FaUser /> {donation.donorName}
                        </div>
                        <div style={styles.metaItem}>
                          <FaClock /> {format(donation.date, 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div style={styles.meta}>
                        <div style={styles.metaItem}>
                          <strong>Type:</strong> {donation.type}
                        </div>
                        <div style={styles.metaItem}>
                          <strong>Category:</strong> {donation.category}
                        </div>
                      </div>
                      <div style={styles.location}>
                        <FaMapMarkerAlt style={{ color: '#06C167' }} />
                        {donation.location || donation.area}
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Quantity:</strong> {donation.quantity}
                      </div>
                      {getStatusBadge(donation.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div>
            {requests.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>
                  <FaExclamationTriangle />
                </div>
                <h3>No requests yet</h3>
                <p>No one has requested food at this time.</p>
              </div>
            ) : (
              <div style={styles.grid}>
                {requests.map((request) => {
                  const recipientCount = request.recipient_count || 0;
                  const receivedCount = request.received_count || 0;
                  const progress = recipientCount > 0 ? (receivedCount / recipientCount) * 100 : 0;

                  return (
                    <div key={request.id} style={{ ...styles.card, ...styles.cardRequest }} onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.25)';
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
                    }}>
                      <div style={styles.content}>
                        <h3 style={styles.title}>{request.food_type}</h3>
                        {request.organization_name && (
                          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
                            <strong>Organization:</strong> {request.organization_name}
                          </p>
                        )}
                        <div style={styles.meta}>
                          <div style={styles.metaItem}>
                            <FaClock /> {format(request.date, 'MMM dd, yyyy')}
                          </div>
                          <div style={styles.metaItem}>
                            <strong>Urgency:</strong> {request.urgency || 'medium'}
                          </div>
                        </div>
                        <div style={styles.location}>
                          <FaMapMarkerAlt style={{ color: '#f59e0b' }} />
                          {request.location}
                        </div>
                        {recipientCount > 0 && (
                          <div style={{ marginTop: '1rem' }}>
                            <div style={styles.progressBar}>
                              <div style={{ ...styles.progressFill, width: `${Math.min(progress, 100)}%` }}></div>
                            </div>
                            <div style={styles.progressText}>
                              <span>{receivedCount} / {recipientCount} people served</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                          </div>
                        )}
                        {getStatusBadge(request.status)}
                        {request.purpose && (
                          <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                            {request.purpose}
                          </p>
                        )}
                        {user && (
                          <button
                            onClick={() => navigate(`/donor/create-donation?request_id=${request.id}`)}
                            style={{
                              marginTop: '1rem',
                              padding: '10px 20px',
                              background: 'linear-gradient(135deg, #06C167, #059669)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              width: '100%'
                            }}
                          >
                            Donate for This Request
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodNewsfeedPage;

