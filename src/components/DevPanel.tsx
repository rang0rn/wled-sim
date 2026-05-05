import { useState, useEffect } from 'react';
import { Terminal, Trash2, Copy, Check, Code2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useWledStore } from '../store/wledStore';
import { mergeState } from '../wled/api';
import { CustomEffectEditor } from './CustomEffectEditor';

export function DevPanel() {
  const { logs, clearLogs, swUrl, editingCustomFxId } = useWledStore();
  const [tab, setTab] = useState<'log' | 'json' | 'request' | 'customfx'>('log');

  // Auto-switch to Custom FX tab when an effect is opened for editing
  useEffect(() => {
    if (editingCustomFxId !== null) setTab('customfx');
  }, [editingCustomFxId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-0 border-b border-[#1e2130] shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-slate-500">
          <Terminal size={11} className="text-violet-400" />
          Developer
        </div>
        <div className="w-px h-4 bg-[#2a2d3a]" />
        {[
          { id: 'log', label: `Log (${logs.length})` },
          { id: 'json', label: 'JSON State' },
          { id: 'request', label: 'HTTP Request' },
          { id: 'customfx', label: 'Custom FX', icon: <Code2 size={10} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`flex items-center gap-1 px-3 py-2 text-xs transition-colors ${
              tab === t.id
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {'icon' in t && t.icon}
            {t.label}
          </button>
        ))}
        {tab === 'log' && logs.length > 0 && (
          <button
            onClick={clearLogs}
            className="ml-auto mr-2 text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 size={10} /> Clear
          </button>
        )}
      </div>

      {tab === 'log' && <RequestLog />}
      {tab === 'json' && <JsonStateEditor />}
      {tab === 'request' && <HttpRequestBuilder swUrl={swUrl} />}
      {tab === 'customfx' && <CustomEffectEditor />}
    </div>
  );
}

function RequestLog() {
  const { logs } = useWledStore();

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 text-xs text-slate-600">
        No requests yet. Try fetching <code className="mx-1 px-1 bg-[#1a1d27] rounded font-mono">{useWledStore.getState().swUrl}/json/state</code>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1 font-mono text-[11px]">
      {logs.map(log => (
        <div key={log.id} className="flex flex-col border-b border-[#1a1d27] hover:bg-[#1a1d27]/50 transition-colors">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <MethodBadge method={log.method} />
            <StatusBadge status={log.status} />
            <span className="text-slate-400 flex-1 truncate">{log.pathname}</span>
            <span className="text-slate-600">{log.duration}ms</span>
            <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
          {log.requestBody !== undefined && (
            <div className="px-3 pb-1">
              <span className="text-slate-600">→ </span>
              <span className="text-slate-500 break-all">
                {JSON.stringify(log.requestBody).slice(0, 200)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function JsonStateEditor() {
  const { state, setState } = useWledStore();
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const applyJson = (val: string | undefined) => {
    if (!val) return;
    try {
      const parsed = JSON.parse(val);
      const newState = mergeState(state, parsed);
      setState(newState);
      setError(null);
      setApplied(true);
      setTimeout(() => setApplied(false), 1000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0 border-b border-[#1e2130]">
        <span className="text-[11px] text-slate-500">
          Edit state directly (POST /json/state semantics)
        </span>
        {error && <span className="text-[11px] text-red-400">{error}</span>}
        {applied && <span className="text-[11px] text-emerald-400">Applied</span>}
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={JSON.stringify(state, null, 2)}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 11,
            lineNumbers: 'off',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
          }}
          onChange={(val) => applyJson(val)}
        />
      </div>
    </div>
  );
}

function HttpRequestBuilder({ swUrl }: { swUrl: string }) {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/json/state');
  const [body, setBody] = useState('{\n  "on": true,\n  "bri": 200\n}');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      const url = swUrl.replace(/\/$/, '') + path;
      const res = await fetch(url, {
        method,
        headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
        body: method !== 'GET' ? body : undefined,
      });
      const text = await res.text();
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
    } catch (e) {
      setResponse(`Error: ${(e as Error).message}`);
    }
    setLoading(false);
  };

  const copyCode = () => {
    const code = `fetch('${swUrl}${path}', { method: '${method}'${method !== 'GET' ? `, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(${body})` : ''} })`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden p-3 gap-3">
      {/* URL bar */}
      <div className="flex gap-2 shrink-0">
        <select
          value={method}
          onChange={e => setMethod(e.target.value)}
          className="bg-[#1a1d27] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500/50"
        >
          {['GET', 'POST'].map(m => <option key={m}>{m}</option>)}
        </select>
        <div className="flex-1 flex items-center gap-1 bg-[#1a1d27] border border-[#2a2d3a] rounded px-2 py-1.5">
          <span className="text-xs text-slate-500 font-mono shrink-0">{swUrl}</span>
          <input
            type="text"
            value={path}
            onChange={e => setPath(e.target.value)}
            className="bg-transparent text-xs font-mono text-slate-300 focus:outline-none flex-1"
          />
        </div>
        <button
          onClick={send}
          disabled={loading}
          className="px-4 py-1.5 text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded hover:bg-violet-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Send'}
        </button>
        <button onClick={copyCode} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>

      <div className="flex gap-2 flex-1 overflow-hidden min-h-0">
        {/* Body */}
        {method !== 'GET' && (
          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
            <label className="text-[11px] text-slate-500 shrink-0">Request Body</label>
            <div className="flex-1 overflow-hidden rounded border border-[#2a2d3a]">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={body}
                theme="vs-dark"
                options={{ minimap: { enabled: false }, fontSize: 11, lineNumbers: 'off', tabSize: 2 }}
                onChange={v => setBody(v ?? '')}
              />
            </div>
          </div>
        )}

        {/* Response */}
        <div className="flex flex-col gap-1 flex-1 overflow-hidden">
          <label className="text-[11px] text-slate-500 shrink-0">Response</label>
          <div className="flex-1 overflow-auto bg-[#0d0f14] rounded border border-[#1e2130] p-2">
            {response ? (
              <pre className="text-[11px] text-emerald-300 font-mono whitespace-pre-wrap">{response}</pre>
            ) : (
              <span className="text-[11px] text-slate-600">Hit Send to see response</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick presets */}
      <div className="flex gap-2 flex-wrap shrink-0">
        {QUICK_PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => { setMethod(p.method); setPath(p.path); setBody(p.body ?? ''); }}
            className="px-2 py-1 text-[11px] bg-[#1a1d27] text-slate-400 border border-[#2a2d3a] rounded hover:text-slate-200 hover:bg-[#252836] transition-colors font-mono"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'text-emerald-400',
    POST: 'text-orange-400',
    PUT: 'text-blue-400',
    DELETE: 'text-red-400',
  };
  return <span className={`w-10 shrink-0 ${colors[method] ?? 'text-slate-400'}`}>{method}</span>;
}

function StatusBadge({ status }: { status: number }) {
  const color = status < 300 ? 'text-emerald-400' : status < 400 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`w-8 ${color}`}>{status}</span>;
}

const QUICK_PRESETS = [
  { label: 'GET state', method: 'GET', path: '/json/state', body: '' },
  { label: 'GET info', method: 'GET', path: '/json/info', body: '' },
  { label: 'GET effects', method: 'GET', path: '/json/effects', body: '' },
  { label: 'Toggle ON', method: 'POST', path: '/json/state', body: '{"on": true}' },
  { label: 'Toggle OFF', method: 'POST', path: '/json/state', body: '{"on": false}' },
  { label: 'Rainbow', method: 'POST', path: '/json/state', body: '{"seg": [{"fx": 9}]}' },
  { label: 'Fire', method: 'POST', path: '/json/state', body: '{"seg": [{"fx": 67}]}' },
  { label: 'WIN API', method: 'GET', path: '/win?FX=9&SX=128', body: '' },
];
