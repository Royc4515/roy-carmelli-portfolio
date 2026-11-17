/**
 * The shapes the particle field forms. Each one is drawn on an offscreen 2D canvas in white,
 * then the filled pixels are sampled as particle targets (see `sampleShape`). Drawing with the
 * canvas API keeps the shapes editable as plain vector code: no model files, no images.
 */

export interface Shape {
  key: string;
  /** Width / height of the drawing. The field maps it to x in [-aspect, aspect], y in [-1, 1]. */
  aspect: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

const FONT = '"Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';

/** Fill `lines` of heavy text so the widest line spans the canvas. */
function drawText(ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[], weight = 800) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let size = 100;
  ctx.font = `${weight} ${size}px ${FONT}`;
  const widest = Math.max(...lines.map(line => ctx.measureText(line).width));
  // Fit to the width, but never taller than the canvas allows.
  size = Math.min((size * w * 0.97) / widest, (h * 0.92) / (lines.length * 0.92));
  ctx.font = `${weight} ${size}px ${FONT}`;
  const lineHeight = size * 0.92;
  const top = (h - lineHeight * lines.length) / 2;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, top + lineHeight * (i + 0.82)));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The name: one line on wide screens, two on phones (so the letters stay large). */
export function nameShape(name: string, wide: boolean): Shape {
  const text = name.toUpperCase();
  return wide
    ? { key: 'name', aspect: 5.6, draw: (ctx, w, h) => drawText(ctx, w, h, [text]) }
    : { key: 'name', aspect: 1.75, draw: (ctx, w, h) => drawText(ctx, w, h, text.split(' ')) };
}

/** Aside: a browser window with a sidebar holding a conversation. */
const browser: Shape = {
  key: 'browser',
  aspect: 1.3,
  draw(ctx, w, h) {
    const s = h;
    const lw = s * 0.03;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    const x = w * 0.05, y = h * 0.1, bw = w * 0.9, bh = h * 0.8;
    roundRect(ctx, x, y, bw, bh, s * 0.06);
    ctx.stroke();
    // Title bar with three dots.
    ctx.beginPath();
    ctx.moveTo(x, y + bh * 0.16);
    ctx.lineTo(x + bw, y + bh * 0.16);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + bw * (0.07 + i * 0.06), y + bh * 0.08, s * 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
    // The page: a headline and a few lines of text.
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(x + bw * 0.08, y + bh * 0.32);
    ctx.lineTo(x + bw * 0.42, y + bh * 0.32);
    ctx.stroke();
    ctx.lineWidth = s * 0.024;
    [0.47, 0.57, 0.67, 0.77].forEach((row, i) => {
      ctx.beginPath();
      ctx.moveTo(x + bw * 0.08, y + bh * row);
      ctx.lineTo(x + bw * (i === 3 ? 0.36 : 0.52), y + bh * row);
      ctx.stroke();
    });
    // The sidebar: a filled panel with chat bubbles carved out of it.
    const sx = x + bw * 0.62;
    roundRect(ctx, sx, y + bh * 0.22, bw * 0.33, bh * 0.71, s * 0.035);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    roundRect(ctx, sx + bw * 0.04, y + bh * 0.3, bw * 0.2, bh * 0.1, s * 0.025);
    ctx.fill();
    roundRect(ctx, sx + bw * 0.09, y + bh * 0.46, bw * 0.2, bh * 0.14, s * 0.025);
    ctx.fill();
    roundRect(ctx, sx + bw * 0.04, y + bh * 0.66, bw * 0.16, bh * 0.1, s * 0.025);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },
};

/** Nechita Raka means "soft landing": a parachute carrying a small box. */
const parachute: Shape = {
  key: 'parachute',
  aspect: 1,
  draw(ctx, w, h) {
    const cx = w / 2;
    const top = h * 0.06, rim = h * 0.44, r = w * 0.44;
    // Canopy: a dome with a scalloped rim.
    ctx.beginPath();
    ctx.moveTo(cx - r, rim);
    ctx.bezierCurveTo(cx - r, top - h * 0.12, cx + r, top - h * 0.12, cx + r, rim);
    const scallops = 4;
    for (let i = scallops; i > 0; i--) {
      const x1 = cx - r + ((2 * r) / scallops) * i;
      const x0 = x1 - (2 * r) / scallops;
      ctx.quadraticCurveTo((x0 + x1) / 2, rim - h * 0.09, x0, rim);
    }
    ctx.closePath();
    ctx.fill();
    // Seams, carved out so the canopy reads as panels.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = w * 0.012;
    for (let i = 1; i < scallops; i++) {
      const x = cx - r + ((2 * r) / scallops) * i;
      ctx.beginPath();
      ctx.moveTo(x, rim);
      ctx.quadraticCurveTo(cx + (x - cx) * 0.55, top + h * 0.05, cx, top - h * 0.01);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Lines down to the box.
    const boxY = h * 0.78, box = w * 0.16;
    ctx.lineWidth = w * 0.011;
    for (let i = 0; i <= scallops; i++) {
      const x = cx - r + ((2 * r) / scallops) * i;
      ctx.beginPath();
      ctx.moveTo(x, rim - (i === 0 || i === scallops ? 0 : 0));
      ctx.lineTo(cx + (x - cx) * 0.12, boxY);
      ctx.stroke();
    }
    roundRect(ctx, cx - box / 2, boxY, box, box, w * 0.025);
    ctx.fill();
  },
};

/** Wine Sommelier Bot: a bottle and a glass. */
const wine: Shape = {
  key: 'wine',
  aspect: 1,
  draw(ctx, w, h) {
    // Bottle (filled silhouette).
    const bx = w * 0.3;
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.035, h * 0.05);
    ctx.lineTo(bx + w * 0.035, h * 0.05);
    ctx.lineTo(bx + w * 0.035, h * 0.26);
    ctx.bezierCurveTo(bx + w * 0.04, h * 0.36, bx + w * 0.125, h * 0.36, bx + w * 0.125, h * 0.48);
    ctx.lineTo(bx + w * 0.125, h * 0.9);
    ctx.quadraticCurveTo(bx + w * 0.125, h * 0.95, bx + w * 0.08, h * 0.95);
    ctx.lineTo(bx - w * 0.08, h * 0.95);
    ctx.quadraticCurveTo(bx - w * 0.125, h * 0.95, bx - w * 0.125, h * 0.9);
    ctx.lineTo(bx - w * 0.125, h * 0.48);
    ctx.bezierCurveTo(bx - w * 0.125, h * 0.36, bx - w * 0.04, h * 0.36, bx - w * 0.035, h * 0.26);
    ctx.closePath();
    ctx.fill();
    // Label, carved out.
    ctx.globalCompositeOperation = 'destination-out';
    roundRect(ctx, bx - w * 0.085, h * 0.56, w * 0.17, h * 0.2, w * 0.015);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.05, h * 0.63);
    ctx.lineTo(bx + w * 0.05, h * 0.63);
    ctx.moveTo(bx - w * 0.05, h * 0.69);
    ctx.lineTo(bx + w * 0.02, h * 0.69);
    ctx.stroke();
    // Glass: outlined bowl, the wine filled, stem and foot.
    const gx = w * 0.7, gy = h * 0.4, gr = w * 0.15;
    ctx.lineWidth = w * 0.02;
    ctx.beginPath();
    ctx.moveTo(gx - gr, gy);
    ctx.bezierCurveTo(gx - gr, gy + h * 0.3, gx + gr, gy + h * 0.3, gx + gr, gy);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx - gr * 0.93, gy + h * 0.09);
    ctx.bezierCurveTo(gx - gr * 0.7, gy + h * 0.25, gx + gr * 0.7, gy + h * 0.25, gx + gr * 0.93, gy + h * 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(gx, gy + h * 0.22);
    ctx.lineTo(gx, h * 0.92);
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineWidth = w * 0.028;
    ctx.beginPath();
    ctx.moveTo(gx - gr * 0.75, h * 0.935);
    ctx.lineTo(gx + gr * 0.75, h * 0.935);
    ctx.stroke();
  },
};

/** More work: code. */
const braces: Shape = {
  key: 'code',
  aspect: 1.5,
  draw: (ctx, w, h) => drawText(ctx, w, h, ['</>'], 700),
};

/** About: a brain, side view. Lobes are overlapping discs; the folds are carved out of them. */
const brain: Shape = {
  key: 'brain',
  aspect: 1.25,
  draw(ctx, _w, h) {
    const u = h;
    const discs: Array<[number, number, number]> = [
      [0.33, 0.4, 0.2], [0.5, 0.3, 0.21], [0.7, 0.3, 0.2], [0.88, 0.4, 0.19], [0.98, 0.53, 0.14],
      [0.26, 0.55, 0.14], [0.45, 0.52, 0.2], [0.66, 0.5, 0.21], [0.84, 0.57, 0.16], [0.6, 0.66, 0.13],
    ];
    ctx.beginPath();
    for (const [x, y, r] of discs) {
      ctx.moveTo(x * u + r * u, y * u);
      ctx.arc(x * u, y * u, r * u, 0, Math.PI * 2);
    }
    // Cerebellum and brainstem.
    ctx.moveTo(0.98 * u, 0.74 * u);
    ctx.ellipse(0.86 * u, 0.74 * u, 0.13 * u, 0.09 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.07 * u;
    ctx.beginPath();
    ctx.moveTo(0.68 * u, 0.74 * u);
    ctx.quadraticCurveTo(0.7 * u, 0.86 * u, 0.76 * u, 0.94 * u);
    ctx.stroke();
    // Sulci.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 0.018 * u;
    const fold = (pts: number[]) => {
      ctx.beginPath();
      ctx.moveTo(pts[0] * u, pts[1] * u);
      for (let i = 2; i < pts.length; i += 4) ctx.quadraticCurveTo(pts[i] * u, pts[i + 1] * u, pts[i + 2] * u, pts[i + 3] * u);
      ctx.stroke();
    };
    fold([0.22, 0.47, 0.34, 0.36, 0.42, 0.46, 0.5, 0.56, 0.6, 0.47]);
    fold([0.36, 0.24, 0.42, 0.34, 0.52, 0.3, 0.6, 0.24, 0.66, 0.36]);
    fold([0.58, 0.14, 0.62, 0.3, 0.74, 0.4, 0.86, 0.46, 0.98, 0.44]);
    fold([0.76, 0.16, 0.8, 0.26, 0.9, 0.3]);
    fold([0.3, 0.62, 0.44, 0.7, 0.56, 0.6, 0.66, 0.54, 0.78, 0.62]);
    fold([0.74, 0.74, 0.86, 0.7, 0.97, 0.76]);
    fold([0.78, 0.8, 0.87, 0.77, 0.95, 0.8]);
    ctx.globalCompositeOperation = 'source-over';
  },
};

/** Contact: a paper plane. */
const plane: Shape = {
  key: 'plane',
  aspect: 1.15,
  draw(ctx, w, h) {
    const p = (x: number, y: number): [number, number] => [x * w, y * h];
    const poly = (pts: Array<[number, number]>) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    };
    poly([p(0.03, 0.42), p(0.97, 0.06), p(0.42, 0.62)]); // upper wing
    poly([p(0.97, 0.06), p(0.66, 0.92), p(0.47, 0.66)]); // lower wing
    poly([p(0.42, 0.67), p(0.47, 0.7), p(0.4, 0.9)]); // fold
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.moveTo(...p(0.97, 0.06));
    ctx.lineTo(...p(0.43, 0.64));
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  },
};

export const SHAPES = { browser, parachute, wine, braces, brain, plane };

/**
 * Sample `count` points from the filled pixels of a shape. Returns xyz triples with x in
 * [-aspect, aspect], y in [-1, 1] and a little random depth, so the cloud has volume when the
 * camera tilts.
 */
export function sampleShape(shape: Shape, count: number, depth = 0.14): Float32Array {
  const h = 320;
  const w = Math.round(h * shape.aspect);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const out = new Float32Array(count * 3);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return out;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  shape.draw(ctx, w, h);
  const alpha = ctx.getImageData(0, 0, w, h).data;
  const filled: number[] = [];
  for (let i = 0; i < w * h; i++) if (alpha[i * 4 + 3] > 96) filled.push(i);
  if (filled.length === 0) return out;
  for (let i = 0; i < count; i++) {
    const pixel = filled[(Math.random() * filled.length) | 0];
    const px = (pixel % w) + Math.random();
    const py = ((pixel / w) | 0) + Math.random();
    out[i * 3] = (px / w - 0.5) * 2 * shape.aspect;
    out[i * 3 + 1] = -(py / h - 0.5) * 2;
    // Most particles sit near the front plane; a few float behind, for parallax.
    out[i * 3 + 2] = (Math.random() - 0.5) * depth * (Math.random() < 0.12 ? 5 : 1);
  }
  return out;
}
