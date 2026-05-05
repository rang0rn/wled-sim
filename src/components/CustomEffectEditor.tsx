import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Check, AlertTriangle, Wand2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useWledStore } from '../store/wledStore';
import { EXAMPLE_EFFECTS, EXAMPLE_EFFECT_CODE } from '../wled/customEffects';
import type { CustomEffect } from '../wled/types';

export function CustomEffectEditor() {
  const {
    customEffects, state, setState,
    addCustomEffect, updateCustomEffect, removeCustomEffect,
    editingCustomFxId, setEditingCustomFxId,
  } = useWledStore();

  const [name, setName] = useState('My Effect');
  const [code, setCode] = useState(EXAMPLE_EFFECT_CODE);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const editing = customEffects.find(e => e.id === editingCustomFxId) ?? null;

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCode(editing.code);
      setError(null);
    }
  }, [editingCustomFxId]);

  // Live update: recompile on code change
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (editingCustomFxId !== null) {
        const err = updateCustomEffect(editingCustomFxId, { code });
        setError(err);
      }
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [code]);

  const handleNew = () => {
    const { id } = addCustomEffect('New Effect', EXAMPLE_EFFECT_CODE);
    if (id !== -1) {
      setEditingCustomFxId(id);
      setName('New Effect');
      setCode(EXAMPLE_EFFECT_CODE);
      setError(null);
    }
  };

  const handleSave = () => {
    if (editingCustomFxId !== null) {
      const err = updateCustomEffect(editingCustomFxId, { name, code });
      if (err) { setError(err); return; }
    } else {
      const { id, error: err } = addCustomEffect(name, code);
      if (err) { setError(err); return; }
      setEditingCustomFxId(id);
    }
    setError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const handleDelete = (fx: CustomEffect) => {
    removeCustomEffect(fx.id);
    if (editingCustomFxId === fx.id) {
      setEditingCustomFxId(null);
      setCode(EXAMPLE_EFFECT_CODE);
      setName('My Effect');
    }
  };

  const activateEffect = (id: number) => {
    const seg = state.seg.find(s => s.sel) ?? state.seg[0];
    setState({
      ...state,
      seg: state.seg.map(s => s.id === seg.id ? { ...s, fx: id } : s),
    });
  };

  const loadExample = (ex: typeof EXAMPLE_EFFECTS[0]) => {
    setName(ex.name);
    setCode(ex.code);
    setError(null);
    if (editingCustomFxId !== null) {
      updateCustomEffect(editingCustomFxId, { name: ex.name, code: ex.code });
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: effect list */}
      <div className="w-44 shrink-0 border-r border-[#1e2130] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <span className="text-[11px] text-slate-500">Custom FX</span>
          <button
            onClick={handleNew}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-orange-400 transition-colors"
          >
            <Plus size={11} /> New
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-2 pb-2">
          {customEffects.length === 0 && (
            <p className="text-[11px] text-slate-600 text-center py-3 px-2">
              No custom effects yet.<br />Click New to create one.
            </p>
          )}
          {customEffects.map(fx => (
            <div key={fx.id} className={`flex items-center gap-1 rounded px-2 py-1.5 mb-0.5 group cursor-pointer transition-colors ${
              editingCustomFxId === fx.id ? 'bg-orange-500/15 border border-orange-500/20' : 'hover:bg-[#1e2130]'
            }`}
              onClick={() => setEditingCustomFxId(fx.id)}
            >
              <span className="text-[11px] text-slate-300 flex-1 truncate">{fx.name}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); activateEffect(fx.id); }}
                  title="Apply to current segment"
                  className="p-0.5 text-slate-500 hover:text-emerald-400"
                >
                  <Check size={10} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(fx); }}
                  className="p-0.5 text-slate-500 hover:text-red-400"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}

          {/* Examples */}
          <div className="mt-3 border-t border-[#1e2130] pt-2">
            <div className="flex items-center gap-1 px-1 mb-1">
              <Wand2 size={10} className="text-slate-600" />
              <span className="text-[10px] text-slate-600">Examples</span>
            </div>
            {EXAMPLE_EFFECTS.map(ex => (
              <button
                key={ex.name}
                onClick={() => loadExample(ex)}
                className="w-full text-left px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300 hover:bg-[#1e2130] rounded transition-colors"
              >
                {ex.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: editor */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 shrink-0 border-b border-[#1e2130]">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Effect name"
            className="bg-transparent text-xs text-slate-300 focus:outline-none border-b border-transparent focus:border-orange-500/50 pb-0.5 w-40"
          />
          <div className="flex-1" />
          {error && (
            <div className="flex items-center gap-1 text-[11px] text-red-400">
              <AlertTriangle size={11} />
              <span className="truncate max-w-48">{error}</span>
            </div>
          )}
          {!error && editingCustomFxId !== null && (
            <span className="text-[11px] text-emerald-400">Live ✓</span>
          )}
          <button
            onClick={handleSave}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
            }`}
          >
            {saved ? <><Check size={11} /> Saved</> : 'Save'}
          </button>
          {editingCustomFxId !== null && (
            <button
              onClick={() => activateEffect(editingCustomFxId)}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded hover:bg-violet-500/30 transition-colors"
            >
              <Check size={11} /> Apply
            </button>
          )}
        </div>

        {/* Docs hint */}
        <div className="px-3 py-1 shrink-0 bg-[#0d0f14] border-b border-[#1e2130]">
          <span className="text-[10px] text-slate-600 font-mono">
            (t: ms, seg: &#123;col,sx,ix,pal&#125;, n: LED count, utils: &#123;hsl, rgb, lerp, clamp, mapRange, noise&#125;) =&gt; [r,g,b][]
          </span>
        </div>

        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={code}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              padding: { top: 8 },
            }}
            onChange={v => setCode(v ?? '')}
          />
        </div>
      </div>
    </div>
  );
}
