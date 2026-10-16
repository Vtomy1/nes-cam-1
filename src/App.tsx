/**
 * NEScam: Live Webcam to NES PPU ROM Generator
 * Full pipeline: Webcam -> 256x240 PPU Resolution -> Attribute Clustering ->
 * Multi-algorithm Dithering -> 2BPP Planar CHR Tiles -> Nametable & Attribute Table ->
 * Valid 16-byte iNES Header + 6502 Machine Code Bootable .NES ROM.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { WebcamInput } from './components/WebcamInput';
import { NesViewport } from './components/NesViewport';
import { PpuInspector } from './components/PpuInspector';
import { RomHeaderPanel } from './components/RomHeaderPanel';
import { DitherControls } from './components/DitherControls';
import { DitherOptions } from './nes/dither';
import { ProcessedPpuData, processImageToPpu } from './nes/ppu';
import { PalettePreset, PALETTE_PRESETS } from './nes/palette';
import { nesAudio } from './nes/audio';
import { Disc3, Cpu, Sparkles, Terminal, HelpCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'viewport' | 'ppu_tables' | 'rom_header' | 'source_code'>('viewport');
  const [liveMode, setLiveMode] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Active raw source buffer (256 * 240 * 4 bytes)
  const currentRgbaRef = useRef<Uint8ClampedArray | null>(null);

  // Dither options
  const [ditherOpts, setDitherOpts] = useState<DitherOptions>({
    algorithm: 'floyd_steinberg',
    strength: 1.0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });

  // Current Subpalettes (defaults to classic balanced preset)
  const [userSubpalettes, setUserSubpalettes] = useState<[
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number]
  ]>(PALETTE_PRESETS[0].subpalettes);

  // PPU Processed State
  const [ppuData, setPpuData] = useState<ProcessedPpuData | null>(null);

  // Selected tile index for the PPU Inspector ($00..$FF)
  const [selectedTileId, setSelectedTileId] = useState<number>(0);

  // Process current image buffer into PPU data
  const runPpuPipeline = useCallback((
    rgba: Uint8ClampedArray,
    palettes = userSubpalettes,
    opts = ditherOpts
  ) => {
    currentRgbaRef.current = rgba;
    const processed = processImageToPpu(rgba, palettes, opts);
    setPpuData(processed);
  }, [userSubpalettes, ditherOpts]);

  // Frame captured callback from Webcam or Sample
  const handleFrameCaptured = useCallback((rgba: Uint8ClampedArray) => {
    runPpuPipeline(rgba);
  }, [runPpuPipeline]);

  // Re-run pipeline when dither options change
  useEffect(() => {
    if (currentRgbaRef.current) {
      const processed = processImageToPpu(currentRgbaRef.current, userSubpalettes, ditherOpts);
      setPpuData(processed);
    }
  }, [ditherOpts, userSubpalettes]);

  // Select Preset Palette
  const handleSelectPalettePreset = (preset: PalettePreset) => {
    setUserSubpalettes(preset.subpalettes);
    if (currentRgbaRef.current) {
      const processed = processImageToPpu(currentRgbaRef.current, preset.subpalettes, ditherOpts);
      setPpuData(processed);
    }
  };

  // Auto-optimize subpalettes from the current frame image histogram
  const handleAutoOptimizePalettes = () => {
    if (!currentRgbaRef.current) return;
    const processed = processImageToPpu(currentRgbaRef.current, undefined, ditherOpts);
    setUserSubpalettes(processed.subpalettes);
    setPpuData(processed);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'KeyM') {
        const next = !audioEnabled;
        nesAudio.enabled = next;
        setAudioEnabled(next);
      } else if (e.code === 'KeyL') {
        setLiveMode(prev => !prev);
      } else if (e.code === 'Digit1') {
        setActiveTab('viewport');
      } else if (e.code === 'Digit2') {
        setActiveTab('ppu_tables');
      } else if (e.code === 'Digit3') {
        setActiveTab('rom_header');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioEnabled]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-red-900 selection:text-white">
      {/* Top Retro Toolbar */}
      <Header
        liveMode={liveMode}
        setLiveMode={setLiveMode}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-5">
        {/* VIEW 1: Primary Viewport + Controls */}
        {activeTab === 'viewport' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Webcam & Input Source */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <WebcamInput
                  onFrameCaptured={handleFrameCaptured}
                  liveMode={liveMode}
                  setLiveMode={setLiveMode}
                  ditherOpts={ditherOpts}
                  setDitherOpts={setDitherOpts}
                />
              </div>

              {/* Right Column: NES PPU Screen Output */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <NesViewport
                  ppuData={ppuData}
                  onTileSelected={tileId => {
                    setSelectedTileId(tileId);
                    setActiveTab('ppu_tables');
                  }}
                />
              </div>
            </div>

            {/* Dithering & Palette Controls */}
            <DitherControls
              ditherOpts={ditherOpts}
              setDitherOpts={setDitherOpts}
              onSelectPalettePreset={handleSelectPalettePreset}
              onAutoOptimizePalettes={handleAutoOptimizePalettes}
            />
          </div>
        )}

        {/* VIEW 2: PPU Tiles & Architecture Deep Dive */}
        {activeTab === 'ppu_tables' && (
          <div className="flex flex-col gap-5">
            <PpuInspector
              ppuData={ppuData}
              selectedTileId={selectedTileId}
              setSelectedTileId={setSelectedTileId}
              onUpdateSubpalettes={newPals => setUserSubpalettes(newPals)}
            />
            {/* Quick monitor preview below */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7">
                <NesViewport
                  ppuData={ppuData}
                  onTileSelected={tileId => setSelectedTileId(tileId)}
                />
              </div>
              <div className="lg:col-span-5">
                <DitherControls
                  ditherOpts={ditherOpts}
                  setDitherOpts={setDitherOpts}
                  onSelectPalettePreset={handleSelectPalettePreset}
                  onAutoOptimizePalettes={handleAutoOptimizePalettes}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: iNES Header & ROM Assembly */}
        {activeTab === 'rom_header' && (
          <div className="flex flex-col gap-5">
            <RomHeaderPanel ppuData={ppuData} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7">
                <NesViewport
                  ppuData={ppuData}
                  onTileSelected={tileId => setSelectedTileId(tileId)}
                />
              </div>
              <div className="lg:col-span-5">
                <DitherControls
                  ditherOpts={ditherOpts}
                  setDitherOpts={setDitherOpts}
                  onSelectPalettePreset={handleSelectPalettePreset}
                  onAutoOptimizePalettes={handleAutoOptimizePalettes}
                />
              </div>
            </div>
          </div>
        )}

        {/* Educational NES Hardware Reference Footer */}
        <footer className="mt-auto pt-6 pb-4 border-t border-neutral-900 text-xs font-mono text-neutral-500 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span>NES 2C02 PPU: 256x240 &bull; 64-color Master Gamut</span>
            <span className="hidden md:inline">&bull;</span>
            <span className="hidden md:inline">Pattern Table: 2BPP Planar (16 bytes/tile)</span>
            <span className="hidden md:inline">&bull;</span>
            <span className="hidden md:inline">Attribute: 16x16 Subpalettes</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-neutral-400">Press 1/2/3 to switch tabs &bull; L to toggle Live</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
