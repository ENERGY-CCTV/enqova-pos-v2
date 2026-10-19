const mysql = require('mysql2/promise');
require('dotenv').config();

const updates = [
  { id: 1, retail: 9600, wholesale: 7700 }, // CS-H1C-R101-1G2WR
  { id: 2, retail: 8800, wholesale: 7100 }, // CS-TY1-B0-1G2WF
  { id: 3, retail: 11100, wholesale: 8900 }, // CS-H6c-R105-1L3WF
  { id: 4, retail: 12000, wholesale: 9600 }, // CS-H6c-R105-1J5WF
  { id: 5, retail: 20600, wholesale: 16500 }, // CS-H6c-R200-8H8WF
  { id: 6, retail: 18200, wholesale: 14600 }, // CS-H7C-R100-8G44WF
  { id: 7, retail: 32100, wholesale: 25700 }, // CS-BM1-R100-2D2WF-BE
  { id: 8, retail: 37000, wholesale: 29600 }, // CS-BM1-R100-2D2WF-RA
  { id: 9, retail: 37000, wholesale: 29600 }, // CS-CB2-R100-2D2WF-BK
  { id: 10, retail: 47000, wholesale: 37600 }, // CS-E4p-R100-8C6WKF
  { id: 11, retail: 51700, wholesale: 41400 }, // CS-S10-R100-1M4WFK
  { id: 12, retail: 13500, wholesale: 10800 }, // CS-H3C-R100-1K2WF
  { id: 13, retail: 14600, wholesale: 11700 }, // CS-H3C-R100-1K2WFL
  { id: 14, retail: 21000, wholesale: 16800 }, // CS-H3C-R100-1J4KFL
  { id: 15, retail: 21700, wholesale: 17400 }, // CS-H3C-R100-1J5WKFL
  { id: 16, retail: 35600, wholesale: 28500 }, // CS-CV310-C3-6B22WFR
  { id: 17, retail: 18000, wholesale: 14400 }, // CS-H8C-R100-1K2WKFL
  { id: 18, retail: 20500, wholesale: 16400 }, // CS-H8C-R200-1J5WKFL
  { id: 19, retail: 28200, wholesale: 22600 }, // CS-H8C-R100-1J4WKFL
  { id: 20, retail: 26600, wholesale: 21300 }, // CS-H9C-R100-8H33WKFL
  { id: 21, retail: 32500, wholesale: 26000 }, // CS-H9C-R100-8H55WKFL
  { id: 22, retail: 34100, wholesale: 27300 }, // CS-H90-R100-8H44WKFL
  { id: 23, retail: 35600, wholesale: 28500 }, // CS-H80f-R100-8G444WKFL
  { id: 24, retail: 35200, wholesale: 28200 }, // CS-H80x-R100-8G82WKFL
  { id: 25, retail: 31100, wholesale: 24900 }, // CS-HB8c-R100-1N4WFL
  { id: 26, retail: 36600, wholesale: 29300 }, // CS-CB8c-R100-1N4WFL
  { id: 27, retail: 20800, wholesale: 16700 }, // CS-H5-R201-1H3KFL4GA
  { id: 28, retail: 21700, wholesale: 17400 }, // CS-H8C-R200-1K3KFL4GA
  { id: 29, retail: 33300, wholesale: 26700 }, // CS-H9C-R105-8H55WFL4GA
  { id: 30, retail: 71700, wholesale: 57400 }, // CS-EB8/SP
  { id: 31, retail: 46000, wholesale: 36800 }, // CS-HB8/SP
  { id: 32, retail: 79600, wholesale: 63700 }, // CS-HB90x/SP-R100
  { id: 33, retail: 13500, wholesale: 10800 }, // CS-CMT-Solar Panel-E
  { id: 34, retail: 17800, wholesale: 14300 }, // CS-H4-R201-1H3EKFL
  { id: 35, retail: 17500, wholesale: 14000 }, // CS-H4-R201-1H3EKFL-H5
  { id: 36, retail: 19800, wholesale: 15900 }, // CS-H8c PoE (2K)
  { id: 37, retail: 15600, wholesale: 12500 }, // CS-X5S-R100-4W
  { id: 38, retail: 20100, wholesale: 16100 }, // CS-X5S-R100-8W
  { id: 39, retail: 23500, wholesale: 12500 }, // EZCLOUD7D1Y
  { id: 40, retail: 42700, wholesale: 34200 }, // CS-EL3-R100-8C3WFL
  { id: 41, retail: 48100, wholesale: 38500 }, // CS-DL05-WBCP-M
  { id: 42, retail: 33000, wholesale: 26400 }, // CS-DL03 Pro
  { id: 43, retail: 131600, wholesale: 105300 }, // CS-DL50FVS
  { id: 44, retail: 48600, wholesale: 38900 }, // CS-HP7-R101-1W2TFC
  { id: 45, retail: 53100, wholesale: 42500 }, // CS-HP5-R100-1W2TFC
  { id: 46, retail: 83500, wholesale: 66800 }, // CS-EP7-R100-1W2TFC
  { id: 47, retail: 6700, wholesale: 5400 }, // MI-PRO-R-03
  { id: 48, retail: 11800, wholesale: 9500 }, // DS-3WRE12C
  { id: 49, retail: 10000, wholesale: 8000 }, // TL-WA850RE
  { id: 50, retail: 17300, wholesale: 13900 }, // DS-3WR4G3N
  { id: 51, retail: 11600, wholesale: 9300 }, // BL-CPE300M
  { id: 52, retail: 3200, wholesale: 2300 }, // RL-611-UPS
  { id: 53, retail: 900, wholesale: 500 }, // 12V-PSU-PELCO
  { id: 54, retail: 1900, wholesale: 1300 }, // DS-2PA1201-WRD
  { id: 55, retail: 1100, wholesale: 900 }, // PDS-01
  { id: 56, retail: 1100, wholesale: 900 }, // RAINCOV001
  { id: 57, retail: 9000, wholesale: 7200 } // DS-U02
];

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'enqova'
  });

  console.log('Starting price update...');
  await conn.beginTransaction();

  try {
    for (const item of updates) {
      const cost = Math.round(item.wholesale * 0.9 * 10) / 10; // keep one decimal place or integer
      await conn.query(
        'UPDATE products SET retail_price = ?, wholesale_price = ?, cost_price = ? WHERE id = ?',
        [item.retail, item.wholesale, cost, item.id]
      );
      console.log(`Updated ID ${item.id}: Retail: ${item.retail}, Wholesale: ${item.wholesale}, Cost: ${cost}`);
    }

    await conn.commit();
    console.log('✅ Price update committed successfully.');
  } catch (error) {
    await conn.rollback();
    console.error('❌ Error during update, rolled back:', error);
  } finally {
    await conn.end();
  }
}

run().catch(console.error);
