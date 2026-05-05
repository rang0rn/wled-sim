import { useState } from 'react';
import { Zap, Palette as PaletteIcon, Search, Code2, Check } from 'lucide-react';
import { useWledStore } from '../store/wledStore';
import { EFFECTS_NAMES } from '../wled/effects';
import { PALETTE_NAMES } from '../wled/palettes';

const IMPLEMENTED = new Set(Array.from({ length: 118 }, (_, i) => i));

// sx/ix: string = label, null = hide slider, undefined = use default ('Speed'/'Intensity')
interface EffectParams {
  sx?: string | null;
  ix?: string | null;
  c1?: string;
  c2?: string;
  c3?: string;
  o1?: string;
  o2?: string;
  o3?: string;
}

// Complete parameter table for all 118 WLED effects (IDs 0–117).
// Only effects that differ from the Speed/Intensity defaults need entries.
const EFFECT_PARAMS: Record<number, EffectParams> = {
  // 0: Solid — no sliders needed
  1:   { ix: 'Duty cycle' },
  2:   { ix: null },
  4:   { ix: null },
  5:   { ix: 'Fade time' },
  7:   { o1: 'Smooth' },
  8:   { ix: 'Saturation' },
  9:   { ix: 'Size' },
  10:  { ix: '# of dots', o1: 'Overlay' },
  11:  { ix: '# of dots', o1: 'Overlay' },
  12:  { ix: null },
  13:  { ix: 'Gap size' },
  14:  { ix: 'Gap size' },
  15:  { ix: 'Wave width' },
  16:  { ix: 'Width' },
  18:  { sx: 'Repeat spd', ix: 'Dissolve spd', o1: 'Random', o2: 'Complete' },
  19:  { sx: 'Repeat spd', ix: 'Dissolve spd' },
  20:  { ix: null, o1: 'Overlay' },
  21:  { o1: 'Overlay' },
  22:  { o1: 'Overlay' },
  23:  { ix: null },
  24:  { ix: null },
  26:  { sx: 'Frequency', ix: 'Blink duration' },
  27:  { ix: 'Width' },
  28:  { ix: 'Width' },
  29:  { ix: 'Width' },
  30:  { ix: 'Width' },
  31:  { ix: null },
  32:  { ix: null },
  33:  { ix: 'Size' },
  34:  { ix: 'Saturation' },
  35:  { ix: 'US style' },
  36:  { ix: null },
  37:  { ix: 'Width' },
  39:  { ix: 'Zone size' },
  40:  { ix: 'Trail', c1: 'Delay', o1: 'Dual', o2: 'Bi-delay' },
  41:  { ix: 'Fade rate' },
  42:  { sx: null, ix: 'Frequency' },
  43:  { ix: 'Spawning rate' },
  44:  { ix: 'Width', o1: 'One color' },
  46:  { ix: 'Spread' },
  47:  { ix: 'Fade' },
  48:  { ix: null },
  49:  { ix: '# of flashers' },
  50:  { ix: 'Dot size', o1: 'Overlay' },
  52:  { ix: 'Wave width' },
  53:  { ix: null },
  54:  { ix: 'Size' },
  55:  { ix: null },
  56:  { ix: null },
  57:  { o1: 'Overlay' },
  58:  { o1: 'Overlay' },
  59:  { ix: 'Fade' },
  60:  { ix: 'Trail', c1: 'Delay', o1: 'Dual', o2: 'Bi-delay' },
  61:  { ix: null },
  63:  { ix: null },
  64:  { ix: 'Trail' },
  65:  { sx: 'Shift', ix: 'Size', o1: 'Animate shift', o2: 'Animate rotation' },
  66:  { sx: 'Cooling', ix: 'Spark rate', c2: '2D Blur', c3: 'Boost' },
  67:  { ix: 'Hue' },
  74:  { sx: 'Fade speed', ix: 'Spawn speed' },
  76:  { ix: 'Trail', o1: 'Gradient', o3: 'Smooth' },
  77:  { ix: 'Trail' },
  78:  { ix: 'Smoothness' },
  79:  { ix: 'Wave #', c1: 'Blur', o1: 'Overlay' },
  80:  { ix: 'Twinkle rate', o1: 'Cool' },
  81:  { ix: 'Twinkle rate', o1: 'Cool', o2: 'Reverse' },
  82:  { sx: 'Eye off time', ix: 'Eye on time', o1: 'Overlay' },
  83:  { sx: 'Fg size', ix: 'Bg size' },
  84:  { ix: 'Size' },
  85:  { sx: 'Spread', ix: 'Width', o1: 'Overlay' },
  86:  { sx: 'Spread', ix: 'Width', o1: 'Overlay' },
  87:  { o1: 'Overlay' },
  89:  { sx: 'Chance', ix: 'Fragments', o1: 'Overlay' },
  90:  { sx: 'Gravity', ix: 'Firing side' },
  91:  { sx: 'Gravity', ix: '# of balls', o1: 'Overlay' },
  92:  { ix: 'Trail' },
  93:  { ix: 'Trail' },
  94:  { ix: 'Trail' },
  95:  { o1: 'Overlay' },
  96:  { sx: 'Gravity', ix: '# of drips', o1: 'Overlay' },
  97:  { sx: 'Phase' },
  98:  { ix: '% of fill', o1: 'One color' },
  99:  { ix: 'Wave #' },
  101: { ix: 'Angle' },
  104: { sx: 'Time [min]', ix: 'Width' },
  107: { ix: 'Scale' },
  108: { ix: 'Scale' },
  110: { ix: 'Zones' },
  111: { ix: 'Gap size' },
  112: { ix: '# of shadows' },
  115: { sx: 'Shift speed', ix: 'Blend speed' },
};

export function EffectPanel() {
  const { state, setState, customEffects, setEditingCustomFxId, devMode, toggleDevMode } = useWledStore();
  const [tab, setTab] = useState<'effects' | 'custom' | 'colors' | 'palette'>('effects');
  const [search, setSearch] = useState('');

  const seg = state.seg.find(s => s.sel) ?? state.seg[0];

  const updateSeg = (patch: Record<string, unknown>) => {
    setState({
      ...state,
      seg: state.seg.map(s => s.id === seg.id ? { ...s, ...patch } : s),
    });
  };

  const filteredEffects = EFFECTS_NAMES
    .map((name, i) => ({ name, id: i }))
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#1e2130] shrink-0 flex-wrap">
        {[
          { id: 'effects', label: 'FX', icon: <Zap size={11} /> },
          { id: 'custom', label: 'Custom', icon: <Code2 size={11} /> },
          { id: 'colors', label: 'Colors', icon: null },
          { id: 'palette', label: 'Palette', icon: <PaletteIcon size={11} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`flex items-center gap-1 px-2 py-2 text-xs transition-colors flex-1 justify-center ${
              tab === t.id
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Effects tab */}
      {tab === 'effects' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-2 py-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#1a1d27] border border-[#2a2d3a] rounded px-2 py-1">
              <Search size={11} className="text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search effects..."
                className="bg-transparent text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-2 pb-2">
            {filteredEffects.map(({ name, id }) => (
              <button
                key={id}
                onClick={() => updateSeg({ fx: id })}
                className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors mb-0.5 ${
                  seg.fx === id
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                    : 'text-slate-400 hover:bg-[#1a1d27] hover:text-slate-200'
                }`}
              >
                <span>{name}</span>
                {!IMPLEMENTED.has(id) && (
                  <span className="text-[9px] text-slate-600 ml-1">soon</span>
                )}
              </button>
            ))}
          </div>

          {/* Effect parameters */}
          {(() => {
            const p = EFFECT_PARAMS[seg.fx] ?? {};
            const sxLabel = p.sx === undefined ? 'Speed' : p.sx;
            const ixLabel = p.ix === undefined ? 'Intensity' : p.ix;
            return (
              <div className="shrink-0 px-3 py-3 border-t border-[#1e2130] flex flex-col gap-2.5">
                {sxLabel !== null && (
                  <Slider label={sxLabel} value={seg.sx} onChange={v => updateSeg({ sx: v })} />
                )}
                {ixLabel !== null && (
                  <Slider label={ixLabel} value={seg.ix} onChange={v => updateSeg({ ix: v })} />
                )}
                {p.c1 && <Slider label={p.c1} value={seg.c1} onChange={v => updateSeg({ c1: v })} />}
                {p.c2 && <Slider label={p.c2} value={seg.c2} onChange={v => updateSeg({ c2: v })} />}
                {p.c3 && <Slider label={p.c3} value={seg.c3} onChange={v => updateSeg({ c3: v })} />}
                {p.o1 && <Toggle label={p.o1} value={seg.o1} onChange={v => updateSeg({ o1: v })} />}
                {p.o2 && <Toggle label={p.o2} value={seg.o2} onChange={v => updateSeg({ o2: v })} />}
                {p.o3 && <Toggle label={p.o3} value={seg.o3} onChange={v => updateSeg({ o3: v })} />}
              </div>
            );
          })()}
        </div>
      )}

      {/* Custom Effects tab */}
      {tab === 'custom' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-2 py-2">
            {customEffects.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Code2 size={24} className="text-slate-600" />
                <p className="text-[11px] text-slate-500">No custom effects yet.</p>
                <button
                  onClick={() => {
                    if (!devMode) toggleDevMode();
                    setEditingCustomFxId(null);
                  }}
                  className="px-3 py-1.5 text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded hover:bg-orange-500/30 transition-colors"
                >
                  Open Editor
                </button>
              </div>
            ) : (
              customEffects.map(fx => (
                <div
                  key={fx.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded mb-0.5 cursor-pointer group transition-colors ${
                    seg.fx === fx.id ? 'bg-orange-500/15 border border-orange-500/20' : 'hover:bg-[#1a1d27]'
                  }`}
                  onClick={() => updateSeg({ fx: fx.id })}
                >
                  <span className="text-[11px] text-slate-300 flex-1">{fx.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (!devMode) toggleDevMode(); setEditingCustomFxId(fx.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-violet-400 transition-all"
                    title="Edit"
                  >
                    <Code2 size={10} />
                  </button>
                  {seg.fx === fx.id && <Check size={10} className="text-orange-400 shrink-0" />}
                </div>
              ))
            )}
          </div>
          <div className="shrink-0 px-2 py-2 border-t border-[#1e2130]">
            <button
              onClick={() => { if (!devMode) toggleDevMode(); setEditingCustomFxId(null); }}
              className="w-full py-1.5 text-xs bg-[#1a1d27] text-slate-400 border border-[#2a2d3a] rounded hover:bg-[#252836] transition-colors flex items-center justify-center gap-1.5"
            >
              <Code2 size={11} className="text-orange-400" />
              Open Effect Editor
            </button>
          </div>
        </div>
      )}

      {/* Colors tab */}
      {tab === 'colors' && (
        <div className="flex flex-col gap-4 p-3 overflow-y-auto">
          {(['Primary', 'Secondary', 'Tertiary'] as const).map((label, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <label className="text-[11px] text-slate-500">{label} Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={rgbToHex(seg.col[i])}
                  onChange={e => {
                    const col = [...seg.col] as typeof seg.col;
                    col[i] = hexToRgb(e.target.value);
                    updateSeg({ col });
                  }}
                  className="w-8 h-8 rounded border border-[#2a2d3a] cursor-pointer bg-transparent"
                />
                <div className="flex gap-1 flex-1">
                  {['R', 'G', 'B'].map((ch, ci) => (
                    <input
                      key={ch}
                      type="number"
                      min={0}
                      max={255}
                      value={seg.col[i][ci]}
                      onChange={e => {
                        const col = seg.col.map(c => [...c]) as typeof seg.col;
                        col[i][ci] = Math.max(0, Math.min(255, Number(e.target.value)));
                        updateSeg({ col });
                      }}
                      className="input-field w-14 text-center text-[11px] py-1"
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Quick colors */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500">Quick</label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => {
                    const col = [...seg.col] as typeof seg.col;
                    col[0] = hexToRgb(c.hex);
                    updateSeg({ col });
                  }}
                  title={c.name}
                  style={{ background: c.hex }}
                  className="w-6 h-6 rounded border border-[#2a2d3a] hover:scale-110 transition-transform"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Palette tab */}
      {tab === 'palette' && (
        <div className="overflow-y-auto flex-1 px-2 py-2">
          {PALETTE_NAMES.map((name, id) => (
            <button
              key={id}
              onClick={() => updateSeg({ pal: id })}
              className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors mb-0.5 ${
                seg.pal === id
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                  : 'text-slate-400 hover:bg-[#1a1d27] hover:text-slate-200'
              }`}
            >
              <PaletteSwatch id={id} />
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, max = 255, onChange }: { label: string; value: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 w-16 shrink-0 truncate" title={label}>{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-orange-400"
      />
      <span className="text-[11px] font-mono text-slate-400 w-8 text-right shrink-0">{value}</span>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 w-16 shrink-0 truncate" title={label}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${value ? 'bg-orange-500' : 'bg-[#2a2d3a]'}`}
      >
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function PaletteSwatch({ id }: { id: number }) {
  const swatches: Record<number, string[]> = {
    0: ['#ff0000', '#00ff00', '#0000ff'],
    6: ['#ff00ff', '#0000ff', '#00ffff', '#00ff00', '#ffa500'],
    8: ['#000', '#ff0000', '#ffa500', '#ffff00'],
    9: ['#000', '#0000ff', '#00ffff', '#fff'],
    10: ['#000', '#006400', '#00ff00'],
    11: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#ee82ee'],
    35: ['#000', '#ff0000', '#ff6400', '#ffff00', '#ffffcc'],
    36: ['#000', '#00008b', '#00e5ff', '#fff'],
  };
  const colors = swatches[id] ?? ['#1a1d27', '#2a2d3a', '#3a3d4a'];
  return (
    <div className="flex rounded overflow-hidden w-8 h-3 shrink-0 border border-[#2a2d3a]">
      {colors.map((c, i) => (
        <div key={i} style={{ background: c, flex: 1 }} />
      ))}
    </div>
  );
}

function rgbToHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

const QUICK_COLORS = [
  { hex: '#ff0000', name: 'Red' },
  { hex: '#ff6600', name: 'Orange' },
  { hex: '#ffff00', name: 'Yellow' },
  { hex: '#00ff00', name: 'Green' },
  { hex: '#00ffff', name: 'Cyan' },
  { hex: '#0000ff', name: 'Blue' },
  { hex: '#ff00ff', name: 'Magenta' },
  { hex: '#ffffff', name: 'White' },
  { hex: '#ff6480', name: 'Pink' },
  { hex: '#ffa000', name: 'Amber' },
  { hex: '#00ff80', name: 'Mint' },
  { hex: '#8000ff', name: 'Purple' },
];
