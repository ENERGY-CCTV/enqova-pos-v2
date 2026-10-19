const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT),
});

const products = [
  // Page 1: ALARM ACCESSORIES (Category ID: 9)
  { sku: "ES-626", name: "Alarm Siren", brand: "General", model: "ES-626", category_id: 9, description: "Alarm Siren", retail: 2260, wholesale: 1260 },
  { sku: "B12-DB", name: "12V Access Control - Wired Door Bell", brand: "General", model: "B12-DB", category_id: 9, description: "12V Access Control - Wired Door Bell", retail: 2620, wholesale: 1620 },
  { sku: "KS-SF18C", name: "Magnetic Door/ Windows Alarm with Strobe light", brand: "General", model: "KS-SF18C", category_id: 9, description: "Magnetic Door/ Windows Alarm with Strobe light", retail: 4710, wholesale: 3710 },
  { sku: "v037", name: "Infrared induction Visitor Doorbell", brand: "General", model: "v037", category_id: 9, description: "Infrared induction Visitor Doorbell", retail: 3975, wholesale: 2975 },
  { sku: "103GV", name: "Alarm Siren with strobe light", brand: "General", model: "103GV", category_id: 9, description: "Alarm Siren with strobe light", retail: 4710, wholesale: 3710 },
  { sku: "ABT30", name: "BEAM SENSORS 30 METERS", brand: "General", model: "ABT30", category_id: 9, description: "BEAM SENSORS 30 METERS", retail: 8400, wholesale: 6720 },
  { sku: "ABT100", name: "BEAM SENSORS 100 METERS", brand: "General", model: "ABT100", category_id: 9, description: "BEAM SENSORS 100 METERS", retail: 11250, wholesale: 9000 },

  // Page 1: BATTERIES (Category ID: 10)
  { sku: "CR-1220", name: "DVR CMOS BATTERY - CR1220", brand: "General", model: "CR1220", category_id: 10, description: "DVR CMOS BATTERY - CR1220", retail: 563, wholesale: 450 },
  { sku: "CR-2032", name: "COIN CMOS BATTERY - CR2032", brand: "General", model: "CR2032", category_id: 10, description: "COIN CMOS BATTERY - CR2032", retail: 469, wholesale: 375 },
  { sku: "CR-2450", name: "PANASONIC COIN BATTERY - CR2450", brand: "Panasonic", model: "CR2450", category_id: 10, description: "PANASONIC COIN BATTERY - CR2450", retail: 1172, wholesale: 938 },
  { sku: "12V7A", name: "12V 7.2AH UPS BATTERY", brand: "General", model: "12V7A", category_id: 10, description: "12V 7.2AH UPS BATTERY", retail: 5850, wholesale: 4680 },
  { sku: "12V9A", name: "12V 9.2AH UPS BATTERY", brand: "General", model: "12V9A", category_id: 10, description: "12V 9.2AH UPS BATTERY", retail: 7400, wholesale: 5920 },
  { sku: "CR-123A", name: "PIR SENSOR BATTERY - CR-123A", brand: "Panasonic", model: "CR-123A", category_id: 10, description: "PIR SENSOR BATTERY - CR-123A", retail: 2400, wholesale: 1920 },

  // Page 1-2: FIBER OPTICS (Category ID: 11)
  { sku: "FBT001", name: "FIBER OPTICAL TOOL BOX - T805", brand: "General", model: "T805", category_id: 11, description: "FIBER OPTICAL TOOL BOX - T805", retail: 49663, wholesale: 39730 },
  { sku: "FBSLV", name: "FIBER OPTIC HEAT SLEEVE - 6MM", brand: "General", model: "FBSLV", category_id: 11, description: "FIBER OPTIC HEAT SLEEVE - 6MM", retail: 50, wholesale: 40 },
  { sku: "FBCT", name: "FIBER OPTIC CUTTING TRAY", brand: "General", model: "FBCT", category_id: 11, description: "FIBER OPTIC CUTTING TRAY", retail: 375, wholesale: 300 },
  { sku: "LC/UPCQF1", name: "LC UPC Pre-embedded Optical Fast Connector", brand: "General", model: "LC/UPCQF1", category_id: 11, description: "LC UPC Pre-embedded Optical Fast Connector", retail: 375, wholesale: 300 },
  { sku: "FSC", name: "FIBER FC QUICK CONNECTOR", brand: "General", model: "FSC", category_id: 11, description: "FIBER FC QUICK CONNECTOR", retail: 750, wholesale: 600 },
  { sku: "FSC-JOINT", name: "FIBER FC CONNECTOR - COUPLER JOINT", brand: "General", model: "FSC-JOINT", category_id: 11, description: "FIBER FC CONNECTOR - COUPLER JOINT", retail: 469, wholesale: 375 },

  // Page 2: CONNECTORS (Category ID: 12)
  { sku: "BNCN", name: "BNC Normal", brand: "General", model: "BNCN", category_id: 12, description: "BNC Normal", retail: 90, wholesale: 72 },
  { sku: "BNCA", name: "BNC Grade A", brand: "General", model: "BNCA", category_id: 12, description: "BNC Grade A", retail: 200, wholesale: 160 },
  { sku: "BNCMX", name: "BNC MX Full Copper", brand: "General", model: "BNCMX", category_id: 12, description: "BNC MX Full Copper", retail: 263, wholesale: 210 },
  { sku: "BNC-JOINT", name: "BNC - COUPLER - FEMALE JOINT", brand: "General", model: "BNC-JOINT", category_id: 12, description: "BNC - COUPLER - FEMALE JOINT", retail: 188, wholesale: 150 },
  { sku: "DCJMW", name: "DC male Connector wire", brand: "General", model: "DCJMW", category_id: 12, description: "DC male Connector wire", retail: 150, wholesale: 120 },
  { sku: "DCJFW", name: "DC female Connector wire", brand: "General", model: "DCJFW", category_id: 12, description: "DC female Connector wire", retail: 150, wholesale: 120 },
  { sku: "DCJM", name: "DC male Connector", brand: "General", model: "DCJM", category_id: 12, description: "DC male Connector", retail: 100, wholesale: 80 },
  { sku: "DCJF", name: "DC female Connector", brand: "General", model: "DCJF", category_id: 12, description: "DC female Connector", retail: 100, wholesale: 80 },
  { sku: "RJ45", name: "RJ45 CAT6 Connector", brand: "General", model: "RJ45", category_id: 12, description: "RJ45 CAT6 Connector", retail: 40, wholesale: 30 },
  { sku: "CAT6BT", name: "CAT 6 RJ45 BOOT", brand: "General", model: "CAT6BT", category_id: 12, description: "CAT 6 RJ45 BOOT", retail: 25, wholesale: 20 },
  { sku: "RJ45JOINTP", name: "RG45 TO RJ45 JOINER PLASTIC", brand: "General", model: "RJ45JOINTP", category_id: 12, description: "RG45 TO RJ45 JOINER PLASTIC", retail: 500, wholesale: 400 },
  { sku: "RJ45JOINTM", name: "RG45 TO RJ45 JOINER METAL", brand: "General", model: "RJ45JOINTM", category_id: 12, description: "RG45 TO RJ45 JOINER METAL", retail: 750, wholesale: 600 },
  { sku: "HDMIJOINTF", name: "HDMI TO HDMI JOINT COUPLER - FEMALE", brand: "General", model: "HDMIJOINTF", category_id: 12, description: "HDMI TO HDMI JOINT COUPLER - FEMALE", retail: 500, wholesale: 400 },
  { sku: "CMS-FP-01", name: "Network Faceplate Single Port - Commscope", brand: "Commscope", model: "CMS-FP-01", category_id: 12, description: "Network Faceplate Single Port - Commscope", retail: 500, wholesale: 400 },
  { sku: "CMS-FP-02", name: "Network Faceplate Dual Port - Commscope", brand: "Commscope", model: "CMS-FP-02", category_id: 12, description: "Network Faceplate Dual Port - Commscope", retail: 675, wholesale: 540 },
  { sku: "CMS-KS-01", name: "CAT 6 - Keystone Jack - Outlet - Commscope", brand: "Commscope", model: "CMS-KS-01", category_id: 12, description: "CAT 6 - Keystone Jack - Outlet - Commscope", retail: 600, wholesale: 480 },
  { sku: "POEIN100M", name: "POE INJECTOR IPC 100M", brand: "General", model: "POEIN100M", category_id: 12, description: "POE INJECTOR IPC 100M", retail: 1500, wholesale: 1200 },
  { sku: "PD-3201", name: "POE SPLITTER 10/100 MBPS", brand: "General", model: "PD-3201", category_id: 12, description: "POE SPLITTER 10/100 MBPS", retail: 1800, wholesale: 1440 },
  { sku: "3PINCON", name: "3 Pin Travel adaptor - Square Pin", brand: "General", model: "3PINCON", category_id: 12, description: "3 Pin Travel adaptor - Square Pin", retail: 375, wholesale: 300 },
  { sku: "mic001", name: "Stick-on Round Audio Pickup Security Mic Device", brand: "General", model: "mic001", category_id: 12, description: "Stick-on Round Audio Pickup Security Mic Device", retail: 2000, wholesale: 1600 },

  // Page 3: HDMI CABLES (Category ID: 13)
  { sku: "HDMI-1.5M-NC", name: "HDMI CABLE NORMAL 1.5M", brand: "General", model: "HDMI-1.5M-NC", category_id: 13, description: "HDMI CABLE NORMAL 1.5M", retail: 613, wholesale: 490 },
  { sku: "HDMI-3M-NC", name: "HDMI CABLE NORMAL 3M", brand: "General", model: "HDMI-3M-NC", category_id: 13, description: "HDMI CABLE NORMAL 3M", retail: 950, wholesale: 760 },
  { sku: "HDMI-5M-NC", name: "HDMI CABLE NORMAL 5M", brand: "General", model: "HDMI-5M-NC", category_id: 13, description: "HDMI CABLE NORMAL 5M", retail: 1488, wholesale: 1190 },
  { sku: "HDMI-10M-NC", name: "HDMI CABLE NORMAL 10M", brand: "General", model: "HDMI-10M-NC", category_id: 13, description: "HDMI CABLE NORMAL 10M", retail: 3075, wholesale: 2460 },
  { sku: "HDMI-1.5M-4K", name: "HDMI cable 1.5M-4K ULTRAHD", brand: "General", model: "HDMI-1.5M-4K", category_id: 13, description: "HDMI cable 1.5M-4K ULTRAHD", retail: 1150, wholesale: 920 },
  { sku: "HDMI-3M-4K", name: "HDMI cable 3M - 4K ULTRAHD", brand: "General", model: "HDMI-3M-4K", category_id: 13, description: "HDMI cable 3M - 4K ULTRAHD", retail: 1800, wholesale: 1440 },
  { sku: "HDMI-5M-4K", name: "HDMI cable 5M-4K ULTRAHD", brand: "General", model: "HDMI-5M-4K", category_id: 13, description: "HDMI cable 5M-4K ULTRAHD", retail: 2200, wholesale: 1760 },
  { sku: "HDMI-10M-4K", name: "HDMI cable 10M-4K ULTRAHD", brand: "General", model: "HDMI-10M-4K", category_id: 13, description: "HDMI cable 10M-4K ULTRAHD", retail: 3950, wholesale: 3160 },
  { sku: "HDMI-15M-4K", name: "HDMI cable 15M-4K ULTRAHD", brand: "General", model: "HDMI-15M-4K", category_id: 13, description: "HDMI cable 15M-4K ULTRAHD", retail: 5750, wholesale: 4600 },
  { sku: "HDMI-20M-4K", name: "HDMI cable 20M-4K ULTRAHD", brand: "General", model: "HDMI-20M-4K", category_id: 13, description: "HDMI cable 20M-4K ULTRAHD", retail: 7500, wholesale: 6000 },
  { sku: "RL-HF-30-DM-BE-30M", name: "HDMI Fiber Optic cable 30M-4K ULTRAHD", brand: "Red Link", model: "RL-HF-30-DM-BE-30M", category_id: 13, description: "HDMI Fiber Optic cable 30M-4K ULTRAHD", retail: 16875, wholesale: 13500 },

  // Page 3: USB CABLES (Category ID: 14)
  { sku: "USB-1.5M", name: "USB CABLE 1.5M", brand: "General", model: "USB-1.5M", category_id: 14, description: "USB CABLE 1.5M", retail: 675, wholesale: 540 },
  { sku: "USB-3M", name: "USB CABLE 3M", brand: "General", model: "USB-3M", category_id: 14, description: "USB CABLE 3M", retail: 1013, wholesale: 810 },
  { sku: "USB-5M", name: "USB CABLE 5M", brand: "General", model: "USB-5M", category_id: 14, description: "USB CABLE 5M", retail: 1500, wholesale: 1200 },
  { sku: "USB-10M", name: "USB 10M CABLE", brand: "General", model: "USB-10M", category_id: 14, description: "USB 10M CABLE", retail: 2125, wholesale: 1700 },

  // Page 3: VGA CABLES (Category ID: 15)
  { sku: "VGA1M", name: "VGA CABLE 1.5M", brand: "General", model: "VGA1M", category_id: 15, description: "VGA CABLE 1.5M", retail: 950, wholesale: 760 },
  { sku: "VGA3M", name: "VGA CABLE 3M", brand: "General", model: "VGA3M", category_id: 15, description: "VGA CABLE 3M", retail: 1025, wholesale: 820 },
  { sku: "VGA5M", name: "VGA CABLE 5M", brand: "General", model: "VGA5M", category_id: 15, description: "VGA CABLE 5M", retail: 1250, wholesale: 1000 },
  { sku: "VGA10M", name: "VGA CABLE 10M", brand: "General", model: "VGA10M", category_id: 15, description: "VGA CABLE 10M", retail: 2438, wholesale: 1950 },
  { sku: "VGA15M", name: "VGA CABLE 15M", brand: "General", model: "VGA15M", category_id: 15, description: "VGA CABLE 15M", retail: 4363, wholesale: 3490 },
  { sku: "VGA20M", name: "VGA CABLE 20M", brand: "General", model: "VGA20M", category_id: 15, description: "VGA CABLE 20M", retail: 5000, wholesale: 4000 },
  { sku: "VGA25M", name: "VGA CABLE 25M", brand: "General", model: "VGA25M", category_id: 15, description: "VGA CABLE 25M", retail: 8404, wholesale: 6723 },
  { sku: "VGA30M", name: "VGA CABLE 30M", brand: "General", model: "VGA30M", category_id: 15, description: "VGA CABLE 30M", retail: 10800, wholesale: 8640 },

  // Page 3: NETWORK PATCH CORDS (Category ID: 16)
  { sku: "MNWPC", name: "0.5M CAT6 Ethernet Network - Patch Cable", brand: "General", model: "MNWPC", category_id: 16, description: "0.5M CAT6 Ethernet Network - Patch Cable", retail: 230, wholesale: 184 },
  { sku: "1MNWPC", name: "1M CAT6 Ethernet Network - Patch Cable", brand: "General", model: "1MNWPC", category_id: 16, description: "1M CAT6 Ethernet Network - Patch Cable", retail: 350, wholesale: 280 },
  { sku: "2MNWPC", name: "2M CAT6 Ethernet Network - Patch Cable", brand: "General", model: "2MNWPC", category_id: 16, description: "2M CAT6 Ethernet Network - Patch Cable", retail: 416, wholesale: 333 },
  { sku: "3MNWPC", name: "3M CAT6 Ethernet Network - Patch Cable", brand: "General", model: "3MNWPC", category_id: 16, description: "3M CAT6 Ethernet Network - Patch Cable", retail: 656, wholesale: 525 },
  { sku: "5MNWPC", name: "5M CAT6 Ethernet Network - Patch Cable", brand: "General", model: "5MNWPC", category_id: 16, description: "5M CAT6 Ethernet Network - Patch Cable", retail: 1203, wholesale: 963 },
  { sku: "10MNWPC", name: "10M CAT6 Ethernet Network - Patch Cable", brand: "General", model: "10MNWPC", category_id: 16, description: "10M CAT6 Ethernet Network - Patch Cable", retail: 1969, wholesale: 1575 },
  { sku: "15MNWPC", name: "15M CAT6 Ethernet Network - Patch Cable", brand: "General", model: "15MNWPC", category_id: 16, description: "15M CAT6 Ethernet Network - Patch Cable", retail: 3063, wholesale: 2450 },
  { sku: "20MNWPC", name: "20M CAT6 Ethernet Network - Patch Cable", brand: "General", model: "20MNWPC", category_id: 16, description: "20M CAT6 Ethernet Network - Patch Cable", retail: 4156, wholesale: 3325 },

  // Page 3: EXTENDERS (Category ID: 17)
  { sku: "HDMIEX30M", name: "HDMI EXTENDER 30M 4K", brand: "General", model: "HDMIEX30M", category_id: 17, description: "HDMI EXTENDER 30M 4K", retail: 1406, wholesale: 1125 },
  { sku: "HDMIEX60M", name: "HDMI EXTENDER 60M", brand: "General", model: "HDMIEX60M", category_id: 17, description: "HDMI EXTENDER 60M", retail: 6563, wholesale: 5250 },
  { sku: "HDMI-KVM-60M", name: "HDMI-KVM-EXTENDER 30M (USB)", brand: "General", model: "HDMI-KVM-60M", category_id: 17, description: "HDMI-KVM-EXTENDER 30M (USB)", retail: 9600, wholesale: 7680 },
  { sku: "USB50M", name: "USB EXTENDER 50M", brand: "General", model: "USB50M", category_id: 17, description: "USB EXTENDER 50M", retail: 1875, wholesale: 1500 },

  // Page 3: VIDEO BALUNS (Category ID: 18)
  { sku: "RL-VB201-HD", name: "RED LINK 2.0MP VIDEO BALUN", brand: "Red Link", model: "RL-VB201-HD", category_id: 18, description: "RED LINK 2.0MP VIDEO BALUN", retail: 469, wholesale: 375 },
  { sku: "RL-VB501-HD", name: "RED LINK 5.0MP VIDEO BALUN", brand: "Red Link", model: "RL-VB501-HD", category_id: 18, description: "RED LINK 5.0MP VIDEO BALUN", retail: 563, wholesale: 450 },
  { sku: "RL-VB801-HD", name: "RED LINK 8.0MP VIDEO BALUN", brand: "Red Link", model: "RL-VB801-HD", category_id: 18, description: "RED LINK 8.0MP VIDEO BALUN", retail: 1065, wholesale: 852 },
  { sku: "VB8MP-PV", name: "Passive Video Balun BNC - 8MP with Power Connector Over CAT6", brand: "General", model: "VB8MP-PV", category_id: 18, description: "Passive Video Balun BNC - 8MP with Power Connector Over CAT6", retail: 1094, wholesale: 875 },

  // Page 4: SPLITTERS & CONVERTERS (Category ID: 19)
  { sku: "RL-2H-2K-S-2P", name: "HDMI SPLITTER 2PORT 1080P", brand: "Red Link", model: "RL-2H-2K-S-2P", category_id: 19, description: "HDMI SPLITTER 2PORT 1080P", retail: 2700, wholesale: 2160 },
  { sku: "RL-4H-2K-S-4P", name: "HDMI SPLITTER 4PORT 1080P", brand: "Red Link", model: "RL-4H-2K-S-4P", category_id: 19, description: "HDMI SPLITTER 4PORT 1080P", retail: 4050, wholesale: 3240 },
  { sku: "RL-2H-4K-S-2P", name: "HDMI SPLITTER 2PORT 4K", brand: "Red Link", model: "RL-2H-4K-S-2P", category_id: 19, description: "HDMI SPLITTER 2PORT 4K", retail: 4500, wholesale: 3600 },
  { sku: "RL-4H-4K-S-4P", name: "HDMI SPLITTER 4PORT 4K", brand: "Red Link", model: "RL-4H-4K-S-4P", category_id: 19, description: "HDMI SPLITTER 4PORT 4K", retail: 5850, wholesale: 4680 },

  // Page 4: BRACKETS (Category ID: 20)
  { sku: "RL-CCTV-I-20CM", name: "20cm I Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-I-20CM", category_id: 20, description: "20cm I Type Camera Brackets Aluminium", retail: 2530, wholesale: 1530 },
  { sku: "RL-CCTV-I-30CM", name: "30cm I Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-I-30CM", category_id: 20, description: "30cm I Type Camera Brackets Aluminium", retail: 2755, wholesale: 1755 },
  { sku: "RL-CCTV-I-40CM", name: "40cm I Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-I-40CM", category_id: 20, description: "40cm I Type Camera Brackets Aluminium", retail: 3070, wholesale: 2070 },
  { sku: "RL-CCTV-I-50CM", name: "50cm I Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-I-50CM", category_id: 20, description: "50cm I Type Camera Brackets Aluminium", retail: 3340, wholesale: 2340 },
  { sku: "RL-CCTV-I-60CM", name: "60cm I Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-I-60CM", category_id: 20, description: "60cm I Type Camera Brackets Aluminium", retail: 3520, wholesale: 2520 },
  { sku: "RL-CCTV-I-80CM", name: "80cm I Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-I-80CM", category_id: 20, description: "80cm I Type Camera Brackets Aluminium", retail: 3790, wholesale: 2790 },
  { sku: "RL-CCTV-I-100CM", name: "100cm I Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-I-100CM", category_id: 20, description: "100cm I Type Camera Brackets Aluminium", retail: 3970, wholesale: 2970 },
  { sku: "RL-CCTV-L-17CM", name: "17cm L Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-L-17CM", category_id: 20, description: "17cm L Type Camera Brackets Aluminium", retail: 2620, wholesale: 1620 },
  { sku: "RL-CCTV-L-20CM", name: "20cm L Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-L-20CM", category_id: 20, description: "20cm L Type Camera Brackets Aluminium", retail: 2755, wholesale: 1755 },
  { sku: "RL-CCTV-L-32CM", name: "32cm L Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-L-32CM", category_id: 20, description: "32cm L Type Camera Brackets Aluminium", retail: 2782, wholesale: 1782 },
  { sku: "RL-CCTV-L-40CM", name: "40cm L Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-L-40CM", category_id: 20, description: "40cm L Type Camera Brackets Aluminium", retail: 3160, wholesale: 2160 },
  { sku: "RL-CCTV-L-50CM", name: "50cm L Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-L-50CM", category_id: 20, description: "50cm L Type Camera Brackets Aluminium", retail: 3430, wholesale: 2430 },
  { sku: "RL-CCTV-L-60CM", name: "60cm L Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-L-60CM", category_id: 20, description: "60cm L Type Camera Brackets Aluminium", retail: 3610, wholesale: 2610 },
  { sku: "RL-CCTV-L-80CM", name: "80cm L Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-L-80CM", category_id: 20, description: "80cm L Type Camera Brackets Aluminium", retail: 3880, wholesale: 2880 },
  { sku: "RL-CCTV-L-100CM", name: "100cm L Type Camera Brackets Aluminium", brand: "Red Link", model: "RL-CCTV-L-100CM", category_id: 20, description: "100cm L Type Camera Brackets Aluminium", retail: 4330, wholesale: 3330 },
  { sku: "1212-OEMP", name: "PLASTIC STAND OEM SMALL", brand: "OEM", model: "1212-OEMP", category_id: 20, description: "PLASTIC STAND OEM SMALL", retail: 188, wholesale: 150 },
  { sku: "608-OEMP", name: "PLASTIC STAND OEM MEDIUM", brand: "OEM", model: "608-OEMP", category_id: 20, description: "PLASTIC STAND OEM MEDIUM", retail: 375, wholesale: 300 },
  { sku: "ALU1212OEM", name: "ALUMINIUM STAND OEM SMALL", brand: "OEM", model: "ALU1212OEM", category_id: 20, description: "ALUMINIUM STAND OEM SMALL", retail: 563, wholesale: 450 },
  { sku: "ALU608OEM", name: "ALUMINIUM STAND OEM MEDIUM", brand: "OEM", model: "ALU608OEM", category_id: 20, description: "ALUMINIUM STAND OEM MEDIUM", retail: 750, wholesale: 600 },
  { sku: "PDS-01", name: "L Shaped Wall Bracket | ABS Plastic Compatible with the EZVIZ", brand: "EZVIZ", model: "PDS-01", category_id: 20, description: "L Shaped Wall Bracket | ABS Plastic Compatible with the EZVIZ", retail: 1200, wholesale: 960 },

  // Page 4: DVR / NETWORK RACKS (Category ID: 21)
  { sku: "3URACK", name: "3U RACK METAL BOX - MANUAL CUT NORMAL", brand: "General", model: "3URACK", category_id: 21, description: "3U RACK METAL BOX - MANUAL CUT NORMAL", retail: 2550, wholesale: 2040 },
  { sku: "3UMINI", name: "3U RACK MINI METAL BOX - LASER CUT", brand: "General", model: "3UMINI", category_id: 21, description: "3U RACK MINI METAL BOX - LASER CUT", retail: 4200, wholesale: 3360 },
  { sku: "3URACK-L", name: "3U RACK METAL BOX - LASER CUT", brand: "General", model: "3URACK-L", category_id: 21, description: "3U RACK METAL BOX - LASER CUT", retail: 4200, wholesale: 3360 },
  { sku: "4URACK", name: "4U RACK METAL", brand: "General", model: "4URACK", category_id: 21, description: "4U RACK METAL", retail: 13125, wholesale: 10500 },
  { sku: "3URACK-G", name: "3U RACK METAL - GLASS - 19\" RAILING", brand: "General", model: "3URACK-G", category_id: 21, description: "3U RACK METAL - GLASS - 19\" RAILING", retail: 13500, wholesale: 10800 },
  { sku: "5URACK", name: "5U RACK METAL - GLASS - 19\" RAILING", brand: "General", model: "5URACK", category_id: 21, description: "5U RACK METAL - GLASS - 19\" RAILING", retail: 17250, wholesale: 13800 },
  { sku: "7URACK", name: "7U RACK METAL - GLASS - 19\" RAILING", brand: "General", model: "7URACK", category_id: 21, description: "7U RACK METAL - GLASS - 19\" RAILING", retail: 23250, wholesale: 18600 },
  { sku: "CP-301CCD", name: "METAL SUN BOX 200 X 140 X 75 - CP-301", brand: "General", model: "CP-301CCD", category_id: 21, description: "METAL SUN BOX 200 X 140 X 75 - CP-301", retail: 1999, wholesale: 1599 },
  { sku: "MBOX-600M", name: "METAL SUN BOX 600M", brand: "General", model: "MBOX-600M", category_id: 21, description: "METAL SUN BOX 600M", retail: 2925, wholesale: 2340 },
  { sku: "IPBOX001", name: "Water Proof Plastic Box IP66 100 x 100 x 70", brand: "General", model: "IPBOX001", category_id: 21, description: "Water Proof Plastic Box IP66 100 x 100 x 70", retail: 900, wholesale: 500 },
  { sku: "IPBOX002", name: "Water Proof Plastic Box IP66 150 x 110 x 70", brand: "General", model: "IPBOX002", category_id: 21, description: "Water Proof Plastic Box IP66 150 x 110 x 70", retail: 1500, wholesale: 1000 },

  // Page 4-5: POWER SUPPLIES (Category ID: 5)
  { sku: "PSU2A12V", name: "12V 2A CCTV Power Supply", brand: "General", model: "PSU2A12V", category_id: 5, description: "12V 2A CCTV Power Supply", retail: 630, wholesale: 504 },
  { sku: "RL-611", name: "12V 2A CCTV Power Supply with Backup", brand: "Red Link", model: "RL-611", category_id: 5, description: "12V 2A CCTV Power Supply with Backup", retail: 3000, wholesale: 2400 },
  { sku: "PSU10A12V", name: "CCTV POWER SUPPLY INDOOR 12V 10A", brand: "General", model: "PSU10A12V", category_id: 5, description: "CCTV POWER SUPPLY INDOOR 12V 10A", retail: 2950, wholesale: 1950 },
  { sku: "PSU15A12V", name: "CCTV POWER SUPPLY INDOOR 12V 15A", brand: "General", model: "PSU15A12V", category_id: 5, description: "CCTV POWER SUPPLY INDOOR 12V 15A", retail: 3213, wholesale: 2213 },
  { sku: "PSU20A12V", name: "CCTV POWER SUPPLY INDOOR 12V 20A", brand: "General", model: "PSU20A12V", category_id: 5, description: "CCTV POWER SUPPLY INDOOR 12V 20A", retail: 4008, wholesale: 3008 },
  { sku: "PSU30A12V", name: "CCTV POWER SUPPLY INDOOR 12V 30A", brand: "General", model: "PSU30A12V", category_id: 5, description: "CCTV POWER SUPPLY INDOOR 12V 30A", retail: 4893, wholesale: 3893 },
  { sku: "PSU40A12V", name: "CCTV POWER SUPPLY INDOOR 12V 40A", brand: "General", model: "PSU40A12V", category_id: 5, description: "CCTV POWER SUPPLY INDOOR 12V 40A", retail: 5245, wholesale: 4245 },
  { sku: "PSU12V5A", name: "12V 5A POWER PACKS - FOR DVR / CAMERA", brand: "General", model: "PSU12V5A", category_id: 5, description: "12V 5A POWER PACKS - FOR DVR / CAMERA", retail: 2800, wholesale: 1800 },
  { sku: "PSU24V5A", name: "24V 5A POWER PACKS - FOR EAS SYSTEM", brand: "General", model: "PSU24V5A", category_id: 5, description: "24V 5A POWER PACKS - FOR EAS SYSTEM", retail: 6600, wholesale: 5600 },
  { sku: "PSU48V2A", name: "48V 2A POWER PACKS - FOR POE SWITCH", brand: "General", model: "PSU48V2A", category_id: 5, description: "48V 2A POWER PACKS - FOR POE SWITCH", retail: 5605, wholesale: 4605 },
  { sku: "RL-1205B-04FR", name: "RED LINK 5CH UPS POWER SUPPLY (Without Battery)", brand: "Red Link", model: "RL-1205B-04FR", category_id: 5, description: "RED LINK 5CH UPS POWER SUPPLY (Without Battery)", retail: 9775, wholesale: 8775 },

  // Page 5: TOOLS (Category ID: 22)
  { sku: "MWSTPQ1", name: "MINI WIRE STRIPPER MODEL - Q1", brand: "General", model: "MWSTPQ1", category_id: 22, description: "MINI WIRE STRIPPER MODEL - Q1", retail: 150, wholesale: 120 },
  { sku: "KMP001", name: "CRIMPING TOOL NORMAL", brand: "General", model: "KMP001", category_id: 22, description: "CRIMPING TOOL NORMAL", retail: 2100, wholesale: 1680 },
  { sku: "KMP002", name: "CRIMPING TOOL HIGH QUALITY", brand: "General", model: "KMP002", category_id: 22, description: "CRIMPING TOOL HIGH QUALITY", retail: 3375, wholesale: 2700 },

  // Page 5: POWER DISTRIBUTION & PROTECTORS (Category ID: 23)
  { sku: "PDU6W", name: "POWER DISTRIBUTION UNIT 6 WAY", brand: "General", model: "PDU6W", category_id: 23, description: "POWER DISTRIBUTION UNIT 6 WAY", retail: 9000, wholesale: 7200 },
  { sku: "MXC-154", name: "5 Way Power distribution with 5 meters power cable", brand: "General", model: "MXC-154", category_id: 23, description: "5 Way Power distribution with 5 meters power cable", retail: 7125, wholesale: 5700 },
  { sku: "JR-AC-220V", name: "220V POWER SURGE PROTECTOR JR AC-220V", brand: "General", model: "JR-AC-220V", category_id: 23, description: "220V POWER SURGE PROTECTOR JR AC-220V", retail: 2336, wholesale: 1869 },
  { sku: "AC240SUR1", name: "220V SURGE ARRESTERS WITH FUSE FOR CCTV SYSTEM", brand: "General", model: "AC240SUR1", category_id: 23, description: "220V SURGE ARRESTERS WITH FUSE FOR CCTV SYSTEM", retail: 7838, wholesale: 6270 },
  { sku: "RL01-N100", name: "RED LINK RJ45 NETWORK LAN SURGE PROTECTOR", brand: "Red Link", model: "RL01-N100", category_id: 23, description: "RED LINK RJ45 NETWORK LAN SURGE PROTECTOR", retail: 2336, wholesale: 1869 },

  // Page 5-6: VIDEO CABLE & POWER CABLE (Category ID: 24)
  { sku: "EI-77-100CB", name: "EAGLE-I 3C2V COPPER PLATED COAXIAL CABLE 100M", brand: "Eagle-I", model: "EI-77-100CB", category_id: 24, description: "EAGLE-I 3C2V COPPER PLATED COAXIAL CABLE 100M", retail: 3375, wholesale: 2700 },
  { sku: "HM-6302", name: "HI-MAX 3C2V COAXIAL CABLE 100M - 3C2V", brand: "Hi-Max", model: "HM-6302", category_id: 24, description: "HI-MAX 3C2V COAXIAL CABLE 100M - 3C2V", retail: 4125, wholesale: 3300 },
  { sku: "HM-7502", name: "HI-MAX 3C2V RG59 CCA CABLE 100M - RG59", brand: "Hi-Max", model: "HM-7502", category_id: 24, description: "HI-MAX 3C2V RG59 CCA CABLE 100M - RG59", retail: 4713, wholesale: 3770 },
  { sku: "RL-10575-CCA", name: "RED LINK OXYGEN FREE RG59 CCA 100M CABLE", brand: "Red Link", model: "RL-10575-CCA", category_id: 24, description: "RED LINK OXYGEN FREE RG59 CCA 100M CABLE", retail: 4713, wholesale: 3770 },
  { sku: "RL-P1055BC", name: "RED LINK 3C2V FULL COPPER COAXIAL CABLE 100M", brand: "Red Link", model: "RL-P1055BC", category_id: 24, description: "RED LINK 3C2V FULL COPPER COAXIAL CABLE 100M", retail: 5813, wholesale: 4650 },
  { sku: "RI-J1078BC", name: "RED-LINK RG 6 COAXIAL FULL COPPER CABLE JELL FILLED", brand: "Red Link", model: "RI-J1078BC", category_id: 24, description: "RED-LINK RG 6 COAXIAL FULL COPPER CABLE JELL FILLED", retail: 8400, wholesale: 6720 },
  { sku: "J1045BC+DC", name: "RED-LINK C32V COAXIAL CABLE 100M + DC F.COPPER", brand: "Red Link", model: "J1045BC+DC", category_id: 24, description: "RED-LINK C32V COAXIAL CABLE 100M + DC F.COPPER", retail: 14063, wholesale: 11250 },
  { sku: "KEL-3C2V", name: "KELANI FULL COPPER C32V COAXIAL CABLE 100M", brand: "Kelani", model: "KEL-3C2V", category_id: 24, description: "KELANI FULL COPPER C32V COAXIAL CABLE 100M", retail: 27363, wholesale: 21890 },
  { sku: "DS-1LC1SSA", name: "Hikvision DS-1LC1SSA CCS RG59 305 Meters Coaxial Video Cable", brand: "Hikvision", model: "DS-1LC1SSA", category_id: 24, description: "Hikvision DS-1LC1SSA CCS RG59 305 Meters Coaxial Video Cable", retail: 22344, wholesale: 17875 },
  { sku: "DS-1LC3C2V-1", name: "HIKVISION 3C2V COAXIAL CABLE 100M", brand: "Hikvision", model: "DS-1LC3C2V-1", category_id: 24, description: "HIKVISION 3C2V COAXIAL CABLE 100M", retail: 11070, wholesale: 8856 },
  { sku: "DS-1LH1SCA3C-090B", name: "HIKVISION 3C2V COAXIAL + DC CABLE 90M", brand: "Hikvision", model: "DS-1LH1SCA3C-090B", category_id: 24, description: "HIKVISION 3C2V COAXIAL + DC CABLE 90M", retail: 17700, wholesale: 14160 },
  { sku: "TT100MKEL", name: "Kelani TT Flex 100M Flexible Power Cable Wire", brand: "Kelani", model: "TT100MKEL", category_id: 24, description: "Kelani TT Flex 100M Flexible Power Cable Wire", retail: 8703, wholesale: 6962 },

  // Page 6: TV / MONITOR WALL MOUNT (Category ID: 25)
  { sku: "FS01TVWM", name: "LED TV / MONITOR WALL MOUNT 14\"-24\"", brand: "General", model: "FS01TVWM", category_id: 25, description: "LED TV / MONITOR WALL MOUNT 14\"-24\"", retail: 1125, wholesale: 900 },
  { sku: "NS-210", name: "LED TV / MONITOR WALL MOUNT 10\"-32\"", brand: "General", model: "NS-210", category_id: 25, description: "LED TV / MONITOR WALL MOUNT 10\"-32\"", retail: 2250, wholesale: 1800 },
  { sku: "JD-F03", name: "LED TV / MONITOR WALL MOUNT 14\"-27\"", brand: "General", model: "JD-F03", category_id: 25, description: "LED TV / MONITOR WALL MOUNT 14\"-27\"", retail: 2969, wholesale: 2375 },
  { sku: "CP302", name: "LED TV / MONITOR WALL MOUNT 14\"-42\"", brand: "General", model: "CP302", category_id: 25, description: "LED TV / MONITOR WALL MOUNT 14\"-42\"", retail: 3906, wholesale: 3125 },
  { sku: "NS-45", name: "LED TV / MONITOR WALL MOUNT 26\"-65\"", brand: "General", model: "NS-45", category_id: 25, description: "LED TV / MONITOR WALL MOUNT 26\"-65\"", retail: 5375, wholesale: 4300 },

  // Page 6: TESTERS (Category ID: 26)
  { sku: "RJ45-RJ11-TESTER", name: "NETWORK Cable Tester RJ45 & RJ11", brand: "General", model: "RJ45 AND RJ11", category_id: 26, description: "NETWORK Cable Tester RJ45 & RJ11", retail: 2100, wholesale: 1680 }
];

async function main() {
  // Get active branches to seed stock levels of 0
  const branchesRes = await pool.query('SELECT id FROM branches WHERE is_active = 1');
  const branches = branchesRes.rows;
  console.log(`Active branches found: ${branches.map(b => b.id).join(', ')}`);

  let count = 0;
  for (const p of products) {
    const cost = Math.round(p.wholesale * 0.8); // 80% of wholesale price as cost estimate
    
    try {
      // Insert product
      const res = await pool.query(
        `INSERT INTO products (name, brand, model, sku, category_id, description, image_path, warranty_months, vat_applicable, retail_price, wholesale_price, cost_price, is_active, is_quick_add) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 12, 0, $8, $9, $10, 1, 0) 
         ON CONFLICT (sku) DO UPDATE 
         SET name = EXCLUDED.name, brand = EXCLUDED.brand, model = EXCLUDED.model, 
             category_id = EXCLUDED.category_id, description = EXCLUDED.description, 
             retail_price = EXCLUDED.retail_price, wholesale_price = EXCLUDED.wholesale_price, 
             cost_price = EXCLUDED.cost_price, updated_at = NOW() 
         RETURNING id`,
        [p.name, p.brand, p.model, p.sku, p.category_id, p.description, null, p.retail, p.wholesale, cost]
      );
      
      const pid = res.rows[0].id;
      
      // Initialize stocks to 0
      for (const b of branches) {
        await pool.query(
          `INSERT INTO product_stock (product_id, branch_id, quantity) 
           VALUES ($1, $2, 0) 
           ON CONFLICT (product_id, branch_id) DO NOTHING`,
          [pid, b.id]
        );
      }
      
      count++;
    } catch (err) {
      console.error(`Error inserting SKU ${p.sku}:`, err.message);
    }
  }

  console.log(`Successfully seeded ${count} products.`);
  await pool.end();
}

main().catch(console.error);
