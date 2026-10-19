const express = require('express');
const router = express.Router();
const { getDB, generateNumber } = require('../database/db');

// Generate quotation number: QUO-YYYYMMDD-001
async function generateQuotationNumber(db) {
  return await generateNumber('QUO', 'quotations', 'quotation_number', db);
}

// GET /api/quotations - list all
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 30, status = '', search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      where += ` AND q.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (search) {
      where += ` AND (q.quotation_number ILIKE $${paramIndex} OR q.customer_name ILIKE $${paramIndex+1})`;
      const s = `%${search}%`;
      params.push(s, s);
      paramIndex += 2;
    }
    if (req.user.role !== 'admin' && req.user.branch_id) {
      where += ` AND q.branch_id = $${paramIndex}`;
      params.push(req.user.branch_id);
      paramIndex++;
    }

    const totalRes = await db.query(`SELECT COUNT(*)::integer as cnt FROM quotations q ${where}`, params);
    const total = totalRes.rows[0].cnt;

    const rowsRes = await db.query(
      `SELECT q.*, c.name as cust_name, b.name as branch_name, u.full_name as created_by
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       LEFT JOIN branches b ON q.branch_id = b.id
       LEFT JOIN users u ON q.user_id = u.id
       ${where} 
       ORDER BY q.created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex+1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: rowsRes.rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quotations/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      `SELECT q.*, c.name as cust_name, c.phone as cust_phone, c.address as cust_address,
       b.name as branch_name, b.address as branch_address, b.phone as branch_phone,
       u.full_name as created_by
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       LEFT JOIN branches b ON q.branch_id = b.id
       LEFT JOIN users u ON q.user_id = u.id
       WHERE q.id = $1`,
      [req.params.id]
    );
    const q = result.rows[0];
    if (!q) return res.status(404).json({ success: false, message: 'Not found' });

    const itemsRes = await db.query(
      'SELECT qi.*, p.image_path, p.description FROM quotation_items qi LEFT JOIN products p ON qi.product_id = p.id WHERE qi.quotation_id = $1 ORDER BY qi.id',
      [req.params.id]
    );
    
    // Get settings for print
    const settingsRes = await db.query('SELECT `key`, `value` FROM settings');
    const settings = {};
    settingsRes.rows.forEach(r => {
      settings[r.key] = r.value;
    });

    res.json({ success: true, data: { ...q, items: itemsRes.rows, settings } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations - create
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { customer_id, branch_id, quotation_date, valid_until, discount_percent = 0, discount_amount = 0,
      vat_rate = 18, notes, customer_name, customer_phone, customer_address, items } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: 'At least one item is required' });

    let bid = parseInt(branch_id) || req.user?.branch_id;
    if (!bid) {
      const bRes = await db.query('SELECT id FROM branches WHERE is_active = 1 LIMIT 1');
      bid = bRes.rows[0]?.id || 1;
    }

    let custName = customer_name ? customer_name.trim() : null;
    let custPhone = customer_phone ? customer_phone.trim() : null;
    let custAddress = customer_address ? customer_address.trim() : null;

    if (customer_id && (!custName || !custPhone)) {
      const cRes = await db.query('SELECT name, phone, address FROM customers WHERE id = $1', [customer_id]);
      if (cRes.rows.length) {
        custName = custName || cRes.rows[0].name;
        custPhone = custPhone || cRes.rows[0].phone;
        custAddress = custAddress || cRes.rows[0].address;
      }
    }

    // Calculate totals
    let subtotal = 0, vatAmount = 0;
    const cleanItems = items.map(item => {
      const price = parseFloat(item.unit_price) || 0;
      const qty = parseInt(item.quantity) || 1;
      const itemDiscPct = parseFloat(item.discount_percent) || 0;
      const discAmt = parseFloat(item.discount_amount) || (price * qty * (itemDiscPct / 100));
      const line = (price * qty) - discAmt;
      subtotal += line;
      const applyVat = item.vat_applicable === true || item.vat_applicable === 1 || item.vat_applicable === '1';
      const itemVat = applyVat ? (line * parseFloat(vat_rate || 0) / 100) : 0;
      vatAmount += itemVat;
      return {
        product_id: item.product_id ? parseInt(item.product_id) : null,
        name: item.name || item.product_name || 'Item',
        brand: item.brand || null,
        model: item.model || null,
        quantity: qty,
        unit_price: price,
        discount_percent: itemDiscPct,
        discount_amount: discAmt,
        vat_amount: itemVat,
        line_total: line,
        warranty_months: parseInt(item.warranty_months) || 0
      };
    });

    const discAmt = parseFloat(discount_amount) || (subtotal * parseFloat(discount_percent || 0) / 100);
    const total = subtotal - discAmt + vatAmount;

    const qNum = await generateQuotationNumber(db);

    // Set valid_until to 30 days from now if not provided
    const validDate = valid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const result = await db.query(
      `INSERT INTO quotations (quotation_number, customer_id, branch_id, user_id, quotation_date, valid_until,
        subtotal, discount_percent, discount_amount, vat_rate, vat_amount, total, notes, customer_name, customer_phone, customer_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        qNum, customer_id || null, bid, req.user?.id || 1,
        quotation_date || new Date().toISOString().split('T')[0], validDate,
        subtotal, parseFloat(discount_percent || 0), discAmt, parseFloat(vat_rate || 0), vatAmount, total, notes || null,
        custName, custPhone, custAddress
      ]
    );
    const qid = result.rows[0].id;

    // Insert items
    for (const item of cleanItems) {
      await db.query(
        `INSERT INTO quotation_items (quotation_id, product_id, product_name, brand, model, quantity, unit_price,
          discount_percent, discount_amount, vat_amount, line_total, warranty_months)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          qid, item.product_id, item.name,
          item.brand, item.model, item.quantity, item.unit_price,
          item.discount_percent, item.discount_amount,
          item.vat_amount, item.line_total, item.warranty_months
        ]
      );
    }

    res.json({ success: true, data: { id: qid, quotation_number: qNum, total }, message: 'Quotation created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/quotations/:id - Full edit (items + details)
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const existingRes = await db.query('SELECT * FROM quotations WHERE id = $1', [req.params.id]);
    const existing = existingRes.rows[0];
    if (!existing) return res.status(404).json({ success: false, message: 'Quotation not found' });
    if (existing.status === 'converted') return res.status(400).json({ success: false, message: 'Cannot edit a converted quotation' });

    const { status, notes, valid_until, customer_id, customer_name, customer_phone,
      customer_address, discount_percent, discount_amount, vat_rate, items } = req.body;

    // If only updating status/notes (no items)
    if (!items) {
      const fields = [];
      const params = [];
      let paramIndex = 1;
      if (status) {
        fields.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
      if (notes !== undefined) {
        fields.push(`notes = $${paramIndex}`);
        params.push(notes);
        paramIndex++;
      }
      if (valid_until) {
        fields.push(`valid_until = $${paramIndex}`);
        params.push(valid_until);
        paramIndex++;
      }
      if (!fields.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
      params.push(req.params.id);
      await db.query(`UPDATE quotations SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
      return res.json({ success: true, message: 'Quotation updated' });
    }

    // Full edit with items
    if (!items.length) return res.status(400).json({ success: false, message: 'At least one item required' });

    const vr = parseFloat(vat_rate || existing.vat_rate || 18);
    let subtotal = 0, vatAmount = 0;
    items.forEach(item => {
      const line = item.unit_price * item.quantity - (item.discount_amount || 0);
      subtotal += line;
      if (item.vat_applicable) vatAmount += line * vr / 100;
    });
    const da = parseFloat(discount_amount || 0) || subtotal * parseFloat(discount_percent || 0) / 100;
    const total = subtotal - da + vatAmount;
    const validDate = valid_until || existing.valid_until;

    await db.query(
      `UPDATE quotations SET customer_id = $1, customer_name = $2, customer_phone = $3,
        customer_address = $4, subtotal = $5, discount_percent = $6, discount_amount = $7,
        vat_rate = $8, vat_amount = $9, total = $10, valid_until = $11, notes = $12,
        status = CASE WHEN status = 'converted' THEN 'converted' ELSE COALESCE($13, status) END
        WHERE id = $14`,
      [
        customer_id || existing.customer_id || null,
        customer_name || existing.customer_name || null,
        customer_phone || existing.customer_phone || null,
        customer_address || existing.customer_address || null,
        subtotal, parseFloat(discount_percent || 0), da, vr, vatAmount, total,
        validDate, notes !== undefined ? notes : existing.notes,
        status || null, req.params.id
      ]
    );

    // Replace items
    await db.query('DELETE FROM quotation_items WHERE quotation_id = $1', [req.params.id]);
    for (const item of items) {
      const line = item.unit_price * item.quantity - (item.discount_amount || 0);
      await db.query(
        `INSERT INTO quotation_items (quotation_id, product_id, product_name, brand, model,
          quantity, unit_price, discount_percent, discount_amount, vat_amount, line_total, warranty_months)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          req.params.id, item.product_id || null,
          item.name || item.product_name || 'Item',
          item.brand || null, item.model || null,
          item.quantity, item.unit_price,
          item.discount_percent || 0, item.discount_amount || 0,
          item.vat_applicable ? line * vr / 100 : 0,
          line, item.warranty_months || 0
        ]
      );
    }

    res.json({ success: true, message: 'Quotation updated successfully', data: { total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/quotations/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    await db.query('DELETE FROM quotation_items WHERE quotation_id = $1', [req.params.id]);
    await db.query('DELETE FROM quotations WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Quotation deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations/:id/convert - Convert to Invoice
router.post('/:id/convert', async (req, res) => {
  try {
    const db = getDB();
    const existingRes = await db.query('SELECT * FROM quotations WHERE id = $1', [req.params.id]);
    const q = existingRes.rows[0];
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found' });
    if (q.status === 'converted') return res.status(400).json({ success: false, message: 'Already converted' });
    
    const itemsRes = await db.query('SELECT * FROM quotation_items WHERE quotation_id = $1', [req.params.id]);
    const items = itemsRes.rows;

    const { payment_method = 'cash', amount_paid = 0 } = req.body;
    const balance = Math.max(0, q.total - parseFloat(amount_paid));
    const payStatus = balance <= 0 ? 'paid' : (parseFloat(amount_paid) > 0 ? 'partial' : 'credit');

    // Generate invoice number
    const invNumber = await generateNumber('INV', 'invoices', 'invoice_number', db);

    const invR = await db.query(
      `INSERT INTO invoices (invoice_number, customer_id, branch_id, user_id, invoice_date,
        subtotal, discount_percent, discount_amount, vat_rate, vat_amount, total,
        payment_method, payment_status, amount_paid, balance, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        invNumber, q.customer_id || null, q.branch_id, req.user.id,
        new Date().toISOString().split('T')[0],
        q.subtotal, q.discount_percent, q.discount_amount, q.vat_rate, q.vat_amount, q.total,
        payment_method, payStatus, amount_paid, balance, `Converted from ${q.quotation_number}`
      ]
    );
    const invoiceId = invR.rows[0].id;

    for (const item of items) {
      let prodId = item.product_id;
      if (!prodId) {
        const customProd = await db.query("SELECT id FROM products WHERE sku = 'CUSTOM-ITEM' LIMIT 1");
        if (!customProd.rows.length) {
          const newProd = await db.query(
            "INSERT INTO products (name, brand, model, sku, retail_price, is_active) VALUES ('Service / Custom Item', 'General', 'Custom', 'CUSTOM-ITEM', 0, 1) RETURNING id"
          );
          prodId = newProd.rows[0].id;
        } else {
          prodId = customProd.rows[0].id;
        }
      }

      await db.query(
        `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, discount_amount, vat_amount, line_total, serial_numbers)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'[]')`,
        [
          invoiceId, prodId, item.quantity, item.unit_price,
          item.discount_percent, item.discount_amount, item.vat_amount, item.line_total
        ]
      );
      // Deduct stock only for real inventory products
      if (item.product_id) {
        await db.query(
          'UPDATE product_stock SET quantity = CASE WHEN quantity - $1 < 0 THEN 0 ELSE quantity - $1 END WHERE product_id = $2 AND branch_id = $3',
          [item.quantity, item.product_id, q.branch_id]
        );
      }
    }

    // Mark quotation as converted
    await db.query('UPDATE quotations SET status = \'converted\', converted_invoice_id = $1 WHERE id = $2', [invoiceId, q.id]);
    if (q.customer_id && balance > 0) {
      await db.query('UPDATE customers SET outstanding_balance = outstanding_balance + $1 WHERE id = $2', [balance, q.customer_id]);
    }

    res.json({ success: true, data: { invoiceId, invoiceNumber: invNumber, total: q.total }, message: 'Converted to invoice!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
