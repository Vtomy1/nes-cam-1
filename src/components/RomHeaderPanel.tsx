import React, { useState } from 'react';
import { Disc3, Download, FileCode, Check, Copy, ExternalLink, HardDrive, Cpu, Terminal } from 'lucide-react';
import { ProcessedPpuData } from '../nes/ppu';
import { generateNesRom, generateAssemblySource, generateCHeader } from '../nes/rom';
import { nesAudio } from '../nes/audio';

interface RomHeaderPanelProps {
  ppuData: ProcessedPpuData | null;
}

export const RomHeaderPanel: React.FC<RomHeaderPanelProps> = ({ ppuData }) => {
  const [copiedAsm, setCopiedAsm] = useState<boolean>(false);
  const [copiedC, setCopiedC] = useState<boolean>(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'asm' | 'c'>('asm');
  const [hoveredByteIdx, setHoveredByteIdx] = useState<number | null>(null);

  if (!ppuData) return null;

  const { romData, header, headerInfo } = generateNesRom(ppuData);
  const asmCode = generateAssemblySource(ppuData);
  const cCode = generateCHeader(ppuData);

  // Download .nes file
  const downloadNesRom = () => {
    nesAudio.playRomFanfare();
    const blob = new Blob([romData.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nescam_${Date.now()}.nes`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download raw 8KB CHR-ROM file
  const downloadChrRom = () => {
    nesAudio.playSnap();
    const blob = new Blob([ppuData.chrRom.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nescam_${Date.now()}.chr`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Nametable binary
  const downloadNametable = () => {
    nesAudio.playSnap();
    const blob = new Blob([ppuData.nametable.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nescam_${Date.now()}.nam`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string, type: 'asm' | 'c') => {
    navigator.clipboard.writeText(text);
    if (type === 'asm') {
      setCopiedAsm(true);
      setTimeout(() => setCopiedAsm(false), 2000);
    } else {
      setCopiedC(true);
      setTimeout(() => setCopiedC(false), 2000);
    }
    nesAudio.playBlip();
  };

  // Descriptions for each of the 16 header bytes
  const getHeaderByteExplanation = (idx: number) => {
    switch (idx) {
      case 0: return { name: "Magic 'N' (0x4E)", detail: "First byte of standard iNES identification string." };
      case 1: return { name: "Magic 'E' (0x45)", detail: "Second byte of standard iNES identification string." };
      case 2: return { name: "Magic 'S' (0x53)", detail: "Third byte of standard iNES identification string." };
      case 3: return { name: "Magic MS-DOS EOF (0x1A)", detail: "Stops MS-DOS command-line typing of binary file." };
      case 4: return { name: "PRG-ROM Size (0x01)", detail: "1 unit of 16,384 bytes (16KB) 6502 Machine Code." };
      case 5: return { name: "CHR-ROM Size (0x01)", detail: "1 unit of 8,192 bytes (8KB) 2BPP Pattern Table data." };
      case 6: return { name: "Flags 6 (0x00)", detail: "Mapper 0 (NROM) low nibble, Horizontal mirroring flag (bit 0 = 0)." };
      case 7: return { name: "Flags 7 (0x00)", detail: "Mapper 0 high nibble, standard iNES format identifier." };
      default: return { name: `Padding Byte ${idx} (0x00)`, detail: "Reserved padding for iNES format standard compliance." };
    }
  };

  const activeExplanation = hoveredByteIdx !== null ? getHeaderByteExplanation(hoveredByteIdx) : null;

  return (
    <div className="bg-neutral-900/90 rounded-xl border border-neutral-800 p-4 flex flex-col gap-5 text-white shadow-xl">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Disc3 className="w-5 h-5 text-red-500" />
          <div>
            <h2 className="font-mono font-bold text-sm text-neutral-100 uppercase tracking-wide">
              iNES ROM File Generator (Mapper 0 / NROM)
            </h2>
            <p className="text-xs text-neutral-400">
              Valid 16-byte iNES Header + 16KB 6502 PRG-ROM + 8KB CHR-ROM = 24,592 Bytes
            </p>
          </div>
        </div>

        {/* Primary Download Button */}
        <button
          onClick={downloadNesRom}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-mono font-bold text-xs rounded-lg flex items-center gap-2 shadow-lg shadow-red-950/80 active:scale-95 transition-all border border-red-500/40"
        >
          <Download className="w-4 h-4" />
          <span>DOWNLOAD .NES ROM</span>
        </button>
      </div>

      {/* 16-BYTE iNES HEADER HEX INSPECTOR */}
      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-xs text-neutral-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-red-500" />
            16-Byte iNES Header Breakdown
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            Hover any byte to inspect bit flags
          </span>
        </div>

        {/* Byte Blocks */}
        <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-1.5 text-center font-mono">
          {Array.from(header).map((byte, idx) => {
            const isHovered = hoveredByteIdx === idx;
            const isMagic = idx < 4;
            const isPrg = idx === 4;
            const isChr = idx === 5;
            const isFlag = idx === 6 || idx === 7;

            let badgeColor = 'border-neutral-800 text-neutral-400 bg-neutral-900';
            if (isMagic) badgeColor = 'border-red-800 text-red-400 bg-red-950/50';
            else if (isPrg) badgeColor = 'border-blue-800 text-blue-400 bg-blue-950/50';
            else if (isChr) badgeColor = 'border-purple-800 text-purple-400 bg-purple-950/50';
            else if (isFlag) badgeColor = 'border-amber-800 text-amber-400 bg-amber-950/50';

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredByteIdx(idx)}
                onMouseLeave={() => setHoveredByteIdx(null)}
                className={`p-2 rounded-lg border cursor-pointer transition-all ${badgeColor} ${
                  isHovered ? 'scale-110 z-10 border-white text-white shadow-md' : ''
                }`}
              >
                <div className="text-[9px] text-neutral-500">[{idx}]</div>
                <div className="font-bold text-xs">
                  ${byte.toString(16).padStart(2, '0').toUpperCase()}
                </div>
                <div className="text-[8px] text-neutral-400 truncate">
                  {idx < 3 ? String.fromCharCode(byte) : idx === 3 ? 'EOF' : idx === 4 ? 'PRG' : idx === 5 ? 'CHR' : 'FLG'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Byte Detail Card */}
        <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-neutral-800 min-h-[50px] flex items-center justify-between">
          {activeExplanation ? (
            <div>
              <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {activeExplanation.name}
              </div>
              <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                {activeExplanation.detail}
              </p>
            </div>
          ) : (
            <p className="text-[11px] font-mono text-neutral-500">
              Hover over any of the 16 bytes above to see its formal specification in the iNES standard.
            </p>
          )}

          <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 pl-4 border-l border-neutral-800">
            <div>
              MAPPER: <span className="text-white font-bold">{headerInfo.mapper} (NROM)</span>
            </div>
            <div>
              MIRRORING: <span className="text-white font-bold">{headerInfo.mirroring}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Download and Homebrew Tooling Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={downloadNesRom}
          className="p-3 bg-neutral-950 hover:bg-neutral-850 rounded-xl border border-neutral-800 hover:border-red-500 text-left flex flex-col justify-between transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-200">
            <span>Bootable .NES File</span>
            <Download className="w-3.5 h-3.5 text-red-500 group-hover:translate-y-0.5 transition-transform" />
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            24,592 bytes. Opens in Mesen, FCEUX, Nestopia, or flashes to physical EverDrive cartridge.
          </p>
        </button>

        <button
          onClick={downloadChrRom}
          className="p-3 bg-neutral-950 hover:bg-neutral-850 rounded-xl border border-neutral-800 hover:border-purple-500 text-left flex flex-col justify-between transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-200">
            <span>Raw .CHR Pattern Data</span>
            <HardDrive className="w-3.5 h-3.5 text-purple-400 group-hover:translate-y-0.5 transition-transform" />
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            8,192 bytes. Compatible with YY-CHR, Tile Layer Pro, or custom NES homebrew game projects.
          </p>
        </button>

        <button
          onClick={downloadNametable}
          className="p-3 bg-neutral-950 hover:bg-neutral-850 rounded-xl border border-neutral-800 hover:border-blue-500 text-left flex flex-col justify-between transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-200">
            <span>Raw .NAM Tile Map</span>
            <FileCode className="w-3.5 h-3.5 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            960 bytes of nametable indices at $2000.
          </p>
        </button>
      </div>

      {/* Assembly Source & C Header Code Viewer */}
      <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-red-500" />
            <span className="font-mono font-bold text-xs text-neutral-300">
              Homebrew Code Export
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
              <button
                onClick={() => setActiveCodeTab('asm')}
                className={`px-2.5 py-0.5 text-xs font-mono rounded ${activeCodeTab === 'asm' ? 'bg-red-600 text-white font-bold' : 'text-neutral-400'}`}
              >
                6502 Assembly (.asm)
              </button>
              <button
                onClick={() => setActiveCodeTab('c')}
                className={`px-2.5 py-0.5 text-xs font-mono rounded ${activeCodeTab === 'c' ? 'bg-red-600 text-white font-bold' : 'text-neutral-400'}`}
              >
                C Header (.h)
              </button>
            </div>

            <button
              onClick={() => copyToClipboard(activeCodeTab === 'asm' ? asmCode : cCode, activeCodeTab)}
              className="px-2.5 py-1 text-xs font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded flex items-center gap-1.5 transition-colors"
            >
              {(activeCodeTab === 'asm' ? copiedAsm : copiedC) ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        <pre className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 text-[11px] font-mono text-neutral-300 max-h-56 overflow-y-auto whitespace-pre selection:bg-red-900">
          {activeCodeTab === 'asm' ? asmCode : cCode}
        </pre>
      </div>
    </div>
  );
};
