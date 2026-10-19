const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const products = [
  // Document 1 - Page 1
  {
    name: "POE Ranger mini 3MP",
    model: "IPC-PS2MP-3R1",
    cat_id: 1, // IP Cameras
    desc: "PS2M 3MP H.265 PoE Pan&Tilt Camera. H.265 3MP/2K Integrated-Bracket PoE/5V DC Human & Vehicle Detection Smart Tracking Smart Color Night Vision Two-way Talk AOR Mode Diversified Storage",
    vasp: 7830
  },
  {
    name: "POE Ranger mini 5MP",
    model: "IPC-PS2M-5R1",
    cat_id: 1,
    desc: "PS2M 5MP H.265 PoE Pan&Tilt Camera. H.265 5MP/3K Integrated-Bracket PoE/5V DC Human & Vehicle Detection Smart Tracking Smart Color Night Vision Two-way Talk AOR Mode Diversified Storage",
    vasp: 10260
  },
  {
    name: "POE Bullet 1 way talk POE 3MP",
    model: "IPC-PS3D-3M0",
    cat_id: 1,
    desc: "PS3D 3MP H.265 Outdoor PoE Camera. H.265 3MP/2K Human & Vehicle Detection PoE/12V DC Red-Blue Warning Lights Smart Color Night Vision Build-in Microphone AOR Mode IP67 Diversified Storage",
    vasp: 9666
  },
  {
    name: "POE Bullet 1 way talk POE 5MP",
    model: "IPC-PS3D-5M0",
    cat_id: 1,
    desc: "PS3D 5MP H.265 Outdoor PoE Camera. H.265 5MP/3K Human & Vehicle Detection PoE/12V DC Red-Blue Warning Lights Smart Color Night Vision Build-in Microphone AOR Mode IP67 Diversified Storage",
    vasp: 12960
  },
  {
    name: "POE Bullet 2way talk POE 3MP",
    model: "IPC-PS3EP-3M0",
    cat_id: 1,
    desc: "PS3E 3MP H.265 PoE Bullet Camera. H.265 3MP/2K Human Detection Vehicle Detection PoE/12V DC Smart Color Night Vision Two-way Talk AOR Mode IP67 Diversified Storage",
    vasp: 11340
  },
  {
    name: "POE Bullet 2way talk POE 5MP",
    model: "IPC-PS3EP-5M0",
    cat_id: 1,
    desc: "PS3E 5MP H.265 PoE Bullet Camera. H.265 5MP/3K Human Detection Vehicle Detection PoE/12V DC Smart Color Night Vision Two-way Talk AOR Mode IP67 Diversified Storage",
    vasp: 13716
  },
  {
    name: "POE Bullet 2way talk POE 8MP",
    model: "IPC-PS3EP-8Q0",
    cat_id: 1,
    desc: "PS3E 8MP H.265 Outdoor PoE Camera. 8MP Video/4K Human & Vehicle Detection PoE/12V DC Red-Blue Warning Lights Smart Color Night Vision Two-way Talk AOR Mode IP67 Diversified Storage",
    vasp: 17280
  },
  {
    name: "POE Dome 1 way talk 3MP",
    model: "IPC-PS8DP-3V0",
    cat_id: 1,
    desc: "PS8D 3MP H.265 PoE Turret Camera. H.265 3MP/2K Human & Vehicle Detection PoE/12V DC Red-Blue Warning Lights Smart Color Night Vision Built-in Microphone AOR Mode IP67 Diversified Storage",
    vasp: 9720
  },
  {
    name: "POE Dome 1 way talk 5MP",
    model: "IPC-PS8D-5V0",
    cat_id: 1,
    desc: "PS8D 5MP H.265 PoE Turret Camera. H.265 5MP/3K Human & Vehicle Detection PoE/12V DC Red-Blue Warning Lights Smart Color Night Vision Built-in Microphone AOR Mode IP67 Diversified Storage",
    vasp: 12906
  },
  {
    name: "POE Dome 2 way talk 3MP",
    model: "IPC-PS8EP-3V0",
    cat_id: 1,
    desc: "PS8E 3MP H.265 PoE Turret Camera. H.265 3MP/2K Human & Vehicle Detection PoE/12V DC Red-Blue Warning Lights Smart Color Night Vision Two-way Talk AOR Mode IP67 Diversified Storage",
    vasp: 11340
  },
  {
    name: "POE Dome 2 way talk 5MP",
    model: "IPC-PS8E-5V0",
    cat_id: 1,
    desc: "PS8E 5MP H.265 PoE Turret Camera. H.265 5MP/3K Human & Vehicle Detection PoE/12V DC Red-Blue Warning Lights Smart Color Night Vision Two-way Talk AOR Mode IP67 Diversified Storage",
    vasp: 13716
  },
  {
    name: "POE Cruiser SC POE 3MP",
    model: "IPC-PS7FP-3M0",
    cat_id: 1,
    desc: "PS7F 3MP H.265 POE P&T Camera. 3MP H.265 Video Red-Blue Warning Lights AOR Mode AI Human & Vehicle Detection Two-way Talk Smart Color Night Vision Smart Tracking Alarm Notification PoE/12V DC Active Deterrence Weatherproof Diversified Storage",
    vasp: 13500
  },
  {
    name: "POE Cruiser SC POE 5MP",
    model: "IPC-PS7FP-5M0",
    cat_id: 1,
    desc: "PS7F 5MP H.265 POE P&T Camera. 5MP H.265 Video Human & Vehicle Detection PoE/12V DC Red-Blue Warning Lights Smart Color Night Vision Two-way Talk AOR Mode IP67 Alarm Notification Diversified Storage Active Deterrence",
    vasp: 16092
  },

  // Document 1 - Page 2
  {
    name: "POE Cruiser Dual POE 6MP",
    model: "IPC-PS70FP-6M0",
    cat_id: 1,
    desc: "PS70F 6MP Dual Lens Outdoor P&T Camera. Two Lens Resolution Total 6MP Red-Blue Warning Lights AI Human & Vehicle Detection Active Deterrence Smart Color Night Vision Two-way Talk Smart Tracking Weatherproof PoE/12V DC",
    vasp: 19224
  },
  {
    name: "POE Cruiser Dual POE 10MP",
    model: "IPC-PS70FP-10M1",
    cat_id: 1,
    desc: "PS70F 10MP Dual Lens Outdoor P&T Camera. Two Lens Resolution Total 10MP Red-Blue Warning Lights AIgo Play Active Deterrence Smart Color Night Vision Two-way Talk Smart Tracking Weatherproof PoE/12V DC",
    vasp: 23544
  },
  {
    name: "POE PU7L 6MP PT H.265 POE P&T Camera",
    model: "IPC-U7LP-6T0N",
    cat_id: 1,
    desc: "6MP H.265 Video Aurora Full-Color Night Vision Red-Blue Warning Lights AI Human & Vehicle Detection Smart Tracking Crossing Line Detection Auto Cruise Two-way Talk Weatherproof PoE/12V DC AOR Mode Diversified Storage",
    vasp: 24645.6
  },
  {
    name: "IP NVR 10 Channel NVR",
    model: "NVR-N110-8A0E-P",
    cat_id: 3, // DVR / NVR
    desc: "N110 H.265 10-Channel NVR. 10-Channels Access Automatic Pairing Built-in Mic and Speaker IMOU APP H.265 up to 4K UHD HDMI/VGA Output Mass Storage Third Party Agreement 4-Channel Playback",
    vasp: 18252
  },
  {
    name: "IP NVR 18 Channel NVR",
    model: "NVR-N118-8A0E-P",
    cat_id: 3,
    desc: "N118 H.265 18-Channel NVR. 18-Channels Access Automatic Pairing Built-in Mic and Speaker IMOU APP H.265 up to 4K UHD HDMI/VGA Output Mass Storage Third Party Agreement 4-Channel Playback",
    vasp: 21492
  },
  {
    name: "IP NVR 36 Channel NVR",
    model: "NVR-N236-8A0E-P",
    cat_id: 3,
    desc: "N236 H.265 36CH 1U 2HDDs NVR. 36 Channel Access Automatic Pairing Built in Mic and Speaker IMOU APP H.265 up to 4K UHD HDMI/VGA Output Dual Bay Massive Storage Third Party Agreement 4 Channel Playback",
    vasp: 38350
  },
  {
    name: "POE NVR 4 Port POE 10 Channel NVR",
    model: "NVR-N110-4P-8A0E-P",
    cat_id: 3,
    desc: "N110 4P H.265 10 CH 4 PoE NVR. 4 POE ports 10 Ch Access Automatic Pairing Built in Mic and Speaker IMOU APP H.265 up to 4K UHD HDMI/VGA Output Mass Storage Third Party Agreement 4 Channel Playback",
    vasp: 26250
  },
  {
    name: "POE NVR 8 Port POE 18 Channel NVR",
    model: "NVR-N118-8P-8A0E-P",
    cat_id: 3,
    desc: "N118 8P H.265 18CH 8PoE NVR. 8 POE ports 18 Ch Access Automatic Pairing Built in Mic and Speaker IMOU APP H.265 up to 4K UHD HDMI/VGA Output Mass Storage Third Party Agreement 4 Channel Playback",
    vasp: 34125
  },
  {
    name: "POE NVR 16 Port POE 36 Channel NVR",
    model: "NVR-N236-16P-8A0E-P",
    cat_id: 3,
    desc: "N236 16P H.265 36CH 1U 16PoE 2HDDs NVR. 16 POE ports 36 Ch Access Automatic Pairing Built in Mic and Speaker IMOU APP H.265 up to 4K UHD HDMI/VGA Output Dual Bay Massive Storage Third Party Agreement 4 Channel Playback",
    vasp: 54600
  },

  // Document 2 - Page 1
  {
    name: "Cue 2E 3MP",
    model: "IPC-C32SP",
    cat_id: 1,
    desc: "1/3\" 3Megapixel Progressive CMOS 3MP(2304 x 1296) Night Vision: 10m (33ft) Distance 2.8mm Fixed Lens Micro SD Card Slot (up to 512GB) Built-in Mic & Speaker Reset Button",
    vasp: 6490
  },
  {
    name: "Ranger 2 3MP WIFI PT IR CAMERA",
    model: "IPC-K2ECP-3H3W",
    cat_id: 1,
    desc: "1/2.8\" Progressive CMOS 3MP (2304 x 1296) Night Vision: 10m(33ft) Distance 3.6mm Fixed Lens Field of View : 83°(H), 46°(V), 100°(D) 355°Pan & -5~80°Tilt Wi-Fi:IEEE802.11b/g/n/ax,WiFi 6,50m Open Field Imou App: iOS, Android ONVIF Micro SD Card Slot (up to 512GB) Built-in Mic & Speaker Reset Button",
    vasp: 6510
  },
  {
    name: "Ranger 2 Pro 3MP Wi-Fi PT Camera",
    model: "IPC-S2EP-3R1S",
    cat_id: 1,
    desc: "2.4G Wi-Fi & Bluetooth Connection, All-in-one IR Remote Control, Support 13 categories and more than 8000 equipment models, Control infrared devices through Imou life APP, Control infrared equipment through third-party audio, Schedule&Timer, Family Sharing, DIY Self Learning, 38 kHz IR Frequency, 2.4G Wi-Fi Enabled, DC 5V 1A Micro USB Input",
    vasp: 7728
  },
  {
    name: "Ranger 2 Pro 5MP Wi-Fi PT Camera",
    model: "IPC-S2EP-5R1S",
    cat_id: 1,
    desc: "1/2.8\" CMOS sensor, H.265 5MP 3K, 3.6mm Lens, Up to 10 Mtr. IR range, Built-in Mic. and speaker for Two-way audio, ONVIF, Micro SD card slot support upto 512 GB, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Configurable Region, Abnormal Sound Alarm, Built-in Siren, Ethernet Port, Reset Button",
    vasp: 9949.80
  },
  {
    name: "Bulb Cam 2C 3MP Wi-Fi PT Bulb Camera",
    model: "IPC-K6C-3H1WEB",
    cat_id: 1,
    desc: "1/3.2\" CMOS sensor, H.265 3MP 2K, 3.6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 10 Meter, White Light range, Built-in Mic. and speaker for Two-way audio, ONVIF, Micro SD card slot support upto 512 GB, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Configurable Region, Abnormal Sound Alarm, Built-in Siren & spotlight, Favorite point setting, Reset Button, Auto cruise, supports Wi-Fi 6 Connection",
    vasp: 7155.75
  },
  {
    name: "Bulb Cam 2C 5MP Wi-Fi PT Bulb Camera",
    model: "IPC-K6C-5H1WEB",
    cat_id: 1,
    desc: "1/3\" CMOS sensor, H.265 5MP 3K, 3.6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 10 Meter, White Light range, Built-in Mic. and speaker for Two-way audio, ONVIF, Micro SD card slot support upto 512 GB, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Configurable Region, Abnormal Sound Alarm, Built-in Siren & spotlight, Favorite point setting, Reset Button, Auto cruise, supports Wi-Fi 6 Connection",
    vasp: 8176.35
  },
  {
    name: "Bulb Cam Bulb & Camera 2 in 1 3MP",
    model: "IPC-S6DP-3M0WEB",
    cat_id: 1,
    desc: "3 Megapixel Progressive CMOS 3MP (2304 x 1296) Night Vision: 25 m (82 ft) 2.8mm Fixed Lens Field of View: H: 98°D: 121°V:54° 0~340°Pan & 0~90°Tilt Wi-Fi: IEEE802.11 b/g/n/ax 2.4GHz Imou App: iOS, Android ONVIF Video Compression : H.265/H.264 Up to 15 fps Frame Rate 8x Digital Zoom Built-in Mic & Speaker, Siren Two-way Audio Micro SD Card Slot (up to 512GB) Reset Button Bulb Consumption: 5.2W 350 Lumen Brightness",
    vasp: 11893.35
  },
  {
    name: "Ranger Mini 3MP Indoor Camera",
    model: "IPC-K2MP-3R1W",
    cat_id: 1,
    desc: "1/3\" CMOS sensor, H.265 3MP 2K, 3.6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 10 Meter Built-in Mic. and speaker for Two-way audio, ONVIF, Micro SD card slot support upto 512 GB, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Configurable Region, Abnormal Sound Alarm, Built-in Siren, Reset Button, Auto-cruise, Ethernet Port, USB-C Connection, supports Wi-Fi 6 Connection",
    vasp: 8190
  },
  {
    name: "Ranger Mini 5MP Indoor Camera",
    model: "IPC-K2MP-5R1W",
    cat_id: 1,
    desc: "1/3\" CMOS sensor, H.265 5MP 3K, 3.6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 10 Meter Built-in Mic. and speaker for Two-way audio, ONVIF, Micro SD card slot support upto 512 GB, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Configurable Region, Abnormal Sound Alarm, Built-in Siren, Reset Button, Auto-cruise, Ethernet Port, USB-C Connection, supports Wi-Fi 6 Connection",
    vasp: 10395
  },
  {
    name: "Ranger Dual (3 MP + 3 MP) Dual Lens PT Camera",
    model: "IPC-S20EP-6M0S",
    cat_id: 1,
    desc: "Both Lens Features (1/2.8\" CMOS sensor, H.265 3MP 2K, 3.6mm Lens, 15 Mtr. IR Distance), PT Lens supports four-mode night vision for clear-as day clarity even in pitch dark upto 15 Meter) Built-in Mic. and speaker for Two way audio, ONVIF, 2 Red-Blue Warning Lights on Pan & Tilt Lens, Favorite point setting, Privacy Mode, Active Deterrence with built-in spotlight and security siren, Micro SD card slot support upto 512 GB, supports IMOU AOR recording mode, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Pet Detection, Abnormal Sound Alarm, Reset Button, IP67 Weatherproof, supports Wi-Fi 6 Connection",
    vasp: 14580.30
  },
  {
    name: "Bullet 2E 3MP Bullet Wi-Fi Camera",
    model: "IPC-K3DP-3H0WF",
    cat_id: 1,
    desc: "1/2.8\" CMOS sensor, H.265 3MP 2K, 3.6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 30 Meter, Built-in Mic., ONVIF, Dual Antenna, Micro SD card slot support upto 512 GB, Alarm Notification, Motion Detection, Human Detection, Configurable Region, Configurable Voice, Reset Button, IP67 Weatherproof",
    vasp: 10819.20
  },
  {
    name: "Bullet 3 3MP Bullet Wi-Fi Camera",
    model: "IPC-S3EP-3M0WE",
    cat_id: 1,
    desc: "1/2.8\" 3 Megapixel Progressive CMOS 3 MP(2304*1296) Night Vision: 30m(98ft) Distance 2.8mm/3.6mm Fixed Lens Field of View: 2.8mm: 104°(H), 55°(V), 124°(D) 3.6mm: 88°(H), 44°(V), 105°(D) 1 x 100Mbps Ethernet Port Wi-Fi:IEEE802.11b/g/n/ax, Dual Antenna Imou App: iOS, Android ONVIF Video Compression : H.265/H.264 Up to 25/30 fps Frame Rate 8x Digital Zoom Built-in Mic & Speaker, 110dB Siren Built-in Spotlight",
    vasp: 12376.35
  },
  {
    name: "Cell 3C All In One 3K UHD Image Camera",
    model: "IPC-K9DC-5M0WEH-V2",
    cat_id: 1,
    desc: "1/3\" Progressive CMOS 5MP(2880*1620) Night Vision: 15m(49ft) Distance 2.8mm Fixed Lens, Max. Aperture F2.2 Field of View : 95°(H), 53°(V), 112°(D) 5000mAh Rechargeable Battery Video Compression : H.264&H.265 Up to 15fps Frame Rate 8x Digital Zoom Two-way Audio Wi-Fi:IEEE802.11b/g/n,120m Open Field Imou App: iOS, Android Built-in Mic & Speaker Power on / off Button Reset Button SD Card Slot Type-C",
    vasp: 23546.25
  },

  // Document 2 - Page 2
  {
    name: "Cruiser SC 3MP Outdoor PT Wi-Fi Camera",
    model: "IPC-K7FP-3V0W",
    cat_id: 1,
    desc: "1/2.8\" CMOS sensor, H.265 3MP 2K, 3.6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 30 Meter, Built-in Mic. and speaker for Two-way audio, ONVIF, 2 Red-Blue Warning Lights, Favorite point setting, Privacy Mode, Active Deterrence with built-in spotlight and 110dB security siren, Micro SD card slot support upto 512 GB, supports IMOU AOR recording mode, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Reset Button, IP67 Weatherproof, supports Wi-Fi 6 Connection, Bluetooth networking",
    vasp: 13125
  },
  {
    name: "Cruiser SC 5MP Outdoor PT Wi-Fi Camera",
    model: "IPC-K7FP-5H0WE",
    cat_id: 1,
    desc: "1/3.06\" CMOS sensor, H.265 5MP 3K, 3.6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 30 Meter, Built-in Mic. and speaker for Two-way audio, ONVIF, 2 Red-Blue Warning Lights, Favorite point setting, Privacy Mode, Active Deterrence with built-in spotlight and 110dB security siren, Micro SD card slot support upto 512 GB, supports IMOU AOR recording mode, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Reset Button, IP67 Weatherproof, supports Wi-Fi 6 Connection, Bluetooth networking",
    vasp: 16293.90
  },
  {
    name: "Cruiser Dual 2 (3MP+3MP) Dual Lens Outdoor PT Camera",
    model: "IPC-S7XEP-6M0WED",
    cat_id: 1,
    desc: "Both Lens Features 1/3\" CMOS sensor, H.265 3MP 2K, 3.6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 30 Meter), Built-in Mic. and speaker for Two-way audio, ONVIF, 2 Red-Blue Warning Lights on Pan & Tilt Lens, Favorite point setting, Privacy Mode, Active Deterrence with built-in spotlight and 110dB security siren, Micro SD card slot support upto 512 GB, supports IMOU AOR recording mode, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Reset Button, IP67 Weatherproof, supports Wi-Fi 6 Connection",
    vasp: 19530
  },
  {
    name: "Cruiser Dual 2 (5MP+5MP) Dual Lens Outdoor PT Camera",
    model: "IPC-S7XEP-10M0WED",
    cat_id: 1,
    desc: "Both Lens Features 1/3.06\" CMOS sensor, H.265 5MP 3K, 3.6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 30 Meter), Built-in Mic. and speaker for Two-way audio, ONVIF, 2 Red-Blue Warning Lights on Pan & Tilt Lens, Favorite point setting, Privacy Mode, Active Deterrence with built-in spotlight and 110dB security siren, Micro SD card slot support upto 512 GB, supports IMOU AOR recording mode, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Reset Button, IP67 Weatherproof, supports Wi-Fi 6 Connection",
    vasp: 23520
  },
  {
    name: "Cruiser Triple (3MP+3MP+5MP) Triple Lens Outdoor PT Camera",
    model: "IPC-S7UP-11M0WED",
    cat_id: 1,
    desc: "2 Lens Features 1/2.8\" CMOS sensor, H.265 3MP 2K, 3.6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 30 Meter), PT Lens Features 1/3.06\" CMOS sensor, H.265 5MP 3K, 6mm Lens, Support four-mode night vision for clear-as day clarity even in pitch dark upto 30 Meter), Built-in Mic. and speaker for Two-way audio, ONVIF, 2 Red-Blue Warning Lights on Pan & Tilt Lens, Favorite point setting, Privacy Mode, Active Deterrence with built-in spotlight and 110dB security siren, 2 Micro SD card slot support upto 512 GB each, supports IMOU AOR recording mode, Motion Detection, Human Detection, Vehicle Detection, Intrusion Detection (Human/Vehicle), Crossing Line Detection (Human/Vehicle), Enable Absence Detection, Continuously updating…, Reset Button, IP67 Weatherproof, supports Wi-Fi 6 Connection",
    vasp: 29190
  },
  {
    name: "Imou Cruiser Z 5MP WIFI 12X Hybrid Zoom Camera",
    model: "IPC-S7DP-5M0WEZ",
    cat_id: 1,
    desc: "1/3\" 5 Megapixel Progressive CMOS 5 MP Night Vision: > 56 m(184 ft) Distance 2.8 mm @ F1.6 + 12 mm @ F1.6 Field of View: 2.8 mm :95.3°(H), 52.1°(V), 113.7°(D) 12 mm :24.4°(H), 14°(V), 28.1°(D) 355°Pan & 90°Tilt 1 x 100Mbps Ethernet Port Wi-Fi:IEEE802.11b/g/n/ax, Dual Antenna Imou App: iOS, Android ONVIF 3K UHD Image | 12x Hybrid Zoom | Smart Full-color Night Vision | Remote Pan & Tilt | Powered by IMOU SENSE",
    vasp: 27300
  },
  {
    name: "Cruiser Pano Z 13MP Zoom Quadruple-Lens Outdoor P&T Camera",
    model: "IPC-S76DP-13M0N",
    cat_id: 1,
    desc: "Cruiser Pano Z have four lens(two 4MP Fixed lens and 5MP zoom lens), Two fixed lenses stitch images together for a panoramic view, while PT lenses deliver more details with 12x mixed zoom. PT Lens supports motorized angle adjustment from 0~355° pan & 0~90°tilt, enable smooth auto-tracking and detailed close-ups of moving subjects. Cruiser Pano Z ensures every corner of your home completely covered. It supports warning lights and sound alarm for a stronger deterrent. Cruiser Pano Z supports two SD card slots and AOR mode, which saves a lot of storage space.",
    vasp: 40845
  },
  {
    name: "Titan Pro 6MP WIFI POE Aurora Colour Night Vision Camera",
    model: "IPC-U7LP-6V0NE",
    cat_id: 1,
    desc: "1/1.8\" 6Megapixel Progressive CMOS 6MP (3200*1800 ) Night Vision: 30m(98ft) Distance 3.6mm Fixed Lens F1.0 Field of View: 89°(H), 47°(V),107°(D) 0~340°Pan & 0~90°Tilt Wi-Fi: 2.4GHz&5GHz Dual-band Wi-Fi 6 Imou App: iOS, Android ONVIF Video Compression : H.265/H.264 20 fps Frame Rate 8x Digital Zoom Built-in Mic & Speaker, 125dB Siren Two-way Audio Full Detail. Real Color. Even at Night. Aurora Color Night Vision | 3K+ Resolution | Supports 2.4&5GHz Wi-Fi 6 | AIgo Play | AOR Mode",
    vasp: 24360
  },
  {
    name: "Cruiser SC 4G 3MP Outdoor PT Camera",
    model: "IPC-K7FP-3V0T-EU",
    cat_id: 1,
    desc: "1/2.9\" CMOS sensor, H.265 3MP 1080P, 3.6mm Lens, 4G LTE connection, Support four-mode night vision for clear-as day clarity even in pitch dark upto 30 Meter, Built-in Mic. and speaker for Two-way audio, ONVIF, Favorite point setting,, Active Deterrence with built-in spotlight and 110dB security siren, Micro SD card slot support upto 256 GB, Smart Tracking, Privacy Mode, Alarm Notification, Motion Detection, Human Detection, Reset Button, IP66 Weatherproof",
    vasp: 15120
  },
  {
    name: "Cruiser SC 4G 5MP Outdoor PT Camera",
    model: "IPC-K7FP-5V0T-EU",
    cat_id: 1,
    desc: "1/3\" 5 Megapixel Progressive CMOS 5 MP(2880*1620) Night Vision: 30m(98ft) Distanc 3.6 mm Fixed Lens Field of View:73°(H), 40°(V), 89°(D) 355°Pan & 0~90°Tilt 4 fill-in lights (each fill-in light supports emitting infrared and white light) 2 Red-Blue Warning Lights 1 x 100Mbps Ethernet Port Video Compression : H.265/H.264 Up to 20 fps Frame Rate 8x Digital Zoom Built-in Mic & Speaker, 110dB Siren Built-in Spotlight",
    vasp: 18847.50
  },
  {
    name: "Cruiser Dual 4G 6MP Dual Lens Outdoor PT Camera",
    model: "IPC-S7XCP-6M1TED-EU",
    cat_id: 1,
    desc: "1/2.8 CMOS sensor, H.265/H.264 3MP +3MP ,3.6mm Fixed Len, 4G LTE connection, Red-Blue Warning Lights,Support four-mode night vision for clear-as day clarity even in pitch dark upto 30 Meter, Built-in Mic. and speaker for Two-way audio, ONVIF, Favorite point setting,, Active Deterrence with built-in spotlight and 110dB security siren, Micro SD card slot support upto 512 GB, Auto Cruise, AI Human & Vehicle Detection, Two way Talk, Smart Tracking, Privacy Mode, Alarm Notification.",
    vasp: 23625
  },

  // Document 2 - Page 3
  {
    name: "AOV PT 5MP 4G & Wi-Fi With Solar Panel",
    model: "IPC-B7ED-5M0TEAEU/FSP14",
    cat_id: 1,
    desc: "1/2.8\" CMOS sensor, H.265 5MP 3K, 3.6mm Lens, 4G LTE connection, 10000 mAh Rechargeable Battery, 3 Watt Solor Panel included, Support four-mode night vision for clear-as day clarity even in pitch dark upto 20 Meter, Built-in Mic. and speaker for Two-way audio, ONVIF, Siren & Spotlight, PIR+Human Detection, Micro SD card slot support upto 256 GB, Smart Tracking, Alarm Notification, Motion Detection, Human Detection, Configurable Region, Performance mode, Reset Button, USB-C Connection, IP66 Weatherproof",
    vasp: 28276.50
  },
  {
    name: "AOV Dual 5MP+5MP Solar Battery 4G Camera",
    model: "IPC-SA70F-10M0T2-EU/FSP008",
    cat_id: 1,
    desc: "1/3\" CMOS sensor,H.265, H264 5MP+5MP,3.6mm Fixed Lens+ 3.6mm PT Lens,4G LTE +wifi Dual Connectivity Options ,10000mAh Rechargeable Battery with Solar Panel,smart full color night vision, Always on vedio mode 24/7 recording,Human &Vehicle Detection,Low Temperature Charging,Two way Talk,Siren & Spotlight Alarm, Security Storage upto 512GB ,Weather Proof",
    vasp: 41737.50
  },
  {
    name: "64 GB Micro SD Card",
    model: "ST2-64-S1",
    cat_id: 13, // Storage & Drives
    desc: "Micro SD Card, Specially designed for Security Cameras",
    vasp: 4150
  },
  {
    name: "128 GB Micro SD Card",
    model: "ST2-128-S1",
    cat_id: 13,
    desc: "Micro SD Card, Specially designed for Security Cameras",
    vasp: 6772.50
  },
  {
    name: "256 GB Micro SD Card",
    model: "ST2-256-S1",
    cat_id: 13,
    desc: "Micro SD Card, Specially designed for Security Cameras",
    vasp: 9450
  },
  {
    name: "10 Channel Wireless NVR",
    model: "NVR-N110W-8A0E-P",
    cat_id: 3,
    desc: "10 Channel IP Input, Automatic Pairing,Built-in Mic and Speaker,IMOU APP,HDMI/VGA Output,Mass Storage upto 16T,4-Channel Playback,Supports 2/4/8/16x playback and intelligent retrieval,H.265 up to 4K UHD,Third Party AgreementSupports Onvif, Compatible with more devices.( 2 x USB Ports, 1 x SATA Port supports upto 16 TB HDD, 1 x Network Port, 1 x RCA In, 1 x RCA Out, 1 x HDMI Port, 1 x VGA Port, 1 x Power Port)",
    vasp: 15172.50
  },
  {
    name: "18 Channel Wireless NVR",
    model: "NVR-N118W-8A0E-P",
    cat_id: 3,
    desc: "8 Channel IP Input, Wired Max. Input: 40 Mbps, Wireless Max. Input: 16 Mbps, Automatic Pairing, Video Out: 1 HDMI/1 VGA, Dual-antenna, 2x2 MIMO, 2 x USB Ports, 1 x SATA Port supports upto 8 TB HDD, 1 x Network Port, 1 x RCA In, 1 x RCA Out, 1 x HDMI Port, 1 x VGA Port, 1 x Power Port, H.265+ Compression, Recoder Mode: Manual/Alarm/Motion detection/Schedule",
    vasp: 20475
  },
  {
    name: "CL1B-5-E27 Smart Light Bulb",
    model: "CL1B-5-E27",
    cat_id: 8, // Other
    desc: "Voice Control | Multicolor | Dimmable | Remote Control Blub Technology: LED Rated Lumens: 806lm Lemen Maintenance: 93.1% Beam Angle: 220° Correlated Color Temperature: 2700-6500K + 16 million colors Color Rendering Index: >80 Functioning Pattern: 2.4G Wi-Fi /BLE Communication Distance: 70m Imou App: iOS, Android",
    vasp: 1816.50
  },
  {
    name: "K1-G-W-EN Smart Lock",
    model: "K1-G-W-EN",
    cat_id: 11, // Access Control
    desc: "Smarter Access. Stronger Protection. Better Control. Multiple Unlock Methods | Smart connection | Extended Battery Life | Auto Locks | Aluminum Alloy Reinforced Body - 2 Year Warrernty",
    vasp: 37695
  },
  {
    name: "HR12F-B Dual-band Smart Router",
    model: "HR12F-B",
    cat_id: 4, // Cables & Accessories
    desc: "Dual-band smart router. 1200Mbps Wi-Fi | IMOU Wi-Fi Auto Sync | Support IPTV -2 year warrernty",
    vasp: 7665
  },
  {
    name: "HR340 300Mbps 4 Antennas Wireless Router",
    model: "HR340",
    cat_id: 4,
    desc: "300Mbps 4 antennas wireless router. 300Mbps Wi-Fi | 4 External Antennas | IMOU Camera Auto Sync | Stream Accelerate -2 Year warrernty",
    vasp: 4725
  },

  // Document 2 - Page 4
  {
    name: "VDP7 POE 5MP Smart Home Video Doorphone",
    model: "VO1-5M0R/VH1-7A0A",
    cat_id: 11,
    desc: "IMOU Smart Video Intercom Kit integrates cutting edge technology to deliver comprehensive protection and effortless convenience. The outdoor station features advanced human/vehicle detection, accurately identifying key details to keep your home secure. With four unlocking methods (card, PIN code, indoor unit one tap unlock, and remote app control), it can simultaneously control both your garage and main gate for unified smart entry. Stable PoE (Power over Ethernet) connection delivers simultaneous power and data transmission through a single cable, along with crystal clear two way audio, simplifying installation while enhancing reliability. The indoor unit boasts a 7 inch HD touchscreen for intuitive operation. Whether you're at home or away, the dedicated app enables remote two way talk, live viewing, and lock control, putting home security at your fingertips.",
    vasp: 56700
  },
  {
    name: "VDP7 5MP Smart Home Video Doorphone",
    model: "VO1-5M0A/VH1-7A0S",
    cat_id: 11,
    desc: "IMOU Smart Video Intercom Kit integrates cutting-edge technology to deliver comprehensive protection and effortless convenience.The outdoor station features advanced human/vehicle detection, accurately identifying key details to keep your home secure. Withfour unlocking methods (card, passcode, indoor unit one-tap unlock, and remote app control), it can simultaneously control both your garage and main gate for unified smart entry.2 wire connection based on PLC technology , the system ensures stable connectivity over 200 meters between the outdoor and indoor units, along with crystal-clear two-way audio, simplifying installation while enhancing reliability. The indoor unit boasts a 7-inch HD touchscreen for intuitive operation, while dual-band Wi-Fi guarantees fast and stable connectivity. Whether you're at home or away, the dedicated app enables remote two-way talk, live viewing, and lock control, putting home security at your fingertips",
    vasp: 51450
  },
  {
    name: "Imou Protect Basic Annually Plan",
    model: "IMOU-PROTECT-BASIC",
    cat_id: 8,
    desc: "1. 7 days Cloud Storage 2. Devices Health Guard 3. Security Report 4. Download SD Card Recordings Remotely 5. Share Devices to 10 User",
    vasp: 9750
  },
  {
    name: "Imou Protect Plus Annually Plan",
    model: "IMOU-PROTECT-PLUS",
    cat_id: 8,
    desc: "1. 30 days Cloud Storage 2. Devices Health Guard 3. Security Report 4. Download SD Card Recordings Remotely 5. Share Devices to 10 Users 6. Enhanced AI Detection (Except Vietnam and the Russian-speaking area)",
    vasp: 18900
  }
];

const dbFiles = ['enqova.db', 'energy_cctv.db'];

dbFiles.forEach(dbFile => {
  const dbPath = path.join(__dirname, '..', 'data', dbFile);
  if (fs.existsSync(dbPath)) {
    console.log(`Inserting into ${dbFile}...`);
    const db = new DatabaseSync(dbPath);

    // Get branches
    const branches = db.prepare('SELECT id FROM branches WHERE is_active = 1').all();

    const insertStmt = db.prepare(`
      INSERT INTO products (
        name, brand, model, sku, category_id, description, image_path,
        warranty_months, vat_applicable, retail_price, wholesale_price, cost_price, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const stockInsertStmt = db.prepare(`
      INSERT OR IGNORE INTO product_stock (product_id, branch_id, quantity) VALUES (?, ?, 0)
    `);

    let count = 0;
    for (const p of products) {
      const brand = 'Imou';
      const warranty_months = 36; // 3 years
      const cost_price = Math.round(p.vasp * 100) / 100;
      // Retail Price (Rs.) = VASP price + 10%
      const retail_price = Math.round((cost_price * 1.10) * 100) / 100;
      // Wholesale Price (Rs.) = Retail Price - 3%
      const wholesale_price = Math.round((retail_price * 0.97) * 100) / 100;

      const res = insertStmt.run(
        p.name,
        brand,
        p.model,
        p.model, // SKU
        p.cat_id,
        p.desc,
        null,
        warranty_months,
        0, // VAT
        retail_price,
        wholesale_price,
        cost_price
      );

      const pid = Number(res.lastInsertRowid);
      for (const b of branches) {
        stockInsertStmt.run(pid, b.id);
      }
      count++;
    }
    console.log(`Successfully inserted ${count} products into ${dbFile}.`);
  }
});
