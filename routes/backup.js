const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDB } = require('../database/db');

// GET /api/backup/download (Downloads SQLite Database file)
router.get('/download', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  
  const dbPath = path.join(__dirname, '..', 'data', 'enqova.db');
  if (fs.existsSync(dbPath)) {
    const today = new Date().toISOString().slice(0, 10);
    return res.download(dbPath, `enqova_backup_${today}.db`);
  }
  
  res.status(404).json({
    success: false,
    message: 'Database file not found at data/enqova.db'
  });
});

// GET /api/backup/export-json
router.get('/export-json', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  try {
    const db = getDB();
    const tables = [
      'branches', 'categories', 'products', 'product_stock', 'product_serials',
      'customers', 'suppliers', 'grn', 'grn_items', 'invoices', 'invoice_items',
      'transfers', 'transfer_items', 'warranty_claims', 'settings'
    ];
    const exported = {};
    for (const t of tables) {
      try {
        const result = await db.query(`SELECT * FROM ${t}`);
        exported[t] = result.rows;
      } catch (e) {
        exported[t] = [];
      }
    }
    exported._exported_at = new Date().toISOString();
    res.json({ success: true, data: exported });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/backup/restore
router.post('/restore', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  res.status(400).json({
    success: false,
    message: 'To restore backup, replace data/enqova.db with your backup file and restart the server.'
  });
});

module.exports = router;
