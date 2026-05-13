import { PHYSICS, CANNON, PROJECTILE, CANVAS } from './config.js';

// Simulate a projectile until it terminates (terrain hit, cannon hit, off-screen, timeout).
// Result is { result, x, y, trail }. result ∈ 'terrain' | 'cannon' | 'offscreen' | 'timeout'.
export function simulateShot({ x, y, vx, vy, terrain, enemy }) {
  const trail = [];
  let t = 0;
  while (t < PHYSICS.maxSimTime) {
    trail.push({ x, y });
    vy += PHYSICS.gravity * PHYSICS.dt;
    x += vx * PHYSICS.dt;
    y += vy * PHYSICS.dt;
    t += PHYSICS.dt;

    if (x < 0 || x > CANVAS.width || y > CANVAS.height + 200) {
      return { result: 'offscreen', x, y, trail };
    }

    const dxE = x - enemy.x;
    const dyE = y - enemy.y;
    if (dxE * dxE + dyE * dyE <= (CANNON.radius + PROJECTILE.radius) ** 2) {
      return { result: 'cannon', x, y, trail };
    }

    if (terrain.isSolid(x, y)) {
      return { result: 'terrain', x, y, trail };
    }
  }
  return { result: 'timeout', x, y, trail };
}
