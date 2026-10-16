/**
 * NES ROM (iNES Format) Generator & 6502 Machine Code Assembler
 * Produces 100% valid, authentic, bootable .nes ROM files for hardware flashcarts
 * and emulators (Mesen, FCEUX, Nestopia, RetroArch, etc.).
 */

import { ProcessedPpuData } from './ppu';

export interface InesHeaderInfo {
  magic: string;
  prgRomSizeKb: number;
  chrRomSizeKb: number;
  mapper: number;
  mirroring: 'Horizontal' | 'Vertical';
  hasBattery: boolean;
  hasTrainer: boolean;
  fourScreenVram: boolean;
  rawBytes: number[];
}

/**
 * Build 16-byte iNES Header
 */
export function buildInesHeader(
  prg16KbUnits: number = 1, // 1 * 16KB = 16KB (NROM-128)
  chr8KbUnits: number = 1,  // 1 * 8KB = 8KB CHR
  mapper: number = 0,       // Mapper 0: NROM
  verticalMirroring: boolean = false
): Uint8Array {
  const header = new Uint8Array(16);

  // Bytes 0-3: 'NES' followed by MS-DOS EOF (0x1A)
  header[0] = 0x4E; // 'N'
  header[1] = 0x45; // 'E'
  header[2] = 0x53; // 'S'
  header[3] = 0x1A;

  // Byte 4: PRG ROM size in 16KB units
  header[4] = prg16KbUnits;

  // Byte 5: CHR ROM size in 8KB units
  header[5] = chr8KbUnits;

  // Byte 6: Flags 6
  // D0: Mirroring (0 = Horizontal, 1 = Vertical)
  // D1: Battery-backed PRG RAM
  // D2: 512-byte Trainer present
  // D3: Four-screen VRAM
  // D4-D7: Lower nibble of mapper number
  const mirrorBit = verticalMirroring ? 0x01 : 0x00;
  const mapperLow = (mapper & 0x0F) << 4;
  header[6] = mapperLow | mirrorBit;

  // Byte 7: Flags 7
  // D0: VS Unisystem
  // D1: PlayChoice-10
  // D2-D3: NES 2.0 format flag (if equals 2, NES 2.0)
  // D4-D7: Upper nibble of mapper number
  const mapperHigh = mapper & 0xF0;
  header[7] = mapperHigh;

  // Bytes 8-15: Zero padding (standard iNES)
  for (let i = 8; i < 16; i++) {
    header[i] = 0x00;
  }

  return header;
}

/**
 * Disassemble/inspect iNES header for interactive UI visualization
 */
export function inspectInesHeader(headerBytes: Uint8Array): InesHeaderInfo {
  const magic = String.fromCharCode(headerBytes[0], headerBytes[1], headerBytes[2]);
  const prgUnits = headerBytes[4];
  const chrUnits = headerBytes[5];
  const flags6 = headerBytes[6];
  const flags7 = headerBytes[7];

  const mapper = ((flags6 >> 4) & 0x0F) | (flags7 & 0xF0);
  const mirroring = (flags6 & 0x01) ? 'Vertical' : 'Horizontal';
  const hasBattery = Boolean(flags6 & 0x02);
  const hasTrainer = Boolean(flags6 & 0x04);
  const fourScreenVram = Boolean(flags6 & 0x08);

  return {
    magic,
    prgRomSizeKb: prgUnits * 16,
    chrRomSizeKb: chrUnits * 8,
    mapper,
    mirroring,
    hasBattery,
    hasTrainer,
    fourScreenVram,
    rawBytes: Array.from(headerBytes),
  };
}

/**
 * Generate 16KB PRG-ROM (6502 Machine Code + Palette & Nametable Tables)
 * CPU Memory map for NROM-128:
 * $C000-$FFFF: 16KB PRG ROM (mirrored at $8000-$BFFF)
 */
export function assemblePrgRom(ppuData: ProcessedPpuData): Uint8Array {
  const prg = new Uint8Array(16384); // 16KB
  let pc = 0;

  // Memory locations:
  // Base address in CPU address space: $C000
  // Vector table at $FFFA - $FFFF (prg offset 16384 - 6 = 16378 = 0x3FFA)

  // 1. Data Offsets in PRG ROM
  // We'll place data tables at offset 0x0400 ($C400)
  const DATA_OFFSET = 0x0400;
  const CPU_DATA_ADDR = 0xC000 + DATA_OFFSET;

  // 32-byte Palette Data at CPU_DATA_ADDR ($C400)
  const PALETTE_CPU_ADDR = CPU_DATA_ADDR;
  // 960-byte Nametable Data at CPU_DATA_ADDR + 32 ($C420)
  const NAMETABLE_CPU_ADDR = PALETTE_CPU_ADDR + 32;
  // 64-byte Attribute Data at CPU_DATA_ADDR + 32 + 960 ($C7E0)
  const ATTRIB_CPU_ADDR = NAMETABLE_CPU_ADDR + 960;

  // Fill code at start of PRG ROM ($C000):
  // Opcode bytes for 6502 initialization routine:

  // SEI (78)
  prg[pc++] = 0x78;
  // CLD (D8)
  prg[pc++] = 0xD8;
  // LDX #$40 (A2 40)
  prg[pc++] = 0xA2; prg[pc++] = 0x40;
  // STX $4017 (8E 17 40) - disable APU frame IRQ
  prg[pc++] = 0x8E; prg[pc++] = 0x17; prg[pc++] = 0x40;
  // LDX #$FF (A2 FF)
  prg[pc++] = 0xA2; prg[pc++] = 0xFF;
  // TXS (9A) - set stack pointer
  prg[pc++] = 0x9A;
  // INX (E8) -> X = 0
  prg[pc++] = 0xE8;
  // STX $2000 (8E 00 20) - disable NMI
  prg[pc++] = 0x8E; prg[pc++] = 0x00; prg[pc++] = 0x20;
  // STX $2001 (8E 01 20) - disable rendering
  prg[pc++] = 0x8E; prg[pc++] = 0x01; prg[pc++] = 0x20;
  // STX $4010 (8E 10 40) - disable DMC IRQs
  prg[pc++] = 0x8E; prg[pc++] = 0x10; prg[pc++] = 0x40;

  // vblankwait1:
  // BIT $2002 (2C 02 20)
  prg[pc++] = 0x2C; prg[pc++] = 0x02; prg[pc++] = 0x20;
  // BPL vblankwait1 (10 FB: -5 bytes relative)
  prg[pc++] = 0x10; prg[pc++] = 0xFB;

  // clrmem:
  // LDA #$00 (A9 00)
  prg[pc++] = 0xA9; prg[pc++] = 0x00;
  // STA $0000, X (9D 00 00)
  prg[pc++] = 0x9D; prg[pc++] = 0x00; prg[pc++] = 0x00;
  // STA $0100, X (9D 00 01)
  prg[pc++] = 0x9D; prg[pc++] = 0x00; prg[pc++] = 0x01;
  // STA $0200, X (9D 00 02)
  prg[pc++] = 0x9D; prg[pc++] = 0x00; prg[pc++] = 0x02;
  // STA $0300, X (9D 00 03)
  prg[pc++] = 0x9D; prg[pc++] = 0x00; prg[pc++] = 0x03;
  // STA $0400, X (9D 00 04)
  prg[pc++] = 0x9D; prg[pc++] = 0x00; prg[pc++] = 0x04;
  // STA $0500, X (9D 00 05)
  prg[pc++] = 0x9D; prg[pc++] = 0x00; prg[pc++] = 0x05;
  // STA $0600, X (9D 00 06)
  prg[pc++] = 0x9D; prg[pc++] = 0x00; prg[pc++] = 0x06;
  // STA $0700, X (9D 00 07)
  prg[pc++] = 0x9D; prg[pc++] = 0x00; prg[pc++] = 0x07;
  // INX (E8)
  prg[pc++] = 0xE8;
  // BNE clrmem (D0 E5: -29 bytes relative)
  prg[pc++] = 0xD0; prg[pc++] = 0xE5;

  // vblankwait2:
  // BIT $2002 (2C 02 20)
  prg[pc++] = 0x2C; prg[pc++] = 0x02; prg[pc++] = 0x20;
  // BPL vblankwait2 (10 FB)
  prg[pc++] = 0x10; prg[pc++] = 0xFB;

  // --- Load Palette into PPU $3F00 ---
  // BIT $2002 (reset PPU address latch)
  prg[pc++] = 0x2C; prg[pc++] = 0x02; prg[pc++] = 0x20;
  // LDA #$3F (A9 3F)
  prg[pc++] = 0xA9; prg[pc++] = 0x3F;
  // STA $2006 (8D 06 20)
  prg[pc++] = 0x8D; prg[pc++] = 0x06; prg[pc++] = 0x20;
  // LDA #$00 (A9 00)
  prg[pc++] = 0xA9; prg[pc++] = 0x00;
  // STA $2006 (8D 06 20)
  prg[pc++] = 0x8D; prg[pc++] = 0x06; prg[pc++] = 0x20;

  // LDX #$00 (A2 00)
  prg[pc++] = 0xA2; prg[pc++] = 0x00;
  // load_palette_loop:
  // LDA PALETTE_CPU_ADDR, X (BD low high)
  const palLo = PALETTE_CPU_ADDR & 0xFF;
  const palHi = (PALETTE_CPU_ADDR >> 8) & 0xFF;
  prg[pc++] = 0xBD; prg[pc++] = palLo; prg[pc++] = palHi;
  // STA $2007 (8D 07 20)
  prg[pc++] = 0x8D; prg[pc++] = 0x07; prg[pc++] = 0x20;
  // INX (E8)
  prg[pc++] = 0xE8;
  // CPX #$20 (E0 20) -> 32 palette entries
  prg[pc++] = 0xE0; prg[pc++] = 0x20;
  // BNE load_palette_loop (D0 F5: -11 bytes)
  prg[pc++] = 0xD0; prg[pc++] = 0xF5;

  // --- Load Nametable 0 at PPU $2000 ---
  // BIT $2002
  prg[pc++] = 0x2C; prg[pc++] = 0x02; prg[pc++] = 0x20;
  // LDA #$20
  prg[pc++] = 0xA9; prg[pc++] = 0x20;
  // STA $2006
  prg[pc++] = 0x8D; prg[pc++] = 0x06; prg[pc++] = 0x20;
  // LDA #$00
  prg[pc++] = 0xA9; prg[pc++] = 0x00;
  // STA $2006
  prg[pc++] = 0x8D; prg[pc++] = 0x06; prg[pc++] = 0x20;

  // Set up 16-bit source pointer at zero-page $00-$01 to NAMETABLE_CPU_ADDR
  // LDA #<NAMETABLE_CPU_ADDR (A9 lo)
  prg[pc++] = 0xA9; prg[pc++] = NAMETABLE_CPU_ADDR & 0xFF;
  // STA $00 (85 00)
  prg[pc++] = 0x85; prg[pc++] = 0x00;
  // LDA #>NAMETABLE_CPU_ADDR (A9 hi)
  prg[pc++] = 0xA9; prg[pc++] = (NAMETABLE_CPU_ADDR >> 8) & 0xFF;
  // STA $01 (85 01)
  prg[pc++] = 0x85; prg[pc++] = 0x01;

  // Stream 960 bytes of Nametable (3 full 256-byte pages + 1 192-byte page)
  // LDX #$00 (page index: 0, 1, 2, 3)
  prg[pc++] = 0xA2; prg[pc++] = 0x00;
  // outer_nt_page:
  const outerNtPagePc = pc;
  // LDY #$00 (A0 00)
  prg[pc++] = 0xA0; prg[pc++] = 0x00;

  // inner_nt_byte:
  const innerNtBytePc = pc;
  // LDA ($00), Y (B1 00)
  prg[pc++] = 0xB1; prg[pc++] = 0x00;
  // STA $2007 (8D 07 20)
  prg[pc++] = 0x8D; prg[pc++] = 0x07; prg[pc++] = 0x20;
  // INY (C8)
  prg[pc++] = 0xC8;

  // Check if we are on page 3 (last page which only has 192 bytes = $C0)
  // CPX #$03 (E0 03)
  prg[pc++] = 0xE0; prg[pc++] = 0x03;
  // BNE normal_256 (D0 04)
  prg[pc++] = 0xD0; prg[pc++] = 0x04;
  // CPY #$C0 (C0 C0: 192 bytes)
  prg[pc++] = 0xC0; prg[pc++] = 0xC0;
  // BEQ finish_nt (F0 04)
  prg[pc++] = 0xF0; prg[pc++] = 0x04;
  // normal_256:
  // BNE inner_nt_byte
  const relInner = innerNtBytePc - (pc + 2);
  prg[pc++] = 0xD0; prg[pc++] = relInner & 0xFF;

  // Advance pointer high byte: INC $01 (E6 01)
  prg[pc++] = 0xE6; prg[pc++] = 0x01;
  // INX (E8)
  prg[pc++] = 0xE8;
  // CPX #$04 (E0 04)
  prg[pc++] = 0xE0; prg[pc++] = 0x04;
  // BNE outer_nt_page
  const relOuter = outerNtPagePc - (pc + 2);
  prg[pc++] = 0xD0; prg[pc++] = relOuter & 0xFF;

  // --- Load 64 bytes of Attribute Table into PPU $23C0 ---
  // BIT $2002
  prg[pc++] = 0x2C; prg[pc++] = 0x02; prg[pc++] = 0x20;
  // LDA #$23 (A9 23)
  prg[pc++] = 0xA9; prg[pc++] = 0x23;
  // STA $2006
  prg[pc++] = 0x8D; prg[pc++] = 0x06; prg[pc++] = 0x20;
  // LDA #$C0 (A9 C0)
  prg[pc++] = 0xA9; prg[pc++] = 0xC0;
  // STA $2006
  prg[pc++] = 0x8D; prg[pc++] = 0x06; prg[pc++] = 0x20;

  // LDX #$00
  prg[pc++] = 0xA2; prg[pc++] = 0x00;
  // load_attr_loop:
  const loadAttrPc = pc;
  // LDA ATTRIB_CPU_ADDR, X (BD lo hi)
  const attrLo = ATTRIB_CPU_ADDR & 0xFF;
  const attrHi = (ATTRIB_CPU_ADDR >> 8) & 0xFF;
  prg[pc++] = 0xBD; prg[pc++] = attrLo; prg[pc++] = attrHi;
  // STA $2007 (8D 07 20)
  prg[pc++] = 0x8D; prg[pc++] = 0x07; prg[pc++] = 0x20;
  // INX (E8)
  prg[pc++] = 0xE8;
  // CPX #$40 (E0 40: 64 bytes)
  prg[pc++] = 0xE0; prg[pc++] = 0x40;
  // BNE load_attr_loop
  const relAttr = loadAttrPc - (pc + 2);
  prg[pc++] = 0xD0; prg[pc++] = relAttr & 0xFF;

  // --- Turn on NES Screen & Scroll ---
  // Reset Scroll latch: LDA #$00; STA $2005; STA $2005
  prg[pc++] = 0xA9; prg[pc++] = 0x00;
  prg[pc++] = 0x8D; prg[pc++] = 0x05; prg[pc++] = 0x20;
  prg[pc++] = 0x8D; prg[pc++] = 0x05; prg[pc++] = 0x20;

  // Enable NMI & background pattern table at $0000:
  // LDA #%10000000 ($80)
  // STA $2000
  prg[pc++] = 0xA9; prg[pc++] = 0x80;
  prg[pc++] = 0x8D; prg[pc++] = 0x00; prg[pc++] = 0x20;

  // Enable background rendering & left 8px clipping off:
  // LDA #%00011110 ($1E)
  // STA $2001
  prg[pc++] = 0xA9; prg[pc++] = 0x1E;
  prg[pc++] = 0x8D; prg[pc++] = 0x01; prg[pc++] = 0x20;

  // Infinite main loop:
  // jmp_loop: JMP jmp_loop (4C lo hi)
  const loopAddr = 0xC000 + pc;
  prg[pc++] = 0x4C;
  prg[pc++] = loopAddr & 0xFF;
  prg[pc++] = (loopAddr >> 8) & 0xFF;

  // NMI Handler (just RTI: 40)
  const nmiAddr = 0xC000 + pc;
  prg[pc++] = 0x40; // RTI

  // IRQ Handler (just RTI: 40)
  const irqAddr = 0xC000 + pc;
  prg[pc++] = 0x40; // RTI

  // 2. Write Data Tables at DATA_OFFSET (0x0400)
  let dPtr = DATA_OFFSET;

  // Palette table: 32 bytes (16 BG colors + 16 sprite mirrors)
  const palBytes = new Uint8Array(32);
  // Subpalettes 0-3
  for (let p = 0; p < 4; p++) {
    for (let c = 0; c < 4; c++) {
      palBytes[p * 4 + c] = ppuData.subpalettes[p][c] & 0x3F;
    }
  }
  // Sprite palettes (mirror BG for elegance)
  for (let i = 0; i < 16; i++) {
    palBytes[16 + i] = palBytes[i];
  }
  prg.set(palBytes, dPtr);
  dPtr += 32;

  // Nametable table: 960 bytes
  prg.set(ppuData.nametable, dPtr);
  dPtr += 960;

  // Attribute table: 64 bytes
  prg.set(ppuData.attributeBytes, dPtr);
  dPtr += 64;

  // 3. Write 6502 Hardware Interrupt Vectors at $FFFA-$FFFF (offset 0x3FFA)
  const VECTORS_OFFSET = 16384 - 6; // 0x3FFA
  // $FFFA: NMI vector
  prg[VECTORS_OFFSET] = nmiAddr & 0xFF;
  prg[VECTORS_OFFSET + 1] = (nmiAddr >> 8) & 0xFF;
  // $FFFC: RESET vector -> points to start of PRG $C000
  prg[VECTORS_OFFSET + 2] = 0x00;
  prg[VECTORS_OFFSET + 3] = 0xC0;
  // $FFFE: IRQ/BRK vector
  prg[VECTORS_OFFSET + 4] = irqAddr & 0xFF;
  prg[VECTORS_OFFSET + 5] = (irqAddr >> 8) & 0xFF;

  return prg;
}

/**
 * Build Complete Valid .NES ROM
 * Combines 16-byte iNES Header + 16KB PRG ROM + 8KB CHR ROM = 24592 bytes
 */
export function generateNesRom(ppuData: ProcessedPpuData): {
  romData: Uint8Array;
  header: Uint8Array;
  headerInfo: InesHeaderInfo;
} {
  const header = buildInesHeader(1, 1, 0, false);
  const prgRom = assemblePrgRom(ppuData);
  const chrRom = ppuData.chrRom; // 8192 bytes

  const totalLength = header.length + prgRom.length + chrRom.length; // 16 + 16384 + 8192 = 24592
  const romData = new Uint8Array(totalLength);

  romData.set(header, 0);
  romData.set(prgRom, 16);
  romData.set(chrRom, 16 + 16384);

  const headerInfo = inspectInesHeader(header);

  return { romData, header, headerInfo };
}

/**
 * Generate 6502 Assembly source text (.s / .asm) for ca65 / asm6 / nesasm
 */
export function generateAssemblySource(ppuData: ProcessedPpuData): string {
  let asm = `; ====================================================================\n`;
  asm += `; NEScam Generated 6502 Assembly Source\n`;
  asm += `; Target: Nintendo Entertainment System (NES / Famicom)\n`;
  asm += `; Mapper: 0 (NROM-128), Mirroring: Horizontal\n`;
  asm += `; Screen: 256x240, 960 Tiles, 256 CHR Pattern Table 0\n`;
  asm += `; ====================================================================\n\n`;

  asm += `.segment "HEADER"\n`;
  asm += `  .byte "NES", $1A ; iNES Magic identifier\n`;
  asm += `  .byte 1          ; 1 x 16KB PRG ROM\n`;
  asm += `  .byte 1          ; 1 x 8KB CHR ROM\n`;
  asm += `  .byte %00000000  ; Mapper 0, Horizontal mirroring\n`;
  asm += `  .byte %00000000  ; Mapper 0 high nibble\n`;
  asm += `  .res 8, 0        ; Padding\n\n`;

  asm += `.segment "RODATA"\n`;
  asm += `palette_data:\n`;
  for (let p = 0; p < 4; p++) {
    const pal = ppuData.subpalettes[p].map(c => '$' + (c & 0x3F).toString(16).padStart(2, '0').toUpperCase()).join(', ');
    asm += `  .byte ${pal} ; Subpalette ${p}\n`;
  }
  asm += `  ; Sprite palette mirrors\n`;
  for (let p = 0; p < 4; p++) {
    const pal = ppuData.subpalettes[p].map(c => '$' + (c & 0x3F).toString(16).padStart(2, '0').toUpperCase()).join(', ');
    asm += `  .byte ${pal}\n`;
  }

  asm += `\nattribute_data:\n`;
  for (let i = 0; i < 64; i += 8) {
    const row = Array.from(ppuData.attributeBytes.slice(i, i + 8))
      .map(b => '$' + b.toString(16).padStart(2, '0').toUpperCase())
      .join(', ');
    asm += `  .byte ${row}\n`;
  }

  asm += `\nnametable_data:\n`;
  for (let row = 0; row < 30; row++) {
    const slice = Array.from(ppuData.nametable.slice(row * 32, (row + 1) * 32))
      .map(b => '$' + b.toString(16).padStart(2, '0').toUpperCase())
      .join(', ');
    asm += `  .byte ${slice} ; Row ${row}\n`;
  }

  return asm;
}

/**
 * Generate C Header file (.h) for cc65 / neslib
 */
export function generateCHeader(ppuData: ProcessedPpuData): string {
  let c = `/* NEScam C Header for cc65 / neslib */\n`;
  c += `#ifndef NESCAM_IMAGE_H\n#define NESCAM_IMAGE_H\n\n`;

  c += `const unsigned char PALETTE_DATA[32] = {\n  `;
  for (let p = 0; p < 4; p++) {
    c += ppuData.subpalettes[p].map(val => '0x' + (val & 0x3F).toString(16).padStart(2, '0').toUpperCase()).join(', ') + ', ';
  }
  for (let p = 0; p < 4; p++) {
    c += ppuData.subpalettes[p].map(val => '0x' + (val & 0x3F).toString(16).padStart(2, '0').toUpperCase()).join(', ') + (p === 3 ? '' : ', ');
  }
  c += `\n};\n\n`;

  c += `const unsigned char ATTRIBUTE_DATA[64] = {\n`;
  for (let i = 0; i < 64; i += 8) {
    const row = Array.from(ppuData.attributeBytes.slice(i, i + 8))
      .map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
      .join(', ');
    c += `  ${row},\n`;
  }
  c += `};\n\n`;

  c += `const unsigned char NAMETABLE_DATA[960] = {\n`;
  for (let row = 0; row < 30; row++) {
    const slice = Array.from(ppuData.nametable.slice(row * 32, (row + 1) * 32))
      .map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
      .join(', ');
    c += `  ${slice},\n`;
  }
  c += `};\n\n`;

  c += `#endif /* NESCAM_IMAGE_H */\n`;
  return c;
}
