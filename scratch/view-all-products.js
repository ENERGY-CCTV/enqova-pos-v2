const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'enqova'
  });

  const [rows] = await conn.query('SELECT id, name, sku, retail_price, wholesale_price, cost_price FROM products');
  for (const row of rows) {
    console.log(`${row.id}\t${row.sku}\t${row.retail_price}\t${row.wholesale_price}\t${row.name}`);
  }
  await conn.end();
}

run().catch(console.error);
