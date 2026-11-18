// INKLIGHT — tuning constants and the seven-night campaign.
// One place for every number the game balances on, so a night's difficulty,
// a shade's speed or the price of paint can be tuned without touching logic.

// The playfield is a fixed logical canvas. The page scales it to fit the window.
export const VIEW_W = 1280;
export const VIEW_H = 720;

// --- the painter -----------------------------------------------------------
export const PAINTER = {
  radius: 14,
  speed: 265, // px per second
  maxHp: 3,
  dashSpeed: 720, // px per second while dashing
  dashTime: 0.16, // seconds a dash lasts
  dashCooldown: 1.1, // seconds before the next dash
  dashInkCost: 6,
  invulnTime: 1.0, // seconds of mercy after taking a hit
  pickupRadius: 30, // embers are collected this close
};

// --- ink and paint ---------------------------------------------------------
export const INK = {
  max: 100,
  start: 100,
  regenPerSec: 2.5,
  costPerPx: 0.085, // ink per pixel of stroke painted
  emberRefill: 25, // ink an ember gives
  brushWidth: 11, // px, the stroke's painted width
  strokeLifetime: 14, // seconds before a stroke has fully faded
  burnDps: 70, // damage per second a shade takes while touching light
  minSegmentPx: 6, // a new point is added after this much mouse travel
};

// --- shades ----------------------------------------------------------------
// hp: health. speed: px/s. radius: px. score: points for banishing one.
// contact: damage dealt to the painter on touch. ranged: shoots globs.
export const SHADE_TYPES = {
  crawler: { hp: 30, speed: 56, radius: 16, score: 10, contact: 1, ranged: false },
  skitter: { hp: 20, speed: 132, radius: 10, score: 15, contact: 1, ranged: false },
  spitter: { hp: 42, speed: 46, radius: 15, score: 25, contact: 1, ranged: true },
  splitter: { hp: 52, speed: 42, radius: 20, score: 30, contact: 1, ranged: false },
  herald: { hp: 620, speed: 36, radius: 34, score: 500, contact: 2, ranged: true },
};

export const GLOB = {
  speed: 185, // px/s a gloom glob flies
  radius: 7,
  shootInterval: 2.6, // seconds between a spitter's shots
  heraldShootInterval: 1.7,
  eraseRadius: 46, // paint erased where a glob lands
};

// --- the seven nights ------------------------------------------------------
// Each night is a roster: how many of each shade the Gloom sends.
// The night ends when every shade on the roster has been banished.
export const NIGHTS = [
  { name: 'First Night', roster: { crawler: 6 } },
  { name: 'Second Night', roster: { crawler: 8, skitter: 3 } },
  { name: 'Third Night', roster: { crawler: 10, skitter: 5, spitter: 2 } },
  { name: 'Fourth Night', roster: { crawler: 12, skitter: 6, spitter: 3, splitter: 2 } },
  { name: 'Fifth Night', roster: { crawler: 14, skitter: 8, spitter: 4, splitter: 3 } },
  { name: 'Sixth Night', roster: { crawler: 16, skitter: 10, spitter: 5, splitter: 4 } },
  { name: 'Seventh Night', roster: { crawler: 10, skitter: 6, spitter: 3, splitter: 2, herald: 1 } },
];

export const SPAWN = {
  interval: 1.15, // seconds between spawns while the roster still has shades
  maxAlive: 4, // base cap on shades alive at once; grows with the night
  maxAlivePerNight: 1, // +1 alive per night after the first
  edgeMargin: 24, // shades spawn this far inside the playfield edge
};

export const EMBER = {
  spawnInterval: 6, // seconds between ember spawns
  maxOnField: 4,
  score: 5,
  driftSpeed: 12, // px/s, embers wander slowly
};

// --- scoring ---------------------------------------------------------------
export const SCORE = {
  nightClearBonus: 100, // times the night number, on dawn
  winBonus: 1000,
};

// --- palette ----------------------------------------------------------------
export const COLORS = {
  bgTop: '#0b0b1e',
  bgBottom: '#04040c',
  paintGold: '#ffc94d',
  paintCore: '#fff3c4',
  paintCyan: '#7fe7ff',
  gloom: '#1a1030',
  shadeEye: '#ff4d6d',
  shadeEye2: '#c77dff',
  ember: '#ffd166',
  painter: '#fff8e1',
  hudText: '#f5eeda',
  hudDim: '#9a94b8',
  dawn: '#ffe9a8',
};
