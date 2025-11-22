/**
 * Role-based Access Control Middleware
 * FeedHope Server - Role Guard
 */

/**
 * Middleware to check if user has required role(s)
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource
 * Usage: requireOwnership('donors', 'id') or requireOwnership('volunteers', 'id')
 */
const requireOwnership = (table, idField = 'id') => {
  return async (req, res, next) => {
    try {
      const { query } = require('../db');
      const resourceId = req.params.id || req.body.id || req.params[idField];
      const userId = req.user.id;

      // Check ownership based on role
      let ownershipQuery;
      if (req.user.role === 'donor') {
        ownershipQuery = 'SELECT id FROM donors WHERE user_id = ? AND id = ?';
      } else if (req.user.role === 'volunteer') {
        ownershipQuery = 'SELECT id FROM volunteers WHERE user_id = ? AND id = ?';
      } else if (req.user.role === 'delivery') {
        ownershipQuery = 'SELECT id FROM delivery_persons WHERE user_id = ? AND id = ?';
      } else {
        return res.status(403).json({
          success: false,
          message: 'Invalid user role.'
        });
      }

      const results = await query(ownershipQuery, [userId, resourceId]);

      if (results.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed.'
      });
    }
  };
};

module.exports = {
  requireRole,
  requireOwnership
};

