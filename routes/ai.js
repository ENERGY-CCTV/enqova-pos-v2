const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const db = getDB();
    const settResult = await db.query('SELECT value FROM settings WHERE `key` = $1', ['gemini_api_key']);
    const apiKey = settResult.rows[0]?.value;
    if (!apiKey) return res.status(400).json({ success: false, message: 'Gemini API key not configured. Set it in Settings.' });

    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    // Get business context
    const today = new Date().toISOString().split('T')[0];
    
    const todayStatsPromise = db.query('SELECT COALESCE(SUM(total),0) as sales, COUNT(*)::integer as count FROM invoices WHERE invoice_date = $1', [today]);
    const lowStockPromise = db.query('SELECT COUNT(*)::integer as cnt FROM product_stock WHERE quantity <= min_quantity');
    const pendingWarrPromise = db.query("SELECT COUNT(*)::integer as cnt FROM warranty_claims WHERE status IN ('pending','in_repair')");
    const totalProductsPromise = db.query('SELECT COUNT(*)::integer as cnt FROM products WHERE is_active=1');
    const totalCustomersPromise = db.query('SELECT COUNT(*)::integer as cnt FROM customers WHERE is_active=1');

    const [
      todayStatsRes,
      lowStockRes,
      pendingWarrRes,
      totalProductsRes,
      totalCustomersRes
    ] = await Promise.all([
      todayStatsPromise,
      lowStockPromise,
      pendingWarrPromise,
      totalProductsPromise,
      totalCustomersPromise
    ]);

    const todayStats = todayStatsRes.rows[0] || { sales: 0, count: 0 };
    const lowStock = lowStockRes.rows[0]?.cnt || 0;
    const pendingWarr = pendingWarrRes.rows[0]?.cnt || 0;
    const totalProducts = totalProductsRes.rows[0]?.cnt || 0;
    const totalCustomers = totalCustomersRes.rows[0]?.cnt || 0;

    const context = `You are an AI assistant for ENQOVA, a Sri Lankan CCTV camera and accessories business with 2 branches (Colombo & Kandy). Today's date: ${today}. Business stats: Today's sales = Rs. ${parseFloat(todayStats.sales).toFixed(2)} (${todayStats.count} invoices), Low stock items = ${lowStock}, Pending warranty claims = ${pendingWarr}, Total products = ${totalProducts}, Total customers = ${totalCustomers}. VAT rate = 18%. Currency = Sri Lankan Rupees (Rs.). Answer in simple, helpful English or Sinhala as needed.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: context + '\n\nUser: ' + message }] }], generationConfig: { maxOutputTokens: 500, temperature: 0.7 } })
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ success: false, message: data.error?.message || 'AI API error' });
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';
    res.json({ success: true, data: { reply } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
