import { INPUT_LIMITS, CANNON } from './config.js';

export function wireInputs({ getState, onFire, onNewGame }) {
  const fireBtn = document.getElementById('fireBtn');
  const newGameBtn = document.getElementById('newGameBtn');
  const diffEl = document.getElementById('difficulty');

  function tryFire() {
    if (fireBtn.disabled) return;
    const s = getState();
    if (!s || !s.player) return;
    onFire({ angle: s.player.angle, velocity: s.player.velocity });
  }

  fireBtn.addEventListener('click', tryFire);
  newGameBtn.addEventListener('click', () => onNewGame(diffEl.value));

  function adjustAngle(delta) {
    const s = getState();
    if (!s || !s.player) return;
    s.player.angle = clamp(s.player.angle + delta, INPUT_LIMITS.angleMin, INPUT_LIMITS.angleMax);
  }

  function adjustVel(delta) {
    const s = getState();
    if (!s || !s.player) return;
    s.player.velocity = clamp(s.player.velocity + delta, INPUT_LIMITS.velMin, INPUT_LIMITS.velMax);
  }

  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const inFormField = tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'INPUT';
    const angleStep = e.shiftKey ? 10 : 3;
    const velStep = e.shiftKey ? 25 : 8;
    switch (e.key) {
      case 'ArrowRight':
        if (inFormField) return;
        adjustAngle(-angleStep); e.preventDefault(); break;
      case 'ArrowLeft':
        if (inFormField) return;
        adjustAngle(angleStep); e.preventDefault(); break;
      case 'ArrowUp':
        if (inFormField) return;
        adjustVel(velStep); e.preventDefault(); break;
      case 'ArrowDown':
        if (inFormField) return;
        adjustVel(-velStep); e.preventDefault(); break;
      case ' ':
      case 'Enter':
        if (tag === 'SELECT' || tag === 'TEXTAREA') return;
        tryFire();
        e.preventDefault();
        break;
    }
  });

  return {
    setControlsEnabled(enabled) {
      fireBtn.disabled = !enabled;
    },
    syncFromPlayer() {},
    getDifficulty() {
      return diffEl.value;
    },
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function updateHUD(state) {
  document.getElementById('playerHP').style.width = `${pct(state.player.hp)}%`;
  document.getElementById('cpuHP').style.width = `${pct(state.cpu.hp)}%`;
  document.getElementById('playerHPText').textContent = `${Math.max(0, Math.round(state.player.hp))} / ${CANNON.maxHP}`;
  document.getElementById('cpuHPText').textContent = `${Math.max(0, Math.round(state.cpu.hp))} / ${CANNON.maxHP}`;
  document.getElementById('turnIndicator').textContent =
    state.phase === 'PLAYER_AIM' ? 'Your turn'
    : state.phase === 'CPU_AIM' || state.phase === 'CPU_FLIGHT' ? 'CPU turn'
    : state.phase === 'GAME_OVER' ? (state.winner === 'player' ? 'You win!' : 'CPU wins') : '…';
}

function pct(hp) {
  return Math.max(0, Math.min(100, (hp / CANNON.maxHP) * 100));
}
