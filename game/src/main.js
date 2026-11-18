// INKLIGHT — main: the game loop and the state machine.
// Title -> playing -> (dawn) -> next night -> ... -> win or game over.
// The loop is a fixed requestAnimationFrame heartbeat; the clock (game.now)
// drives paint fade, shade wobble and banners, and freezes while paused.

import { VIEW_W, VIEW_H, INK, EMBER, SCORE, PAINTER } from './config.js';
import { mulberry32, clamp } from './util.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createPaint } from './paint.js';
import { createPainter } from './painter.js';
import { createShades } from './shades.js';
import { createNights } from './nights.js';
import { createParticles } from './particles.js';
import { draw } from './render.js';
import { applyShot } from './shots.js';
import { runSelfTest } from './selftest.js';

const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const shotParam = params.get('shot');
const selftestParam = params.get('selftest');
const framesParam = params.get('frames');
// ?frames=N renders N frames and then stops the loop, so a headless
// screenshot run can finish: a game that keeps requesting animation frames
// never lets the page go idle. Normal play never sets it.
let framesLeft = framesParam ? parseInt(framesParam, 10) || 1 : Infinity;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// The seed: from the URL for deterministic shots and tests, else the clock.
const seed = seedParam ? parseInt(seedParam, 10) || 1 : (Date.now() % 2147483647);
const rng = mulberry32(seed);

const input = createInput(canvas);
const audio = createAudio();

// The whole game, in one object the renderer reads.
const g = {
  mode: 'title',
  now: 0,
  time: 0,
  night: 0,
  score: 0,
  lastBonus: 0,
  banner: null,
  muted: false,
  stars: [],
  embers: [],
  emberTimer: 4,
  painting: false,
  paintSoundTimer: 0,
  stats: { banished: 0, embers: 0, nightsCleared: 0 },
  selftestResult: null,
  rng,
  painter: createPainter(),
  paint: createPaint(),
  shades: createShades(rng),
  nights: createNights(rng),
  particles: createParticles(),
};

// Faint stars, fixed by the seed so the backdrop never changes between runs.
for (let i = 0; i < 110; i++) {
  g.stars.push({
    x: rng() * VIEW_W,
    y: rng() * VIEW_H,
    r: 1 + rng() * 1.6,
    tw: rng() * Math.PI * 2,
  });
}

function setBanner(title, sub, seconds) {
  g.banner = { title, sub, until: g.now + seconds };
}

function startGame() {
  audio.unlock();
  g.score = 0;
  g.time = 0;
  g.lastBonus = 0;
  g.stats = { banished: 0, embers: 0, nightsCleared: 0 };
  g.painter.reset();
  g.paint.clear();
  g.shades.clear();
  g.particles.clear();
  g.embers.length = 0;
  g.emberTimer = 4;
  g.painting = false;
  g.nights.startNight(0);
  g.night = 0;
  g.mode = 'playing';
  setBanner('NIGHT 1', g.nights.night.name + ' — the Gloom stirs', 2.4);
}

function nextNight() {
  audio.unlock();
  g.paint.clear();
  g.shades.clear();
  g.embers.length = 0;
  g.emberTimer = 4;
  g.painting = false;
  g.nights.startNight(g.night + 1);
  g.night = g.nights.nightIndex;
  g.mode = 'playing';
  setBanner(`NIGHT ${g.night + 1}`, g.nights.night.name + ' — the Gloom stirs', 2.4);
}

function onBanished(shade) {
  g.score += shade.score;
  g.stats.banished += 1;
}

function spawnEmber() {
  // Not too close to the painter, not on top of a shade.
  for (let tries = 0; tries < 8; tries++) {
    const x = 60 + rng() * (VIEW_W - 120);
    const y = 80 + rng() * (VIEW_H - 160);
    if (Math.hypot(x - g.painter.x, y - g.painter.y) < 140) continue;
    const a = rng() * Math.PI * 2;
    g.embers.push({ x, y, phase: rng() * Math.PI * 2, vx: Math.cos(a) * EMBER.driftSpeed, vy: Math.sin(a) * EMBER.driftSpeed });
    return;
  }
}

function updatePlaying(dt) {
  g.time += dt;
  const p = g.painter;

  // --- painting: hold the mouse and the brush paints light ----------------
  if (input.mouse.down && p.ink >= 1) {
    if (!g.painting) {
      g.painting = g.paint.begin(input.mouse.x, input.mouse.y, p.ink, g.now);
    }
    if (g.painting) {
      const spent = g.paint.extend(input.mouse.x, input.mouse.y, p.ink);
      p.ink -= spent;
      g.paintSoundTimer -= dt;
      if (spent > 0 && g.paintSoundTimer <= 0) {
        g.paintSoundTimer = 0.09;
        audio.paint();
      }
      if (p.ink < 1) {
        g.paint.end();
        g.painting = false;
      }
    }
  } else if (g.painting) {
    g.paint.end();
    g.painting = false;
  }

  p.update(dt, input, g.paint, audio, g.now);
  g.paint.update(g.now);
  g.shades.update(dt, g.now, p, g.paint, g.particles, audio, onBanished);

  // --- embers: they drift, and the painter gathers them -------------------
  g.emberTimer -= dt;
  if (g.emberTimer <= 0 && g.embers.length < EMBER.maxOnField) {
    g.emberTimer = EMBER.spawnInterval;
    spawnEmber();
  }
  for (let i = g.embers.length - 1; i >= 0; i--) {
    const e = g.embers[i];
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.x < 30 || e.x > VIEW_W - 30) e.vx *= -1;
    if (e.y < 60 || e.y > VIEW_H - 30) e.vy *= -1;
    if (Math.hypot(e.x - p.x, e.y - p.y) < PAINTER.pickupRadius) {
      g.embers.splice(i, 1);
      p.collectEmber(audio);
      g.score += EMBER.score;
      g.stats.embers += 1;
      g.particles.burst(e.x, e.y, '#ffd166', 10, 130);
    }
  }

  g.particles.update(dt);

  // --- the night ends when its roster is spent and nothing is alive -------
  const nightState = g.nights.update(dt, g.shades.aliveCount, (type) => g.shades.spawn(type));
  if (nightState === 'cleared') {
    if (g.nights.isLastNight) {
      g.score += SCORE.winBonus;
      g.mode = 'win';
      audio.win();
      g.particles.dawnMotes(VIEW_W / 2, VIEW_H / 2, 70);
    } else {
      g.lastBonus = SCORE.nightClearBonus * (g.night + 1);
      g.score += g.lastBonus;
      g.stats.nightsCleared += 1;
      p.hp = Math.min(PAINTER.maxHp, p.hp + 1);
      p.ink = INK.max;
      g.mode = 'nightclear';
      audio.dawn();
      g.particles.dawnMotes(VIEW_W / 2, VIEW_H / 2, 50);
    }
    return;
  }

  // --- the painter falls ----------------------------------------------------
  if (!p.alive) {
    g.mode = 'gameover';
    audio.gameOver();
  }
}

function update(dt) {
  // Mute and pause are edge-triggered, so holding the key does not flutter.
  if (g.mode === 'playing') {
    updatePlaying(dt);
  } else if (g.mode === 'title') {
    g.particles.update(dt);
    // A few shades wander behind the title, for life.
    if (g.shades.aliveCount < 3 && Math.random() < dt * 0.25) {
      g.shades.spawn('crawler');
    }
    g.shades.update(dt, g.now, g.painter, g.paint, g.particles, audio, () => {});
    if (input.consumeAnyKey()) startGame();
  } else if (g.mode === 'nightclear') {
    g.particles.update(dt);
    if (input.consumeAnyKey()) nextNight();
  } else if (g.mode === 'gameover' || g.mode === 'win') {
    g.particles.update(dt);
    if (input.restartPressed() || input.consumeClick()) startGame();
  }
  // 'paused' freezes everything: the clock does not advance either.
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'm') {
    audio.unlock();
    g.muted = audio.toggleMute();
  }
  if (k === 'p') {
    if (g.mode === 'playing') g.mode = 'paused';
    else if (g.mode === 'paused') g.mode = 'playing';
  }
});

// --- boot -------------------------------------------------------------------
if (selftestParam === '1') {
  g.selftestResult = runSelfTest();
  console.log('INKLIGHT selftest:', JSON.stringify(g.selftestResult));
}
if (shotParam) {
  const applied = applyShot(g, shotParam);
  if (applied) console.log('INKLIGHT shot:', applied);
}

let last = 0;
function loop(t) {
  const dt = clamp((t - last) / 1000, 0, 0.05);
  last = t;
  if (g.mode !== 'paused') {
    g.now += dt;
    update(dt);
  }
  draw(ctx, g);
  if (--framesLeft > 0) requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
