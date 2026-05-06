import { useState } from 'react';
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
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const closeAll = () => { setLeftOpen(false); setRightOpen(false); };

  return (
    <div className="flex flex-col h-screen bg-[#0d0f14] text-slate-200 overflow-hidden">
      <Header
        onLeftToggle={() => { setLeftOpen(v => !v); setRightOpen(false); }}
        onRightToggle={() => { setRightOpen(v => !v); setLeftOpen(false); }}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Backdrop – closes drawers on mobile when tapping the canvas */}
        {(leftOpen || rightOpen) && (
          <div
            className="absolute inset-0 z-30 bg-black/60 md:hidden"
            onClick={closeAll}
          />
        )}

        {/* Left sidebar – strip config + presets
            Mobile : absolute overlay, slides in from the left
            Desktop: normal flex item */}
        <aside className={[
          'absolute inset-y-0 left-0 z-40 w-72 overflow-y-auto flex flex-col',
          'bg-[#131620] border-r border-[#1e2130]',
          'transform transition-transform duration-200 ease-in-out',
          'md:relative md:inset-auto md:z-auto md:w-56 md:shrink-0 md:translate-x-0',
          leftOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}>
          <StripConfig />
          <PresetPanel />
        </aside>

        {/* Center – LED canvas */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 relative min-h-0 bg-[#0d0f14]">
            <LedCanvas />
          </div>

          {devMode && (
            <div className="h-80 shrink-0 border-t border-[#1e2130] bg-[#0f1117]">
              <DevPanel />
            </div>
          )}
        </main>

        {/* Right sidebar – effects + colors
            Mobile : absolute overlay, slides in from the right
            Desktop: normal flex item */}
        <aside className={[
          'absolute inset-y-0 right-0 z-40 w-72 flex flex-col overflow-hidden',
          'bg-[#131620] border-l border-[#1e2130]',
          'transform transition-transform duration-200 ease-in-out',
          'md:relative md:inset-auto md:z-auto md:w-56 md:shrink-0 md:translate-x-0',
          rightOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}>
          <EffectPanel />
        </aside>
      </div>
    </div>
  );
}
