const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'Hik@1122',
  database: process.env.PGDATABASE || 'enqova',
  port: parseInt(process.env.PGPORT || '5433'),
});

async function main() {
  try {
    const invRes = await pool.query('SELECT * FROM invoices ORDER BY id DESC LIMIT 5');
    console.log('--- INVOICES ---');
    console.log(invRes.rows);
    
    if (invRes.rows.length > 0) {
      const itemsRes = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invRes.rows[0].id]);
      console.log('--- LATEST INVOICE ITEMS ---');
      console.log(itemsRes.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
