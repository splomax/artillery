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
  // base
  ctx.fillStyle = cannon.color;
  ctx.beginPath();
  ctx.arc(cannon.x, cannon.y, CANNON.radius, Math.PI, 2 * Math.PI);
  ctx.fill();

  // barrel
  const angleRad = cannon.side === 'left'
    ? -degToRad(cannon.angle)
    : Math.PI + degToRad(cannon.angle);
  const bx = cannon.x + Math.cos(angleRad) * CANNON.barrelLength;
  const by = cannon.y + Math.sin(angleRad) * CANNON.barrelLength;
  ctx.strokeStyle = cannon.color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cannon.x, cannon.y);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

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
