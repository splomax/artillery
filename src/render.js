import { CANVAS, PROJECTILE, INPUT_LIMITS, PHYSICS } from './config.js';
import { drawTerrain } from './terrain.js';
import { drawCannon, muzzlePosition, launchVelocity } from './cannon.js';

export function clear(ctx) {
  // Brighter daytime sky
  const grd = ctx.createLinearGradient(0, 0, 0, CANVAS.height);
  grd.addColorStop(0.0, '#4a82c8');
  grd.addColorStop(0.55, '#9bc8ee');
  grd.addColorStop(1.0, '#cfe8fb');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
}

export function drawScene(ctx, state) {
  // Apply screen shake by translating the world-rendered content.
  let sx = 0, sy = 0;
  if (state.shake) {
    const tt = Math.max(0, 1 - state.shake.t / state.shake.duration);
    const m = state.shake.magnitude * tt;
    sx = (Math.random() - 0.5) * 2 * m;
    sy = (Math.random() - 0.5) * 2 * m;
  }

  clear(ctx);
  drawBackground(ctx, state);

  ctx.save();
  ctx.translate(sx, sy);
  drawTerrain(ctx, state.terrain);
  drawProps(ctx, state.props);
  drawCannon(ctx, state.player);
  drawCannon(ctx, state.cpu);
  drawSmoke(ctx, state.smoke);
  drawTrail(ctx, state.trail);
  drawProjectile(ctx, state.projectile);
  drawExplosion(ctx, state.explosion);
  ctx.restore();

  // UI-space overlays (not shaken)
  drawAimIndicator(ctx, state);
  drawVelocityGauge(ctx, state);
}

function drawBackground(ctx, state) {
  if (!state.bg) return;
  drawMountainLayer(ctx, state.bg.farMountains);
  drawMountainLayer(ctx, state.bg.nearMountains);
  drawClouds(ctx, state.bg.clouds, state.bgTime || 0);
}

function drawMountainLayer(ctx, layer) {
  const { heights, color } = layer;
  const h = CANVAS.height;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x < heights.length; x++) {
    ctx.lineTo(x, h - heights[x]);
  }
  ctx.lineTo(heights.length, h);
  ctx.closePath();
  ctx.fill();
}

function drawClouds(ctx, clouds, t) {
  for (const c of clouds) {
    let x = c.x + c.speed * t;
    // wrap
    const span = CANVAS.width + 200;
    x = ((x + 100) % span) - 100;
    const s = c.scale;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    cloudPuff(ctx, x, c.y, s);
  }
}

function cloudPuff(ctx, x, y, s) {
  ctx.beginPath();
  ctx.ellipse(x,         y,        22 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 18*s,  y - 4*s,  18 * s, 11 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 17*s,  y - 2*s,  16 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 6*s,   y - 9*s,  14 * s, 9 * s,  0, 0, Math.PI * 2);
  ctx.fill();
}

function drawProps(ctx, props) {
  if (!props) return;
  for (const p of props) {
    if (p.type === 'tree') {
      // trunk
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(p.x - 1.5, p.y - p.trunkH, 3, p.trunkH);
      // canopy shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(p.x + 1, p.y - p.trunkH - p.canopyR + 1, p.canopyR, p.canopyR * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      // canopy
      ctx.fillStyle = p.canopyColor;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - p.trunkH - p.canopyR, p.canopyR, p.canopyR * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // shrub
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - p.ry, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x + p.rx * 0.4, p.y - p.ry * 0.6, p.rx * 0.4, p.ry * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSmoke(ctx, smoke) {
  if (!smoke) return;
  for (const s of smoke) {
    const a = Math.max(0, s.life / s.maxLife) * 0.55;
    ctx.fillStyle = `rgba(120,120,120,${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrail(ctx, trail) {
  if (!trail || trail.length < 2) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);
  for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
  ctx.stroke();
}

function drawProjectile(ctx, p) {
  if (!p) return;
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(p.x, p.y, PROJECTILE.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawExplosion(ctx, ex) {
  if (!ex) return;
  const t = Math.min(1, ex.t / ex.duration);

  // Expanding shockwave ring (early, then fades)
  if (t < 0.5) {
    const st = t / 0.5;
    const sr = ex.shockR * st;
    ctx.save();
    ctx.strokeStyle = `rgba(255,220,140,${(1 - st) * 0.7})`;
    ctx.lineWidth = 3 * (1 - st) + 1;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, sr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // White-hot core flash (brief)
  if (t < 0.25) {
    const ft = t / 0.25;
    const fr = ex.flashR * (0.4 + ft * 0.6);
    ctx.fillStyle = `rgba(255,255,235,${1 - ft})`;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, fr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fireball: expands then fades to dark smoke
  const fbT = Math.min(1, t * 1.4);
  const fbR = ex.carveR * (0.5 + fbT * 1.2);
  const r = Math.floor(255 - t * 60);
  const g = Math.floor(180 - t * 150);
  const b = Math.floor(40 + t * 20);
  ctx.fillStyle = `rgba(${r},${Math.max(0,g)},${b},${1 - t})`;
  ctx.beginPath();
  ctx.arc(ex.x, ex.y, fbR, 0, Math.PI * 2);
  ctx.fill();

  // Debris particles
  if (ex.particles) {
    for (const p of ex.particles) {
      if (p.life <= 0) continue;
      const alpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = `rgba(${80 + Math.floor(alpha * 120)},${50 + Math.floor(alpha * 80)},30,${alpha})`;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
}

function drawVelocityGauge(ctx, state) {
  const c = state.player;
  // Battery dimensions
  const w = 10;
  const h = 44;
  const gap = 18;
  // Place to the left of cannon for left-side player, to the right for right-side.
  const bx = c.side === 'left' ? c.x - gap - w : c.x + gap;
  const by = c.y - h - 4;

  const frac = (c.velocity - INPUT_LIMITS.velMin) / (INPUT_LIMITS.velMax - INPUT_LIMITS.velMin);
  const clamped = Math.max(0, Math.min(1, frac));

  // Outer shell
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx, by, w, h);
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);

  // Fill from bottom up
  const fillH = (h - 4) * clamped;
  const fillY = by + h - 2 - fillH;
  ctx.fillStyle = fillColor(clamped);
  ctx.fillRect(bx + 2, fillY, w - 4, fillH);

  // Label
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(`${Math.round(c.velocity)}`, bx + w / 2 + 1, by - 2 + 1);
  ctx.fillStyle = '#fff';
  ctx.fillText(`${Math.round(c.velocity)}`, bx + w / 2, by - 2);
}

function fillColor(frac) {
  // green → yellow → red as fill rises
  if (frac < 0.5) {
    const t = frac / 0.5;
    const r = Math.round(80 + t * 175);
    const g = 200;
    return `rgb(${r}, ${g}, 60)`;
  }
  const t = (frac - 0.5) / 0.5;
  const g = Math.round(200 - t * 130);
  return `rgb(255, ${g}, 60)`;
}

function drawAimIndicator(ctx, state) {
  if (state.phase !== 'PLAYER_AIM') return;
  const c = state.player;

  drawTrajectoryPreview(ctx, c, state.terrain);

  // angle label next to cannon
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = c.side === 'left' ? 'left' : 'right';
  ctx.textBaseline = 'bottom';
  const labelX = c.side === 'left' ? c.x + 16 : c.x - 16;
  const labelY = c.y - 18;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(`${Math.round(c.angle)}°`, labelX + 1, labelY + 1);
  ctx.fillStyle = '#fff';
  ctx.fillText(`${Math.round(c.angle)}°`, labelX, labelY);
}

function drawTrajectoryPreview(ctx, cannon, terrain) {
  const muzzle = muzzlePosition(cannon);
  const { vx, vy } = launchVelocity(cannon, cannon.velocity);

  // Preview duration scales with velocity: ~0.12s at velMin → ~0.45s at velMax.
  const frac = (cannon.velocity - INPUT_LIMITS.velMin) / (INPUT_LIMITS.velMax - INPUT_LIMITS.velMin);
  const totalTime = 0.12 + Math.max(0, Math.min(1, frac)) * 0.33;
  const steps = Math.ceil(totalTime / PHYSICS.dt);

  let x = muzzle.x, y = muzzle.y, vyCur = vy;
  const points = [{ x, y }];
  for (let i = 0; i < steps; i++) {
    vyCur += PHYSICS.gravity * PHYSICS.dt;
    x += vx * PHYSICS.dt;
    y += vyCur * PHYSICS.dt;
    if (x < 0 || x >= CANVAS.width || y >= CANVAS.height) break;
    if (terrain && terrain.isSolid(x, y)) break;
    points.push({ x, y });
  }
  if (points.length < 2) return;

  // Dashed arc
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead at the tip pointing along the final segment
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const headLen = 8;
  const headW = 5;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - Math.cos(ang) * headLen - Math.sin(ang) * headW,
             b.y - Math.sin(ang) * headLen + Math.cos(ang) * headW);
  ctx.lineTo(b.x - Math.cos(ang) * headLen + Math.sin(ang) * headW,
             b.y - Math.sin(ang) * headLen - Math.cos(ang) * headW);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
