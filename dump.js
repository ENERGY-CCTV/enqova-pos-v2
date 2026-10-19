const mysqldump = require('mysqldump');
const path = require('path');

async function createBackup() {
    console.log('Starting MySQL database dump...');
    try {
        await mysqldump({
            connection: {
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'enqova',
            },
            dumpToFile: path.join(__dirname, 'enqova_backup.sql'),
        });
        console.log('✅ Database successfully backed up to: enqova_backup.sql');
    } catch (error) {
        console.error('❌ Error creating backup:', error);
    }
}

createBackup();
