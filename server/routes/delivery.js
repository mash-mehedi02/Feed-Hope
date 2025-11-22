/**
 * Delivery Person Routes
 * FeedHope Server - Delivery Endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleGuard');
const { query } = require('../db');
const { upload, handleUploadError } = require('../middleware/upload');

/**
 * Get delivery person profile
 * GET /api/delivery/profile
 */
router.get('/profile', authenticate, requireRole('delivery'), async (req, res) => {
  try {
    const userId = req.user.id;

    const profiles = await query(
      'SELECT * FROM delivery_persons WHERE user_id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person profile not found'
      });
    }

    const profile = profiles[0];
    
    // Get delivery stats
    const stats = await query(
      `SELECT 
        COUNT(*) as total_deliveries,
        SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) as ongoing_deliveries,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_deliveries
      FROM food_donations WHERE delivery_person_id = ?`,
      [profile.id]
    );

    res.json({
      success: true,
      data: {
        profile: {
          ...profile,
          avatar: profile.avatar ? `/uploads/avatars/${profile.avatar}` : null
        },
        stats: stats[0] || { total_deliveries: 0, ongoing_deliveries: 0, completed_deliveries: 0 }
      }
    });
  } catch (error) {
    console.error('Get delivery profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery profile'
    });
  }
});

/**
 * Update delivery person profile
 * PATCH /api/delivery/profile
 */
router.patch('/profile', authenticate, requireRole('delivery'), upload.single('avatar'), handleUploadError, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, division, district, area, address, vehicleType, availabilityStatus } = req.body;
    const avatar = req.file ? req.file.filename : undefined;

    // Build update query
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (phone) {
      if (!/^\d{11}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 11 digits'
        });
      }
      updates.push('phone = ?');
      params.push(phone);
    }
    if (division) {
      updates.push('division = ?');
      params.push(division);
    }
    if (district) {
      updates.push('district = ?');
      params.push(district);
    }
    if (area) {
      updates.push('area = ?');
      params.push(area);
    }
    if (address) {
      updates.push('address = ?');
      params.push(address);
    }
    if (vehicleType) {
      updates.push('vehicle_type = ?');
      params.push(vehicleType);
    }
    if (availabilityStatus) {
      updates.push('availability_status = ?');
      params.push(availabilityStatus);
    }
    if (avatar) {
      updates.push('avatar = ?');
      params.push(avatar);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(userId);

    await query(
      `UPDATE delivery_persons SET ${updates.join(', ')} WHERE user_id = ?`,
      params
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update delivery profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;

