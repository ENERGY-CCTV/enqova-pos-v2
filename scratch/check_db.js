const { getDB } = require('../database/db.js');
async function run() {
  const db = getDB();
  try {
    const res1 = await db.query("SELECT id, items_data FROM job_sheets WHERE items_data::text LIKE '%[object Object]%'");
    console.log('JobSheets with [object Object]:', res1.rows);
    
    const res2 = await db.query("SELECT id, serial_numbers FROM invoice_items WHERE serial_numbers::text LIKE '%[object Object]%'");
    console.log('InvoiceItems with [object Object]:', res2.rows);

    const res3 = await db.query("SELECT id, serial_numbers FROM grn_items WHERE serial_numbers::text LIKE '%[object Object]%'");
    console.log('GRNItems with [object Object]:', res3.rows);

    const res4 = await db.query("SELECT id, serial_numbers FROM transfer_items WHERE serial_numbers::text LIKE '%[object Object]%'");
    console.log('TransferItems with [object Object]:', res4.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
