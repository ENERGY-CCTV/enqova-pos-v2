const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'enqova.db');
const db = new DatabaseSync(dbPath);

const newPass = 'Hik@2001';
const hash = bcrypt.hashSync(newPass, 10);

const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?');
const info = stmt.run(hash, 'admin');
console.log('✅ Updated admin password rows affected:', info.changes);

db.close();
