const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT),
});

const req = {
  params: { id: 10 },
  body: {
    customer_id: null,
    discount_percent: 0,
    discount_amount: 0,
    vat_rate: 18,
    payment_method: 'cash',
    notes: 'Test note updated',
    amount_paid: 47600,
    items: [
      { product_id: 28, quantity: 1, unit_price: 8100, discount_percent: 19.75, discount_amount: 1600, line_total: 6500, vat_applicable: 0, serial_numbers: [] },
      { product_id: 31, quantity: 1, unit_price: 19000, discount_percent: 20, discount_amount: 3800, line_total: 15200, vat_applicable: 0, serial_numbers: [] }
    ]
  },
  user: { id: 1, role: 'admin' }
};

async function main() {
  const db = pool;
  const invId = req.params.id;
  const result = await db.query('SELECT * FROM invoices WHERE id = $1', [invId]);
  const inv = result.rows[0];
  if (!inv) { console.error('Invoice not found'); return; }

  const isConfirmed = inv.invoice_status === 'confirmed';
  console.log('isConfirmed:', isConfirmed);

  const { customer_id, discount_percent = 0, discount_amount = 0, vat_rate = 18,
    payment_method = 'cash', notes, items, amount_paid = 0 } = req.body;

  const newCustomerId = customer_id || null;

  if (isConfirmed) {
    console.log('Reverting stock for confirmed invoice...');
    const oldItemsRes = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [inv.id]);
    const oldItems = oldItemsRes.rows;
    for (const item of oldItems) {
      console.log(`Restoring stock for product_id ${item.product_id}, qty ${item.quantity}`);
      await db.query(
        'UPDATE product_stock SET quantity = quantity + $1 WHERE product_id = $2 AND branch_id = $3',
        [item.quantity, item.product_id, inv.branch_id]
      );
      let serials = [];
      try { serials = JSON.parse(item.serial_numbers || '[]'); } catch(e) {}
      for (const sn of serials) {
        await db.query(
          "UPDATE product_serials SET status = 'available', invoice_id = NULL WHERE serial_number = $1",
          [sn]
        );
      }
    }
    if (inv.customer_id && inv.balance > 0) {
      console.log(`Reverting customer balance for customer_id ${inv.customer_id}, balance ${inv.balance}`);
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
  const total = subtotal - discAmt + vatAmount;

  let newAmountPaid = isConfirmed ? parseFloat(amount_paid) : 0;
  let newBalance = isConfirmed ? Math.max(0, total - newAmountPaid) : total;
  let newPayStatus = isConfirmed ? (newBalance <= 0 ? 'paid' : (newAmountPaid > 0 ? 'partial' : 'credit')) : 'draft';

  console.log(`New Totals: subtotal=${subtotal}, total=${total}, balance=${newBalance}, status=${newPayStatus}`);

  // Update invoice
  console.log('Updating invoice details...');
  await db.query(
    `UPDATE invoices 
     SET customer_id = $1, subtotal = $2, discount_percent = $3, discount_amount = $4,
         vat_rate = $5, vat_amount = $6, total = $7, amount_paid = $8, balance = $9, 
         payment_method = $10, payment_status = $11, notes = $12 
     WHERE id = $13`,
    [newCustomerId, subtotal, discount_percent, discAmt, vat_rate, vatAmount, total, newAmountPaid, newBalance, payment_method, newPayStatus, notes || null, inv.id]
  );

  // Replace items
  console.log('Replacing items...');
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

    if (isConfirmed) {
      console.log(`Deducting stock for product_id ${item.product_id}, qty ${item.quantity}`);
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

  if (isConfirmed && newCustomerId && newBalance > 0) {
    console.log(`Adding customer balance for customer_id ${newCustomerId}, balance ${newBalance}`);
    await db.query('UPDATE customers SET outstanding_balance = outstanding_balance + $1 WHERE id = $2', [newBalance, newCustomerId]);
  }

  console.log('Invoice updated successfully in test!');
  await pool.end();
}

main().catch(async (e) => {
  console.error('Error during test execution:', e);
  await pool.end();
});
