import { AI_DIFFICULTY, INPUT_LIMITS, PHYSICS, CANVAS } from './config.js';

// Each AI keeps a small memory object across shots in a match.
export function createAIMemory(difficulty) {
  const cfg = AI_DIFFICULTY[difficulty];
  return {
    difficulty,
    cfg: { ...cfg },                 // copy so per-match noise shrinkage doesn't mutate the global
    currentNoise: cfg.aimNoise,
    minVel: INPUT_LIMITS.velMin,
    maxVel: INPUT_LIMITS.velMax,
    history: [],                     // { angle, velocity, impactX, sign } sign: -1 short, +1 long, 0 hit
    firstShot: true,
  };
}

// Choose a shot. Returns { angle, velocity } in human-input units.
export function chooseShot(memory, self, enemy) {
  if (memory.cfg.algorithm === 'physics') return chooseShotPhysics(memory, self, enemy);
  return chooseShotBracket(memory, self, enemy);
}

function chooseShotBracket(memory, self, enemy) {
  const dx = enemy.x - self.x;
  const absDx = Math.abs(dx);

  // Angle: bracketing AIs use a coarse default per side, shifted by initial guess quality.
  const idealAngle = 45;
  const angleSpread = (1 - memory.cfg.initialGuessQuality) * 25;
  const angle = clampAngle(idealAngle + gaussian() * angleSpread);

  // Velocity: midpoint of current bracket + noise. On first shot, base on rough range.
  let velocity;
  if (memory.firstShot) {
    const roughGuess = roughVelocityForRange(absDx, angle);
    const spread = (1 - memory.cfg.initialGuessQuality) * (INPUT_LIMITS.velMax - INPUT_LIMITS.velMin) * 0.5;
    velocity = clampVel(roughGuess + gaussian() * spread);
  } else {
    const mid = (memory.minVel + memory.maxVel) / 2;
    velocity = clampVel(mid + gaussian() * memory.currentNoise);
  }
  return { angle, velocity };
}

function chooseShotPhysics(memory, self, enemy) {
  // Pick a sensible velocity (mid-range, slightly randomised) then solve for angle.
  // If terrain blocks low arc, the resolve step will tell us and we can switch high arc next time.
  const speedBase = (INPUT_LIMITS.velMin + INPUT_LIMITS.velMax) / 2;
  const speed = clampVel(speedBase + (Math.random() - 0.5) * 30);
  const dxWorld = enemy.x - self.x;
  const dyWorld = enemy.y - self.y;
  const g = PHYSICS.gravity;

  // Solve for launch angle (relative to horizontal toward enemy).
  // Equation: tan(theta) = (v^2 +/- sqrt(v^4 - g*(g*x^2 + 2*y*v^2))) / (g*x)
  // Coordinate note: canvas y grows downward. We treat "up" as -y, so a positive shot height
  // means dy_up = -dyWorld. Use up-positive frame for the solver.
  const x = Math.abs(dxWorld);
  const yUp = -dyWorld;
  const v2 = speed * speed;
  const disc = v2 * v2 - g * (g * x * x + 2 * yUp * v2);
  let degAngle;
  if (disc < 0) {
    // Out of range at this speed; aim maximum and let the bracket take over.
    degAngle = 60;
  } else {
    const sq = Math.sqrt(disc);
    // Two solutions: low and high arc. Prefer high arc when terrain peaks between us.
    const lowTan = (v2 - sq) / (g * x);
    const highTan = (v2 + sq) / (g * x);
    const useHigh = memory.preferHighArc === true;
    const tanTheta = useHigh ? highTan : lowTan;
    degAngle = Math.atan(tanTheta) * 180 / Math.PI;
  }

  // Add noise (shrinks each miss down to noiseFloor).
  const angle = clampAngle(degAngle + gaussian() * memory.currentNoise);
  return { angle, velocity: speed };
}

// Called after each AI shot so memory can update brackets, noise, and arc preference.
// shot: { angle, velocity, impactX, impactY, hit }
export function recordShotResult(memory, shot, self, enemy) {
  memory.firstShot = false;

  if (shot.hit) {
    memory.history.push({ ...shot, sign: 0 });
    return;
  }

  // Determine short/long relative to the line from self -> enemy.
  const targetDx = enemy.x - self.x;
  const impactDx = shot.impactX - self.x;
  let sign;
  if (Math.sign(targetDx) === Math.sign(impactDx)) {
    sign = Math.abs(impactDx) < Math.abs(targetDx) ? -1 : 1; // short or long
  } else {
    sign = -1; // landed behind self -> badly short
  }

  memory.history.push({ ...shot, sign });
  const recent = memory.history.slice(-memory.cfg.memoryDepth);

  // Bracket update for bracket AIs
  if (memory.cfg.algorithm === 'bracket') {
    for (const s of recent) {
      if (s.sign < 0 && s.velocity > memory.minVel) memory.minVel = s.velocity;
      if (s.sign > 0 && s.velocity < memory.maxVel) memory.maxVel = s.velocity;
    }
    if (memory.minVel >= memory.maxVel) {
      // Bracket inverted (terrain interference etc.) — widen slightly.
      memory.minVel = Math.max(INPUT_LIMITS.velMin, memory.minVel - 20);
      memory.maxVel = Math.min(INPUT_LIMITS.velMax, memory.maxVel + 20);
    }
  }

  // If we missed badly short and there's a tall terrain hump in between, prefer high arc next turn.
  if (sign < 0 && shot.impactX !== undefined) {
    memory.preferHighArc = true;
  }

  // Shrink noise toward floor.
  const next = memory.currentNoise * (1 - memory.cfg.learnRate);
  memory.currentNoise = Math.max(memory.cfg.noiseFloor, next);
}

function roughVelocityForRange(absDx, angleDeg) {
  // Invert range = v^2 * sin(2*theta) / g  (flat ground)
  const a = angleDeg * Math.PI / 180;
  const sin2 = Math.sin(2 * a);
  if (sin2 <= 0.01) return INPUT_LIMITS.velMax;
  const v = Math.sqrt(absDx * PHYSICS.gravity / sin2);
  return v;
}

function clampAngle(a) {
  return Math.max(INPUT_LIMITS.angleMin + 1, Math.min(INPUT_LIMITS.angleMax - 1, a));
}
function clampVel(v) {
  return Math.max(INPUT_LIMITS.velMin, Math.min(INPUT_LIMITS.velMax, v));
}

// Box-Muller standard normal.
function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
