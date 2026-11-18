// INKLIGHT — shades: the Gloom's creatures, and the globs they spit.
// Every shade crawls toward the painter. Light burns them; the dark is
// theirs. A splitter bursts into two crawlers when it dies, and the Herald
// of the Seventh Night calls more shades to its side.

import { SHADE_TYPES, GLOB, SPAWN, INK, VIEW_W, VIEW_H } from './config.js';
import { clamp } from './util.js';

export function createShades(rng) {
  const shades = [];
  const globs = [];
  let heraldTimer = 0;

  function spawnPoint() {
    const m = SPAWN.edgeMargin;
    const side = Math.floor(rng() * 4);
    if (side === 0) return { x: m + rng() * (VIEW_W - 2 * m), y: m };
    if (side === 1) return { x: m + rng() * (VIEW_W - 2 * m), y: VIEW_H - m };
    if (side === 2) return { x: m, y: m + rng() * (VIEW_H - 2 * m) };
    return { x: VIEW_W - m, y: m + rng() * (VIEW_H - 2 * m) };
  }

  function spawn(type, x, y) {
    const t = SHADE_TYPES[type];
    const p = x === undefined ? spawnPoint() : { x, y };
    shades.push({
      type,
      x: p.x,
      y: p.y,
      hp: t.hp,
      maxHp: t.hp,
      radius: t.radius,
      speed: t.speed,
      score: t.score,
      contact: t.contact,
      ranged: t.ranged,
      shootTimer: 1.2 + rng() * 1.5,
      wobble: rng() * Math.PI * 2,
      born: 0,
      burnFx: 0,
    });
  }

  return {
    shades,
    globs,
    spawn,

    clear() {
      shades.length = 0;
      globs.length = 0;
      heraldTimer = 0;
    },

    get aliveCount() {
      return shades.length;
    },

    update(dt, now, painter, paint, particles, audio, onBanished) {
      // --- shades ----------------------------------------------------------
      for (let i = shades.length - 1; i >= 0; i--) {
        const s = shades[i];
        s.born += dt;
        const dx = painter.x - s.x;
        const dy = painter.y - s.y;
        const d = Math.hypot(dx, dy) || 1;
        const ux = dx / d;
        const uy = dy / d;

        // Movement: crawlers and splitters walk straight at the painter;
        // skitters zigzag; spitters keep their distance and strafe.
        let mx = ux;
        let my = uy;
        if (s.type === 'skitter') {
          const w = Math.sin(now * 6 + s.wobble) * 0.7;
          mx = ux - uy * w;
          my = uy + ux * w;
          const l = Math.hypot(mx, my) || 1;
          mx /= l;
          my /= l;
        } else if (s.type === 'spitter') {
          if (d < 230) {
            mx = -ux;
            my = -uy;
          } else if (d < 300) {
            mx = -uy * 0.6;
            my = ux * 0.6;
          }
        }
        // Shades fade in for a moment after spawning, then move.
        const fadeIn = clamp(s.born / 0.5, 0, 1);
        s.x += mx * s.speed * fadeIn * dt;
        s.y += my * s.speed * fadeIn * dt;
        s.x = clamp(s.x, s.radius, VIEW_W - s.radius);
        s.y = clamp(s.y, s.radius, VIEW_H - s.radius);

        // The light burns: any stroke touching the shade hurts it, harder
        // where the paint is brightest.
        const light = paint.lightAt(s.x, s.y, s.radius, now);
        if (light > 0.05) {
          s.hp -= INK.burnDps * (0.4 + 0.6 * light) * dt;
          s.burnFx = 0.12;
          if (Math.random() < dt * 14) {
            particles.burst(s.x, s.y, '#ffb347', 2, 60);
          }
        }
        if (s.burnFx > 0) s.burnFx -= dt;

        // Ranged shades spit gloom globs at the painter.
        if (s.ranged && d < 540) {
          s.shootTimer -= dt;
          if (s.shootTimer <= 0) {
            s.shootTimer = s.type === 'herald' ? GLOB.heraldShootInterval : GLOB.shootInterval;
            globs.push({
              x: s.x,
              y: s.y,
              vx: ux * GLOB.speed,
              vy: uy * GLOB.speed,
              radius: GLOB.radius,
            });
            audio.spit();
          }
        }

        // Touching the painter hurts the painter, and knocks the shade back.
        if (d < s.radius + 14 + 2) {
          if (painter.takeHit(s.contact, audio)) {
            s.x -= ux * 26;
            s.y -= uy * 26;
            particles.burst(painter.x, painter.y, '#ff4d6d', 10, 160);
          }
        }

        // Death: banished. A splitter bursts into two crawlers.
        if (s.hp <= 0) {
          shades.splice(i, 1);
          particles.burst(s.x, s.y, '#ffd166', s.type === 'herald' ? 26 : 12, 190);
          particles.burst(s.x, s.y, '#ff9f1c', 6, 120);
          audio.burn();
          onBanished(s);
          if (s.type === 'splitter') {
            spawn('crawler', clamp(s.x - 18, 16, VIEW_W - 16), clamp(s.y - 10, 16, VIEW_H - 16));
            spawn('crawler', clamp(s.x + 18, 16, VIEW_W - 16), clamp(s.y + 10, 16, VIEW_H - 16));
            audio.split();
          }
        }
      }

      // --- the Herald calls more shades ------------------------------------
      const herald = shades.find((s) => s.type === 'herald');
      if (herald) {
        heraldTimer -= dt;
        if (heraldTimer <= 0 && shades.length < 9) {
          heraldTimer = 4;
          spawn('crawler');
        }
      } else {
        heraldTimer = 0;
      }

      // --- gloom globs -------------------------------------------------------
      for (let i = globs.length - 1; i >= 0; i--) {
        const g = globs[i];
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        let dead = g.x < -20 || g.x > VIEW_W + 20 || g.y < -20 || g.y > VIEW_H + 20;
        // A glob that reaches the painter hurts them and erases the paint.
        if (!dead && Math.hypot(g.x - painter.x, g.y - painter.y) < g.radius + 14) {
          painter.takeHit(1, audio);
          paint.eraseAt(g.x, g.y, GLOB.eraseRadius);
          particles.burst(g.x, g.y, '#7b2fbe', 8, 120);
          dead = true;
        }
        // A glob that lands on paint is spent erasing it.
        if (!dead && paint.lightAt(g.x, g.y, g.radius, now) > 0.05) {
          paint.eraseAt(g.x, g.y, GLOB.eraseRadius);
          particles.burst(g.x, g.y, '#7b2fbe', 5, 90);
          dead = true;
        }
        if (dead) globs.splice(i, 1);
      }
    },
  };
}
