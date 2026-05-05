import { Power, Code2, Wifi, WifiOff } from 'lucide-react';
import { useWledStore } from '../store/wledStore';

export function Header() {
  const { state, setState, devMode, toggleDevMode, swUrl, setSwUrl, swRegistered } = useWledStore();

  const togglePower = () => setState({ ...state, on: !state.on });

  const setBrightness = (v: number) => setState({ ...state, bri: v });

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSwUrl(e.target.value);
  };

  return (
    <header className="flex items-center gap-4 px-4 py-2 bg-[#131620] border-b border-[#1e2130] shrink-0">
      {/* Logo + name */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center">
          <span className="text-xs font-bold text-white">W</span>
        </div>
        <span className="font-semibold text-white text-sm tracking-wide">WLED Simulator</span>
        <span className="text-[10px] text-slate-500 font-mono">v0.14.4</span>
      </div>

      <div className="w-px h-5 bg-[#2a2d3a]" />

      {/* Power toggle */}
      <button
        onClick={togglePower}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          state.on
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
            : 'bg-[#1e2130] text-slate-400 border border-[#2a2d3a] hover:bg-[#252836]'
        }`}
      >
        <Power size={12} className={state.on ? 'text-orange-400' : 'text-slate-500'} />
        {state.on ? 'ON' : 'OFF'}
      </button>

      {/* Brightness */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="text-[11px]">BRI</span>
        <input
          type="range"
          min={0}
          max={255}
          value={state.bri}
          onChange={(e) => setBrightness(Number(e.target.value))}
          className="w-24 accent-orange-400"
        />
        <span className="font-mono w-7 text-right text-slate-300">{state.bri}</span>
      </div>

      <div className="w-px h-5 bg-[#2a2d3a]" />

      {/* SW URL config */}
      <div className="flex items-center gap-2">
        {swRegistered
          ? <Wifi size={13} className="text-emerald-400 shrink-0" />
          : <WifiOff size={13} className="text-slate-500 shrink-0" />
        }
        <input
          type="text"
          value={swUrl}
          onChange={handleUrlChange}
          placeholder="http://wled.local"
          className="bg-[#1a1d27] border border-[#2a2d3a] rounded px-2 py-1 text-xs font-mono text-slate-300 w-48 focus:outline-none focus:border-orange-500/50"
        />
        <span className={`text-[10px] ${swRegistered ? 'text-emerald-400' : 'text-slate-500'}`}>
          {swRegistered ? 'SW active' : 'no SW'}
        </span>
      </div>

      <div className="flex-1" />

      {/* Dev mode */}
      <button
        onClick={toggleDevMode}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          devMode
            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
            : 'bg-[#1e2130] text-slate-400 border border-[#2a2d3a] hover:bg-[#252836]'
        }`}
      >
        <Code2 size={12} />
        Dev Mode
      </button>
    </header>
  );
}
