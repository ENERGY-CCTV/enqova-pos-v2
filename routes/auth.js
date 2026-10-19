const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../database/db');

const JWT_SECRET = 'enqova_SECRET_2024_SECURE';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const db = getDB();
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    const result = await db.query(
      'SELECT u.*, b.name as branch_name FROM users u LEFT JOIN branches b ON u.branch_id = b.id WHERE u.username = $1 AND u.is_active = 1',
      [username]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, data: user });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  try {
    const db = getDB();
    const { current_password, new_password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const dbUser = result.rows[0];
    if (!dbUser || !bcrypt.compareSync(current_password, dbUser.password_hash)) {
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    }
    const hash = bcrypt.hashSync(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
