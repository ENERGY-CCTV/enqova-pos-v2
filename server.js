const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { initDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'enqova_SECRET_2024_SECURE';

// Ensure uploads dir
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Initialize database
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer for image uploads (lazy to avoid issues)
let _upload;
function getUpload() {
  if (!_upload) {
    const multer = require('multer');
    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadsDir),
      filename: (req, file, cb) => { const ext = path.extname(file.originalname); cb(null, `img_${Date.now()}${ext}`); }
    });
    _upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => { if (file.mimetype.startsWith('image/')) cb(null, true); else cb(new Error('Images only')); } });
  }
  return _upload;
}
app.set('upload', { single: (field) => (req, res, next) => getUpload().single(field)(req, res, next) });

// JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
  if (!token) return res.status(401).json({ success: false, message: 'Access denied. Please login.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ success: false, message: 'Invalid or expired token. Please login again.' }); }
}
app.set('jwtSecret', JWT_SECRET);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', authenticateToken, require('./routes/products'));
app.use('/api/customers', authenticateToken, require('./routes/customers'));
app.use('/api/invoices', authenticateToken, require('./routes/invoices'));
app.use('/api/grn', authenticateToken, require('./routes/grn'));
app.use('/api/transfers', authenticateToken, require('./routes/transfers'));
app.use('/api/warranties', authenticateToken, require('./routes/warranties'));
app.use('/api/service', authenticateToken, require('./routes/service'));
app.use('/api/reports', authenticateToken, require('./routes/reports'));
app.use('/api/users', authenticateToken, require('./routes/users'));
app.use('/api/ai', authenticateToken, require('./routes/ai'));
app.use('/api/settings', authenticateToken, require('./routes/settings'));
app.use('/api/backup', authenticateToken, require('./routes/backup'));
app.use('/api/serials', authenticateToken, require('./routes/serials'));
app.use('/api/quotations', authenticateToken, require('./routes/quotations'));
app.use('/api/jobsheets', authenticateToken, require('./routes/jobsheets'));

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('*.html', (req, res) => {
  const file = path.join(__dirname, 'public', req.path);
  res.sendFile(file, err => { if (err) res.redirect('/'); });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('\n🎥 ═══════════════════════════════════════');
  console.log('   ENQOVA POS System v1.0');
  console.log('═══════════════════════════════════════════');
  console.log(`📡 URL:      http://localhost:${PORT}`);
  console.log(`📁 Database: PostgreSQL (${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'enqova'})`);
  console.log('═══════════════════════════════════════════\n');
});

module.exports = app;
