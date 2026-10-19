const express = require('express');
const router = express.Router();
const { getDB, generateNumber } = require('../database/db');

// GET /api/warranties
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { status = '', page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      where += ` AND w.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (req.user.role !== 'admin' && req.user.branch_id) {
      where += ` AND w.branch_id = $${paramIndex}`;
      params.push(req.user.branch_id);
      paramIndex++;
    }

    const totalRes = await db.query(`SELECT COUNT(*)::integer as cnt FROM warranty_claims w ${where}`, params);
    const total = totalRes.rows[0].cnt;

    const rowsRes = await db.query(
      `SELECT w.*, p.name as product_name, p.brand, p.model, c.name as customer_name 
       FROM warranty_claims w 
       LEFT JOIN products p ON w.product_id = p.id 
       LEFT JOIN customers c ON w.customer_id = c.id 
       ${where} 
       ORDER BY w.created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex+1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: rowsRes.rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/warranties/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      `SELECT w.*, p.name as product_name, p.brand, p.model, c.name as customer_name, b.name as branch_name 
       FROM warranty_claims w 
       LEFT JOIN products p ON w.product_id = p.id 
       LEFT JOIN customers c ON w.customer_id = c.id 
       LEFT JOIN branches b ON w.branch_id = b.id 
       WHERE w.id = $1`,
      [req.params.id]
    );
    const w = result.rows[0];
    if (!w) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: w });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/warranties/:id/print
router.get('/:id/print', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      `SELECT w.*, p.name as product_name, p.brand, p.model, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, 
              b.name as branch_name, b.phone as branch_phone, b.address as branch_address, 
              i.invoice_number, i.invoice_date,
              u.full_name as resolved_by_name
       FROM warranty_claims w 
       LEFT JOIN products p ON w.product_id = p.id 
       LEFT JOIN customers c ON w.customer_id = c.id 
       LEFT JOIN branches b ON w.branch_id = b.id 
       LEFT JOIN invoices i ON w.invoice_id = i.id
       LEFT JOIN users u ON w.user_id = u.id
       WHERE w.id = $1`,
      [req.params.id]
    );
    const w = result.rows[0];
    if (!w) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: w });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/warranties (Create claim)
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { serial_number, claim_date, issue_description, branch_id } = req.body;
    if (!serial_number || !issue_description) {
      return res.status(400).json({ success: false, message: 'Serial number and issue required' });
    }
    // Lookup serial
    const serialRes = await db.query(
      `SELECT ps.*, p.id as pid, p.warranty_months, inv.customer_id, inv.id as invoice_id 
       FROM product_serials ps 
       LEFT JOIN products p ON ps.product_id = p.id 
       LEFT JOIN invoices inv ON ps.invoice_id = inv.id 
       WHERE ps.serial_number = $1`,
      [serial_number]
    );
    const serial = serialRes.rows[0];
    if (!serial) return res.status(404).json({ success: false, message: 'Serial number not found in system' });
    
    const claimNumber = await generateNumber('WRN', 'warranty_claims', 'claim_number', db);
    const bid = branch_id || req.user.branch_id || 1;
    const result = await db.query(
      `INSERT INTO warranty_claims (claim_number, serial_number, product_id, customer_id, invoice_id, branch_id, user_id, claim_date, issue_description) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [claimNumber, serial_number, serial.pid, serial.customer_id || null, serial.invoice_id || null, bid, req.user.id, claim_date || new Date().toISOString().split('T')[0], issue_description]
    );
    
    // Update serial status
    await db.query("UPDATE product_serials SET status = 'warranty' WHERE serial_number = $1", [serial_number]);
    res.json({ success: true, data: { id: result.rows[0].id, claim_number: claimNumber }, message: 'Warranty claim created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/warranties/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const db = getDB();
    const { status } = req.body;
    await db.query('UPDATE warranty_claims SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/warranties/:id/resolve
router.put('/:id/resolve', async (req, res) => {
  try {
    const db = getDB();
    const { resolution_notes, replacement_serial } = req.body;
    if (!resolution_notes) return res.status(400).json({ success: false, message: 'Resolution notes required' });
    
    const result = await db.query('SELECT * FROM warranty_claims WHERE id = $1', [req.params.id]);
    const w = result.rows[0];
    if (!w) return res.status(404).json({ success: false, message: 'Not found' });
    
    await db.query(
      "UPDATE warranty_claims SET status = 'completed', resolution_notes = $1, replacement_serial = $2, resolved_date = CURRENT_DATE WHERE id = $3",
      [resolution_notes, replacement_serial || null, req.params.id]
    );
    // Mark original serial as damaged
    await db.query("UPDATE product_serials SET status = 'damaged' WHERE serial_number = $1", [w.serial_number]);
    // If replacement serial, update it and the old invoice
    if (replacement_serial) {
      try {
        await db.query("UPDATE product_serials SET status = 'sold', invoice_id = $1 WHERE serial_number = $2", [w.invoice_id, replacement_serial]);
        
        // Update the invoice_items JSON array to replace the old serial with the new one
        if (w.invoice_id) {
          const invItemsRes = await db.query('SELECT id, serial_numbers FROM invoice_items WHERE invoice_id = $1 AND product_id = $2', [w.invoice_id, w.product_id]);
          for (let row of invItemsRes.rows) {
            if (row.serial_numbers) {
              let serialsArr = [];
              try { serialsArr = JSON.parse(row.serial_numbers); } catch(e){}
              const index = serialsArr.indexOf(w.serial_number);
              if (index !== -1) {
                serialsArr[index] = replacement_serial; // Replace old with new
                await db.query('UPDATE invoice_items SET serial_numbers = $1 WHERE id = $2', [JSON.stringify(serialsArr), row.id]);
                break; // Assuming only one row matches
              }
            }
          }
        }
      } catch (e) {
        console.error('Error updating replacement serial:', e);
      }
    }
    res.json({ success: true, message: 'Warranty claim resolved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
