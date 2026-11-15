// Starlight Salvage — deterministic seeded randomness.
// Every random choice in the game flows through one of these, so a
// screenshot scene or a replay can be rebuilt exactly from its seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick k distinct items from an array, using the given rng.
export function pickDistinct(rng, items, k) {
  const copy = items.slice();
  const out = [];
  while (copy.length > 0 && out.length < k) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}
