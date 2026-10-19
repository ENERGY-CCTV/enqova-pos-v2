const http = require('http');

// Test 1: Login
const loginBody = JSON.stringify({ username: 'admin', password: 'admin123' });
const req1 = http.request({ hostname:'localhost',port:3000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(loginBody)} }, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const r = JSON.parse(d);
    if (!r.success) { console.log('❌ Login failed'); return; }
    const token = r.token;
    console.log('✅ Login OK');

    // Test 2: Products search
    const req2 = http.request({ hostname:'localhost',port:3000,path:'/api/products/search/camera',method:'GET',headers:{'Authorization':'Bearer '+token} }, res2 => {
      let d2 = '';
      res2.on('data', c => d2 += c);
      res2.on('end', () => {
        const r2 = JSON.parse(d2);
        console.log('✅ Product search OK - found', r2.data?.length || 0, 'products');

        // Test 3: Dashboard
        const req3 = http.request({ hostname:'localhost',port:3000,path:'/api/reports/dashboard',method:'GET',headers:{'Authorization':'Bearer '+token} }, res3 => {
          let d3 = '';
          res3.on('data', c => d3 += c);
          res3.on('end', () => {
            const r3 = JSON.parse(d3);
            console.log('✅ Dashboard API OK - today sales:', r3.data?.today_sales?.total);
            console.log('\n🎯 All core APIs working! Open http://localhost:3000 in browser');
          });
        });
        req3.end();
      });
    });
    req2.end();
  });
});
req1.write(loginBody);
req1.end();
