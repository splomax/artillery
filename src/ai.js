import { AI_DIFFICULTY, INPUT_LIMITS, PHYSICS } from './config.js';

// Memory tracked across a match per AI.
export function createAIMemory(difficulty) {
  const cfg = AI_DIFFICULTY[difficulty];
  return {
    difficulty,
    cfg: { ...cfg },
    currentNoise: cfg.aimNoise,
    lastShot: null,            // { angle, velocity, impactX }
    firstShot: true,
    preferHighArc: false,
  };
}

// Choose a shot. Returns { angle, velocity }.
export function chooseShot(memory, self, enemy) {
  if (memory.firstShot) return openingShot(memory, self, enemy);
  return correctedShot(memory, self, enemy);
}

function openingShot(memory, self, enemy) {
  const dx = enemy.x - self.x;
  const dy = enemy.y - self.y;
  const absDx = Math.abs(dx);
  const q = memory.cfg.initialGuessQuality;

  if (memory.cfg.algorithm === 'physics') {
    // Pick a sensible velocity and solve angle exactly, then add small noise.
    const speedBase = clampVel(roughVelocityForRange(absDx, 45));
    const speed = clampVel(speedBase + gaussian() * (1 - q) * 40);
    const angle = solveAngle(absDx, dy, speed, memory.preferHighArc);
    return {
      angle: clampAngle(angle + gaussian() * memory.cfg.aimNoise * 0.3),
      velocity: speed,
    };
  }

  // bracket / scaled algorithms: open with rough estimate at 45°.
  const angle = clampAngle(45 + gaussian() * (1 - q) * 12);
  const rough = roughVelocityForRange(absDx, angle);
  const spread = (1 - q) * (INPUT_LIMITS.velMax - INPUT_LIMITS.velMin) * 0.25;
  const velocity = clampVel(rough + gaussian() * spread);
  return { angle, velocity };
}

function correctedShot(memory, self, enemy) {
  const last = memory.lastShot;
  const dx = enemy.x - self.x;
  const dy = enemy.y - self.y;
  const absTargetDx = Math.abs(dx);
  const lastImpactDx = last.impactX - self.x;

  // If the last shot landed on the same side as the target, scale velocity by sqrt(ratio).
  // If on the wrong side (e.g., shot went backward), nudge velocity up moderately.
  let velocity;
  const sameSide = Math.sign(lastImpactDx) === Math.sign(dx) && Math.abs(lastImpactDx) > 1;
  if (sameSide) {
    const ratio = absTargetDx / Math.abs(lastImpactDx);
    // Range R ∝ v^2, so v_new = v_last * sqrt(ratio). Damp toward 1 a bit so we don't overshoot.
    const damped = 1 + (Math.sqrt(ratio) - 1) * 0.95;
    velocity = clampVel(last.velocity * damped);
  } else {
    velocity = clampVel(last.velocity * 1.25);
  }

  // Add gaussian noise — currentNoise is in velocity units, shrinks each miss.
  velocity = clampVel(velocity + gaussian() * memory.currentNoise);

  // Angle strategy depends on algorithm.
  let angle;
  if (memory.cfg.algorithm === 'physics') {
    // Solve exact angle for the chosen velocity and target offset.
    angle = solveAngle(absTargetDx, dy, velocity, memory.preferHighArc);
    angle = clampAngle(angle + gaussian() * memory.cfg.aimNoise * 0.15);
  } else {
    // Keep the previous angle (locked) with small noise — let velocity do the work.
    const angleJitter = (memory.cfg.aimNoise / 30) * 1.5;
    angle = clampAngle(last.angle + gaussian() * angleJitter);
  }

  return { angle, velocity };
}

// After each shot, update memory. shot: { angle, velocity, impactX, impactY, hit }
export function recordShotResult(memory, shot, self, enemy) {
  memory.firstShot = false;
  memory.lastShot = { angle: shot.angle, velocity: shot.velocity, impactX: shot.impactX, impactY: shot.impactY };

  if (shot.hit) return;

  // If the shot fell well short of the target (didn't even reach it), suspect terrain blocking
  // and try the high arc next time.
  const dx = enemy.x - self.x;
  const lastImpactDx = shot.impactX - self.x;
  const wayShort = Math.sign(lastImpactDx) !== Math.sign(dx) || Math.abs(lastImpactDx) < Math.abs(dx) * 0.3;
  if (wayShort) memory.preferHighArc = true;

  // Shrink noise toward the floor.
  const next = memory.currentNoise * (1 - memory.cfg.learnRate);
  memory.currentNoise = Math.max(memory.cfg.noiseFloor, next);
}

// Solve launch angle (degrees, 0..90) for the given velocity and target offset.
// dxAbs > 0, dyUpPositive: positive if target is ABOVE shooter — but our world has y downward,
// so callers pass dy as enemy.y - self.y (canvas-y). We flip to up-positive internally.
function solveAngle(dxAbs, dyCanvas, speed, preferHigh) {
  const g = PHYSICS.gravity;
  const yUp = -dyCanvas;
  const v2 = speed * speed;
  const disc = v2 * v2 - g * (g * dxAbs * dxAbs + 2 * yUp * v2);
  if (disc < 0) return 60; // out of range; aim high
  const sq = Math.sqrt(disc);
  const lowTan = (v2 - sq) / (g * dxAbs);
  const highTan = (v2 + sq) / (g * dxAbs);
  const tanTheta = preferHigh ? highTan : lowTan;
  return Math.atan(tanTheta) * 180 / Math.PI;
}

function roughVelocityForRange(absDx, angleDeg) {
  const a = angleDeg * Math.PI / 180;
  const sin2 = Math.sin(2 * a);
  if (sin2 <= 0.01) return INPUT_LIMITS.velMax;
  return Math.sqrt(absDx * PHYSICS.gravity / sin2);
}

function clampAngle(a) {
  return Math.max(INPUT_LIMITS.angleMin + 1, Math.min(INPUT_LIMITS.angleMax - 1, a));
}
function clampVel(v) {
  return Math.max(INPUT_LIMITS.velMin, Math.min(INPUT_LIMITS.velMax, v));
}
function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
