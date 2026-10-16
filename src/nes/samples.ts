/**
 * Procedural Retro Preset Image Generators
 * Generates instant 256x240 image buffers for testing NES conversion
 * when camera is offline or for benchmarking dithering algorithms.
 */

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  generator: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'retro_portrait',
    name: '8-Bit Portrait',
    description: 'Human face lighting model with skin gradients and shadow tones.',
    generator: (ctx, w, h) => {
      // Dark gradient background
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1a102f');
      grad.addColorStop(1, '#05030a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Studio rim light
      ctx.fillStyle = '#0055aa';
      ctx.beginPath();
      ctx.arc(w * 0.35, h * 0.45, 80, 0, Math.PI * 2);
      ctx.fill();

      // Face silhouette and skin gradient
      const skinGrad = ctx.createRadialGradient(w * 0.52, h * 0.42, 10, w * 0.5, h * 0.45, 60);
      skinGrad.addColorStop(0, '#ffe0bd');
      skinGrad.addColorStop(0.5, '#d48866');
      skinGrad.addColorStop(0.85, '#8a3c22');
      skinGrad.addColorStop(1, '#3b1509');
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.46, 42, 54, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#1c0d02';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.36, 46, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();

      // Eyes & expression
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w * 0.44 - 6, h * 0.43, 8, 4);
      ctx.fillRect(w * 0.56 - 2, h * 0.43, 8, 4);
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(w * 0.44 - 3, h * 0.43, 4, 4);
      ctx.fillRect(w * 0.56, h * 0.43, 4, 4);

      // Sunglasses reflection (NES cool factor!)
      ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
      ctx.fillRect(w * 0.38, h * 0.40, 16, 12);
      ctx.fillRect(w * 0.54, h * 0.40, 16, 12);
      ctx.fillStyle = '#4cd8e8';
      ctx.fillRect(w * 0.39, h * 0.41, 14, 2);
      ctx.fillRect(w * 0.55, h * 0.41, 14, 2);

      // Shoulders & Jacket
      ctx.fillStyle = '#b53120';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.95, 80, 50, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'cyberpunk_city',
    name: 'Synthwave City',
    description: 'Neon skyline with setting wireframe sun and perspective grid.',
    generator: (ctx, w, h) => {
      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
      sky.addColorStop(0, '#0d0221');
      sky.addColorStop(0.5, '#400940');
      sky.addColorStop(1, '#f95959');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.65);

      // Sun
      const sun = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.65);
      sun.addColorStop(0, '#ffe600');
      sun.addColorStop(1, '#ff0077');
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.42, 45, 0, Math.PI * 2);
      ctx.fill();

      // Sun horizontal blinds
      ctx.fillStyle = '#400940';
      for (let y = h * 0.36; y < h * 0.60; y += 4) {
        ctx.fillRect(w * 0.3, y, w * 0.4, 2);
      }

      // Skyline buildings
      ctx.fillStyle = '#0a0518';
      const bldgs = [
        [10, 80, 25], [38, 110, 30], [70, 70, 35], [110, 130, 28],
        [145, 95, 32], [180, 120, 25], [210, 75, 35]
      ];
      bldgs.forEach(([bx, bh, bw]) => {
        ctx.fillRect(bx, h * 0.65 - bh, bw, bh);
        // Window dots
        ctx.fillStyle = '#4cd8e8';
        for (let wy = h * 0.65 - bh + 6; wy < h * 0.65 - 10; wy += 8) {
          ctx.fillRect(bx + 4, wy, 2, 3);
          ctx.fillRect(bx + bw - 6, wy, 2, 3);
        }
        ctx.fillStyle = '#0a0518';
      });

      // Ground plane
      ctx.fillStyle = '#060012';
      ctx.fillRect(0, h * 0.65, w, h * 0.35);

      // Grid lines
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      for (let x = -w * 0.5; x <= w * 1.5; x += 24) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.65);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = h * 0.65; y <= h; y += 8 + (y - h * 0.65) * 0.3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }
  },
  {
    id: 'nes_controller',
    name: 'Famicom Hardware',
    description: 'Vintage gamepad with gold faceplate, burgundy trim, and buttons.',
    generator: (ctx, w, h) => {
      ctx.fillStyle = '#222222';
      ctx.fillRect(0, 0, w, h);

      // Controller body
      ctx.fillStyle = '#8a001a';
      ctx.fillRect(24, 60, 208, 120);

      // Gold center plate
      ctx.fillStyle = '#e8b84d';
      ctx.fillRect(36, 72, 184, 96);

      // D-Pad
      ctx.fillStyle = '#111111';
      ctx.fillRect(60, 105, 36, 12);
      ctx.fillRect(72, 93, 12, 36);

      // Select / Start
      ctx.fillStyle = '#666666';
      ctx.fillRect(116, 118, 14, 5);
      ctx.fillRect(138, 118, 14, 5);

      // B and A buttons
      ctx.fillStyle = '#b51020';
      ctx.beginPath();
      ctx.arc(175, 120, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(195, 120, 8, 0, Math.PI * 2);
      ctx.fill();

      // Brand text
      ctx.fillStyle = '#8a001a';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('NINTENDO', 110, 95);
    }
  },
  {
    id: 'smpte_bars',
    name: 'Broadcast Color Bars',
    description: 'NTSC calibration bars for evaluating color gamut mapping and dithering.',
    generator: (ctx, w, h) => {
      const topColors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
      const barW = w / 7;
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = topColors[i];
        ctx.fillRect(i * barW, 0, barW + 1, h * 0.67);
      }

      // Middle row
      const midColors = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = midColors[i];
        ctx.fillRect(i * barW, h * 0.67, barW + 1, h * 0.08);
      }

      // Bottom row
      const botColors = ['#00214c', '#ffffff', '#32006a', '#131313', '#090909', '#131313', '#1d1d1d'];
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = botColors[i];
        ctx.fillRect(i * barW, h * 0.75, barW + 1, h * 0.25);
      }
    }
  }
];
