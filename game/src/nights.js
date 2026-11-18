// INKLIGHT — the seven nights: the campaign.
// A night is a roster of shades dealt out over time. When the roster is
// spent and the last shade is banished, dawn breaks: the painter heals,
// the ink refills, and the next night begins. After the Seventh Night the
// sun returns and the game is won.

import { NIGHTS, SPAWN } from './config.js';

export function createNights(rng) {
  let nightIndex = 0;
  let queue = [];
  let spawnTimer = 0;
  let cleared = false;

  function buildQueue(n) {
    const roster = NIGHTS[n].roster;
    const list = [];
    for (const [type, count] of Object.entries(roster)) {
      for (let i = 0; i < count; i++) list.push(type);
    }
    // Shuffle so the night is not one long line of the same shade.
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  return {
    get nightIndex() {
      return nightIndex;
    },
    get night() {
      return NIGHTS[nightIndex];
    },
    get totalNights() {
      return NIGHTS.length;
    },
    // Shades still to spawn plus shades still alive.
    remaining(queueAlive, aliveCount) {
      return queue.length + aliveCount;
    },
    get queueLeft() {
      return queue.length;
    },

    startNight(n) {
      nightIndex = n;
      queue = buildQueue(n);
      spawnTimer = 0.8;
      cleared = false;
    },

    // Deal shades out while the roster lasts. Returns 'cleared' the moment
    // the roster is spent and nothing is alive, else 'fighting'.
    update(dt, aliveCount, spawnOne) {
      if (cleared) return 'cleared';
      if (queue.length > 0) {
        spawnTimer -= dt;
        const cap = SPAWN.maxAlive + SPAWN.maxAlivePerNight * nightIndex;
        if (spawnTimer <= 0 && aliveCount < cap) {
          spawnTimer = SPAWN.interval;
          spawnOne(queue.shift());
        }
      } else if (aliveCount === 0) {
        cleared = true;
        return 'cleared';
      }
      return 'fighting';
    },

    get isLastNight() {
      return nightIndex >= NIGHTS.length - 1;
    },
  };
}
