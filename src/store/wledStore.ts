import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { WLEDState, WLEDConfig, LogEntry, ApiRequest, WLEDPreset, CustomEffect } from '../wled/types';
import { processApiRequest } from '../wled/api';
import { makeDefaultState, DEFAULT_CONFIG } from '../wled/defaults';
import { compileCustomEffect, registerCustomEffect, unregisterCustomEffect, CUSTOM_EFFECT_ID_BASE } from '../wled/customEffects';

const STORAGE_KEY = 'wled-sim-v1';

interface WledStore {
  state: WLEDState;
  config: WLEDConfig;
  logs: LogEntry[];
  devMode: boolean;
  swUrl: string;
  swRegistered: boolean;
  presets: Record<number, WLEDPreset>;
  customEffects: CustomEffect[];
  editingCustomFxId: number | null;

  setState: (state: WLEDState) => void;
  updateConfig: (patch: Partial<WLEDConfig>) => void;
  applyConfigToState: () => void;
  toggleDevMode: () => void;
  setSwUrl: (url: string) => void;
  setSwRegistered: (v: boolean) => void;
  addLog: (entry: LogEntry) => void;
  clearLogs: () => void;
  handleApiRequest: (req: ApiRequest & { id: string; startTime: number }) => { response: unknown; status: number };
  // Presets
  savePreset: (id: number, name: string) => void;
  loadPreset: (id: number) => void;
  deletePreset: (id: number) => void;
  updatePresets: (presets: Record<number, WLEDPreset>) => void;
  // Custom effects
  addCustomEffect: (name: string, code: string) => { id: number; error?: string };
  updateCustomEffect: (id: number, patch: Partial<Pick<CustomEffect, 'name' | 'code'>>) => string | null;
  removeCustomEffect: (id: number) => void;
  setEditingCustomFxId: (id: number | null) => void;
}

function persist(store: UseBoundStore<StoreApi<WledStore>>) {
  let timer: ReturnType<typeof setTimeout>;
  store.subscribe((s: WledStore) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          state: s.state,
          config: s.config,
          presets: s.presets,
          customEffects: s.customEffects,
          swUrl: s.swUrl,
          devMode: s.devMode,
        }));
      } catch { /* quota exceeded etc */ }
    }, 400);
  });
}

function loadFromStorage(): Partial<WledStore> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<WledStore>;
  } catch {
    return null;
  }
}

function rehydrateCustomEffects(effects: CustomEffect[]) {
  for (const fx of effects) {
    const fn = compileCustomEffect(fx.code);
    if (typeof fn === 'function') registerCustomEffect(fx.id, fn);
  }
}

const saved = loadFromStorage();
if (saved?.customEffects) rehydrateCustomEffects(saved.customEffects);

function nextCustomFxId(effects: CustomEffect[]): number {
  const ids = effects.map(e => e.id);
  let id = CUSTOM_EFFECT_ID_BASE;
  while (ids.includes(id)) id++;
  return id;
}

export const useWledStore = create<WledStore>((set, get) => {
  const store: WledStore = {
    state: saved?.state ?? makeDefaultState(DEFAULT_CONFIG.ledCount),
    config: saved?.config ?? DEFAULT_CONFIG,
    logs: [],
    devMode: saved?.devMode ?? false,
    swUrl: saved?.swUrl ?? 'http://wled.sim',
    swRegistered: false,
    presets: saved?.presets ?? {},
    customEffects: saved?.customEffects ?? [],
    editingCustomFxId: null,

    setState: (state) => set({ state }),

    updateConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

    applyConfigToState: () => {
      const { config, state } = get();
      const newSeg = { ...state.seg[0], stop: config.ledCount, len: config.ledCount };
      set({ state: { ...state, seg: [newSeg, ...state.seg.slice(1)] } });
    },

    toggleDevMode: () => set((s) => ({ devMode: !s.devMode })),
    setSwUrl: (url) => set({ swUrl: url }),
    setSwRegistered: (v) => set({ swRegistered: v }),

    addLog: (entry) => set((s) => ({ logs: [entry, ...s.logs].slice(0, 200) })),
    clearLogs: () => set({ logs: [] }),

    handleApiRequest: (req) => {
      const { state, config, presets, addLog } = get();
      const start = req.startTime ?? Date.now();
      let parsedBody: unknown;
      try { parsedBody = req.body ? JSON.parse(req.body) : undefined; } catch { parsedBody = req.body; }

      const result = processApiRequest(req, state, config, presets,
        (newState) => set({ state: newState }),
        (newPresets) => set({ presets: newPresets }),
      );

      addLog({
        id: req.id,
        timestamp: start,
        method: req.method,
        url: req.url ?? `${get().swUrl}${req.pathname}${req.search}`,
        pathname: req.pathname,
        requestBody: parsedBody,
        responseBody: result.response,
        status: result.status,
        duration: Date.now() - start,
      });
      return result;
    },

    savePreset: (id, name) => {
      const { state } = get();
      const preset: WLEDPreset = {
        id,
        n: name,
        on: state.on,
        bri: state.bri,
        transition: state.transition,
        seg: state.seg,
      };
      set((s) => ({ presets: { ...s.presets, [id]: preset } }));
    },

    loadPreset: (id) => {
      const { presets, state } = get();
      const preset = presets[id];
      if (!preset) return;
      set({
        state: {
          ...state,
          on: preset.on ?? state.on,
          bri: preset.bri ?? state.bri,
          transition: preset.transition ?? state.transition,
          seg: (preset.seg as WLEDState['seg']) ?? state.seg,
          ps: id,
        },
      });
    },

    deletePreset: (id) => set((s) => {
      const p = { ...s.presets };
      delete p[id];
      return { presets: p };
    }),

    updatePresets: (presets) => set({ presets }),

    addCustomEffect: (name, code) => {
      const result = compileCustomEffect(code);
      if (typeof result === 'string') return { id: -1, error: result };
      const id = nextCustomFxId(get().customEffects);
      registerCustomEffect(id, result);
      const fx: CustomEffect = { id, name, code, createdAt: Date.now() };
      set((s) => ({ customEffects: [...s.customEffects, fx] }));
      return { id };
    },

    updateCustomEffect: (id, patch) => {
      const fx = get().customEffects.find(e => e.id === id);
      if (!fx) return 'Effect not found';
      const newCode = patch.code ?? fx.code;
      if (patch.code !== undefined) {
        const result = compileCustomEffect(newCode);
        if (typeof result === 'string') return result;
        registerCustomEffect(id, result);
      }
      set((s) => ({
        customEffects: s.customEffects.map(e =>
          e.id === id ? { ...e, ...patch } : e
        ),
      }));
      return null;
    },

    removeCustomEffect: (id) => {
      unregisterCustomEffect(id);
      set((s) => ({
        customEffects: s.customEffects.filter(e => e.id !== id),
        editingCustomFxId: s.editingCustomFxId === id ? null : s.editingCustomFxId,
      }));
    },

    setEditingCustomFxId: (id) => set({ editingCustomFxId: id }),
  };
  return store;
});

// Wire up localStorage persistence after store creation
persist(useWledStore);
