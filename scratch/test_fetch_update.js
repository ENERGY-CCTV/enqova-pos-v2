const jwt = require('jsonwebtoken');

const JWT_SECRET = 'enqova_SECRET_2024_SECURE';
const token = jwt.sign(
  {
    id: 1,
    username: 'admin',
    full_name: 'System Admin',
    role: 'admin',
    branch_id: 1,
    branch_name: 'Colombo Branch',
  },
  JWT_SECRET,
  { expiresIn: '12h' }
);

const payload = {
  customer_id: null,
  discount_percent: 0,
  discount_amount: 0,
  vat_rate: 18,
  payment_method: 'cash',
  notes: 'HTTP update test',
  amount_paid: 47600,
  items: [
    { product_id: 28, quantity: 1, unit_price: 8100, discount_percent: 19.75, discount_amount: 1600, line_total: 6500, vat_applicable: 0, serial_numbers: [] },
    { product_id: 31, quantity: 1, unit_price: 19000, discount_percent: 20, discount_amount: 3800, line_total: 15200, vat_applicable: 0, serial_numbers: [] }
  ]
};

async function main() {
  const resp = await fetch('http://localhost:3000/api/invoices/10', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await resp.json();
  console.log('Status Code:', resp.status);
  console.log('Response Body:', data);
}

main().catch(console.error);
