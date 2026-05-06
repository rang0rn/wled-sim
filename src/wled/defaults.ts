import type { WLEDState, WLEDInfo, WLEDConfig, WLEDSegment } from './types';
import { EFFECTS_NAMES } from './effects';
import { PALETTE_NAMES } from './palettes';

export function makeDefaultSegment(id: number, start: number, stop: number): WLEDSegment {
  return {
    id,
    start,
    stop,
    len: stop - start,
    grp: 1,
    spc: 0,
    of: 0,
    on: true,
    frz: false,
    bri: 255,
    cct: 127,
    col: [[255, 160, 0], [0, 0, 0], [0, 0, 0]],
    fx: 0,
    sx: 128,
    ix: 128,
    c1: 128,
    c2: 128,
    c3: 128,
    pal: 0,
    sel: true,
    rev: false,
    mi: false,
    o1: false,
    o2: false,
    o3: false,
    si: 0,
    m12: 0,
  };
}

export function makeDefaultState(ledCount: number): WLEDState {
  return {
    on: true,
    bri: 128,
    transition: 7,
    ps: -1,
    pl: -1,
    nl: { on: false, dur: 60, mode: 1, tbri: 0, rem: -1 },
    udpn: { send: false, recv: true },
    lor: 0,
    mainseg: 0,
    seg: [makeDefaultSegment(0, 0, ledCount)],
  };
}

export function makeInfo(config: WLEDConfig): WLEDInfo {
  const { ledCount, is2D, matrixWidth, matrixHeight, name, ip } = config;
  return {
    ver: '0.14.4',
    vid: 2410140,
    leds: {
      count: ledCount,
      rgbw: false,
      wv: false,
      fps: 60,
      pwr: Math.round(ledCount * 0.3),
      maxpwr: 850,
      maxseg: 32,
      seglc: [ledCount],
      lc: ledCount,
      cct: 0,
      cr: 0,
      cb: 0,
      ic: 0,
      ...(is2D ? { matrix: { w: matrixWidth, h: matrixHeight } } : {}),
    },
    str: false,
    name,
    udpport: 21324,
    live: false,
    liveseg: -1,
    lm: '',
    lip: '',
    ws: 0,
    fxcount: EFFECTS_NAMES.length,
    palcount: PALETTE_NAMES.length,
    cpalcount: 0,
    maps: [],
    wifi: { bssid: '00:00:00:00:00:00', rssi: -60, signal: 75, channel: 1 },
    fs: { u: 32, t: 983, pmt: 0 },
    ndc: 0,
    arch: 'esp32',
    core: '2.0.14',
    lwip: 0,
    freeheap: 200000,
    uptime: 0,
    opt: 127,
    brand: 'WLED Sim',
    product: 'FOSS',
    mac: 'AA:BB:CC:DD:EE:FF',
    ip,
  };
}

export const DEFAULT_CONFIG: WLEDConfig = {
  ledCount: 30,
  is2D: false,
  matrixWidth: 16,
  matrixHeight: 8,
  name: 'WLED Simulator',
  ip: 'wled.sim',
  stripType: 'WS2812B',
};
