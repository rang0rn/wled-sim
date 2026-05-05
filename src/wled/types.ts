export type RGBTriple = [number, number, number];
export type ColorTriple = [RGBTriple, RGBTriple, RGBTriple];

export interface WLEDSegment {
  id: number;
  start: number;
  stop: number;
  len: number;
  grp: number;
  spc: number;
  of: number;
  on: boolean;
  frz: boolean;
  bri: number;
  cct: number;
  col: ColorTriple;
  fx: number;
  sx: number;
  ix: number;
  c1: number;
  c2: number;
  c3: number;
  pal: number;
  sel: boolean;
  rev: boolean;
  mi: boolean;
  o1: boolean;
  o2: boolean;
  o3: boolean;
  si: number;
  m12: number;
  // 2D
  startY?: number;
  stopY?: number;
}

export interface WLEDNightlight {
  on: boolean;
  dur: number;
  mode: number;
  tbri: number;
  rem: number;
}

export interface WLEDUdpNotify {
  send: boolean;
  recv: boolean;
}

export interface WLEDState {
  on: boolean;
  bri: number;
  transition: number;
  ps: number;
  pl: number;
  nl: WLEDNightlight;
  udpn: WLEDUdpNotify;
  lor: number;
  mainseg: number;
  seg: WLEDSegment[];
}

export interface WLEDInfo {
  ver: string;
  vid: number;
  leds: {
    count: number;
    rgbw: boolean;
    wv: boolean;
    fps: number;
    pwr: number;
    maxpwr: number;
    maxseg: number;
    seglc: number[];
    lc: number;
    cct: number;
    cr: number;
    cb: number;
    ic: number;
    matrix?: { w: number; h: number };
  };
  str: boolean;
  name: string;
  udpport: number;
  live: boolean;
  liveseg: number;
  lm: string;
  lip: string;
  ws: number;
  fxcount: number;
  palcount: number;
  cpalcount: number;
  maps: unknown[];
  wifi: { bssid: string; rssi: number; signal: number; channel: number };
  fs: { u: number; t: number; pmt: number };
  ndc: number;
  arch: string;
  core: string;
  lwip: number;
  freeheap: number;
  uptime: number;
  opt: number;
  brand: string;
  product: string;
  mac: string;
  ip: string;
}

export interface WLEDConfig {
  ledCount: number;
  is2D: boolean;
  matrixWidth: number;
  matrixHeight: number;
  name: string;
  ip: string;
}

export interface WLEDPreset {
  id: number;
  n: string;
  on?: boolean;
  bri?: number;
  transition?: number;
  seg?: Partial<WLEDSegment>[];
}

export interface CustomEffect {
  id: number;
  name: string;
  code: string;
  createdAt: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  pathname: string;
  requestBody: unknown;
  responseBody: unknown;
  status: number;
  duration: number;
}

export interface ApiRequest {
  method: string;
  url?: string;
  pathname: string;
  search: string;
  body: string | null;
}

export interface ApiResponse {
  response: unknown;
  status: number;
}
