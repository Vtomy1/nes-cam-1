import React from 'react';
import { Sliders, Sparkles, Layers, Zap } from 'lucide-react';
import { DitherAlgorithm, DitherOptions } from '../nes/dither';
import { PALETTE_PRESETS, PalettePreset } from '../nes/palette';
import { nesAudio } from '../nes/audio';

interface DitherControlsProps {
  ditherOpts: DitherOptions;
  setDitherOpts: React.Dispatch<React.SetStateAction<DitherOptions>>;
  onSelectPalettePreset: (preset: PalettePreset) => void;
  onAutoOptimizePalettes: () => void;
}

export const DitherControls: React.FC<DitherControlsProps> = ({
  ditherOpts,
  setDitherOpts,
  onSelectPalettePreset,
  onAutoOptimizePalettes,
}) => {
  const algorithms: { id: DitherAlgorithm; name: string; description: string }[] = [
    { id: 'floyd_steinberg', name: 'Floyd-Steinberg', description: 'Balanced 4-point error diffusion. Smooth gradients.' },
    { id: 'atkinson', name: 'Atkinson', description: 'Classic 1984 Mac / 8-bit diffusion. High contrast retro punch.' },
    { id: 'bayer_4x4', name: 'Bayer 4x4 Ordered', description: 'Retro dot matrix ordered pattern. Crisp pixel stability.' },
    { id: 'bayer_8x8', name: 'Bayer 8x8 Ordered', description: 'Crosshatch 64-level matrix. Authentic CRT look.' },
    { id: 'sierra_lite', name: 'Sierra-Lite', description: 'Fast 3-point diffusion. Soft organic texture.' },
    { id: 'burkes', name: 'Burkes', description: '7-point broad diffusion. Retains high-frequency detail.' },
    { id: 'none', name: 'No Dither (Quantize)', description: 'Hard thresholding. Flat graphic posterized tiles.' },
  ];

  return (
    <div className="bg-neutral-900/90 rounded-xl border border-neutral-800 p-4 flex flex-col gap-4 text-white shadow-xl">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-red-500" />
          <h2 className="font-mono font-bold text-sm text-neutral-100 uppercase tracking-wide">
            NES Dithering & Color Engine
          </h2>
        </div>
        <button
          onClick={() => {
            onAutoOptimizePalettes();
            nesAudio.playSnap();
          }}
          className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-neutral-950 hover:bg-neutral-800 text-red-400 border border-neutral-800 hover:border-red-900 flex items-center gap-1.5 transition-all"
        >
          <Zap className="w-3.5 h-3.5 text-yellow-500" />
          <span>Auto-Quantize Subpalettes</span>
        </button>
      </div>

      {/* Dithering Algorithm Selection */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
          <span className="font-bold text-neutral-300">Dithering Algorithm</span>
          <span className="text-neutral-500 text-[11px]">
            {algorithms.find(a => a.id === ditherOpts.algorithm)?.description}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {algorithms.map(algo => (
            <button
              key={algo.id}
              onClick={() => {
                setDitherOpts(prev => ({ ...prev, algorithm: algo.id }));
                nesAudio.playBlip();
              }}
              className={`px-2 py-2 rounded-lg border text-xs font-mono font-bold transition-all text-center ${
                ditherOpts.algorithm === algo.id
                  ? 'bg-red-600 text-white border-red-500 shadow-sm'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
              }`}
            >
              {algo.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dither Strength Slider */}
      <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-neutral-300 font-bold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-red-500" /> Dither Diffusion Strength
          </span>
          <span className="text-red-400 font-bold">{Math.round(ditherOpts.strength * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="150"
          value={Math.round(ditherOpts.strength * 100)}
          onChange={e => setDitherOpts(prev => ({ ...prev, strength: Number(e.target.value) / 100 }))}
          className="w-full accent-red-600 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-neutral-500">
          <span>0% (Posterized)</span>
          <span>100% (Standard PPU)</span>
          <span>150% (High Grain)</span>
        </div>
      </div>

      {/* Palette Presets */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
          <span className="font-bold text-neutral-300">Curated NES Palette Profiles</span>
          <span className="text-neutral-500">16-color Subpalettes</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {PALETTE_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => {
                onSelectPalettePreset(preset);
                nesAudio.playBlip();
              }}
              className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-red-500 text-left flex flex-col justify-between transition-all group"
            >
              <div>
                <span className="text-xs font-mono font-bold text-neutral-200 group-hover:text-white block truncate">
                  {preset.name}
                </span>
                <span className="text-[10px] text-neutral-500 block line-clamp-1 mt-0.5">
                  {preset.description}
                </span>
              </div>

              {/* Preview 4 swatches */}
              <div className="flex items-center gap-1 mt-2">
                {preset.subpalettes.map((sub, i) => (
                  <div
                    key={i}
                    className="w-3.5 h-3.5 rounded-sm border border-neutral-700"
                    style={{
                      backgroundColor: ['#b53120', '#155fd9', '#0c9300', '#adadad'][i % 4],
                    }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
