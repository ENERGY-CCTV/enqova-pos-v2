const mysql = require('mysql2/promise');
require('dotenv').config();

const newProducts = [
  {
    sku: 'DS-PWA64-Kit-WB',
    name: 'Hikvision AX PRO Wifi Alarm Control Panel',
    brand: 'Hikvision',
    description: 'Wifi Alarm Control Panel\n• RF Frequency 433MHz\n• Zones: up to 64\n• Area: 16\n• Voice Prompt: Supported\n• Built in Loudspeaker : Supported\n• Automatic Arm/Disarm Timers: Supported\n• Forced Arming with Open Zones: Supported\n• 4G SIM: Supported (Single slot)\n• Power Supply: Built in power supply',
    retail: 74500,
    wholesale: 59600
  },
  {
    sku: 'DS-PDMC-EG2-WB',
    name: 'Hikvision Wireless Magnetic Contact',
    brand: 'Hikvision',
    description: 'Wireless Magnetic Contact\n• RF Range: 1,200m(open space);\n• 2-ch External Zones for wired sensors;\n• Multiple Enrolling: Power up, Remote ID, QR Code;\n• SSI(Signal Strength Indicators);\n• Environment Temperature Indication;',
    retail: 10600,
    wholesale: 8500
  },
  {
    sku: 'DS-PDMCS-EG2-WB',
    name: 'Hikvision Wireless Slim Magnet Detector',
    brand: 'Hikvision',
    description: 'Wireless Slim Magnet Detector\n• Slim design for an unobtrusive (unnoticeable) installation\n• Use for Door / windows protect\n• Fully remote configurable through App\n• Battery Type: CR2450 x 1\n• Detection Method: Opening Contact',
    retail: 8600,
    wholesale: 6900
  },
  {
    sku: 'DS-PDMCX-E-WB',
    name: 'Hikvision Wireless External Magnetic Contact',
    brand: 'Hikvision',
    description: 'Wireless External Magnetic Contact\n• Slim design for an unobtrusive\n• IP66 protective level, UV stable\n• Use for Door / windows protect\n• Fully remote configurable through App\n• Battery Type: CR2450 x 1\n• Detection Method: Opening Contact',
    retail: 15500,
    wholesale: 12400
  },
  {
    sku: 'DS-PDMCK-EG2-WB',
    name: 'Hikvision Wireless Magnet Shock Detector',
    brand: 'Hikvision',
    description: 'Wireless Magnet Shock Detector\n• Magnetic contact combined with shock and tilt detection\n• 2 wired inputs extension\n• Fully remote configurable through App',
    retail: 13300,
    wholesale: 10700
  },
  {
    sku: 'DS-PDP15P-EG2-WB',
    name: 'Hikvision Wireless PIR Detector',
    brand: 'Hikvision',
    description: 'Wireless PIR Detector\n• Detection Range: 15m\n• Detection Angle: 85.9°\n• Up to 30KG pet immunity***\n• Tamper Protection: Front;Rear\n• Battery Type: CR123A × 1\n• Application Scenario: Indoor',
    retail: 14200,
    wholesale: 11400
  },
  {
    sku: 'DS-PDD12P-EG2-WB',
    name: 'Hikvision Wireless Dual-Tech Detector - Indoor',
    brand: 'Hikvision',
    description: 'Wireless Dual-Tech Detector - Indoor\n• 24G microwave to prevent wall penetration\n• Digital temperature compensation\n• Detection Range: 12m\n• Detection Angle: 85.9°\n• Tamper Protection: Front;Rear\n• Battery Type: CR123A × 2\n• Application Scenario: Indoor\n• Pet Immunity up to 30Kg***',
    retail: 30600,
    wholesale: 24500
  },
  {
    sku: 'DS-PDC15-EG2-WB',
    name: 'Hikvision Wireless Curtain PIR Detector',
    brand: 'Hikvision',
    description: 'Wireless Curtain PIR Detector\n• RF Range: 1,200m(open space);\n• Detection Range: 15m / 6.3°;\n• Multiple Enrolling Methods: Power up, Remote ID, QR Code;\n• Sealed Optics and Creep-Zone protection;\n• SEC(Smart Environment Control) - Advanced digital signal processing and 3D optics;\n• Installation Height: 2.4 to 3.6 m;',
    retail: 16800,
    wholesale: 13500
  },
  {
    sku: 'DS-PDPC12P-EG2-WB',
    name: 'Hikvision Wireless PIR-Camera Detector',
    brand: 'Hikvision',
    description: 'Wireless PIR-Camera Detector\n• Detection Angle: 85.9°\n• Detection range: 12m\n• Detectable Speed: 0.3～2m/s\n• Fill Light: Infrared Light 12m\n• Up to 30KG pet immunity***\n• Polarizing IR lens\n• Day/Night Switch: Color/Black & White\n• Large integrated memory buffer for image storage\n• Battery Type: CR123A × 3\n• Application Scenario: Indoor',
    retail: 38500,
    wholesale: 30800
  },
  {
    sku: 'DS-PDP18-HM-WB',
    name: 'Hikvision Wireless Double PIR Detector - Outdoor',
    brand: 'Hikvision',
    description: 'Wireless Double PIR Detector - Outdoor\n• IP65 weather resistance for outdoor\n• Detection Method: Passive Infrared\n• Detection Range: 18 m\n• Detection Angle: 90°\n• Pet Immunity: Up to 24 kg***\n• Tamper Protection: Front;Rear\n• Battery Type: CR123A × 2\n• Application Scenario: Indoor, Outdoor',
    retail: 32800,
    wholesale: 26300
  },
  {
    sku: 'DS-PDCL12-EG2-WB',
    name: 'Hikvision Wireless PIR Ceiling Detector',
    brand: 'Hikvision',
    description: 'Wireless PIR Ceiling Detector\n• Detection Range: 12m / 360°\n• Advanced digital signal processing 3D\n• Fully remote configurable through App\n• Multiple enrollment method and easy installation design\n• Easy replaceable battery with PCB protected',
    retail: 11500,
    wholesale: 9200
  },
  {
    sku: 'DS-PDBG8-EG2-WB',
    name: 'Hikvision Wireless Glass Break Detector',
    brand: 'Hikvision',
    description: 'Wireless Glass Break Detector\n• High quality Omni-directional microphone\n• Detection Method: Acoustic Sensor\n• Detection Range: 8m\n• Detection Angle: 120°\n• Sensitivity: 2m;4m;6m;8m\n• Glass Type: Float;Plate;Tampered;Wired; Laminated Leaded;Double Glazing\n• Tamper Protection: Front;Rear\n• Battery Type: CR123A × 2\n• Application Scenario: Indoor\n• Mounting Method: Wall;Ceiling',
    retail: 15500,
    wholesale: 12400
  },
  {
    sku: 'DS-PDSMK-S-WB',
    name: 'Hikvision Wireless Photoelectric Smoke Detector',
    brand: 'Hikvision',
    description: 'Wireless Photoelectric Smoke Detector\n• High quality chamber - photoelectric sensor\n• Buzzer ≥ 85dB @ 3 m\n• Battery Type Non Replaceable CR17450 x 1\n• Mounting Method: Ceiling\n• Application Scenario: Indoor',
    retail: 19600,
    wholesale: 15700
  },
  {
    sku: 'DS-PDWL-E-WB',
    name: 'Hikvision Wireless Water Leak Detector',
    brand: 'Hikvision',
    description: 'Wireless Water Leak Detector\n• RF Range: 1,000m(open space);\n• Multiple Enrolling Methods: Power up, Remote ID, QR Code\n• Fully remote configurable through APP;\n• IP66 approved for multiple use applications;',
    retail: 17300,
    wholesale: 13900
  },
  {
    sku: 'DS-PS1-E-WB',
    name: 'Hikvision Wireless External Sounder',
    brand: 'Hikvision',
    description: 'Wireless External Sounder\n• RF Range: 900m(open space);\n• IP65 approved for outdoor installation;\n• Buzzer Decibel: 90 to 110dB;\n• Configurable arming/disarming prompt sound and LED indicator\n• 3 kinds of alarm sounds: fire alarm, panic alarm, and intrusion alarm\n• Tamper Switch\n• Battery Type: 4 * CR123A batteries',
    retail: 32600,
    wholesale: 26100
  },
  {
    sku: 'DS-PS1-I-WB',
    name: 'Hikvision Wireless Indoor Sounder',
    brand: 'Hikvision',
    description: 'Wireless Indoor Sounder\n• RF Range: 900m(open space);\n• Buzzer Decibel: 90 to 110dB;\n• Configurable arming/disarming prompt sound and LED indicator\n• 3 kinds of alarm sounds: fire alarm, panic alarm, and intrusion alarm\n• Tamper Switch\n• Battery Type: 3 * CR123A batteries',
    retail: 19800,
    wholesale: 15900
  },
  {
    sku: 'DS-PK1-E-WB',
    name: 'Hikvision Wireless Keypad',
    brand: 'Hikvision',
    description: 'Wireless Keypad\n• RF Range: 900m(open space);\n• Stay/away arming, disarming, alarm clearing for specified area or all areas;\n• One-Push fire alarm, panic alarm, and medical alarm(Silent/Audible alarm selectable)\n• Output control;',
    retail: 23600,
    wholesale: 18900
  },
  {
    sku: 'DS-PKF1-WB',
    name: 'Hikvision Wireless Keyfob',
    brand: 'Hikvision',
    description: 'Wireless Keyfob\n• 433MHz two-way Tri-X wireless technology\n• Frequency hooping against jamming for reliable transmission;\n• RF Range: 500m(open space);\n• Keyfob lock and unlock function;\n• Multiple enrollment methods and easy installation design;',
    retail: 9800,
    wholesale: 7900
  },
  {
    sku: 'DS-PR1-WB',
    name: 'Hikvision AX PRO Series Repeater',
    brand: 'Hikvision',
    description: 'AX PRO Series Repeater\n• 433MHz two-way Tri-X and Cam-X wireless technology;\n• RF Range: 800m(open space);\n• Multiple Enrolling Methods: Power up, Remote ID, QR Code\n• Auto pairing with detectors and peripherals\n• PIRCAM supported',
    retail: 37300,
    wholesale: 29900
  },
  {
    sku: 'DS-PDEBP1-EG2-WB',
    name: 'Hikvision Portable Wireless Emergency Button',
    brand: 'Hikvision',
    description: 'Portable Wireless Emergency Button\n• Press Single/Dual button to trigger panic alarm actively;\n• Multiple Enrolling Methods: Power up, Remote ID, QR Code;\n• SSI(Signal Strength Indicators);\n• Fully remote configurable through APP;\n• IP54 approved for daily environment protection;',
    retail: 8100,
    wholesale: 6500
  },
  {
    sku: 'DS-PM1-O1H-WB',
    name: 'Hikvision Wall Switch',
    brand: 'Hikvision',
    description: 'Wall Switch\n• AES-128 encryption\n• LED display, show status of device and replay on/off display\n• Small case design, which can be put into hiding places easily\n• Automation operating, one button turn on/off from APP/Keyfob/Keypad\n• Setting scenarios by different events',
    retail: 14600,
    wholesale: 11700
  }
];

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'enqova'
  });

  console.log('Inserting/updating alarm devices...');
  await conn.beginTransaction();

  try {
    for (const item of newProducts) {
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
    console.log('✅ Insertion completed successfully.');
  } catch (error) {
    await conn.rollback();
    console.error('❌ Error inserting products, rolled back:', error);
  } finally {
    await conn.end();
  }
}

run().catch(console.error);
