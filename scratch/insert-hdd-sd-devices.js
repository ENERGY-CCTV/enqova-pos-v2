const mysql = require('mysql2/promise');
require('dotenv').config();

const storageProducts = [
  {
    sku: 'HS-TF-DE1 32G',
    name: 'Hiksemi 32GB MicroSD Card',
    brand: 'Hiksemi',
    description: '32 GB MicroSD Class10/TLC - R/W speed (100MB/s) - 7 Years Warranty',
    retail: 3600,
    wholesale: 2900
  },
  {
    sku: 'HS-TF-DE1 64G',
    name: 'Hiksemi 64GB MicroSD Card',
    brand: 'Hiksemi',
    description: '64 GB MicroSD Class10/TLC - R/W speed (100MB/s) - 7 Years Warranty',
    retail: 6000,
    wholesale: 4800
  },
  {
    sku: 'HS-TF-DE1 128G',
    name: 'Hiksemi 128GB MicroSD Card',
    brand: 'Hiksemi',
    description: '128GB MicroSD Class10/TLC - R/W speed (100MB/s) - 7 Years Warranty',
    retail: 10100,
    wholesale: 8100
  },
  {
    sku: 'HS-TF-DE1 256G',
    name: 'Hiksemi 256GB MicroSD Card',
    brand: 'Hiksemi',
    description: '256GB MicroSD Class10/TLC - R/W speed (100MB/s) - 7 Years Warranty',
    retail: 15000,
    wholesale: 12000
  },
  {
    sku: 'SDCS2/256GB',
    name: 'Kingston Canvas Select Plus 256GB Micro SD Card',
    brand: 'Kingston',
    description: 'Kingston Canvas Select Plus 256GB Micro SD Card - SDCS2/256 (100MB/s) - 2 Years Warranty',
    retail: 15000,
    wholesale: 12000
  },
  {
    sku: 'HS-TF-DE1 512G',
    name: 'Hiksemi 512GB MicroSD Card',
    brand: 'Hiksemi',
    description: '512GB MicroSD Class10/TLC - R/W speed (100MB/s) - 7 Years Warranty',
    retail: 22000,
    wholesale: 17600
  },
  {
    sku: 'ST500VX000-1Y-RP',
    name: 'Seagate Skyhawk 500GB Surveillance Hard Disk (1Y Warranty)',
    brand: 'Seagate',
    description: 'Seagate 500GB - 1Y Warranty (RP Not support for Wifi NVR)',
    retail: 9700,
    wholesale: 7800
  },
  {
    sku: 'SG500HDD-1Y-RP',
    name: 'Seagate 500GB Surveillance Hard Disk (1Y Warranty)',
    brand: 'Seagate',
    description: 'Seagate 500GB - 1Y Warranty (RP Not support for Wifi NVR)',
    retail: 9700,
    wholesale: 7800
  },
  {
    sku: '1TBPUZ-1Y-RP',
    name: 'WD Purple 1TB Surveillance Hard Disk (1Y Warranty)',
    brand: 'Western Digital',
    description: 'WD Purple 1TB - 1Y Warranty (RP Not support for Wifi NVR)',
    retail: 18000,
    wholesale: 14400
  },
  {
    sku: 'SG1TBHDD-2Y-RP',
    name: 'Seagate Skyhawk 1TB Surveillance Hard Disk (2Y Warranty)',
    brand: 'Seagate',
    description: 'Seagate Skyhawk 1TB - 2Y Warranty',
    retail: 25100,
    wholesale: 20100
  },
  {
    sku: 'ST1000VX001-520-2Y',
    name: 'Seagate Skyhawk 1TB Surveillance Hard Disk (2Y)',
    brand: 'Seagate',
    description: 'Seagate Skyhawk 1TB - 2Y Warranty',
    retail: 25100,
    wholesale: 20100
  },
  {
    sku: '1TBPUZ-2Y',
    name: 'WD Purple 1TB Surveillance Hard Disk (2Y Warranty)',
    brand: 'Western Digital',
    description: 'WD Purple 1TB - 2Y Warranty',
    retail: 25100,
    wholesale: 20100
  },
  {
    sku: 'ST1000VX001-520-3Y',
    name: 'Seagate Skyhawk 1TB Surveillance Hard Disk (3Y)',
    brand: 'Seagate',
    description: 'Seagate Skyhawk 1TB - 3Y Warranty',
    retail: 29300,
    wholesale: 23500
  },
  {
    sku: 'SG2TBHDD-2Y-RP',
    name: 'Seagate Skyhawk 2TB Surveillance Hard Disk (2Y Warranty)',
    brand: 'Seagate',
    description: 'Seagate Skyhawk 2TB - 2Y Warranty',
    retail: 39100,
    wholesale: 31300
  },
  {
    sku: 'WD20PURZ-2Y-RP',
    name: 'WD Purple 2TB Surveillance Hard Disk (2Y Warranty)',
    brand: 'Western Digital',
    description: 'WD Purple 2TB - 2Y Warranty',
    retail: 39100,
    wholesale: 31300
  },
  {
    sku: 'ST2000VX003-520-3Y',
    name: 'Seagate Skyhawk 2TB Surveillance Hard Disk (3Y)',
    brand: 'Seagate',
    description: 'Seagate Skyhawk 2TB - 3Y Warranty',
    retail: 47700,
    wholesale: 38200
  },
  {
    sku: 'SG4TBHDD-2Y-RP',
    name: 'Seagate Skyhawk 4TB Surveillance Hard Disk (2Y Warranty)',
    brand: 'Seagate',
    description: 'Seagate Skyhawk 4TB - 2Y Warranty',
    retail: 52200,
    wholesale: 41800
  },
  {
    sku: 'ST4000VX000-4TB-3Y',
    name: 'WD / Seagate Skyhawk 4TB Surveillance Hard Disk (3Y)',
    brand: 'Seagate',
    description: 'WD / Seagate Skyhawk 4TB - 3Y Warranty',
    retail: 85800,
    wholesale: 68700
  },
  {
    sku: 'HS-SSD-SILK-512GB',
    name: 'Hiksemi 512GB SSD',
    brand: 'Hiksemi',
    description: '512GB SSD SATA III 6Gbps - R/W speed - 3 Years Warranty',
    retail: 24000,
    wholesale: 19200
  }
];

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'enqova'
  });

  console.log('Inserting/updating storage devices...');
  await conn.beginTransaction();

  try {
    for (const item of storageProducts) {
      const cost = Math.round(item.wholesale * 0.9 * 10) / 10;
      await conn.query(
        `INSERT INTO products (sku, name, brand, description, retail_price, wholesale_price, cost_price, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           brand = VALUES(brand),
           description = VALUES(description),
           retail_price = VALUES(retail_price),
           wholesale_price = VALUES(wholesale_price),
           cost_price = VALUES(cost_price),
           is_active = 1`,
        [item.sku, item.name, item.brand, item.description, item.retail, item.wholesale, cost]
      );
      console.log(`Added/Updated SKU ${item.sku}: Retail: ${item.retail}, Wholesale: ${item.wholesale}, Cost: ${cost}`);
    }

    await conn.commit();
    console.log('✅ Storage devices inserted/updated successfully.');
  } catch (error) {
    await conn.rollback();
    console.error('❌ Error inserting storage products, rolled back:', error);
  } finally {
    await conn.end();
  }
}

run().catch(console.error);
