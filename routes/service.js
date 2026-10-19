const express = require('express');
const router = express.Router();
const { getDB, generateNumber } = require('../database/db');

// GET /api/service/jobs - List all repair jobs
router.get('/jobs', async (req, res) => {
  try {
    const db = getDB();
    const { status = '', search = '', branch_id = '', assigned_to = '', page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      where += ` AND j.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (branch_id) {
      where += ` AND j.branch_id = $${paramIndex}`;
      params.push(parseInt(branch_id));
      paramIndex++;
    } else if (req.user.role !== 'admin' && req.user.branch_id) {
      where += ` AND j.branch_id = $${paramIndex}`;
      params.push(req.user.branch_id);
      paramIndex++;
    }
    if (assigned_to) {
      where += ` AND j.assigned_to = $${paramIndex}`;
      params.push(parseInt(assigned_to));
      paramIndex++;
    }
    if (search) {
      where += ` AND (j.job_number ILIKE $${paramIndex} OR j.customer_name ILIKE $${paramIndex+1} OR j.customer_phone ILIKE $${paramIndex+2} OR j.serial_number ILIKE $${paramIndex+3})`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
      paramIndex += 4;
    }

    const totalRes = await db.query(`SELECT COUNT(*)::integer as cnt FROM job_cards j ${where}`, params);
    const total = totalRes.rows[0].cnt;

    const rowsRes = await db.query(
      `SELECT j.*, u.full_name as technician_name, b.name as branch_name 
       FROM job_cards j
       LEFT JOIN users u ON j.assigned_to = u.id
       LEFT JOIN branches b ON j.branch_id = b.id
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

// GET /api/service/technicians - List active technicians and managers
router.get('/technicians', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      "SELECT id, username, full_name, role FROM users WHERE role IN ('technician', 'admin', 'manager') AND is_active = 1 ORDER BY full_name"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/service/jobs/:id - Get single repair job details
router.get('/jobs/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      `SELECT j.*, u.full_name as technician_name, b.name as branch_name 
       FROM job_cards j
       LEFT JOIN users u ON j.assigned_to = u.id
       LEFT JOIN branches b ON j.branch_id = b.id
       WHERE j.id = $1`,
      [req.params.id]
    );
    const job = result.rows[0];
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    
    try {
      job.spare_parts = JSON.parse(job.spare_parts || '[]');
    } catch {
      job.spare_parts = [];
    }
    
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/service/jobs - Create a new repair job card
router.post('/jobs', async (req, res) => {
  try {
    const db = getDB();
    const { customer_name, customer_phone, device_details, serial_number, issue_description, estimated_cost = 0, advance_paid = 0, assigned_to, branch_id } = req.body;
    if (!customer_name || !customer_phone || !device_details || !issue_description) {
      return res.status(400).json({ success: false, message: 'Customer details, device and issue description are required' });
    }
    const bid = branch_id || req.user.branch_id || 1;
    const jobNo = await generateNumber('JOBC', 'job_cards', 'job_number', db);

    const result = await db.query(
      `INSERT INTO job_cards (job_number, customer_name, customer_phone, device_details, serial_number, issue_description, estimated_cost, advance_paid, assigned_to, branch_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [jobNo, customer_name, customer_phone, device_details, serial_number || null, issue_description, parseFloat(estimated_cost), parseFloat(advance_paid), assigned_to || null, bid]
    );
    res.json({ success: true, data: { id: result.rows[0].id, job_number: jobNo }, message: 'Repair Job Card created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/service/jobs/:id - Update job card details
router.put('/jobs/:id', async (req, res) => {
  try {
    const db = getDB();
    const { device_details, serial_number, issue_description, estimated_cost, advance_paid, assigned_to, notes } = req.body;
    
    await db.query(
      `UPDATE job_cards 
       SET device_details = $1, serial_number = $2, issue_description = $3, estimated_cost = $4, advance_paid = $5, assigned_to = $6, notes = $7, updated_at = NOW() 
       WHERE id = $8`,
      [device_details, serial_number || null, issue_description, parseFloat(estimated_cost || 0), parseFloat(advance_paid || 0), assigned_to || null, notes || null, req.params.id]
    );
    res.json({ success: true, message: 'Job Card updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/service/jobs/:id/status - Simple status progression
router.put('/jobs/:id/status', async (req, res) => {
  try {
    const db = getDB();
    const { status } = req.body;
    if (!['pending', 'in_progress', 'completed', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    await db.query(
      'UPDATE job_cards SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, req.params.id]
    );
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/service/jobs/:id/complete - Mark repair as completed & deduct stock for spare parts
router.put('/jobs/:id/complete', async (req, res) => {
  try {
    const db = getDB();
    const { final_cost, resolution_notes, spare_parts } = req.body;
    if (!resolution_notes) {
      return res.status(400).json({ success: false, message: 'Resolution details are required to complete job' });
    }

    const jobRes = await db.query('SELECT * FROM job_cards WHERE id = $1', [req.params.id]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ success: false, message: 'Job Card not found' });

    const parts = spare_parts || []; // Array of {product_id, quantity, unit_price}

    // Deduct stock for each spare part
    for (const part of parts) {
      if (part.product_id && part.quantity > 0) {
        await db.query(
          'UPDATE product_stock SET quantity = GREATEST(0, quantity - $1) WHERE product_id = $2 AND branch_id = $3',
          [parseInt(part.quantity), parseInt(part.product_id), job.branch_id]
        );
      }
    }

    await db.query(
      `UPDATE job_cards 
       SET status = 'completed', final_cost = $1, notes = $2, spare_parts = $3, resolved_date = NOW(), updated_at = NOW() 
       WHERE id = $4`,
      [parseFloat(final_cost || job.estimated_cost), resolution_notes, JSON.stringify(parts), req.params.id]
    );

    res.json({ success: true, message: 'Job completed and spare parts deducted from stock' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/service/jobs/:id/deliver - Hand over device to customer (finalize billing)
router.put('/jobs/:id/deliver', async (req, res) => {
  try {
    const db = getDB();
    await db.query(
      `UPDATE job_cards 
       SET status = 'delivered', delivered_date = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Device marked as delivered to customer' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
