import React from 'react';
import { Tv, Volume2, VolumeX, Cpu, Disc3, Sparkles } from 'lucide-react';
import { nesAudio } from '../nes/audio';

interface HeaderProps {
  liveMode: boolean;
  setLiveMode: (live: boolean) => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  activeTab: 'viewport' | 'ppu_tables' | 'rom_header' | 'source_code';
  setActiveTab: (tab: 'viewport' | 'ppu_tables' | 'rom_header' | 'source_code') => void;
}

export const Header: React.FC<HeaderProps> = ({
  liveMode,
  setLiveMode,
  audioEnabled,
  setAudioEnabled,
  activeTab,
  setActiveTab,
}) => {
  const toggleAudio = () => {
    const next = !audioEnabled;
    nesAudio.enabled = next;
    setAudioEnabled(next);
    if (next) nesAudio.playBlip();
  };

  return (
    <header className="bg-neutral-950 border-b border-red-950/60 sticky top-0 z-50 text-white select-none">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Retro Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded bg-gradient-to-br from-red-600 to-red-800 shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-400/40">
            <Tv className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-black text-xl tracking-wider text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                NES<span className="text-neutral-100">cam</span>
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/80 font-bold uppercase tracking-widest">
                2C02 PPU
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                iNES 1.0 / NROM-128
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Webcam &bull; 2BPP Planar Tiles &bull; Dithering &bull; Bootable ROM
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => { setActiveTab('viewport'); nesAudio.playBlip(); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-all ${
              activeTab === 'viewport'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>PPU Monitor</span>
          </button>

          <button
            onClick={() => { setActiveTab('ppu_tables'); nesAudio.playBlip(); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-all ${
              activeTab === 'ppu_tables'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>PPU Tiles & Tables</span>
          </button>

          <button
            onClick={() => { setActiveTab('rom_header'); nesAudio.playBlip(); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-all ${
              activeTab === 'rom_header'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>iNES ROM Header</span>
          </button>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-2">
          {/* Live stream toggle */}
          <button
            onClick={() => {
              setLiveMode(!liveMode);
              nesAudio.playBlip();
            }}
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded flex items-center gap-1.5 border transition-all ${
              liveMode
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 animate-pulse'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Toggle live continuous NES PPU processing"
          >
            <span className={`w-2 h-2 rounded-full ${liveMode ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
            <span>{liveMode ? 'LIVE PPU' : 'PAUSED'}</span>
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-1.5 rounded border transition-colors ${
              audioEnabled
                ? 'bg-neutral-900 text-red-400 border-red-900/60 hover:bg-neutral-800'
                : 'bg-neutral-900 text-neutral-600 border-neutral-800 hover:text-neutral-400'
            }`}
            title={audioEnabled ? 'NES 2A03 Audio Mute' : 'NES 2A03 Audio Enable'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
