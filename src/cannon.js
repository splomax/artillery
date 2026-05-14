import { CANVAS, CANNON, INPUT_LIMITS } from './config.js';

export function createCannon({ side, color, terrain }) {
  const [lo, hi] = side === 'left' ? CANNON.leftSpawnRange : CANNON.rightSpawnRange;
  const x = Math.floor(CANVAS.width * (lo + Math.random() * (hi - lo)));
  const cannon = {
    side,
    color,
    x,
    y: terrain.groundY(x),
    hp: CANNON.maxHP,
    angle: 45, // 0..90, where 0 = horizontal toward enemy, 90 = straight up
    velocity: Math.round((INPUT_LIMITS.velMin + INPUT_LIMITS.velMax) / 2),
  };
  return cannon;
}

export function drawCannon(ctx, cannon) {
  const r = CANNON.radius;
  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(cannon.x, cannon.y + 1, r + 3, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // dome
  ctx.fillStyle = cannon.color;
  ctx.beginPath();
  ctx.arc(cannon.x, cannon.y, r, Math.PI, 2 * Math.PI);
  ctx.fill();
  // top-light highlight
  ctx.fillStyle = shade(cannon.color, 0.22);
  ctx.beginPath();
  ctx.arc(cannon.x, cannon.y, r, Math.PI * 1.1, Math.PI * 1.5);
  ctx.fill();

  // barrel
  const angleRad = cannon.side === 'left'
    ? -degToRad(cannon.angle)
    : Math.PI + degToRad(cannon.angle);
  const bx = cannon.x + Math.cos(angleRad) * CANNON.barrelLength;
  const by = cannon.y + Math.sin(angleRad) * CANNON.barrelLength;
  // shadow stroke
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cannon.x, cannon.y);
  ctx.lineTo(bx, by);
  ctx.stroke();
  // barrel itself
  ctx.strokeStyle = shade(cannon.color, -0.18);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cannon.x, cannon.y);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function shade(hex, amt) {
  const c = hex.replace('#', '');
  const n = parseInt(c, 16);
  const r = clamp((n >> 16) + Math.round(amt * 255));
  const g = clamp(((n >> 8) & 0xff) + Math.round(amt * 255));
  const b = clamp((n & 0xff) + Math.round(amt * 255));
  return `rgb(${r}, ${g}, ${b})`;
}
function clamp(v) { return Math.max(0, Math.min(255, v)); }

export function muzzlePosition(cannon) {
  const angleRad = cannon.side === 'left'
    ? -degToRad(cannon.angle)
    : Math.PI + degToRad(cannon.angle);
  return {
    x: cannon.x + Math.cos(angleRad) * (CANNON.barrelLength + 4),
    y: cannon.y + Math.sin(angleRad) * (CANNON.barrelLength + 4),
  };
}

export function launchVelocity(cannon, speed) {
  const angleRad = cannon.side === 'left'
    ? -degToRad(cannon.angle)
    : Math.PI + degToRad(cannon.angle);
  return {
    vx: Math.cos(angleRad) * speed,
    vy: Math.sin(angleRad) * speed,
  };
}

function degToRad(d) { return d * Math.PI / 180; }
