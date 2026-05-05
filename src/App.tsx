import { useServiceWorker } from './hooks/useServiceWorker';
import { Header } from './components/Header';
import { LedCanvas } from './components/LedCanvas';
import { StripConfig } from './components/StripConfig';
import { EffectPanel } from './components/EffectPanel';
import { DevPanel } from './components/DevPanel';
import { PresetPanel } from './components/PresetPanel';
import { useWledStore } from './store/wledStore';

export default function App() {
  useServiceWorker();
  const devMode = useWledStore(s => s.devMode);

  return (
    <div className="flex flex-col h-screen bg-[#0d0f14] text-slate-200 overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar – strip config + presets */}
        <aside className="w-56 shrink-0 bg-[#131620] border-r border-[#1e2130] overflow-y-auto flex flex-col">
          <StripConfig />
          <PresetPanel />
        </aside>

        {/* Center – LED canvas */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas area */}
          <div className="flex-1 relative min-h-0 bg-[#0d0f14]">
            <LedCanvas />
          </div>

          {/* Dev panel (bottom) */}
          {devMode && (
            <div className="h-80 shrink-0 border-t border-[#1e2130] bg-[#0f1117]">
              <DevPanel />
            </div>
          )}
        </main>

        {/* Right sidebar – effects + colors */}
        <aside className="w-56 shrink-0 bg-[#131620] border-l border-[#1e2130] flex flex-col overflow-hidden">
          <EffectPanel />
        </aside>
      </div>
    </div>
  );
}
