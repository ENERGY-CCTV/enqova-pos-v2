const express = require('express');
const router = express.Router();
const { getDB, generateNumber } = require('../database/db');

// GET /api/transfers
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { status = '', page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      where += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (req.user.role !== 'admin' && req.user.branch_id) {
      where += ` AND (t.from_branch_id = $${paramIndex} OR t.to_branch_id = $${paramIndex+1})`;
      params.push(req.user.branch_id, req.user.branch_id);
      paramIndex += 2;
    }

    const totalRes = await db.query(`SELECT COUNT(*)::integer as cnt FROM transfers t ${where}`, params);
    const total = totalRes.rows[0].cnt;

    const rowsRes = await db.query(
      `SELECT t.*, bf.name as from_branch_name, bt.name as to_branch_name, u.full_name as requested_by_name 
       FROM transfers t 
       LEFT JOIN branches bf ON t.from_branch_id = bf.id 
       LEFT JOIN branches bt ON t.to_branch_id = bt.id 
       LEFT JOIN users u ON t.requested_by = u.id 
       ${where} 
       ORDER BY t.created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex+1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: rowsRes.rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/transfers/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      `SELECT t.*, bf.name as from_branch_name, bt.name as to_branch_name, u.full_name as requested_by_name 
       FROM transfers t 
       LEFT JOIN branches bf ON t.from_branch_id = bf.id 
       LEFT JOIN branches bt ON t.to_branch_id = bt.id 
       LEFT JOIN users u ON t.requested_by = u.id 
       WHERE t.id = $1`,
      [req.params.id]
    );
    const t = result.rows[0];
    if (!t) return res.status(404).json({ success: false, message: 'Not found' });
    const itemsRes = await db.query(
      `SELECT ti.*, p.name as product_name, p.brand, p.model 
       FROM transfer_items ti 
       LEFT JOIN products p ON ti.product_id = p.id 
       WHERE ti.transfer_id = $1`,
      [req.params.id]
    );
    const items = itemsRes.rows;
    items.forEach(i => {
      try {
        i.serial_numbers = JSON.parse(i.serial_numbers || '[]');
      } catch {
        i.serial_numbers = [];
      }
    });
    res.json({ success: true, data: { ...t, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/transfers
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { from_branch_id, to_branch_id, transfer_date, notes, items } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: 'No items' });
    if (from_branch_id === to_branch_id) return res.status(400).json({ success: false, message: 'Same branch' });
    
    const trnNumber = await generateNumber('TRN', 'transfers', 'transfer_number', db);
    const result = await db.query(
      'INSERT INTO transfers (transfer_number, from_branch_id, to_branch_id, requested_by, transfer_date, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [trnNumber, from_branch_id, to_branch_id, req.user.id, transfer_date || new Date().toISOString().split('T')[0], notes || null]
    );
    const tId = result.rows[0].id;
    
    for (const item of items) {
      await db.query(
        'INSERT INTO transfer_items (transfer_id, product_id, quantity, serial_numbers) VALUES ($1,$2,$3,$4)',
        [tId, item.product_id, item.quantity, JSON.stringify(item.serial_numbers || [])]
      );
    }
    
    res.json({ success: true, data: { id: tId, transfer_number: trnNumber }, message: 'Transfer request created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/transfers/:id (Edit)
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can edit transfers' });
    }

    const tId = req.params.id;
    const { from_branch_id, to_branch_id, transfer_date, notes, items } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: 'No items' });
    if (from_branch_id === to_branch_id) return res.status(400).json({ success: false, message: 'Same branch' });

    // Ensure it's not completed already (or maybe let admin edit anyway, but it's risky if completed)
    const tRes = await db.query('SELECT status FROM transfers WHERE id = $1', [tId]);
    if (!tRes.rows.length) return res.status(404).json({ success: false, message: 'Transfer not found' });
    if (tRes.rows[0].status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot edit a completed transfer' });
    }

    await db.query(
      'UPDATE transfers SET from_branch_id = $1, to_branch_id = $2, transfer_date = $3, notes = $4 WHERE id = $5',
      [from_branch_id, to_branch_id, transfer_date || new Date().toISOString().split('T')[0], notes || null, tId]
    );

    // Replace items
    await db.query('DELETE FROM transfer_items WHERE transfer_id = $1', [tId]);
    for (const item of items) {
      await db.query(
        'INSERT INTO transfer_items (transfer_id, product_id, quantity, serial_numbers) VALUES ($1,$2,$3,$4)',
        [tId, item.product_id, item.quantity, JSON.stringify(item.serial_numbers || [])]
      );
    }
    
    res.json({ success: true, message: 'Transfer request updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/transfers/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can delete transfers' });
    }
    const tRes = await db.query('SELECT status FROM transfers WHERE id = $1', [req.params.id]);
    if (!tRes.rows.length) return res.status(404).json({ success: false, message: 'Transfer not found' });
    if (tRes.rows[0].status === 'completed') {
       // if a completed transfer is deleted, stock should logically be reverted, but this gets complex with serials.
       // for safety, we either revert or just prevent delete of completed. I will prevent delete of completed for now.
       return res.status(400).json({ success: false, message: 'Cannot delete a completed transfer. Revert manually if needed.' });
    }

    await db.query('DELETE FROM transfer_items WHERE transfer_id = $1', [req.params.id]);
    await db.query('DELETE FROM transfers WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Transfer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/transfers/:id/approve
router.put('/:id/approve', async (req, res) => {
  try {
    if (req.user.role === 'cashier') return res.status(403).json({ success: false, message: 'Not authorized' });
    const db = getDB();
    await db.query(
      "UPDATE transfers SET status = 'approved', approved_by = $1, approved_date = NOW() WHERE id = $2 AND status = 'pending'",
      [req.user.id, req.params.id]
    );
    res.json({ success: true, message: 'Transfer approved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/transfers/:id/reject
router.put('/:id/reject', async (req, res) => {
  try {
    if (req.user.role === 'cashier') return res.status(403).json({ success: false, message: 'Not authorized' });
    const db = getDB();
    await db.query(
      "UPDATE transfers SET status = 'rejected', approved_by = $1 WHERE id = $2 AND status = 'pending'",
      [req.user.id, req.params.id]
    );
    res.json({ success: true, message: 'Transfer rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/transfers/:id/complete
router.put('/:id/complete', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query("SELECT * FROM transfers WHERE id = $1 AND status = 'approved'", [req.params.id]);
    const t = result.rows[0];
    if (!t) return res.status(400).json({ success: false, message: 'Transfer not found or not approved' });
    
    const itemsRes = await db.query('SELECT * FROM transfer_items WHERE transfer_id = $1', [req.params.id]);
    const items = itemsRes.rows;
    for (const item of items) {
      const serials = JSON.parse(item.serial_numbers || '[]');
      // Deduct from source branch
      await db.query(
        'UPDATE product_stock SET quantity = GREATEST(0, quantity - $1) WHERE product_id = $2 AND branch_id = $3',
        [item.quantity, item.product_id, t.from_branch_id]
      );
      // Add to destination branch
      await db.query(
        'INSERT IGNORE INTO product_stock (product_id, branch_id, quantity, min_quantity) VALUES ($1,$2,0,5)',
        [item.product_id, t.to_branch_id]
      );
      await db.query(
        'UPDATE product_stock SET quantity = quantity + $1 WHERE product_id = $2 AND branch_id = $3',
        [item.quantity, item.product_id, t.to_branch_id]
      );
      // Update serials
      for (const sn of serials) {
        await db.query(
          "UPDATE product_serials SET branch_id = $1, status = 'available', transfer_id = $2 WHERE serial_number = $3",
          [t.to_branch_id, t.id, sn]
        );
      }
    }
    await db.query("UPDATE transfers SET status = 'completed', completed_date = NOW() WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: 'Transfer completed, stock updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
