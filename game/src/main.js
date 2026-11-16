// EMBERKEEP — boot, fixed-timestep loop and state machine.
// Title -> playing -> dawn -> ... -> victory / gameover, with pause and
// restart. A ?shot= query renders one deterministic scene instead, and
// ?selftest=1 plays the game headlessly and reports every check.

import { CFG } from './config.js';
import { createRng } from './rng.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createFeel } from './feel.js';
import { createKeeper } from './keeper.js';
import {
  createWorld,
  startNight,
  updateWorld,
  updateAmbient,
  lightAt,
  lightSources,
  nearestDarkLamp,
  relightLamp,
  fireFlare,
} from './world.js';
import { createRenderer } from './render.js';
import { setupShot, runSelftest } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 7);
const shotName = params.get('shot');
const selftest = params.get('selftest') === '1';

const rng = createRng(seed);
const input = createInput(canvas);
const audio = createAudio(rng);
const feel = createFeel(rng);
const renderer = createRenderer(canvas);
const statusEl = document.getElementById('status');

const game = {
  cfg: CFG,
  rng,
  input,
  audio,
  feel,
  keeper: createKeeper(CFG, rng),
  world: createWorld(seed),
  time: 0,
  state: 'title',
  best: 0,
  loseReason: null,
  selftest: null,
};

try {
  game.best = Number(window.localStorage.getItem('emberkeep-best') || 0);
} catch {
  game.best = 0;
}

game.lightAt = (x, y) => lightAt(game, x, y);
game.lightSources = () => lightSources(game);
game.nearestDarkLamp = (x, y, r) => nearestDarkLamp(game, x, y, r);
game.relightLamp = (lamp) => relightLamp(game, lamp);
game.fireFlare = (x, y, a) => fireFlare(game, x, y, a);

game.onKeeperHurt = () => {
  audio.hurt();
  feel.addTrauma(CFG.feel.traumaHurt);
  feel.hitstop(CFG.feel.hitstopHurt);
};

game.onLampSnuffed = () => {
  // The lamp's own burnout is handled in world.js; a creeper's snuff
  // gets the same sound there. Nothing extra to do here.
};

game.onBeaconHit = () => {
  game.world.beaconIntegrity -= CFG.beacon.hitDmg;
  audio.thud();
  feel.addTrauma(CFG.feel.traumaBeaconHit);
  feel.hitstop(CFG.feel.hitstopBeacon);
  if (game.world.beaconIntegrity <= 0) game.lose('snuffed');
};

game.saveBest = () => {
  if (game.world.score > game.best) {
    game.best = game.world.score;
    try {
      window.localStorage.setItem('emberkeep-best', String(game.best));
    } catch {
      // storage unavailable; the best score just does not persist
    }
  }
};

game.lose = (reason) => {
  if (game.state === 'gameover' || game.state === 'victory') return;
  game.loseReason = reason;
  game.state = 'gameover';
  game.saveBest();
  audio.stopHum();
};

game.win = () => {
  if (game.state === 'victory') return;
  game.state = 'victory';
  game.world.score += 1000 + Math.round(game.world.beaconIntegrity) * 5;
  game.saveBest();
  audio.dawn();
  audio.stopHum();
  feel.flash(0.5);
};

game.startRun = () => {
  game.world = createWorld(seed);
  game.keeper = createKeeper(CFG, rng);
  game.time = 0;
  game.loseReason = null;
  game.state = 'playing';
  audio.ensure();
  audio.startHum();
  startNight(game, 1);
};

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

// One fixed step. The render loop calls this at 60 Hz; the selftest
// calls it directly. Input edges are consumed here, once per step.
game.step = (dt) => {
  game.time += dt;

  if (input.mutePressed()) audio.setMuted(!audio.muted);

  if (game.state === 'title') {
    updateAmbient(dt, game);
    if (input.confirmPressed()) game.startRun();
  } else if (game.state === 'playing' || game.state === 'dawn') {
    if (input.pausePressed()) {
      game.state = 'paused';
    } else {
      const gdt = feel.gameplayDelta(dt);
      game.keeper.update(gdt, game);
      updateWorld(gdt, game);
    }
    if (input.restartPressed()) game.startRun();
  } else if (game.state === 'paused') {
    if (input.pausePressed() || input.confirmPressed()) game.state = 'playing';
    else if (input.restartPressed()) game.startRun();
  } else if (game.state === 'gameover' || game.state === 'victory') {
    updateAmbient(dt, game);
    if (input.restartPressed() || input.confirmPressed()) game.startRun();
  }

  feel.update(dt);
  audio.setDuck(feel.ducked ? 0.6 : 1);
  input.endFrame();

  if (game.state === 'playing') {
    setStatus(`Night ${game.world.night} of ${CFG.NIGHTS}. Keeper health ${Math.round(game.keeper.hp)}, oil ${Math.round(game.keeper.fuel)}, score ${game.world.score}.`);
  } else if (game.state === 'title') {
    setStatus('Emberkeep. Seven nights of the Beacon. Press Enter to begin.');
  }
};

function render() {
  renderer.draw(game);
}

window.__emberkeep = { game, render };

if (shotName) {
  // One deterministic frame, then stop: the harness screenshots it.
  setupShot(game, shotName, seed);
  render();
  window.__shotReady = true;
} else if (selftest) {
  runSelftest(game, render);
  render();
} else {
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  function frame(now) {
    const frameDt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += frameDt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      game.step(STEP);
      acc -= STEP;
      guard++;
    }
    if (guard === 5) acc = 0;
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
