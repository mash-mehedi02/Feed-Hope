/**
 * Register Page - Firebase Authentication
 * FeedHope Frontend - Registration Screen
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/firebaseAuth';
import { FaUser, FaLock, FaPhone, FaHeart, FaMapMarkerAlt } from 'react-icons/fa';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'donor',
    name: '',
    phone: '',
    gender: '',
    organizationName: '',
    division: '',
    district: '',
    area: '',
    address: '',
    vehicleType: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validatePhone = (phone) => {
    return /^\d{11}$/.test(phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!validatePhone(formData.phone)) {
      setError('Phone number must be exactly 11 digits');
      return;
    }

    if (!formData.name || !formData.phone || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const profileData = {
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender || null,
        division: formData.division || null,
        district: formData.district || null,
        area: formData.area || null,
        address: formData.address || null,
        organizationName: formData.organizationName || null,
        vehicleType: formData.vehicleType || null
      };

      const result = await registerUser(
        formData.email,
        formData.password,
        formData.role,
        profileData
      );

      if (result.success) {
        // Navigate to dashboard
        navigate(`/${formData.role}/dashboard`);
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <FaHeart style={styles.logo} />
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Join FeedHope and make a difference</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.roleButtons}>
            {['donor', 'volunteer', 'delivery'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setFormData({ ...formData, role })}
                style={{
                  ...styles.roleButton,
                  ...(formData.role === role ? styles.roleButtonActive : {})
                }}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">
              <FaUser style={{ marginRight: '8px' }} />
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Your full name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              <FaPhone style={{ marginRight: '8px' }} />
              Phone (11 digits) *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="form-input"
              value={formData.phone}
              onChange={handleChange}
              required
              maxLength="11"
              placeholder="01712345678"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              <FaLock style={{ marginRight: '8px' }} />
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="At least 6 characters"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          {formData.role === 'donor' && (
            <div className="form-group">
              <label className="form-label" htmlFor="gender">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                className="form-select"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          {formData.role === 'volunteer' && (
            <div className="form-group">
              <label className="form-label" htmlFor="organizationName">
                Organization Name
              </label>
              <input
                type="text"
                id="organizationName"
                name="organizationName"
                className="form-input"
                value={formData.organizationName}
                onChange={handleChange}
                placeholder="Your organization/NGO name"
              />
            </div>
          )}

          {formData.role === 'delivery' && (
            <div className="form-group">
              <label className="form-label" htmlFor="vehicleType">
                Vehicle Type
              </label>
              <input
                type="text"
                id="vehicleType"
                name="vehicleType"
                className="form-input"
                value={formData.vehicleType}
                onChange={handleChange}
                placeholder="e.g., Motorcycle, Car, Van"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="division">
              <FaMapMarkerAlt style={{ marginRight: '8px' }} />
              Division
            </label>
            <input
              type="text"
              id="division"
              name="division"
              className="form-input"
              value={formData.division}
              onChange={handleChange}
              placeholder="e.g., Dhaka"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="district">
              District
            </label>
            <input
              type="text"
              id="district"
              name="district"
              className="form-input"
              value={formData.district}
              onChange={handleChange}
              placeholder="e.g., Dhaka"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="area">
              Area
            </label>
            <input
              type="text"
              id="area"
              name="area"
              className="form-input"
              value={formData.area}
              onChange={handleChange}
              placeholder="e.g., Mirpur 2"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              className="form-textarea"
              value={formData.address}
              onChange={handleChange}
              placeholder="Your full address"
              rows="3"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div style={styles.loginLink}>
          Already have an account? <a href="/login">Login here</a>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #2E8B57 0%, #228B22 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: '40px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  logo: {
    fontSize: '48px',
    color: '#2E8B57',
    marginBottom: '10px'
  },
  title: {
    color: '#2E8B57',
    fontSize: '28px',
    marginBottom: '10px',
    fontWeight: 700
  },
  subtitle: {
    color: '#666',
    fontSize: '16px'
  },
  roleButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '20px'
  },
  roleButton: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontWeight: 600,
    textAlign: 'center',
    fontSize: '14px'
  },
  roleButtonActive: {
    background: '#2E8B57',
    color: 'white',
    borderColor: '#2E8B57'
  },
  loginLink: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
    fontSize: '14px'
  }
};

export default RegisterPage;

