const express = require('express');
const router = express.Router();
const { getDB, generateCustomerCode } = require('../database/db');

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { search = '', customer_type = '', page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE c.is_active = 1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      where += ` AND (c.name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex+1} OR c.nic ILIKE $${paramIndex+2} OR c.customer_code ILIKE $${paramIndex+3})`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
      paramIndex += 4;
    }
    if (customer_type) {
      where += ` AND c.customer_type = $${paramIndex}`;
      params.push(customer_type);
      paramIndex += 1;
    }

    const totalRes = await db.query(`SELECT COUNT(*)::integer as cnt FROM customers c ${where}`, params);
    const total = totalRes.rows[0].cnt;

    const result = await db.query(
      `SELECT c.*, b.name as branch_name FROM customers c LEFT JOIN branches b ON c.branch_id = b.id ${where} ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex+1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, data: result.rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      'SELECT c.*, b.name as branch_name FROM customers c LEFT JOIN branches b ON c.branch_id = b.id WHERE c.id = $1',
      [req.params.id]
    );
    const c = result.rows[0];
    if (!c) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: c });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { name, phone, nic, email, address, customer_type = 'retail', credit_limit = 0, notes, branch_id } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const code = await generateCustomerCode(db);
    const bid = branch_id || req.user.branch_id || 1;
    const result = await db.query(
      'INSERT INTO customers (customer_code, name, phone, nic, email, address, customer_type, credit_limit, notes, branch_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
      [code, name, phone || null, nic || null, email || null, address || null, customer_type, credit_limit, notes || null, bid]
    );
    res.json({ success: true, data: { id: result.rows[0].id, customer_code: code }, message: 'Customer created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { name, phone, nic, email, address, customer_type, credit_limit, notes } = req.body;
    await db.query(
      'UPDATE customers SET name=$1,phone=$2,nic=$3,email=$4,address=$5,customer_type=$6,credit_limit=$7,notes=$8 WHERE id=$9',
      [name, phone || null, nic || null, email || null, address || null, customer_type, credit_limit || 0, notes || null, req.params.id]
    );
    res.json({ success: true, message: 'Updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/:id/invoices
router.get('/:id/invoices', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      'SELECT i.*, b.name as branch_name FROM invoices i LEFT JOIN branches b ON i.branch_id = b.id WHERE i.customer_id = $1 ORDER BY i.created_at DESC LIMIT 50',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/:id/warranties
router.get('/:id/warranties', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      'SELECT w.*, p.name as product_name FROM warranty_claims w LEFT JOIN products p ON w.product_id = p.id WHERE w.customer_id = $1 ORDER BY w.created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
