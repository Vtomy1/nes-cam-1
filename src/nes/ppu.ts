/**
 * NES PPU Architecture & Tile Processing Engine
 * - 256x240 screen resolution (32x30 8x8 tiles = 960 tiles)
 * - 16x16 attribute blocks (16x15 = 240 attribute blocks, packed into 64 attribute bytes)
 * - 2BPP planar format conversion (16 bytes per 8x8 tile)
 * - Intelligent tile deduplication & clustering (960 screen tiles -> 256 CHR pattern table tiles)
 * - Nametable ($2000) & Attribute table ($23C0) generation
 */

import { NES_MASTER_PALETTE, findClosestMasterColor, colorDistanceSq } from './palette';
import { ditherToPpu, DitherOptions } from './dither';

export const NES_WIDTH = 256;
export const NES_HEIGHT = 240;
export const TILES_X = 32;
export const TILES_Y = 30;
export const TOTAL_SCREEN_TILES = TILES_X * TILES_Y; // 960

export const ATTRIBUTE_BLOCKS_X = 16;
export const ATTRIBUTE_BLOCKS_Y = 15;
export const TOTAL_ATTRIBUTE_BLOCKS = ATTRIBUTE_BLOCKS_X * ATTRIBUTE_BLOCKS_Y; // 240
export const ATTRIBUTE_TABLE_BYTES = 64; // 8x8 32x32 blocks

export interface ProcessedPpuData {
  // Dimensions
  width: number;
  height: number;
  // Subpalettes (4 palettes of 4 NES master indices)
  subpalettes: [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number]
  ];
  // Attribute table: palette assigned to each 16x16 block (length 240)
  attributeMap: Uint8Array;
  // Raw attribute table bytes ready for NES PPU at $23C0 (length 64)
  attributeBytes: Uint8Array;
  // Nametable tile indices for the 32x30 screen at $2000 (length 960)
  nametable: Uint8Array;
  // CHR ROM Pattern Table 0 (256 tiles * 16 bytes = 4096 bytes)
  patternTable0: Uint8Array;
  // Full 8KB CHR-ROM (Pattern Table 0 + Pattern Table 1 = 8192 bytes)
  chrRom: Uint8Array;
  // Pixel data for visual rendering
  pixelSubIndices: Uint8Array; // 0..3 color index within subpalette
  pixelNesIndices: Uint8Array; // 0..63 NES master palette index
  // Statistics
  uniqueRawTiles: number;
  finalChrTilesCount: number;
  compressionRatio: number;
}

/**
 * Automatically analyze image blocks and determine optimal 4 NES subpalettes
 * with a common background color 0.
 */
export function extractOptimalSubpalettes(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number]
] {
  // 1. Histogram of closest NES colors across the whole image
  const colorCounts = new Int32Array(64);
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const matched = findClosestMasterColor(r, g, b);
    colorCounts[matched.index]++;
  }

  // Find most frequent color as universal background (or default black 0x0F)
  let bestBg = 0x0F;
  let maxCount = -1;
  for (let i = 0; i < 64; i++) {
    if (colorCounts[i] > maxCount) {
      maxCount = colorCounts[i];
      bestBg = i;
    }
  }

  // Rank top remaining colors
  const rankedColors: { index: number; count: number }[] = [];
  for (let i = 0; i < 64; i++) {
    if (i !== bestBg && colorCounts[i] > 0) {
      rankedColors.push({ index: i, count: colorCounts[i] });
    }
  }
  rankedColors.sort((a, b) => b.count - a.count);

  // Group into 4 palettes of 3 unique colors + 1 universal background
  // If not enough colors found, pad with classic defaults
  const fallbackColors = [0x16, 0x27, 0x30, 0x01, 0x11, 0x21, 0x0A, 0x1A, 0x2A, 0x00, 0x10, 0x30];
  const chosenIndices: number[] = [];

  for (const item of rankedColors) {
    if (chosenIndices.length < 12) {
      chosenIndices.push(item.index);
    }
  }

  let fbIdx = 0;
  while (chosenIndices.length < 12) {
    const candidate = fallbackColors[fbIdx % fallbackColors.length];
    if (!chosenIndices.includes(candidate) && candidate !== bestBg) {
      chosenIndices.push(candidate);
    }
    fbIdx++;
  }

  return [
    [bestBg, chosenIndices[0], chosenIndices[1], chosenIndices[2]],
    [bestBg, chosenIndices[3], chosenIndices[4], chosenIndices[5]],
    [bestBg, chosenIndices[6], chosenIndices[7], chosenIndices[8]],
    [bestBg, chosenIndices[9], chosenIndices[10], chosenIndices[11]],
  ];
}

/**
 * Determine the best subpalette for each 16x16 attribute block
 */
export function assignAttributeBlocks(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  subpalettes: [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number]
  ]
): Uint8Array {
  const blocksX = Math.ceil(width / 16);
  const blocksY = Math.ceil(height / 16);
  const attributeMap = new Uint8Array(blocksX * blocksY);

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      // Evaluate which of the 4 subpalettes yields the lowest cumulative error
      let bestPalette = 0;
      let minTotalDist = Infinity;

      for (let p = 0; p < 4; p++) {
        const sub = subpalettes[p];
        let totalDist = 0;

        // Sample pixels inside this 16x16 block (step by 2 for high performance)
        for (let py = 0; py < 16; py += 2) {
          const y = by * 16 + py;
          if (y >= height) continue;

          for (let px = 0; px < 16; px += 2) {
            const x = bx * 16 + px;
            if (x >= width) continue;

            const idx = (y * width + x) * 4;
            const r = rgba[idx];
            const g = rgba[idx + 1];
            const b = rgba[idx + 2];

            // Find closest color within subpalette p
            let closestDist = Infinity;
            for (let c = 0; c < 4; c++) {
              const palColor = NES_MASTER_PALETTE[sub[c]];
              const dist = colorDistanceSq(r, g, b, palColor.r, palColor.g, palColor.b);
              if (dist < closestDist) {
                closestDist = dist;
              }
            }
            totalDist += closestDist;
          }
        }

        if (totalDist < minTotalDist) {
          minTotalDist = totalDist;
          bestPalette = p;
        }
      }

      attributeMap[by * blocksX + bx] = bestPalette;
    }
  }

  return attributeMap;
}

/**
 * Pack 16x16 attribute block choices into standard 64-byte NES Attribute Table
 * PPU Memory: $23C0 - $23FF
 * Each byte represents a 32x32 pixel area (4 16x16 blocks):
 * bits 0-1: top-left (x, y)
 * bits 2-3: top-right (x+1, y)
 * bits 4-5: bottom-left (x, y+1)
 * bits 6-7: bottom-right (x+1, y+1)
 */
export function packAttributeTableBytes(attributeMap: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(64);

  for (let byteY = 0; byteY < 8; byteY++) {
    for (let byteX = 0; byteX < 8; byteX++) {
      const blockX = byteX * 2;
      const blockY = byteY * 2;

      const tl = (blockY < ATTRIBUTE_BLOCKS_Y && blockX < ATTRIBUTE_BLOCKS_X)
        ? attributeMap[blockY * ATTRIBUTE_BLOCKS_X + blockX] : 0;
      const tr = (blockY < ATTRIBUTE_BLOCKS_Y && (blockX + 1) < ATTRIBUTE_BLOCKS_X)
        ? attributeMap[blockY * ATTRIBUTE_BLOCKS_X + (blockX + 1)] : 0;
      const bl = ((blockY + 1) < ATTRIBUTE_BLOCKS_Y && blockX < ATTRIBUTE_BLOCKS_X)
        ? attributeMap[(blockY + 1) * ATTRIBUTE_BLOCKS_X + blockX] : 0;
      const br = ((blockY + 1) < ATTRIBUTE_BLOCKS_Y && (blockX + 1) < ATTRIBUTE_BLOCKS_X)
        ? attributeMap[(blockY + 1) * ATTRIBUTE_BLOCKS_X + (blockX + 1)] : 0;

      const packed = (tl & 3) | ((tr & 3) << 2) | ((bl & 3) << 4) | ((br & 3) << 6);
      bytes[byteY * 8 + byteX] = packed;
    }
  }

  return bytes;
}

/**
 * Encode an 8x8 pixel tile of color subindices (0..3) into 16 bytes of 2BPP planar data
 */
export function encodeTile2bpp(pixels8x8: Uint8Array): Uint8Array {
  const tileBytes = new Uint8Array(16);

  for (let row = 0; row < 8; row++) {
    let plane0 = 0;
    let plane1 = 0;

    for (let col = 0; col < 8; col++) {
      const colorSubIdx = pixels8x8[row * 8 + col] & 3;
      const bit0 = colorSubIdx & 1;
      const bit1 = (colorSubIdx >> 1) & 1;
      const shift = 7 - col;

      plane0 |= (bit0 << shift);
      plane1 |= (bit1 << shift);
    }

    tileBytes[row] = plane0;
    tileBytes[row + 8] = plane1;
  }

  return tileBytes;
}

/**
 * Calculate difference score between two 16-byte 2BPP planar tiles
 */
function tileDiffScore(tileA: Uint8Array, tileB: Uint8Array): number {
  let score = 0;
  for (let i = 0; i < 16; i++) {
    const diff = tileA[i] ^ tileB[i];
    if (diff !== 0) {
      // Count set bits
      let v = diff;
      v = v - ((v >> 1) & 0x55);
      v = (v & 0x33) + ((v >> 2) & 0x33);
      score += (((v + (v >> 4)) & 0x0F) * 0x01);
    }
  }
  return score;
}

/**
 * Tile Deduplication & Clustering
 * Takes 960 screen tiles, extracts exact uniques, and if > 256 tiles,
 * performs greedy error clustering to downsample to 256 tiles for Pattern Table 0.
 */
export function buildTileDictionary(rawTiles16Bytes: Uint8Array[]): {
  chrTiles: Uint8Array[]; // Max 256 tiles
  nametable: Uint8Array;  // 960 tile IDs (0..255)
  uniqueCount: number;
} {
  const nametable = new Uint8Array(TOTAL_SCREEN_TILES);

  // 1. Group exact duplicates using string/hash keys
  const uniqueMap = new Map<string, number>();
  const uniqueTiles: Uint8Array[] = [];
  const tileIndices: number[] = new Array(TOTAL_SCREEN_TILES);

  for (let i = 0; i < TOTAL_SCREEN_TILES; i++) {
    const tile = rawTiles16Bytes[i];
    // Create fast 16-byte string key
    let key = '';
    for (let b = 0; b < 16; b++) {
      key += String.fromCharCode(tile[b]);
    }

    if (uniqueMap.has(key)) {
      tileIndices[i] = uniqueMap.get(key)!;
    } else {
      const newIdx = uniqueTiles.length;
      uniqueMap.set(key, newIdx);
      uniqueTiles.push(tile);
      tileIndices[i] = newIdx;
    }
  }

  const rawUniqueCount = uniqueTiles.length;

  // 2. If <= 256 unique tiles, we have a lossless fit!
  if (rawUniqueCount <= 256) {
    for (let i = 0; i < TOTAL_SCREEN_TILES; i++) {
      nametable[i] = tileIndices[i];
    }
    return {
      chrTiles: uniqueTiles,
      nametable,
      uniqueCount: rawUniqueCount,
    };
  }

  // 3. If > 256 unique tiles:
  // Sort unique tiles by frequency of occurrence across the screen
  const freq = new Int32Array(rawUniqueCount);
  for (let i = 0; i < TOTAL_SCREEN_TILES; i++) {
    freq[tileIndices[i]]++;
  }

  const sortedUniqueIndices = Array.from({ length: rawUniqueCount }, (_, i) => i)
    .sort((a, b) => freq[b] - freq[a]);

  // Keep top 256 most frequent tiles as our CHR dictionary
  const chrTiles: Uint8Array[] = [];
  const remapping = new Int32Array(rawUniqueCount).fill(-1);

  for (let i = 0; i < 256; i++) {
    const oldIdx = sortedUniqueIndices[i];
    remapping[oldIdx] = i;
    chrTiles.push(uniqueTiles[oldIdx]);
  }

  // For the remaining tiles (>256), find the closest matching tile in the 256 dictionary
  for (let i = 256; i < rawUniqueCount; i++) {
    const oldIdx = sortedUniqueIndices[i];
    const candidateTile = uniqueTiles[oldIdx];

    let bestMatch = 0;
    let minDiff = Infinity;

    for (let c = 0; c < 256; c++) {
      const diff = tileDiffScore(candidateTile, chrTiles[c]);
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = c;
        if (diff === 0) break;
      }
    }

    remapping[oldIdx] = bestMatch;
  }

  // Build final nametable
  for (let i = 0; i < TOTAL_SCREEN_TILES; i++) {
    const oldIdx = tileIndices[i];
    nametable[i] = remapping[oldIdx];
  }

  return {
    chrTiles,
    nametable,
    uniqueCount: rawUniqueCount,
  };
}

/**
 * Main NES PPU Pipeline: Process Webcam / Image RGBA into complete PPU hardware state
 */
export function processImageToPpu(
  sourceRgba: Uint8ClampedArray,
  userSubpalettes?: [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number]
  ],
  ditherOpts: DitherOptions = {
    algorithm: 'floyd_steinberg',
    strength: 1.0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
  }
): ProcessedPpuData {
  // 1. Determine or use subpalettes
  const subpalettes = userSubpalettes ?? extractOptimalSubpalettes(sourceRgba, NES_WIDTH, NES_HEIGHT);

  // 2. Assign attribute blocks (16x16)
  const attributeMap = assignAttributeBlocks(sourceRgba, NES_WIDTH, NES_HEIGHT, subpalettes);

  // 3. Pack attribute bytes for PPU $23C0
  const attributeBytes = packAttributeTableBytes(attributeMap);

  // 4. Dither pixels to subpalette indices
  const { pixelSubIndices, pixelNesIndices } = ditherToPpu(
    sourceRgba,
    NES_WIDTH,
    NES_HEIGHT,
    subpalettes,
    attributeMap,
    ditherOpts
  );

  // 5. Extract 960 8x8 raw tiles in 2BPP planar format
  const rawTiles: Uint8Array[] = [];
  const tile8x8Buf = new Uint8Array(64);

  for (let ty = 0; ty < TILES_Y; ty++) {
    for (let tx = 0; tx < TILES_X; tx++) {
      // Gather 64 pixel subindices for tile (tx, ty)
      for (let py = 0; py < 8; py++) {
        const y = ty * 8 + py;
        for (let px = 0; px < 8; px++) {
          const x = tx * 8 + px;
          tile8x8Buf[py * 8 + px] = pixelSubIndices[y * NES_WIDTH + x];
        }
      }
      rawTiles.push(encodeTile2bpp(tile8x8Buf));
    }
  }

  // 6. Build 256 CHR Pattern Table 0 and Nametable
  const { chrTiles, nametable, uniqueCount } = buildTileDictionary(rawTiles);

  // Assemble Pattern Table 0 (4096 bytes)
  const patternTable0 = new Uint8Array(4096);
  for (let i = 0; i < chrTiles.length; i++) {
    patternTable0.set(chrTiles[i], i * 16);
  }

  // Assemble full 8KB CHR-ROM (Pattern Table 0 at $0000 + Pattern Table 1 at $1000)
  const chrRom = new Uint8Array(8192);
  chrRom.set(patternTable0, 0);
  // Pattern Table 1 can duplicate or contain font/sprite data; here we mirror Pattern Table 0 or leave clean
  chrRom.set(patternTable0, 4096);

  const compressionRatio = Number(((1 - (chrTiles.length / TOTAL_SCREEN_TILES)) * 100).toFixed(1));

  return {
    width: NES_WIDTH,
    height: NES_HEIGHT,
    subpalettes,
    attributeMap,
    attributeBytes,
    nametable,
    patternTable0,
    chrRom,
    pixelSubIndices,
    pixelNesIndices,
    uniqueRawTiles: uniqueCount,
    finalChrTilesCount: chrTiles.length,
    compressionRatio,
  };
}
