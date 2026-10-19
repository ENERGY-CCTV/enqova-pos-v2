const { initDatabase, getDB } = require('./database/db');

const products = [
  // Indoor Model
  {
    model: "IPC-C32SP",
    name: "Cue 2E 3MP",
    desc: "Cue 2E 3MP - 1/3” 3Megapixel Progressive CMOS 3MP(2304 x 1296) Night Vision: 10m (33ft) Distance 2.8mm Fixed Lens Micro SD Card Slot (up to 512GB) Built-in Mic & Speaker Reset Button",
    price: 8700,
    special_price: 7000
  },
  {
    model: "IPC-K2ECP-3H3W",
    name: "Ranger 2 3MP WiFi PT IR Camera",
    desc: "Ranger 2 3MP WiFi PT IR Camera — 1/2.8” Progressive CMOS 3MP (2304 × 1296); Night Vision 10m; 3.6mm fixed lens; 355° pan & 5–80° tilt; Wi-Fi 6; Imou App; ONVIF; Micro SD up to 512GB; built-in mic & speaker; reset button.",
    price: 9200,
    special_price: 7400
  },
  {
    model: "IPC-S2EP-3R1S",
    name: "Ranger 2 Pro 3MP 3MP Wi-Fi PT Camera",
    desc: "Ranger 2 Pro 3MP 3MP Wi-Fi PT Camera — 2.4G Wi-Fi & Bluetooth; all-in-one IR remote control; supports 13 categories and 8000+ equipment models; Imou Life App control; third-party audio control; schedule & timer; family sharing; DIY self-learning; 38kHz IR; DC 5V 1A Micro USB input.",
    price: 11000,
    special_price: 8800
  },
  {
    model: "IPC-S2EP-5R1S",
    name: "Ranger 2 Pro 5MP 5MP Wi-Fi PT Camera",
    desc: "Ranger 2 Pro 5MP 5MP Wi-Fi PT Camera — 1/2.8” CMOS; H.265 5MP 3K; 3.6mm lens; up to 10m IR; two-way audio; ONVIF; Micro SD up to 512GB; smart tracking; privacy mode; alarm notification; motion & human detection; configurable region; abnormal sound alarm; built-in siren; Ethernet; reset button.",
    price: 13000,
    special_price: 10400
  },
  {
    model: "IPC-K6C-3H1WEB",
    name: "Bulb Cam 2C 3MP Wi-Fi PT Bulb Camera",
    desc: "Bulb Cam 2C 3MP Wi-Fi PT Bulb Camera — 1/3.2” CMOS; H.265 3MP 2K; 3.6mm lens; four-mode night vision up to 10m; white light; two-way audio; ONVIF; Micro SD up to 512GB; smart tracking; privacy mode; motion & human detection; abnormal sound alarm; siren & spotlight; auto-cruise; Wi-Fi 6.",
    price: 9200,
    special_price: 7400
  },
  {
    model: "IPC-K6C-5H1WEB",
    name: "Bulb Cam 2C 5MP Wi-Fi PT Bulb Camera",
    desc: "Bulb Cam 2C 5MP Wi-Fi PT Bulb Camera — 1/3” CMOS; H.265 5MP 3K; 3.6mm lens; four-mode night vision up to 10m; white light; two-way audio; ONVIF; Micro SD up to 512GB; smart tracking; privacy mode; motion & human detection; abnormal sound alarm; siren & spotlight; auto-cruise; Wi-Fi 6.",
    price: 10600,
    special_price: 8500
  },
  {
    model: "IPC-S6DP-3M0WEB",
    name: "Bulb Cam 3MP Bulb & Camera 2-in-1",
    desc: "Bulb Cam 3MP Bulb & Camera 2-in-1 — 3MP Progressive CMOS; 2304×1296; 25m night vision; 2.8 mm lens; 340° pan & 90° tilt; 2.4GHz Wi-Fi 6; H. 265/H.264; up to 15fps; 8x digital zoom; built-in mic & speaker; siren; two-way audio; Micro SD up to 512GB; 350-lumen brightness.",
    price: 15500,
    special_price: 12400
  },
  {
    model: "IPC-K2MP-3R1W",
    name: "Ranger Mini 3MP Integrated-Bracket Indoor Camera",
    desc: "Ranger Mini 3MP Integrated-Bracket Indoor Camera — 1/3” CMOS; H.265 3MP 2K; 3.6mm lens; four-mode night vision up to 10m; two-way audio; ONVIF; Micro SD up to 512GB; smart tracking; privacy mode; motion & human detection; abnormal sound alarm; built-in siren; auto-cruise; Ethernet; USB-C; Wi-Fi 6.",
    price: 10600,
    special_price: 8500
  },
  {
    model: "IPC-K2MP-5R1W",
    name: "Ranger Mini 5MP Integrated-Bracket Indoor Camera",
    desc: "Ranger Mini 5MP Integrated-Bracket Indoor Camera — 1/3” CMOS; H.265 5MP 3K; 3.6mm lens; four-mode night vision up to 10m; two-way audio; ONVIF; Micro SD up to 512GB; smart tracking; privacy mode; motion & human detection; abnormal sound alarm; built-in siren; auto-cruise; Ethernet; USB-C; Wi-Fi 6.",
    price: 13500,
    special_price: 10800
  },
  {
    model: "IPC-S20EP-6M0S",
    name: "Ranger Dual 3MP + 3MP Dual Lens PT Camera",
    desc: "Ranger Dual 3MP + 3MP Dual Lens PT Camera — Dual 3MP lenses; H.265 3MP 2K; 3.6mm lens; up to 15m IR; four-mode night vision; two-way audio; ONVIF; red-blue warning lights; active deterrence with spotlight and siren; Micro SD up to 512GB; AOR recording; smart tracking; motion, human & pet detection; abnormal sound alarm; IP67; Wi-Fi 6.",
    price: 19000,
    special_price: 15200
  },
  
  // Outdoor Model
  {
    model: "IPC-K3DP-3H0WF",
    name: "Bullet 2E 3MP 3MP Bullet Wi-Fi Camera",
    desc: "Bullet 2E 3MP 3MP Bullet Wi-Fi Camera — 1/2.8” CMOS; H.265 3MP 2K; 3.6mm lens; four-mode night vision up to 30m; built-in mic; ONVIF; dual antenna; Micro SD up to 512GB; alarm notification; motion & human detection; configurable region and voice; reset button; IP67 weatherproof.",
    price: 14100,
    special_price: 11300
  },
  {
    model: "IPC-S3EP-3M0WE",
    name: "Bullet 3 3MP 3MP Bullet Wi-Fi Camera",
    desc: "Bullet 3 3MP 3MP Bullet Wi-Fi Camera — 1/2.8” 3MP Progressive CMOS; 30m night vision; 2.8mm/3.6mm fixed lens; 100Mbps Ethernet; dual-antenna Wi-Fi 6; Imou App; ONVIF; H.265/H.264; up to 25/30fps; 8x digital zoom; built-in mic & speaker; 110dB siren; spotlight.",
    price: 16100,
    special_price: 12900
  },
  {
    model: "IPC-K9DC-5M0WEH-V2",
    name: "Cell 3C All In One 3K UHD Image",
    desc: "Cell 3C All In One 3K UHD Image — 1/3” Progressive CMOS 5MP (2880×1620); 15m night vision; 2.8mm lens F2.2; 5000mAh rechargeable battery; H.264/H.265; up to 15fps; 8x digital zoom; two-way audio; Wi-Fi; 120m open field; Imou App; Type-C; SD card slot.",
    price: 30700,
    special_price: 24600
  },
  {
    model: "IPC-K7FP-3V0W",
    name: "Cruiser SC 3MP 3MP Outdoor PT Wi-Fi Camera",
    desc: "Cruiser SC 3MP 3MP Outdoor PT Wi-Fi Camera — 1/2.8” CMOS; H.265 3MP 2K; 3.6mm lens; four-mode night vision up to 30m; two-way audio; ONVIF; red-blue warning lights; active deterrence with spotlight and 110dB siren; Micro SD up to 512GB; AOR; smart tracking; motion & human detection; IP67; Wi-Fi 6; Bluetooth.",
    price: 17100,
    special_price: 13700
  },
  {
    model: "IPC-K7FP-5H0WE",
    name: "Cruiser SC 5MP 5MP Outdoor PT Wi-Fi Camera",
    desc: "Cruiser SC 5MP 5MP Outdoor PT Wi-Fi Camera — 1/3.06” CMOS; H.265 5MP 3K; 3.6mm lens; four-mode night vision up to 30m; two-way audio; ONVIF; red-blue warning lights; active deterrence with spotlight and 110dB siren; Micro SD up to 512GB; AOR; smart tracking; motion & human detection; IP67; Wi-Fi 6; Bluetooth.",
    price: 21200,
    special_price: 17000
  },
  {
    model: "IPC-S7XEP-6M0WED",
    name: "Cruiser Dual 2 3MP+3MP Dual Lens Outdoor PT Camera",
    desc: "Cruiser Dual 2 3MP+3MP Dual Lens Outdoor PT Camera — Dual 3MP lenses; 1/3” CMOS; H.265 3MP 2K; 3.6mm lens; four-mode night vision up to 30m; two-way audio; ONVIF; red-blue warning lights; active deterrence with spotlight and 110dB siren; Micro SD up to 512GB; AOR; smart tracking; motion & human detection; IP67; Wi-Fi 6.",
    price: 25500,
    special_price: 20400
  },
  {
    model: "IPC-S7XEP-10M0WED",
    name: "Cruiser Dual 2 5MP+5MP Dual Lens Outdoor PT Camera",
    desc: "Cruiser Dual 2 5MP+5MP Dual Lens Outdoor PT Camera — Dual 5MP lenses; 1/3.06” CMOS; H.265 5MP 3K; 3.6mm lens; four-mode night vision up to 30m; two-way audio; ONVIF; red-blue warning lights; active deterrence with spotlight and 110dB siren; Micro SD up to 512GB; AOR; smart tracking; motion & human detection; IP67; Wi-Fi 6.",
    price: 30700,
    special_price: 24600
  },
  {
    model: "IPC-S7UP-11M0WED",
    name: "Cruiser Triple 3MP+3MP+5MP Triple Lens Outdoor PT Camera",
    desc: "Cruiser Triple 3MP+3MP+5MP Triple Lens Outdoor PT Camera — Triple lens; two 3MP lenses with 3.6 mm lenses and PT 5MP lens with 6mm lens; four-mode night vision up to 30m; two-way audio; ONVIF; red-blue warning lights; active deterrence; 2 SD card slots up to 512GB each; AOR; motion, human & vehicle detection; intrusion and line crossing detection; IP67; Wi-Fi 6.",
    price: 38100,
    special_price: 30500
  },
  {
    model: "IPC-S7DP-5M0WEZ",
    name: "Imou Cruiser Z 5MP WiFi 12X Hybrid Zoom Camera",
    desc: "Imou Cruiser Z 5MP WiFi 12X Hybrid Zoom Camera — 1/3” 5MP Progressive CMOS; night vision over 56m; 2.8mm + 12mm lenses; 12x hybrid zoom; 355° pan & 90° tilt; Ethernet; dual-antenna Wi-Fi; Imou App; ONVIF; 3K UHD; smart full-color night vision; remote pan & tilt; IMOU SENSE.",
    price: 35700,
    special_price: 28600
  },
  {
    model: "IPC-S76DP-13M0N",
    name: "Cruiser Pano Z 13MP Zoom Quadruple-Lens Outdoor PT Camera",
    desc: "Cruiser Pano Z 13MP Zoom Quadruple-Lens Outdoor PT Camera — Four lenses: two 4MP fixed lenses and one 5MP zoom lens system; panoramic stitching; 12x mixed zoom; 0–355° pan and 0–90° tilt; auto-tracking; warning lights and sound alarm; two SD card slots; AOR recording; broad area coverage.",
    price: 53300,
    special_price: 42700
  },
  {
    model: "IPC-U7LP-6V0NE",
    name: "Titan Pro 6MP WiFi PoE Aurora Color Night Vision Camera",
    desc: "Titan Pro 6MP WiFi PoE Aurora Color Night Vision Camera — 1/1.8” 6MP Progressive CMOS; 3200×1800; 30m night vision; 3.6mm F1.0 lens; 340° pan & 90° tilt; 2.4GHz & 5GHz dual-band Wi-Fi 6; H.265/H.264; 20fps; 8x digital zoom; two-way audio; 125dB siren; Aurora Color Night Vision; AOR.",
    price: 31800,
    special_price: 25500
  },
  
  // 4G Model
  {
    model: "IPC-K7FP-3H0TE-EU",
    name: "Cruiser SC 4G 3MP Outdoor PT Camera",
    desc: "Cruiser SC 4G 3MP Outdoor PT Camera — 1/2.9” CMOS; H.265 3MP 1080P; 3.6mm lens; 4G LTE; four-mode night vision up to 30m; two-way audio; ONVIF; active deterrence with spotlight and 110dB siren; Micro SD up to 256GB; smart tracking; motion & human detection; IP66 weatherproof.",
    price: 19700,
    special_price: 15800
  },
  {
    model: "IPC-K7FP-5H0TE-EU",
    name: "Cruiser SC 4G 5MP Outdoor PT Camera",
    desc: "Cruiser SC 4G 5MP Outdoor PT Camera — 1/3” 5MP Progressive CMOS; 2880×1620; 30m night vision; 3.6 mm lens; 355° pan & 90° tilt; four fill-in lights with IR/white light; red-blue warning lights; Ethernet; H.265/H.264; up to 20fps; 8x digital zoom; 110dB siren; spotlight.",
    price: 24600,
    special_price: 19700
  },
  {
    model: "IPC-S7XCP-6M1TED-EU",
    name: "Cruiser Dual 4G 3MP+3MP Dual Lens Camera",
    desc: "Cruiser Dual 4G 3MP+3MP Dual Lens Camera — 1/2.8” CMOS; H.265/H.264 3MP+3MP; 3.6mm fixed lens; 4G LTE; red-blue warning lights; four-mode night vision up to 30m; two-way audio; ONVIF; active deterrence with spotlight and 110dB siren; Micro SD up to 512GB; auto cruise; AI human & vehicle detection; smart tracking; privacy mode.",
    price: 30800,
    special_price: 24700
  },
  {
    model: "IPC-B7ED-5M0TEA-EU/FSP14",
    name: "AOV PT 5MP 4G & Wi-Fi with Solar Panel",
    desc: "AOV PT 5MP 4G & Wi-Fi with Solar Panel — 1/2.8” CMOS; H.265 5MP 3K; 3.6mm lens; 4G LTE; 10000mAh rechargeable battery; 3W solar panel; four-mode night vision up to 20m; two-way audio; ONVIF; siren & spotlight; PIR + human detection; Micro SD up to 256GB; smart tracking; IP66 weatherproof; USB-C.",
    price: 37000,
    special_price: 29600
  },
  {
    model: "IPC-SA70F-10M0T2-EU/FSP008",
    name: "AOV Dual 5MP+5MP Solar Battery 4G Camera",
    desc: "AOV Dual 5MP+5MP Solar Battery 4G Camera — 1/3” CMOS; H.265/H.264 5MP+5MP; 3.6mm fixed + 3.6mm PT lens; 4G LTE + Wi-Fi; 10000mAh rechargeable battery with solar panel; smart full-color night vision; always-on video; 24/7 recording; human & vehicle detection; low-temperature charging; two-way talk; siren & spotlight; storage up to 512GB; weatherproof.",
    price: 54600,
    special_price: 43700
  },
  
  // Micro SD Card
  {
    model: "ST2-64-S1",
    name: "IMOU 64GB SD Card",
    desc: "IMOU 64GB SD Card — Micro SD card specially designed for security cameras.",
    price: 5300,
    special_price: 4300
  },
  {
    model: "ST2-128-S1",
    name: "IMOU 128GB SD Card",
    desc: "IMOU 128GB SD Card — Micro SD card specially designed for security cameras.",
    price: 8700,
    special_price: 7000
  },
  {
    model: "ST2-256-S1",
    name: "IMOU 256GB SD Card",
    desc: "IMOU 256GB SD Card — Micro SD card specially designed for security cameras.",
    price: 12300,
    special_price: 9900
  },
  
  // Wi-Fi NVR
  {
    model: "NVR-N110W-8A0E-P",
    name: "IMOU 10 Channel Wireless NVR",
    desc: "IMOU 10 Channel Wireless NVR — 10-channel IP input; automatic pairing; built-in mic & speaker; IMOU App; HDMI/VGA output; storage up to 16TB; 4-channel playback; 2/4/8/16x playback; H.265 up to 4K UHD; ONVIF; 2 USB; SATA up to 16TB; network, RCA in/out, HDMI, VGA and power ports.",
    price: 19700,
    special_price: 15800
  },
  {
    model: "NVR-N118W-8A0E-P",
    name: "IMOU 18 Channel Wireless NVR",
    desc: "IMOU 18 Channel Wireless NVR — 8-channel IP input; 40Mbps wired max input; 16Mbps wireless max input; automatic pairing; HDMI/VGA output; dual antenna 2×2 MIMO; 2 USB; SATA up to 8TB; network, RCA in/out, HDMI, VGA and power ports; H.265+; manual/alarm/motion/schedule recording.",
    price: 26700,
    special_price: 21400
  },
  
  // Miscellaneous
  {
    model: "CL1B-5-E27",
    name: "IMOU CL1B-5-E27 Smart Multicolor Dimmable Bulb",
    desc: "IMOU CL1B-5-E27 Smart Multicolor Dimmable Bulb — Voice control; multicolor; dimmable; remote control; LED technology; 806lm rated lumens; 220° beam angle; 2700–6500K; 16 million colors; CRI >80; 2.4G Wi-Fi/BLE; 70m communication distance; Imou App.",
    price: 2300,
    special_price: 1900
  },
  {
    model: "K1-G-W-EN",
    name: "IMOU Smart Access Lock K1-G-W-EN",
    desc: "IMOU Smart Access Lock K1-G-W-EN — Multiple unlock methods; smart connection; extended battery life; auto-locks; reinforced aluminum alloy body; 2-year warranty.",
    price: 49200,
    special_price: 39400
  },
  {
    model: "HR12F-B",
    name: "IMOU HR12F-B Dual-Band Smart Router",
    desc: "IMOU HR12F-B Dual-Band Smart Router — Dual-band smart router; 1200Mbps Wi-Fi; IMOU Wi-Fi Auto Sync; IPTV support; 2-year warranty.",
    price: 10000,
    special_price: 8000
  },
  {
    model: "HR340",
    name: "IMOU HR340 300Mbps Wireless Router",
    desc: "IMOU HR340 300Mbps Wireless Router — 300Mbps Wi-Fi; four external antennas; IMOU camera auto sync; stream accelerate; 2-year warranty.",
    price: 6100,
    special_price: 4900
  },
  {
    model: "Imou Protect Basic",
    name: "IMOU Protect Basic Annual Plan",
    desc: "IMOU Protect Basic Annual Plan — 7 days cloud storage; device health guard; security report; remote SD card recording downloads; share devices with up to 10 users.",
    price: 12600,
    special_price: 10100
  },
  {
    model: "Imou Protect Plus",
    name: "IMOU Protect Plus Annual Plan",
    desc: "IMOU Protect Plus Annual Plan — 30 days cloud storage; device health guard; security report; remote SD card recording downloads; share devices with up to 10 users; enhanced AI detection except Vietnam and Russian-speaking area.",
    price: 24600,
    special_price: 19700
  }
];

async function run() {
  await initDatabase();
  const db = getDB();
  
  console.log(`Starting to insert ${products.length} products...`);
  let added = 0;
  
  for (const p of products) {
    try {
      // Create sku
      const sku = `IMOU-${p.model.replace(/\//g, '-')}-${Date.now().toString().slice(-6)}`;
      
      const result = await db.query(
        `INSERT INTO products (name, brand, model, sku, description, warranty_months, vat_applicable, retail_price, wholesale_price, cost_price, is_quick_add) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [p.name, 'IMOU', p.model, sku, p.desc, 36, 0, p.price, p.special_price, p.special_price, 0]
      );
      
      const pid = result.rows[0].id;
      
      // Init stock in all branches
      const branchesRes = await db.query('SELECT id FROM branches WHERE is_active = 1');
      for (const b of branchesRes.rows) {
        try {
          await db.query(
            'INSERT OR IGNORE INTO product_stock (product_id, branch_id, quantity) VALUES ($1,$2,0)',
            [pid, b.id]
          );
        } catch (e) {}
      }
      
      console.log(`Added: ${p.name} (ID: ${pid})`);
      added++;
    } catch (e) {
      console.error(`Error adding ${p.name}:`, e.message);
    }
  }
  
  console.log(`Successfully added ${added} products.`);
  process.exit(0);
}

run();
