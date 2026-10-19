const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const dbPath = path.join(__dirname, '..', 'data', 'enqova.db');
const db = new DatabaseSync(dbPath);
const tableInfo = db.prepare("PRAGMA table_info('products')").all();
console.log('products columns:', tableInfo.map(c => c.name));
