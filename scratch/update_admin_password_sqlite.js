const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'enqova.db');
const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('Failed to open SQLite DB:', err);
    process.exit(1);
  }
});

const newPass = 'Hik@2001';
const hash = bcrypt.hashSync(newPass, 10);

db.run("UPDATE users SET password_hash = ? WHERE username = 'admin'", [hash], function (err) {
  if (err) {
    console.error('Error updating admin password:', err);
  } else {
    console.log('✅ Admin password updated in SQLite DB');
  }
  db.close();
});
