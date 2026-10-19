const express = require('express');
const router = express.Router();
const { getDB, generateNumber } = require('../database/db');

// GET /api/grn
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (req.user.role !== 'admin' && req.user.branch_id) {
      where += ` AND g.branch_id = $${paramIndex}`;
      params.push(req.user.branch_id);
      paramIndex++;
    }

    const totalRes = await db.query(`SELECT COUNT(*)::integer as cnt FROM grn g ${where}`, params);
    const total = totalRes.rows[0].cnt;

    const result = await db.query(
      `SELECT g.*, s.name as supplier_name, b.name as branch_name, u.full_name as created_by,
              COALESCE(gi.item_count, 0) as item_count,
              COALESCE(gi.total_qty, 0) as total_qty
       FROM grn g 
       LEFT JOIN suppliers s ON g.supplier_id = s.id 
       LEFT JOIN branches b ON g.branch_id = b.id 
       LEFT JOIN users u ON g.user_id = u.id 
       LEFT JOIN (
         SELECT grn_id, COUNT(*) as item_count, SUM(quantity) as total_qty
         FROM grn_items GROUP BY grn_id
       ) gi ON gi.grn_id = g.id
       ${where} 
       ORDER BY g.created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex+1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: result.rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/grn/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      `SELECT g.*, s.name as supplier_name, b.name as branch_name, u.full_name as created_by 
       FROM grn g 
       LEFT JOIN suppliers s ON g.supplier_id = s.id 
       LEFT JOIN branches b ON g.branch_id = b.id 
       LEFT JOIN users u ON g.user_id = u.id 
       WHERE g.id = $1`,
      [req.params.id]
    );
    const g = result.rows[0];
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });
    const itemsRes = await db.query(
      `SELECT gi.*, p.name as product_name, p.brand, p.model, p.sku 
       FROM grn_items gi 
       LEFT JOIN products p ON gi.product_id = p.id 
       WHERE gi.grn_id = $1`,
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
    res.json({ success: true, data: { ...g, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/grn (Create)
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { supplier_id, branch_id, grn_date, notes, reference_no, items } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: 'No items' });
    if (!branch_id) return res.status(400).json({ success: false, message: 'Branch required' });
    const bid = parseInt(branch_id);
    let total = 0;
    items.forEach(i => { total += (i.unit_cost || 0) * i.quantity; });
    const grnNumber = await generateNumber('GRN', 'grn', 'grn_number', db);
    const result = await db.query(
      'INSERT INTO grn (grn_number, supplier_id, branch_id, user_id, grn_date, total_amount, notes, reference_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [grnNumber, supplier_id || null, bid, req.user.id, grn_date || new Date().toISOString().split('T')[0], total, notes || null, reference_no || null]
    );
    const grnId = result.rows[0].id;

    for (const item of items) {
      const pid = parseInt(item.product_id);
      const qty = parseInt(item.quantity);
      const cost = parseFloat(item.unit_cost || 0);
      const serials = item.serial_numbers || [];
      const serialsJson = JSON.stringify(serials);

      await db.query(
        'INSERT INTO grn_items (grn_id, product_id, quantity, unit_cost, serial_numbers, total_cost) VALUES ($1,$2,$3,$4,$5,$6)',
        [grnId, pid, qty, cost, serialsJson, cost * qty]
      );
      // Update stock
      await db.query(
        'INSERT IGNORE INTO product_stock (product_id, branch_id, quantity, min_quantity) VALUES ($1,$2,0,5)',
        [pid, bid]
      );
      await db.query(
        'UPDATE product_stock SET quantity = quantity + $1 WHERE product_id = $2 AND branch_id = $3',
        [qty, pid, bid]
      );
      // Update cost price
      if (cost > 0) {
        await db.query('UPDATE products SET cost_price = $1 WHERE id = $2', [cost, pid]);
      }
      // Insert serials
      for (const sn of serials) {
        if (sn && sn.trim()) {
          try {
            await db.query(
              "INSERT IGNORE INTO product_serials (product_id, serial_number, status, branch_id, grn_id) VALUES ($1,$2,'available',$3,$4)",
              [pid, sn.trim(), bid, grnId]
            );
          } catch (e) {
            console.warn('Serial exists:', sn);
          }
        }
      }
    }
    res.json({ success: true, data: { id: grnId, grn_number: grnNumber }, message: 'GRN created & stock updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/grn/:id (Edit GRN)
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can edit GRNs' });
    }

    const grnId = req.params.id;
    const { supplier_id, branch_id, grn_date, notes, reference_no, items } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: 'No items' });
    if (!branch_id) return res.status(400).json({ success: false, message: 'Branch required' });
    
    // 1. Fetch old GRN and old items
    const oldGrnRes = await db.query('SELECT * FROM grn WHERE id = $1', [grnId]);
    if (!oldGrnRes.rows.length) return res.status(404).json({ success: false, message: 'GRN not found' });
    const oldGrn = oldGrnRes.rows[0];

    const oldItemsRes = await db.query('SELECT * FROM grn_items WHERE grn_id = $1', [grnId]);
    const oldItems = oldItemsRes.rows;

    // 2. Revert old stock and serials
    for (const old of oldItems) {
      await db.query(
        'UPDATE product_stock SET quantity = quantity - $1 WHERE product_id = $2 AND branch_id = $3',
        [old.quantity, old.product_id, oldGrn.branch_id]
      );
      let oldSerials = [];
      try { oldSerials = JSON.parse(old.serial_numbers || '[]'); } catch(e) {}
      for (const sn of oldSerials) {
        if (sn && sn.trim()) {
          // Delete only if 'available'
          await db.query(
            "DELETE FROM product_serials WHERE serial_number = $1 AND product_id = $2 AND grn_id = $3 AND status = 'available'",
            [sn.trim(), old.product_id, grnId]
          );
        }
      }
    }

    // 3. Delete old items
    await db.query('DELETE FROM grn_items WHERE grn_id = $1', [grnId]);

    // 4. Update GRN record
    const bid = parseInt(branch_id);
    let total = 0;
    items.forEach(i => { total += (parseFloat(i.unit_cost) || 0) * parseInt(i.quantity); });
    await db.query(
      'UPDATE grn SET supplier_id = $1, branch_id = $2, grn_date = $3, total_amount = $4, notes = $5, reference_no = $6 WHERE id = $7',
      [supplier_id || null, bid, grn_date || new Date().toISOString().split('T')[0], total, notes || null, reference_no || null, grnId]
    );

    // 5. Insert new items and update stock & serials
    for (const item of items) {
      const pid = parseInt(item.product_id);
      const qty = parseInt(item.quantity);
      const cost = parseFloat(item.unit_cost || 0);
      const serials = item.serial_numbers || [];
      const serialsJson = JSON.stringify(serials);

      await db.query(
        'INSERT INTO grn_items (grn_id, product_id, quantity, unit_cost, serial_numbers, total_cost) VALUES ($1,$2,$3,$4,$5,$6)',
        [grnId, pid, qty, cost, serialsJson, cost * qty]
      );
      
      // Update stock
      await db.query(
        'INSERT IGNORE INTO product_stock (product_id, branch_id, quantity, min_quantity) VALUES ($1,$2,0,5)',
        [pid, bid]
      );
      await db.query(
        'UPDATE product_stock SET quantity = quantity + $1 WHERE product_id = $2 AND branch_id = $3',
        [qty, pid, bid]
      );
      
      // Update cost price
      if (cost > 0) {
        await db.query('UPDATE products SET cost_price = $1 WHERE id = $2', [cost, pid]);
      }
      
      // Insert new serials
      for (const sn of serials) {
        if (sn && sn.trim()) {
          try {
            await db.query(
              "INSERT IGNORE INTO product_serials (product_id, serial_number, status, branch_id, grn_id) VALUES ($1,$2,'available',$3,$4)",
              [pid, sn.trim(), bid, grnId]
            );
          } catch (e) {
            console.warn('Serial exists:', sn);
          }
        }
      }
    }
    res.json({ success: true, message: 'GRN updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/grn/suppliers/all
router.get('/suppliers/all', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/grn/suppliers
router.post('/suppliers', async (req, res) => {
  try {
    const db = getDB();
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const result = await db.query(
      'INSERT INTO suppliers (name, phone, email, address) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, phone || null, email || null, address || null]
    );
    res.json({ success: true, data: { id: result.rows[0].id, name } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/grn/:id - Delete a GRN (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin permissions required' });
    }
    // Verify admin password
    const { password } = req.body;
    const adminPass = password || req.headers['x-admin-password'];
    if (!adminPass) {
      return res.status(400).json({ success: false, message: 'Admin password is required' });
    }
    if (adminPass !== 'Hik@2001') {
      return res.status(403).json({ success: false, message: 'Incorrect admin password' });
    }

    // Fetch the GRN and its items
    const grnRes = await db.query('SELECT * FROM grn WHERE id = $1', [req.params.id]);
    const grn = grnRes.rows[0];
    if (!grn) return res.status(404).json({ success: false, message: 'GRN not found' });

    const itemsRes = await db.query('SELECT * FROM grn_items WHERE grn_id = $1', [req.params.id]);
    const items = itemsRes.rows;

    // Revert stock and delete serial numbers
    for (const item of items) {
      await db.query(
        'UPDATE product_stock SET quantity = GREATEST(0, quantity - $1) WHERE product_id = $2 AND branch_id = $3',
        [item.quantity, item.product_id, grn.branch_id]
      );
      const serials = JSON.parse(item.serial_numbers || '[]');
      for (const sn of serials) {
        await db.query(
          "DELETE FROM product_serials WHERE serial_number = $1 AND product_id = $2 AND grn_id = $3",
          [sn, item.product_id, grn.id]
        );
      }
    }

    // Delete GRN items and the GRN record
    await db.query('DELETE FROM grn_items WHERE grn_id = $1', [req.params.id]);
    await db.query('DELETE FROM grn WHERE id = $1', [req.params.id]);

    res.json({ success: true, message: 'GRN deleted and stock reverted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;
