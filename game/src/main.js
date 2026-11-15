// Emberkeep — entry point: the loop, the screens, and the wiring.
// One job: run the game (title → playing → level-up → pause → end → restart).

import { VIEW_W, VIEW_H } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createRenderer, hitTest } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const input = createInput(canvas);
const audio = createAudio();
const rng = makeRng((Date.now() % 2147483647) || 1);
const world = createWorld(rng, audio);
const renderer = createRenderer(canvas);
const isShot = applyShot(world, audio);

// A small handle for the headless play-test (and for curious players):
// the live state, plus a few test-only helpers from world.test.
window.__emberkeep = { world, input, audio };

function startFromTitle() {
  audio.unlock();
  audio.startMusic();
  world.startGame();
}

function handleClick() {
  const action = hitTest(world, input.mouse.clickX, input.mouse.clickY);
  if (!action) return;
  audio.unlock();
  if (action === 'start' || action === 'restart') startFromTitle();
  else if (action === 'resume') world.togglePause();
  else if (action.startsWith('upgrade:')) {
    world.chooseUpgrade(Number(action.slice(8)));
  }
}

function handleKeys() {
  if (input.wasPressed('m')) {
    const muted = audio.toggleMute();
    if (!muted && (world.state === 'playing' || world.state === 'title')) audio.startMusic();
  }
  if (world.state === 'title') {
    if (input.wasPressed('enter') || input.wasPressed(' ')) startFromTitle();
  } else if (world.state === 'playing') {
    if (input.wasPressed('p') || input.wasPressed('escape')) world.togglePause();
  } else if (world.state === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('escape') || input.wasPressed('enter')) world.togglePause();
    else if (input.wasPressed('r')) startFromTitle();
  } else if (world.state === 'levelup') {
    if (input.wasPressed('1')) world.chooseUpgrade(0);
    else if (input.wasPressed('2')) world.chooseUpgrade(1);
    else if (input.wasPressed('3')) world.chooseUpgrade(2);
  } else if (world.state === 'gameover' || world.state === 'victory') {
    if (input.wasPressed('r') || input.wasPressed('enter') || input.wasPressed(' ')) startFromTitle();
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (!isShot) {
    if (input.takeClick()) handleClick();
    handleKeys();
  }
  world.update(dt, input);
  renderer.draw(world, input);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
