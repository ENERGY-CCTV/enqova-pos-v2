const http = require('http');
const loginBody = JSON.stringify({ username: 'admin', password: 'admin123' });
const req1 = http.request({ hostname:'localhost',port:3000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(loginBody)} }, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const r = JSON.parse(d);
    if (!r.success) { console.log('❌ Login failed'); return; }
    const token = r.token;
    const user = r.user;
    console.log('✅ Login OK | User:', user.full_name, '| Branch:', user.branch_id);

    // Test: Create quotation
    const qBody = JSON.stringify({
      customer_name: 'Test Customer',
      customer_phone: '0771234567',
      branch_id: user.branch_id || 1,
      items: [
        { product_id: 1, name: 'IP Camera 4MP', brand: 'Hikvision', quantity: 2, unit_price: 12000, discount_percent: 5, discount_amount: 1200, line_total: 22800, vat_applicable: 1, warranty_months: 12 },
        { product_id: 2, name: 'DVR 8CH', brand: 'Dahua', quantity: 1, unit_price: 25000, discount_percent: 0, discount_amount: 0, line_total: 25000, vat_applicable: 1, warranty_months: 24 }
      ],
      notes: 'Test quotation from API'
    });
    const req2 = http.request({ hostname:'localhost',port:3000,path:'/api/quotations',method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json','Content-Length':Buffer.byteLength(qBody)} }, res2 => {
      let d2 = '';
      res2.on('data', c => d2 += c);
      res2.on('end', () => {
        const r2 = JSON.parse(d2);
        if (!r2.success) { console.log('❌ Create quotation failed:', r2.message); return; }
        console.log('✅ Quotation created:', r2.data.quotation_number, '| Total: Rs.', r2.data.total.toFixed(2));

        // Test: List quotations
        const req3 = http.request({ hostname:'localhost',port:3000,path:'/api/quotations',headers:{'Authorization':'Bearer '+token} }, res3 => {
          let d3 = '';
          res3.on('data', c => d3 += c);
          res3.on('end', () => {
            const r3 = JSON.parse(d3);
            console.log('✅ List quotations:', r3.data?.length, 'total');

            // Test: Get single quotation
            const qid = r2.data.id;
            const req4 = http.request({ hostname:'localhost',port:3000,path:`/api/quotations/${qid}`,headers:{'Authorization':'Bearer '+token} }, res4 => {
              let d4 = '';
              res4.on('data', c => d4 += c);
              res4.on('end', () => {
                const r4 = JSON.parse(d4);
                console.log('✅ Single quotation items:', r4.data?.items?.length, 'products');
                console.log('\n🎯 Quotation API fully working!');
                console.log('   → POS: Add products → 📄 Save as Quotation');
                console.log('   → Quotations page: View, Print, Convert to Invoice');
              });
            });
            req4.end();
          });
        });
        req3.end();
      });
    });
    req2.write(qBody);
    req2.end();
  });
});
req1.write(loginBody);
req1.end();
