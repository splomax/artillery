import { CANVAS, PROJECTILE, INPUT_LIMITS, PHYSICS } from './config.js';
import { drawTerrain } from './terrain.js';
import { drawCannon, muzzlePosition, launchVelocity } from './cannon.js';

export function clear(ctx) {
  // sky
  const grd = ctx.createLinearGradient(0, 0, 0, CANVAS.height);
  grd.addColorStop(0, '#1d3a6b');
  grd.addColorStop(1, '#79a8e0');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
}

export function drawScene(ctx, state) {
  clear(ctx);
  drawTerrain(ctx, state.terrain);
  drawCannon(ctx, state.player);
  drawCannon(ctx, state.cpu);
  drawTrail(ctx, state.trail);
  drawProjectile(ctx, state.projectile);
  drawExplosion(ctx, state.explosion);
  drawAimIndicator(ctx, state);
  drawVelocityGauge(ctx, state);
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
