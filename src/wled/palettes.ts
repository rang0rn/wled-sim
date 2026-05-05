import type { RGBTriple } from './types';

export const PALETTE_NAMES = [
  'Default', '* Random Cycle', '* Color 1', '* Colors 1&2', '* Color Gradient',
  '* Colors Only', 'Party', 'Cloud', 'Lava', 'Ocean', 'Forest', 'Rainbow',
  'Rainbow Bands', 'Sunset', 'Rivendell', 'Breeze', 'Red & Blue', 'Yellowout',
  'Analogous', 'Splash', 'Pastel', 'Sunset 2', 'Beech', 'Vintage', 'Departure',
  'Landscape', 'Beach', 'Sherbet', 'Hult', 'Hult 64', 'Drywet', 'Jul',
  'Grintage', 'Rewhi', 'Tertiary', 'Fire', 'Icefire', 'Cyane', 'Light Pink',
  'Autumn', 'Magenta', 'Magred', 'Yelmag', 'Yelblu', 'Orange & Teal', 'Tiamat',
  'April Night', 'Orangery', 'C9', 'Sakura', 'Aurora', 'Atlantica', 'C9 2',
  'C9 New', 'Temperature', 'Aurora 2', 'Retro Clown', 'Candy', 'Toxy Reaf',
  'Fairy Reaf', 'Semi Blue', 'Pink Candy', 'Red Reaf', 'Aqua Flash',
  'Yelblu Hot', 'Lite Light', 'Red Flash', 'Blink Red', 'Red Shift',
  'Red Tide', 'Candy2',
];

// Simple palette definitions as gradient stops
export type PaletteStop = { pos: number; color: RGBTriple };
export type Palette = PaletteStop[];

export const PALETTES: Record<number, Palette> = {
  0: [{ pos: 0, color: [255, 0, 0] }, { pos: 0.5, color: [0, 255, 0] }, { pos: 1, color: [0, 0, 255] }], // Default
  6: [{ pos: 0, color: [255, 0, 255] }, { pos: 0.25, color: [0, 0, 255] }, { pos: 0.5, color: [0, 255, 255] }, { pos: 0.75, color: [0, 255, 0] }, { pos: 1, color: [255, 165, 0] }], // Party
  7: [{ pos: 0, color: [0, 0, 32] }, { pos: 0.5, color: [128, 128, 255] }, { pos: 1, color: [255, 255, 255] }], // Cloud
  8: [{ pos: 0, color: [0, 0, 0] }, { pos: 0.3, color: [255, 0, 0] }, { pos: 0.7, color: [255, 165, 0] }, { pos: 1, color: [255, 255, 0] }], // Lava
  9: [{ pos: 0, color: [0, 0, 0] }, { pos: 0.3, color: [0, 0, 255] }, { pos: 0.6, color: [0, 255, 255] }, { pos: 1, color: [255, 255, 255] }], // Ocean
  10: [{ pos: 0, color: [0, 0, 0] }, { pos: 0.4, color: [0, 128, 0] }, { pos: 0.8, color: [0, 255, 0] }, { pos: 1, color: [200, 255, 200] }], // Forest
  11: [{ pos: 0, color: [255, 0, 0] }, { pos: 0.17, color: [255, 165, 0] }, { pos: 0.33, color: [255, 255, 0] }, { pos: 0.5, color: [0, 255, 0] }, { pos: 0.67, color: [0, 0, 255] }, { pos: 0.83, color: [75, 0, 130] }, { pos: 1, color: [238, 130, 238] }], // Rainbow
  35: [{ pos: 0, color: [0, 0, 0] }, { pos: 0.2, color: [255, 0, 0] }, { pos: 0.5, color: [255, 100, 0] }, { pos: 0.8, color: [255, 200, 0] }, { pos: 1, color: [255, 255, 200] }], // Fire
  36: [{ pos: 0, color: [0, 0, 0] }, { pos: 0.3, color: [0, 0, 150] }, { pos: 0.6, color: [0, 200, 200] }, { pos: 1, color: [255, 255, 255] }], // Icefire
};

export function samplePalette(palette: Palette, t: number): RGBTriple {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < palette.length; i++) {
    if (t <= palette[i].pos) {
      const prev = palette[i - 1];
      const curr = palette[i];
      const local = (t - prev.pos) / (curr.pos - prev.pos);
      return [
        Math.round(prev.color[0] + (curr.color[0] - prev.color[0]) * local),
        Math.round(prev.color[1] + (curr.color[1] - prev.color[1]) * local),
        Math.round(prev.color[2] + (curr.color[2] - prev.color[2]) * local),
      ];
    }
  }
  return palette[palette.length - 1].color;
}

export function getPalette(id: number): Palette {
  return PALETTES[id] ?? PALETTES[0];
}
