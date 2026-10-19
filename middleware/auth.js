'use strict';

const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const JWT_SECRET = 'enqova_SECRET_2024';

/**
 * Middleware: verify JWT token on every /api/* route except /api/auth/login
 */
function authenticateToken(req, res, next) {
  // Skip auth for login
  if (req.path === '/api/auth/login') return next();

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Fetch fresh user from DB to check is_active
    const user = db.prepare(
      'SELECT id, username, full_name, email, role, branch_id, is_active FROM users WHERE id = ?'
    ).get(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'User account is inactive or not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}

/**
 * Middleware: require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

/**
 * Middleware: require admin or manager role
 */
function requireManager(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
    return res.status(403).json({ success: false, message: 'Manager access required' });
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, requireManager, JWT_SECRET };
