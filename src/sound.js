// Synthesized sound effects via Web Audio API — no external files needed.
// AudioContext must be created/resumed after a user gesture; we lazy-init on first play.

let ctx = null;
let muted = false;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(duration) {
  const c = getCtx();
  const len = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function setMuted(v) { muted = v; }

export function playFire() {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // Low-frequency oscillator drop ("thump")
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(70, now);
  osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);
  const og = c.createGain();
  og.gain.setValueAtTime(0.9, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(og).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.32);

  // Short noise crack — keep it low so the sub-thump dominates
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(0.14);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(800, now);
  lp.frequency.exponentialRampToValueAtTime(200, now + 0.12);
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.18, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  src.connect(lp).connect(ng).connect(c.destination);
  src.start(now);
  src.stop(now + 0.14);
}

export function playExplosion() {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // Big noise burst, low-pass swept down for that distant-rumble tail.
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(0.9);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(700, now);
  lp.frequency.exponentialRampToValueAtTime(60, now + 0.9);
  lp.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0, now);
  g.gain.linearRampToValueAtTime(0.85, now + 0.01);  // sharp attack
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  src.connect(lp).connect(g).connect(c.destination);
  src.start(now);
  src.stop(now + 0.9);

  // Sub-bass thump for body
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(50, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 0.55);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0, now);
  og.gain.linearRampToValueAtTime(1.0, now + 0.01);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
  osc.connect(og).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.75);
}

function playTone(freq, startOffset, duration, gain = 0.4, type = 'triangle') {
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime + startOffset;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playWin() {
  if (muted) return;
  // Triumphant ascending arpeggio: C5 - E5 - G5 - C6, then sustained C6 + G5 chord.
  const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;
  playTone(C5, 0.00, 0.18, 0.35, 'triangle');
  playTone(E5, 0.14, 0.18, 0.35, 'triangle');
  playTone(G5, 0.28, 0.18, 0.35, 'triangle');
  playTone(C6, 0.42, 0.9,  0.4,  'triangle');
  playTone(G5, 0.42, 0.9,  0.25, 'triangle');
  playTone(E5, 0.42, 0.9,  0.2,  'triangle');
}

export function playLose() {
  if (muted) return;
  // Sad descending minor: A4 - F4 - D4, slow.
  const A4 = 440, F4 = 349.23, D4 = 293.66;
  playTone(A4, 0.00, 0.35, 0.35, 'sine');
  playTone(F4, 0.30, 0.35, 0.35, 'sine');
  playTone(D4, 0.60, 1.1,  0.4,  'sine');
  // Low rumble underneath
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(73, now);          // D2-ish
  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.3, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + 1.85);
}
