import { CANVAS, CANNON, PROJECTILE, TURN, PHYSICS } from './config.js';
import { createTerrain } from './terrain.js';
import { createCannon, muzzlePosition, launchVelocity } from './cannon.js';
import { simulateShot } from './physics.js';
import { createAIMemory, chooseShot, recordShotResult } from './ai.js';
import { playFire, playExplosion } from './sound.js';

// Phases: PLAYER_AIM, PLAYER_FLIGHT, CPU_AIM, CPU_FLIGHT, RESOLVE, GAME_OVER

function makeParticles(cx, cy, count) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 140;
    parts.push({
      x: cx, y: cy,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 40,    // slight upward bias
      life: 0.6 + Math.random() * 0.4,
      size: 2 + Math.random() * 3,
    });
  }
  return parts;
}

function clearCorridor(terrain, a, b) {
  const x0 = Math.min(a.x, b.x) + CANNON.radius + 4;
  const x1 = Math.max(a.x, b.x) - CANNON.radius - 4;
  const ay = terrain.groundY(a.x);
  const by = terrain.groundY(b.x);
  // Ceiling (canvas-y) above which terrain in the corridor is cleared so a high arc clears.
  const ceilingY = Math.min(ay, by) - CANNON.corridorClearance;
  terrain.clearAbove(x0, x1, ceilingY);
}

export function createGame(difficulty) {
  const terrain = createTerrain();
  const player = createCannon({ side: 'left', color: '#3aa3ff', terrain });
  const cpu = createCannon({ side: 'right', color: '#ff5a5a', terrain });
  clearCorridor(terrain, player, cpu);
  player.y = terrain.groundY(player.x);
  cpu.y = terrain.groundY(cpu.x);
  return {
    terrain,
    player,
    cpu,
    difficulty,
    phase: 'PLAYER_AIM',
    projectile: null,
    trail: [],
    explosion: null,
    winner: null,
    aiMemory: createAIMemory(difficulty),
  };
}

export function simulate(state, { angle, velocity }, shooter, target) {
  shooter.angle = angle;
  const muzzle = muzzlePosition(shooter);
  const { vx, vy } = launchVelocity(shooter, velocity);
  playFire();
  return simulateShot({
    x: muzzle.x, y: muzzle.y, vx, vy,
    terrain: state.terrain, enemy: target,
  });
}

export function applyShotResult(state, sim, shooter, target) {
  if (sim.result === 'cannon') {
    target.hp -= PROJECTILE.directHitDamage;
    state.terrain.carveCrater(sim.x, sim.y, PROJECTILE.cannonHitBlastRadius);
    dropCannon(state.player, state.terrain);
    dropCannon(state.cpu, state.terrain);
  } else if (sim.result === 'terrain') {
    state.terrain.carveCrater(sim.x, sim.y, PROJECTILE.blastRadius);
    dropCannon(state.player, state.terrain);
    dropCannon(state.cpu, state.terrain);
  }
}

function dropCannon(cannon, terrain) {
  // If the pixel directly under the cannon is air, fall to next surface.
  if (terrain.isSolid(cannon.x, cannon.y)) return;
  const newY = terrain.surfaceAtOrBelow(cannon.x, cannon.y);
  if (newY >= terrain.canvasHeight) {
    cannon.y = terrain.canvasHeight;
    cannon.hp = 0;          // fell off the world
  } else {
    cannon.y = newY;
  }
}

export function animateShot(state, sim, onDone) {
  state.trail = [];
  state.projectile = { x: sim.trail[0].x, y: sim.trail[0].y };
  let i = 0;
  const stepsPerFrame = 2;
  const id = setInterval(() => {
    for (let s = 0; s < stepsPerFrame && i < sim.trail.length; s++, i++) {
      state.trail.push(sim.trail[i]);
      state.projectile = sim.trail[i];
    }
    if (i >= sim.trail.length) {
      clearInterval(id);
      state.projectile = null;
      if (sim.result !== 'offscreen') playExplosion();
      const r = sim.result === 'cannon' ? PROJECTILE.cannonHitBlastRadius : PROJECTILE.blastRadius;
      state.explosion = {
        x: sim.x, y: sim.y, t: 0,
        duration: 0.85,
        carveR: r,
        flashR: r * 2.2,
        shockR: r * 3.0,
        particles: makeParticles(sim.x, sim.y, 14),
      };
      onDone();
    }
  }, 16);
}

export function tickExplosion(state, dtSec) {
  if (!state.explosion) return;
  const ex = state.explosion;
  ex.t += dtSec;
  if (ex.particles) {
    for (const p of ex.particles) {
      p.vy += 300 * dtSec;            // gravity on debris
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dtSec;
    }
  }
  if (ex.t >= ex.duration) {
    state.explosion = null;
    state.trail = [];
  }
}

export function checkGameOver(state) {
  if (state.player.hp <= 0 && state.cpu.hp <= 0) {
    state.phase = 'GAME_OVER';
    state.winner = 'draw';
    return true;
  }
  if (state.player.hp <= 0) {
    state.phase = 'GAME_OVER';
    state.winner = 'cpu';
    return true;
  }
  if (state.cpu.hp <= 0) {
    state.phase = 'GAME_OVER';
    state.winner = 'player';
    return true;
  }
  return false;
}

export function cpuTakeTurn(state, onSimReady) {
  const shot = chooseShot(state.aiMemory, state.cpu, state.player);
  setTimeout(() => {
    const sim = simulate(state, shot, state.cpu, state.player);
    recordShotResult(
      state.aiMemory,
      {
        angle: shot.angle,
        velocity: shot.velocity,
        impactX: sim.x,
        impactY: sim.y,
        hit: sim.result === 'cannon',
      },
      state.cpu,
      state.player,
    );
    onSimReady(sim, shot);
  }, TURN.cpuThinkDelayMs);
}
