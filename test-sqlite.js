// Test node:sqlite built-in
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
db.prepare('INSERT INTO test (name) VALUES (?)').run('ENQOVA');
const row = db.prepare('SELECT * FROM test').get();
console.log('✅ node:sqlite built-in works!', row);
db.close();
