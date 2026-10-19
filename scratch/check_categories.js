const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const dbPath = path.join(__dirname, '..', 'data', 'enqova.db');
const db = new DatabaseSync(dbPath);
const categories = db.prepare('SELECT * FROM categories').all();
console.log('Categories:', categories);
