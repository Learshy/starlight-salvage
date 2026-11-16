// Every pixel the game draws. The renderer only reads world state; it
// never changes it. The look is light-against-dark: the world is drawn
// fully lit, then a darkness mask is laid over it with real holes punched
// where the light is — the lighting IS the mechanic, so it is drawn as
// geometry, not as a fog overlay. Warm glows are added additively after.

import { CFG } from './config.js';
import { createRng } from './rng.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back || 'rgba(0,0,0,0.55)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x + 1.5, y + 1.5, Math.max(h - 3, (w - 3) * Math.min(1, frac)), h - 3, (h - 3) / 2);
    ctx.fill();
  }
}

// --- the ground: pre-rendered once per run from the seed, so the island
// is a place (paths, rocks, pines, the old well) instead of a flat disc.
function buildGround(seed) {
  const rng = createRng(seed);
  const c = document.createElement('canvas');
  c.width = CFG.W;
  c.height = CFG.H;
  const g = c.getContext('2d');

  // Night sky.
  const sky = g.createLinearGradient(0, 0, 0, CFG.H);
  sky.addColorStop(0, '#04060f');
  sky.addColorStop(0.6, '#0a1026');
  sky.addColorStop(1, '#0d1330');
  g.fillStyle = sky;
  g.fillRect(0, 0, CFG.W, CFG.H);

  // Stars, some with a cross sparkle.
  for (let i = 0; i < 150; i++) {
    const x = rng.range(0, CFG.W);
    const y = rng.range(0, CFG.H * 0.55);
    const r = rng.range(0.5, 1.6);
    g.globalAlpha = rng.range(0.25, 0.9);
    g.fillStyle = '#dfe8ff';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // The moon, high and pale, with a soft halo.
  const moon = g.createRadialGradient(1080, 96, 8, 1080, 96, 90);
  moon.addColorStop(0, 'rgba(235, 240, 255, 0.9)');
  moon.addColorStop(0.25, 'rgba(210, 220, 255, 0.35)');
  moon.addColorStop(1, 'rgba(210, 220, 255, 0)');
  g.fillStyle = moon;
  g.beginPath();
  g.arc(1080, 96, 90, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e8edff';
  g.beginPath();
  g.arc(1080, 96, 30, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(180, 190, 220, 0.5)';
  g.beginPath();
  g.arc(1070, 88, 7, 0, Math.PI * 2);
  g.arc(1092, 104, 5, 0, Math.PI * 2);
  g.arc(1084, 82, 4, 0, Math.PI * 2);
  g.fill();

  // The island's drop shadow, then the grass mound.
  const isl = CFG.island;
  g.fillStyle = 'rgba(0, 0, 0, 0.5)';
  g.beginPath();
  g.ellipse(isl.x, isl.y + 16, isl.rx, isl.ry, 0, 0, Math.PI * 2);
  g.fill();
  const grass = g.createRadialGradient(isl.x, isl.y - 60, 60, isl.x, isl.y, isl.rx);
  grass.addColorStop(0, '#22331f');
  grass.addColorStop(0.6, '#182619');
  grass.addColorStop(1, '#0e1a12');
  g.fillStyle = grass;
  g.beginPath();
  g.ellipse(isl.x, isl.y, isl.rx, isl.ry, 0, 0, Math.PI * 2);
  g.fill();

  // Ground speckle: the grass is not a flat fill.
  for (let i = 0; i < 1100; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = Math.sqrt(rng.next());
    const x = isl.x + Math.cos(a) * rr * isl.rx;
    const y = isl.y + Math.sin(a) * rr * isl.ry;
    g.globalAlpha = rng.range(0.08, 0.3);
    g.fillStyle = rng.chance(0.5) ? '#2c4228' : '#0a140d';
    g.fillRect(x, y, rng.range(1, 3), rng.range(1, 2));
  }
  g.globalAlpha = 1;

  // Stone paths from the Beacon to each lamp.
  for (const lamp of CFG.lamps) {
    g.strokeStyle = '#3a3f4a';
    g.lineWidth = 16;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(CFG.beacon.x, CFG.beacon.y);
    const mx = (CFG.beacon.x + lamp.x) / 2 + rng.range(-30, 30);
    const my = (CFG.beacon.y + lamp.y) / 2 + rng.range(-30, 30);
    g.quadraticCurveTo(mx, my, lamp.x, lamp.y);
    g.stroke();
    g.strokeStyle = '#4a5060';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(CFG.beacon.x, CFG.beacon.y);
    g.quadraticCurveTo(mx, my, lamp.x, lamp.y);
    g.stroke();
  }

  // Grass tufts.
  g.strokeStyle = '#2f4a2c';
  g.lineWidth = 1.5;
  for (let i = 0; i < 170; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = Math.sqrt(rng.next());
    const x = isl.x + Math.cos(a) * rr * isl.rx * 0.97;
    const y = isl.y + Math.sin(a) * rr * isl.ry * 0.97;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 3, y - 7);
    g.moveTo(x + 2, y);
    g.lineTo(x + 3, y - 8);
    g.moveTo(x + 4, y);
    g.lineTo(x + 6, y - 6);
    g.stroke();
  }

  // Night-blooms: tiny pale flowers that catch the light.
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = Math.sqrt(rng.next());
    const x = isl.x + Math.cos(a) * rr * isl.rx * 0.95;
    const y = isl.y + Math.sin(a) * rr * isl.ry * 0.95;
    g.fillStyle = 'rgba(220, 230, 255, 0.75)';
    g.beginPath();
    g.arc(x, y, 1.6, 0, Math.PI * 2);
    g.fill();
  }

  // Rocks.
  for (let i = 0; i < 12; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = 0.55 + rng.next() * 0.4;
    const x = isl.x + Math.cos(a) * rr * isl.rx;
    const y = isl.y + Math.sin(a) * rr * isl.ry;
    const w = rng.range(10, 26);
    g.fillStyle = '#4b4f57';
    g.beginPath();
    g.ellipse(x, y, w, w * 0.6, rng.range(0, 3), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(200, 205, 220, 0.25)';
    g.beginPath();
    g.ellipse(x - w * 0.2, y - w * 0.18, w * 0.5, w * 0.28, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Pine silhouettes around the rim — the island's edge reads as a place.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rng.range(-0.08, 0.08);
    const rr = 0.98 + rng.next() * 0.05;
    const x = isl.x + Math.cos(a) * rr * isl.rx;
    const y = isl.y + Math.sin(a) * rr * isl.ry;
    const h = rng.range(34, 62);
    g.fillStyle = '#0a1410';
    g.beginPath();
    g.moveTo(x, y - h);
    g.lineTo(x - h * 0.32, y);
    g.lineTo(x + h * 0.32, y);
    g.closePath();
    g.fill();
    g.fillStyle = '#0d1a13';
    g.beginPath();
    g.moveTo(x, y - h * 0.7);
    g.lineTo(x - h * 0.24, y - h * 0.2);
    g.lineTo(x + h * 0.24, y - h * 0.2);
    g.closePath();
    g.fill();
  }

  // The old well, south-west of the Beacon — a landmark to navigate by.
  g.fillStyle = '#3d3a33';
  g.beginPath();
  g.arc(418, 512, 20, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0a0a12';
  g.beginPath();
  g.arc(418, 512, 13, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#2c2620';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(398, 512);
  g.lineTo(398, 478);
  g.moveTo(438, 512);
  g.lineTo(438, 478);
  g.stroke();
  g.fillStyle = '#4a3226';
  g.beginPath();
  g.moveTo(392, 480);
  g.lineTo(444, 480);
  g.lineTo(438, 466);
  g.lineTo(398, 466);
  g.closePath();
  g.fill();

  return c;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dark = document.createElement('canvas');
  dark.width = CFG.W;
  dark.height = CFG.H;
  const dctx = dark.getContext('2d');
  let ground = null;
  let groundSeed = -1;

  function ensureGround(seed) {
    if (!ground || groundSeed !== seed) {
      ground = buildGround(seed);
      groundSeed = seed;
    }
  }

  function flame(ctx2, x, y, h, flick, colorA, colorB) {
    const w = h * 0.55;
    const f = 1 + Math.sin(flick) * 0.12 + Math.sin(flick * 2.7) * 0.06;
    const grad = ctx2.createRadialGradient(x, y - h * 0.4, 1, x, y - h * 0.4, h);
    grad.addColorStop(0, colorA);
    grad.addColorStop(0.6, colorB);
    grad.addColorStop(1, 'rgba(255, 120, 20, 0)');
    ctx2.fillStyle = grad;
    ctx2.beginPath();
    ctx2.moveTo(x, y - h * f);
    ctx2.quadraticCurveTo(x + w * f, y - h * 0.3, x + w * 0.4, y);
    ctx2.quadraticCurveTo(x, y + h * 0.15, x - w * 0.4, y);
    ctx2.quadraticCurveTo(x - w * f, y - h * 0.3, x, y - h * f);
    ctx2.fill();
  }

  function drawLamp(l, game) {
    const t = game.time;
    ctx.strokeStyle = '#1c1a18';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(l.x, l.y + 6);
    ctx.lineTo(l.x, l.y - 34);
    ctx.stroke();
    ctx.strokeStyle = '#2e2a24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(l.x, l.y - 34);
    ctx.lineTo(l.x + 10, l.y - 30);
    ctx.stroke();
    // The hanging lantern box.
    ctx.fillStyle = '#141210';
    ctx.fillRect(l.x + 4, l.y - 30, 13, 17);
    if (l.lit) {
      const fl = 0.75 + Math.sin(t * 9 + l.flicker) * 0.25;
      ctx.fillStyle = `rgba(255, 196, 90, ${0.85 * fl})`;
      ctx.fillRect(l.x + 6.5, l.y - 27.5, 8, 12);
      flame(ctx, l.x + 10.5, l.y - 14, 14, t * 9 + l.flicker, '#ffe9a8', '#ff9a2a');
    } else {
      ctx.fillStyle = '#232c3d';
      ctx.fillRect(l.x + 6.5, l.y - 27.5, 8, 12);
    }
    // A dying lamp flickers and dims before it goes out: the telegraph.
    if (l.lit && l.fuel < 25) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 14 + l.flicker);
      ctx.fillStyle = '#ff5d5d';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', l.x + 10, l.y - 40);
      ctx.globalAlpha = 1;
    }
    // Relight prompt when the Keeper stands close to a dark lamp.
    if (!l.lit) {
      const k = game.keeper;
      if (Math.hypot(k.x - l.x, k.y - l.y) < CFG.keeper.relightRange + 14) {
        ctx.fillStyle = k.fuel >= CFG.keeper.relightCost ? '#ffe08a' : '#8a8a9a';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('[E] RELIGHT', l.x + 10, l.y - 44);
      }
    }
  }

  function drawBeacon(game) {
    const b = CFG.beacon;
    const t = game.time;
    const integ = game.world.beaconIntegrity / 100;
    // Stone tower.
    ctx.fillStyle = '#33302c';
    ctx.beginPath();
    ctx.moveTo(b.x - 26, b.y + 34);
    ctx.lineTo(b.x - 18, b.y - 18);
    ctx.lineTo(b.x + 18, b.y - 18);
    ctx.lineTo(b.x + 26, b.y + 34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(b.x - 22 + i * 2, b.y + 18 - i * 14);
      ctx.lineTo(b.x + 22 - i * 2, b.y + 18 - i * 14);
      ctx.stroke();
    }
    // Brazier bowl and the flame, which shrinks as integrity falls.
    ctx.fillStyle = '#1c1a18';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y - 20, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const fh = 26 + 30 * integ;
    flame(ctx, b.x, b.y - 24, fh, t * 7, '#fff3c4', '#ff8a1e');
    flame(ctx, b.x, b.y - 24, fh * 0.55, t * 11 + 2, '#ffffff', '#ffd24a');
    // Smoke wisps, rising on game time.
    ctx.fillStyle = 'rgba(160, 170, 200, 0.16)';
    for (let i = 0; i < 3; i++) {
      const p = ((t * 0.25 + i / 3) % 1);
      ctx.beginPath();
      ctx.arc(b.x + Math.sin(t + i * 2) * 8 * p, b.y - 50 - p * 46, 5 + p * 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawShade(s, game) {
    const t = game.time;
    const bob = Math.sin(t * 3 + s.wobble) * 2;
    const x = s.x;
    const y = s.y + bob;
    ctx.save();
    if (s.flashT > 0) ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 40);
    // Body: a dark mass with a wobbling edge, darker than the night.
    ctx.fillStyle = '#070812';
    ctx.strokeStyle = 'rgba(120, 110, 200, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (s.kind === 'mote') {
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
    } else if (s.kind === 'creeper') {
      ctx.moveTo(x, y - s.r * 1.3);
      ctx.quadraticCurveTo(x + s.r, y - s.r * 0.6, x + s.r * 0.8, y + s.r * 0.5);
      ctx.quadraticCurveTo(x + s.r * 0.4, y + s.r * 1.1, x, y + s.r);
      ctx.quadraticCurveTo(x - s.r * 0.4, y + s.r * 1.1, x - s.r * 0.8, y + s.r * 0.5);
      ctx.quadraticCurveTo(x - s.r, y - s.r * 0.6, x, y - s.r * 1.3);
    } else {
      // Brute: broad hunched shoulders, two overlapping masses.
      ctx.arc(x - s.r * 0.45, y + s.r * 0.15, s.r * 0.75, 0, Math.PI * 2);
      ctx.arc(x + s.r * 0.45, y + s.r * 0.15, s.r * 0.75, 0, Math.PI * 2);
      ctx.arc(x, y - s.r * 0.45, s.r * 0.7, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    // Eyes: the telegraph. They brighten before a lunge or a blow.
    let eyeGlow = 0.75;
    if (s.kind === 'mote' && s.lungeT > 0) eyeGlow = 1;
    if (s.kind === 'brute' && s.attackT < 0.4 && s.attackT > 0) eyeGlow = 1;
    const eyeColor = s.kind === 'brute' ? '#ff5d3a' : s.kind === 'creeper' ? '#ffb454' : '#b9a8ff';
    const eyeR = s.kind === 'brute' ? 3.2 : 2.4;
    const eyes = s.kind === 'brute'
      ? [[-9, -8], [9, -8], [-4, -2], [4, -2]]
      : s.kind === 'creeper'
        ? [[-6, -6], [0, -9], [6, -6]]
        : [[-4, -3], [4, -3]];
    ctx.fillStyle = eyeColor;
    ctx.globalAlpha = eyeGlow;
    for (const [ex, ey] of eyes) {
      ctx.beginPath();
      ctx.arc(x + ex, y + ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Burn: a flare's lingering fire flickers on the body.
    if (s.burnT > 0) {
      ctx.strokeStyle = `rgba(255, 140, 40, ${0.4 + 0.3 * Math.sin(t * 20)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, s.r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Brutes earn a health bar: they are the only ones worth counting.
    if (s.kind === 'brute' && s.hp < s.maxHp) {
      bar(ctx, x - 20, y - s.r - 16, 40, 5, s.hp / s.maxHp, '#ff5d3a');
    }
    ctx.restore();
  }

  function drawKeeper(game) {
    const k = game.keeper;
    const t = game.time;
    ctx.save();
    if (k.invuln > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.45;
    const bob = k.moving ? Math.sin(k.stepT * 14) * 1.5 : Math.sin(t * 2) * 0.8;
    const x = k.x;
    const y = k.y + bob;
    // Cloak: a hooded figure, deep blue with a warm hem. Drawn large
    // enough to read at a glance: the hero must never hide in the dark.
    ctx.fillStyle = '#33415f';
    ctx.beginPath();
    ctx.moveTo(x, y - 26);
    ctx.quadraticCurveTo(x + 17, y - 10, x + 14, y + 15);
    ctx.quadraticCurveTo(x, y + 20, x - 14, y + 15);
    ctx.quadraticCurveTo(x - 17, y - 10, x, y - 26);
    ctx.fill();
    ctx.fillStyle = '#232f4a';
    ctx.beginPath();
    ctx.arc(x, y - 18, 11, 0, Math.PI * 2);
    ctx.fill();
    // Two small warm eyes in the hood's shadow.
    ctx.fillStyle = '#ffcf5c';
    ctx.beginPath();
    ctx.arc(x - 3.5, y - 19, 1.8, 0, Math.PI * 2);
    ctx.arc(x + 3.5, y - 19, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Hem trim and belt.
    ctx.strokeStyle = '#c9973f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 13, y + 12);
    ctx.quadraticCurveTo(x, y + 17, x + 13, y + 12);
    ctx.stroke();
    // The lantern, swinging with the stride, held out toward the aim.
    const swing = k.moving ? Math.sin(k.stepT * 14) * 0.35 : Math.sin(t * 2.2) * 0.08;
    const la = k.angle + swing * 0.4;
    const lx = x + Math.cos(la) * 26;
    const ly = y - 2 + Math.sin(la) * 26;
    ctx.strokeStyle = '#3a2f1e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(la) * 10, y - 2 + Math.sin(la) * 10);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = '#141210';
    ctx.fillRect(lx - 5, ly - 7, 11, 14);
    const fl = 0.8 + 0.2 * Math.sin(t * 10);
    ctx.fillStyle = `rgba(255, 196, 90, ${fl})`;
    ctx.fillRect(lx - 2.5, ly - 4.5, 6, 9);
    // Warm rim light on the lantern side: the Keeper carries their own
    // light, and the reader must see it on the body, not just the ground.
    ctx.strokeStyle = 'rgba(255, 190, 90, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y - 2, 17, la - 0.7, la + 0.7);
    ctx.stroke();
    ctx.restore();
  }

  function drawEmber(e, game) {
    const t = game.time;
    const bob = Math.sin(e.bob) * 2;
    const a = e.ttl < 3 ? 0.4 + 0.4 * Math.sin(t * 10) : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(e.x, e.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffcf5c';
    ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(-1.8, -1.8, 3.6, 3.6);
    ctx.restore();
  }

  function drawHUD(game) {
    const world = game.world;
    const k = game.keeper;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 9, 22, 0.72)';
    roundRect(ctx, 12, 10, CFG.W - 24, 46, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 160, 220, 0.25)';
    ctx.lineWidth = 1;
    roundRect(ctx, 12, 10, CFG.W - 24, 46, 10);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    // Night dial.
    ctx.fillStyle = '#e8edff';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`NIGHT ${world.night} / ${CFG.NIGHTS}`, 26, 33);
    bar(ctx, 150, 24, 110, 10, game.state === 'playing' ? world.nightTime / CFG.NIGHT_LEN : 0, '#8a9bd8');
    // Beacon integrity.
    ctx.fillStyle = '#ffb454';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('BEACON', 286, 33);
    bar(ctx, 350, 24, 110, 10, world.beaconIntegrity / 100, world.beaconIntegrity < 35 ? '#ff5d3a' : '#ff9a2a');
    // Health.
    ctx.fillStyle = '#ff8a8a';
    ctx.fillText('KEEPER', 486, 33);
    bar(ctx, 556, 24, 110, 10, Math.max(0, k.hp) / 100, k.hp < 30 ? '#ff5d5d' : '#ff8a8a');
    // Fuel: the oil gauge. Red when it is nearly gone — that is the danger.
    ctx.fillStyle = '#ffcf5c';
    ctx.fillText('OIL', 692, 33);
    bar(ctx, 726, 24, 110, 10, Math.max(0, k.fuel) / 100, k.fuel < 25 ? '#ff5d3a' : '#ffcf5c');
    // Lamps lit, as six dots.
    ctx.fillStyle = '#e8edff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('LAMPS', 862, 33);
    world.lamps.forEach((lamp, i) => {
      ctx.fillStyle = lamp.lit ? '#ffcf5c' : '#3a4157';
      ctx.beginPath();
      ctx.arc(922 + i * 18, 33, 6, 0, Math.PI * 2);
      ctx.fill();
      if (lamp.lit) {
        ctx.fillStyle = 'rgba(255, 207, 92, 0.35)';
        ctx.beginPath();
        ctx.arc(922 + i * 18, 33, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // Score.
    ctx.fillStyle = '#e8edff';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE ${world.score}`, CFG.W - 26, 33);
    ctx.textAlign = 'left';

    // Bottom hint line.
    ctx.fillStyle = 'rgba(232, 237, 255, 0.55)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('WASD move · Mouse aim · Click / SPACE flare · E relight lamp · P pause · M mute', 26, CFG.H - 16);
    ctx.restore();
  }

  function drawBanner(game) {
    const b = game.world.banner;
    if (!b) return;
    const a = Math.min(1, b.t > 2 ? (2.6 - b.t) / 0.6 : b.t / 0.8);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText(b.title, CFG.W / 2, 150);
    ctx.fillStyle = 'rgba(232, 237, 255, 0.9)';
    ctx.font = '17px Georgia, serif';
    ctx.fillText(b.sub, CFG.W / 2, 184);
    ctx.restore();
  }

  function panel(ctx2, x, y, w, h) {
    ctx2.fillStyle = 'rgba(6, 9, 22, 0.82)';
    roundRect(ctx2, x, y, w, h, 14);
    ctx2.fill();
    ctx2.strokeStyle = 'rgba(200, 160, 80, 0.45)';
    ctx2.lineWidth = 1.5;
    roundRect(ctx2, x, y, w, h, 14);
    ctx2.stroke();
  }

  function drawTitle(game) {
    const t = game.time;
    ctx.save();
    ctx.fillStyle = 'rgba(3, 5, 14, 0.55)';
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.shadowColor = 'rgba(255, 170, 60, 0.6)';
    ctx.shadowBlur = 34;
    ctx.fillText('EMBERKEEP', CFG.W / 2, 218);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8edff';
    ctx.font = 'italic 24px Georgia, serif';
    ctx.fillText('Seven Nights of the Beacon', CFG.W / 2, 258);
    ctx.fillStyle = 'rgba(232, 237, 255, 0.85)';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Light is your only weapon. Keep the Beacon burning until dawn.', CFG.W / 2, 300);
    ctx.fillText('Flares and relights spend the same oil the embers repay.', CFG.W / 2, 326);

    panel(ctx, CFG.W / 2 - 250, 368, 500, 132);
    ctx.fillStyle = '#e8edff';
    ctx.font = '15px system-ui, sans-serif';
    const lines = [
      'WASD / Arrows — walk the island',
      'Mouse — aim the lantern · Click / SPACE — flare',
      'E — relight a dark lamp (costs oil)',
      'Stand in the light. The dark drains the lightless.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, CFG.W / 2, 396 + i * 26));

    const pulse = 0.65 + 0.35 * Math.sin(t * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffcf5c';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', CFG.W / 2, 560);
    ctx.globalAlpha = 1;
    if (game.best > 0) {
      ctx.fillStyle = 'rgba(232, 237, 255, 0.7)';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`Best score: ${game.best}`, CFG.W / 2, 596);
    }
    ctx.restore();
  }

  function drawGameOver(game) {
    const world = game.world;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 3, 8, 0.72)';
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText(game.loseReason === 'snuffed' ? 'THE BEACON IS SNUFFED' : 'THE DARK TOOK YOU', CFG.W / 2, 240);
    ctx.fillStyle = '#e8edff';
    ctx.font = '20px Georgia, serif';
    ctx.fillText(`Night ${world.night} of ${CFG.NIGHTS} — ${world.lamps.filter((l) => !l.lit).length} lamp${world.lamps.filter((l) => !l.lit).length === 1 ? '' : 's'} stood dark when the light went out.`, CFG.W / 2, 292);
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(232, 237, 255, 0.85)';
    ctx.fillText(`Score ${world.score} · ${world.kills} shades burned · ${world.embersGathered} embers gathered`, CFG.W / 2, 332);
    ctx.fillStyle = '#ffcf5c';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('PRESS R TO TRY AGAIN', CFG.W / 2, 420);
    ctx.restore();
  }

  function drawVictory(game) {
    const world = game.world;
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, 0, CFG.H);
    grad.addColorStop(0, 'rgba(255, 190, 90, 0.28)');
    grad.addColorStop(1, 'rgba(255, 140, 60, 0.10)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.shadowColor = 'rgba(255, 170, 60, 0.7)';
    ctx.shadowBlur = 30;
    ctx.fillText('DAWN BREAKS', CFG.W / 2, 230);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff6d8';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText('Seven nights held. The Beacon still burns.', CFG.W / 2, 274);
    ctx.fillStyle = '#e8edff';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`Score ${world.score} · ${world.kills} shades burned · ${world.embersGathered} embers gathered`, CFG.W / 2, 330);
    ctx.fillText(`Beacon integrity ${Math.max(0, Math.round(world.beaconIntegrity))}% · Keeper standing`, CFG.W / 2, 360);
    ctx.fillStyle = '#ffcf5c';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('PRESS R TO PLAY AGAIN', CFG.W / 2, 440);
    ctx.restore();
  }

  function drawPause() {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 5, 14, 0.6)';
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8edff';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText('PAUSED', CFG.W / 2, 330);
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(232, 237, 255, 0.8)';
    ctx.fillText('P to resume · R to restart · M to mute', CFG.W / 2, 372);
    ctx.restore();
  }

  return {
    draw(game) {
      ensureGround(game.world.seed);
      const world = game.world;
      const keeper = game.keeper;
      const t = game.time;

      ctx.save();
      // Trauma shake and the zoom punch ride on top of the whole frame.
      const shake = game.feel.shakeOffset(t, CFG.feel.shakeMax);
      const zoom = game.feel.zoom();
      ctx.translate(CFG.W / 2 + shake.x, CFG.H / 2 + shake.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-CFG.W / 2, -CFG.H / 2);

      ctx.drawImage(ground, 0, 0);
      drawBeacon(game);
      for (const lamp of world.lamps) drawLamp(lamp, game);
      for (const e of world.embers) drawEmber(e, game);
      for (const s of world.ambientShades) drawShade(s, game);
      for (const s of world.shades) drawShade(s, game);
      if (game.state !== 'title') drawKeeper(game);

      // --- the darkness mask: fill the night, punch holes where light is.
      let darkAlpha = 0.9;
      if (game.state === 'dawn') darkAlpha = 0.45;
      if (game.state === 'victory') darkAlpha = 0.12;
      if (game.state === 'title') darkAlpha = 0.82;
      dctx.clearRect(0, 0, CFG.W, CFG.H);
      dctx.globalCompositeOperation = 'source-over';
      dctx.fillStyle = `rgba(3, 5, 16, ${darkAlpha})`;
      dctx.fillRect(0, 0, CFG.W, CFG.H);
      dctx.globalCompositeOperation = 'destination-out';
      // Moonlight: a wide, soft hole over the whole island, so the ground
      // reads dimly everywhere and the lamps stay the warm pools. Without
      // it the rim of the island is unreadable black.
      const moon = dctx.createRadialGradient(CFG.island.x, CFG.island.y, 100, CFG.island.x, CFG.island.y, 720);
      moon.addColorStop(0, 'rgba(0,0,0,0.30)');
      moon.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = moon;
      dctx.fillRect(0, 0, CFG.W, CFG.H);
      const sources = game.lightSources();
      for (const s of sources) {
        const g = dctx.createRadialGradient(s.x, s.y, s.r * 0.15, s.x, s.y, s.r);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.7, 'rgba(0,0,0,0.85)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        dctx.fillStyle = g;
        dctx.beginPath();
        dctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        dctx.fill();
      }
      // The flare's cone cuts a wedge out of the dark while it burns.
      if (keeper.flareFlash > 0) {
        const a = keeper.angle;
        dctx.fillStyle = `rgba(0,0,0,${0.9 * keeper.flareFlash})`;
        dctx.beginPath();
        dctx.moveTo(keeper.x, keeper.y);
        dctx.arc(keeper.x, keeper.y, CFG.keeper.flareRange, a - CFG.keeper.flareArc, a + CFG.keeper.flareArc);
        dctx.closePath();
        dctx.fill();
      }
      ctx.drawImage(dark, 0, 0);

      // --- warm glows, added back over the dark.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const s of sources) {
        if (s.r < 40) continue;
        const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
        g.addColorStop(0, `rgba(255, 190, 90, ${0.16 * s.warm})`);
        g.addColorStop(1, 'rgba(255, 140, 40, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // The flare's beam: a warm cone along the aim while it burns, so
      // the one attack in the game reads as light, not as a number.
      if (keeper.flareFlash > 0) {
        const a = keeper.angle;
        const fg = ctx.createRadialGradient(keeper.x, keeper.y, 10, keeper.x, keeper.y, CFG.keeper.flareRange);
        fg.addColorStop(0, `rgba(255, 210, 110, ${0.3 * keeper.flareFlash})`);
        fg.addColorStop(1, 'rgba(255, 160, 60, 0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(keeper.x, keeper.y);
        ctx.arc(keeper.x, keeper.y, CFG.keeper.flareRange, a - CFG.keeper.flareArc, a + CFG.keeper.flareArc);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      game.feel.drawParticles(ctx);
      ctx.restore();

      // Screen-space work: HUD, banners, screens, vignette, flash.
      if (game.state === 'playing' || game.state === 'dawn' || game.state === 'paused') drawHUD(game);
      drawBanner(game);
      if (game.state === 'title') drawTitle(game);
      if (game.state === 'gameover') drawGameOver(game);
      if (game.state === 'victory') drawVictory(game);
      if (game.state === 'paused') drawPause();

      // Vignette: the night presses in at the edges.
      const vg = ctx.createRadialGradient(CFG.W / 2, CFG.H / 2, CFG.H * 0.42, CFG.W / 2, CFG.H / 2, CFG.H * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(2, 3, 10, 0.5)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, CFG.W, CFG.H);

      game.feel.drawFlash(ctx, CFG.W, CFG.H);
    },
  };
}
