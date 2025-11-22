/**
 * Login Page - Firebase Authentication
 * FeedHope Frontend - Login Screen
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { loginUser } from '../services/firebaseAuth';
import { FaUser, FaLock, FaHeart } from 'react-icons/fa';

const LoginPage = () => {
  console.log('🔐 LoginPage component rendering...');
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  
  console.log('LoginPage state - user:', user ? 'logged in' : 'not logged in', 'loading:', loading);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'donor'
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      if (user && !loading) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            navigate(`/${userData.role}/dashboard`);
          }
        } catch (error) {
          console.error('Check user error:', error);
        }
      }
    };
    checkUser();
  }, [user, loading, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await loginUser(formData.email, formData.password, formData.role);

      if (result.success) {
        // Navigate based on role
        navigate(`/${formData.role}/dashboard`);
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <FaHeart style={styles.logo} />
          <h1 style={styles.title}>FeedHope</h1>
          <p style={styles.subtitle}>Welcome back! Please login to continue.</p>
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
            <label className="form-label" htmlFor="email">
              <FaUser style={{ marginRight: '8px' }} />
              Email
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
            <label className="form-label" htmlFor="password">
              <FaLock style={{ marginRight: '8px' }} />
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.registerLink}>
          Don't have an account? <a href="/register">Register here</a>
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
    maxWidth: '450px'
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
    fontSize: '32px',
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
  registerLink: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
    fontSize: '14px'
  }
};

export default LoginPage;
