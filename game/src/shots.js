// Deterministic screenshot scenes and the headless selftest.
// ?shot=<name>&seed=<n> builds a fixed scene at a fixed simulated time,
// so every screenshot is a real render of the game's own code, staged at
// a different moment of the loop: title, play, a hard night, victory.
// ?selftest=1 runs a scripted playthrough in-page and reports every
// check to window.__selftest (the harness reads it, no browser needed).

import { CFG } from './config.js';
import { createWorld, startNight } from './world.js';
import { createKeeper } from './keeper.js';
import { createShade } from './shades.js';

function placeShade(game, kind, x, y) {
  const s = createShade(kind, x, y, game.rng);
  game.world.shades.push(s);
  return s;
}

function placeEmber(game, x, y) {
  game.world.embers.push({ x, y, vx: 0, vy: 0, ttl: 12, bob: game.rng.range(0, 6) });
}

export function setupShot(game, name, seed) {
  game.world = createWorld(seed);
  game.keeper = createKeeper(CFG, game.rng);
  const w = game.world;
  const k = game.keeper;
  game.time = 25.4;

  if (name === 'title') {
    game.state = 'title';
    game.time = 8.2;
    return;
  }

  if (name === 'play') {
    game.state = 'playing';
    w.night = 3;
    w.nightTime = 25;
    w.score = 480;
    w.kills = 21;
    w.beaconIntegrity = 82;
    k.x = 500;
    k.y = 520;
    k.hp = 78;
    k.fuel = 54;
    k.angle = -0.7;
    k.flareFlash = 0.85;
    // One lamp dying, one dark already: the decision the shot shows.
    w.lamps[4].fuel = 18;
    w.lamps[5].lit = false;
    w.lamps[5].fuel = 0;
    placeShade(game, 'mote', 640, 360);
    placeShade(game, 'mote', 700, 470);
    placeShade(game, 'creeper', 940, 300);
    placeShade(game, 'creeper', 330, 480);
    placeShade(game, 'creeper', 660, 560);
    placeShade(game, 'brute', 640, 300);
    placeShade(game, 'mote', 1120, 380);
    placeShade(game, 'mote', 180, 380);
    placeEmber(game, 620, 480);
    placeEmber(game, 700, 400);
    placeEmber(game, 500, 340);
    placeEmber(game, 880, 420);
    placeEmber(game, 760, 520);
    return;
  }

  if (name === 'night') {
    game.state = 'playing';
    w.night = 6;
    w.nightTime = 40;
    w.score = 1240;
    w.kills = 58;
    w.beaconIntegrity = 45;
    k.x = 760;
    k.y = 520;
    k.hp = 55;
    k.fuel = 30;
    k.angle = 2.6;
    k.flareFlash = 0.5;
    w.lamps[1].lit = false;
    w.lamps[1].fuel = 0;
    w.lamps[4].lit = false;
    w.lamps[4].fuel = 0;
    w.lamps[0].fuel = 22;
    w.lamps[2].fuel = 31;
    placeShade(game, 'brute', 640, 300);
    placeShade(game, 'brute', 760, 420);
    placeShade(game, 'brute', 520, 460);
    placeShade(game, 'creeper', 940, 280);
    placeShade(game, 'creeper', 300, 300);
    placeShade(game, 'creeper', 640, 560);
    placeShade(game, 'creeper', 900, 500);
    placeShade(game, 'mote', 700, 380);
    placeShade(game, 'mote', 560, 420);
    placeShade(game, 'mote', 1120, 400);
    placeShade(game, 'mote', 160, 340);
    placeShade(game, 'mote', 860, 180);
    placeEmber(game, 700, 480);
    placeEmber(game, 520, 300);
    return;
  }

  if (name === 'victory') {
    game.state = 'victory';
    w.night = 7;
    w.nightTime = 60;
    w.score = 2480;
    w.kills = 96;
    w.embersGathered = 61;
    w.beaconIntegrity = 58;
    k.x = 560;
    k.y = 545;
    k.hp = 64;
    k.fuel = 41;
    k.angle = -Math.PI / 2;
    const dying = placeShade(game, 'mote', 760, 380);
    dying.burnT = 1;
    dying.flashT = 0.4;
    const dying2 = placeShade(game, 'creeper', 520, 420);
    dying2.burnT = 1;
    game.feel.burst(760, 380, { count: 20, speedMin: 30, speedMax: 140, color: '#ffb454', ttlMin: 0.4, ttlMax: 0.9 });
    game.feel.burst(520, 420, { count: 16, speedMin: 30, speedMax: 120, color: '#ffcf5c', ttlMin: 0.4, ttlMax: 0.9 });
    return;
  }

  game.state = 'title';
}

// --- the selftest: a scripted Keeper plays the game headlessly. ---
function scriptedInput(game) {
  const flags = { flare: false, relight: false };
  const input = {
    axisX() {
      return input._mx;
    },
    axisY() {
      return input._my;
    },
    aimAngle(x, y) {
      const s = nearestShade(game);
      if (!s) return -Math.PI / 2;
      return Math.atan2(s.y - y, s.x - x);
    },
    mouse() {
      return { x: 640, y: 300 };
    },
    flarePressed() {
      return flags.flare;
    },
    relightPressed() {
      return flags.relight;
    },
    pausePressed() {
      return false;
    },
    mutePressed() {
      return false;
    },
    restartPressed() {
      return false;
    },
    confirmPressed() {
      return false;
    },
    anyKey() {
      return false;
    },
    endFrame() {
      flags.flare = false;
      flags.relight = false;
    },
    _mx: 0,
    _my: 0,
    // Called each simulated frame: decide where to walk and what to do.
    drive() {
      const k = game.keeper;
      const w = game.world;
      let tx = CFG.beacon.x;
      let ty = CFG.beacon.y;
      // A dark lamp in reach is worth more than a kill.
      const dark = w.lamps.find((l) => !l.lit && Math.hypot(k.x - l.x, k.y - l.y) < 200);
      const near = nearestShade(game);
      const ember = w.embers[0];
      if (dark && k.fuel >= CFG.keeper.relightCost) {
        tx = dark.x;
        ty = dark.y;
        if (Math.hypot(k.x - dark.x, k.y - dark.y) < CFG.keeper.relightRange) flags.relight = true;
      } else if (near && Math.hypot(k.x - near.x, k.y - near.y) < 200 && k.fuel > 25) {
        tx = near.x;
        ty = near.y;
        flags.flare = true;
      } else if (ember) {
        tx = ember.x;
        ty = ember.y;
      }
      const dx = tx - k.x;
      const dy = ty - k.y;
      const d = Math.hypot(dx, dy) || 1;
      input._mx = d > 12 ? dx / d : 0;
      input._my = d > 12 ? dy / d : 0;
    },
  };
  return input;
}

function nearestShade(game) {
  const k = game.keeper;
  let best = null;
  let bestD = Infinity;
  for (const s of game.world.shades) {
    const d = Math.hypot(s.x - k.x, s.y - k.y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export function runSelftest(game, render) {
  const checks = [];
  function check(name, pass, detail) {
    checks.push({ name, pass: !!pass, detail: detail || '' });
  }
  const realInput = game.input;
  const driver = scriptedInput(game);
  game.input = driver;

  const DT = 1 / 60;
  // Renders are sampled (every Nth step) except in the perf block, where
  // every step renders so the ms/frame number is honest.
  function stepN(n, withRender, every) {
    for (let i = 0; i < n; i++) {
      driver.drive();
      game.step(DT);
      if (withRender && i % (every || 1) === 0) render(game);
    }
  }

  try {
    game.startRun();
    check('run starts', game.state === 'playing' && game.world.night === 1, `state=${game.state} night=${game.world.night}`);
    stepN(60 * 12, true, 15);
    check('shades spawn in the first minute', game.world.shades.length > 0 || game.world.kills > 0, `alive=${game.world.shades.length} kills=${game.world.kills}`);
    stepN(60 * 20, true, 15);
    check('shades burn and drop embers', game.world.kills > 0, `kills=${game.world.kills}`);
    check('embers are gathered', game.world.embersGathered > 0 || game.world.embers.length > 0, `gathered=${game.world.embersGathered} onGround=${game.world.embers.length}`);
    check('keeper still alive after 32s of scripted play', game.keeper.hp > 0, `hp=${Math.round(game.keeper.hp)} fuel=${Math.round(game.keeper.fuel)}`);

    // Night flow: force the clock to the end of night 1.
    game.world.nightTime = CFG.NIGHT_LEN - 0.05;
    stepN(60 * 2, false);
    check('night ends in dawn', game.state === 'dawn', `state=${game.state}`);
    stepN(60 * (CFG.DAWN_LEN + 1), false);
    check('dawn opens night 2', game.state === 'playing' && game.world.night === 2, `state=${game.state} night=${game.world.night}`);

    // Lamp snuff and relight.
    const lamp = game.world.lamps[0];
    lamp.fuel = 0.05;
    stepN(60, false);
    check('a lamp burns out', !lamp.lit, `lit=${lamp.lit}`);
    game.keeper.x = lamp.x;
    game.keeper.y = lamp.y + 30;
    game.keeper.fuel = 50;
    stepN(60, false);
    check('the Keeper relights it', lamp.lit && lamp.fuel > 90, `lit=${lamp.lit} fuel=${Math.round(lamp.fuel)}`);

    // Beacon under attack.
    const before = game.world.beaconIntegrity;
    const brute = createShade('brute', CFG.beacon.x + 40, CFG.beacon.y, game.rng);
    game.world.shades.push(brute);
    stepN(60 * 4, false);
    check('a brute hurts the Beacon', game.world.beaconIntegrity < before, `${Math.round(before)} -> ${Math.round(game.world.beaconIntegrity)}`);

    // Losing: the Keeper falls.
    game.keeper.hp = 5;
    const mote = createShade('mote', game.keeper.x + 5, game.keeper.y, game.rng);
    game.world.shades.push(mote);
    stepN(60 * 3, false);
    check('the Keeper can fall', game.state === 'gameover', `state=${game.state} reason=${game.loseReason}`);

    // Winning: night 7 runs out.
    game.startRun();
    game.world.night = CFG.NIGHTS;
    game.world.nightTime = CFG.NIGHT_LEN - 0.05;
    stepN(60 * 2, false);
    check('night 7 ends in victory', game.state === 'victory', `state=${game.state} score=${game.world.score}`);

    // Performance: 120 steps of update + render, timed.
    game.startRun();
    stepN(30, true, 15);
    const t0 = performance.now();
    stepN(120, true, 1);
    const t1 = performance.now();
    const ms = (t1 - t0) / 120;
    check('120 frames run (avg ms/frame)', ms < 50, `${ms.toFixed(2)} ms/frame in headless render`);
  } catch (err) {
    checks.push({ name: 'selftest crashed', pass: false, detail: String(err && err.message || err) });
  } finally {
    game.input = realInput;
  }

  const ok = checks.every((c) => c.pass);
  game.selftest = { ok, checks };
  window.__selftest = game.selftest;
  document.title = ok ? 'SELFTEST_OK' : 'SELFTEST_FAIL';
  // Also mirror the report into the DOM so a plain --dump-dom can read it.
  let pre = document.getElementById('selftest-report');
  if (!pre) {
    pre = document.createElement('pre');
    pre.id = 'selftest-report';
    document.body.appendChild(pre);
  }
  pre.textContent = JSON.stringify(game.selftest);
  return game.selftest;
}
