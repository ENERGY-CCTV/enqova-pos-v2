const mysql = require('mysql2/promise');

async function test() {
  const credentials = [
    { user: 'root', password: '' },
    { user: 'root', password: 'password' },
    { user: 'root', password: 'root' },
    { user: 'root', password: 'Hik@1122' },
    { user: 'postgres', password: 'Hik@1122' },
  ];

  for (const cred of credentials) {
    try {
      console.log(`Trying ${cred.user}:${cred.password}...`);
      const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: cred.user,
        password: cred.password
      });
      console.log(`✅ Success with user: ${cred.user}, password: ${cred.password}`);
      const [rows] = await conn.query('SHOW DATABASES');
      console.log('Databases:', rows.map(r => r.Database));
      await conn.end();
      return;
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
    }
  }
}

test();
