/**
 * NES Dithering Algorithms
 * Supports:
 * - Floyd-Steinberg (Error Diffusion)
 * - Atkinson (Classic Mac / NES 8-bit style)
 * - Bayer 4x4 & Bayer 8x8 (Ordered Matrix Dithering)
 * - Sierra-Lite (Fast 3-point Error Diffusion)
 * - Burkes (Crisp 7-point Error Diffusion)
 * - None (Thresholding / Nearest)
 */

import { findClosestInSubpalette, NES_MASTER_PALETTE } from './palette';

export type DitherAlgorithm =
  | 'floyd_steinberg'
  | 'atkinson'
  | 'bayer_4x4'
  | 'bayer_8x8'
  | 'sierra_lite'
  | 'burkes'
  | 'none';

export interface DitherOptions {
  algorithm: DitherAlgorithm;
  strength: number; // 0.0 to 1.5 (default 1.0)
  brightness: number; // -100 to 100 (default 0)
  contrast: number; // -100 to 100 (default 0)
  saturation: number; // -100 to 100 (default 0)
}

// 4x4 Bayer Matrix normalized to -0.5 to 0.5
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
].map(row => row.map(v => (v / 16 - 0.5)));

// 8x8 Bayer Matrix normalized to -0.5 to 0.5
const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map(row => row.map(v => (v / 64 - 0.5)));

/**
 * Apply Brightness, Contrast and Saturation to raw RGB pixel
 */
export function adjustPixel(
  r: number,
  g: number,
  b: number,
  brightness: number,
  contrast: number,
  saturation: number
): [number, number, number] {
  // 1. Brightness
  let nr = r + brightness * 1.5;
  let ng = g + brightness * 1.5;
  let nb = b + brightness * 1.5;

  // 2. Contrast
  if (contrast !== 0) {
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    nr = factor * (nr - 128) + 128;
    ng = factor * (ng - 128) + 128;
    nb = factor * (nb - 128) + 128;
  }

  // 3. Saturation
  if (saturation !== 0) {
    const gray = 0.2989 * nr + 0.587 * ng + 0.114 * nb;
    const satFactor = 1 + saturation / 100;
    nr = gray + (nr - gray) * satFactor;
    ng = gray + (ng - gray) * satFactor;
    nb = gray + (nb - gray) * satFactor;
  }

  return [
    Math.max(0, Math.min(255, nr)),
    Math.max(0, Math.min(255, ng)),
    Math.max(0, Math.min(255, nb)),
  ];
}

/**
 * Quantize and dither a 256x240 image with 16x16 attribute subpalettes
 * Returns:
 * - pixelSubIndices: Uint8Array(256 * 240) storing color subindex (0-3) for each pixel
 * - pixelNesIndices: Uint8Array(256 * 240) storing raw NES palette color (0x00-0x3F)
 */
export function ditherToPpu(
  sourceRgba: Uint8ClampedArray,
  width: number,
  height: number,
  subpalettes: [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number]
  ],
  attributeMap: Uint8Array, // (16x15 blocks) -> 0..3 palette index for each 16x16 block
  options: DitherOptions
): {
  pixelSubIndices: Uint8Array;
  pixelNesIndices: Uint8Array;
} {
  const pixelCount = width * height;
  const pixelSubIndices = new Uint8Array(pixelCount);
  const pixelNesIndices = new Uint8Array(pixelCount);

  // Floating point RGB buffers for error diffusion
  const bufR = new Float32Array(pixelCount);
  const bufG = new Float32Array(pixelCount);
  const bufB = new Float32Array(pixelCount);

  // Preload and adjust
  for (let i = 0; i < pixelCount; i++) {
    const srcIdx = i * 4;
    const [ar, ag, ab] = adjustPixel(
      sourceRgba[srcIdx],
      sourceRgba[srcIdx + 1],
      sourceRgba[srcIdx + 2],
      options.brightness,
      options.contrast,
      options.saturation
    );
    bufR[i] = ar;
    bufG[i] = ag;
    bufB[i] = ab;
  }

  const strength = options.strength;
  const blocksX = Math.ceil(width / 16);

  // Error distribution helpers
  const diffuseError = (x: number, y: number, er: number, eg: number, eb: number, factor: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    const f = factor * strength;
    bufR[idx] += er * f;
    bufG[idx] += eg * f;
    bufB[idx] += eb * f;
  };

  for (let y = 0; y < height; y++) {
    const blockY = Math.floor(y / 16);

    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const blockX = Math.floor(x / 16);
      const paletteIndex = attributeMap[blockY * blocksX + blockX] ?? 0;
      const subpalette = subpalettes[paletteIndex];

      let r = bufR[idx];
      let g = bufG[idx];
      let b = bufB[idx];

      // Ordered dithering bias (Bayer)
      if (options.algorithm === 'bayer_4x4') {
        const bias = BAYER_4X4[y % 4][x % 4] * 64 * strength;
        r += bias;
        g += bias;
        b += bias;
      } else if (options.algorithm === 'bayer_8x8') {
        const bias = BAYER_8X8[y % 8][x % 8] * 64 * strength;
        r += bias;
        g += bias;
        b += bias;
      }

      // Clamp before matching
      const clampedR = Math.max(0, Math.min(255, r));
      const clampedG = Math.max(0, Math.min(255, g));
      const clampedB = Math.max(0, Math.min(255, b));

      const matched = findClosestInSubpalette(clampedR, clampedG, clampedB, subpalette);
      pixelSubIndices[idx] = matched.subIndex;
      pixelNesIndices[idx] = matched.nesIndex;

      // Calculate Quantization Error
      const matchColor = NES_MASTER_PALETTE[matched.nesIndex];
      const errR = clampedR - matchColor.r;
      const errG = clampedG - matchColor.g;
      const errB = clampedB - matchColor.b;

      // Error Diffusion algorithms
      if (options.algorithm === 'floyd_steinberg') {
        diffuseError(x + 1, y, errR, errG, errB, 7 / 16);
        diffuseError(x - 1, y + 1, errR, errG, errB, 3 / 16);
        diffuseError(x, y + 1, errR, errG, errB, 5 / 16);
        diffuseError(x + 1, y + 1, errR, errG, errB, 1 / 16);
      } else if (options.algorithm === 'atkinson') {
        diffuseError(x + 1, y, errR, errG, errB, 1 / 8);
        diffuseError(x + 2, y, errR, errG, errB, 1 / 8);
        diffuseError(x - 1, y + 1, errR, errG, errB, 1 / 8);
        diffuseError(x, y + 1, errR, errG, errB, 1 / 8);
        diffuseError(x + 1, y + 1, errR, errG, errB, 1 / 8);
        diffuseError(x, y + 2, errR, errG, errB, 1 / 8);
      } else if (options.algorithm === 'sierra_lite') {
        diffuseError(x + 1, y, errR, errG, errB, 2 / 4);
        diffuseError(x - 1, y + 1, errR, errG, errB, 1 / 4);
        diffuseError(x, y + 1, errR, errG, errB, 1 / 4);
      } else if (options.algorithm === 'burkes') {
        diffuseError(x + 1, y, errR, errG, errB, 8 / 32);
        diffuseError(x + 2, y, errR, errG, errB, 4 / 32);
        diffuseError(x - 2, y + 1, errR, errG, errB, 2 / 32);
        diffuseError(x - 1, y + 1, errR, errG, errB, 4 / 32);
        diffuseError(x, y + 1, errR, errG, errB, 8 / 32);
        diffuseError(x + 1, y + 1, errR, errG, errB, 4 / 32);
        diffuseError(x + 2, y + 1, errR, errG, errB, 2 / 32);
      }
    }
  }

  return { pixelSubIndices, pixelNesIndices };
}
