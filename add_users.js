const { initDatabase, getDB } = require('./database/db');
const bcrypt = require('bcryptjs');

async function addUsers() {
  await initDatabase();
  const db = getDB();
  
  const users = [
    { full_name: 'Bimula', username: 'Bimula', email: '', role: 'sales_executive', branch_name: 'Mahabage', password: 'Hik@2001' },
    { full_name: 'Chamidhu', username: 'Chamidhu', email: '', role: 'sales_executive', branch_name: 'Kelaniya', password: 'Hik@2003' },
    { full_name: 'Akash', username: 'Akash', email: '', role: 'sales_executive', branch_name: 'Mahabage', password: 'Hik@2006' },
    { full_name: 'Shehan', username: 'Shehan', email: '', role: 'accountant', branch_name: 'Mahabage', password: 'Hik@2002' },
    { full_name: 'Dananji', username: 'Dananji', email: '', role: 'manager', branch_name: 'Mahabage', password: 'Hik@2001' }
  ];

  for (const u of users) {
    const branchRes = await db.query('SELECT id FROM branches WHERE name = $1', [u.branch_name]);
    const branch_id = branchRes.rows.length > 0 ? branchRes.rows[0].id : null;
    
    const hash = bcrypt.hashSync(u.password, 10);
    
    try {
      await db.query(
        'INSERT INTO users (username, full_name, email, password_hash, role, branch_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [u.username, u.full_name, u.email || null, hash, u.role, branch_id]
      );
      console.log(`Added user ${u.username}`);
    } catch (e) {
      console.log(`Failed to add user ${u.username}: ${e.message}`);
    }
  }
}

addUsers().then(() => {
    console.log("Done");
    process.exit(0);
});
