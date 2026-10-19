const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDB, generateNumber } = require('../database/db');

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 30, branch_id = '', start_date = '', end_date = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (branch_id) {
      where += ` AND i.branch_id = $${paramIndex}`;
      params.push(parseInt(branch_id));
      paramIndex++;
    } else if (req.user.role !== 'admin' && req.user.branch_id) {
      where += ` AND i.branch_id = $${paramIndex}`;
      params.push(req.user.branch_id);
      paramIndex++;
    }

    if (start_date) {
      where += ` AND i.invoice_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      where += ` AND i.invoice_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    // By default exclude drafts unless explicitly requested
    if (status) {
      where += ` AND i.invoice_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    } else {
      where += " AND (i.invoice_status IS NULL OR i.invoice_status = 'confirmed' OR i.invoice_status = 'proforma')";
    }

    const totalRes = await db.query(`SELECT COUNT(*)::integer as cnt FROM invoices i ${where}`, params);
    const total = totalRes.rows[0].cnt;

    const rowsRes = await db.query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone, b.name as branch_name, u.full_name as cashier_name 
       FROM invoices i 
       LEFT JOIN customers c ON i.customer_id = c.id 
       LEFT JOIN branches b ON i.branch_id = b.id 
       LEFT JOIN users u ON i.user_id = u.id 
       ${where} 
       ORDER BY i.created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex+1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: rowsRes.rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/invoices/drafts - list draft invoices
router.get('/drafts', async (req, res) => {
  try {
    const db = getDB();
    let where = "WHERE i.invoice_status = 'draft'";
    const params = [];
    if (req.user.role !== 'admin' && req.user.branch_id) {
      where += ' AND i.branch_id = $1';
      params.push(req.user.branch_id);
    }
    const result = await db.query(
      `SELECT i.*, c.name as customer_name, b.name as branch_name 
       FROM invoices i 
       LEFT JOIN customers c ON i.customer_id = c.id 
       LEFT JOIN branches b ON i.branch_id = b.id 
       ${where} 
       ORDER BY i.created_at DESC 
       LIMIT 50`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, c.nic as customer_nic, b.name as branch_name, u.full_name as cashier_name 
       FROM invoices i 
       LEFT JOIN customers c ON i.customer_id = c.id 
       LEFT JOIN branches b ON i.branch_id = b.id 
       LEFT JOIN users u ON i.user_id = u.id 
       WHERE i.id = $1`,
      [req.params.id]
    );
    const inv = result.rows[0];
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const itemsRes = await db.query(
      `SELECT ii.*, p.name as product_name, p.brand, p.model, p.description, p.image_path, p.warranty_months, p.retail_price, p.wholesale_price 
       FROM invoice_items ii 
       LEFT JOIN products p ON ii.product_id = p.id 
       WHERE ii.invoice_id = $1`,
      [req.params.id]
    );
    const items = itemsRes.rows;
    items.forEach(item => {
      try {
        item.serial_numbers = JSON.parse(item.serial_numbers || '[]');
      } catch {
        item.serial_numbers = [];
      }
    });
    res.json({ success: true, data: { ...inv, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/invoices/:id/print  (NO cost prices)
router.get('/:id/print', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, c.nic as customer_nic, b.name as branch_name, u.full_name as cashier_name 
       FROM invoices i 
       LEFT JOIN customers c ON i.customer_id = c.id 
       LEFT JOIN branches b ON i.branch_id = b.id 
       LEFT JOIN users u ON i.user_id = u.id 
       WHERE i.id = $1`,
      [req.params.id]
    );
    const inv = result.rows[0];
    if (!inv) return res.status(404).json({ success: false, message: 'Not found' });
    
    const itemsRes = await db.query(
      `SELECT ii.invoice_id, ii.product_id, ii.quantity, ii.unit_price, ii.discount_percent, ii.discount_amount, ii.vat_amount, ii.line_total, ii.serial_numbers, p.name as product_name, p.brand, p.model, p.description, p.image_path, p.warranty_months 
       FROM invoice_items ii 
       LEFT JOIN products p ON ii.product_id = p.id 
       WHERE ii.invoice_id = $1`,
      [req.params.id]
    );
    const items = itemsRes.rows;
    items.forEach(item => {
      try {
        item.serial_numbers = JSON.parse(item.serial_numbers || '[]');
      } catch {
        item.serial_numbers = [];
      }
    });

    const settingsRes = await db.query('SELECT `key`, `value` FROM settings');
    const settings = {};
    settingsRes.rows.forEach(r => {
      settings[r.key] = r.value;
    });
    res.json({ success: true, data: { ...inv, items, settings } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/invoices - Create invoice (confirmed or draft)
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { customer_id, branch_id, invoice_date, discount_percent = 0, discount_amount = 0, koko_charge = 0,
      vat_rate = 18, payment_method = 'cash', amount_paid = 0, notes, items,
      invoice_status = 'confirmed' } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: 'No items in invoice' });
    if (!branch_id) return res.status(400).json({ success: false, message: 'Branch required' });

    const bid = parseInt(branch_id);
    const isDraft = invoice_status === 'draft';
    const isProforma = invoice_status === 'proforma';
    const isSavedOnly = isDraft || isProforma;

    // Calculate totals
    let subtotal = 0, vatAmount = 0;
    items.forEach(item => {
      const lineTotal = (item.unit_price * item.quantity) - (item.discount_amount || 0);
      subtotal += lineTotal;
      if (item.vat_applicable) vatAmount += lineTotal * parseFloat(vat_rate) / 100;
    });
    const discAmt = parseFloat(discount_amount) || (subtotal * parseFloat(discount_percent) / 100);
    const kokoAmt = parseFloat(koko_charge) || 0;
    const total = subtotal - discAmt + vatAmount + kokoAmt;
    const balance = isSavedOnly ? total : Math.max(0, total - parseFloat(amount_paid));
    const payStatus = isProforma ? 'proforma' : (isDraft ? 'draft' : (balance <= 0 ? 'paid' : (parseFloat(amount_paid) > 0 ? 'partial' : 'credit')));

    // Generate invoice number (drafts get DFT-, proformas get PRF-)
    const invNumber = isProforma
      ? await generateNumber('PRF', 'invoices', 'invoice_number', db)
      : (isDraft ? await generateNumber('DFT', 'invoices', 'invoice_number', db) : await generateNumber('INV', 'invoices', 'invoice_number', db));

    // Insert invoice
    const invResult = await db.query(
      `INSERT INTO invoices (invoice_number, customer_id, branch_id, user_id, invoice_date,
        subtotal, discount_percent, discount_amount, vat_rate, vat_amount, total,
        payment_method, payment_status, amount_paid, balance, koko_charge, notes, invoice_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
      [
        invNumber, customer_id || null, bid, req.user.id,
        invoice_date || new Date().toISOString().split('T')[0],
        subtotal, discount_percent, discAmt, vat_rate, vatAmount, total,
        payment_method, payStatus, isSavedOnly ? 0 : parseFloat(amount_paid), balance,
        kokoAmt, notes || null, invoice_status
      ]
    );
    const invoiceId = invResult.rows[0].id;

    // Insert items
    for (const item of items) {
      const lineTotal = (item.unit_price * item.quantity) - (item.discount_amount || 0);
      const serialsJson = JSON.stringify(item.serial_numbers || []);
      await db.query(
        'INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, discount_amount, vat_amount, line_total, serial_numbers) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          invoiceId, item.product_id, item.quantity, item.unit_price,
          item.discount_percent || 0, item.discount_amount || 0,
          item.vat_applicable ? lineTotal * parseFloat(vat_rate) / 100 : 0,
          lineTotal, serialsJson
        ]
      );
      // Only deduct stock and update serials if confirmed (not draft/proforma)
      if (!isSavedOnly) {
        await db.query(
          'UPDATE product_stock SET quantity = GREATEST(0, quantity - $1) WHERE product_id = $2 AND branch_id = $3',
          [item.quantity, item.product_id, bid]
        );
        if (item.serial_numbers && item.serial_numbers.length) {
          for (const sn of item.serial_numbers) {
            await db.query(
              "UPDATE product_serials SET status = 'sold', invoice_id = $1, updated_at = NOW() WHERE serial_number = $2",
              [invoiceId, sn]
            );
          }
        }
      }
    }

    // Update customer balance if credit (confirmed only)
    if (!isSavedOnly && customer_id && balance > 0) {
      await db.query('UPDATE customers SET outstanding_balance = outstanding_balance + $1 WHERE id = $2', [balance, customer_id]);
    }

    // Send SMS Notification (Simulation)
    if (!isSavedOnly) {
      try {
        let customerPhone = '';
        let customerName = '';
        if (customer_id) {
          const custRes = await db.query('SELECT phone, name FROM customers WHERE id = $1', [customer_id]);
          if (custRes.rows[0]) {
            customerPhone = custRes.rows[0].phone;
            customerName = custRes.rows[0].name;
          }
        }
        if (customerPhone) {
          const smsMsg = `Dear ${customerName}, your invoice ${invNumber} from ENQOVA for Rs. ${total.toFixed(2)} has been generated. Thank you for your business!`;
          console.log(`\n📱 [SMS GATEWAY SIMULATION] Sending SMS to ${customerPhone}:`);
          console.log(`   "${smsMsg}"\n`);
        }
      } catch (smsErr) {
        console.error('Failed to send mock SMS:', smsErr.message);
      }
    }

    res.json({ success: true, data: { invoiceId, invoiceNumber: invNumber, total, isDraft: isSavedOnly }, message: isProforma ? 'Proforma saved' : (isDraft ? 'Draft saved' : 'Invoice created') });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/invoices/:id/confirm - Confirm a draft invoice
router.put('/:id/confirm', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    const inv = result.rows[0];
    if (!inv) return res.status(404).json({ success: false, message: 'Not found' });
    if (inv.invoice_status !== 'draft' && inv.invoice_status !== 'proforma') return res.status(400).json({ success: false, message: 'Already confirmed' });

    const { payment_method = 'cash', amount_paid = 0 } = req.body;
    const balance = Math.max(0, inv.total - parseFloat(amount_paid));
    const payStatus = balance <= 0 ? 'paid' : (parseFloat(amount_paid) > 0 ? 'partial' : 'credit');

    // Generate real invoice number (replace draft number)
    const invNumber = await generateNumber('INV', 'invoices', 'invoice_number', db);

    await db.query(
      `UPDATE invoices SET invoice_number = $1, invoice_status = 'confirmed', payment_method = $2, payment_status = $3, amount_paid = $4, balance = $5 WHERE id = $6`,
      [invNumber, payment_method, payStatus, parseFloat(amount_paid), balance, req.params.id]
    );

    // Now deduct stock and update serials
    const itemsRes = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    const items = itemsRes.rows;
    for (const item of items) {
      await db.query(
        'UPDATE product_stock SET quantity = GREATEST(0, quantity - $1) WHERE product_id = $2 AND branch_id = $3',
        [item.quantity, item.product_id, inv.branch_id]
      );
      const serials = JSON.parse(item.serial_numbers || '[]');
      for (const sn of serials) {
        await db.query(
          "UPDATE product_serials SET status = 'sold', invoice_id = $1, updated_at = NOW() WHERE serial_number = $2",
          [inv.id, sn]
        );
      }
    }

    if (inv.customer_id && balance > 0) {
      await db.query('UPDATE customers SET outstanding_balance = outstanding_balance + $1 WHERE id = $2', [balance, inv.customer_id]);
    }

    res.json({ success: true, data: { invoiceNumber: invNumber, total: inv.total }, message: 'Invoice confirmed!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/invoices/:id - Update invoice (edit items/details)
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    const inv = result.rows[0];
    if (!inv) return res.status(404).json({ success: false, message: 'Not found' });

    const isConfirmed = inv.invoice_status === 'confirmed';
    if (isConfirmed && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can edit confirmed invoices' });
    }

    const { customer_id, discount_percent = 0, discount_amount = 0, vat_rate = 18, koko_charge = 0,
      payment_method = 'cash', notes, items, amount_paid = 0 } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: 'No items' });

    const newCustomerId = customer_id || null;

    // If confirmed, revert stock, serial numbers and customer outstanding balance of the old invoice first
    if (isConfirmed) {
      const oldItemsRes = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [inv.id]);
      const oldItems = oldItemsRes.rows;
      for (const item of oldItems) {
        // Restore stock
        await db.query(
          'UPDATE product_stock SET quantity = quantity + $1 WHERE product_id = $2 AND branch_id = $3',
          [item.quantity, item.product_id, inv.branch_id]
        );
        // Restore serials
        let serials = [];
        try { serials = JSON.parse(item.serial_numbers || '[]'); } catch(e) {}
        for (const sn of serials) {
          await db.query(
            "UPDATE product_serials SET status = 'available', invoice_id = NULL WHERE serial_number = $1",
            [sn]
          );
        }
      }
      // Revert customer outstanding balance from old invoice balance
      if (inv.customer_id && inv.balance > 0) {
        await db.query('UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - $1) WHERE id = $2', [inv.balance, inv.customer_id]);
      }
    }

    // Calculate new totals
    let subtotal = 0, vatAmount = 0;
    items.forEach(item => {
      const lineTotal = (item.unit_price * item.quantity) - (item.discount_amount || 0);
      subtotal += lineTotal;
      if (item.vat_applicable) vatAmount += lineTotal * parseFloat(vat_rate) / 100;
    });
    const discAmt = parseFloat(discount_amount) || (subtotal * parseFloat(discount_percent) / 100);
    const kokoAmt = parseFloat(koko_charge) || 0;
    const total = subtotal - discAmt + vatAmount + kokoAmt;

    let newAmountPaid = isConfirmed ? parseFloat(amount_paid) : 0;
    let newBalance = isConfirmed ? Math.max(0, total - newAmountPaid) : total;
    let newPayStatus = isConfirmed ? (newBalance <= 0 ? 'paid' : (newAmountPaid > 0 ? 'partial' : 'credit')) : inv.invoice_status;

    // Update invoice details
    await db.query(
      `UPDATE invoices 
       SET customer_id = $1, subtotal = $2, discount_percent = $3, discount_amount = $4,
           vat_rate = $5, vat_amount = $6, total = $7, amount_paid = $8, balance = $9, 
           payment_method = $10, payment_status = $11, koko_charge = $12, notes = $13 
       WHERE id = $14`,
      [newCustomerId, subtotal, discount_percent, discAmt, vat_rate, vatAmount, total, newAmountPaid, newBalance, payment_method, newPayStatus, kokoAmt, notes || null, inv.id]
    );

    // Replace items
    await db.query('DELETE FROM invoice_items WHERE invoice_id = $1', [inv.id]);
    for (const item of items) {
      const lineTotal = (item.unit_price * item.quantity) - (item.discount_amount || 0);
      const serialsJson = JSON.stringify(item.serial_numbers || []);
      await db.query(
        'INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, discount_amount, vat_amount, line_total, serial_numbers) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          inv.id, item.product_id, item.quantity, item.unit_price,
          item.discount_percent || 0, item.discount_amount || 0,
          item.vat_applicable ? lineTotal * parseFloat(vat_rate) / 100 : 0,
          lineTotal, serialsJson
        ]
      );

      // If confirmed, apply new stock deductions and serial number assignments
      if (isConfirmed) {
        await db.query(
          'UPDATE product_stock SET quantity = GREATEST(0, quantity - $1) WHERE product_id = $2 AND branch_id = $3',
          [item.quantity, item.product_id, inv.branch_id]
        );
        if (item.serial_numbers && item.serial_numbers.length) {
          for (const sn of item.serial_numbers) {
            await db.query(
              "UPDATE product_serials SET status = 'sold', invoice_id = $1, updated_at = NOW() WHERE serial_number = $2",
              [inv.id, sn]
            );
          }
        }
      }
    }

    // If confirmed, update customer balance with new balance
    if (isConfirmed && newCustomerId && newBalance > 0) {
      await db.query('UPDATE customers SET outstanding_balance = outstanding_balance + $1 WHERE id = $2', [newBalance, newCustomerId]);
    }

    res.json({ success: true, message: isConfirmed ? 'Invoice updated' : 'Draft updated', data: { total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/invoices/:id/payment
router.put('/:id/payment', async (req, res) => {
  try {
    const db = getDB();
    const { amount_paid } = req.body;
    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    const inv = result.rows[0];
    if (!inv) return res.status(404).json({ success: false, message: 'Not found' });
    const newPaid = (inv.amount_paid || 0) + parseFloat(amount_paid);
    const balance = Math.max(0, inv.total - newPaid);
    const payStatus = balance <= 0 ? 'paid' : 'partial';
    await db.query('UPDATE invoices SET amount_paid = $1, balance = $2, payment_status = $3 WHERE id = $4', [newPaid, balance, payStatus, req.params.id]);
    if (inv.customer_id) {
      await db.query('UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - $1) WHERE id = $2', [amount_paid, inv.customer_id]);
    }
    res.json({ success: true, message: 'Payment updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    const inv = result.rows[0];
    if (!inv) return res.status(404).json({ success: false, message: 'Not found' });

    // Only admin can delete/void invoices
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

    // Restore stock and serials only if confirmed
    if (inv.invoice_status === 'confirmed') {
      const itemsRes = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
      const items = itemsRes.rows;
      for (const item of items) {
        // Restore stock quantity
        await db.query(
          'UPDATE product_stock SET quantity = quantity + $1 WHERE product_id = $2 AND branch_id = $3',
          [item.quantity, item.product_id, inv.branch_id]
        );
        // Restore serial number statuses
        const serials = JSON.parse(item.serial_numbers || '[]');
        for (const sn of serials) {
          await db.query(
            "UPDATE product_serials SET status = 'available', invoice_id = NULL WHERE serial_number = $1",
            [sn]
          );
        }
      }
      // Revert customer outstanding balance
      if (inv.customer_id && inv.balance > 0) {
        await db.query('UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - $1) WHERE id = $2', [inv.balance, inv.customer_id]);
      }
    }

    await db.query('DELETE FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    await db.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: inv.invoice_status === 'draft' ? 'Draft deleted' : 'Invoice voided/deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/invoices/:id/details - Update only safe details for invoices
router.put('/:id/details', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query('SELECT * FROM invoices WHERE id = $1 AND branch_id = $2', [req.params.id, req.user.branch_id]);
    const inv = result.rows[0];
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const { customer_id, notes, payment_method, payment_status } = req.body;

    await db.query(
      `UPDATE invoices 
       SET customer_id = $1, notes = $2, payment_method = $3, payment_status = $4 
       WHERE id = $5`,
      [customer_id, notes, payment_method, payment_status, req.params.id]
    );

    res.json({ success: true, message: 'Invoice details updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/invoices - Delete ALL invoices (admin only)
router.delete('/', async (req, res) => {
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
    if (adminPass !== 'Hik@1122') {
      return res.status(403).json({ success: false, message: 'Incorrect admin password' });
    }
    // Fetch all invoices
    const invoicesRes = await db.query('SELECT * FROM invoices');
    const invoices = invoicesRes.rows;
    for (const inv of invoices) {
      // Restore stock and serials for confirmed invoices
      if (inv.invoice_status === 'confirmed') {
        const itemsRes = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [inv.id]);
        const items = itemsRes.rows;
        for (const item of items) {
          await db.query(
            'UPDATE product_stock SET quantity = quantity + $1 WHERE product_id = $2 AND branch_id = $3',
            [item.quantity, item.product_id, inv.branch_id]
          );
          const serials = JSON.parse(item.serial_numbers || '[]');
          for (const sn of serials) {
            await db.query(
              "UPDATE product_serials SET status = 'available', invoice_id = NULL WHERE serial_number = $1",
              [sn]
            );
          }
        }
        // Revert customer outstanding balance
        if (inv.customer_id && inv.balance > 0) {
          await db.query('UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - $1) WHERE id = $2', [inv.balance, inv.customer_id]);
        }
      }
      // Delete invoice items and invoice
      await db.query('DELETE FROM invoice_items WHERE invoice_id = $1', [inv.id]);
      await db.query('DELETE FROM invoices WHERE id = $1', [inv.id]);
    }
    res.json({ success: true, message: 'All invoices deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;
