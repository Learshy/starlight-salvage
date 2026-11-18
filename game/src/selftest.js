// INKLIGHT — self-test: the game proves itself before anyone plays it.
// Run with ?selftest=1. Every check builds fresh objects and drives them
// through the real update functions, so a pass means the loop works —
// paint charges ink, light burns shades, nights clear, hits hurt once,
// globs erase paint, and the same seed always deals the same night.

import { mulberry32 } from './util.js';
import { createPaint } from './paint.js';
import { createPainter } from './painter.js';
import { createShades } from './shades.js';
import { createNights } from './nights.js';
import { createParticles } from './particles.js';
import { INK } from './config.js';

// A silent stand-in for the audio system: the test has no user gesture.
const silentAudio = new Proxy(
  {},
  {
    get() {
      return () => {};
    },
  },
);

function tickShades(shades, painter, paint, particles, seconds, now) {
  const dt = 1 / 60;
  let t = now;
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    t += dt;
    shades.update(dt, t, painter, paint, particles, silentAudio, () => {});
  }
  return t;
}

export function runSelfTest() {
  const results = [];
  function check(name, fn) {
    try {
      const detail = fn();
      results.push({ name, pass: true, detail: detail || '' });
    } catch (e) {
      results.push({ name, pass: false, detail: String(e.message || e) });
    }
  }
  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  check('paint adds points and charges ink', () => {
    const paint = createPaint();
    const inkBefore = 100;
    assert(paint.begin(100, 100, inkBefore, 0), 'stroke should begin with ink');
    const spent = paint.extend(200, 100, inkBefore);
    assert(spent > 0, 'extending 100px should cost ink');
    assert(paint.strokes[0].pts.length >= 2, 'stroke should hold its points');
    return `spent ${spent.toFixed(2)} ink over 100px`;
  });

  check('light burns a shade standing on it', () => {
    const paint = createPaint();
    const rng = mulberry32(7);
    const shades = createShades(rng);
    const painter = createPainter();
    painter.x = 900;
    painter.y = 600;
    const particles = createParticles();
    paint.begin(300, 300, 100, 0);
    paint.extend(500, 300, 100);
    shades.spawn('crawler', 400, 300);
    const s = shades.shades[0];
    const hpBefore = s.hp;
    tickShades(shades, painter, paint, particles, 1, 0);
    assert(s.hp < hpBefore, `hp should fall in the light (${hpBefore} -> ${s.hp})`);
    return `crawler hp ${hpBefore} -> ${s.hp.toFixed(1)} in 1s`;
  });

  check('a shade dies after long enough in the light', () => {
    const paint = createPaint();
    const rng = mulberry32(7);
    const shades = createShades(rng);
    const painter = createPainter();
    painter.x = 900;
    painter.y = 600;
    const particles = createParticles();
    paint.begin(300, 300, 100, 0);
    paint.extend(600, 300, 100);
    shades.spawn('crawler', 450, 300);
    let banished = 0;
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.round(3 / dt); i++) {
      t += dt;
      shades.update(dt, t, painter, paint, particles, silentAudio, () => banished++);
    }
    assert(banished === 1, `crawler should be banished, got ${banished}`);
    assert(shades.aliveCount === 0, 'no shades should remain');
    return 'crawler banished in the light';
  });

  check('night one deals six crawlers and clears when they fall', () => {
    const rng = mulberry32(11);
    const nights = createNights(rng);
    const shades = createShades(rng);
    const painter = createPainter();
    painter.x = 900;
    painter.y = 600;
    const paint = createPaint();
    const particles = createParticles();
    nights.startNight(0);
    assert(nights.queueLeft === 6, `night one roster should be 6, got ${nights.queueLeft}`);
    // Deal the whole roster out. The spawn cap holds back new shades while
    // the field is full, so banish each one as it arrives — otherwise the
    // queue can never drain and this loop would never end.
    let guard = 0;
    while (nights.queueLeft > 0) {
      assert(++guard < 5000, 'night one roster should drain');
      nights.update(0.05, shades.aliveCount, (type) => shades.spawn(type));
      for (const s of [...shades.shades]) s.hp = 0;
      shades.update(0.05, 0.1, painter, paint, particles, silentAudio, () => {});
    }
    assert(shades.aliveCount === 0, `no shades should remain, got ${shades.aliveCount}`);
    const state = nights.update(0.05, shades.aliveCount, () => {});
    assert(state === 'cleared', `night should clear, got ${state}`);
    return '6 crawlers dealt, banished, night cleared';
  });

  check('a hit hurts once, then mercy frames hold', () => {
    const painter = createPainter();
    painter.x = 640;
    painter.y = 360;
    const hpBefore = painter.hp;
    assert(painter.takeHit(1, silentAudio), 'first hit should land');
    assert(painter.hp === hpBefore - 1, 'hp should fall by 1');
    assert(!painter.takeHit(1, silentAudio), 'second hit inside mercy frames should not land');
    assert(painter.hp === hpBefore - 1, 'hp should not fall twice');
    return `hp ${hpBefore} -> ${painter.hp}, mercy frames held`;
  });

  check('a gloom glob erases the paint it lands on', () => {
    const paint = createPaint();
    paint.begin(300, 300, 100, 0);
    paint.extend(600, 300, 100);
    const before = paint.strokes[0].pts.length;
    paint.eraseAt(450, 300, 46);
    const after = paint.strokes.reduce((n, s) => n + s.pts.length, 0);
    assert(after < before, `paint should be erased (${before} -> ${after} points)`);
    return `${before} -> ${after} points after one glob`;
  });

  check('an ember refills the inkwell', () => {
    const painter = createPainter();
    painter.ink = 20;
    painter.collectEmber(silentAudio);
    assert(painter.ink === 20 + INK.emberRefill, `ink should rise by ${INK.emberRefill}, got ${painter.ink}`);
    return `ink 20 -> ${painter.ink}`;
  });

  check('the same seed always deals the same night', () => {
    const a = createNights(mulberry32(99));
    const b = createNights(mulberry32(99));
    a.startNight(3);
    b.startNight(3);
    const qa = [];
    const qb = [];
    while (a.queueLeft > 0) a.update(0.01, 0, (t) => qa.push(t));
    while (b.queueLeft > 0) b.update(0.01, 0, (t) => qb.push(t));
    assert(qa.join() === qb.join(), 'two nights from seed 99 should match');
    return `night four order identical (${qa.length} shades)`;
  });

  const passed = results.filter((r) => r.pass).length;
  return { ok: passed === results.length, passed, total: results.length, results };
}
