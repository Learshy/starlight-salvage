// The world: lamps, embers, shades, the Beacon, nights, spawning, and
// the light itself. No drawing here; render.js reads this state and
// draws it. The world answers three questions the rest of the game asks
// constantly: how much light is at a point, which lamp is dark and near,
// and what the night is doing.

import { CFG } from './config.js';
import { createRng } from './rng.js';
import { createShade, pickKind, updateShade } from './shades.js';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createWorld(seed) {
  const rng = createRng(seed);
  const world = {
    rng,
    seed,
    lamps: CFG.lamps.map((p) => ({ x: p.x, y: p.y, fuel: CFG.lamp.fuelMax, lit: true, flicker: rng.range(0, Math.PI * 2) })),
    embers: [],
    shades: [],
    // Two shades drift across the title screen so it is alive, not a poster.
    ambientShades: [],
    beaconIntegrity: CFG.beacon.integrity,
    night: 1,
    nightTime: 0,
    spawnTimer: CFG.spawn.first,
    dawnT: 0,
    score: 0,
    kills: 0,
    embersGathered: 0,
    banner: null,
    bannerT: 0,
    lampsSnuffed: 0,
  };
  for (let i = 0; i < 2; i++) {
    const s = createShade(i === 0 ? 'mote' : 'creeper', 300 + i * 500, 300 + i * 120, rng);
    s.ambient = true;
    world.ambientShades.push(s);
  }
  return world;
}

function burnRate(night) {
  return CFG.lamp.burnBase + CFG.lamp.burnPerNight * (night - 1);
}

function spawnInterval(night) {
  const t = (night - 1) / (CFG.NIGHTS - 1);
  return lerp(CFG.spawn.intervalBase, CFG.spawn.intervalMin, t);
}

function maxAlive(night) {
  return CFG.spawn.maxAliveBase + CFG.spawn.maxAlivePerNight * (night - 1);
}

export function startNight(game, n) {
  const world = game.world;
  world.night = n;
  world.nightTime = 0;
  world.spawnTimer = n === 1 ? CFG.spawn.first : 2.0;
  world.banner = { title: `NIGHT ${n}`, sub: nightLine(n), t: 2.6 };
  game.audio.bell();
  game.feel.addTrauma(CFG.feel.traumaNight);
}

function nightLine(n) {
  return [
    'The dark stirs at the island’s edge.',
    'More of them tonight. Keep the lamps lit.',
    'The creepers have learned where the lamps are.',
    'Brutes walk tonight. Guard the Beacon.',
    'The dark grows bolder. Spend your light well.',
    'Almost dawn. Hold the line.',
    'The last night. Burn bright or go dark.',
  ][n - 1];
}

export function lightAt(game, x, y) {
  // Total burn damage per second a shade takes standing at (x, y).
  const world = game.world;
  const keeper = game.keeper;
  let dps = 0;
  const bd = Math.hypot(x - CFG.beacon.x, y - CFG.beacon.y);
  if (bd < CFG.beacon.radius) dps += CFG.beacon.dps;
  for (const lamp of world.lamps) {
    if (!lamp.lit) continue;
    if (Math.hypot(x - lamp.x, y - lamp.y) < CFG.lamp.radius) dps += CFG.lamp.dps;
  }
  if (Math.hypot(x - keeper.x, y - keeper.y) < keeper.lanternRadius()) dps += 25;
  return dps;
}

export function lightSources(game) {
  // Every pool of light on the island, for the darkness mask and the
  // warm glow pass. Radius already includes the lamp's flicker.
  const world = game.world;
  const keeper = game.keeper;
  const out = [];
  out.push({ x: CFG.beacon.x, y: CFG.beacon.y, r: CFG.beacon.radius, warm: 1 });
  for (const lamp of world.lamps) {
    if (!lamp.lit) continue;
    const fl = 1 + Math.sin(game.time * 9 + lamp.flicker) * 0.05;
    out.push({ x: lamp.x, y: lamp.y, r: CFG.lamp.radius * fl, warm: 0.9 });
  }
  out.push({ x: keeper.x, y: keeper.y, r: keeper.lanternRadius(), warm: 1 });
  for (const e of world.embers) {
    out.push({ x: e.x, y: e.y, r: 20, warm: 0.6 });
  }
  return out;
}

export function nearestDarkLamp(game, x, y, range) {
  let best = null;
  let bestD = Infinity;
  for (const lamp of game.world.lamps) {
    if (lamp.lit) continue;
    const d = Math.hypot(x - lamp.x, y - lamp.y);
    if (d < range && d < bestD) {
      bestD = d;
      best = lamp;
    }
  }
  return best;
}

export function relightLamp(game, lamp) {
  lamp.fuel = CFG.lamp.fuelMax;
  lamp.lit = true;
  game.world.score += 10;
  game.audio.relight();
  game.feel.burst(lamp.x, lamp.y - 20, { count: 22, speedMin: 30, speedMax: 120, color: '#ffcf5c', ttlMin: 0.4, ttlMax: 0.9 });
  game.feel.addTrauma(0.15);
}

function dropEmbers(game, shade) {
  const world = game.world;
  for (let i = 0; i < shade.embers; i++) {
    const a = game.rng.range(0, Math.PI * 2);
    world.embers.push({
      x: shade.x,
      y: shade.y,
      vx: Math.cos(a) * game.rng.range(20, 70),
      vy: Math.sin(a) * game.rng.range(20, 70),
      ttl: CFG.ember.ttl,
      bob: game.rng.range(0, Math.PI * 2),
    });
  }
}

function killShade(game, shade) {
  const world = game.world;
  world.score += shade.score;
  world.kills++;
  dropEmbers(game, shade);
  game.feel.burst(shade.x, shade.y, { count: 18, speedMin: 40, speedMax: 180, color: '#ffb454', ttlMin: 0.3, ttlMax: 0.7 });
  game.feel.burst(shade.x, shade.y, { count: 8, speedMin: 10, speedMax: 60, color: '#8a7dff', ttlMin: 0.4, ttlMax: 0.9 });
  game.audio.dissolve();
  game.feel.addTrauma(CFG.feel.traumaKill);
  game.feel.hitstop(CFG.feel.hitstopKill);
}

export function fireFlare(game, x, y, angle) {
  // A cone of light: everything inside the arc and range burns now and
  // keeps burning for a moment after.
  const cfg = CFG.keeper;
  const world = game.world;
  game.audio.flare();
  game.feel.addTrauma(0.18);
  game.feel.punchZoom(0.015);
  const fx = x + Math.cos(angle) * cfg.flareRange * 0.55;
  const fy = y + Math.sin(angle) * cfg.flareRange * 0.55;
  game.feel.burst(fx, fy, { count: 26, speedMin: 60, speedMax: 240, color: '#ffe08a', ttlMin: 0.25, ttlMax: 0.6 });
  for (const s of world.shades) {
    const dx = s.x - x;
    const dy = s.y - y;
    const d = Math.hypot(dx, dy);
    if (d > cfg.flareRange + s.r) continue;
    let da = Math.atan2(dy, dx) - angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) > cfg.flareArc) continue;
    s.hp -= cfg.flareDmg;
    s.burnT = cfg.burnTime;
    s.flashT = 0.25;
    s.vx += (dx / (d || 1)) * 160;
    s.vy += (dy / (d || 1)) * 160;
    if (s.hp <= 0) {
      s.dead = true;
      killShade(game, s);
    }
  }
  world.shades = world.shades.filter((s) => !s.dead);
}

export function updateWorld(dt, game) {
  const world = game.world;
  const keeper = game.keeper;

  if (world.banner) {
    world.banner.t -= dt;
    if (world.banner.t <= 0) world.banner = null;
  }

  // Lamps burn down; a lamp at zero fuel goes dark and the island
  // gets smaller. The flicker phase keeps each flame its own.
  for (const lamp of world.lamps) {
    lamp.flicker += dt;
    if (!lamp.lit) continue;
    lamp.fuel -= burnRate(world.night) * dt;
    if (lamp.fuel <= 0) {
      lamp.fuel = 0;
      lamp.lit = false;
      world.lampsSnuffed++;
      game.audio.lampOut();
      game.feel.burst(lamp.x, lamp.y - 24, { count: 10, speedMin: 10, speedMax: 50, color: '#5a6a9a', ttlMin: 0.5, ttlMax: 1 });
    }
  }

  // Embers: drift, fade, magnetise to the Keeper, pay fuel on pickup.
  for (let i = world.embers.length - 1; i >= 0; i--) {
    const e = world.embers[i];
    e.ttl -= dt;
    e.bob += dt * 3;
    if (e.ttl <= 0) {
      world.embers.splice(i, 1);
      continue;
    }
    const dx = keeper.x - e.x;
    const dy = keeper.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 70) {
      e.vx += (dx / (d || 1)) * 500 * dt;
      e.vy += (dy / (d || 1)) * 500 * dt;
    }
    e.vx *= Math.pow(0.92, dt * 60);
    e.vy *= Math.pow(0.92, dt * 60);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (d < CFG.keeper.pickupRange) {
      keeper.fuel = Math.min(CFG.keeper.fuel, keeper.fuel + CFG.ember.fuel);
      world.score += CFG.ember.score;
      world.embersGathered++;
      game.audio.chime();
      game.feel.burst(e.x, e.y, { count: 8, speedMin: 20, speedMax: 90, color: '#ffcf5c', ttlMin: 0.2, ttlMax: 0.5 });
      game.feel.addTrauma(CFG.feel.traumaPickup);
      world.embers.splice(i, 1);
    }
  }

  if (game.state === 'dawn') {
    // Dawn dissolves what is left of the night and pays the Keeper.
    world.dawnT -= dt;
    for (const s of world.shades) {
      s.hp -= 60 * dt;
      if (s.hp <= 0) s.dead = true;
    }
    world.shades = world.shades.filter((s) => !s.dead);
    if (world.dawnT <= 0) {
      if (world.night >= CFG.NIGHTS) {
        game.win();
      } else {
        startNight(game, world.night + 1);
        game.state = 'playing';
      }
    }
    return;
  }

  if (game.state !== 'playing') return;

  // The night clock and the spawn clock.
  world.nightTime += dt;
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0) {
    world.spawnTimer = spawnInterval(world.night) * game.rng.range(0.8, 1.25);
    if (world.shades.length < maxAlive(world.night)) {
      const p = game.rng.pick(CFG.spawnPoints);
      const kind = pickKind(game.rng, world.night);
      const s = createShade(kind, p.x + game.rng.range(-14, 14), p.y + game.rng.range(-14, 14), game.rng);
      world.shades.push(s);
    }
  }

  for (const s of world.shades) updateShade(s, dt, game);
  world.shades = world.shades.filter((s) => {
    if (s.dead) killShade(game, s);
    return !s.dead;
  });

  if (world.nightTime >= CFG.NIGHT_LEN) {
    if (world.night >= CFG.NIGHTS) {
      game.win();
      return;
    }
    // Dawn: the night is survived, the dark dissolves, the Keeper is paid.
    world.score += CFG.NIGHT_SCORE_BONUS;
    keeper.fuel = Math.min(CFG.keeper.fuel, keeper.fuel + CFG.DAWN_FUEL_BONUS);
    world.banner = { title: `NIGHT ${world.night} SURVIVED`, sub: 'Dawn breaks. The dark dissolves.', t: 3 };
    game.audio.dawn();
    game.feel.flash(0.35);
    game.feel.addTrauma(CFG.feel.traumaNight);
    game.state = 'dawn';
    world.dawnT = CFG.DAWN_LEN;
  }
}

export function updateAmbient(dt, game) {
  // Title screen life: lamps flicker, two shades drift across the dark.
  const world = game.world;
  for (const lamp of world.lamps) lamp.flicker += dt;
  for (const s of world.ambientShades) {
    s.wobble += dt;
    s.x += Math.cos(s.wobble * 0.7) * 22 * dt;
    s.y += Math.sin(s.wobble * 0.9) * 16 * dt;
    if (s.x < 120) s.x = 120;
    if (s.x > 1160) s.x = 1160;
    if (s.y < 100) s.y = 100;
    if (s.y > 640) s.y = 640;
  }
}
