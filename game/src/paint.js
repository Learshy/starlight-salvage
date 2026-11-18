// INKLIGHT — paint: the light the painter brushes onto the dark.
// A stroke is a polyline of points with a birth time. It fades as the Gloom
// reclaims it, and anything it touches burns. A gloom glob landing on a
// stroke erases the paint around it, cutting the stroke in two.

import { INK, COLORS } from './config.js';
import { clamp, pointSegmentDist } from './util.js';

export function createPaint() {
  const strokes = [];
  let current = null; // the stroke being painted right now
  let lastX = 0;
  let lastY = 0;

  function brightness(stroke, now) {
    return clamp(1 - (now - stroke.born) / INK.strokeLifetime, 0, 1);
  }

  return {
    strokes,

    // Begin a stroke at (x, y). Returns false when there is no ink to start.
    // `now` is the game's clock (seconds); strokes fade against it.
    begin(x, y, ink, now) {
      if (ink < 1) return false;
      current = { pts: [{ x, y }], born: now };
      lastX = x;
      lastY = y;
      strokes.push(current);
      return true;
    },

    // Extend the stroke toward (x, y), charging ink per pixel. Returns the
    // ink spent this call (0 when the brush did not move far enough).
    extend(x, y, ink) {
      if (!current) return 0;
      const dx = x - lastX;
      const dy = y - lastY;
      const d = Math.hypot(dx, dy);
      if (d < INK.minSegmentPx) return 0;
      const cost = d * INK.costPerPx;
      if (ink < cost) {
        // Out of ink mid-stroke: end it here.
        current = null;
        return 0;
      }
      current.pts.push({ x, y });
      lastX = x;
      lastY = y;
      return cost;
    },

    end() {
      current = null;
    },

    // A dash leaves a straight trail of light behind the painter.
    addTrail(x0, y0, x1, y1, now) {
      strokes.push({ pts: [{ x: x0, y: y0 }, { x: x1, y: y1 }], born: now });
    },

    // Age every stroke; drop the ones the Gloom has fully reclaimed.
    update(now) {
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (brightness(strokes[i], now) <= 0) strokes.splice(i, 1);
      }
      if (current && brightness(current, now) <= 0) current = null;
    },

    // How bright the light is at a shade's position: the strongest stroke
    // touching it, 0 when it stands in the dark.
    lightAt(x, y, radius, now) {
      let best = 0;
      for (const s of strokes) {
        const b = brightness(s, now);
        if (b <= 0.05) continue;
        const reach = INK.brushWidth / 2 + radius;
        for (let i = 0; i + 1 < s.pts.length; i++) {
          const p = s.pts[i];
          const q = s.pts[i + 1];
          if (pointSegmentDist(x, y, p.x, p.y, q.x, q.y) <= reach) {
            if (b > best) best = b;
            break;
          }
        }
      }
      return best;
    },

    // A gloom glob lands: erase every painted point near (x, y), and cut
    // every segment that passes near it, splitting strokes that are cut
    // in the middle. A segment is cut even when its endpoints are far
    // apart — a glob landing in the middle of a long straight stroke
    // still punches a hole in it.
    eraseAt(x, y, radius) {
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        const runs = [];
        let run = [];
        let prev = null;
        for (const p of s.pts) {
          const erased = Math.hypot(p.x - x, p.y - y) <= radius;
          const cut =
            prev !== null && pointSegmentDist(x, y, prev.x, prev.y, p.x, p.y) <= radius;
          if (erased || cut) {
            if (run.length >= 2) runs.push(run);
            run = [];
          }
          if (!erased) run.push(p);
          prev = p;
        }
        if (run.length >= 2) runs.push(run);
        if (runs.length === 0) {
          strokes.splice(i, 1);
          if (current === s) current = null;
        } else if (runs.length === 1 && runs[0].length === s.pts.length) {
          // Untouched.
        } else {
          // Replace the cut stroke with its surviving runs.
          strokes.splice(i, 1, ...runs.map((pts) => ({ pts, born: s.born })));
          if (current === s) current = null;
        }
      }
    },

    clear() {
      strokes.length = 0;
      current = null;
    },

    get color() {
      return COLORS.paintGold;
    },
  };
}
