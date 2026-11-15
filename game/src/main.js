// Starlight Salvage — boot, fixed-timestep loop and state machine.
// Title -> play -> upgrade -> ... -> victory / defeat, with pause and
// restart. A ?shot= query renders one deterministic scene instead.
import { createWorld, startRun, update, chooseUpgrade } from './world.js';
import { render, upgradeCardAt } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '7');

function fitCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

if (shotName) {
  // Screenshot mode: fixed 1280x800 stage, one deterministic scene.
  canvas.width = 1280;
  canvas.height = 800;
  const world = setupShot(shotName, seed, update);
  // Render in the game's own 1280x800 coordinate space.
  render(ctx, world);
} else {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  const world = createWorld((Math.random() * 1e9) | 0);
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    // --- state transitions, from edge-triggered input ---
    if (input.wasPressed('m')) {
      const muted = audio.toggleMute();
      if (!muted) audio.startMusic();
    }
    if (world.state === 'title') {
      if (input.wasPressed('Enter') || input.mouseDown) {
        audio.unlock();
        audio.startMusic();
        startRun(world);
      }
    } else if (world.state === 'play') {
      if (input.wasPressed('p')) {
        world.state = 'paused';
      }
      if (input.wasPressed('r')) startRun(world);
    } else if (world.state === 'paused') {
      if (input.wasPressed('p') || input.wasPressed('Enter')) world.state = 'play';
      if (input.wasPressed('r')) startRun(world);
    } else if (world.state === 'upgrade') {
      if (input.wasPressed('1')) chooseUpgrade(world, 0, audio);
      else if (input.wasPressed('2')) chooseUpgrade(world, 1, audio);
      else if (input.wasPressed('3')) chooseUpgrade(world, 2, audio);
      else if (input.mouseDown) {
        const card = upgradeCardAt(input.mouseX, input.mouseY);
        if (card >= 0) chooseUpgrade(world, card, audio);
      }
      // Hover highlight follows the mouse.
      const card = upgradeCardAt(input.mouseX, input.mouseY);
      if (card >= 0) world.choiceIndex = card;
    } else if (world.state === 'victory' || world.state === 'defeat') {
      if (input.wasPressed('r') || input.wasPressed('Enter')) {
        audio.startMusic();
        startRun(world);
      }
    }

    // --- fixed-step simulation, then one render ---
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      update(world, input, audio, STEP);
      acc -= STEP;
      guard += 1;
    }
    if (guard === 5) acc = 0;

    // The canvas fills the window; the game draws in a 1280x800 space
    // scaled to fit, letterboxed so the playfield never stretches.
    const scale = Math.min(canvas.width / 1280, canvas.height / 800);
    const ox = (canvas.width - 1280 * scale) / 2;
    const oy = (canvas.height - 800 * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#070b1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    render(ctx, world);
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
