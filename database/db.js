// ═══════════════════════════════════════════════
// ENQOVA POS - Database Layer (MySQL with SQLite Fallback)
// ═══════════════════════════════════════════════

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Read environment variables
require('dotenv').config();

let isSqliteMode = false;
let sqliteInstance = null;

const sslConfig = process.env.DB_SSL === 'true' || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
  ? { rejectUnauthorized: false }
  : undefined;

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'enqova',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  ssl: sslConfig
});

function getSqliteInstance() {
  if (!sqliteInstance) {
    const { DatabaseSync } = require('node:sqlite');
    let dbPath = path.join(__dirname, '..', 'data', 'enqova.db');
    if (!fs.existsSync(dbPath)) {
      const oldDbPath = path.join(__dirname, '..', 'data', 'energy_cctv.db');
      if (fs.existsSync(oldDbPath)) {
        dbPath = oldDbPath;
      }
    }
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    sqliteInstance = new DatabaseSync(dbPath);
    sqliteInstance.exec('PRAGMA foreign_keys = ON;');
    try {
      sqliteInstance.exec("UPDATE settings SET value = 'ENQOVA SMART LIFE' WHERE key = 'company_name';");
      sqliteInstance.exec("UPDATE branches SET email = 'info@enqova.lk' WHERE email LIKE '%energycctv%';");
    } catch (e) {}
  }
  return sqliteInstance;
}

function querySqlite(sql, params = []) {
  const db = getSqliteInstance();

  // 1. Parameter conversion: $1, $2 -> ?
  const sqliteParams = [];
  let sqliteSql = sql.replace(/\$(\d+)/g, (match, num) => {
    sqliteParams.push(params[parseInt(num) - 1]);
    return '?';
  });

  // 2. Syntax conversions for SQLite compatibility
  sqliteSql = sqliteSql.replace(/\bILIKE\b/gi, 'LIKE');
  sqliteSql = sqliteSql.replace(/::integer/gi, '');
  sqliteSql = sqliteSql.replace(/::text/gi, '');
  sqliteSql = sqliteSql.replace(/INSERT IGNORE INTO/gi, 'INSERT OR IGNORE INTO');
  sqliteSql = sqliteSql.replace(/ON DUPLICATE KEY UPDATE\s+`?value`?\s*=\s*VALUES\(`?value`?\)/gi, 'ON CONFLICT(`key`) DO UPDATE SET `value` = excluded.`value`');
  sqliteSql = sqliteSql.replace(/\bNOW\(\)/gi, "datetime('now')");
  sqliteSql = sqliteSql.replace(/\bCURDATE\(\)/gi, "date('now')");
  sqliteSql = sqliteSql.replace(/INTERVAL '(\d+) days'/gi, "'-$1 days'");
  sqliteSql = sqliteSql.replace(/CURRENT_DATE\s*-\s*INTERVAL\s*'(\d+)\s*days'/gi, "DATE('now', '-$1 days')");
  sqliteSql = sqliteSql.replace(/CURRENT_DATE\s*-\s*'-(\d+)\s*days'/gi, "DATE('now', '-$1 days')");
  sqliteSql = sqliteSql.replace(/\bGREATEST\(([^,]+),\s*([^)]+)\)/gi, "MAX($1, $2)");

  // 3. Strip RETURNING id
  let isReturningId = false;
  if (/RETURNING\s+id\b/i.test(sqliteSql)) {
    isReturningId = true;
    sqliteSql = sqliteSql.replace(/RETURNING\s+id\b/i, '');
  }

  const isSelect = /^\s*(SELECT|PRAGMA|WITH|EXPLAIN)/i.test(sqliteSql);

  if (isSelect) {
    const stmt = db.prepare(sqliteSql);
    const rows = stmt.all(...sqliteParams);
    return {
      rows: Array.isArray(rows) ? rows : [],
      rowCount: rows ? rows.length : 0
    };
  } else {
    const stmt = db.prepare(sqliteSql);
    const info = stmt.run(...sqliteParams);
    let rows = [];
    if (isReturningId && info.lastInsertRowid) {
      rows = [{ id: Number(info.lastInsertRowid) }];
    }
    return {
      rows,
      rowCount: info.changes
    };
  }
}

async function query(sql, params = []) {
  if (isSqliteMode) {
    try {
      return querySqlite(sql, params);
    } catch (err) {
      console.error('[SQLITE QUERY ERROR]', err.message, '\nQuery:', sql, '\nParams:', params);
      throw err;
    }
  }

  try {
    // 1. Emulate PostgreSQL's parameterized queries ($1, $2) -> (?, ?)
    const mysqlParams = [];
    let mysqlSql = sql.replace(/\$(\d+)/g, (match, num) => {
      mysqlParams.push(params[parseInt(num) - 1]);
      return '?';
    });

    // 2. MySQL specific syntax conversions
    mysqlSql = mysqlSql.replace(/\bILIKE\b/gi, 'LIKE');
    mysqlSql = mysqlSql.replace(/::integer/gi, '');
    mysqlSql = mysqlSql.replace(/INTERVAL '(\d+) days'/gi, 'INTERVAL $1 DAY');

    // 3. Strip RETURNING id
    let isReturningId = false;
    if (/RETURNING\s+id\b/i.test(mysqlSql)) {
      isReturningId = true;
      mysqlSql = mysqlSql.replace(/RETURNING\s+id\b/i, '');
    }

    const [rows] = await mysqlPool.query(mysqlSql, mysqlParams);

    // 4. Emulate PostgreSQL response format
    let finalRows = rows;
    if (isReturningId && rows.insertId) {
      finalRows = [{ id: rows.insertId }];
    }

    return {
      rows: Array.isArray(finalRows) ? finalRows : [],
      rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows
    };
  } catch (err) {
    console.error('[MYSQL QUERY ERROR]', err.message, '\nQuery:', sql, '\nParams:', params);
    throw err;
  }
}

function getDB() {
  return { query };
}

async function initDatabase() {
  try {
    // Attempt MySQL connection
    const connection = await mysqlPool.getConnection();
    connection.release();

    // Create Tables natively in MySQL
    const schemas = [
      `CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) UNIQUE NOT NULL,
        value TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(100),
        manager_name VARCHAR(100),
        is_active INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'cashier',
        branch_id INTEGER,
        is_active INTEGER DEFAULT 1,
        permissions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        brand VARCHAR(100),
        model VARCHAR(100),
        category_id INTEGER,
        sku VARCHAR(100) UNIQUE,
        description TEXT,
        image_path VARCHAR(255),
        warranty_months INTEGER DEFAULT 12,
        vat_applicable INTEGER DEFAULT 0,
        retail_price DOUBLE DEFAULT 0,
        wholesale_price DOUBLE DEFAULT 0,
        cost_price DOUBLE DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        is_quick_add INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS product_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INTEGER NOT NULL,
        branch_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 0,
        min_quantity INTEGER DEFAULT 5,
        UNIQUE KEY(product_id, branch_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS product_serials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INTEGER NOT NULL,
        serial_number VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'available',
        branch_id INTEGER,
        grn_id INTEGER,
        invoice_id INTEGER,
        transfer_id INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_code VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        nic VARCHAR(50),
        email VARCHAR(100),
        address TEXT,
        customer_type VARCHAR(50) DEFAULT 'retail',
        credit_limit DOUBLE DEFAULT 0,
        outstanding_balance DOUBLE DEFAULT 0,
        branch_id INTEGER,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(100),
        address TEXT,
        is_active INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS grn (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grn_number VARCHAR(100) UNIQUE,
        reference_no VARCHAR(255),
        supplier_id INTEGER,
        branch_id INTEGER NOT NULL,
        user_id INTEGER,
        grn_date DATE DEFAULT (CURRENT_DATE),
        total_amount DOUBLE DEFAULT 0,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS grn_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grn_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost DOUBLE DEFAULT 0,
        serial_numbers TEXT,
        total_cost DOUBLE DEFAULT 0,
        FOREIGN KEY (grn_id) REFERENCES grn(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE,
        customer_id INTEGER,
        branch_id INTEGER NOT NULL,
        user_id INTEGER,
        invoice_date DATE DEFAULT (CURRENT_DATE),
        subtotal DOUBLE DEFAULT 0,
        discount_percent DOUBLE DEFAULT 0,
        discount_amount DOUBLE DEFAULT 0,
        vat_rate DOUBLE DEFAULT 18,
        vat_amount DOUBLE DEFAULT 0,
        total DOUBLE DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'cash',
        payment_status VARCHAR(50) DEFAULT 'paid',
        amount_paid DOUBLE DEFAULT 0,
        balance DOUBLE DEFAULT 0,
        koko_charge DOUBLE DEFAULT 0,
        notes TEXT,
        invoice_status VARCHAR(50) DEFAULT 'confirmed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DOUBLE DEFAULT 0,
        discount_percent DOUBLE DEFAULT 0,
        discount_amount DOUBLE DEFAULT 0,
        vat_amount DOUBLE DEFAULT 0,
        line_total DOUBLE DEFAULT 0,
        serial_numbers TEXT,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transfer_number VARCHAR(100) UNIQUE,
        from_branch_id INTEGER NOT NULL,
        to_branch_id INTEGER NOT NULL,
        requested_by INTEGER,
        approved_by INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        transfer_date DATE DEFAULT (CURRENT_DATE),
        approved_date DATETIME,
        completed_date DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (to_branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS transfer_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transfer_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        serial_numbers TEXT,
        FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS warranty_claims (
        id INT AUTO_INCREMENT PRIMARY KEY,
        claim_number VARCHAR(100) UNIQUE,
        serial_number VARCHAR(100) NOT NULL,
        product_id INTEGER,
        customer_id INTEGER,
        invoice_id INTEGER,
        branch_id INTEGER,
        user_id INTEGER,
        claim_date DATE DEFAULT (CURRENT_DATE),
        issue_description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        resolution_notes TEXT,
        resolved_date DATETIME,
        replacement_serial VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS quotations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quotation_number VARCHAR(100) UNIQUE NOT NULL,
        customer_id INTEGER,
        branch_id INTEGER NOT NULL,
        user_id INTEGER,
        quotation_date DATE DEFAULT (CURRENT_DATE),
        valid_until DATE,
        subtotal DOUBLE DEFAULT 0,
        discount_percent DOUBLE DEFAULT 0,
        discount_amount DOUBLE DEFAULT 0,
        vat_rate DOUBLE DEFAULT 18,
        vat_amount DOUBLE DEFAULT 0,
        total DOUBLE DEFAULT 0,
        status VARCHAR(50) DEFAULT 'draft',
        notes TEXT,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_address TEXT,
        converted_invoice_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (converted_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS quotation_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quotation_id INTEGER NOT NULL,
        product_id INTEGER,
        product_name VARCHAR(255) NOT NULL,
        brand VARCHAR(100),
        model VARCHAR(100),
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DOUBLE DEFAULT 0,
        discount_percent DOUBLE DEFAULT 0,
        discount_amount DOUBLE DEFAULT 0,
        vat_amount DOUBLE DEFAULT 0,
        line_total DOUBLE DEFAULT 0,
        warranty_months INTEGER DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS job_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_number VARCHAR(100) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        device_details TEXT NOT NULL,
        serial_number VARCHAR(100),
        issue_description TEXT NOT NULL,
        estimated_cost DOUBLE DEFAULT 0,
        advance_paid DOUBLE DEFAULT 0,
        final_cost DOUBLE DEFAULT 0,
        assigned_to INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        spare_parts TEXT,
        notes TEXT,
        branch_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resolved_date DATETIME,
        delivered_date DATETIME,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS job_sheets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_sheet_number VARCHAR(100) UNIQUE NOT NULL,
        technician_id INTEGER,
        technician_names TEXT,
        job_date DATE DEFAULT (CURRENT_DATE),
        customer_name VARCHAR(255),
        customer_address TEXT,
        customer_phone VARCHAR(50),
        quotation_number VARCHAR(100),
        items_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
      )`
    ];

    for (const sql of schemas) {
      await mysqlPool.query(sql);
    }

    // Seed Data if needed
    const [branchRows] = await mysqlPool.query('SELECT * FROM branches LIMIT 1');
    if (branchRows.length === 0) {
      await mysqlPool.query("INSERT INTO branches (name, address, phone) VALUES ('Mahabage', 'Mahabage', '011-1234567'), ('Kelaniya', 'Kelaniya', '081-1234567')");
    }

    const [userRows] = await mysqlPool.query('SELECT * FROM users LIMIT 1');
    if (userRows.length === 0) {
      const hash = bcrypt.hashSync('Hik@2001', 10);
      await mysqlPool.query("INSERT INTO users (username, full_name, password_hash, role, branch_id) VALUES ('admin', 'System Admin', ?, 'admin', 1)", [hash]);
    }

    const [settingRows] = await mysqlPool.query('SELECT * FROM settings LIMIT 1');
    if (settingRows.length === 0) {
      await mysqlPool.query("INSERT INTO settings (`key`, value) VALUES ('company_name', 'ENQOVA'), ('vat_rate', '18'), ('currency', 'Rs.'), ('gemini_api_key', '')");
    }

    console.log('✅ MySQL Database initialized successfully');
  } catch (err) {
    console.log('⚠️ MySQL connection failed, falling back to SQLite database...');
    isSqliteMode = true;
    try {
      const sqliteDb = getSqliteInstance();
      // Run migrations for any columns added after the DB was first created
      const migrations = [
        "ALTER TABLE products ADD COLUMN is_quick_add INTEGER DEFAULT 0",
        "ALTER TABLE grn ADD COLUMN reference_no VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN permissions TEXT",
        "ALTER TABLE invoices ADD COLUMN koko_charge DOUBLE DEFAULT 0",
      ];
      for (const migration of migrations) {
        try { sqliteDb.exec(migration); } catch (e) { /* column already exists */ }
      }
      console.log('✅ SQLite Database initialized successfully from data/enqova.db');
    } catch (sqliteErr) {
      console.error('❌ SQLite Database initialization error:', sqliteErr.message);
    }
  }
}

async function generateNumber(prefix, table, field, db) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const likePattern = `${prefix}-${today}-%`;
  const res = await db.query(`SELECT ${field} FROM ${table} WHERE ${field} LIKE $1`, [likePattern]);
  let maxn = 0;
  for (const row of res.rows) {
    const val = row[field];
    if (val) {
      const parts = val.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxn) maxn = num;
    }
  }
  const next = maxn + 1;
  return `${prefix}-${today}-${String(next).padStart(3, '0')}`;
}

async function generateCustomerCode(db) {
  const res = await db.query(`SELECT customer_code FROM customers WHERE customer_code LIKE $1`, ['CUST-%']);
  let maxn = 0;
  for (const row of res.rows) {
    const val = row.customer_code;
    if (val) {
      const parts = val.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxn) maxn = num;
    }
  }
  const next = maxn + 1;
  return `CUST-${String(next).padStart(4, '0')}`;
}

module.exports = { getDB, initDatabase, query, generateNumber, generateCustomerCode };
