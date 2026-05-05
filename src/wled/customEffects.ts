import type { WLEDSegment, RGBTriple } from './types';
import { hslToRgb, CUSTOM_EFFECTS_MAP, type EffectFn } from './effects';

export const CUSTOM_EFFECT_ID_BASE = 200;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function mapRange(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}
function noise(x: number, y = 0) {
  const ix = Math.floor(x); const fx = x - ix;
  const iy = Math.floor(y); const fy = y - iy;
  const h = (n: number) => {
    let h = n * 374761393;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) / 0x80000000 + 1) / 2;
  };
  const a = lerp(h(ix + iy * 57), h(ix + 1 + iy * 57), fx);
  const b = lerp(h(ix + (iy + 1) * 57), h(ix + 1 + (iy + 1) * 57), fx);
  return lerp(a, b, fy);
}

export const EFFECT_UTILS = {
  hsl: hslToRgb,
  rgb: (r: number, g: number, b: number): RGBTriple => [
    clamp(Math.round(r), 0, 255),
    clamp(Math.round(g), 0, 255),
    clamp(Math.round(b), 0, 255),
  ],
  lerp,
  clamp,
  mapRange,
  noise,
  black: [0, 0, 0] as RGBTriple,
  white: [255, 255, 255] as RGBTriple,
};

export type EffectUtils = typeof EFFECT_UTILS;

const DUMMY_SEG: WLEDSegment = {
  id: 0, start: 0, stop: 10, len: 10, grp: 1, spc: 0, of: 0,
  on: true, frz: false, bri: 255, cct: 127,
  col: [[255, 0, 0], [0, 255, 0], [0, 0, 255]],
  fx: 0, sx: 128, ix: 128, c1: 128, c2: 128, c3: 128, pal: 0,
  sel: true, rev: false, mi: false, o1: false, o2: false, o3: false, si: 0, m12: 0,
};

export function compileCustomEffect(code: string): EffectFn | string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const raw = new Function('t', 'seg', 'n', 'utils', code) as (
      t: number, seg: WLEDSegment, n: number, utils: EffectUtils
    ) => unknown;
    const testResult = raw(0, DUMMY_SEG, 10, EFFECT_UTILS);
    if (!Array.isArray(testResult)) return 'Effect must return an array';
    return (time: number, seg: WLEDSegment, count: number): RGBTriple[] => {
      try {
        const result = raw(time, seg, count, EFFECT_UTILS) as RGBTriple[];
        if (!Array.isArray(result)) return Array(count).fill([0, 0, 0]);
        return result.slice(0, count).map(c =>
          Array.isArray(c) ? c as RGBTriple : [0, 0, 0]
        );
      } catch {
        return Array(count).fill([0, 0, 0] as RGBTriple);
      }
    };
  } catch (e) {
    return (e as Error).message;
  }
}

export function registerCustomEffect(id: number, fn: EffectFn) {
  CUSTOM_EFFECTS_MAP.set(id, fn);
}

export function unregisterCustomEffect(id: number) {
  CUSTOM_EFFECTS_MAP.delete(id);
}

export const EXAMPLE_EFFECT_CODE = `// t = time (ms) | seg = segment config | n = LED count
// utils: { hsl(h,s,l), rgb(r,g,b), lerp, clamp, mapRange, noise }
// Return: array of n [r, g, b] colors (values 0-255)

const period = utils.mapRange(seg.sx, 0, 255, 8000, 200);
return Array.from({ length: n }, (_, i) => {
  const hue = (i / n * 360 + t / period * 360) % 360;
  const bright = 0.4 + 0.6 * Math.abs(Math.sin(t / 1200 + i * 0.4));
  return utils.hsl(hue, 1, bright * 0.5);
});`;

export const EXAMPLE_EFFECTS = [
  {
    name: 'Color Wave',
    code: EXAMPLE_EFFECT_CODE,
  },
  {
    name: 'Knight Rider',
    code: `const period = utils.mapRange(seg.sx, 0, 255, 6000, 300);
const pos = (Math.sin(t / period * Math.PI * 2) + 1) / 2 * (n - 1);
return Array.from({ length: n }, (_, i) => {
  const d = Math.abs(i - pos);
  if (d < 1) return seg.col[0];
  if (d < 4) return utils.rgb(...seg.col[0].map(c => c * Math.pow(1 - d / 4, 2)));
  return [0, 0, 0];
});`,
  },
  {
    name: 'Noise Plasma',
    code: `const speed = utils.mapRange(seg.sx, 0, 255, 20000, 1000);
return Array.from({ length: n }, (_, i) => {
  const v = utils.noise(i / n * 3 + t / speed, t / speed * 0.7);
  const hue = v * 360 + t / 5000 * 60;
  return utils.hsl(hue % 360, 1, 0.5);
});`,
  },
  {
    name: 'Pulse',
    code: `const bpm = utils.mapRange(seg.sx, 0, 255, 20, 200);
const beat = (t / (60000 / bpm)) % 1;
const bright = Math.exp(-beat * 5);
return Array.from({ length: n }, (_, i) => {
  const dist = Math.abs(i - n / 2) / (n / 2);
  return utils.rgb(...seg.col[0].map(c => c * bright * (1 - dist * 0.5)));
});`,
  },
];
