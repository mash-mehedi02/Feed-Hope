/**
 * FeedHope Server
 * Modern Node.js/Express Backend
 * Version 2.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection (this will test connection on require)
const db = require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const donorRoutes = require('./routes/donor');
const volunteerRoutes = require('./routes/volunteer');
const deliveryRoutes = require('./routes/delivery');
const foodRoutes = require('./routes/food');
const notificationRoutes = require('./routes/notifications');
const locationRoutes = require('./routes/locations');

// Initialize Express app
const app = express();

// Server configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// =====================================================
// Middleware Configuration
// =====================================================

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:5173').split(','),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Request logging (development only)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// =====================================================
// Static Files (for uploaded images)
// =====================================================
app.use('/uploads', express.static('uploads'));

// =====================================================
// Health Check
// =====================================================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FeedHope API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// =====================================================
// API Routes
// =====================================================
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/locations', locationRoutes);

// =====================================================
// Error Handling Middleware
// =====================================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// =====================================================
// Start Server
// =====================================================
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 FeedHope Server Started!');
  console.log(`   Environment: ${NODE_ENV}`);
  console.log(`   Server: http://localhost:${PORT}`);
  console.log(`   API Base: http://localhost:${PORT}/api`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;

