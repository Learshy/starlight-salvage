// Seeded randomness. Every roll the game makes — spawns, wobble, pitch
// variance, decor placement — goes through one of these, never Math.random,
// so a seeded run (screenshots, selftest) replays exactly.

export function createRng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      // mulberry32
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(lo, hi) {
      return lo + this.next() * (hi - lo);
    },
    int(lo, hi) {
      return Math.floor(this.range(lo, hi + 1));
    },
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
    chance(p) {
      return this.next() < p;
    },
  };
}
