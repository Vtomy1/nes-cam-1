import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Layers, Palette, Hash, ZoomIn, Eye, Sliders, Check } from 'lucide-react';
import { ProcessedPpuData } from '../nes/ppu';
import { NES_MASTER_PALETTE, NesColor } from '../nes/palette';
import { nesAudio } from '../nes/audio';

interface PpuInspectorProps {
  ppuData: ProcessedPpuData | null;
  selectedTileId: number;
  setSelectedTileId: (id: number) => void;
  onUpdateSubpalettes: (newPalettes: [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number]
  ]) => void;
}

export const PpuInspector: React.FC<PpuInspectorProps> = ({
  ppuData,
  selectedTileId,
  setSelectedTileId,
  onUpdateSubpalettes,
}) => {
  const [activeTab, setActiveTab] = useState<'pattern' | 'nametable' | 'attribute' | 'palette'>('pattern');
  const [activeBank, setActiveBank] = useState<0 | 1>(0);

  // Palette editing modal
  const [editingSlot, setEditingSlot] = useState<{ palIdx: number; colorIdx: number } | null>(null);

  // Canvas refs for pattern table drawing
  const patternCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomedTileCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw 256 tiles (128x128 pixels canvas) for the active Pattern Table
  useEffect(() => {
    if (!ppuData) return;
    const canvas = patternCanvasRef.current;
    if (!canvas) return;

    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(128, 128);
    const data = imgData.data;

    // Active bank offset in chrRom (Bank 0: 0..4095, Bank 1: 4096..8191)
    const bankOffset = activeBank * 4096;
    const chr = ppuData.chrRom;

    // Standard preview palette (Palette 0)
    const previewPal = ppuData.subpalettes[0];

    for (let tileIdx = 0; tileIdx < 256; tileIdx++) {
      const tileCol = tileIdx % 16;
      const tileRow = Math.floor(tileIdx / 16);
      const tileOffset = bankOffset + tileIdx * 16;

      for (let r = 0; r < 8; r++) {
        const plane0 = chr[tileOffset + r];
        const plane1 = chr[tileOffset + 8 + r];

        for (let c = 0; c < 8; c++) {
          const shift = 7 - c;
          const bit0 = (plane0 >> shift) & 1;
          const bit1 = (plane1 >> shift) & 1;
          const colorSubIdx = (bit1 << 1) | bit0;

          const nesIdx = previewPal[colorSubIdx] & 0x3F;
          const nesColor = NES_MASTER_PALETTE[nesIdx];

          const px = tileCol * 8 + c;
          const py = tileRow * 8 + r;
          const idx = (py * 128 + px) * 4;

          data[idx] = nesColor.r;
          data[idx + 1] = nesColor.g;
          data[idx + 2] = nesColor.b;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [ppuData, activeBank]);

  // Draw 8x zoomed view of the selected tile
  useEffect(() => {
    if (!ppuData) return;
    const canvas = zoomedTileCanvasRef.current;
    if (!canvas) return;

    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const bankOffset = activeBank * 4096;
    const tileOffset = bankOffset + (selectedTileId & 0xFF) * 16;
    const chr = ppuData.chrRom;
    const previewPal = ppuData.subpalettes[0];

    for (let r = 0; r < 8; r++) {
      const plane0 = chr[tileOffset + r];
      const plane1 = chr[tileOffset + 8 + r];

      for (let c = 0; c < 8; c++) {
        const shift = 7 - c;
        const bit0 = (plane0 >> shift) & 1;
        const bit1 = (plane1 >> shift) & 1;
        const colorSubIdx = (bit1 << 1) | bit0;

        const nesIdx = previewPal[colorSubIdx] & 0x3F;
        const nesColor = NES_MASTER_PALETTE[nesIdx];

        ctx.fillStyle = nesColor.hex;
        ctx.fillRect(c * 8, r * 8, 8, 8);

        // Subtle pixel grid line
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeRect(c * 8, r * 8, 8, 8);
      }
    }
  }, [ppuData, selectedTileId, activeBank]);

  if (!ppuData) return null;

  // Selected tile 2BPP breakdown
  const tileOffset = activeBank * 4096 + (selectedTileId & 0xFF) * 16;
  const plane0Bytes = Array.from(ppuData.chrRom.slice(tileOffset, tileOffset + 8));
  const plane1Bytes = Array.from(ppuData.chrRom.slice(tileOffset + 8, tileOffset + 16));

  // Count occurrences of selected tile in Nametable
  let occurrenceCount = 0;
  for (let i = 0; i < ppuData.nametable.length; i++) {
    if (ppuData.nametable[i] === selectedTileId) occurrenceCount++;
  }

  // Handle color change in subpalette
  const selectNewNesColor = (colorIdx: number) => {
    if (!editingSlot) return;
    const newPalettes = JSON.parse(JSON.stringify(ppuData.subpalettes)) as [
      [number, number, number, number],
      [number, number, number, number],
      [number, number, number, number],
      [number, number, number, number]
    ];

    // If changing color 0, change universal background for all 4 subpalettes
    if (editingSlot.colorIdx === 0) {
      newPalettes[0][0] = colorIdx;
      newPalettes[1][0] = colorIdx;
      newPalettes[2][0] = colorIdx;
      newPalettes[3][0] = colorIdx;
    } else {
      newPalettes[editingSlot.palIdx][editingSlot.colorIdx] = colorIdx;
    }

    onUpdateSubpalettes(newPalettes);
    setEditingSlot(null);
    nesAudio.playBlip();
  };

  return (
    <div className="bg-neutral-900/90 rounded-xl border border-neutral-800 p-4 flex flex-col gap-4 text-white shadow-xl">
      {/* Tab Navigation for PPU Sections */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-red-500" />
          <h2 className="font-mono font-bold text-sm text-neutral-100 uppercase tracking-wide">
            NES PPU Memory & Architecture
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => { setActiveTab('pattern'); nesAudio.playBlip(); }}
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all ${
              activeTab === 'pattern' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Pattern Tables ($0000-$1FFF)
          </button>

          <button
            onClick={() => { setActiveTab('nametable'); nesAudio.playBlip(); }}
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all ${
              activeTab === 'nametable' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Nametable ($2000)
          </button>

          <button
            onClick={() => { setActiveTab('attribute'); nesAudio.playBlip(); }}
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all ${
              activeTab === 'attribute' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Attribute Table ($23C0)
          </button>

          <button
            onClick={() => { setActiveTab('palette'); nesAudio.playBlip(); }}
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all ${
              activeTab === 'palette' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Palette RAM ($3F00)
          </button>
        </div>
      </div>

      {/* TAB 1: PATTERN TABLES */}
      {activeTab === 'pattern' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 16x16 Pattern Table Grid Visualizer */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span className="flex items-center gap-1.5 font-bold text-neutral-300">
                CHR-ROM Bank {activeBank} ({activeBank === 0 ? '$0000-$0FFF' : '$1000-$1FFF'})
              </span>
              <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800">
                <button
                  onClick={() => { setActiveBank(0); nesAudio.playBlip(); }}
                  className={`px-2 py-0.5 rounded text-[11px] ${activeBank === 0 ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-500'}`}
                >
                  Bank 0 ($0000)
                </button>
                <button
                  onClick={() => { setActiveBank(1); nesAudio.playBlip(); }}
                  className={`px-2 py-0.5 rounded text-[11px] ${activeBank === 1 ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-500'}`}
                >
                  Bank 1 ($1000)
                </button>
              </div>
            </div>

            {/* Pattern Table Canvas with click-to-select */}
            <div className="relative bg-black p-2 rounded-xl border border-neutral-800 flex items-center justify-center">
              <div
                className="relative cursor-pointer max-w-[320px] aspect-square w-full"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const tileCol = Math.floor((x / rect.width) * 16);
                  const tileRow = Math.floor((y / rect.height) * 16);
                  const newTileId = Math.max(0, Math.min(255, tileRow * 16 + tileCol));
                  setSelectedTileId(newTileId);
                  nesAudio.playBlip();
                }}
              >
                <canvas
                  ref={patternCanvasRef}
                  className="w-full h-full block rounded border border-neutral-800"
                  style={{ imageRendering: 'pixelated' }}
                />

                {/* Selected Tile Cursor Box */}
                <div
                  className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none transition-all duration-75"
                  style={{
                    left: `${((selectedTileId % 16) / 16) * 100}%`,
                    top: `${(Math.floor(selectedTileId / 16) / 16) * 100}%`,
                    width: `${(1 / 16) * 100}%`,
                    height: `${(1 / 16) * 100}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-[11px] font-mono text-neutral-500 text-center">
              Click any 8x8 tile in the 256-tile matrix to inspect its 2BPP bit planes and memory address.
            </p>
          </div>

          {/* Selected Tile Deep Inspector */}
          <div className="lg:col-span-5 bg-neutral-950 rounded-xl border border-neutral-800 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-red-500" />
                <span className="font-mono font-bold text-xs text-neutral-200">
                  Tile ${selectedTileId.toString(16).padStart(2, '0').toUpperCase()} Details
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                PPU ADDR: ${(activeBank * 0x1000 + selectedTileId * 16).toString(16).padStart(4, '0').toUpperCase()}
              </span>
            </div>

            {/* Magnified 8x8 Tile & Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-neutral-700 bg-black flex-shrink-0">
                <canvas
                  ref={zoomedTileCanvasRef}
                  className="w-full h-full block"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              <div className="flex flex-col gap-1 text-xs font-mono">
                <div className="text-neutral-400">
                  DECIMAL ID: <span className="text-white font-bold">{selectedTileId}</span>
                </div>
                <div className="text-neutral-400">
                  SCREEN OCCURRENCES: <span className="text-emerald-400 font-bold">{occurrenceCount} / 960</span>
                </div>
                <div className="text-neutral-400">
                  COVERAGE: <span className="text-cyan-400 font-bold">{((occurrenceCount / 960) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* 2BPP Planar Architecture Breakdown */}
            <div className="bg-neutral-900/80 rounded-lg p-2.5 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span className="font-bold text-neutral-300">2BPP Planar Encoding (16 Bytes)</span>
                <span className="text-neutral-500">Plane 0 + Plane 1</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {/* Plane 0 (Low bit) */}
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
                  <div className="text-neutral-400 font-bold mb-1 text-blue-400">Plane 0 (Low Bit)</div>
                  {plane0Bytes.map((byte, i) => (
                    <div key={i} className="flex justify-between text-neutral-500">
                      <span>Row {i}:</span>
                      <span className="text-neutral-300 font-mono">
                        ${byte.toString(16).padStart(2, '0').toUpperCase()} ({byte.toString(2).padStart(8, '0')})
                      </span>
                    </div>
                  ))}
                </div>

                {/* Plane 1 (High bit) */}
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
                  <div className="text-neutral-400 font-bold mb-1 text-purple-400">Plane 1 (High Bit)</div>
                  {plane1Bytes.map((byte, i) => (
                    <div key={i} className="flex justify-between text-neutral-500">
                      <span>Row {i}:</span>
                      <span className="text-neutral-300 font-mono">
                        ${byte.toString(16).padStart(2, '0').toUpperCase()} ({byte.toString(2).padStart(8, '0')})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NAMETABLE 0 ($2000-$23BF) */}
      {activeTab === 'nametable' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span className="font-bold text-neutral-300">
              Nametable 0 Matrix (32 Columns x 30 Rows = 960 Bytes)
            </span>
            <span>$2000 - $23BF</span>
          </div>

          <div className="bg-black p-3 rounded-xl border border-neutral-800 overflow-x-auto">
            <div
              className="grid gap-[1px] bg-neutral-900 select-none min-w-[700px]"
              style={{ gridTemplateColumns: 'repeat(32, minmax(0, 1fr))' }}
            >
              {Array.from({ length: 960 }).map((_, idx) => {
                const tileId = ppuData.nametable[idx];
                const isSelected = tileId === selectedTileId;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedTileId(tileId);
                      nesAudio.playBlip();
                    }}
                    className={`aspect-square flex items-center justify-center text-[8px] font-mono font-bold cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-red-600 text-white z-10 scale-110 shadow-sm'
                        : 'bg-neutral-950 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
                    }`}
                    title={`Index ${idx} (X:${idx % 32}, Y:${Math.floor(idx / 32)}): Tile $${tileId.toString(16).padStart(2, '0').toUpperCase()}`}
                  >
                    {tileId.toString(16).padStart(2, '0').toUpperCase()}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] font-mono text-neutral-500">
            Each cell represents one 8x8 tile slot in the 256x240 screen. Click any cell to select that CHR tile.
          </p>
        </div>
      )}

      {/* TAB 3: ATTRIBUTE TABLE ($23C0-$23FF) */}
      {activeTab === 'attribute' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span className="font-bold text-neutral-300">
              Attribute Table Matrix (16x15 Blocks = 240 Areas packed into 64 Bytes)
            </span>
            <span>$23C0 - $23FF</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 16x15 16x16 Block Palette Map */}
            <div className="bg-black p-3 rounded-xl border border-neutral-800 flex flex-col gap-2">
              <span className="text-xs font-mono font-bold text-neutral-300">
                16x16 Pixel Attribute Blocks (Assigned Subpalette 0-3)
              </span>

              <div
                className="grid gap-[2px] bg-neutral-900"
                style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
              >
                {Array.from({ length: 240 }).map((_, idx) => {
                  const pal = ppuData.attributeMap[idx];
                  const palColors = ['bg-red-900/70 border-red-500/60', 'bg-blue-900/70 border-blue-500/60', 'bg-emerald-900/70 border-emerald-500/60', 'bg-amber-900/70 border-amber-500/60'];
                  return (
                    <div
                      key={idx}
                      className={`aspect-square flex items-center justify-center text-[9px] font-mono font-bold rounded border ${palColors[pal]} text-white`}
                      title={`Block ${idx}: Subpalette ${pal}`}
                    >
                      P{pal}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Raw 64 Attribute Bytes */}
            <div className="bg-black p-3 rounded-xl border border-neutral-800 flex flex-col gap-2">
              <span className="text-xs font-mono font-bold text-neutral-300">
                Raw 64 PPU Attribute Bytes ($23C0-$23FF)
              </span>

              <div className="grid grid-cols-8 gap-1.5 text-center text-xs font-mono">
                {Array.from(ppuData.attributeBytes).map((b, i) => (
                  <div
                    key={i}
                    className="p-1.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 hover:border-neutral-700"
                    title={`Address $${(0x23C0 + i).toString(16).toUpperCase()}: %${b.toString(2).padStart(8, '0')}`}
                  >
                    ${b.toString(16).padStart(2, '0').toUpperCase()}
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-mono text-neutral-500 mt-2">
                Each byte controls 4 attribute blocks (32x32 pixels total: top-left, top-right, bottom-left, bottom-right).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PALETTE RAM ($3F00-$3F1F) */}
      {activeTab === 'palette' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span className="font-bold text-neutral-300">
              PPU Palette RAM ($3F00 - $3F1F)
            </span>
            <span className="text-neutral-500">Click any swatch to customize color</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ppuData.subpalettes.map((subpal, palIdx) => (
              <div
                key={palIdx}
                className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-neutral-200">Subpalette {palIdx}</span>
                  <span className="text-[10px] text-neutral-500">
                    ${(0x3F00 + palIdx * 4).toString(16).toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {subpal.map((nesIdx, colorIdx) => {
                    const color = NES_MASTER_PALETTE[nesIdx & 0x3F];
                    const isUniversalBg = colorIdx === 0;

                    return (
                      <button
                        key={colorIdx}
                        onClick={() => {
                          setEditingSlot({ palIdx, colorIdx });
                          nesAudio.playBlip();
                        }}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div
                          className="w-full aspect-square rounded-md border border-neutral-700 shadow-sm relative group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: color.hex }}
                        >
                          {isUniversalBg && (
                            <span className="absolute top-0.5 left-0.5 text-[8px] bg-black/70 px-1 rounded text-white font-mono">
                              BG
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          ${nesIdx.toString(16).padStart(2, '0').toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Color Picker Modal Overlay for changing an NES color */}
          {editingSlot && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-lg w-full flex flex-col gap-4 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-red-500" />
                    <span className="font-mono font-bold text-sm text-neutral-100">
                      Select Master NES Color for Palette {editingSlot.palIdx}, Color {editingSlot.colorIdx}
                    </span>
                  </div>
                  <button
                    onClick={() => setEditingSlot(null)}
                    className="text-neutral-400 hover:text-white font-mono text-sm px-2 py-0.5"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 max-h-72 overflow-y-auto p-1">
                  {NES_MASTER_PALETTE.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => selectNewNesColor(i)}
                      className="group relative flex flex-col items-center p-1 rounded bg-neutral-950 border border-neutral-800 hover:border-red-500 hover:scale-110 transition-all"
                      title={`$${i.toString(16).padStart(2, '0').toUpperCase()} - ${c.name}`}
                    >
                      <div
                        className="w-6 h-6 rounded border border-white/20"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[9px] font-mono text-neutral-400 mt-1">
                        ${i.toString(16).padStart(2, '0').toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t border-neutral-800">
                  <button
                    onClick={() => setEditingSlot(null)}
                    className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
