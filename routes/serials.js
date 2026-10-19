const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// GET /api/serials/:serial
router.get('/:serial', async (req, res) => {
  try {
    const db = getDB();
    const serialNum = req.params.serial.trim();

    // 1. Get main serial info & product details
    const serialRes = await db.query(
      `SELECT ps.*, 
              p.name as product_name, p.brand, p.model, p.sku, p.image_path, p.warranty_months, 
              p.retail_price, p.wholesale_price, p.description as product_desc,
              b.name as branch_name
       FROM product_serials ps
       LEFT JOIN products p ON ps.product_id = p.id
       LEFT JOIN branches b ON ps.branch_id = b.id
       WHERE ps.serial_number = $1`,
      [serialNum]
    );

    const serialInfo = serialRes.rows[0];
    if (!serialInfo) {
      return res.status(404).json({ success: false, message: 'Serial number not found' });
    }

    // 2. Get invoice details if sold
    let invoiceInfo = null;
    if (serialInfo.invoice_id) {
      const invRes = await db.query(
        `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.nic as customer_nic, 
                u.full_name as cashier_name
         FROM invoices i
         LEFT JOIN customers c ON i.customer_id = c.id
         LEFT JOIN users u ON i.user_id = u.id
         WHERE i.id = $1`,
        [serialInfo.invoice_id]
      );
      invoiceInfo = invRes.rows[0] || null;
    }

    // 3. Get GRN details if exists
    let grnInfo = null;
    if (serialInfo.grn_id) {
      const grnRes = await db.query(
        `SELECT g.*, s.name as supplier_name
         FROM grn g
         LEFT JOIN suppliers s ON g.supplier_id = s.id
         WHERE g.id = $1`,
        [serialInfo.grn_id]
      );
      grnInfo = grnRes.rows[0] || null;
    }

    // 4. Get last transfer details if exists
    let transferInfo = null;
    if (serialInfo.transfer_id) {
      const transRes = await db.query(
        `SELECT t.*, fb.name as from_branch, tb.name as to_branch
         FROM transfers t
         LEFT JOIN branches fb ON t.from_branch_id = fb.id
         LEFT JOIN branches tb ON t.to_branch_id = tb.id
         WHERE t.id = $1`,
        [serialInfo.transfer_id]
      );
      transferInfo = transRes.rows[0] || null;
    }

    // 5. Get warranty claims for this serial number
    const claimsRes = await db.query(
      `SELECT wc.*, u.full_name as handler_name, b.name as branch_name
       FROM warranty_claims wc
       LEFT JOIN users u ON wc.user_id = u.id
       LEFT JOIN branches b ON wc.branch_id = b.id
       WHERE wc.serial_number = $1
       ORDER BY wc.claim_date DESC`,
      [serialNum]
    );

    // 6. Get all transfer history for this serial number (including past ones)
    const transHistoryRes = await db.query(
      `SELECT t.transfer_number, t.transfer_date, t.status, 
              fb.name as from_branch, tb.name as to_branch
       FROM transfer_items ti
       JOIN transfers t ON ti.transfer_id = t.id
       JOIN branches fb ON t.from_branch_id = fb.id
       JOIN branches tb ON t.to_branch_id = tb.id
       WHERE ti.serial_numbers LIKE $1
       ORDER BY t.transfer_date DESC`,
      [`%"${serialNum}"%`]
    );

    res.json({
      success: true,
      data: {
        serial: {
          serial_number: serialInfo.serial_number,
          status: serialInfo.status,
          notes: serialInfo.notes,
          created_at: serialInfo.created_at,
          updated_at: serialInfo.updated_at
        },
        product: {
          id: serialInfo.product_id,
          name: serialInfo.product_name,
          brand: serialInfo.brand,
          model: serialInfo.model,
          sku: serialInfo.sku,
          image_path: serialInfo.image_path,
          warranty_months: serialInfo.warranty_months,
          retail_price: serialInfo.retail_price,
          wholesale_price: serialInfo.wholesale_price,
          description: serialInfo.product_desc
        },
        branch: {
          id: serialInfo.branch_id,
          name: serialInfo.branch_name
        },
        invoice: invoiceInfo,
        grn: grnInfo,
        transfer: transferInfo,
        warranty_claims: claimsRes.rows,
        transfers_history: transHistoryRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
