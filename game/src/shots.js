// Starlight Salvage — deterministic screenshot scenes.
// ?shot=<name>&seed=<n> builds a fixed scene and pre-simulates it, so
// every screenshot is a real render of the game's own code, staged at a
// different moment of the loop: title, play, upgrade, victory, defeat.
import { createWorld, startRun, nextWave, chooseUpgrade } from './world.js';
import { UPGRADE_POOL } from './config.js';

// A headless input stand-in: the ship flies in a slow circle and fires.
function fakeInput(world) {
  return {
    down: (k) => k === 'Space',
    wasPressed: () => false,
    mouseDown: true,
    mouseX: 640 + Math.cos(world.time * 0.7) * 260,
    mouseY: 400 + Math.sin(world.time * 0.7) * 200,
    pressed: new Set(),
    endFrame: () => {},
  };
}

const SILENT = {
  shoot: () => {},
  boom: () => {},
  pickup: () => {},
  hurt: () => {},
  upgrade: () => {},
  waveClear: () => {},
  victory: () => {},
  defeat: () => {},
  stopMusic: () => {},
};

export function setupShot(name, seed, update) {
  const world = createWorld(seed);
  if (name === 'title') {
    world.state = 'title';
    return world;
  }
  startRun(world);
  if (name === 'play') {
    // Play ~9 seconds of wave 1, aiming at the nearest rock each step,
    // so the field is busy: rocks splitting, bullets flying, shards out.
    const aim = fakeInput(world);
    for (let i = 0; i < 540 && world.state === 'play'; i++) {
      let best = null;
      let bestD = Infinity;
      for (const t of [...world.rocks, ...world.darters, ...world.mines]) {
        const d = Math.hypot(t.x - world.ship.x, t.y - world.ship.y);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      if (best) {
        aim.mouseX = best.x;
        aim.mouseY = best.y;
      }
      update(world, aim, SILENT, 1 / 60);
    }
    return world;
  }
  if (name === 'upgrade') {
    // Clear wave 1 by hand, then stand on the upgrade screen.
    world.spawnQueue = [];
    world.rocks = [];
    world.darters = [];
    world.mines = [];
    world.score = 2450;
    world.salvage = 9;
    world.kills = 14;
    world.ship.x = 150;
    world.ship.y = 690;
    world.messageTimer = 0;
    world.state = 'upgrade';
    world.choices = [UPGRADE_POOL[0], UPGRADE_POOL[3], UPGRADE_POOL[1]];
    world.levels = { twin: 1 };
    world.choiceIndex = 1;
    return world;
  }
  if (name === 'victory') {
    world.score = 48250;
    world.salvage = 87;
    world.kills = 212;
    world.wave = 10;
    world.state = 'victory';
    return world;
  }
  if (name === 'defeat') {
    world.score = 12300;
    world.salvage = 31;
    world.kills = 74;
    world.wave = 6;
    world.state = 'defeat';
    return world;
  }
  world.state = 'title';
  return world;
}
