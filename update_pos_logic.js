const fs = require('fs');
let code = fs.readFileSync('public/js/pos.js', 'utf8');

// 1. Update handleCustomerSelect
const oldHandleCustomerSelect = `  cart.forEach(item => { item.unit_price = type === 'wholesale' ? item.wholesale_price : item.retail_price; });`;
const newHandleCustomerSelect = `  cart.forEach(item => { 
    item.unit_price = item.retail_price; 
    item.is_wholesale = (type === 'wholesale'); 
  });`;
code = code.replace(oldHandleCustomerSelect, newHandleCustomerSelect);

// 2. Helper to replace line calculations
// We search for instances where 'const discAmt = lineBase * (item.discount_percent / 100);' is used.
// Or similar 'const line = item.unit_price * item.quantity * (1 - item.discount_percent / 100);'

// recalcTotals
const oldRecalcTotals = `    cart.forEach(item => {
      const line = item.unit_price * item.quantity * (1 - item.discount_percent / 100);
      subtotal += line;
      if (item.vat_applicable) vatAmount += line * vatRate / 100;
    });`;
const newRecalcTotals = `    cart.forEach(item => {
      let lineBase = item.unit_price * item.quantity;
      let discAmt = lineBase * ((item.discount_percent||0) / 100);
      if (item.is_wholesale && item.wholesale_price && item.unit_price === item.retail_price) {
        const diff = item.retail_price - item.wholesale_price;
        if (diff > 0) discAmt += (diff * item.quantity);
      }
      let line = lineBase - discAmt;
      subtotal += line;
      if (item.vat_applicable) vatAmount += line * vatRate / 100;
    });`;
code = code.replace(oldRecalcTotals, newRecalcTotals);

// renderCart
const oldRenderCart = `    const lineBase = item.unit_price * item.quantity;
    const discAmt = lineBase * (item.discount_percent / 100);
    const lineTotal = lineBase - discAmt;`;
const newRenderCart = `    const lineBase = item.unit_price * item.quantity;
    let discAmt = lineBase * ((item.discount_percent||0) / 100);
    if (item.is_wholesale && item.wholesale_price && item.unit_price === item.retail_price) {
      const diff = item.retail_price - item.wholesale_price;
      if (diff > 0) discAmt += (diff * item.quantity);
    }
    const lineTotal = lineBase - discAmt;`;
code = code.replace(oldRenderCart, newRenderCart);

// Now for getCartPayload contexts in createInvBtn, saveDraftBtn, saveQuoteBtn
// They all have the exact same mapping function:
//   const items = cart.map(item => {
//     const lineBase = item.unit_price * item.quantity;
//     const discAmt = lineBase * (item.discount_percent / 100);
//     const lineTotal = lineBase - discAmt;

const oldPayloadCalc = `    const lineBase = item.unit_price * item.quantity;
    const discAmt = lineBase * (item.discount_percent / 100);
    const lineTotal = lineBase - discAmt;`;

const newPayloadCalc = `    const lineBase = item.unit_price * item.quantity;
    let discAmt = lineBase * ((item.discount_percent||0) / 100);
    if (item.is_wholesale && item.wholesale_price && item.unit_price === item.retail_price) {
      const diff = item.retail_price - item.wholesale_price;
      if (diff > 0) discAmt += (diff * item.quantity);
    }
    const lineTotal = lineBase - discAmt;`;

code = code.split(oldPayloadCalc).join(newPayloadCalc);

// Also update print layout logic just in case, but print layouts read directly from invoice DB, 
// so the DB items will have the correct \`unit_price\` (retail) and \`discount_amount\` (wholesale diff) because of our changes above!
// So nothing needs to change in routes/invoices.js or print HTML!

fs.writeFileSync('public/js/pos.js', code);
console.log('Successfully updated pos.js logic');
