import type { WLEDState, WLEDInfo, WLEDSegment, WLEDConfig, ApiRequest, ApiResponse, WLEDPreset } from './types';
import { EFFECTS_NAMES } from './effects';
import { PALETTE_NAMES } from './palettes';
import { makeDefaultSegment, makeInfo } from './defaults';

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function mergeSegments(current: WLEDSegment[], updates: Partial<WLEDSegment>[]): WLEDSegment[] {
  const result = current.map(s => ({ ...s }));
  for (const u of updates) {
    const id = u.id ?? 0;
    const idx = result.findIndex(s => s.id === id);
    if (idx !== -1) {
      const seg = { ...result[idx], ...u };
      seg.len = seg.stop - seg.start;
      if (u.col) {
        seg.col = [
          u.col[0] ?? result[idx].col[0],
          u.col[1] ?? result[idx].col[1],
          u.col[2] ?? result[idx].col[2],
        ];
      }
      result[idx] = seg;
    } else if (id >= result.length) {
      const prev = result[result.length - 1];
      const start = u.start ?? prev.stop;
      const stop = u.stop ?? Math.min(start + (u.len ?? 10), prev.stop);
      result.push({ ...makeDefaultSegment(id, start, stop), ...u });
    }
  }
  return result;
}

export function mergeState(current: WLEDState, update: Partial<WLEDState>): WLEDState {
  const s = { ...current };
  if (update.on !== undefined) s.on = update.on;
  if (update.bri !== undefined) s.bri = clamp(Number(update.bri), 0, 255);
  if (update.transition !== undefined) s.transition = update.transition;
  if (update.ps !== undefined) s.ps = update.ps;
  if (update.pl !== undefined) s.pl = update.pl;
  if (update.lor !== undefined) s.lor = update.lor;
  if (update.mainseg !== undefined) s.mainseg = update.mainseg;
  if (update.nl !== undefined) s.nl = { ...current.nl, ...update.nl };
  if (update.udpn !== undefined) s.udpn = { ...current.udpn, ...update.udpn };
  if (update.seg !== undefined) s.seg = mergeSegments(current.seg, update.seg);
  return s;
}

function processWinApi(state: WLEDState, params: URLSearchParams): WLEDState {
  const s = { ...state };
  const seg = { ...s.seg[0] };
  if (params.has('T')) {
    const t = parseInt(params.get('T')!);
    s.on = t === 2 ? !s.on : t !== 0;
  }
  if (params.has('A')) s.bri = clamp(parseInt(params.get('A')!), 0, 255);
  if (params.has('FX')) seg.fx = clamp(parseInt(params.get('FX')!), 0, 499);
  if (params.has('SX')) seg.sx = clamp(parseInt(params.get('SX')!), 0, 255);
  if (params.has('IX')) seg.ix = clamp(parseInt(params.get('IX')!), 0, 255);
  if (params.has('FP')) seg.pal = parseInt(params.get('FP')!);
  const col: [number, number, number] = [...seg.col[0]];
  if (params.has('R')) col[0] = clamp(parseInt(params.get('R')!), 0, 255);
  if (params.has('G')) col[1] = clamp(parseInt(params.get('G')!), 0, 255);
  if (params.has('B')) col[2] = clamp(parseInt(params.get('B')!), 0, 255);
  seg.col = [col, seg.col[1], seg.col[2]];
  s.seg = [seg, ...s.seg.slice(1)];
  return s;
}

export function processApiRequest(
  req: ApiRequest,
  state: WLEDState,
  config: WLEDConfig,
  presets: Record<number, WLEDPreset>,
  onStateUpdate: (newState: WLEDState) => void,
  onPresetUpdate: (presets: Record<number, WLEDPreset>) => void,
): ApiResponse {
  const { method, pathname, search, body } = req;
  const info: WLEDInfo = makeInfo(config);

  if (method === 'OPTIONS') return { response: {}, status: 204 };

  const path = pathname.replace(/\/$/, '');

  if ((path === '/json' || path === '') && method === 'GET') {
    return { response: { ...state, info }, status: 200 };
  }

  if (path === '/json/state') {
    if (method === 'GET') return { response: state, status: 200 };
    if (method === 'POST') {
      try {
        const update = JSON.parse(body || '{}') as Partial<WLEDState> & { psave?: number; pdel?: number };
        // Save preset: psave + n field
        if (update.psave !== undefined) {
          const id = update.psave;
          const name = (update as Record<string, unknown>).n as string ?? `Preset ${id}`;
          const preset: WLEDPreset = { id, n: name, on: state.on, bri: state.bri, transition: state.transition, seg: state.seg };
          onPresetUpdate({ ...presets, [id]: preset });
          return { response: { ...state, ps: id }, status: 200 };
        }
        // Delete preset
        if (update.pdel !== undefined) {
          const p = { ...presets };
          delete p[update.pdel];
          onPresetUpdate(p);
          return { response: { success: true }, status: 200 };
        }
        let newState = mergeState(state, update);
        // Load preset via ps field
        if (update.ps !== undefined && update.ps >= 1 && presets[update.ps]) {
          const preset = presets[update.ps];
          newState = mergeState(newState, {
            on: preset.on,
            bri: preset.bri,
            transition: preset.transition,
            seg: preset.seg as WLEDState['seg'],
          });
        }
        onStateUpdate(newState);
        return { response: newState, status: 200 };
      } catch {
        return { response: { error: 'Invalid JSON' }, status: 400 };
      }
    }
  }

  if (path === '/json/info' && method === 'GET') return { response: info, status: 200 };
  if (path === '/json/si' && method === 'GET') return { response: { ...state, info }, status: 200 };
  if (path === '/json/effects' && method === 'GET') return { response: EFFECTS_NAMES, status: 200 };
  if (path === '/json/palettes' && method === 'GET') return { response: PALETTE_NAMES, status: 200 };

  if (path === '/json/cfg' && method === 'GET') {
    return { response: { id: { name: config.name, mdns: 'wled-sim', ip: config.ip } }, status: 200 };
  }

  // /json/presets
  if (path === '/json/presets') {
    if (method === 'GET') return { response: presets, status: 200 };
    if (method === 'POST') {
      try {
        const update = JSON.parse(body || '{}') as WLEDPreset;
        if (update.id) {
          onPresetUpdate({ ...presets, [update.id]: update });
          return { response: { success: true }, status: 200 };
        }
        return { response: { error: 'id required' }, status: 400 };
      } catch {
        return { response: { error: 'Invalid JSON' }, status: 400 };
      }
    }
  }

  // /win HTTP API
  if (path === '/win') {
    try {
      const params = new URLSearchParams(search.replace(/^\?/, ''));
      if (method === 'POST' && body) {
        new URLSearchParams(body).forEach((v, k) => params.set(k, v));
      }
      const newState = processWinApi(state, params);
      onStateUpdate(newState);
      return { response: 'OK', status: 200 };
    } catch {
      return { response: 'ERR', status: 400 };
    }
  }

  return { response: { error: 'Not found', path }, status: 404 };
}
