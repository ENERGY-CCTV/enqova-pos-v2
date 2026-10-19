const { getDB } = require('../database/db');
const bcrypt = require('bcryptjs');
const newPass = 'Hik@2001';
const hash = bcrypt.hashSync(newPass, 10);
(async () => {
  const db = getDB();
  try {
    await db.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'admin']);
    console.log('✅ Admin password updated in DB');
  } catch (err) {
    console.error('❌ Error updating admin password:', err);
  }
})();
