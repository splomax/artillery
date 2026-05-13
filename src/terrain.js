import { CANVAS, TERRAIN } from './config.js';

// Terrain is a 2D pixel-occupancy grid (1 = solid, 0 = air). This allows
// overhangs and floating land: carving the bottom of a hole does NOT bring
// the rim down with it.
export function createTerrain() {
  const w = CANVAS.width;
  const h = CANVAS.height;
  const heights = new Float32Array(w);
  const phases = TERRAIN.waves.map(() => Math.random() * Math.PI * 2);

  for (let x = 0; x < w; x++) {
    let y = TERRAIN.baseHeight;
    const t = x / w;
    for (let i = 0; i < TERRAIN.waves.length; i++) {
      const wv = TERRAIN.waves[i];
      y += wv.amp * Math.sin(t * Math.PI * 2 * wv.freq + phases[i]);
    }
    heights[x] = y;
  }
  for (let p = 0; p < TERRAIN.smoothingPasses; p++) {
    for (let x = 1; x < w - 1; x++) {
      heights[x] = (heights[x - 1] + heights[x] * 2 + heights[x + 1]) / 4;
    }
  }
  for (let x = 0; x < w; x++) {
    heights[x] = Math.max(TERRAIN.minHeight, Math.min(TERRAIN.maxHeight, heights[x]));
  }

  const solid = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    const top = Math.floor(h - heights[x]);
    for (let y = Math.max(0, top); y < h; y++) {
      solid[y * w + x] = 1;
    }
  }

  const bitmap = document.createElement('canvas');
  bitmap.width = w;
  bitmap.height = h;
  const bctx = bitmap.getContext('2d');
  paintAllSolid(bctx, solid, w, h);

  return {
    width: w,
    canvasHeight: h,
    bitmap,
    solid,
    isSolid(x, y) {
      const xi = x | 0;
      const yi = y | 0;
      if (xi < 0 || xi >= w || yi < 0 || yi >= h) return false;
      return solid[yi * w + xi] === 1;
    },
    groundY(x) {
      const xi = Math.max(0, Math.min(w - 1, Math.floor(x)));
      for (let y = 0; y < h; y++) {
        if (solid[y * w + xi]) return y;
      }
      return h;
    },
    surfaceAtOrBelow(x, fromY) {
      const xi = Math.max(0, Math.min(w - 1, Math.floor(x)));
      const start = Math.max(0, Math.floor(fromY));
      for (let y = start; y < h; y++) {
        if (solid[y * w + xi]) return y;
      }
      return h;
    },
    carveCrater(cx, cy, r) {
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(w - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const y1 = Math.min(h - 1, Math.ceil(cy + r));
      const r2 = r * r;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= r2) solid[y * w + x] = 0;
        }
      }
      bctx.save();
      bctx.globalCompositeOperation = 'destination-out';
      bctx.beginPath();
      bctx.arc(cx, cy, r, 0, Math.PI * 2);
      bctx.fill();
      bctx.restore();
    },
    clearAbove(x0, x1, ceilingY) {
      const xa = Math.max(0, Math.floor(x0));
      const xb = Math.min(w - 1, Math.floor(x1));
      const yc = Math.max(0, Math.floor(ceilingY));
      for (let y = 0; y < yc; y++) {
        for (let x = xa; x <= xb; x++) {
          solid[y * w + x] = 0;
        }
      }
      bctx.save();
      bctx.globalCompositeOperation = 'destination-out';
      bctx.fillRect(xa, 0, xb - xa + 1, yc);
      bctx.restore();
    },
  };
}

function paintAllSolid(bctx, solid, w, h) {
  const img = bctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (solid[row + x]) {
        const i = (row + x) * 4;
        d[i] = 90; d[i + 1] = 58; d[i + 2] = 34; d[i + 3] = 255;
      }
    }
  }
  bctx.putImageData(img, 0, 0);
  // Grass strip: top 2 pixels of each column's top solid run.
  bctx.fillStyle = '#3e8a3e';
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (solid[y * w + x]) {
        bctx.fillRect(x, y, 1, 2);
        break;
      }
    }
  }
}

export function drawTerrain(ctx, terrain) {
  ctx.drawImage(terrain.bitmap, 0, 0);
}
