const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query('SELECT `key`, `value` FROM settings');
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const db = getDB();
    
    for (const [k, v] of Object.entries(req.body)) {
      await db.query(
        'INSERT INTO settings (`key`, `value`) VALUES ($1, $2) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        [k, String(v)]
      );
    }
    
    res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
