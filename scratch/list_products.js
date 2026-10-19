const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT),
});

async function main() {
  const res = await pool.query('SELECT COUNT(*)::integer as cnt FROM products');
  console.log('Total products:', res.rows[0].cnt);
  await pool.end();
}

main().catch(console.error);
