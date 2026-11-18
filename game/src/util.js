// INKLIGHT — small helpers: a seeded random generator and vector math.
// The seeded generator is what makes screenshots and the self-test
// deterministic: the same seed always deals the same night.

// mulberry32: a tiny, fast seeded PRNG with a full 32-bit period.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

// Distance from point (px, py) to the segment (ax, ay)-(bx, by).
export function pointSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = clamp(t, 0, 1);
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt(dist2(px, py, cx, cy));
}

// Pick a weighted random entry from [[value, weight], ...] using rng().
export function weightedPick(rng, entries) {
  let total = 0;
  for (const [, w] of entries) total += w;
  let roll = rng() * total;
  for (const [v, w] of entries) {
    roll -= w;
    if (roll <= 0) return v;
  }
  return entries[entries.length - 1][0];
}

// Format seconds as m:ss for the HUD and the end screens.
export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}
