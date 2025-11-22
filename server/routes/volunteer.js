/**
 * Volunteer Routes
 * FeedHope Server - Volunteer Endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleGuard');
const { query } = require('../db');
const { upload, handleUploadError } = require('../middleware/upload');

/**
 * Get volunteer profile
 * GET /api/volunteers/profile
 */
router.get('/profile', authenticate, requireRole('volunteer'), async (req, res) => {
  try {
    const userId = req.user.id;

    const profiles = await query(
      'SELECT * FROM volunteers WHERE user_id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }

    const profile = profiles[0];
    
    // Get accepted donations stats
    const stats = await query(
      `SELECT 
        COUNT(*) as total_accepted,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_donations,
        SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) as ongoing_donations,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_donations
      FROM food_donations WHERE volunteer_id = ?`,
      [profile.id]
    );

    res.json({
      success: true,
      data: {
        profile: {
          ...profile,
          avatar: profile.avatar ? `/uploads/avatars/${profile.avatar}` : null
        },
        stats: stats[0] || { total_accepted: 0, pending_donations: 0, ongoing_donations: 0, delivered_donations: 0 }
      }
    });
  } catch (error) {
    console.error('Get volunteer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get volunteer profile'
    });
  }
});

/**
 * Update volunteer profile
 * PATCH /api/volunteers/profile
 */
router.patch('/profile', authenticate, requireRole('volunteer'), upload.single('avatar'), handleUploadError, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, organizationName, phone, division, district, area, address } = req.body;
    const avatar = req.file ? req.file.filename : undefined;

    // Build update query
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (organizationName !== undefined) {
      updates.push('organization_name = ?');
      params.push(organizationName);
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
      `UPDATE volunteers SET ${updates.join(', ')} WHERE user_id = ?`,
      params
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update volunteer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;

