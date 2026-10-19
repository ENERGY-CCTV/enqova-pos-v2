const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDB } = require('../database/db');

// GET /api/users
router.get('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const db = getDB();
    const result = await db.query(
      'SELECT u.id, u.username, u.full_name, u.email, u.role, u.branch_id, u.is_active, u.permissions, u.created_at, u.last_login, b.name as branch_name FROM users u LEFT JOIN branches b ON u.branch_id = b.id ORDER BY u.full_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      'SELECT u.id, u.username, u.full_name, u.email, u.role, u.branch_id, u.is_active, u.permissions, b.name as branch_name FROM users u LEFT JOIN branches b ON u.branch_id = b.id WHERE u.id = $1',
      [req.params.id]
    );
    const u = result.rows[0];
    if (!u) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: u });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const db = getDB();
    const { username, full_name, email, password, role = 'cashier', branch_id, permissions } = req.body;
    if (!username || !full_name || !password) {
      return res.status(400).json({ success: false, message: 'Username, name and password required' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, full_name, email, password_hash, role, branch_id, permissions) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [username, full_name, email || null, hash, role, branch_id || null, permissions || null]
    );
    res.json({ success: true, data: { id: result.rows[0].id }, message: 'User created' });
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const db = getDB();
    const { username, full_name, email, role, branch_id, password, permissions } = req.body;
    
    // Ensure username is not empty
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
    }

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await db.query(
        'UPDATE users SET username=$1, full_name=$2, email=$3, role=$4, branch_id=$5, password_hash=$6, permissions=$7 WHERE id=$8',
        [username, full_name, email || null, role, branch_id || null, hash, permissions || null, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE users SET username=$1, full_name=$2, email=$3, role=$4, branch_id=$5, permissions=$6 WHERE id=$7',
        [username, full_name, email || null, role, branch_id || null, permissions || null, req.params.id]
      );
    }
    res.json({ success: true, message: 'User updated' });
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/:id (deactivate)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const db = getDB();
    await db.query('UPDATE users SET is_active = 0 WHERE id = $1 AND username != \'admin\'', [req.params.id]);
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id/reactivate
router.put('/:id/reactivate', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const db = getDB();
    await db.query('UPDATE users SET is_active = 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'User reactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/branches/all
router.get('/branches/all', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query('SELECT * FROM branches WHERE is_active = 1 ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/branches/:id
router.get('/branches/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query('SELECT * FROM branches WHERE id = $1', [req.params.id]);
    const b = result.rows[0];
    if (!b) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: b });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/branches
router.post('/branches', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const db = getDB();
    const { name, address, phone, email, manager_name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const result = await db.query(
      'INSERT INTO branches (name, address, phone, email, manager_name) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [name, address || null, phone || null, email || null, manager_name || null]
    );
    res.json({ success: true, data: { id: result.rows[0].id }, message: 'Branch created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/branches/:id
router.put('/branches/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const db = getDB();
    const { name, address, phone, email, manager_name } = req.body;
    await db.query(
      'UPDATE branches SET name=$1,address=$2,phone=$3,email=$4,manager_name=$5 WHERE id=$6',
      [name, address || null, phone || null, email || null, manager_name || null, req.params.id]
    );
    res.json({ success: true, message: 'Branch updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
