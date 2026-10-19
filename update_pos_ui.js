const fs = require('fs');
let code = fs.readFileSync('public/js/pos.js', 'utf8');

// We need to inject wholesaleDiff into renderCart
const oldRenderCartVars = `    let discAmt = lineBase * ((item.discount_percent||0) / 100);
    if (item.is_wholesale && item.wholesale_price && item.unit_price === item.retail_price) {
      const diff = item.retail_price - item.wholesale_price;
      if (diff > 0) discAmt += (diff * item.quantity);
    }
    const lineTotal = lineBase - discAmt;`;

const newRenderCartVars = `    let discAmt = lineBase * ((item.discount_percent||0) / 100);
    let wholesaleDiff = 0;
    if (item.is_wholesale && item.wholesale_price && item.unit_price === item.retail_price) {
      const diff = item.retail_price - item.wholesale_price;
      if (diff > 0) {
        wholesaleDiff = diff * item.quantity;
        discAmt += wholesaleDiff;
      }
    }
    const lineTotal = lineBase - discAmt;`;

code = code.replace(oldRenderCartVars, newRenderCartVars);

// We need to inject the UI for wholesaleDiff
const oldTD = `      <td>
        <div style="display:flex;align-items:center;gap:3px;">
          <input type="number" min="0" max="100" value="\${item.discount_percent}" onchange="setDiscount(\${idx},this.value)" style="width:50px;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text-primary);border-radius:4px;padding:3px;text-align:center;font-size:12px;">
          <span style="font-size:10px;color:var(--text-muted);">%</span>
        </div>
      </td>`;

const newTD = `      <td>
        <div style="display:flex;align-items:center;gap:3px;">
          <input type="number" min="0" max="100" value="\${item.discount_percent}" onchange="setDiscount(\${idx},this.value)" style="width:50px;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text-primary);border-radius:4px;padding:3px;text-align:center;font-size:12px;">
          <span style="font-size:10px;color:var(--text-muted);">%</span>
        </div>
        \${ wholesaleDiff > 0 ? \`<div style="font-size:10px;color:var(--green);margin-top:4px;">Wholesale: Rs.\${wholesaleDiff.toLocaleString()}</div>\` : '' }
      </td>`;

code = code.replace(oldTD, newTD);

fs.writeFileSync('public/js/pos.js', code);
console.log('Successfully updated POS UI to display wholesale discount');
