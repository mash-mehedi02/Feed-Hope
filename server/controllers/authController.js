/**
 * Authentication Controller
 * FeedHope Server - Auth Handlers
 */

const bcrypt = require('bcryptjs');
const { query, transaction } = require('../db');
const { generateToken } = require('../middleware/authMiddleware');

/**
 * Register new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { email, password, role, name, phone, gender, organizationName, division, district, area, address, vehicleType } = req.body;

    // Validation
    if (!email || !password || !role || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password, role, name, phone'
      });
    }

    // Validate role
    if (!['donor', 'volunteer', 'delivery'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be: donor, volunteer, or delivery'
      });
    }

    // Validate phone (exactly 11 digits)
    if (!/^\d{11}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 11 digits'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if email already exists for this role
    const existingUsers = await query(
      'SELECT id FROM users WHERE email = ? AND role = ?',
      [email, role]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Email already registered for ${role} role`
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use transaction to create user and profile
    const result = await transaction(async (connection) => {
      // Create user account
      const [userResult] = await connection.execute(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email, hashedPassword, role]
      );
      const userId = userResult.insertId;

      // Create role-specific profile
      if (role === 'donor') {
        await connection.execute(
          'INSERT INTO donors (user_id, name, phone, gender, division, district, area, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, name, phone, gender || null, division || null, district || null, area || null, address || null]
        );
      } else if (role === 'volunteer') {
        await connection.execute(
          'INSERT INTO volunteers (user_id, name, organization_name, phone, division, district, area, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, name, organizationName || null, phone, division || null, district || null, area || null, address || null]
        );
      } else if (role === 'delivery') {
        await connection.execute(
          'INSERT INTO delivery_persons (user_id, name, phone, division, district, area, address, vehicle_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, name, phone, division || null, district || null, area || null, address || null, vehicleType || null]
        );
      }

      return userId;
    });

    // Generate token
    const token = generateToken(result, role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: result,
          email,
          role
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password, role'
      });
    }

    // Find user
    const users = await query(
      'SELECT id, email, password, role, email_verified FROM users WHERE email = ? AND role = ?',
      [email, role]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Get profile data based on role
    let profile = null;
    if (user.role === 'donor') {
      const profiles = await query('SELECT * FROM donors WHERE user_id = ?', [user.id]);
      profile = profiles[0] || null;
    } else if (user.role === 'volunteer') {
      const profiles = await query('SELECT * FROM volunteers WHERE user_id = ?', [user.id]);
      profile = profiles[0] || null;
    } else if (user.role === 'delivery') {
      const profiles = await query('SELECT * FROM delivery_persons WHERE user_id = ?', [user.id]);
      profile = profiles[0] || null;
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.email_verified,
          profile
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Get profile based on role
    let profile = null;
    if (role === 'donor') {
      const profiles = await query('SELECT * FROM donors WHERE user_id = ?', [userId]);
      profile = profiles[0] || null;
    } else if (role === 'volunteer') {
      const profiles = await query('SELECT * FROM volunteers WHERE user_id = ?', [userId]);
      profile = profiles[0] || null;
    } else if (role === 'delivery') {
      const profiles = await query('SELECT * FROM delivery_persons WHERE user_id = ?', [userId]);
      profile = profiles[0] || null;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          emailVerified: req.user.emailVerified,
          profile
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
};

module.exports = {
  register,
  login,
  getMe
};

