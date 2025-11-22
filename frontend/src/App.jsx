/**
 * FeedHope App - Main App Component
 * React + Firebase Application
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase/config';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DonorDashboard from './pages/DonorDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import ProfilePage from './pages/ProfilePage';
import CreateDonationPage from './pages/CreateDonationPage';
import CreateRequestPage from './pages/CreateRequestPage';
import FoodNewsfeedPage from './pages/FoodNewsfeedPage';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role check would go here (get user role from Firestore)
  return children;
};

function App() {
  console.log('📱 App component rendering...');
  
  const appStyle = {
    minHeight: '100vh',
    width: '100%'
  };
  
  return (
    <div className="App" style={appStyle}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/newsfeed" element={<FoodNewsfeedPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected Routes - Donor */}
        <Route
          path="/donor/dashboard"
          element={
            <ProtectedRoute requiredRole="donor">
              <DonorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donor/create-donation"
          element={
            <ProtectedRoute requiredRole="donor">
              <CreateDonationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donor/profile"
          element={
            <ProtectedRoute requiredRole="donor">
              <ProfilePage role="donor" />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Volunteer */}
        <Route
          path="/volunteer/dashboard"
          element={
            <ProtectedRoute requiredRole="volunteer">
              <VolunteerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/volunteer/create-request"
          element={
            <ProtectedRoute requiredRole="volunteer">
              <CreateRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/volunteer/profile"
          element={
            <ProtectedRoute requiredRole="volunteer">
              <ProfilePage role="volunteer" />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Delivery */}
        <Route
          path="/delivery/dashboard"
          element={
            <ProtectedRoute requiredRole="delivery">
              <DeliveryDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/profile"
          element={
            <ProtectedRoute requiredRole="delivery">
              <ProfilePage role="delivery" />
            </ProtectedRoute>
          }
        />

        {/* Profile Route (works for all roles) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;

