import { Power, Code2, Wifi, WifiOff, Menu, Zap } from 'lucide-react';
import { useWledStore } from '../store/wledStore';

interface HeaderProps {
  onLeftToggle: () => void;
  onRightToggle: () => void;
  leftOpen: boolean;
  rightOpen: boolean;
}

export function Header({ onLeftToggle, onRightToggle, leftOpen, rightOpen }: HeaderProps) {
  const { state, setState, devMode, toggleDevMode, swUrl, setSwUrl, swRegistered } = useWledStore();

  const togglePower = () => setState({ ...state, on: !state.on });
  const setBrightness = (v: number) => setState({ ...state, bri: v });

  return (
    <header className="flex items-center gap-2 px-3 py-2 bg-[#131620] border-b border-[#1e2130] shrink-0">

      {/* Left drawer toggle – mobile only */}
      <button
        onClick={onLeftToggle}
        className={`md:hidden flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0 ${
          leftOpen
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            : 'text-slate-400 hover:bg-[#1a1d27]'
        }`}
        aria-label="Strip config"
      >
        <Menu size={16} />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center">
          <span className="text-xs font-bold text-white">W</span>
        </div>
        <span className="font-semibold text-white text-sm tracking-wide hidden sm:block">WLED Simulator</span>
        <span className="font-semibold text-white text-sm tracking-wide sm:hidden">WLED</span>
        <span className="text-[10px] text-slate-500 font-mono hidden md:block">v0.14.4</span>
      </div>

      <div className="w-px h-5 bg-[#2a2d3a] hidden md:block shrink-0" />

      {/* Power toggle */}
      <button
        onClick={togglePower}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
          state.on
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
            : 'bg-[#1e2130] text-slate-400 border border-[#2a2d3a] hover:bg-[#252836]'
        }`}
      >
        <Power size={12} className={state.on ? 'text-orange-400' : 'text-slate-500'} />
        <span className="hidden xs:inline">{state.on ? 'ON' : 'OFF'}</span>
      </button>

      {/* Brightness – stretches on mobile to fill available space */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-1 md:flex-none min-w-0">
        <span className="text-[11px] hidden sm:block shrink-0">BRI</span>
        <input
          type="range"
          min={0}
          max={255}
          value={state.bri}
          onChange={e => setBrightness(Number(e.target.value))}
          className="flex-1 md:w-24 accent-orange-400 min-w-0"
        />
        <span className="font-mono w-7 text-right text-slate-300 hidden sm:block shrink-0">{state.bri}</span>
      </div>

      {/* SW URL config – desktop only */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <div className="w-px h-5 bg-[#2a2d3a]" />
        {swRegistered
          ? <Wifi size={13} className="text-emerald-400 shrink-0" />
          : <WifiOff size={13} className="text-slate-500 shrink-0" />
        }
        <input
          type="text"
          value={swUrl}
          onChange={e => setSwUrl(e.target.value)}
          placeholder="http://wled.local"
          className="bg-[#1a1d27] border border-[#2a2d3a] rounded px-2 py-1 text-xs font-mono text-slate-300 w-48 focus:outline-none focus:border-orange-500/50"
        />
        <span className={`text-[10px] ${swRegistered ? 'text-emerald-400' : 'text-slate-500'}`}>
          {swRegistered ? 'SW active' : 'no SW'}
        </span>
      </div>

      {/* Spacer – desktop only (pushes dev mode to the right) */}
      <div className="flex-1 hidden md:block" />

      {/* Dev mode – desktop only */}
      <button
        onClick={toggleDevMode}
        className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
          devMode
            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
            : 'bg-[#1e2130] text-slate-400 border border-[#2a2d3a] hover:bg-[#252836]'
        }`}
      >
        <Code2 size={12} />
        Dev Mode
      </button>

      {/* Right drawer toggle – mobile only */}
      <button
        onClick={onRightToggle}
        className={`md:hidden flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0 ${
          rightOpen
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            : 'text-slate-400 hover:bg-[#1a1d27]'
        }`}
        aria-label="Effects"
      >
        <Zap size={16} />
      </button>
    </header>
  );
}
