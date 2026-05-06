export interface LedStripType {
  id: string;
  name: string;
  category: string;
  voltage: string;
  colorOrder: string;
  ledsPerPixel: number;  // physical LEDs per WLED addressable pixel
  dataPins: 1 | 2;       // 1 = single data wire, 2 = clock + data
  notes?: string;
}

export const LED_STRIP_CATEGORIES = [
  '1-wire · RGB',
  '1-wire · RGB · 3 LEDs/pixel',
  '1-wire · RGBW',
  '1-wire · RGBW · 3 LEDs/pixel',
  '1-wire · RGBW · 6 LEDs/pixel',
  '1-wire · RGBCCT · 3 LEDs/pixel',
  '1-wire · RGBCCT · 6 LEDs/pixel',
  '2-wire · CLK+DATA',
] as const;

export type LedStripCategory = typeof LED_STRIP_CATEGORIES[number];

export const LED_STRIP_TYPES: LedStripType[] = [
  // ── 1-wire · RGB · 1 LED/pixel ─────────────────────────────────────────────
  { id: 'WS2812B',    name: 'WS2812B',        category: '1-wire · RGB',                    voltage: '5V',       colorOrder: 'GRB',    ledsPerPixel: 1, dataPins: 1 },
  { id: 'WS2812B-V5', name: 'WS2812B-V5',     category: '1-wire · RGB',                    voltage: '5V',       colorOrder: 'GRB',    ledsPerPixel: 1, dataPins: 1, notes: 'Variant with reversed RGB order' },
  { id: 'WS2813',     name: 'WS2813',          category: '1-wire · RGB',                    voltage: '5V',       colorOrder: 'GRB',    ledsPerPixel: 1, dataPins: 1, notes: 'Backup data line' },
  { id: 'WS2815',     name: 'WS2815',          category: '1-wire · RGB',                    voltage: '12V',      colorOrder: 'GRB',    ledsPerPixel: 1, dataPins: 1, notes: 'Backup data line' },
  { id: 'GS8208',     name: 'GS8208',          category: '1-wire · RGB',                    voltage: '12V',      colorOrder: 'GRB',    ledsPerPixel: 1, dataPins: 1 },
  { id: 'UCS8903',    name: 'UCS8903',         category: '1-wire · RGB',                    voltage: '5V',       colorOrder: 'RGB',    ledsPerPixel: 1, dataPins: 1 },
  { id: 'TM1829',     name: 'TM1829',          category: '1-wire · RGB',                    voltage: '5V–24V',   colorOrder: 'RGB',    ledsPerPixel: 1, dataPins: 1 },
  { id: 'WS2811-5V',  name: 'WS2811 (5V)',     category: '1-wire · RGB',                    voltage: '5V',       colorOrder: 'RGB',    ledsPerPixel: 1, dataPins: 1, notes: 'Integrated IC+LED; 1 pixel = 1 physical LED' },

  // ── 1-wire · RGB · 3 LEDs/pixel ────────────────────────────────────────────
  // One driver IC controls 3 separate LEDs in a pixel string
  { id: 'WS2811',     name: 'WS2811 (12V)',    category: '1-wire · RGB · 3 LEDs/pixel',     voltage: '12V',      colorOrder: 'RGB',    ledsPerPixel: 3, dataPins: 1, notes: '1 driver IC controls 3 physical LEDs; common in IP68 pixel strings' },

  // ── 1-wire · RGBW · 1 LED/pixel ────────────────────────────────────────────
  { id: 'SK6812',     name: 'SK6812',          category: '1-wire · RGBW',                   voltage: '5V/12V',   colorOrder: 'GRBW',   ledsPerPixel: 1, dataPins: 1 },
  { id: 'TM1814',     name: 'TM1814',          category: '1-wire · RGBW',                   voltage: '12V',      colorOrder: 'RGBW',   ledsPerPixel: 1, dataPins: 1 },
  { id: 'UCS8904',    name: 'UCS8904',         category: '1-wire · RGBW',                   voltage: '5V–24V',   colorOrder: 'RGBW',   ledsPerPixel: 1, dataPins: 1 },

  // ── 1-wire · RGBW · 3 LEDs/pixel ───────────────────────────────────────────
  // WS2814: one RGBW driver IC per 3 physical LED chips (R+G+B+W per group); controlled as SK6812
  { id: 'WS2814',     name: 'WS2814 (12V)',    category: '1-wire · RGBW · 3 LEDs/pixel',    voltage: '12V',      colorOrder: 'GRBW',   ledsPerPixel: 3, dataPins: 1, notes: 'Controlled as SK6812; 3 physical LEDs per pixel' },

  // ── 1-wire · RGBW · 6 LEDs/pixel ───────────────────────────────────────────
  { id: 'WS2814-24V', name: 'WS2814 (24V)',    category: '1-wire · RGBW · 6 LEDs/pixel',    voltage: '24V',      colorOrder: 'GRBW',   ledsPerPixel: 6, dataPins: 1, notes: 'Controlled as SK6812; 6 physical LEDs per pixel (3-series pairs)' },

  // ── 1-wire · RGBCCT · 3 LEDs/pixel ────────────────────────────────────────
  // WS2805: each pixel contains 1 RGB chip + 1 cool white + 1 warm white = 3 LED chips
  { id: 'WS2805',     name: 'WS2805 (12V)',    category: '1-wire · RGBCCT · 3 LEDs/pixel',  voltage: '12V',      colorOrder: 'RGBCCT', ledsPerPixel: 3, dataPins: 1, notes: 'Dual white (CW+WW) for CCT; backup data line; 3 LED chips per pixel' },

  // ── 1-wire · RGBCCT · 6 LEDs/pixel ────────────────────────────────────────
  { id: 'WS2805-24V', name: 'WS2805 (24V)',    category: '1-wire · RGBCCT · 6 LEDs/pixel',  voltage: '24V',      colorOrder: 'RGBCCT', ledsPerPixel: 6, dataPins: 1, notes: 'Dual white (CW+WW) for CCT; backup data line; 6 LED chips per pixel' },
  { id: 'FW1906',     name: 'FW1906',          category: '1-wire · RGBCCT · 6 LEDs/pixel',  voltage: '24V',      colorOrder: 'RGBCCT', ledsPerPixel: 6, dataPins: 1, notes: 'Dual white (CW+WW) for CCT; 6 LED chips per pixel' },

  // ── 2-wire · CLK+DATA ──────────────────────────────────────────────────────
  { id: 'WS2801',     name: 'WS2801',          category: '2-wire · CLK+DATA',               voltage: '5V',       colorOrder: 'RGB',    ledsPerPixel: 1, dataPins: 2 },
  { id: 'APA102',     name: 'APA102',          category: '2-wire · CLK+DATA',               voltage: '5V',       colorOrder: 'BGR',    ledsPerPixel: 1, dataPins: 2 },
  { id: 'SK9822',     name: 'SK9822',          category: '2-wire · CLK+DATA',               voltage: '5V',       colorOrder: 'BGR',    ledsPerPixel: 1, dataPins: 2 },
  { id: 'LPD6803',    name: 'LPD6803',         category: '2-wire · CLK+DATA',               voltage: '12V',      colorOrder: 'RGB',    ledsPerPixel: 1, dataPins: 2 },
  { id: 'LPD8806',    name: 'LPD8806',         category: '2-wire · CLK+DATA',               voltage: '5V',       colorOrder: 'RGB',    ledsPerPixel: 1, dataPins: 2 },
  { id: 'P9813',      name: 'P9813',           category: '2-wire · CLK+DATA',               voltage: '5V–24V',   colorOrder: 'RGB',    ledsPerPixel: 1, dataPins: 2 },
];

export function getStripType(id?: string): LedStripType | undefined {
  return LED_STRIP_TYPES.find(s => s.id === (id ?? 'WS2812B'));
}
