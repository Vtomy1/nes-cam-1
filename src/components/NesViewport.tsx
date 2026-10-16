import React, { useRef, useEffect, useState, MouseEvent } from 'react';
import { Tv, Grid3X3, Layers, Download, Maximize2, Sparkles, Eye, Info } from 'lucide-react';
import { ProcessedPpuData, NES_WIDTH, NES_HEIGHT } from '../nes/ppu';
import { NES_MASTER_PALETTE } from '../nes/palette';
import { nesAudio } from '../nes/audio';

interface NesViewportProps {
  ppuData: ProcessedPpuData | null;
  onTileSelected?: (tileId: number) => void;
}

export const NesViewport: React.FC<NesViewportProps> = ({ ppuData, onTileSelected }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Display toggles
  const [crtScanlines, setCrtScanlines] = useState<boolean>(true);
  const [crtBloom, setCrtBloom] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'8:7' | '4:3'>('4:3');
  const [showTileGrid, setShowTileGrid] = useState<boolean>(false);
  const [showAttributeGrid, setShowAttributeGrid] = useState<boolean>(false);

  // Hover inspection
  const [hoveredTile, setHoveredTile] = useState<{
    pixelX: number;
    pixelY: number;
    tileX: number;
    tileY: number;
    tileId: number;
    paletteId: number;
    colorSubIndex: number;
    nesColorIndex: number;
  } | null>(null);

  // Render PPU output onto canvas
  useEffect(() => {
    if (!ppuData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = NES_WIDTH;
    canvas.height = NES_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(NES_WIDTH, NES_HEIGHT);
    const data = imgData.data;

    // Use pixelNesIndices
    for (let i = 0; i < NES_WIDTH * NES_HEIGHT; i++) {
      const nesColorIdx = ppuData.pixelNesIndices[i] & 0x3F;
      const color = NES_MASTER_PALETTE[nesColorIdx];
      const offset = i * 4;
      data[offset] = color.r;
      data[offset + 1] = color.g;
      data[offset + 2] = color.b;
      data[offset + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }, [ppuData]);

  // Handle canvas mouse move for interactive inspector
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ppuData || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (clientX < 0 || clientX >= rect.width || clientY < 0 || clientY >= rect.height) {
      setHoveredTile(null);
      return;
    }

    const scaleX = NES_WIDTH / rect.width;
    const scaleY = NES_HEIGHT / rect.height;

    const px = Math.floor(clientX * scaleX);
    const py = Math.floor(clientY * scaleY);

    if (px >= 0 && px < NES_WIDTH && py >= 0 && py < NES_HEIGHT) {
      const tileX = Math.floor(px / 8);
      const tileY = Math.floor(py / 8);
      const tileIdx = tileY * 32 + tileX;
      const tileId = ppuData.nametable[tileIdx];

      const blockX = Math.floor(px / 16);
      const blockY = Math.floor(py / 16);
      const paletteId = ppuData.attributeMap[blockY * 16 + blockX] ?? 0;

      const pixelIdx = py * NES_WIDTH + px;
      const colorSubIndex = ppuData.pixelSubIndices[pixelIdx];
      const nesColorIndex = ppuData.pixelNesIndices[pixelIdx];

      setHoveredTile({
        pixelX: px,
        pixelY: py,
        tileX,
        tileY,
        tileId,
        paletteId,
        colorSubIndex,
        nesColorIndex,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredTile(null);
  };

  const handleCanvasClick = () => {
    if (hoveredTile && onTileSelected) {
      onTileSelected(hoveredTile.tileId);
      nesAudio.playBlip();
    }
  };

  // Export current frame as PNG
  const exportPng = () => {
    if (!canvasRef.current) return;
    nesAudio.playSnap();
    const link = document.createElement('a');
    link.download = `nescam_frame_${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="bg-neutral-900/90 rounded-xl border border-neutral-800 p-4 flex flex-col gap-3 shadow-xl">
      {/* Top Header & Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-red-500" />
          <h2 className="font-mono font-bold text-sm text-neutral-100 uppercase tracking-wide">
            NES PPU Screen Output
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
            256 x 240 NTSC
          </span>
        </div>

        {/* Display Filter Toggles */}
        <div className="flex items-center gap-1.5">
          {/* Tile Grid */}
          <button
            onClick={() => { setShowTileGrid(!showTileGrid); nesAudio.playBlip(); }}
            className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 border transition-all ${
              showTileGrid
                ? 'bg-red-950/60 text-red-300 border-red-500/80 shadow-sm'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Toggle 8x8 Tile Grid"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">8x8 Tiles</span>
          </button>

          {/* Attribute Grid */}
          <button
            onClick={() => { setShowAttributeGrid(!showAttributeGrid); nesAudio.playBlip(); }}
            className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 border transition-all ${
              showAttributeGrid
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/80 shadow-sm'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Toggle 16x16 Attribute Block Grid"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">16x16 Palettes</span>
          </button>

          {/* CRT Scanlines */}
          <button
            onClick={() => { setCrtScanlines(!crtScanlines); nesAudio.playBlip(); }}
            className={`px-2 py-1 rounded text-xs font-mono border transition-all ${
              crtScanlines
                ? 'bg-blue-950/60 text-blue-300 border-blue-500/80'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="CRT Scanline simulation"
          >
            CRT
          </button>

          {/* Aspect Ratio */}
          <button
            onClick={() => {
              setAspectRatio(prev => prev === '4:3' ? '8:7' : '4:3');
              nesAudio.playBlip();
            }}
            className="px-2 py-1 rounded bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800 text-xs font-mono"
            title="Toggle NTSC 4:3 vs Square 8:7 NES aspect ratio"
          >
            {aspectRatio}
          </button>

          {/* PNG Export */}
          <button
            onClick={exportPng}
            className="p-1 rounded bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
            title="Save PNG snapshot"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Screen Container with authentic CRT Frame */}
      <div className="relative flex justify-center items-center bg-black/90 p-3 sm:p-5 rounded-xl border border-neutral-800/80 shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
          className={`relative max-w-full overflow-hidden rounded-md cursor-crosshair select-none transition-all ${
            aspectRatio === '4:3' ? 'aspect-[4/3] w-full max-w-[560px]' : 'aspect-[256/240] w-full max-w-[512px]'
          } ${crtBloom ? 'shadow-[0_0_25px_rgba(100,180,255,0.25)]' : ''}`}
        >
          {/* Main Pixel Canvas */}
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* 8x8 Tile Grid Overlay */}
          {showTileGrid && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)',
                backgroundSize: `${100 / 32}% ${100 / 30}%`,
              }}
            />
          )}

          {/* 16x16 Attribute Block Grid Overlay */}
          {showAttributeGrid && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(245,158,11,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,158,11,0.4) 1px, transparent 1px)',
                backgroundSize: `${100 / 16}% ${100 / 15}%`,
              }}
            />
          )}

          {/* CRT Scanline Shader simulation */}
          {crtScanlines && (
            <div
              className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-45"
              style={{
                backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.75) 50%)',
                backgroundSize: '100% 4px',
              }}
            />
          )}

          {/* CRT Glass Vignette & Phosphor Glow */}
          <div
            className="absolute inset-0 pointer-events-none rounded-md"
            style={{
              boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.05)',
            }}
          />

          {/* Hover Tile Highlight Box */}
          {hoveredTile && (
            <div
              className="absolute border-2 border-red-400 bg-red-400/20 pointer-events-none"
              style={{
                left: `${(hoveredTile.tileX / 32) * 100}%`,
                top: `${(hoveredTile.tileY / 30) * 100}%`,
                width: `${(1 / 32) * 100}%`,
                height: `${(1 / 30) * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Live Tile & PPU Register HUD */}
      <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800 text-xs font-mono flex flex-wrap items-center justify-between gap-3 text-neutral-300">
        {hoveredTile ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">TILE POS:</span>
              <span className="text-red-400 font-bold">
                X:{hoveredTile.tileX} Y:{hoveredTile.tileY}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">CHR ID:</span>
              <span className="bg-red-950 text-red-300 px-1.5 py-0.5 rounded border border-red-800 font-bold">
                ${hoveredTile.tileId.toString(16).padStart(2, '0').toUpperCase()} ({hoveredTile.tileId})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">SUBPALETTE:</span>
              <span className="text-amber-400 font-bold">
                Pal #{hoveredTile.paletteId} (Color #{hoveredTile.colorSubIndex})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">NES COLOR:</span>
              <div className="flex items-center gap-1">
                <span
                  className="w-3.5 h-3.5 rounded border border-white/20"
                  style={{ backgroundColor: NES_MASTER_PALETTE[hoveredTile.nesColorIndex].hex }}
                />
                <span className="text-neutral-200">
                  ${hoveredTile.nesColorIndex.toString(16).padStart(2, '0').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-neutral-500">
            <Info className="w-4 h-4 text-neutral-600" />
            <span>Hover over PPU monitor to inspect 8x8 tiles, nametable indices & attribute subpalettes.</span>
          </div>
        )}

        {/* Compression Statistics */}
        {ppuData && (
          <div className="flex items-center gap-2 ml-auto text-neutral-400">
            <span>CHR TILES:</span>
            <span className="text-emerald-400 font-bold">
              {ppuData.finalChrTilesCount} / 256
            </span>
            <span className="text-neutral-600">|</span>
            <span>RATIO:</span>
            <span className="text-cyan-400 font-bold">
              {ppuData.compressionRatio}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
