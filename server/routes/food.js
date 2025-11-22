/**
 * Food Donation Routes
 * FeedHope Server - Food Endpoints
 */

const express = require('express');
const router = express.Router();
const {
  createDonation,
  getAvailableDonations,
  acceptAsVolunteer,
  getPendingForDelivery,
  acceptAsDelivery,
  markDelivered,
  getMyDonations
} = require('../controllers/foodController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleGuard');
const { upload, handleUploadError } = require('../middleware/upload');

// Donor routes
router.post('/', authenticate, requireRole('donor'), upload.single('food_image'), handleUploadError, createDonation);
router.get('/my-donations', authenticate, requireRole('donor'), getMyDonations);

// Volunteer routes
router.get('/available', authenticate, requireRole('volunteer'), getAvailableDonations);
router.post('/:id/accept-volunteer', authenticate, requireRole('volunteer'), acceptAsVolunteer);

// Delivery routes
router.get('/pending-delivery', authenticate, requireRole('delivery'), getPendingForDelivery);
router.post('/:id/accept-delivery', authenticate, requireRole('delivery'), acceptAsDelivery);
router.post('/:id/deliver', authenticate, requireRole('delivery'), markDelivered);

module.exports = router;

