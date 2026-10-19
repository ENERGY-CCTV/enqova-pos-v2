const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/enqova.db');

const rows = db.prepare(`
  SELECT p.id, p.name, p.brand, p.category_id, p.is_active, ps.branch_id, ps.quantity 
  FROM products p
  LEFT JOIN product_stock ps ON p.id = ps.product_id
  WHERE p.name LIKE '%Cruiser SC%' OR p.name LIKE '%Cue 2E%' OR p.name LIKE '%Bulb Cam%'
`).all();

console.log(JSON.stringify(rows, null, 2));
