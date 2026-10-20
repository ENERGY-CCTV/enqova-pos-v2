const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// GET /api/reports/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const db = getDB();
    const isBranchUser = req.user.role !== 'admin' && req.user.branch_id;
    const bid = isBranchUser ? req.user.branch_id : (req.query.branch_id ? parseInt(req.query.branch_id) : null);
    const branchWhere = bid ? `AND branch_id = ${parseInt(bid)}` : '';
    const branchWhereInv = bid ? `AND i.branch_id = ${parseInt(bid)}` : '';
    const branchWhereQuo = bid ? `AND q.branch_id = ${parseInt(bid)}` : '';
    const branchWherePs = bid ? `AND ps.branch_id = ${parseInt(bid)}` : '';
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 8) + '01';

    // Run dashboard stats in parallel
    const todaySalesPromise = db.query(`SELECT COALESCE(SUM(total),0) as total, COUNT(*)::integer as count FROM invoices WHERE invoice_date = $1 ${branchWhere}`, [today]);
    const monthSalesPromise = db.query(`SELECT COALESCE(SUM(total),0) as total, COUNT(*)::integer as count FROM invoices WHERE invoice_date >= $1 ${branchWhere}`, [monthStart]);
    const stockAlertsPromise = db.query(
      `SELECT COUNT(*)::integer as cnt FROM product_stock ps LEFT JOIN products p ON ps.product_id = p.id WHERE p.is_active = 1 AND ps.quantity <= ps.min_quantity ${branchWherePs}`
    );
    const pendingWarrantiesPromise = db.query(`SELECT COUNT(*)::integer as cnt FROM warranty_claims WHERE status IN ('pending','in_repair') ${branchWhere}`);
    const totalCustomersPromise = db.query('SELECT COUNT(*)::integer as cnt FROM customers WHERE is_active = 1');
    const totalProductsPromise = db.query('SELECT COUNT(*)::integer as cnt FROM products WHERE is_active = 1');
    const lowStockItemsPromise = db.query(
      `SELECT p.name, p.brand, b.name as branch_name, ps.quantity, ps.min_quantity, p.image_path 
       FROM product_stock ps 
       LEFT JOIN products p ON ps.product_id = p.id 
       LEFT JOIN branches b ON ps.branch_id = b.id 
       WHERE p.is_active = 1 AND ps.quantity <= ps.min_quantity 
       ${branchWherePs} 
       ORDER BY ps.quantity ASC, p.name 
       LIMIT 10`
    );
    const recentInvoicesPromise = db.query(
      `SELECT i.*, c.name as customer_name, b.name as branch_name 
       FROM invoices i 
       LEFT JOIN customers c ON i.customer_id = c.id 
       LEFT JOIN branches b ON i.branch_id = b.id 
       WHERE 1=1 ${branchWhereInv} 
       ORDER BY i.created_at DESC LIMIT 10`
    );
    const recentQuotationsPromise = db.query(
      `SELECT q.*, c.name as customer_name, b.name as branch_name 
       FROM quotations q 
       LEFT JOIN customers c ON q.customer_id = c.id 
       LEFT JOIN branches b ON q.branch_id = b.id 
       WHERE 1=1 ${branchWhereQuo} 
       ORDER BY q.created_at DESC LIMIT 10`
    );
    const last7DaysPromise = db.query(
      `SELECT invoice_date, COALESCE(SUM(total),0) as total, COUNT(*)::integer as count 
       FROM invoices 
       WHERE invoice_date >= CURRENT_DATE - INTERVAL '6 days' ${branchWhere} 
       GROUP BY invoice_date 
       ORDER BY invoice_date`
    );

    const [
      todaySalesRes,
      monthSalesRes,
      stockAlertsRes,
      pendingWarrantiesRes,
      totalCustomersRes,
      totalProductsRes,
      lowStockItemsRes,
      recentInvoicesRes,
      recentQuotationsRes,
      last7DaysRes
    ] = await Promise.all([
      todaySalesPromise,
      monthSalesPromise,
      stockAlertsPromise,
      pendingWarrantiesPromise,
      totalCustomersPromise,
      totalProductsPromise,
      lowStockItemsPromise,
      recentInvoicesPromise,
      recentQuotationsPromise,
      last7DaysPromise
    ]);

    let currentBranchName = 'All Branches';
    if (bid) {
      const bRes = await db.query('SELECT name FROM branches WHERE id = $1', [bid]);
      if (bRes.rows[0]) currentBranchName = bRes.rows[0].name;
    }

    res.json({
      success: true,
      data: {
        current_branch_name: currentBranchName,
        today_sales: todaySalesRes.rows[0],
        month_sales: monthSalesRes.rows[0],
        stock_alerts: stockAlertsRes.rows[0].cnt,
        pending_warranties: pendingWarrantiesRes.rows[0].cnt,
        total_customers: totalCustomersRes.rows[0].cnt,
        total_products: totalProductsRes.rows[0].cnt,
        low_stock_items: lowStockItemsRes.rows,
        recent_invoices: recentInvoicesRes.rows,
        recent_quotations: recentQuotationsRes.rows,
        last_7_days: last7DaysRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/sales
router.get('/sales', async (req, res) => {
  try {
    const db = getDB();
    const { start_date, end_date, branch_id } = req.query;
    const sd = start_date || new Date().toISOString().substring(0, 8) + '01';
    const ed = end_date || new Date().toISOString().split('T')[0];
    let where = `WHERE i.invoice_date BETWEEN $1 AND $2`;
    const params = [sd, ed];
    
    if (branch_id) {
      where += ' AND i.branch_id = $3';
      params.push(parseInt(branch_id));
    } else if (req.user.role !== 'admin' && req.user.branch_id) {
      where += ' AND i.branch_id = $3';
      params.push(req.user.branch_id);
    }

    const summaryRes = await db.query(
      `SELECT COALESCE(SUM(total),0) as total_revenue, COUNT(*)::integer as total_invoices, COALESCE(SUM(vat_amount),0) as total_vat, COALESCE(AVG(total),0) as avg_invoice FROM invoices i ${where}`,
      params
    );
    const chartRes = await db.query(
      `SELECT invoice_date as date, COALESCE(SUM(total),0) as total, COUNT(*)::integer as count FROM invoices i ${where} GROUP BY invoice_date ORDER BY invoice_date`,
      params
    );
    const invoicesRes = await db.query(
      `SELECT i.*, c.name as customer_name, b.name as branch_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN branches b ON i.branch_id = b.id ${where} ORDER BY i.created_at DESC LIMIT 500`,
      params
    );

    res.json({
      success: true,
      data: {
        summary: summaryRes.rows[0],
        chart: chartRes.rows,
        invoices: invoicesRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/stock
router.get('/stock', async (req, res) => {
  try {
    const db = getDB();
    const { branch_id, low_stock_only = 0 } = req.query;
    let where = 'WHERE p.is_active = 1';
    const params = [];
    let paramIndex = 1;

    if (branch_id) {
      where += ` AND ps.branch_id = $${paramIndex}`;
      params.push(parseInt(branch_id));
      paramIndex++;
    } else if (req.user.role !== 'admin' && req.user.branch_id) {
      where += ` AND ps.branch_id = $${paramIndex}`;
      params.push(req.user.branch_id);
      paramIndex++;
    }

    if (parseInt(low_stock_only)) {
      where += ' AND ps.quantity <= ps.min_quantity';
    }

    const rowsRes = await db.query(
      `SELECT p.name as product_name, p.sku, c.name as category_name, b.name as branch_name, ps.quantity, ps.min_quantity, p.retail_price, p.wholesale_price 
       FROM product_stock ps 
       LEFT JOIN products p ON ps.product_id = p.id 
       LEFT JOIN categories c ON p.category_id = c.id 
       LEFT JOIN branches b ON ps.branch_id = b.id 
       ${where} 
       ORDER BY ps.quantity ASC, p.name`,
      params
    );
    res.json({ success: true, data: rowsRes.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/products (top selling)
router.get('/products', async (req, res) => {
  try {
    const db = getDB();
    const { start_date, end_date, branch_id } = req.query;
    const sd = start_date || new Date().toISOString().substring(0, 8) + '01';
    const ed = end_date || new Date().toISOString().split('T')[0];
    let iWhere = `WHERE i.invoice_date BETWEEN $1 AND $2`;
    const params = [sd, ed];

    if (branch_id) {
      iWhere += ' AND i.branch_id = $3';
      params.push(parseInt(branch_id));
    }

    const rowsRes = await db.query(
      `SELECT p.name as product_name, p.brand, SUM(ii.quantity) as total_qty, SUM(ii.line_total) as total_revenue 
       FROM invoice_items ii 
       LEFT JOIN products p ON ii.product_id = p.id 
       LEFT JOIN invoices i ON ii.invoice_id = i.id 
       ${iWhere} 
       GROUP BY ii.product_id, p.name, p.brand 
       ORDER BY total_qty DESC 
       LIMIT 20`,
      params
    );
    res.json({ success: true, data: rowsRes.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/customers
router.get('/customers', async (req, res) => {
  try {
    const db = getDB();
    const rowsRes = await db.query(
      `SELECT c.*, COALESCE(SUM(i.total),0) as total_spent, COUNT(DISTINCT i.id)::integer as invoice_count 
       FROM customers c 
       LEFT JOIN invoices i ON c.id = i.customer_id 
       WHERE c.is_active = 1 
       GROUP BY c.id 
       ORDER BY total_spent DESC`
    );
    res.json({ success: true, data: rowsRes.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/profit (admin only)
router.get('/profit', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const db = getDB();
    const { start_date, end_date, branch_id } = req.query;
    const sd = start_date || new Date().toISOString().substring(0, 8) + '01';
    const ed = end_date || new Date().toISOString().split('T')[0];
    let iWhere = `WHERE i.invoice_date BETWEEN $1 AND $2`;
    const params = [sd, ed];

    if (branch_id) {
      iWhere += ' AND i.branch_id = $3';
      params.push(parseInt(branch_id));
    }

    const result = await db.query(
      `SELECT p.name as product_name, p.brand, SUM(ii.quantity) as total_qty, 
              SUM(ii.quantity * p.cost_price) as total_cost, SUM(ii.line_total) as revenue, 
              SUM(ii.line_total) - SUM(ii.quantity * p.cost_price) as gross_profit, 
              CASE WHEN SUM(ii.line_total) > 0 THEN 
                ROUND(((SUM(ii.line_total) - SUM(ii.quantity * p.cost_price)) * 100.0 / SUM(ii.line_total))::numeric, 2)
              ELSE 0 END as margin 
       FROM invoice_items ii 
       LEFT JOIN products p ON ii.product_id = p.id 
       LEFT JOIN invoices i ON ii.invoice_id = i.id 
       ${iWhere} 
       GROUP BY ii.product_id, p.name, p.brand 
       ORDER BY gross_profit DESC`,
      params
    );
    const products = result.rows;
    const summary = {
      revenue: products.reduce((a,p) => a + (parseFloat(p.revenue)||0), 0),
      total_cost: products.reduce((a,p) => a + (parseFloat(p.total_cost)||0), 0),
      gross_profit: products.reduce((a,p) => a + (parseFloat(p.gross_profit)||0), 0)
    };
    summary.margin = summary.revenue > 0 ? (summary.gross_profit / summary.revenue * 100).toFixed(2) : 0;
    res.json({ success: true, data: { summary, products } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/cashflow (admin only)
router.get('/cashflow', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const db = getDB();
    const { start_date, end_date } = req.query;
    const sd = start_date || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const ed = end_date || new Date().toISOString().split('T')[0];

    const inflowsRes = await db.query(
      `SELECT invoice_date as date, COALESCE(SUM(amount_paid),0) as inflow, COUNT(*)::integer as count 
       FROM invoices 
       WHERE invoice_date BETWEEN $1 AND $2 
       GROUP BY invoice_date 
       ORDER BY invoice_date`,
      [sd, ed]
    );

    const outflowsRes = await db.query(
      `SELECT grn_date as date, COALESCE(SUM(total_amount),0) as outflow, COUNT(*)::integer as count 
       FROM grn 
       WHERE grn_date BETWEEN $1 AND $2 
       GROUP BY grn_date 
       ORDER BY grn_date`,
      [sd, ed]
    );

    res.json({ success: true, data: { inflows: inflowsRes.rows, outflows: outflowsRes.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/product-history
router.get('/product-history', async (req, res) => {
  try {
    const db = getDB();
    const { product_id, start_date, end_date, branch_id } = req.query;
    if (!product_id) return res.status(400).json({ success: false, message: 'Product ID required' });
    
    const sd = start_date || new Date().toISOString().substring(0, 8) + '01';
    const ed = end_date || new Date().toISOString().split('T')[0];
    
    let iWhere = `WHERE i.invoice_date BETWEEN $1 AND $2 AND ii.product_id = $3`;
    const params = [sd, ed, parseInt(product_id)];
    let paramIndex = 4;

    if (branch_id) {
      iWhere += ` AND i.branch_id = $${paramIndex}`;
      params.push(parseInt(branch_id));
      paramIndex++;
    } else if (req.user && req.user.role !== 'admin' && req.user.branch_id) {
      iWhere += ` AND i.branch_id = $${paramIndex}`;
      params.push(req.user.branch_id);
      paramIndex++;
    }

    const historyRes = await db.query(
      `SELECT ii.quantity, ii.unit_price, ii.line_total, i.invoice_number, i.invoice_date, c.name as customer_name, b.name as branch_name, i.notes
       FROM invoice_items ii 
       LEFT JOIN invoices i ON ii.invoice_id = i.id 
       LEFT JOIN customers c ON i.customer_id = c.id
       LEFT JOIN branches b ON i.branch_id = b.id
       ${iWhere}
       ORDER BY i.invoice_date DESC, i.created_at DESC`,
      params
    );
    
    // Get product details
    const productRes = await db.query(`SELECT name, brand, model, sku FROM products WHERE id = $1`, [parseInt(product_id)]);

    res.json({ success: true, data: { history: historyRes.rows, product: productRes.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
