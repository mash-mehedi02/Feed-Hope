/**
 * Create Request Page - Food Request Form for Volunteers
 * FeedHope Frontend - Create Food Request Screen
 * Only volunteers/NGOs can create food requests
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { createFoodRequest } from '../services/firebaseFood';
import { getDivisions, getDistricts, getAreas } from '../services/firebaseLocations';
import { FaSpinner, FaHandHoldingHeart, FaExclamationTriangle, FaMapMarkerAlt, FaCalendarAlt, FaUsers, FaFlag } from 'react-icons/fa';

const CreateRequestPage = () => {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  
  // Form state
  const [formData, setFormData] = useState({
    organizationName: '',
    foodType: '',
    foodCategory: 'cooked-food',
    quantityNeeded: '',
    quantityUnit: 'people',
    purpose: '',
    recipientCount: '',
    division: '',
    district: '',
    area: '',
    address: '',
    phone: '',
    urgency: 'medium',
    requiredDate: '',
    notes: ''
  });

  // Location state
  const [divisions, setDivisions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);
  
  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Load user profile and linked request
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadUserProfile();
    }
  }, [user, loading]);

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
      if (userData.role !== 'volunteer') {
        alert('Only volunteers can create food requests.');
        navigate('/volunteer/dashboard');
        return;
      }

      // Get volunteer profile
      const volunteerDoc = await getDoc(doc(db, 'volunteers', user.uid));
      if (volunteerDoc.exists()) {
        const volunteerData = volunteerDoc.data();
        setUserProfile(volunteerData);
        setFormData(prev => ({
          ...prev,
          organizationName: volunteerData.organizationName || volunteerData.organization_name || '',
          phone: volunteerData.phone || '',
          division: volunteerData.division || '',
          district: volunteerData.district || '',
          area: volunteerData.area || volunteerData.location || '',
          address: volunteerData.address || ''
        }));
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoadingProfile(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.foodType || !formData.foodType.trim()) {
      setError('Please enter food type');
      return;
    }

    if (!formData.quantityNeeded || !formData.quantityNeeded.trim()) {
      setError('Please enter quantity needed');
      return;
    }

    if (!formData.purpose || !formData.purpose.trim()) {
      setError('Please enter purpose / who will receive this food');
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

    if (!formData.phone || !formData.phone.trim()) {
      setError('Please enter phone number');
      return;
    }

    // Validate phone (11 digits)
    if (formData.phone.replace(/\D/g, '').length !== 11) {
      setError('Please enter valid 11-digit phone number');
      return;
    }

    setSubmitting(true);

    try {
      const requestData = {
        organizationName: formData.organizationName || null,
        foodType: formData.foodType,
        foodCategory: formData.foodCategory,
        quantityNeeded: formData.quantityNeeded,
        quantityUnit: formData.quantityUnit || null,
        purpose: formData.purpose,
        recipientCount: formData.recipientCount ? parseInt(formData.recipientCount) : null,
        division: formData.division || null,
        district: formData.district || null,
        area: formData.area,
        location: formData.area,
        address: formData.address,
        phone: formData.phone,
        urgency: formData.urgency || 'medium',
        requiredDate: formData.requiredDate || null,
        notes: formData.notes || null
      };

      const result = await createFoodRequest(requestData);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/volunteer/dashboard');
        }, 2000);
      } else {
        setError(result.message || 'Failed to create food request');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingProfile) {
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
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      padding: '20px',
      paddingTop: '100px'
    },
    page: {
      maxWidth: '1100px',
      margin: '32px auto',
      padding: '0 16px'
    },
    card: {
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 18px 40px rgba(0,0,0,.10)',
      overflow: 'hidden'
    },
    cardHeader: {
      padding: '22px 24px',
      background: 'linear-gradient(135deg, #fef3c7, #ffffff)',
      borderBottom: '1px solid #eef2f7',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    cardBody: {
      padding: '24px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(12, 1fr)',
      gap: '16px'
    },
    col6: {
      gridColumn: 'span 12'
    },
    '@media (min-width: 900px)': {
      col6: {
        gridColumn: 'span 6'
      }
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '14px'
    },
    label: {
      color: '#111827',
      fontWeight: 600,
      fontSize: '0.95rem',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    input: {
      padding: '12px',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      outline: 'none',
      fontSize: '15px',
      transition: 'border-color 0.3s'
    },
    inputFocus: {
      borderColor: '#f59e0b'
    },
    select: {
      padding: '12px',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      outline: 'none',
      fontSize: '15px',
      background: 'white',
      transition: 'border-color 0.3s'
    },
    textarea: {
      padding: '12px',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      outline: 'none',
      fontSize: '15px',
      minHeight: '90px',
      resize: 'vertical',
      fontFamily: 'inherit',
      transition: 'border-color 0.3s'
    },
    button: {
      padding: '14px 28px',
      borderRadius: '12px',
      border: 'none',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      fontSize: '16px',
      transition: 'all 0.3s'
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
    },
    btnSecondary: {
      background: '#e5e7eb',
      color: '#374151'
    },
    error: {
      padding: '12px',
      background: '#fee2e2',
      color: '#991b1b',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    success: {
      padding: '12px',
      background: '#d1fae5',
      color: '#065f46',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '16px',
      fontWeight: 600
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

  return (
    <div style={styles.container}>
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <FaHandHoldingHeart style={{ fontSize: '28px', color: '#f59e0b' }} />
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#111827' }}>
              Request Food
            </h1>
          </div>

          <div style={styles.cardBody}>
            <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '16px' }}>
              Request food for your organization or community. Donors will see your request and can help fulfill it.
            </p>

            {error && (
              <div style={styles.error}>
                <FaExclamationTriangle /> {error}
              </div>
            )}

            {success && (
              <div style={styles.success}>
                <FaHandHoldingHeart /> Food request submitted successfully! Redirecting...
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={styles.grid}>
                {/* Organization Name */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Organization Name</label>
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleChange}
                      placeholder="e.g., Hope Foundation, Community Kitchen"
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Food Type */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Food Type *</label>
                    <input
                      type="text"
                      name="foodType"
                      value={formData.foodType}
                      onChange={handleChange}
                      placeholder="e.g., Rice, Biryani, Vegetables"
                      required
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Food Category */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Category *</label>
                    <select
                      name="foodCategory"
                      value={formData.foodCategory}
                      onChange={handleChange}
                      required
                      style={styles.select}
                    >
                      <option value="cooked-food">Cooked Food</option>
                      <option value="raw-food">Raw Food</option>
                      <option value="packed-food">Packed Food</option>
                    </select>
                  </div>
                </div>

                {/* Quantity Needed */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Quantity Needed *</label>
                    <input
                      type="text"
                      name="quantityNeeded"
                      value={formData.quantityNeeded}
                      onChange={handleChange}
                      placeholder="e.g., 50 kg, 100 plates"
                      required
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Purpose */}
                <div style={{ gridColumn: 'span 12' }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <FaUsers /> Purpose / Who Will Receive This Food *
                    </label>
                    <textarea
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      placeholder="e.g., For orphanage children, For homeless people, For community kitchen, etc."
                      required
                      style={styles.textarea}
                    />
                  </div>
                </div>

                {/* Recipient Count */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <FaUsers /> Number of Recipients
                    </label>
                    <input
                      type="number"
                      name="recipientCount"
                      value={formData.recipientCount}
                      onChange={handleChange}
                      placeholder="e.g., 50"
                      min="1"
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Urgency */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <FaFlag /> Urgency Level *
                    </label>
                    <select
                      name="urgency"
                      value={formData.urgency}
                      onChange={handleChange}
                      required
                      style={styles.select}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Division */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <FaMapMarkerAlt /> Division
                    </label>
                    <select
                      name="division"
                      value={formData.division}
                      onChange={handleChange}
                      style={styles.select}
                    >
                      <option value="">Select Division</option>
                      {divisions.map((div) => (
                        <option key={div.id} value={div.name}>
                          {div.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* District */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <FaMapMarkerAlt /> District
                    </label>
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      disabled={!formData.division}
                      style={styles.select}
                    >
                      <option value="">Select District</option>
                      {districts.map((dist) => (
                        <option key={dist.id} value={dist.name}>
                          {dist.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Area */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <FaMapMarkerAlt /> Area / Location *</label>
                    <select
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      disabled={!formData.district}
                      required
                      style={styles.select}
                    >
                      <option value="">Select Area</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.name}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Required Date */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <FaCalendarAlt /> Required Date
                    </label>
                    <input
                      type="date"
                      name="requiredDate"
                      value={formData.requiredDate}
                      onChange={handleChange}
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Address */}
                <div style={{ gridColumn: 'span 12' }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Full Address *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter full address including road, building, etc."
                      required
                      style={styles.textarea}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div style={styles.col6}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Phone Number (11 digits) *</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="01XXXXXXXXX"
                      maxLength={11}
                      pattern="[0-9]{11}"
                      required
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div style={{ gridColumn: 'span 12' }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Additional Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Any additional information..."
                      style={styles.textarea}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/volunteer/dashboard')}
                  disabled={submitting}
                  style={{ ...styles.button, ...styles.btnSecondary }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    ...styles.button,
                    ...styles.btnPrimary,
                    opacity: submitting ? 0.6 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="spinner" /> Submitting...
                    </>
                  ) : (
                    <>
                      <FaHandHoldingHeart /> Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRequestPage;

