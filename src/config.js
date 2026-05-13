// All tunable game constants live here. Tweak freely.

export const CANVAS = {
  width: 1000,
  height: 500,
};

export const PHYSICS = {
  gravity: 200,        // px / s^2
  dt: 1 / 120,         // fixed sim step
  maxSimTime: 15,      // seconds before a shot is given up on
  wind: 0,             // future hook
};

export const TERRAIN = {
  minHeight: 80,       // px from bottom
  maxHeight: 320,
  baseHeight: 180,
  smoothingPasses: 3,
  // Sum of sine waves; each entry is { amp, freq, phase? }
  waves: [
    { amp: 90, freq: 1.2 },
    { amp: 40, freq: 2.7 },
    { amp: 18, freq: 5.5 },
  ],
};

export const CANNON = {
  maxHP: 100,
  radius: 12,
  barrelLength: 22,
  leftSpawnRange: [0.08, 0.28],   // fraction of width
  rightSpawnRange: [0.72, 0.92],
  // Terrain peak between cannons is clamped to this many pixels above the higher cannon,
  // so a high-arc shot at max velocity can always clear it.
  corridorClearance: 80,
};

export const PROJECTILE = {
  radius: 3,
  blastRadius: 28,                 // terrain carve radius AND explosion visual radius
  directHitDamage: 50,             // damage applied on direct cannon hit
};

export const INPUT_LIMITS = {
  angleMin: 0,
  angleMax: 90,
  velMin: 50,
  velMax: 450,
};

// CPU difficulty calibration. All numbers used by ai.js.
//   algorithm:           'bracket' or 'physics'
//   aimNoise:            std-dev (px for bracket vel; degrees for physics angle)
//   learnRate:           how aggressively to tighten after a miss (0..1)
//   memoryDepth:         how many past shots feed into the next aim
//   initialGuessQuality: 0..1, how close the opening shot is to a sensible guess
//   noiseFloor:          aimNoise will not shrink below this
export const AI_DIFFICULTY = {
  easy:   { algorithm: 'bracket', aimNoise: 60, learnRate: 0.15, memoryDepth: 1, initialGuessQuality: 0.30, noiseFloor: 25 },
  medium: { algorithm: 'bracket', aimNoise: 30, learnRate: 0.40, memoryDepth: 2, initialGuessQuality: 0.60, noiseFloor: 10 },
  hard:   { algorithm: 'physics', aimNoise: 3.0, learnRate: 0.55, memoryDepth: 3, initialGuessQuality: 0.90, noiseFloor: 0.4 },
};

export const TURN = {
  cpuThinkDelayMs: 600,
  resolveDelayMs: 500,
};
