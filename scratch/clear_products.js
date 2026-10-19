const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dbFiles = ['enqova.db', 'energy_cctv.db'];

dbFiles.forEach(dbFile => {
  const dbPath = path.join(__dirname, '..', 'data', dbFile);
  if (fs.existsSync(dbPath)) {
    console.log(`Processing ${dbFile}...`);
    const db = new DatabaseSync(dbPath);
    
    // Count before
    const beforeCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
    console.log(`Products count before deletion: ${beforeCount}`);

    // Delete records
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec('DELETE FROM product_serials;');
    db.exec('DELETE FROM product_stock;');
    db.exec('DELETE FROM products;');
    try {
      db.exec("DELETE FROM sqlite_sequence WHERE name IN ('products', 'product_stock', 'product_serials');");
    } catch(e) {}
    db.exec('PRAGMA foreign_keys = ON;');

    // Count after
    const afterCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
    console.log(`Products count after deletion: ${afterCount}`);
  }
});
