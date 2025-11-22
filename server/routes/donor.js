/**
 * Donor Routes
 * FeedHope Server - Donor Endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleGuard');
const { query } = require('../db');
const { upload, handleUploadError } = require('../middleware/upload');

/**
 * Get donor profile
 * GET /api/donors/profile
 */
router.get('/profile', authenticate, requireRole('donor'), async (req, res) => {
  try {
    const userId = req.user.id;

    const profiles = await query(
      'SELECT * FROM donors WHERE user_id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    const profile = profiles[0];
    
    // Get donation stats
    const stats = await query(
      `SELECT 
        COUNT(*) as total_donations,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as active_donations,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_donations
      FROM food_donations WHERE donor_id = ?`,
      [profile.id]
    );

    res.json({
      success: true,
      data: {
        profile: {
          ...profile,
          avatar: profile.avatar ? `/uploads/avatars/${profile.avatar}` : null
        },
        stats: stats[0] || { total_donations: 0, active_donations: 0, delivered_donations: 0 }
      }
    });
  } catch (error) {
    console.error('Get donor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get donor profile'
    });
  }
});

/**
 * Update donor profile
 * PATCH /api/donors/profile
 */
router.patch('/profile', authenticate, requireRole('donor'), upload.single('avatar'), handleUploadError, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, gender, division, district, area, address } = req.body;
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
    if (gender) {
      updates.push('gender = ?');
      params.push(gender);
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
      `UPDATE donors SET ${updates.join(', ')} WHERE user_id = ?`,
      params
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update donor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;

