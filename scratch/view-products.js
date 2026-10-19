const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'enqova'
  });

  const [rows] = await conn.query('SELECT id, name, brand, model, retail_price, wholesale_price, cost_price, sku FROM products');
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
}

run().catch(console.error);
