const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const dbPath = path.join(__dirname, '..', 'data', 'enqova.db');
const db = new DatabaseSync(dbPath);

const count = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
console.log(`Total Products in DB: ${count}`);

const sample = db.prepare('SELECT id, name, brand, model, warranty_months, cost_price, retail_price, wholesale_price FROM products LIMIT 5').all();
console.log('Sample Products:', sample);
