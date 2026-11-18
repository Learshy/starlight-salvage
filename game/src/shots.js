// INKLIGHT — shots: the four staged scenes the screenshots are taken from.
// Each shot sets the game to a fixed, readable state — title, mid-play,
// dawn, game over — so a screenshot always shows the game at its best.
// Nothing here is random: the same shot always builds the same scene.

import { INK } from './config.js';

// Paint a fixed shape: a spiral, a wall, a circle — the brushwork a player
// would actually leave behind while fighting.
function paintSpiral(g, cx, cy) {
  const pts = [];
  for (let a = 0; a <= Math.PI * 5; a += 0.35) {
    const r = 12 + a * 9;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.85 });
  }
  g.paint.strokes.push({ pts, born: g.now - 2 });
}

function paintWall(g, x0, y0, x1, y1) {
  const pts = [];
  for (let t = 0; t <= 1.0001; t += 0.1) {
    pts.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t + Math.sin(t * 9) * 6 });
  }
  g.paint.strokes.push({ pts, born: g.now - 4 });
}

function paintRing(g, cx, cy, r) {
  const pts = [];
  for (let a = 0; a <= Math.PI * 2.001; a += 0.22) {
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  g.paint.strokes.push({ pts, born: g.now - 1 });
}

function placeShade(g, type, x, y) {
  g.shades.spawn(type, x, y);
  const s = g.shades.shades[g.shades.shades.length - 1];
  s.born = 1; // fully faded in
  return s;
}

export function applyShot(g, name) {
  // A clean field to stage on.
  g.paint.clear();
  g.shades.clear();
  g.particles.clear();
  g.embers.length = 0;
  g.banner = null;

  if (name === 'start') {
    g.mode = 'title';
    g.night = 0;
    g.score = 0;
    g.time = 0;
    g.painter.reset();
    g.painter.x = 640;
    g.painter.y = 470;
    paintRing(g, 640, 470, 120);
    paintWall(g, 180, 620, 520, 560);
    paintWall(g, 780, 560, 1100, 620);
    placeShade(g, 'crawler', 300, 220);
    placeShade(g, 'skitter', 980, 200);
    placeShade(g, 'spitter', 1060, 420);
    return 'start';
  }

  if (name === 'play') {
    g.mode = 'playing';
    g.night = 1; // Second Night
    g.nights.startNight(1);
    g.score = 340;
    g.time = 74;
    g.stats.banished = 14;
    g.stats.embers = 3;
    g.painter.reset();
    g.painter.x = 640;
    g.painter.y = 400;
    g.painter.ink = 62;
    g.painter.hp = 3;
    // A painter mid-fight: a spiral at their feet, a wall holding the left,
    // a ring around an ember, and shades closing in from every side.
    paintSpiral(g, 640, 400);
    paintWall(g, 180, 180, 420, 320);
    paintRing(g, 900, 520, 70);
    paintWall(g, 950, 140, 1150, 260);
    placeShade(g, 'crawler', 300, 300);
    placeShade(g, 'crawler', 520, 560);
    placeShade(g, 'skitter', 820, 300);
    placeShade(g, 'skitter', 1050, 480);
    placeShade(g, 'spitter', 1120, 180);
    placeShade(g, 'splitter', 220, 480);
    // Two embers burning on the field, one of them inside its ring.
    g.embers.push({ x: 900, y: 520, phase: 0.4 });
    g.embers.push({ x: 380, y: 170, phase: 2.1 });
    g.particles.burst(640, 400, '#ffd166', 8, 60);
    return 'play';
  }

  if (name === 'night') {
    g.mode = 'nightclear';
    g.night = 2; // Third Night just cleared
    g.lastBonus = 300;
    g.score = 890;
    g.time = 188;
    g.stats.banished = 31;
    g.stats.embers = 6;
    g.painter.reset();
    g.painter.x = 640;
    g.painter.y = 430;
    g.painter.ink = INK.max;
    g.painter.hp = 3;
    paintRing(g, 640, 430, 130);
    paintWall(g, 200, 600, 500, 540);
    paintWall(g, 800, 540, 1080, 600);
    g.particles.dawnMotes(640, 300, 40);
    return 'night';
  }

  if (name === 'end') {
    g.mode = 'gameover';
    g.night = 3; // Fourth Night
    g.score = 1240;
    g.time = 245;
    g.stats.banished = 47;
    g.stats.embers = 9;
    g.stats.nightsCleared = 3; // three nights survived before the fall
    g.painter.reset();
    g.painter.x = 640;
    g.painter.y = 400;
    g.painter.hp = 0;
    paintWall(g, 300, 250, 560, 320);
    paintRing(g, 900, 480, 80);
    placeShade(g, 'crawler', 520, 380);
    placeShade(g, 'crawler', 700, 470);
    placeShade(g, 'skitter', 820, 300);
    placeShade(g, 'spitter', 1080, 360);
    return 'end';
  }

  return null;
}
