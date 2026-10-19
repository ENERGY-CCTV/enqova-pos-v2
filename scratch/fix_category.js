const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/enqova.db');

// Check what category_id 1 is
const cat = db.prepare('SELECT * FROM categories WHERE id = 1').get();
console.log('Category 1:', cat);

// Update category_id to 1 for the products with category_id = null that are IMOU
const updateStmt = db.prepare(`UPDATE products SET category_id = 1 WHERE brand = 'IMOU' AND category_id IS NULL`);
const info = updateStmt.run();
console.log('Updated rows:', info.changes);
