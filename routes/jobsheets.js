const express = require('express');
const router = express.Router();
const { getDB, generateNumber } = require('../database/db');

// GET /api/jobsheets - List job sheets
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      where += ` AND (j.job_sheet_number LIKE $${paramIndex} OR j.customer_name LIKE $${paramIndex+1} OR j.technician_names LIKE $${paramIndex+2} OR j.quotation_number LIKE $${paramIndex+3})`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
      paramIndex += 4;
    }

    const totalRes = await db.query(`SELECT COUNT(*)::integer as cnt FROM job_sheets j ${where}`, params);
    const total = totalRes.rows[0].cnt;

    const rowsRes = await db.query(
      `SELECT j.*, u.full_name as technician_name 
       FROM job_sheets j
       LEFT JOIN users u ON j.technician_id = u.id
       ${where} 
       ORDER BY j.created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex+1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: rowsRes.rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/jobsheets/:id - Get single job sheet
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      `SELECT j.*, u.full_name as technician_name 
       FROM job_sheets j
       LEFT JOIN users u ON j.technician_id = u.id
       WHERE j.id = $1`,
      [req.params.id]
    );
    const sheet = result.rows[0];
    if (!sheet) return res.status(404).json({ success: false, message: 'Job Sheet not found' });

    try {
      sheet.items_data = JSON.parse(sheet.items_data || '{}');
    } catch {
      sheet.items_data = {};
    }

    res.json({ success: true, data: sheet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/jobsheets - Create new job sheet
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { technician_id, technician_names, job_date, customer_name, customer_address, customer_phone, quotation_number, items_data } = req.body;
    
    const sheetNo = await generateNumber('JOBS', 'job_sheets', 'job_sheet_number', db);

    const result = await db.query(
      `INSERT INTO job_sheets (job_sheet_number, technician_id, technician_names, job_date, customer_name, customer_address, customer_phone, quotation_number, items_data) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        sheetNo,
        technician_id || null,
        technician_names || '',
        job_date || new Date().toISOString().split('T')[0],
        customer_name || '',
        customer_address || '',
        customer_phone || '',
        quotation_number || '',
        JSON.stringify(items_data || {})
      ]
    );

    res.json({ success: true, data: { id: result.rows[0].id, job_sheet_number: sheetNo }, message: 'Job Sheet created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/jobsheets/:id - Update job sheet
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { technician_id, technician_names, job_date, customer_name, customer_address, customer_phone, quotation_number, items_data } = req.body;

    await db.query(
      `UPDATE job_sheets 
       SET technician_id = $1, technician_names = $2, job_date = $3, customer_name = $4, customer_address = $5, customer_phone = $6, quotation_number = $7, items_data = $8 
       WHERE id = $9`,
      [
        technician_id || null,
        technician_names || '',
        job_date || new Date().toISOString().split('T')[0],
        customer_name || '',
        customer_address || '',
        customer_phone || '',
        quotation_number || '',
        JSON.stringify(items_data || {}),
        req.params.id
      ]
    );

    res.json({ success: true, message: 'Job Sheet updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/jobsheets/:id - Delete job sheet
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    await db.query('DELETE FROM job_sheets WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Job Sheet deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/jobsheets/:id/return-items
// Body: { returns: [ { product_id, qty, label }, ... ] }
router.post('/:id/return-items', async (req, res) => {
  try {
    const db = getDB();
    const sheetRes = await db.query('SELECT * FROM job_sheets WHERE id = $1', [req.params.id]);
    if (!sheetRes.rows[0]) return res.status(404).json({ success: false, message: 'Job Sheet not found' });
    const sheet = sheetRes.rows[0];

    const { returns, branch_id } = req.body;
    if (!returns || !returns.length) return res.status(400).json({ success: false, message: 'No items to return' });
    if (!branch_id) return res.status(400).json({ success: false, message: 'Branch ID required' });

    const bid = parseInt(branch_id);
    const results = [];
    
    let existingReturns = [];
    try { existingReturns = JSON.parse(sheet.returned_items || '[]'); } catch { existingReturns = []; }

    for (const item of returns) {
      const { product_id, qty, label } = item;
      if (!product_id || !qty || qty <= 0) continue;

      // Add stock back
      await db.query(
        `UPDATE product_stock SET quantity = quantity + $1 WHERE product_id = $2 AND branch_id = $3`,
        [parseInt(qty), parseInt(product_id), bid]
      );
      
      const ex = existingReturns.find(r => r.product_id == product_id);
      if (ex) ex.qty += parseInt(qty);
      else existingReturns.push({ product_id, qty: parseInt(qty), label });

      results.push({ product_id, qty, label });
    }

    await db.query('UPDATE job_sheets SET returned_items = $1 WHERE id = $2', [JSON.stringify(existingReturns), req.params.id]);

    res.json({ 
      success: true, 
      message: `${results.length} item type(s) returned to stock successfully`,
      data: results
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/jobsheets/technicians/summary
router.get('/technicians/summary', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(`
      SELECT u.id, u.full_name as name, COUNT(j.id)::integer as total_jobs
      FROM users u
      JOIN job_sheets j ON u.id = j.technician_id
      GROUP BY u.id, u.full_name
      ORDER BY total_jobs DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/jobsheets/technicians/:id/profile
router.get('/technicians/:id/profile', async (req, res) => {
  try {
    const db = getDB();
    const techId = req.params.id;
    const userRes = await db.query('SELECT id, full_name, username FROM users WHERE id = $1', [techId]);
    if (!userRes.rows[0]) return res.status(404).json({ success: false, message: 'Technician not found' });
    const tech = userRes.rows[0];

    const jobsRes = await db.query('SELECT * FROM job_sheets WHERE technician_id = $1 ORDER BY job_date DESC', [techId]);
    const jobs = jobsRes.rows;

    let issuedItems = {};
    let returnedItems = {};

    jobs.forEach(job => {
      let items = {};
      let returns = [];
      try { items = JSON.parse(job.items_data || '{}'); } catch {}
      try { returns = JSON.parse(job.returned_items || '[]'); } catch {}

      // sum issued
      for (const [pid, details] of Object.entries(items)) {
        if (!issuedItems[pid]) issuedItems[pid] = { product_id: pid, name: details.name, qty: 0 };
        issuedItems[pid].qty += (parseInt(details.qty) || 0);
      }

      // sum returned
      returns.forEach(r => {
        if (!returnedItems[r.product_id]) returnedItems[r.product_id] = { product_id: r.product_id, name: r.label, qty: 0 };
        returnedItems[r.product_id].qty += (parseInt(r.qty) || 0);
      });
    });

    res.json({ 
      success: true, 
      data: {
        technician: tech,
        total_jobs: jobs.length,
        jobs: jobs,
        issued_items: Object.values(issuedItems),
        returned_items: Object.values(returnedItems)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

