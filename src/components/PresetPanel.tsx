import { useState } from 'react';
import { BookMarked, Save, Play, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useWledStore } from '../store/wledStore';

export function PresetPanel() {
  const { presets, savePreset, loadPreset, deletePreset } = useWledStore();
  const [open, setOpen] = useState(true);
  const [saveName, setSaveName] = useState('');
  const [saveId, setSaveId] = useState(1);

  const presetList = Object.values(presets).sort((a, b) => a.id - b.id);

  const handleSave = () => {
    const name = saveName.trim() || `Preset ${saveId}`;
    savePreset(saveId, name);
    setSaveName('');
    const nextId = Math.max(...Object.keys(presets).map(Number), saveId) + 1;
    setSaveId(nextId);
  };

  return (
    <div className="flex flex-col gap-0 border-t border-[#1e2130]">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#1a1d27] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <BookMarked size={12} className="text-violet-400" />
          <span>Presets</span>
          {presetList.length > 0 && (
            <span className="text-[10px] bg-[#2a2d3a] text-slate-400 px-1.5 rounded-full">
              {presetList.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {/* Save row */}
          <div className="flex gap-1">
            <input
              type="number"
              min={1}
              max={250}
              value={saveId}
              onChange={e => setSaveId(Number(e.target.value))}
              className="input-field w-12 text-center"
            />
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Name…"
              className="input-field flex-1"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={handleSave}
              title="Save current state as preset"
              className="flex items-center gap-1 px-2 py-1 text-[11px] bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded hover:bg-violet-500/30 transition-colors"
            >
              <Save size={11} />
            </button>
          </div>

          {/* Preset list */}
          {presetList.length === 0 ? (
            <p className="text-[11px] text-slate-600 text-center py-1">No presets yet</p>
          ) : (
            <div className="flex flex-col gap-1">
              {presetList.map(p => (
                <div key={p.id} className="flex items-center gap-1 group">
                  <span className="text-[10px] font-mono text-slate-600 w-5 text-right shrink-0">{p.id}</span>
                  <span className="text-[11px] text-slate-300 flex-1 truncate">{p.n}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => loadPreset(p.id)}
                      title="Load preset"
                      className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
                    >
                      <Play size={10} />
                    </button>
                    <button
                      onClick={() => deletePreset(p.id)}
                      title="Delete preset"
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {presetList.length > 0 && (
            <p className="text-[10px] text-slate-600">
              Load via API: <code className="text-slate-500">{'{"ps":1}'}</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
