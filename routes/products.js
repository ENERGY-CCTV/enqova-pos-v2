const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { search = '', category_id = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE p.is_active = 1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      where += ` AND (p.name ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex+1} OR p.model ILIKE $${paramIndex+2} OR p.sku ILIKE $${paramIndex+3})`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
      paramIndex += 4;
    }
    if (category_id) {
      where += ` AND p.category_id = $${paramIndex}`;
      params.push(parseInt(category_id));
      paramIndex += 1;
    }

    const totalRes = await db.query(`SELECT COUNT(*)::integer as cnt FROM products p ${where}`, params);
    const total = totalRes.rows[0].cnt;

    const productsRes = await db.query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where} ORDER BY p.name LIMIT $${paramIndex} OFFSET $${paramIndex+1}`,
      [...params, parseInt(limit), offset]
    );
    const products = productsRes.rows;

    // Add branch stocks
    await Promise.all(
      products.map(async (p) => {
        const stockRes = await db.query(
          'SELECT ps.*, b.name as branch_name FROM product_stock ps LEFT JOIN branches b ON ps.branch_id = b.id WHERE ps.product_id = $1',
          [p.id]
        );
        p.branch_stocks = stockRes.rows;
      })
    );

    res.json({ success: true, data: products, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/categories/all
router.get('/categories/all', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query('SELECT * FROM categories ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/ezviz-quick
router.get('/ezviz-quick', async (req, res) => {
  try {
    const db = getDB();
    const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) : null;
    let products;
    if (branch_id) {
      const result = await db.query(
        `SELECT p.*, c.name as category_name, COALESCE(ps.quantity,0)::integer as branch_stock
         FROM products p LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN product_stock ps ON p.id = ps.product_id AND ps.branch_id = $1
         WHERE p.is_active = 1 AND p.is_quick_add = 1
         ORDER BY p.name ASC LIMIT 16`,
        [branch_id]
      );
      products = result.rows;
    } else {
      const result = await db.query(
        `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.is_active = 1 AND p.is_quick_add = 1 
         ORDER BY p.name ASC LIMIT 16`
      );
      products = result.rows;
    }
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/search/:query
router.get('/search/:query', async (req, res) => {
  try {
    const db = getDB();
    const q = `%${req.params.query}%`;
    const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) : null;
    let products;
    if (branch_id) {
      const result = await db.query(
        `SELECT p.*, c.name as category_name, COALESCE(ps.quantity,0)::integer as branch_stock,
         (SELECT COUNT(*)::integer FROM invoice_items WHERE product_id = p.id) as sales_count
         FROM products p LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN product_stock ps ON p.id = ps.product_id AND ps.branch_id = $1
         WHERE p.is_active = 1 AND (
           p.name ILIKE $2 OR p.brand ILIKE $3 OR p.model ILIKE $4 OR p.sku ILIKE $5 OR
           EXISTS (SELECT 1 FROM product_serials s WHERE s.product_id = p.id AND s.serial_number ILIKE $6)
         )
         ORDER BY sales_count DESC, p.name ASC LIMIT 20`,
        [branch_id, q, q, q, q, q]
      );
      products = result.rows;
    } else {
      const result = await db.query(
        `SELECT p.*, c.name as category_name,
         (SELECT COUNT(*)::integer FROM invoice_items WHERE product_id = p.id) as sales_count
         FROM products p LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.is_active = 1 AND (
           p.name ILIKE $1 OR p.brand ILIKE $2 OR p.model ILIKE $3 OR p.sku ILIKE $4 OR
           EXISTS (SELECT 1 FROM product_serials s WHERE s.product_id = p.id AND s.serial_number ILIKE $5)
         ) 
         ORDER BY sales_count DESC, p.name ASC LIMIT 20`,
        [q, q, q, q, q]
      );
      products = result.rows;
    }
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1',
      [req.params.id]
    );
    const p = result.rows[0];
    if (!p) return res.status(404).json({ success: false, message: 'Not found' });
    const stockRes = await db.query(
      'SELECT ps.*, b.name as branch_name FROM product_stock ps LEFT JOIN branches b ON ps.branch_id = b.id WHERE ps.product_id = $1',
      [p.id]
    );
    p.branch_stocks = stockRes.rows;
    res.json({ success: true, data: p });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:id/serials
router.get('/:id/serials', async (req, res) => {
  try {
    const db = getDB();
    const { status = '', branch_id = '' } = req.query;
    let where = 'WHERE ps.product_id = $1';
    const params = [parseInt(req.params.id)];
    let paramIndex = 2;
    if (status) {
      where += ` AND ps.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (branch_id) {
      where += ` AND ps.branch_id = $${paramIndex}`;
      params.push(parseInt(branch_id));
      paramIndex++;
    }
    const result = await db.query(
      `SELECT ps.*, b.name as branch_name FROM product_serials ps LEFT JOIN branches b ON ps.branch_id = b.id ${where} ORDER BY ps.created_at DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products (create)
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { name, brand, model, sku, category_id, description, image_path, warranty_months = 12, vat_applicable = 0, retail_price = 0, wholesale_price = 0, cost_price = 0, is_quick_add = 0 } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const finalSku = sku || `SKU-${Date.now()}`;
    const result = await db.query(
      `INSERT INTO products (name, brand, model, sku, category_id, description, image_path, warranty_months, vat_applicable, retail_price, wholesale_price, cost_price, is_quick_add) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [name, brand || null, model || null, finalSku, category_id || null, description || null, image_path || null, warranty_months, vat_applicable, retail_price, wholesale_price, cost_price, is_quick_add]
    );
    const pid = result.rows[0].id;
    // Init stock in all branches
    const branchesRes = await db.query('SELECT id FROM branches WHERE is_active = 1');
    for (const b of branchesRes.rows) {
      try {
        await db.query(
          'INSERT IGNORE INTO product_stock (product_id, branch_id, quantity) VALUES ($1,$2,0)',
          [pid, b.id]
        );
      } catch (e) {}
    }
    res.json({ success: true, data: { id: pid }, message: 'Product created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { name, brand, model, sku, category_id, description, image_path, warranty_months, vat_applicable, retail_price, wholesale_price, cost_price, is_quick_add } = req.body;
    
    console.log(`[EDIT PRODUCT] Updating ID: ${req.params.id}`);
    console.log(`[EDIT PRODUCT] Received body:`, req.body);

    const result = await db.query(
      `UPDATE products 
       SET name=$1,brand=$2,model=$3,sku=$4,category_id=$5,description=$6,image_path=$7,warranty_months=$8,vat_applicable=$9,retail_price=$10,wholesale_price=$11,cost_price=$12,is_quick_add=$13,updated_at=NOW() 
       WHERE id=$14`,
      [
        name,
        brand || null,
        model || null,
        sku || null,
        category_id || null,
        description || null,
        image_path || null,
        warranty_months !== undefined && warranty_months !== null ? warranty_months : 12,
        vat_applicable !== undefined && vat_applicable !== null ? vat_applicable : 0,
        retail_price !== undefined && retail_price !== null ? retail_price : 0,
        wholesale_price !== undefined && wholesale_price !== null ? wholesale_price : 0,
        cost_price !== undefined && cost_price !== null ? cost_price : 0,
        is_quick_add !== undefined && is_quick_add !== null ? is_quick_add : 0,
        req.params.id
      ]
    );
    
    console.log(`[EDIT PRODUCT] Update Result rowCount: ${result.rowCount}`);
    if (result.rowCount === 0) {
      console.log(`[EDIT PRODUCT] No rows updated. ID probably mismatch.`);
    }

    res.json({ success: true, message: 'Updated' });
  } catch (err) {
    console.error(`[EDIT PRODUCT] Error:`, err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/products/:id (deactivate)
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    await db.query('UPDATE products SET is_active = 0 WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/upload-image
router.post('/upload-image', (req, res) => {
  try {
    const upload = req.app.get('upload');
    upload.single('image')(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
      const image_path = `/uploads/${req.file.filename}`;
      res.json({ success: true, data: { image_path } });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/categories
router.post('/categories', async (req, res) => {
  try {
    const db = getDB();
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const result = await db.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name]);
    res.json({ success: true, data: { id: result.rows[0].id, name } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/serials/:serial
router.get('/serial/:sn', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(
      `SELECT ps.*, p.name as product_name, p.brand, p.model, p.warranty_months, p.image_path, p.retail_price, p.wholesale_price, p.sku, p.vat_applicable,
       b.name as branch_name, inv.invoice_date, c.name as customer_name
       FROM product_serials ps
       LEFT JOIN products p ON ps.product_id = p.id
       LEFT JOIN branches b ON ps.branch_id = b.id
       LEFT JOIN invoices inv ON ps.invoice_id = inv.id
       LEFT JOIN customers c ON inv.customer_id = c.id
       WHERE ps.serial_number = $1`,
      [req.params.sn]
    );
    const s = result.rows[0];
    if (!s) return res.status(404).json({ success: false, message: 'Serial not found' });
    res.json({ success: true, data: s });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
