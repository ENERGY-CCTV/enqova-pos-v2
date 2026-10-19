const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/enqova.db');

// Products that are NOT in grn_items
const updateStmt = db.prepare(`
  UPDATE product_stock 
  SET quantity = 0 
  WHERE product_id NOT IN (SELECT DISTINCT product_id FROM grn_items)
`);

const info = updateStmt.run();

console.log('Updated rows:', info.changes);
