import type { WLEDSegment, RGBTriple } from './types';
import { getPalette, samplePalette } from './palettes';

export type EffectFn = (time: number, seg: WLEDSegment, count: number) => RGBTriple[];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function hslToRgb(h: number, s: number, l: number): RGBTriple {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function speedMs(sx: number, min: number, max: number): number {
  return max - (sx / 255) * (max - min);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function scale(c: RGBTriple, f: number): RGBTriple {
  return [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Deterministic pseudo-random [0,1)
function prng(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// When o1 (Overlay) is on, background shows secondary color instead of black
function overlayBg(seg: WLEDSegment): RGBTriple {
  return seg.o1 ? seg.col[1] : [0, 0, 0];
}

// ── Effects 0–9 ───────────────────────────────────────────────────────────────

// 0: Solid
const solid: EffectFn = (_t, seg, n) => Array(n).fill(seg.col[0]);

// 1: Blink
const blink: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 8000);
  const duty = Math.max(0.05, Math.min(0.95, seg.ix / 255));
  const on = (t % period) < period * duty;
  return Array(n).fill(on ? seg.col[0] : seg.col[1]);
};

// 2: Breathe
const breathe: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 500, 12000);
  const bright = (Math.sin((t % period) / period * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  return Array(n).fill(scale(seg.col[0], bright));
};

// 3: Wipe
const wipe: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 300, 6000);
  const pos = t % period;
  const fill = pos < period / 2
    ? Math.floor((pos / (period / 2)) * n)
    : Math.floor(((period - pos) / (period / 2)) * n);
  const c1 = pos < period / 2 ? seg.col[0] : seg.col[1];
  const c2 = pos < period / 2 ? seg.col[1] : seg.col[0];
  return Array.from({ length: n }, (_, i) => i < fill ? c1 : c2);
};

// 4: Wipe Random
const wipeRandom: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 300, 6000);
  const cycle = Math.floor(t / period);
  const color = hslToRgb(prng(cycle) * 360, 1, 0.5);
  const fill = Math.floor(((t % period) / period) * n);
  return Array.from({ length: n }, (_, i) => i < fill ? color : seg.col[1]);
};

// 5: Random Colors
const randomColors: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 5000);
  const frame = Math.floor(t / period);
  const palette = getPalette(seg.pal);
  return Array.from({ length: n }, (_, i) => samplePalette(palette, prng(i * 100 + frame)));
};

// 6: Sweep
const sweep: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 300, 6000);
  const pos = ((t % period) / period) * n;
  return Array.from({ length: n }, (_, i) => Math.abs(i - pos) < 1.5 ? seg.col[0] : seg.col[1]);
};

// 7: Dynamic
const dynamic: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 50, 2000);
  const frame = Math.floor(t / period);
  return Array.from({ length: n }, (_, i) => {
    const localFrame = Math.floor(frame / (Math.floor(prng(i * 50) * 15) + 3));
    return hslToRgb(prng(i * 100 + localFrame) * 360, 1, 0.5);
  });
};

// 8: Rainbow
const rainbow: EffectFn = (t, seg, n) => {
  const offset = (t % speedMs(seg.sx, 500, 20000)) / speedMs(seg.sx, 500, 20000);
  const size = 1 + Math.round((seg.ix / 255) * 3); // 1-4 rainbow cycles
  return Array.from({ length: n }, (_, i) => hslToRgb(((i / n) * size + offset) * 360, 1, 0.5));
};

// 9: Rainbow Cycle
const rainbowCycle: EffectFn = (t, seg, n) => {
  const offset = (t % speedMs(seg.sx, 300, 15000)) / speedMs(seg.sx, 300, 15000);
  return Array.from({ length: n }, (_, i) => hslToRgb(((i / n) * 5 + offset) * 360, 1, 0.5));
};

// ── Effects 10–19 ─────────────────────────────────────────────────────────────

// 10: Scan
const scan: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 5000);
  const numDots = Math.max(1, Math.round(1 + (seg.ix / 255) * 4));
  const pos = Math.floor(((t % period) / period) * n);
  const bg = overlayBg(seg);
  return Array.from({ length: n }, (_, i) => {
    for (let d = 0; d < numDots; d++) {
      if (i === (pos + Math.round(n / numDots) * d) % n) return seg.col[0];
    }
    return bg;
  });
};

// 11: Dual Scan
const dualScan: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 5000);
  const pos = Math.floor(((t % period) / period) * n);
  return Array.from({ length: n }, (_, i) =>
    (i === pos || i === n - 1 - pos) ? seg.col[0] : seg.col[1]);
};

// 12: Fade
const fade: EffectFn = (t, seg, n) => {
  const f = Math.abs(Math.sin((t % speedMs(seg.sx, 300, 8000)) / speedMs(seg.sx, 300, 8000) * Math.PI));
  return Array(n).fill([
    Math.round(lerp(seg.col[1][0], seg.col[0][0], f)),
    Math.round(lerp(seg.col[1][1], seg.col[0][1], f)),
    Math.round(lerp(seg.col[1][2], seg.col[0][2], f)),
  ] as RGBTriple);
};

// 13: Theater
const theater: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 3000);
  const gap = Math.max(2, 2 + Math.round((seg.ix / 255) * 6)); // 2-8
  const offset = Math.floor((t % period) / (period / gap));
  return Array.from({ length: n }, (_, i) => (i % gap === offset % gap) ? seg.col[0] : seg.col[1]);
};

// 14: Theater Rainbow
const theaterRainbow: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 3000);
  const offset = Math.floor((t % period) / (period / 3));
  const hue = ((t % speedMs(seg.sx, 3000, 30000)) / speedMs(seg.sx, 3000, 30000)) * 360;
  return Array.from({ length: n }, (_, i) =>
    (i % 3 === offset) ? hslToRgb((hue + (i / n) * 60) % 360, 1, 0.5) : [0, 0, 0] as RGBTriple);
};

// 15: Running
const running: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 3000);
  const offset = Math.floor((t % period) / (period / n));
  return Array.from({ length: n }, (_, i) => {
    const v = (i + offset) % 4;
    return v === 0 ? seg.col[0] : v === 1 ? seg.col[1] : [0, 0, 0] as RGBTriple;
  });
};

// 16: Saw
const saw: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 8000);
  const offset = Math.floor(((t % period) / period) * n);
  return Array.from({ length: n }, (_, i) => scale(seg.col[0], ((i + offset) % n) / n));
};

// 17: Twinkle
const twinkle: EffectFn = (t, seg, n) => {
  const frame = Math.floor(t / 200);
  const threshold = 1 - (seg.ix / 255) * 0.5;
  return Array.from({ length: n }, (_, i) => {
    const r = prng(i * 7.391 + frame);
    if (r > threshold) return seg.col[0];
    return prng(i * 3.147 + frame + 100) > threshold + 0.3 ? seg.col[1] : [0, 0, 0] as RGBTriple;
  });
};

// 18: Dissolve
const dissolve: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 400, 8000);
  const phase = (t % (period * 2)) / period;
  const progress = phase < 1 ? phase : 2 - phase;
  const frame = Math.floor(t / (period * 2));
  return Array.from({ length: n }, (_, i) =>
    prng(i * 1234.5 + frame) < progress ? seg.col[0] : seg.col[1]);
};

// 19: Dissolve Rnd
const dissolveRnd: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 400, 8000);
  const phase = (t % (period * 2)) / period;
  const progress = phase < 1 ? phase : 2 - phase;
  const frame = Math.floor(t / (period * 2));
  const palette = getPalette(seg.pal);
  return Array.from({ length: n }, (_, i) =>
    prng(i * 1234 + frame) < progress ? samplePalette(palette, prng(i * 567 + frame)) : [0, 0, 0] as RGBTriple);
};

// ── Effects 20–29 ─────────────────────────────────────────────────────────────

// 20: Sparkle
const sparkle: EffectFn = (t, seg, n) => {
  const seed = Math.floor(t / 80);
  return Array.from({ length: n }, (_, i) =>
    prng(seed * 1000 + i) > 0.97 ? seg.col[0] : scale(seg.col[0], 0.1));
};

// 21: Sparkle+
const sparklePlus: EffectFn = (t, seg, n) => {
  const seed = Math.floor(t / 60);
  const threshold = 0.93 - (seg.ix / 255) * 0.1;
  return Array.from({ length: n }, (_, i) => {
    if (prng(seed * 1000 + i) > threshold) return seg.col[0];
    if (prng(seed * 2000 + i) > 0.95) return seg.col[1];
    return [0, 0, 0] as RGBTriple;
  });
};

// 22: Hyper Sparkle
const hyperSparkle: EffectFn = (t, seg, n) => {
  const seed = Math.floor(t / 40);
  const threshold = 0.75 + (seg.ix / 255) * 0.2;
  return Array.from({ length: n }, (_, i) =>
    prng(seed * 1000 + i) > threshold ? seg.col[0] : [0, 0, 0] as RGBTriple);
};

// 23: Strobe
const strobe: EffectFn = (t, seg, n) => {
  const on = (t % speedMs(seg.sx, 25, 2000)) < 50;
  return Array(n).fill(on ? seg.col[0] : [0, 0, 0] as RGBTriple);
};

// 24: Strobe Rainbow
const strobeRainbow: EffectFn = (t, seg, n) => {
  const on = (t % speedMs(seg.sx, 25, 2000)) < 50;
  if (!on) return Array(n).fill([0, 0, 0] as RGBTriple);
  return Array(n).fill(hslToRgb((t % 5000) / 5000 * 360, 1, 0.5));
};

// 25: Mega Strobe
const megaStrobe: EffectFn = (t, seg, n) => {
  const on = (t % speedMs(seg.sx, 10, 500)) < 30;
  return Array(n).fill(on ? seg.col[0] : [0, 0, 0] as RGBTriple);
};

// 26: Blink Rainbow
const blinkRainbow: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 8000);
  const on = (t % period) < period / 2;
  if (!on) return Array(n).fill(seg.col[1]);
  return Array(n).fill(hslToRgb((t % speedMs(seg.sx, 1000, 20000)) / speedMs(seg.sx, 1000, 20000) * 360, 1, 0.5));
};

// 27: Android
const android: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 6000);
  const blockSize = Math.max(2, Math.round(n * 0.15 * (1 + seg.ix / 255)));
  const pos = Math.floor(((t % period) / period) * (n + blockSize)) - blockSize;
  return Array.from({ length: n }, (_, i) => {
    const d = i - pos;
    if (d >= 0 && d < blockSize) return seg.col[0];
    if (d >= blockSize && d < blockSize + 2) return seg.col[1];
    return [0, 0, 0] as RGBTriple;
  });
};

// 28: Chase
const chase: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 150, 5000);
  const pos = Math.floor(((t % period) / period) * n);
  return Array.from({ length: n }, (_, i) => {
    const d = (i - pos + n) % n;
    if (d === 0) return seg.col[0];
    if (d === 1) return seg.col[1];
    if (d === 2) return seg.col[2];
    return [0, 0, 0] as RGBTriple;
  });
};

// 29: Chase Random
const chaseRandom: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 150, 5000);
  const pos = Math.floor(((t % period) / period) * n);
  const color = hslToRgb(prng(Math.floor(t / period)) * 360, 1, 0.5);
  return Array.from({ length: n }, (_, i) => {
    const d = (i - pos + n) % n;
    if (d === 0) return color;
    if (d === 1) return scale(color, 0.6);
    if (d === 2) return scale(color, 0.3);
    return [0, 0, 0] as RGBTriple;
  });
};

// ── Effects 30–39 ─────────────────────────────────────────────────────────────

// 30: Chase Rainbow
const chaseRainbow: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 150, 5000);
  const pos = Math.floor(((t % period) / period) * n);
  const hue = ((t % speedMs(seg.sx, 3000, 30000)) / speedMs(seg.sx, 3000, 30000)) * 360;
  return Array.from({ length: n }, (_, i) => {
    const d = (i - pos + n) % n;
    return d < 3 ? hslToRgb((hue + d * 30) % 360, 1, 0.5) : [0, 0, 0] as RGBTriple;
  });
};

// 31: Chase Flash
const chaseFlash: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 3000);
  const pos = Math.floor(((t % period) / period) * n);
  const flashOn = (t % 160) < 80;
  return Array.from({ length: n }, (_, i) => {
    const d = (i - pos + n) % n;
    if (d < 3) return flashOn ? [255, 255, 255] as RGBTriple : seg.col[0];
    return seg.col[1];
  });
};

// 32: Chase Flash Rnd
const chaseFlashRnd: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 3000);
  const pos = Math.floor(((t % period) / period) * n);
  const color = hslToRgb(prng(Math.floor(t / period)) * 360, 1, 0.5);
  const flashOn = (t % 160) < 80;
  return Array.from({ length: n }, (_, i) => {
    const d = (i - pos + n) % n;
    if (d < 3) return flashOn ? [255, 255, 255] as RGBTriple : color;
    return [0, 0, 0] as RGBTriple;
  });
};

// 33: Rainbow Runner
const rainbowRunner: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 4000);
  const pos = Math.floor(((t % period) / period) * n);
  const hue = (t % 10000) / 10000 * 360;
  return Array.from({ length: n }, (_, i) => {
    const d = (i - pos + n) % n;
    return d < 4 ? hslToRgb((hue + d * 10) % 360, 1, 0.5) : seg.col[1];
  });
};

// 34: Colorful
const colorful: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const offset = (t % speedMs(seg.sx, 500, 15000)) / speedMs(seg.sx, 500, 15000);
  return Array.from({ length: n }, (_, i) => samplePalette(palette, ((i / n) + offset) % 1));
};

// 35: Traffic Light
const trafficLight: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 500, 10000);
  const phase = Math.floor((t % (period * 3)) / period);
  const colors: RGBTriple[] = [[255, 0, 0], [255, 180, 0], [0, 220, 0]];
  const blockSize = Math.max(1, Math.floor(n / 6));
  return Array.from({ length: n }, (_, i) => {
    const block = Math.floor(i / blockSize) % 3;
    return block === phase ? colors[block] : scale(colors[block], 0.08);
  });
};

// 36: Sweep Random
const sweepRandom: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 300, 6000);
  const color = hslToRgb(prng(Math.floor(t / period)) * 360, 1, 0.5);
  const pos = ((t % period) / period) * n;
  return Array.from({ length: n }, (_, i) => Math.abs(i - pos) < 1.5 ? color : [0, 0, 0] as RGBTriple);
};

// 37: Running 2
const running2: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 3000);
  const offset = Math.floor((t % period) / (period / n));
  return Array.from({ length: n }, (_, i) =>
    (i + offset) % 6 < 3 ? seg.col[0] : seg.col[1]);
};

// 38: Aurora
const aurora: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal === 0 ? 10 : seg.pal);
  const speed = speedMs(seg.sx, 1000, 20000);
  return Array.from({ length: n }, (_, i) => {
    const x = i / n;
    const v = (Math.sin(x * 4 + t / speed * 2) + 1) / 2 * 0.5
            + (Math.cos(x * 2 - t / speed * 1.3) + 1) / 2 * 0.3
            + (Math.sin(x * 7 + t / speed * 0.7) + 1) / 2 * 0.2;
    return scale(samplePalette(palette, v), v * 0.8 + 0.2);
  });
};

// 39: Stream
const stream: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 300, 8000);
  const offset = (t % speed) / speed;
  return Array.from({ length: n }, (_, i) => {
    const pos = (i / n + offset) % 1;
    return scale(samplePalette(palette, pos), (Math.sin(pos * Math.PI) + 1) / 2);
  });
};

// ── Effects 40–49 ─────────────────────────────────────────────────────────────

// 40: Scanner — ix=Trail length, c1=Delay at ends, o1=Dual (second scanner)
const scanner: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 5000);
  const trailLen = Math.max(2, Math.round(2 + (seg.ix / 255) * 6));
  const delay = (seg.c1 / 255) * period * 0.3;
  const full = period + 2 * delay;
  const phase = t % full;

  let idx: number;
  if (phase < delay) {
    idx = 0;
  } else if (phase < delay + period / 2) {
    idx = Math.floor(((phase - delay) / (period / 2)) * (n - 1));
  } else if (phase < 2 * delay + period / 2) {
    idx = n - 1;
  } else {
    idx = n - 1 - Math.floor(((phase - 2 * delay - period / 2) / (period / 2)) * (n - 1));
  }
  idx = clamp(idx, 0, n - 1);

  const bg: RGBTriple = seg.o1 ? [0, 0, 0] : seg.col[1];
  const pixels: RGBTriple[] = Array(n).fill(bg);
  for (let i = 0; i < n; i++) {
    const d = Math.abs(i - idx);
    if (d === 0) pixels[i] = seg.col[0];
    else if (d < trailLen) pixels[i] = scale(seg.col[0], (trailLen - d) / trailLen * 0.4);
  }
  if (seg.o1) {
    const idx2 = n - 1 - idx;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(i - idx2);
      if (d === 0) pixels[i] = seg.col[1];
      else if (d < trailLen) {
        const [r, g, b] = pixels[i];
        if (r === 0 && g === 0 && b === 0)
          pixels[i] = scale(seg.col[1], (trailLen - d) / trailLen * 0.4);
      }
    }
  }
  return pixels;
};

// 41: Lighthouse (Meteor)
const meteor: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 300, 8000);
  const tailLen = Math.max(3, Math.round((seg.ix / 255) * n * 0.5));
  const pos = Math.floor(((t % period) / period) * (n + tailLen)) - tailLen;
  return Array.from({ length: n }, (_, i) => {
    const d = pos - i;
    if (d === 0) return seg.col[0];
    if (d > 0 && d < tailLen) return scale(seg.col[0], (1 - d / tailLen) ** 2);
    return [0, 0, 0] as RGBTriple;
  });
};

// 42: Fireworks
const fireworksParticles: EffectFn = (t, seg, n) => {
  const pixels: RGBTriple[] = Array(n).fill([0, 0, 0] as RGBTriple);
  const numBursts = 1 + Math.round(seg.ix / 64);
  for (let b = 0; b < numBursts; b++) {
    const period = speedMs(seg.sx, 800, 6000);
    const frac = ((t + b * 3700) % period) / period;
    const center = Math.round((Math.sin(b * 6.28 + b * 1000) * 0.4 + 0.5) * (n - 1));
    const radius = Math.round(frac * n * 0.45);
    const bright = Math.max(0, 1 - frac * 1.5);
    const hue = ((b / numBursts) * 360 + t / 5000 * 60) % 360;
    for (let i = Math.max(0, center - radius); i <= Math.min(n - 1, center + radius); i++) {
      pixels[i] = scale(hslToRgb(hue, 1, 0.5), bright * (1 - Math.abs(i - center) / (radius + 1)));
    }
  }
  return pixels;
};

// 43: Rain
const rain: EffectFn = (t, seg, n) => {
  const pixels: RGBTriple[] = Array(n).fill([0, 0, 0] as RGBTriple);
  const numDrops = 1 + Math.round(seg.ix / 40);
  for (let d = 0; d < numDrops; d++) {
    const period = speedMs(seg.sx, 200, 4000) * (0.6 + (d % 5) * 0.15);
    const pos = Math.floor(((t + d * 1337) % period) / period * n);
    if (pos < n) {
      pixels[pos] = seg.col[0];
      if (pos > 0) pixels[pos - 1] = scale(seg.col[0], 0.4);
    }
  }
  return pixels;
};

// 44: Tetrix (blocks build up from bottom)
const tetrix: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const period = speedMs(seg.sx, 200, 4000) * n;
  const filled = Math.floor(((t % period) / period) * n);
  return Array.from({ length: n }, (_, i) =>
    i < filled ? samplePalette(palette, i / n) : [0, 0, 0] as RGBTriple);
};

// 45: Fire Flicker
const fireFlicker: EffectFn = (t, seg, n) => {
  return Array.from({ length: n }, (_, i) => {
    const rng = (Math.sin(Math.floor(t / 100) * 3.7 + i * 2.3) + 1) / 2;
    const bright = 0.4 + rng * 0.6;
    const [r, g, b] = seg.col[0];
    return [Math.round(r * bright), Math.round(g * bright * 0.4), Math.round(b * bright * 0.1)] as RGBTriple;
  });
};

// 46: Gradient
const gradient: EffectFn = (_t, seg, n) =>
  Array.from({ length: n }, (_, i) => {
    const f = i / (n - 1);
    return [
      Math.round(lerp(seg.col[0][0], seg.col[1][0], f)),
      Math.round(lerp(seg.col[0][1], seg.col[1][1], f)),
      Math.round(lerp(seg.col[0][2], seg.col[1][2], f)),
    ] as RGBTriple;
  });

// 47: Loading (progress bar)
const loading: EffectFn = (t, seg, n) => {
  const fill = Math.floor(((t % speedMs(seg.sx, 300, 8000)) / speedMs(seg.sx, 300, 8000)) * n);
  return Array.from({ length: n }, (_, i) => i < fill ? seg.col[0] : seg.col[1]);
};

// 48: Police
const police: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 2000);
  const half = period / 2;
  const pos = t % period;
  const flashOn = (pos % 200) < 100;
  return Array.from({ length: n }, (_, i) => {
    if (!flashOn) return [0, 0, 0] as RGBTriple;
    const isLeft = i < n / 2;
    if (pos < half) return isLeft ? [255, 0, 0] as RGBTriple : [0, 0, 0] as RGBTriple;
    return isLeft ? [0, 0, 0] as RGBTriple : [0, 0, 255] as RGBTriple;
  });
};

// 49: Fairy
const fairy: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal === 0 ? 6 : seg.pal);
  return Array.from({ length: n }, (_, i) => {
    const frame = Math.floor(t / 120);
    const bright = Math.pow(prng(i * 7 + frame), 3) * (prng(i * 11 + frame + 500) > 0.5 ? 1 : 0.3);
    return scale(samplePalette(palette, prng(i * 3 + frame)), bright);
  });
};

// ── Effects 50–59 ─────────────────────────────────────────────────────────────

// 50: Two Dots
const twoDots: EffectFn = (t, seg, n) => {
  const p1 = speedMs(seg.sx, 300, 6000);
  const p2 = p1 * 1.618;
  const pos1 = Math.floor(((Math.sin(t / p1 * Math.PI * 2) + 1) / 2) * (n - 1));
  const pos2 = Math.floor(((Math.sin(t / p2 * Math.PI * 2) + 1) / 2) * (n - 1));
  return Array.from({ length: n }, (_, i) => {
    const d1 = Math.abs(i - pos1), d2 = Math.abs(i - pos2);
    if (d1 <= 1) return scale(seg.col[0], 1 - d1 * 0.5);
    if (d2 <= 1) return scale(seg.col[1], 1 - d2 * 0.5);
    return seg.col[2];
  });
};

// 51: Fairy Twinkle
const fairyTwinkle: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 300, 8000);
  return Array.from({ length: n }, (_, i) => {
    const bright = Math.pow((Math.sin((i * 0.7 + t / speed) * Math.PI * 2) + 1) / 2, 3);
    return scale(samplePalette(palette, (Math.sin(i * 2.39) + 1) / 2), bright);
  });
};

// 52: Running Dual
const runningDual: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 100, 3000);
  const offset = Math.floor((t % period) / (period / n));
  return Array.from({ length: n }, (_, i) => {
    if ((i + offset) % 4 === 0) return seg.col[0];
    if ((n - 1 - i + offset) % 4 === 0) return seg.col[1];
    return [0, 0, 0] as RGBTriple;
  });
};

// 53: Halloween
const halloween: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 300, 8000);
  const offset = (t % period) / period;
  return Array.from({ length: n }, (_, i) => {
    const pos = ((i / n) + offset) % 1;
    if (pos < 0.33) return scale([255, 100, 0] as RGBTriple, pos / 0.33);
    if (pos < 0.66) return scale([120, 0, 200] as RGBTriple, 1 - (pos - 0.33) / 0.33);
    return [0, 0, 0] as RGBTriple;
  });
};

// 54: Tri Chase
const triChase: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 150, 5000);
  const pos = Math.floor(((t % period) / period) * n);
  const third = Math.floor(n / 3);
  return Array.from({ length: n }, (_, i) => {
    const d = (i - pos + n) % n;
    if (d < third) return seg.col[0];
    if (d < third * 2) return seg.col[1];
    return seg.col[2];
  });
};

// 55: Tri Wipe
const triWipe: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 300, 6000);
  const phaseIdx = Math.floor((t % (period * 3)) / period);
  const fill = Math.floor(((t % period) / period) * n);
  return Array.from({ length: n }, (_, i) =>
    i < fill ? seg.col[phaseIdx % 3] : [0, 0, 0] as RGBTriple);
};

// 56: Tri Fade
const triFade: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 300, 8000);
  const full = t % (period * 3);
  const phaseIdx = Math.floor(full / period);
  const p = (full % period) / period;
  const from = seg.col[phaseIdx % 3];
  const to = seg.col[(phaseIdx + 1) % 3];
  return Array(n).fill([
    Math.round(lerp(from[0], to[0], p)),
    Math.round(lerp(from[1], to[1], p)),
    Math.round(lerp(from[2], to[2], p)),
  ] as RGBTriple);
};

// 57: Lightning
const lightning: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 500, 10000);
  const pos = t % period;
  const bg = overlayBg(seg);
  if (pos > 60) return Array(n).fill(bg);
  const bright = Math.cos((pos / 60) * Math.PI * 0.5);
  const len = Math.max(3, Math.round(n * 0.3 * (1 + seg.ix / 255)));
  const start = Math.round((Math.sin(Math.floor(t / period)) * 0.5 + 0.5) * (n - len));
  return Array.from({ length: n }, (_, i) =>
    i >= start && i < start + len ? scale([255, 255, 200], bright) : bg);
};

// 58: ICU (two eyes seek each other)
const icu: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 400, 10000);
  const eyeSize = Math.max(1, Math.round(1 + (seg.ix / 255) * 3));
  const pos = Math.floor(((t % period) / period) * Math.floor((n - eyeSize * 2) / 2));
  const bg = overlayBg(seg);
  return Array.from({ length: n }, (_, i) => {
    if (i >= pos && i < pos + eyeSize) return seg.col[0];
    if (i >= n - pos - eyeSize && i < n - pos) return seg.col[1];
    return bg;
  });
};

// 59: Multi Comet
const multiComet: EffectFn = (t, seg, n) => {
  const numComets = 2 + Math.round(seg.ix / 50);
  const pixels: RGBTriple[] = Array(n).fill([0, 0, 0] as RGBTriple);
  for (let c = 0; c < numComets; c++) {
    const period = speedMs(seg.sx, 300, 8000) * (1 + c * 0.4);
    const tailLen = Math.max(3, Math.round(n * 0.3));
    const pos = Math.floor(((t + c * 2000) % period) / period * (n + tailLen)) - tailLen;
    const hue = (c / numComets) * 360;
    for (let i = 0; i < n; i++) {
      const d = pos - i;
      if (d === 0) pixels[i] = hslToRgb(hue, 1, 0.5);
      else if (d > 0 && d < tailLen) pixels[i] = scale(hslToRgb(hue, 1, 0.5), (1 - d / tailLen) ** 2);
    }
  }
  return pixels;
};

// ── Effects 60–69 ─────────────────────────────────────────────────────────────

// 60: Scanner Dual — ix=Trail length, c1=Delay at ends
const scannerDual: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 5000);
  const trailLen = Math.max(2, Math.round(2 + (seg.ix / 255) * 6));
  const delay = (seg.c1 / 255) * period * 0.3;
  const full = period + 2 * delay;
  const phase = t % full;

  let idx: number;
  if (phase < delay) {
    idx = 0;
  } else if (phase < delay + period / 2) {
    idx = Math.floor(((phase - delay) / (period / 2)) * (n - 1));
  } else if (phase < 2 * delay + period / 2) {
    idx = n - 1;
  } else {
    idx = n - 1 - Math.floor(((phase - 2 * delay - period / 2) / (period / 2)) * (n - 1));
  }
  idx = clamp(idx, 0, n - 1);
  const idx2 = n - 1 - idx;

  const pixels: RGBTriple[] = Array(n).fill([0, 0, 0] as RGBTriple);
  for (let i = 0; i < n; i++) {
    const d1 = Math.abs(i - idx), d2 = Math.abs(i - idx2);
    const d = Math.min(d1, d2);
    if (d === 0) pixels[i] = seg.col[0];
    else if (d < trailLen) pixels[i] = scale(seg.col[0], (trailLen - d) / trailLen * 0.4);
  }
  return pixels;
};

// 61: Stream 2
const stream2: EffectFn = (t, seg, n) => {
  const speed = speedMs(seg.sx, 300, 8000);
  const offset = (t % speed) / speed;
  return Array.from({ length: n }, (_, i) => {
    const v = (Math.sin(((i / n) + offset) % 1 * Math.PI * 4) + 1) / 2;
    return [
      Math.round(lerp(seg.col[1][0], seg.col[0][0], v)),
      Math.round(lerp(seg.col[1][1], seg.col[0][1], v)),
      Math.round(lerp(seg.col[1][2], seg.col[0][2], v)),
    ] as RGBTriple;
  });
};

// 62: Oscillate
const oscillate: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 500, 12000);
  const center = Math.floor(n / 2);
  const width = Math.max(2, Math.round(n * 0.12 + (seg.ix / 255) * n * 0.3));
  const pos = Math.round(center + Math.sin(t / period * Math.PI * 2) * (center - width / 2));
  return Array.from({ length: n }, (_, i) => {
    const d = Math.abs(i - pos);
    return d < width ? scale(seg.col[0], 1 - (d / width) * 0.8) : seg.col[1];
  });
};

// 63: Pride 2015
const pride2015: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 2000, 30000);
  const hue = (t % period) / period * 360;
  return Array.from({ length: n }, (_, i) =>
    hslToRgb(
      (hue + (i / n) * 120) % 360,
      0.7 + 0.3 * Math.sin((i / n + t / 8000) * Math.PI * 2),
      0.5
    ));
};

// 64: Juggle
const juggle: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 5000);
  const trail = Math.max(1, Math.round(1 + (seg.ix / 255) * 10));
  const pixels: RGBTriple[] = Array(n).fill([0, 0, 0] as RGBTriple);
  for (let j = 0; j < 8; j++) {
    const pos = clamp(Math.floor(((Math.sin((t / period + j * 0.7) * Math.PI * 2) + 1) / 2) * (n - 1)), 0, n - 1);
    const color = hslToRgb((j / 8) * 360, 1, 0.5);
    pixels[pos] = color;
    for (let tr = 1; tr < trail; tr++) {
      const trPos = clamp(pos - tr, 0, n - 1);
      pixels[trPos] = scale(color, (1 - tr / trail) ** 2);
    }
  }
  return pixels;
};

// 65: Palette (scrolling palette)
const paletteScroll: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const offset = (t % speedMs(seg.sx, 300, 15000)) / speedMs(seg.sx, 300, 15000);
  return Array.from({ length: n }, (_, i) => samplePalette(palette, ((i / n) + offset) % 1));
};

// 66: Fire 2012 — sx=Cooling, ix=Spark rate, c3=Boost
const fire2012State = new Map<string, Float32Array>();
const fire2012: EffectFn = (_t, seg, n) => {
  const key = `${seg.id}`;
  if (!fire2012State.has(key) || fire2012State.get(key)!.length !== n)
    fire2012State.set(key, new Float32Array(n));
  const heat = fire2012State.get(key)!;
  const cooling = 55 + (255 - seg.sx) / 5;   // sx=Cooling: high → more cooling
  const sparking = 120 + seg.ix / 2;           // ix=Spark rate: high → more sparks
  const boost = seg.c3 / 255;                  // c3=Boost: raises initial heat
  for (let i = 0; i < n; i++) heat[i] = Math.max(0, heat[i] - Math.random() * cooling / n);
  for (let i = n - 1; i >= 2; i--) heat[i] = (heat[i - 1] + heat[i - 2] * 2) / 3;
  if (Math.random() * 255 < sparking) {
    const y = Math.floor(Math.random() * 7);
    heat[y] = Math.min(1, heat[y] + 0.4 + boost * 0.4 + Math.random() * 0.3);
  }
  return Array.from({ length: n }, (_, i) => {
    const h = heat[i];
    if (h < 0.33) return [Math.round(h * 3 * 255), 0, 0] as RGBTriple;
    if (h < 0.66) return [255, Math.round((h - 0.33) * 3 * 255), 0] as RGBTriple;
    return [255, 255, Math.round((h - 0.66) * 3 * 255)] as RGBTriple;
  });
};

// 67: Colorwaves
const colorwaves: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal === 0 ? 11 : seg.pal);
  const speed = speedMs(seg.sx, 500, 15000);
  return Array.from({ length: n }, (_, i) => {
    const x = i / n;
    const v = (Math.sin(x * 5 + t / speed * 2) + 1) / 2 * 0.6
            + (Math.cos(x * 3 - t / speed) + 1) / 2 * 0.4;
    return samplePalette(palette, v);
  });
};

// 68: BPM
const bpm: EffectFn = (t, seg, n) => {
  const bpmRate = 30 + (seg.sx / 255) * 200;
  const period = 60000 / bpmRate;
  const palette = getPalette(seg.pal);
  const beat = (t % period) / period;
  const bright = beat < 0.5 ? beat * 2 : (1 - beat) * 2;
  return Array.from({ length: n }, (_, i) => scale(samplePalette(palette, i / n), bright));
};

// 69: Fill Noise 8
const fillNoise8: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 1000, 20000);
  return Array.from({ length: n }, (_, i) => {
    const v = Math.sin(i * 0.25 + t / speed * Math.PI * 2) * Math.sin(i * 0.08 - t / speed * Math.PI);
    return samplePalette(palette, (v + 1) / 2);
  });
};

// ── Effects 70–79 ─────────────────────────────────────────────────────────────

// 70: Noise 1
const noise1: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 1000, 30000);
  return Array.from({ length: n }, (_, i) => {
    const v = Math.sin(i * 0.3 + t / speed * Math.PI * 2) * Math.cos(i * 0.7 - t / speed * Math.PI * 3);
    return samplePalette(palette, (v + 1) / 2);
  });
};

// 71: Noise 2
const noise2: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 1000, 25000);
  return Array.from({ length: n }, (_, i) => {
    const v = Math.sin(i * 0.5 + t / speed * 4) * Math.sin(i * 0.13 + t / speed * 2.3);
    return samplePalette(palette, (v + 1) / 2);
  });
};

// 72: Noise 3
const noise3: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 1000, 20000);
  return Array.from({ length: n }, (_, i) => {
    const v = Math.cos(i * 0.3 + t / speed * 3) * Math.sin(i * 0.7 - t / speed * 5);
    return samplePalette(palette, (v + 1) / 2);
  });
};

// 73: Noise 4
const noise4: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 500, 15000);
  return Array.from({ length: n }, (_, i) => {
    const f = i / n;
    return samplePalette(palette, ((Math.sin(f * 12 + t / speed) + Math.sin(f * 7 - t / speed * 1.5)) / 4 + 0.5));
  });
};

// 74: Colortwinkle
const colortwinkle: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  return Array.from({ length: n }, (_, i) => {
    const frame = Math.floor(t / 300);
    return scale(samplePalette(palette, prng(frame * 5 + i)), Math.pow(prng(frame + i * 7), 3));
  });
};

// 75: Lake
const lake: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal === 0 ? 9 : seg.pal);
  const speed = speedMs(seg.sx, 1000, 20000);
  return Array.from({ length: n }, (_, i) => {
    const v = Math.sin(i * 0.15 + t / speed * 3) * 0.5
            + Math.sin(i * 0.4 - t / speed * 2) * 0.3
            + Math.sin(i * 0.9 + t / speed * 5) * 0.2;
    return samplePalette(palette, (v + 1) / 2);
  });
};

// 76: Meteor — ix=Trail, o1=Gradient (use palette), o3=Smooth (linear decay)
const meteorSmooth: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 300, 8000);
  const tailLen = Math.max(3, Math.round((seg.ix / 255) * n * 0.5));
  const pos = Math.floor(((t % period) / period) * (n + tailLen)) - tailLen;
  const palette = getPalette(seg.pal);
  return Array.from({ length: n }, (_, i) => {
    const d = pos - i;
    const baseColor = seg.o1 ? samplePalette(palette, i / n) : seg.col[0];
    if (d === 0) return baseColor;
    if (d > 0 && d < tailLen) {
      const fade = seg.o3 ? (1 - d / tailLen) : (1 - d / tailLen) ** 2;
      return scale(baseColor, fade);
    }
    return [0, 0, 0] as RGBTriple;
  });
};

// 77: Smooth Meteor
const smoothMeteor: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 300, 8000);
  const tailLen = Math.max(3, Math.round((seg.ix / 255) * n * 0.5));
  const fpos = ((t % period) / period) * (n + tailLen) - tailLen;
  return Array.from({ length: n }, (_, i) => {
    const d = fpos - i;
    return d >= 0 && d < tailLen ? scale(seg.col[0], 1 - d / tailLen) : [0, 0, 0] as RGBTriple;
  });
};

// 78: Railway
const railway: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 5000);
  const offset = Math.floor((t % period) / (period / 2));
  return Array.from({ length: n }, (_, i) => (i + offset) % 2 === 0 ? seg.col[0] : seg.col[1]);
};

// 79: Ripple — ix=Wave #, c1=Blur (ripple softness), o1=Overlay
const ripple: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 400, 10000);
  const waveCount = Math.max(1, Math.round(1 + (seg.ix / 255) * 5));
  const blur = 1 + (seg.c1 / 255) * 3;  // 1 = sharp, 4 = very soft
  const center = Math.floor(n / 2);
  const phase = (t % period) / period;
  const bg = overlayBg(seg);
  return Array.from({ length: n }, (_, i) => {
    const dist = Math.abs(i - center) / n;
    const wave = Math.sin((dist * waveCount * 6 - phase * 8) * Math.PI * 2);
    const bright = Math.max(0, wave) * Math.max(0, 1 - dist * blur);
    return bright > 0.05 ? scale(seg.col[0], bright) : bg;
  });
};

// ── Effects 80–89 ─────────────────────────────────────────────────────────────

// 80: Twinklefox
const twinklefox: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const cycleLen = speedMs(seg.sx, 200, 3000);
  return Array.from({ length: n }, (_, i) => {
    const offset = prng(i * 137) * cycleLen;
    const phase = ((t + offset) % cycleLen) / cycleLen;
    const bright = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    return scale(samplePalette(palette, prng(i * 137 + 1)), Math.pow(bright, 2));
  });
};

// 81: Twinklecat
const twinklecat: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const cycleLen = speedMs(seg.sx, 250, 3500);
  return Array.from({ length: n }, (_, i) => {
    const offset = prng(i * 89 + 7) * cycleLen;
    const phase = ((t + offset) % cycleLen) / cycleLen;
    const bright = Math.abs(Math.sin(phase * Math.PI));
    return scale(samplePalette(palette, prng(i * 89 + 3)), Math.pow(bright, 3));
  });
};

// 82: Halloween Eyes
const halloweenEyes: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 800, 15000);
  const fadeDur = Math.max(50, Math.round((seg.ix / 255) * period * 0.3));
  const pixels: RGBTriple[] = Array(n).fill(overlayBg(seg));
  for (let e = 0; e < 2; e++) {
    const phase = (t + e * 3700) % period;
    if (phase > period * 0.7) continue;
    const bright = phase < fadeDur ? phase / fadeDur
      : phase > period * 0.6 ? (period * 0.7 - phase) / (period * 0.1) : 1;
    const basePos = clamp(Math.round(prng(e * 5 + Math.floor(t / period)) * (n - 5)), 0, n - 5);
    for (const off of [0, 1, 3, 4]) pixels[basePos + off] = scale(seg.col[0], bright);
  }
  return pixels;
};

// 83: Solid Pattern
const solidPattern: EffectFn = (_t, seg, n) => {
  const size = Math.max(1, Math.round(seg.ix / 32) + 1);
  return Array.from({ length: n }, (_, i) => Math.floor(i / size) % 2 === 0 ? seg.col[0] : seg.col[1]);
};

// 84: Solid Pattern Tri
const solidPatternTri: EffectFn = (_t, seg, n) => {
  const size = Math.max(1, Math.round(seg.ix / 32) + 1);
  return Array.from({ length: n }, (_, i) => seg.col[Math.floor(i / size) % 3]);
};

// 85: Spots — static evenly-spaced spots; sx=Spread, ix=Width, o1=Overlay
const spots: EffectFn = (_t, seg, n) => {
  const spread = Math.max(2, 2 + Math.floor((seg.sx / 255) * Math.max(2, n / 2 - 2)));
  const width = Math.max(1, Math.round(1 + (seg.ix / 255) * (spread - 2)));
  const bg = overlayBg(seg);
  return Array.from({ length: n }, (_, i) => (i % spread) < width ? seg.col[0] : bg);
};

// 86: Spots Fade — same as Spots but brightness fades in/out; sx=Spread, ix=Width, o1=Overlay
const spotsFade: EffectFn = (t, seg, n) => {
  const spread = Math.max(2, 2 + Math.floor((seg.sx / 255) * Math.max(2, n / 2 - 2)));
  const width = Math.max(1, Math.round(1 + (seg.ix / 255) * (spread - 2)));
  const bright = (Math.sin(t / 2000 * Math.PI * 2) + 1) / 2;
  const bg = overlayBg(seg);
  return Array.from({ length: n }, (_, i) =>
    (i % spread) < width ? scale(seg.col[0], bright) : bg);
};

// 87: Glitter (rainbow + white sparks); o1=Overlay (use col[1] bg instead of rainbow)
const glitter: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 500, 20000);
  const offset = (t % period) / period;
  const bg = overlayBg(seg);
  const base = seg.o1
    ? (Array(n).fill(bg) as RGBTriple[])
    : (Array.from({ length: n }, (_, i) => hslToRgb(((i / n) + offset) * 360, 1, 0.5)) as RGBTriple[]);
  const sparkRate = 0.94 + (seg.ix / 255) * 0.05;
  const seed = Math.floor(t / 80);
  for (let i = 0; i < n; i++) {
    if (Math.abs(prng(seed * 1000 + i) * 2 - 1) > sparkRate) base[i] = [255, 255, 255];
  }
  return base;
};

// 88: Candle
const candle: EffectFn = (t, seg, n) => {
  const base = seg.col[0][0] + seg.col[0][1] + seg.col[0][2] > 0 ? seg.col[0] : [255, 100, 20] as RGBTriple;
  return Array.from({ length: n }, (_, i) => {
    const r1 = (Math.sin(Math.floor(t / 70 + i) * 3.71 + i * 2.13) + 1) / 2;
    const r2 = (Math.sin(Math.floor(t / 40 + i * 3) * 7.31 - i * 4.27) + 1) / 2;
    return scale(base, 0.45 + r1 * 0.35 + r2 * 0.2);
  });
};

// 89: Fireworks Starburst; o1=Overlay
const fireworksStarburst: EffectFn = (t, seg, n) => {
  const pixels: RGBTriple[] = Array(n).fill(overlayBg(seg));
  const numBursts = 1 + Math.round(seg.ix / 60);
  for (let b = 0; b < numBursts; b++) {
    const period = speedMs(seg.sx, 600, 5000);
    const frac = ((t + b * 2300) % period) / period;
    if (frac > 0.8) continue;
    const center = Math.round((Math.sin(b * 2.5) * 0.35 + 0.5) * (n - 1));
    const radius = Math.round(frac * n * 0.4);
    const bright = Math.max(0, 1 - frac * 1.2);
    const hue = (b * 137.5) % 360;
    for (let r = 0; r <= radius; r++) {
      const c = scale(hslToRgb(hue, 1, 0.5), bright * (1 - r / (radius + 1)));
      if (center + r < n) pixels[center + r] = c;
      if (center - r >= 0) pixels[center - r] = c;
    }
  }
  return pixels;
};

// ── Effects 90–99 ─────────────────────────────────────────────────────────────

// 90: Fireworks 1D (rocket + burst)
const fireworks1D: EffectFn = (t, seg, n) => {
  const pixels: RGBTriple[] = Array(n).fill([0, 0, 0] as RGBTriple);
  const numRockets = 1 + Math.round(seg.ix / 85);
  for (let r = 0; r < numRockets; r++) {
    const period = speedMs(seg.sx, 600, 8000);
    const frac = ((t + r * 3100) % period) / period;
    const hue = (r * 113.5 + Math.floor((t + r * 3100) / period) * 60) % 360;
    if (frac < 0.4) {
      const pos = clamp(Math.round(frac / 0.4 * (n - 1)), 0, n - 1);
      pixels[pos] = [255, 220, 100];
      if (pos > 0) pixels[pos - 1] = scale([255, 150, 50] as RGBTriple, 0.5);
    } else {
      const ef = (frac - 0.4) / 0.6;
      const radius = Math.round(ef * n * 0.45);
      const bright = Math.max(0, 1 - ef * 1.4);
      const center = n - 1;
      for (let i = Math.max(0, center - radius); i <= Math.min(n - 1, center + radius); i++) {
        pixels[i] = scale(hslToRgb(hue, 1, 0.5), bright * (1 - Math.abs(i - center) / (radius + 1)));
      }
    }
  }
  return pixels;
};

// 91: Bouncing Balls; sx=Gravity, ix=# of balls, o1=Overlay
const bouncingBalls: EffectFn = (t, seg, n) => {
  const numBalls = Math.max(1, Math.round(1 + (seg.ix / 255) * 7));
  const pixels: RGBTriple[] = Array(n).fill(overlayBg(seg));
  for (let b = 0; b < numBalls; b++) {
    const period = speedMs(seg.sx, 300, 8000) * (1 + b * 0.3);
    const height = Math.abs(Math.sin(((t + b * 1500) % period) / period * Math.PI));
    const pos = clamp(Math.round(height * (n - 1)), 0, n - 1);
    const c = hslToRgb((b / Math.max(numBalls, 1)) * 360, 1, 0.5);
    pixels[pos] = c;
    if (pos > 0) pixels[pos - 1] = scale(c, 0.5);
    if (pos < n - 1) pixels[pos + 1] = scale(c, 0.5);
  }
  return pixels;
};

// 92: Sinelon; ix=Trail
const sinelon: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 6000);
  const trail = Math.max(1, Math.round(1 + (seg.ix / 255) * 12));
  const pos = Math.floor(((Math.sin((t / period) * Math.PI * 2) + 1) / 2) * (n - 1));
  return Array.from({ length: n }, (_, i) => {
    const d = Math.abs(i - pos);
    if (d === 0) return seg.col[0];
    if (d < trail) return scale(seg.col[0], (1 - d / trail) ** 2);
    return [0, 0, 0] as RGBTriple;
  });
};

// 93: Sinelon Dual; ix=Trail
const sinelonDual: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 6000);
  const trail = Math.max(1, Math.round(1 + (seg.ix / 255) * 12));
  const pos1 = Math.floor(((Math.sin((t / period) * Math.PI * 2) + 1) / 2) * (n - 1));
  const pos2 = Math.floor(((Math.sin((t / period) * Math.PI * 2 + Math.PI) + 1) / 2) * (n - 1));
  return Array.from({ length: n }, (_, i) => {
    const d1 = Math.abs(i - pos1), d2 = Math.abs(i - pos2);
    if (d1 === 0) return seg.col[0];
    if (d2 === 0) return seg.col[1];
    if (d1 < trail) return scale(seg.col[0], (1 - d1 / trail) ** 2);
    if (d2 < trail) return scale(seg.col[1], (1 - d2 / trail) ** 2);
    return [0, 0, 0] as RGBTriple;
  });
};

// 94: Sinelon Rainbow; ix=Trail
const sinelonRainbow: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 6000);
  const trail = Math.max(1, Math.round(1 + (seg.ix / 255) * 12));
  const pos = Math.floor(((Math.sin((t / period) * Math.PI * 2) + 1) / 2) * (n - 1));
  const hue = (t % 5000) / 5000 * 360;
  const c = hslToRgb(hue, 1, 0.5);
  return Array.from({ length: n }, (_, i) => {
    const d = Math.abs(i - pos);
    if (d === 0) return c;
    if (d < trail) return scale(c, (1 - d / trail) ** 2);
    return [0, 0, 0] as RGBTriple;
  });
};

// 95: Popcorn
const popcorn: EffectFn = (t, seg, n) => {
  const numKernels = 3 + Math.round(seg.ix / 25);
  const pixels: RGBTriple[] = Array(n).fill([0, 0, 0] as RGBTriple);
  const palette = getPalette(seg.pal);
  for (let k = 0; k < numKernels; k++) {
    const period = speedMs(seg.sx, 300, 5000) * (0.5 + (k % 5) * 0.2);
    const frac = ((t + k * 1700) % period) / period;
    const pos = clamp(Math.round((1 - (2 * frac - 1) ** 2) * (n - 1)), 0, n - 1);
    const color = samplePalette(palette, k / numKernels);
    pixels[pos] = color;
    if (pos > 0) pixels[pos - 1] = scale(color, 0.4);
  }
  return pixels;
};

// 96: Drip; sx=Gravity, ix=# of drips, o1=Overlay
const drip: EffectFn = (t, seg, n) => {
  const numDrops = Math.max(1, Math.round(1 + (seg.ix / 255) * 6));
  const pixels: RGBTriple[] = Array(n).fill(overlayBg(seg));
  for (let d = 0; d < numDrops; d++) {
    const period = speedMs(seg.sx, 200, 6000) * (0.7 + d * 0.15);
    const frac = ((t + d * 2000) % period) / period;
    const pos = clamp(Math.round(frac ** 0.7 * (n - 1)), 0, n - 1);
    pixels[pos] = seg.col[0];
    if (pos > 0) pixels[pos - 1] = scale(seg.col[0], Math.max(0, 1 - frac * 3));
  }
  return pixels;
};

// 97: Plasma
const plasma: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 1000, 20000);
  return Array.from({ length: n }, (_, i) => {
    const x = i / n;
    const v = (Math.sin(x * 8 + t / speed * 3)
             + Math.sin(x * 4 - t / speed * 2)
             + Math.cos(x * 6 + t / speed * 1.5)) / 6 + 0.5;
    return samplePalette(palette, v);
  });
};

// 98: Percent (ix controls fill %)
const percent: EffectFn = (_t, seg, n) => {
  const fill = Math.round((seg.ix / 255) * n);
  return Array.from({ length: n }, (_, i) => i < fill ? seg.col[0] : seg.col[1]);
};

// 99: Ripple Rainbow
const rippleRainbow: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 400, 10000);
  const center = Math.floor(n / 2);
  const phase = (t % period) / period;
  const hue = (t % 10000) / 10000 * 360;
  return Array.from({ length: n }, (_, i) => {
    const dist = Math.abs(i - center) / n;
    const wave = Math.sin((dist * 10 - phase * 8) * Math.PI * 2);
    return scale(hslToRgb((hue + dist * 120) % 360, 1, 0.5), Math.max(0, wave) * Math.max(0, 1 - dist * 3));
  });
};

// ── Effects 100–109 ───────────────────────────────────────────────────────────

// 100: Heartbeat
const heartbeat: EffectFn = (t, seg, n) => {
  const period = 60000 / (40 + (seg.sx / 255) * 120);
  const phase = (t % period) / period;
  const bright = Math.max(
    Math.exp(-(((phase - 0.15) * 18) ** 2)),
    Math.exp(-(((phase - 0.30) * 18) ** 2)) * 0.6
  );
  return Array(n).fill(scale(seg.col[0], bright));
};

// 101: Pacifica
const pacifica: EffectFn = (t, seg, n) => {
  const s1 = t / speedMs(seg.sx, 1000, 12000);
  const s2 = t / speedMs(seg.sx, 800, 9000);
  return Array.from({ length: n }, (_, i) => {
    const x = i / n;
    const depth = (Math.sin(x * 7 + s1) + 1) / 2 * 0.4
                + (Math.sin(x * 4.5 - s2 * 1.3) + 1) / 2 * 0.35
                + (Math.cos(x * 11 + s1 * 0.7) + 1) / 2 * 0.25;
    return [Math.round(depth * 25), Math.round(60 + depth * 120), Math.round(140 + depth * 115)] as RGBTriple;
  });
};

// 102: Candle Multi
const candleMulti: EffectFn = (t, seg, n) => {
  const base = seg.col[0][0] + seg.col[0][1] + seg.col[0][2] > 0 ? seg.col[0] : [255, 100, 20] as RGBTriple;
  const numCandles = Math.max(2, Math.round(seg.ix / 30) + 2);
  return Array.from({ length: n }, (_, i) => {
    const c = Math.floor((i / n) * numCandles);
    const r1 = (Math.sin(Math.floor(t / 70 + c * 100) * 3.71 + c * 2.13) + 1) / 2;
    const r2 = (Math.sin(Math.floor(t / 40 + c * 300 + i) * 7.31 - c * 4.27) + 1) / 2;
    return scale(base, 0.45 + r1 * 0.35 + r2 * 0.2);
  });
};

// 103: Solid Glitter
const solidGlitter: EffectFn = (t, seg, n) => {
  const sparkRate = 0.97 + (seg.ix / 255) * 0.02;
  const seed = Math.floor(t / 60);
  return Array.from({ length: n }, (_, i) =>
    prng(seed * 1000 + i) > sparkRate ? [255, 255, 255] as RGBTriple : seg.col[0]);
};

// 104: Sunrise
const sunrise: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 5000, 120000);
  const phase = (t % period) / period;
  return Array.from({ length: n }, (_, i) => {
    const light = clamp((phase - (i / n) * 0.2) * 3, 0, 1);
    if (light <= 0) return [0, 0, 5] as RGBTriple;
    if (light < 0.3) return [Math.round(light / 0.3 * 180), Math.round(light / 0.3 * 40), Math.round(light / 0.3 * 10)] as RGBTriple;
    if (light < 0.7) {
      const f = (light - 0.3) / 0.4;
      return [Math.round(180 + f * 75), Math.round(40 + f * 140), Math.round(10 + f * 100)] as RGBTriple;
    }
    const f = (light - 0.7) / 0.3;
    return [255, Math.round(180 + f * 75), Math.round(110 + f * 145)] as RGBTriple;
  });
};

// 105: Phased
const phased: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 500, 12000);
  const palette = getPalette(seg.pal);
  return Array.from({ length: n }, (_, i) => {
    const phase = (i / n * Math.PI * 2) + (t / period * Math.PI * 2);
    return samplePalette(palette, (Math.sin(phase) * Math.sin(phase * 2.3) + 1) / 2);
  });
};

// 106: Twinkleup
const twinkleup: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  return Array.from({ length: n }, (_, i) => {
    const cycleLen = speedMs(seg.sx, 200, 4000);
    const phase = ((t + (i / n) * cycleLen * 3) % cycleLen) / cycleLen;
    const bright = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    return scale(samplePalette(palette, (Math.sin(i * 2.39) + 1) / 2), Math.pow(bright, 2));
  });
};

// 107: Noise Pal
const noisePal: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 800, 18000);
  return Array.from({ length: n }, (_, i) => {
    const f = i / n;
    const v = (Math.sin(f * 9 + t / speed * 3.1) * Math.cos(f * 5 - t / speed * 1.9)
             + Math.sin(f * 3.7 + t / speed * 2.3)) / 4 + 0.5;
    return samplePalette(palette, v);
  });
};

// 108: Sine
const sine: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 500, 15000);
  const palette = getPalette(seg.pal);
  return Array.from({ length: n }, (_, i) =>
    samplePalette(palette, (Math.sin(i / n * Math.PI * 4 - t / period * Math.PI * 2) + 1) / 2));
};

// 109: Phased Noise
const phasedNoise: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 500, 12000);
  return Array.from({ length: n }, (_, i) => {
    const f = i / n;
    const noise = Math.sin(f * 7 + t / speed * 2) * Math.sin(f * 3.3 - t / speed);
    return samplePalette(palette, (Math.sin(f * Math.PI * 2 + t / speed * Math.PI * 2 + noise) + 1) / 2);
  });
};

// ── Effects 110–117 ───────────────────────────────────────────────────────────

// 110: Flow
const flow: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const offset = (t % speedMs(seg.sx, 300, 8000)) / speedMs(seg.sx, 300, 8000);
  return Array.from({ length: n }, (_, i) => samplePalette(palette, ((i / n) + offset) % 1));
};

// 111: Chunchun (chunky palette blocks flowing)
const chunchun: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 200, 5000);
  const blockSize = Math.max(1, Math.round(seg.ix / 30) + 1);
  const numBlocks = Math.ceil(n / blockSize);
  const offset = Math.floor((t % speed) / speed * numBlocks);
  return Array.from({ length: n }, (_, i) =>
    samplePalette(palette, (Math.floor(i / blockSize) + offset) % numBlocks / numBlocks));
};

// 112: Dancing Shadows
const dancingShadows: EffectFn = (t, seg, n) => {
  const speed = speedMs(seg.sx, 500, 15000);
  const numShadows = 2 + Math.round(seg.ix / 64);
  const base = Array.from({ length: n }, (_, i) =>
    hslToRgb(((i / n) * 180 + t / 10000 * 60) % 360, 1, 0.5)) as RGBTriple[];
  for (let s = 0; s < numShadows; s++) {
    const pos = Math.round(((Math.sin(t / speed * (1 + s * 0.4) + s) + 1) / 2) * (n - 1));
    const width = Math.round(n * 0.1 + s * 2);
    for (let i = Math.max(0, pos - width); i <= Math.min(n - 1, pos + width); i++) {
      base[i] = scale(base[i], Math.abs(i - pos) / width);
    }
  }
  return base;
};

// 113: Washing Machine
const washingMachine: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const speed = speedMs(seg.sx, 800, 15000);
  const offset = (Math.sin(t / speed * Math.PI * 2) + 1) / 2;
  return Array.from({ length: n }, (_, i) => samplePalette(palette, ((i / n) + offset) % 1));
};

// 114: Candy Cane
const candyCane: EffectFn = (t, seg, n) => {
  const period = speedMs(seg.sx, 200, 4000);
  const stripeSize = Math.max(2, Math.round(seg.ix / 20) + 2);
  const offset = Math.floor((t % period) / (period / (stripeSize * 2)));
  const red: RGBTriple = [255, 0, 0];
  const white: RGBTriple = [255, 255, 255];
  return Array.from({ length: n }, (_, i) =>
    ((i + offset) % (stripeSize * 2)) < stripeSize ? red : white);
};

// 115: Blends
const blends: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const offset = (t % speedMs(seg.sx, 500, 15000)) / speedMs(seg.sx, 500, 15000);
  return Array.from({ length: n }, (_, i) =>
    samplePalette(palette, (Math.sin((i / n + offset) * Math.PI * 6) + 1) / 2));
};

// 116: TV Simulator
const tvSimulator: EffectFn = (t, seg, n) => {
  const frame = Math.floor(t / (33 + Math.round((255 - seg.sx) / 255 * 200)));
  return Array.from({ length: n }, (_, i) => [
    Math.round(prng(frame * 1000 + i) * 255),
    Math.round(prng(frame * 2000 + i) * 255),
    Math.round(prng(frame * 3000 + i) * 255),
  ] as RGBTriple);
};

// 117: Dynamic Smooth
const dynamicSmooth: EffectFn = (t, seg, n) => {
  const palette = getPalette(seg.pal);
  const period = speedMs(seg.sx, 500, 15000);
  return Array.from({ length: n }, (_, i) =>
    samplePalette(palette, (Math.sin(((i * 37.5 / n) + t / period) % 1 * Math.PI * 2) + 1) / 2));
};

// ── Effect Registry ───────────────────────────────────────────────────────────

export const CUSTOM_EFFECTS_MAP = new Map<number, EffectFn>();

export const EFFECTS: Record<number, EffectFn> = {
  0:   solid,
  1:   blink,
  2:   breathe,
  3:   wipe,
  4:   wipeRandom,
  5:   randomColors,
  6:   sweep,
  7:   dynamic,
  8:   rainbow,
  9:   rainbowCycle,
  10:  scan,
  11:  dualScan,
  12:  fade,
  13:  theater,
  14:  theaterRainbow,
  15:  running,
  16:  saw,
  17:  twinkle,
  18:  dissolve,
  19:  dissolveRnd,
  20:  sparkle,
  21:  sparklePlus,
  22:  hyperSparkle,
  23:  strobe,
  24:  strobeRainbow,
  25:  megaStrobe,
  26:  blinkRainbow,
  27:  android,
  28:  chase,
  29:  chaseRandom,
  30:  chaseRainbow,
  31:  chaseFlash,
  32:  chaseFlashRnd,
  33:  rainbowRunner,
  34:  colorful,
  35:  trafficLight,
  36:  sweepRandom,
  37:  running2,
  38:  aurora,
  39:  stream,
  40:  scanner,
  41:  meteor,
  42:  fireworksParticles,
  43:  rain,
  44:  tetrix,
  45:  fireFlicker,
  46:  gradient,
  47:  loading,
  48:  police,
  49:  fairy,
  50:  twoDots,
  51:  fairyTwinkle,
  52:  runningDual,
  53:  halloween,
  54:  triChase,
  55:  triWipe,
  56:  triFade,
  57:  lightning,
  58:  icu,
  59:  multiComet,
  60:  scannerDual,
  61:  stream2,
  62:  oscillate,
  63:  pride2015,
  64:  juggle,
  65:  paletteScroll,
  66:  fire2012,
  67:  colorwaves,
  68:  bpm,
  69:  fillNoise8,
  70:  noise1,
  71:  noise2,
  72:  noise3,
  73:  noise4,
  74:  colortwinkle,
  75:  lake,
  76:  meteorSmooth,
  77:  smoothMeteor,
  78:  railway,
  79:  ripple,
  80:  twinklefox,
  81:  twinklecat,
  82:  halloweenEyes,
  83:  solidPattern,
  84:  solidPatternTri,
  85:  spots,
  86:  spotsFade,
  87:  glitter,
  88:  candle,
  89:  fireworksStarburst,
  90:  fireworks1D,
  91:  bouncingBalls,
  92:  sinelon,
  93:  sinelonDual,
  94:  sinelonRainbow,
  95:  popcorn,
  96:  drip,
  97:  plasma,
  98:  percent,
  99:  rippleRainbow,
  100: heartbeat,
  101: pacifica,
  102: candleMulti,
  103: solidGlitter,
  104: sunrise,
  105: phased,
  106: twinkleup,
  107: noisePal,
  108: sine,
  109: phasedNoise,
  110: flow,
  111: chunchun,
  112: dancingShadows,
  113: washingMachine,
  114: candyCane,
  115: blends,
  116: tvSimulator,
  117: dynamicSmooth,
};

export function runEffect(time: number, seg: WLEDSegment, count: number): RGBTriple[] {
  const fn = CUSTOM_EFFECTS_MAP.get(seg.fx) ?? EFFECTS[seg.fx] ?? solid;
  try {
    const result = fn(time, seg, count);
    if (seg.rev) result.reverse();
    return result;
  } catch {
    return Array(count).fill([0, 0, 0] as RGBTriple);
  }
}

// Names match official WLED /json/effects (FX.h _data strings). Index = effect ID.
export const EFFECTS_NAMES: string[] = [
  /* 0 */   'Solid',
  /* 1 */   'Blink',
  /* 2 */   'Breathe',
  /* 3 */   'Wipe',
  /* 4 */   'Wipe Random',
  /* 5 */   'Random Colors',
  /* 6 */   'Sweep',
  /* 7 */   'Dynamic',
  /* 8 */   'Rainbow',
  /* 9 */   'Rainbow Cycle',
  /* 10 */  'Scan',
  /* 11 */  'Dual Scan',
  /* 12 */  'Fade',
  /* 13 */  'Theater',
  /* 14 */  'Theater Rainbow',
  /* 15 */  'Running',
  /* 16 */  'Saw',
  /* 17 */  'Twinkle',
  /* 18 */  'Dissolve',
  /* 19 */  'Dissolve Rnd',
  /* 20 */  'Sparkle',
  /* 21 */  'Sparkle+',
  /* 22 */  'Hyper Sparkle',
  /* 23 */  'Strobe',
  /* 24 */  'Strobe Rainbow',
  /* 25 */  'Mega Strobe',
  /* 26 */  'Blink Rainbow',
  /* 27 */  'Android',
  /* 28 */  'Chase',
  /* 29 */  'Chase Random',
  /* 30 */  'Chase Rainbow',
  /* 31 */  'Chase Flash',
  /* 32 */  'Chase Flash Rnd',
  /* 33 */  'Rainbow Runner',
  /* 34 */  'Colorful',
  /* 35 */  'Traffic Light',
  /* 36 */  'Sweep Random',
  /* 37 */  'Running 2',
  /* 38 */  'Aurora',
  /* 39 */  'Stream',
  /* 40 */  'Scanner',
  /* 41 */  'Lighthouse',
  /* 42 */  'Fireworks',
  /* 43 */  'Rain',
  /* 44 */  'Tetrix',
  /* 45 */  'Fire Flicker',
  /* 46 */  'Gradient',
  /* 47 */  'Loading',
  /* 48 */  'Police',
  /* 49 */  'Fairy',
  /* 50 */  'Two Dots',
  /* 51 */  'Fairy Twinkle',
  /* 52 */  'Running Dual',
  /* 53 */  'Halloween',
  /* 54 */  'Tri Chase',
  /* 55 */  'Tri Wipe',
  /* 56 */  'Tri Fade',
  /* 57 */  'Lightning',
  /* 58 */  'ICU',
  /* 59 */  'Multi Comet',
  /* 60 */  'Scanner Dual',
  /* 61 */  'Stream 2',
  /* 62 */  'Oscillate',
  /* 63 */  'Pride 2015',
  /* 64 */  'Juggle',
  /* 65 */  'Palette',
  /* 66 */  'Fire 2012',
  /* 67 */  'Colorwaves',
  /* 68 */  'BPM',
  /* 69 */  'Fill Noise 8',
  /* 70 */  'Noise 1',
  /* 71 */  'Noise 2',
  /* 72 */  'Noise 3',
  /* 73 */  'Noise 4',
  /* 74 */  'Colortwinkle',
  /* 75 */  'Lake',
  /* 76 */  'Meteor',
  /* 77 */  'Smooth Meteor',
  /* 78 */  'Railway',
  /* 79 */  'Ripple',
  /* 80 */  'Twinklefox',
  /* 81 */  'Twinklecat',
  /* 82 */  'Halloween Eyes',
  /* 83 */  'Solid Pattern',
  /* 84 */  'Solid Pattern Tri',
  /* 85 */  'Spots',
  /* 86 */  'Spots Fade',
  /* 87 */  'Glitter',
  /* 88 */  'Candle',
  /* 89 */  'Fireworks Starburst',
  /* 90 */  'Fireworks 1D',
  /* 91 */  'Bouncing Balls',
  /* 92 */  'Sinelon',
  /* 93 */  'Sinelon Dual',
  /* 94 */  'Sinelon Rainbow',
  /* 95 */  'Popcorn',
  /* 96 */  'Drip',
  /* 97 */  'Plasma',
  /* 98 */  'Percent',
  /* 99 */  'Ripple Rainbow',
  /* 100 */ 'Heartbeat',
  /* 101 */ 'Pacifica',
  /* 102 */ 'Candle Multi',
  /* 103 */ 'Solid Glitter',
  /* 104 */ 'Sunrise',
  /* 105 */ 'Phased',
  /* 106 */ 'Twinkleup',
  /* 107 */ 'Noise Pal',
  /* 108 */ 'Sine',
  /* 109 */ 'Phased Noise',
  /* 110 */ 'Flow',
  /* 111 */ 'Chunchun',
  /* 112 */ 'Dancing Shadows',
  /* 113 */ 'Washing Machine',
  /* 114 */ 'Candy Cane',
  /* 115 */ 'Blends',
  /* 116 */ 'TV Simulator',
  /* 117 */ 'Dynamic Smooth',
];
