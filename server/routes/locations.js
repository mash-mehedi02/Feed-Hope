/**
 * Locations Routes
 * FeedHope Server - Location Endpoints
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');

/**
 * Get divisions
 * GET /api/locations/divisions
 */
router.get('/divisions', async (req, res) => {
  try {
    const divisions = await query(
      'SELECT DISTINCT division FROM locations ORDER BY division'
    );

    res.json({
      success: true,
      data: divisions.map(d => d.division)
    });
  } catch (error) {
    console.error('Get divisions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get divisions'
    });
  }
});

/**
 * Get districts by division
 * GET /api/locations/districts/:division
 */
router.get('/districts/:division', async (req, res) => {
  try {
    const { division } = req.params;

    const districts = await query(
      'SELECT DISTINCT district FROM locations WHERE division = ? ORDER BY district',
      [division]
    );

    res.json({
      success: true,
      data: districts.map(d => d.district)
    });
  } catch (error) {
    console.error('Get districts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get districts'
    });
  }
});

/**
 * Get areas by district
 * GET /api/locations/areas/:district
 */
router.get('/areas/:district', async (req, res) => {
  try {
    const { district } = req.params;
    const { search } = req.query;

    let sql = 'SELECT area, latitude, longitude FROM locations WHERE district = ?';
    const params = [district];

    if (search) {
      sql += ' AND area LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY area';

    const areas = await query(sql, params);

    res.json({
      success: true,
      data: areas.map(a => ({
        name: a.area,
        latitude: a.latitude,
        longitude: a.longitude
      }))
    });
  } catch (error) {
    console.error('Get areas error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get areas'
    });
  }
});

module.exports = router;

