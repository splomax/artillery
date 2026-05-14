import { CANVAS, TURN } from './config.js';
import { drawScene } from './render.js';
import { wireInputs, updateHUD } from './input.js';
import { createGame, simulate, applyShotResult, animateShot, tickExplosion, checkGameOver, cpuTakeTurn } from './game.js';
import { playWin, playLose } from './sound.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS.width;
canvas.height = CANVAS.height;
const ctx = canvas.getContext('2d');

let state = null;
let ui = null;

const endOverlay = document.getElementById('endOverlay');
const endText = document.getElementById('endText');
const endNewGameBtn = document.getElementById('endNewGame');
let endAnnounced = false;

function newGame(difficulty) {
  state = createGame(difficulty);
  state.phase = 'PLAYER_AIM';
  ui.setControlsEnabled(true);
  ui.syncFromPlayer(state.player);
  endAnnounced = false;
  endOverlay.classList.add('hidden');
  endText.classList.remove('win', 'lose');
  endText.textContent = '';
}

function announceEnd() {
  if (endAnnounced) return;
  endAnnounced = true;
  const win = state.winner === 'player';
  endText.textContent = win ? 'You win!' : state.winner === 'cpu' ? 'You lose!' : 'Draw';
  endText.classList.toggle('win', win);
  endText.classList.toggle('lose', !win);
  endOverlay.classList.remove('hidden');
  if (win) playWin(); else playLose();
}

endNewGameBtn.addEventListener('click', () => {
  newGame(ui.getDifficulty());
});

function playerFire({ angle, velocity }) {
  if (!state || state.phase !== 'PLAYER_AIM') return;
  state.phase = 'PLAYER_FLIGHT';
  ui.setControlsEnabled(false);
  const sim = simulate(state, { angle, velocity }, state.player, state.cpu);
  animateShot(state, sim, () => {
    applyShotResult(state, sim, state.player, state.cpu);
    setTimeout(() => {
      if (checkGameOver(state)) return;
      if (window.DEMO_MODE) {
        state.phase = 'PLAYER_AIM';
        ui.setControlsEnabled(true);
        return;
      }
      state.phase = 'CPU_AIM';
      cpuTakeTurn(state, (cpuSim) => {
        state.phase = 'CPU_FLIGHT';
        animateShot(state, cpuSim, () => {
          applyShotResult(state, cpuSim, state.cpu, state.player);
          setTimeout(() => {
            if (checkGameOver(state)) return;
            state.phase = 'PLAYER_AIM';
            ui.setControlsEnabled(true);
          }, TURN.resolveDelayMs);
        });
      });
    }, TURN.resolveDelayMs);
  });
}

ui = wireInputs({
  getState: () => state,
  onFire: playerFire,
  onNewGame: (diff) => newGame(diff),
});

newGame(ui.getDifficulty());

let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (state) {
    tickExplosion(state, dt);
    drawScene(ctx, state);
    updateHUD(state);
    if (state.phase === 'GAME_OVER') announceEnd();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
