import { CANVAS, CANNON, PROJECTILE, TURN, PHYSICS } from './config.js';
import { createTerrain } from './terrain.js';
import { createCannon, muzzlePosition, launchVelocity } from './cannon.js';
import { simulateShot } from './physics.js';
import { createAIMemory, chooseShot, recordShotResult } from './ai.js';

// Phases: PLAYER_AIM, PLAYER_FLIGHT, CPU_AIM, CPU_FLIGHT, RESOLVE, GAME_OVER

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
  return simulateShot({
    x: muzzle.x, y: muzzle.y, vx, vy,
    terrain: state.terrain, enemy: target,
  });
}

export function applyShotResult(state, sim, shooter, target) {
  if (sim.result === 'cannon') {
    target.hp -= PROJECTILE.directHitDamage;
  } else if (sim.result === 'terrain') {
    state.terrain.carveCrater(sim.x, sim.y, PROJECTILE.blastRadius);
  }
}

export function animateShot(state, sim, onDone) {
  state.trail = [];
  state.projectile = { x: sim.trail[0].x, y: sim.trail[0].y };
  let i = 0;
  const stepsPerFrame = 3;
  const id = setInterval(() => {
    for (let s = 0; s < stepsPerFrame && i < sim.trail.length; s++, i++) {
      state.trail.push(sim.trail[i]);
      state.projectile = sim.trail[i];
    }
    if (i >= sim.trail.length) {
      clearInterval(id);
      state.projectile = null;
      state.explosion = {
        x: sim.x, y: sim.y, t: 0,
        duration: 0.4,
        maxR: PROJECTILE.blastRadius,
      };
      onDone();
    }
  }, 16);
}

export function tickExplosion(state, dtSec) {
  if (!state.explosion) return;
  state.explosion.t += dtSec;
  if (state.explosion.t >= state.explosion.duration) {
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
