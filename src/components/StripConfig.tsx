import { useState } from 'react';
import { Settings, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useWledStore } from '../store/wledStore';
import { makeDefaultSegment } from '../wled/defaults';
import { LED_STRIP_TYPES, LED_STRIP_CATEGORIES, getStripType } from '../wled/ledStrips';

export function StripConfig() {
  const { config, updateConfig, applyConfigToState, state, setState } = useWledStore();
  const [open, setOpen] = useState(true);

  const [localCount, setLocalCount] = useState(config.ledCount.toString());
  const [localW, setLocalW] = useState(config.matrixWidth.toString());
  const [localH, setLocalH] = useState(config.matrixHeight.toString());

  const apply = () => {
    const count = Math.max(1, Math.min(1024, parseInt(localCount) || config.ledCount));
    const w = Math.max(2, Math.min(64, parseInt(localW) || config.matrixWidth));
    const h = Math.max(2, Math.min(64, parseInt(localH) || config.matrixHeight));
    updateConfig({ ledCount: count, matrixWidth: w, matrixHeight: h });
    applyConfigToState();
  };

  const addSegment = () => {
    const last = state.seg[state.seg.length - 1];
    const start = last.stop;
    const stop = Math.min(start + 10, config.ledCount);
    if (start >= config.ledCount) return;
    const newSeg = makeDefaultSegment(state.seg.length, start, stop);
    setState({ ...state, seg: [...state.seg, newSeg] });
  };

  const removeSegment = (id: number) => {
    if (state.seg.length <= 1) return;
    setState({ ...state, seg: state.seg.filter(s => s.id !== id) });
  };

  const updateSegment = (id: number, key: string, value: unknown) => {
    setState({
      ...state,
      seg: state.seg.map(s => s.id === id ? { ...s, [key]: value } : s),
    });
  };

  return (
    <div className="flex flex-col gap-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#1a1d27] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Settings size={12} className="text-orange-400" />
          <span>Strip Config</span>
        </div>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-3">
          {/* LED Count */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500">LED Count</label>
            <input
              type="number"
              min={1}
              max={1024}
              value={localCount}
              onChange={e => setLocalCount(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Strip Type */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500">Strip Type</label>
            <select
              value={config.stripType ?? 'WS2812B'}
              onChange={e => updateConfig({ stripType: e.target.value })}
              className="input-field text-[11px]"
            >
              {LED_STRIP_CATEGORIES.map(cat => {
                const strips = LED_STRIP_TYPES.filter(s => s.category === cat);
                if (strips.length === 0) return null;
                return (
                  <optgroup key={cat} label={cat}>
                    {strips.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {(() => {
              const strip = getStripType(config.stripType);
              if (!strip) return null;
              return (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <span className="text-[10px] text-slate-500">
                    {strip.voltage} · {strip.colorOrder} · {strip.dataPins === 2 ? 'CLK + DATA' : 'DATA'}
                  </span>
                  {strip.ledsPerPixel > 1 && (
                    <span className="text-[10px] text-orange-400 font-medium">
                      {strip.ledsPerPixel} physical LEDs per WLED pixel
                    </span>
                  )}
                  {strip.notes && (
                    <span className="text-[10px] text-slate-600">{strip.notes}</span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Layout mode */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500">Layout</label>
            <div className="flex gap-1">
              {['1D', '2D'].map(mode => (
                <button
                  key={mode}
                  onClick={() => updateConfig({ is2D: mode === '2D' })}
                  className={`flex-1 py-1 text-xs rounded transition-colors ${
                    config.is2D === (mode === '2D')
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-[#1a1d27] text-slate-400 border border-[#2a2d3a] hover:bg-[#252836]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* 2D settings */}
          {config.is2D && (
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[11px] text-slate-500">Width</label>
                <input
                  type="number"
                  min={2}
                  max={64}
                  value={localW}
                  onChange={e => setLocalW(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[11px] text-slate-500">Height</label>
                <input
                  type="number"
                  min={2}
                  max={64}
                  value={localH}
                  onChange={e => setLocalH(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          )}

          <button
            onClick={apply}
            className="w-full py-1.5 text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded hover:bg-orange-500/30 transition-colors"
          >
            Apply
          </button>

          {/* Segments */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-500">Segments</label>
              <button
                onClick={addSegment}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-orange-400 transition-colors"
              >
                <Plus size={11} /> Add
              </button>
            </div>

            {state.seg.map(seg => (
              <div key={seg.id} className="bg-[#1a1d27] rounded border border-[#2a2d3a] p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300">Seg {seg.id}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seg.on}
                        onChange={e => updateSegment(seg.id, 'on', e.target.checked)}
                        className="accent-orange-400 w-3 h-3"
                      />
                      on
                    </label>
                    {state.seg.length > 1 && (
                      <button onClick={() => removeSegment(seg.id)}>
                        <Trash2 size={11} className="text-slate-500 hover:text-red-400 transition-colors" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <div className="flex flex-col gap-0.5 flex-1">
                    <label className="text-[10px] text-slate-600">Start</label>
                    <input
                      type="number"
                      min={0}
                      max={config.ledCount - 1}
                      value={seg.start}
                      onChange={e => updateSegment(seg.id, 'start', Number(e.target.value))}
                      className="input-field text-[11px] py-0.5"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <label className="text-[10px] text-slate-600">Stop</label>
                    <input
                      type="number"
                      min={1}
                      max={config.ledCount}
                      value={seg.stop}
                      onChange={e => updateSegment(seg.id, 'stop', Number(e.target.value))}
                      className="input-field text-[11px] py-0.5"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
