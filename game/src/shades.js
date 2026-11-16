// Shades: the dark's three kinds, each with a readable role and a
// readable silhouette, so the player can tell at a glance what is coming
// and what it wants. Motes hunt the Keeper, creepers snuff lamps, brutes
// lumber for the Beacon. Every kind telegraphs before it strikes: its
// eyes brighten, then it moves.

import { CFG } from './config.js';

const KINDS = ['mote', 'creeper', 'brute'];

export function pickKind(rng, night) {
  const mix = CFG.nightMix[Math.min(night - 1, CFG.nightMix.length - 1)];
  const roll = rng.next();
  if (roll < mix[0]) return 'mote';
  if (roll < mix[0] + mix[1]) return 'creeper';
  return 'brute';
}

export function createShade(kind, x, y, rng) {
  const spec = CFG.shades[kind];
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: spec.hp,
    maxHp: spec.hp,
    r: spec.r,
    speed: spec.speed,
    score: spec.score,
    embers: spec.embers,
    wobble: rng.range(0, Math.PI * 2), // personal wobble phase
    wobbleSpeed: rng.range(1.5, 3),
    lungeT: 0, // telegraph timer before a mote lunges
    lungeCd: rng.range(1.5, 3),
    attackT: 0, // brute's wind-up before it hits the beacon
    burnT: 0, // lingering flare burn
    flashT: 0, // white flash after taking a hit
    dead: false,
    // Where it is going, re-picked when its target dies or moves on.
    target: null,
  };
}

function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function updateShade(s, dt, game) {
  const cfg = CFG;
  const keeper = game.keeper;
  const world = game.world;

  if (s.burnT > 0) {
    s.burnT -= dt;
    s.hp -= cfg.keeper.burnDps * dt;
  }
  s.flashT = Math.max(0, s.flashT - dt);
  if (s.hp <= 0) {
    s.dead = true;
    return;
  }

  // Pick a target by kind. Creepers and brutes want the lamps first —
  // a dark lamp is a smaller island — then the Beacon. Motes want the
  // Keeper. A target is re-picked when it stops being worth it.
  let tx;
  let ty;
  if (s.kind === 'mote') {
    tx = keeper.x;
    ty = keeper.y;
  } else {
    if (!s.target || (s.target.lamp && !s.target.lamp.lit)) {
      s.target = nearestLitLamp(s, world);
    }
    if (s.target) {
      tx = s.target.lamp.x;
      ty = s.target.lamp.y;
    } else {
      tx = cfg.beacon.x;
      ty = cfg.beacon.y;
    }
  }

  const dx = tx - s.x;
  const dy = ty - s.y;
  const d = Math.hypot(dx, dy) || 1;
  // Wobble: shades drift, they never walk a dead straight line.
  const wob = Math.sin(game.time * s.wobbleSpeed + s.wobble) * 0.35;
  const px = -dy / d;
  const py = dx / d;
  let mx = dx / d + px * wob;
  let my = dy / d + py * wob;
  const ml = Math.hypot(mx, my) || 1;
  mx /= ml;
  my /= ml;

  if (s.kind === 'mote') {
    // Telegraph, then lunge: eyes brighten for 0.4 s, then a dash.
    s.lungeCd -= dt;
    if (s.lungeT > 0) {
      s.lungeT -= dt;
      if (s.lungeT <= 0) {
        s.vx = mx * s.speed * 3.2;
        s.vy = my * s.speed * 3.2;
        s.lungeCd = 2.2;
      }
    } else if (d < 130 && s.lungeCd <= 0) {
      s.lungeT = 0.4;
    } else {
      s.vx = mx * s.speed;
      s.vy = my * s.speed;
    }
  } else {
    s.vx = mx * s.speed;
    s.vy = my * s.speed;
  }
  s.x += s.vx * dt;
  s.y += s.vy * dt;

  // Light burns: standing in lamplight, beacon light, or the Keeper's
  // lantern hurts. Standing in total darkness slowly heals.
  const lit = game.lightAt(s.x, s.y);
  if (lit > 0) {
    s.hp -= lit * dt;
    if (s.hp <= 0) {
      s.dead = true;
      return;
    }
  } else {
    s.hp = Math.min(s.maxHp, s.hp + 2 * dt);
  }

  // Arrival behaviour, by kind.
  if (s.kind === 'creeper' && s.target) {
    const lamp = s.target.lamp;
    if (dist2(s.x, s.y, lamp.x, lamp.y) < (s.r + 26) * (s.r + 26)) {
      lamp.fuel -= cfg.lamp.snuffDrain * dt;
      if (lamp.fuel <= 0) {
        lamp.fuel = 0;
        lamp.lit = false;
        game.onLampSnuffed(lamp);
        s.target = null;
      }
    }
  } else if (s.kind === 'brute') {
    if (dist2(s.x, s.y, cfg.beacon.x, cfg.beacon.y) < (s.r + 44) * (s.r + 44)) {
      s.attackT -= dt;
      if (s.attackT <= 0) {
        s.attackT = cfg.beacon.hitInterval;
        game.onBeaconHit();
      }
    }
  } else if (s.kind === 'mote') {
    if (dist2(s.x, s.y, keeper.x, keeper.y) < (s.r + cfg.keeper.radius) * (s.r + cfg.keeper.radius)) {
      keeper.hurt(8, game);
      // The mote is knocked back off the Keeper and sulks for a second.
      s.x -= mx * 26;
      s.y -= my * 26;
      s.lungeCd = 1.2;
    }
  }
}

function nearestLitLamp(s, world) {
  let best = null;
  let bestD = Infinity;
  for (const lamp of world.lamps) {
    if (!lamp.lit) continue;
    const d = dist2(s.x, s.y, lamp.x, lamp.y);
    if (d < bestD) {
      bestD = d;
      best = { lamp, d };
    }
  }
  return best;
}

export { KINDS };
