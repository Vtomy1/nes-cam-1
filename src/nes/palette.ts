/**
 * NES 2C02 PPU Master Palette
 * 64 authentic hardware colors standard in NES / Famicom emulation.
 * RGB values based on standard NTSC 2C02 PPU palette (composite decoding).
 */

export interface NesColor {
  index: number;
  hex: string;
  r: number;
  g: number;
  b: number;
  name: string;
}

export const NES_MASTER_PALETTE: NesColor[] = [
  // 0x00 - 0x0F
  { index: 0x00, hex: '#666666', r: 102, g: 102, b: 102, name: 'Gray 1' },
  { index: 0x01, hex: '#002A88', r: 0,   g: 42,  b: 136, name: 'Deep Blue' },
  { index: 0x02, hex: '#1412A7', r: 20,  g: 18,  b: 167, name: 'Dark Indigo' },
  { index: 0x03, hex: '#3B00A4', r: 59,  g: 0,   b: 164, name: 'Deep Violet' },
  { index: 0x04, hex: '#5C007E', r: 92,  g: 0,   b: 126, name: 'Dark Magenta' },
  { index: 0x05, hex: '#6E0040', r: 110, g: 0,   b: 64,  name: 'Dark Red-Violet' },
  { index: 0x06, hex: '#6C0600', r: 108, g: 6,   b: 0,   name: 'Dark Red' },
  { index: 0x07, hex: '#561D00', r: 86,  g: 29,  b: 0,   name: 'Dark Orange-Brown' },
  { index: 0x08, hex: '#333500', r: 51,  g: 53,  b: 0,   name: 'Dark Olive' },
  { index: 0x09, hex: '#0B4800', r: 11,  g: 72,  b: 0,   name: 'Dark Green' },
  { index: 0x0A, hex: '#005200', r: 0,   g: 82,  b: 0,   name: 'Deep Green' },
  { index: 0x0B, hex: '#004F08', r: 0,   g: 79,  b: 8,   name: 'Forest Green' },
  { index: 0x0C, hex: '#00404D', r: 0,   g: 64,  b: 77,  name: 'Dark Cyan' },
  { index: 0x0D, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'True Black' },
  { index: 0x0E, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black' },
  { index: 0x0F, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'NES Black' },

  // 0x10 - 0x1F
  { index: 0x10, hex: '#ADADAD', r: 173, g: 173, b: 173, name: 'Light Gray' },
  { index: 0x11, hex: '#155FD9', r: 21,  g: 95,  b: 217, name: 'Royal Blue' },
  { index: 0x12, hex: '#4240FF', r: 66,  g: 64,  b: 255, name: 'Blue-Purple' },
  { index: 0x13, hex: '#7527FE', r: 117, g: 39,  b: 254, name: 'Purple' },
  { index: 0x14, hex: '#A01ACC', r: 160, g: 26,  b: 204, name: 'Vibrant Magenta' },
  { index: 0x15, hex: '#B71E7B', r: 183, g: 30,  b: 123, name: 'Crimson' },
  { index: 0x16, hex: '#B53120', r: 181, g: 49,  b: 32,  name: 'Brick Red' },
  { index: 0x17, hex: '#994E00', r: 153, g: 78,  b: 0,   name: 'Ochre Orange' },
  { index: 0x18, hex: '#6B6D00', r: 107, g: 109, b: 0,   name: 'Yellow-Olive' },
  { index: 0x19, hex: '#388700', r: 56,  g: 135, b: 0,   name: 'Leaf Green' },
  { index: 0x1A, hex: '#0C9300', r: 12,  g: 147, b: 0,   name: 'Bright Green' },
  { index: 0x1B, hex: '#008F32', r: 0,   g: 143, b: 50,  name: 'Mint Emerald' },
  { index: 0x1C, hex: '#007C8D', r: 0,   g: 124, b: 141, name: 'Teal' },
  { index: 0x1D, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black' },
  { index: 0x1E, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black' },
  { index: 0x1F, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black' },

  // 0x20 - 0x2F
  { index: 0x20, hex: '#FFFFFF', r: 255, g: 255, b: 255, name: 'Pure White' },
  { index: 0x21, hex: '#64B0FF', r: 100, g: 176, b: 255, name: 'Sky Blue' },
  { index: 0x22, hex: '#9290FF', r: 146, g: 144, b: 255, name: 'Lavender Blue' },
  { index: 0x23, hex: '#C676FF', r: 198, g: 118, b: 255, name: 'Light Violet' },
  { index: 0x24, hex: '#F36AFF', r: 243, g: 106, b: 255, name: 'Pink' },
  { index: 0x25, hex: '#FE6ECC', r: 254, g: 110, b: 204, name: 'Hot Pink' },
  { index: 0x26, hex: '#FE8176', r: 254, g: 129, b: 118, name: 'Coral Salmon' },
  { index: 0x27, hex: '#ECA036', r: 236, g: 160, b: 54,  name: 'Golden Sand' },
  { index: 0x28, hex: '#BAC735', r: 186, g: 199, b: 53,  name: 'Lime Gold' },
  { index: 0x29, hex: '#87E235', r: 135, g: 226, b: 53,  name: 'Bright Lime' },
  { index: 0x2A, hex: '#5CEE5D', r: 92,  g: 238, b: 93,  name: 'Pastel Green' },
  { index: 0x2B, hex: '#4DE8A3', r: 77,  g: 232, b: 163, name: 'Seafoam' },
  { index: 0x2C, hex: '#4CD8E8', r: 76,  g: 216, b: 232, name: 'Cyan Sky' },
  { index: 0x2D, hex: '#4E4E4E', r: 78,  g: 78,  b: 78,  name: 'Dark Slate' },
  { index: 0x2E, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black' },
  { index: 0x2F, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black' },

  // 0x30 - 0x3F
  { index: 0x30, hex: '#FFFFFF', r: 255, g: 255, b: 255, name: 'White' },
  { index: 0x31, hex: '#C0E0FF', r: 192, g: 224, b: 255, name: 'Ice Blue' },
  { index: 0x32, hex: '#D3D2FF', r: 211, g: 210, b: 255, name: 'Pale Violet' },
  { index: 0x33, hex: '#E8C8FF', r: 232, g: 200, b: 255, name: 'Pale Lavender' },
  { index: 0x34, hex: '#FBC2FF', r: 251, g: 194, b: 255, name: 'Baby Pink' },
  { index: 0x35, hex: '#FEC4EA', r: 254, g: 196, b: 234, name: 'Light Pink' },
  { index: 0x36, hex: '#FECCC5', r: 254, g: 204, b: 197, name: 'Peach' },
  { index: 0x37, hex: '#F7D8AC', r: 247, g: 216, b: 172, name: 'Warm Cream' },
  { index: 0x38, hex: '#E4E5AC', r: 228, g: 229, b: 172, name: 'Pale Yellow' },
  { index: 0x39, hex: '#CFEEAC', r: 207, g: 238, b: 172, name: 'Mint Light' },
  { index: 0x3A, hex: '#BCF2BC', r: 188, g: 242, b: 188, name: 'Pale Green' },
  { index: 0x3B, hex: '#B6F0D8', r: 182, g: 240, b: 216, name: 'Ice Mint' },
  { index: 0x3C, hex: '#B5EAF0', r: 181, g: 234, b: 240, name: 'Pale Cyan' },
  { index: 0x3D, hex: '#B8B8B8', r: 184, g: 184, b: 184, name: 'Medium Gray' },
  { index: 0x3E, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black' },
  { index: 0x3F, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black' },
];

/**
 * Common NES Subpalette Preset configurations
 */
export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  subpalettes: [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number]
  ];
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'authentic_balanced',
    name: 'NES Classic Studio',
    description: 'Universal black, warm skin tones, vibrant greens, cool skies & steel grays.',
    subpalettes: [
      [0x0F, 0x16, 0x27, 0x30], // Red / Flesh / White
      [0x0F, 0x01, 0x11, 0x21], // Deep Blue / Sky Blue / Light Sky
      [0x0F, 0x0A, 0x1A, 0x2A], // Dark Green / Bright Green / Lime
      [0x0F, 0x00, 0x10, 0x30], // Dark Gray / Light Gray / White
    ]
  },
  {
    id: 'mario_overworld',
    name: 'Overworld Adventure',
    description: 'Iconic 1985 platformer palette with sky blues, brick earth, and pipe greens.',
    subpalettes: [
      [0x21, 0x16, 0x27, 0x30], // Sky blue bg, brick red, sand, white
      [0x21, 0x0A, 0x1A, 0x28], // Pipe green, bush green, lime
      [0x21, 0x07, 0x17, 0x37], // Dark brown, ochre, cream
      [0x21, 0x00, 0x10, 0x30], // Grays & clouds
    ]
  },
  {
    id: 'cyber_synthwave',
    name: 'Neon Cyberpunk',
    description: 'Electrifying 8-bit neon pinks, purples, cyans, and midnight darks.',
    subpalettes: [
      [0x0F, 0x03, 0x14, 0x24], // Deep violet, magenta, hot pink
      [0x0F, 0x02, 0x12, 0x22], // Indigo, royal blue, lavender
      [0x0F, 0x0C, 0x1C, 0x2C], // Dark cyan, teal, cyan sky
      [0x0F, 0x17, 0x27, 0x30], // Amber, gold, white
    ]
  },
  {
    id: 'castlevania_midnight',
    name: 'Gothic Midnight',
    description: 'Moody stone castle walls, blood crimson, deep purple shadows.',
    subpalettes: [
      [0x0F, 0x06, 0x16, 0x26], // Blood red, brick, coral
      [0x0F, 0x03, 0x13, 0x23], // Violet shadows
      [0x0F, 0x07, 0x17, 0x27], // Torch amber, wood brown
      [0x0F, 0x2D, 0x10, 0x30], // Slate stones, silver
    ]
  },
  {
    id: 'gameboy_dmg',
    name: 'DMG Dot Matrix',
    description: 'Classic 4-shade greenish LCD aesthetic mapped to NES PPU indices.',
    subpalettes: [
      [0x08, 0x19, 0x29, 0x39],
      [0x08, 0x19, 0x29, 0x39],
      [0x08, 0x19, 0x29, 0x39],
      [0x08, 0x19, 0x29, 0x39],
    ]
  },
  {
    id: 'monochrome_crt',
    name: 'Monochrome CRT',
    description: 'Pure 4-level grayscale luminance for crisp high-contrast PPU portraiture.',
    subpalettes: [
      [0x0F, 0x00, 0x10, 0x30],
      [0x0F, 0x2D, 0x10, 0x20],
      [0x0F, 0x00, 0x3D, 0x30],
      [0x0F, 0x2D, 0x00, 0x10],
    ]
  }
];

/**
 * Weighted perceptual color distance
 */
export function colorDistanceSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rmean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  // Standard redmean color difference formula
  return (((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8);
}

/**
 * Find the closest NES color from the master 64-color palette
 */
export function findClosestMasterColor(r: number, g: number, b: number): NesColor {
  let bestDist = Infinity;
  let bestColor = NES_MASTER_PALETTE[0x0F]; // default black

  for (let i = 0; i < 64; i++) {
    // Skip duplicate black entries to favor standard 0x0F
    if (i === 0x0D || i === 0x0E || i === 0x1D || i === 0x1E || i === 0x1F || i === 0x2E || i === 0x2F || i === 0x3E || i === 0x3F) {
      continue;
    }
    const c = NES_MASTER_PALETTE[i];
    const dist = colorDistanceSq(r, g, b, c.r, c.g, c.b);
    if (dist < bestDist) {
      bestDist = dist;
      bestColor = c;
    }
  }

  return bestColor;
}

/**
 * Find closest color from a specific subpalette of 4 NES indices
 */
export function findClosestInSubpalette(
  r: number,
  g: number,
  b: number,
  subpaletteIndices: [number, number, number, number]
): { subIndex: number; nesIndex: number; color: NesColor } {
  let bestDist = Infinity;
  let bestSub = 0;

  for (let s = 0; s < 4; s++) {
    const nesIdx = subpaletteIndices[s] & 0x3F;
    const c = NES_MASTER_PALETTE[nesIdx];
    const dist = colorDistanceSq(r, g, b, c.r, c.g, c.b);
    if (dist < bestDist) {
      bestDist = dist;
      bestSub = s;
    }
  }

  const chosenNesIdx = subpaletteIndices[bestSub] & 0x3F;
  return {
    subIndex: bestSub,
    nesIndex: chosenNesIdx,
    color: NES_MASTER_PALETTE[chosenNesIdx],
  };
}
