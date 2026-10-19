const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, 'data', 'enqova.db'));

db.prepare("UPDATE branches SET name = 'Mahabage Branch', address = 'No. 530A, Negombo Road, Mahabage, Ragama', email = 'info@enqova.lk' WHERE id = 1").run();
db.prepare("UPDATE branches SET name = 'Kelaniya Branch', address = 'No. 01, Wewalduwa Road, Dalugama, Kelaniya', email = 'sales@enqova.lk' WHERE id = 2").run();

console.log('Branches updated successfully!');
