/**
 * Food Donation Controller
 * FeedHope Server - Food Handlers
 */

const { query, transaction } = require('../db');
const path = require('path');

/**
 * Create food donation
 * POST /api/food
 */
const createDonation = async (req, res) => {
  try {
    const donorId = req.user.id;
    const {
      foodName, foodType, category, quantity, description,
      pickupAddress, pickupDivision, pickupDistrict, pickupArea,
      pickupLatitude, pickupLongitude, pickupAddressFull,
      contactPhone
    } = req.body;

    const foodImage = req.file ? req.file.filename : null;

    // Validation
    if (!foodName || !foodType || !category || !quantity || !pickupAddress || !contactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: foodName, foodType, category, quantity, pickupAddress, contactPhone'
      });
    }

    // Validate phone (exactly 11 digits)
    if (!/^\d{11}$/.test(contactPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Contact phone must be exactly 11 digits'
      });
    }

    // Get donor profile to get donor_id
    const donors = await query('SELECT id FROM donors WHERE user_id = ?', [donorId]);
    if (donors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }
    const profileDonorId = donors[0].id;

    // Create donation
    const [result] = await query(
      `INSERT INTO food_donations 
      (donor_id, food_name, food_type, category, quantity, description, food_image,
       pickup_address, pickup_division, pickup_district, pickup_area,
       pickup_latitude, pickup_longitude, pickup_address_full,
       contact_phone, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
      [
        profileDonorId, foodName, foodType, category, quantity, description || null, foodImage,
        pickupAddress, pickupDivision || null, pickupDistrict || null, pickupArea || null,
        pickupLatitude || null, pickupLongitude || null, pickupAddressFull || null,
        contactPhone
      ]
    );

    // Create history entry
    await query(
      'INSERT INTO food_history (donation_id, status_from, status_to, changed_by_id, changed_by_role, changed_by_name) VALUES (?, ?, ?, ?, ?, ?)',
      [result.insertId, null, 'available', donorId, 'donor', null]
    );

    res.status(201).json({
      success: true,
      message: 'Food donation created successfully',
      data: {
        donationId: result.insertId
      }
    });
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create food donation'
    });
  }
};

/**
 * Get available food donations (for volunteers)
 * GET /api/food/available
 */
const getAvailableDonations = async (req, res) => {
  try {
    const { division, district, area, category, sort = 'newest' } = req.query;

    // Build query
    let sql = `
      SELECT fd.*, 
             d.name as donor_name, d.phone as donor_phone,
             d.division as donor_division, d.district as donor_district, d.area as donor_area
      FROM food_donations fd
      JOIN donors d ON fd.donor_id = d.id
      WHERE fd.status = 'available'
    `;

    const params = [];

    // Apply filters
    if (area) {
      sql += ' AND fd.pickup_area = ?';
      params.push(area);
    } else if (district) {
      sql += ' AND fd.pickup_district = ?';
      params.push(district);
    } else if (division) {
      sql += ' AND fd.pickup_division = ?';
      params.push(division);
    }

    if (category) {
      sql += ' AND fd.category = ?';
      params.push(category);
    }

    // Sort
    if (sort === 'newest') {
      sql += ' ORDER BY fd.created_at DESC';
    } else if (sort === 'oldest') {
      sql += ' ORDER BY fd.created_at ASC';
    }

    sql += ' LIMIT 50';

    const donations = await query(sql, params);

    // Format response
    const formatted = donations.map(d => ({
      id: d.id,
      foodName: d.food_name,
      foodType: d.food_type,
      category: d.category,
      quantity: d.quantity,
      description: d.description,
      foodImage: d.food_image ? `/uploads/food_images/${d.food_image}` : null,
      pickupAddress: d.pickup_address,
      pickupDivision: d.pickup_division,
      pickupDistrict: d.pickup_district,
      pickupArea: d.pickup_area,
      pickupLatitude: d.pickup_latitude,
      pickupLongitude: d.pickup_longitude,
      pickupAddressFull: d.pickup_address_full,
      contactPhone: d.contact_phone,
      donor: {
        name: d.donor_name,
        phone: d.donor_phone,
        division: d.donor_division,
        district: d.donor_district,
        area: d.donor_area
      },
      status: d.status,
      createdAt: d.created_at
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Get available donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available donations'
    });
  }
};

/**
 * Accept donation as volunteer
 * POST /api/food/:id/accept-volunteer
 */
const acceptAsVolunteer = async (req, res) => {
  try {
    const donationId = parseInt(req.params.id);
    const volunteerId = req.user.id;
    const { deliveryAddress, deliveryDivision, deliveryDistrict, deliveryArea, deliveryLatitude, deliveryLongitude, deliveryAddressFull } = req.body;

    // Validation
    if (!deliveryAddress || !deliveryDivision || !deliveryDistrict || !deliveryArea) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: deliveryAddress, deliveryDivision, deliveryDistrict, deliveryArea'
      });
    }

    // Get volunteer profile
    const volunteers = await query('SELECT id FROM volunteers WHERE user_id = ?', [volunteerId]);
    if (volunteers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }
    const profileVolunteerId = volunteers[0].id;

    // Use transaction to ensure atomicity (race condition prevention)
    const result = await transaction(async (connection) => {
      // Check if donation is still available and not assigned
      const [donations] = await connection.execute(
        'SELECT id, status, volunteer_id FROM food_donations WHERE id = ?',
        [donationId]
      );

      if (donations.length === 0) {
        throw new Error('Donation not found');
      }

      const donation = donations[0];

      if (donation.status !== 'available') {
        throw new Error(`Donation is not available. Current status: ${donation.status}`);
      }

      if (donation.volunteer_id) {
        throw new Error('Donation already accepted by another volunteer');
      }

      // Update donation with optimistic locking
      const [updateResult] = await connection.execute(
        `UPDATE food_donations 
         SET status = 'pending', 
             volunteer_id = ?, 
             volunteer_accepted_at = NOW(),
             delivery_address = ?, 
             delivery_division = ?, 
             delivery_district = ?, 
             delivery_area = ?,
             delivery_latitude = ?, 
             delivery_longitude = ?, 
             delivery_address_full = ?
         WHERE id = ? AND status = 'available' AND volunteer_id IS NULL`,
        [
          profileVolunteerId, deliveryAddress, deliveryDivision, deliveryDistrict, deliveryArea,
          deliveryLatitude || null, deliveryLongitude || null, deliveryAddressFull || null,
          donationId
        ]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error('Donation was already accepted by another volunteer');
      }

      // Create history entry
      const [volunteerProfile] = await connection.execute(
        'SELECT name FROM volunteers WHERE id = ?',
        [profileVolunteerId]
      );

      await connection.execute(
        'INSERT INTO food_history (donation_id, status_from, status_to, changed_by_id, changed_by_role, changed_by_name) VALUES (?, ?, ?, ?, ?, ?)',
        [donationId, 'available', 'pending', volunteerId, 'volunteer', volunteerProfile[0]?.name || null]
      );

      // Create notification for donor
      const [donationData] = await connection.execute(
        'SELECT donor_id FROM food_donations WHERE id = ?',
        [donationId]
      );
      const donorProfileId = donationData[0].donor_id;

      const [donorUser] = await connection.execute(
        'SELECT user_id FROM donors WHERE id = ?',
        [donorProfileId]
      );
      const donorUserId = donorUser[0].user_id;

      await connection.execute(
        `INSERT INTO notifications (user_id, user_role, type, title, message, related_id, related_type)
         VALUES (?, 'donor', 'volunteer_accepted', 'Volunteer Accepted Your Donation', 
                 'A volunteer has accepted your food donation. Delivery will be arranged soon.', ?, 'food_donation')`,
        [donorUserId, donationId]
      );

      return true;
    });

    res.json({
      success: true,
      message: 'Donation accepted successfully'
    });
  } catch (error) {
    console.error('Accept as volunteer error:', error);
    
    if (error.message.includes('not found') || error.message.includes('not available') || error.message.includes('already accepted')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to accept donation'
    });
  }
};

/**
 * Get pending donations for delivery (in same area)
 * GET /api/food/pending-delivery
 */
const getPendingForDelivery = async (req, res) => {
  try {
    const deliveryId = req.user.id;

    // Get delivery person's area
    const deliveryPersons = await query('SELECT area, district, division FROM delivery_persons WHERE user_id = ?', [deliveryId]);
    if (deliveryPersons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person profile not found'
      });
    }

    const deliveryPerson = deliveryPersons[0];

    // Build query - show pending orders in same area/district/division
    let sql = `
      SELECT fd.*,
             d.name as donor_name,
             v.name as volunteer_name, v.organization_name as volunteer_org
      FROM food_donations fd
      JOIN donors d ON fd.donor_id = d.id
      LEFT JOIN volunteers v ON fd.volunteer_id = v.id
      WHERE fd.status = 'pending' AND fd.volunteer_id IS NOT NULL
    `;

    const params = [];

    // Filter by area (prioritize area match, then district, then division)
    if (deliveryPerson.area) {
      sql += ' AND fd.delivery_area = ?';
      params.push(deliveryPerson.area);
    } else if (deliveryPerson.district) {
      sql += ' AND fd.delivery_district = ?';
      params.push(deliveryPerson.district);
    } else if (deliveryPerson.division) {
      sql += ' AND fd.delivery_division = ?';
      params.push(deliveryPerson.division);
    }

    sql += ' ORDER BY fd.volunteer_accepted_at DESC LIMIT 50';

    const donations = await query(sql, params);

    // Format response
    const formatted = donations.map(d => ({
      id: d.id,
      foodName: d.food_name,
      foodType: d.food_type,
      category: d.category,
      quantity: d.quantity,
      description: d.description,
      foodImage: d.food_image ? `/uploads/food_images/${d.food_image}` : null,
      pickupAddress: d.pickup_address,
      pickupDivision: d.pickup_division,
      pickupDistrict: d.pickup_district,
      pickupArea: d.pickup_area,
      pickupLatitude: d.pickup_latitude,
      pickupLongitude: d.pickup_longitude,
      pickupAddressFull: d.pickup_address_full,
      deliveryAddress: d.delivery_address,
      deliveryDivision: d.delivery_division,
      deliveryDistrict: d.delivery_district,
      deliveryArea: d.delivery_area,
      deliveryLatitude: d.delivery_latitude,
      deliveryLongitude: d.delivery_longitude,
      deliveryAddressFull: d.delivery_address_full,
      contactPhone: d.contact_phone,
      donor: {
        name: d.donor_name
      },
      volunteer: {
        name: d.volunteer_name,
        organizationName: d.volunteer_org
      },
      status: d.status,
      volunteerAcceptedAt: d.volunteer_accepted_at,
      createdAt: d.created_at
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Get pending for delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending deliveries'
    });
  }
};

/**
 * Accept donation as delivery person
 * POST /api/food/:id/accept-delivery
 */
const acceptAsDelivery = async (req, res) => {
  try {
    const donationId = parseInt(req.params.id);
    const deliveryId = req.user.id;

    // Get delivery person profile
    const deliveryPersons = await query('SELECT id FROM delivery_persons WHERE user_id = ?', [deliveryId]);
    if (deliveryPersons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person profile not found'
      });
    }
    const profileDeliveryId = deliveryPersons[0].id;

    // Use transaction with optimistic locking
    const result = await transaction(async (connection) => {
      // Check if donation is still pending and not assigned
      const [donations] = await connection.execute(
        'SELECT id, status, delivery_person_id, volunteer_id, donor_id FROM food_donations WHERE id = ?',
        [donationId]
      );

      if (donations.length === 0) {
        throw new Error('Donation not found');
      }

      const donation = donations[0];

      if (donation.status !== 'pending') {
        throw new Error(`Donation is not pending. Current status: ${donation.status}`);
      }

      if (donation.delivery_person_id) {
        throw new Error('Donation already accepted by another delivery person');
      }

      // Update donation
      const [updateResult] = await connection.execute(
        `UPDATE food_donations 
         SET status = 'ongoing', 
             delivery_person_id = ?, 
             delivery_accepted_at = NOW()
         WHERE id = ? AND status = 'pending' AND delivery_person_id IS NULL`,
        [profileDeliveryId, donationId]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error('Donation was already accepted by another delivery person');
      }

      // Create history entry
      const [deliveryProfile] = await connection.execute(
        'SELECT name FROM delivery_persons WHERE id = ?',
        [profileDeliveryId]
      );

      await connection.execute(
        'INSERT INTO food_history (donation_id, status_from, status_to, changed_by_id, changed_by_role, changed_by_name) VALUES (?, ?, ?, ?, ?, ?)',
        [donationId, 'pending', 'ongoing', deliveryId, 'delivery', deliveryProfile[0]?.name || null]
      );

      // Create notifications for donor and volunteer
      const [donorUser] = await connection.execute(
        'SELECT user_id FROM donors WHERE id = ?',
        [donation.donor_id]
      );
      const donorUserId = donorUser[0].user_id;

      const [volunteerUser] = await connection.execute(
        'SELECT user_id FROM volunteers WHERE id = ?',
        [donation.volunteer_id]
      );
      const volunteerUserId = volunteerUser[0].user_id;

      await connection.execute(
        `INSERT INTO notifications (user_id, user_role, type, title, message, related_id, related_type)
         VALUES 
         (?, 'donor', 'delivery_accepted', 'Delivery Started', 
          'A delivery person has accepted your food donation. It is now on the way.', ?, 'food_donation'),
         (?, 'volunteer', 'delivery_accepted', 'Delivery Started',
          'A delivery person has accepted the donation. It is now on the way.', ?, 'food_donation')`,
        [donorUserId, donationId, volunteerUserId, donationId]
      );

      return true;
    });

    res.json({
      success: true,
      message: 'Delivery accepted successfully'
    });
  } catch (error) {
    console.error('Accept as delivery error:', error);
    
    if (error.message.includes('not found') || error.message.includes('not pending') || error.message.includes('already accepted')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to accept delivery'
    });
  }
};

/**
 * Mark donation as delivered
 * POST /api/food/:id/deliver
 */
const markDelivered = async (req, res) => {
  try {
    const donationId = parseInt(req.params.id);
    const deliveryId = req.user.id;

    // Get delivery person profile
    const deliveryPersons = await query('SELECT id FROM delivery_persons WHERE user_id = ?', [deliveryId]);
    if (deliveryPersons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person profile not found'
      });
    }
    const profileDeliveryId = deliveryPersons[0].id;

    // Use transaction
    const result = await transaction(async (connection) => {
      // Check if donation is assigned to this delivery person
      const [donations] = await connection.execute(
        'SELECT id, status, delivery_person_id, donor_id, volunteer_id FROM food_donations WHERE id = ?',
        [donationId]
      );

      if (donations.length === 0) {
        throw new Error('Donation not found');
      }

      const donation = donations[0];

      if (donation.delivery_person_id !== profileDeliveryId) {
        throw new Error('This donation is not assigned to you');
      }

      if (donation.status !== 'ongoing') {
        throw new Error(`Donation is not ongoing. Current status: ${donation.status}`);
      }

      // Update donation
      await connection.execute(
        `UPDATE food_donations 
         SET status = 'delivered', 
             delivered_at = NOW()
         WHERE id = ?`,
        [donationId]
      );

      // Create history entry
      const [deliveryProfile] = await connection.execute(
        'SELECT name FROM delivery_persons WHERE id = ?',
        [profileDeliveryId]
      );

      await connection.execute(
        'INSERT INTO food_history (donation_id, status_from, status_to, changed_by_id, changed_by_role, changed_by_name) VALUES (?, ?, ?, ?, ?, ?)',
        [donationId, 'ongoing', 'delivered', deliveryId, 'delivery', deliveryProfile[0]?.name || null]
      );

      // Create notifications for donor and volunteer
      const [donorUser] = await connection.execute(
        'SELECT user_id FROM donors WHERE id = ?',
        [donation.donor_id]
      );
      const donorUserId = donorUser[0].user_id;

      const [volunteerUser] = await connection.execute(
        'SELECT user_id FROM volunteers WHERE id = ?',
        [donation.volunteer_id]
      );
      const volunteerUserId = volunteerUser[0].user_id;

      await connection.execute(
        `INSERT INTO notifications (user_id, user_role, type, title, message, related_id, related_type)
         VALUES 
         (?, 'donor', 'delivered', 'Delivery Completed', 
          'Your food donation has been successfully delivered!', ?, 'food_donation'),
         (?, 'volunteer', 'delivered', 'Delivery Completed',
          'The food donation has been successfully delivered!', ?, 'food_donation')`,
        [donorUserId, donationId, volunteerUserId, donationId]
      );

      return true;
    });

    res.json({
      success: true,
      message: 'Donation marked as delivered successfully'
    });
  } catch (error) {
    console.error('Mark delivered error:', error);
    
    if (error.message.includes('not found') || error.message.includes('not assigned') || error.message.includes('not ongoing')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to mark donation as delivered'
    });
  }
};

/**
 * Get my donations (for donor)
 * GET /api/food/my-donations
 */
const getMyDonations = async (req, res) => {
  try {
    const donorId = req.user.id;

    // Get donor profile
    const donors = await query('SELECT id FROM donors WHERE user_id = ?', [donorId]);
    if (donors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }
    const profileDonorId = donors[0].id;

    const donations = await query(
      `SELECT fd.*,
              v.name as volunteer_name, v.organization_name as volunteer_org,
              dp.name as delivery_name
       FROM food_donations fd
       LEFT JOIN volunteers v ON fd.volunteer_id = v.id
       LEFT JOIN delivery_persons dp ON fd.delivery_person_id = dp.id
       WHERE fd.donor_id = ?
       ORDER BY fd.created_at DESC`,
      [profileDonorId]
    );

    // Format response
    const formatted = donations.map(d => ({
      id: d.id,
      foodName: d.food_name,
      foodType: d.food_type,
      category: d.category,
      quantity: d.quantity,
      description: d.description,
      foodImage: d.food_image ? `/uploads/food_images/${d.food_image}` : null,
      pickupAddress: d.pickup_address,
      pickupDivision: d.pickup_division,
      pickupDistrict: d.pickup_district,
      pickupArea: d.pickup_area,
      deliveryAddress: d.delivery_address,
      deliveryDivision: d.delivery_division,
      deliveryDistrict: d.delivery_district,
      deliveryArea: d.delivery_area,
      volunteer: d.volunteer_name ? {
        name: d.volunteer_name,
        organizationName: d.volunteer_org
      } : null,
      deliveryPerson: d.delivery_name ? {
        name: d.delivery_name
      } : null,
      status: d.status,
      createdAt: d.created_at,
      volunteerAcceptedAt: d.volunteer_accepted_at,
      deliveryAcceptedAt: d.delivery_accepted_at,
      deliveredAt: d.delivered_at
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Get my donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get your donations'
    });
  }
};

module.exports = {
  createDonation,
  getAvailableDonations,
  acceptAsVolunteer,
  getPendingForDelivery,
  acceptAsDelivery,
  markDelivered,
  getMyDonations
};

