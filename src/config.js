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
  blastRadius: 28,                 // terrain carve radius on a clean ground hit
  cannonHitBlastRadius: 24,        // smaller carve when shell hits a cannon (cannon absorbs blast)
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
// aimNoise / noiseFloor are velocity-units (px/s) for the correction step; angle noise is
// derived from aimNoise inside ai.js. learnRate multiplies the noise after each miss.
export const AI_DIFFICULTY = {
  easy:   { algorithm: 'scaled',  aimNoise: 55, learnRate: 0.18, initialGuessQuality: 0.30, noiseFloor: 22 },
  medium: { algorithm: 'scaled',  aimNoise: 22, learnRate: 0.45, initialGuessQuality: 0.65, noiseFloor: 6  },
  hard:   { algorithm: 'physics', aimNoise: 7,  learnRate: 0.60, initialGuessQuality: 0.95, noiseFloor: 1  },
};

export const TURN = {
  cpuThinkDelayMs: 600,
  resolveDelayMs: 500,
};
