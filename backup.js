const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const zipPath = path.join(backupDir, `enqova_backup_${timestamp}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  console.log('🔄 Creating complete ENQOVA POS backup...');

  output.on('close', () => {
    const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📦 File: ${zipPath}`);
    console.log(`📊 Total Size: ${sizeMB} MB (${archive.pointer()} bytes)`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // 1. Add SQLite Database files
  const dataDir = path.join(__dirname, 'data');
  if (fs.existsSync(dataDir)) {
    console.log('📁 Backing up database files (data/)...');
    archive.directory(dataDir, 'data');
  }

  // 2. Add Product and system Uploads
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    console.log('🖼️ Backing up uploaded images (public/uploads/)...');
    archive.directory(uploadsDir, 'public/uploads');
  }

  // 3. Add .env configuration (if exists)
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    archive.file(envPath, { name: '.env.backup' });
  }

  await archive.finalize();
}

createBackup().catch((err) => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
