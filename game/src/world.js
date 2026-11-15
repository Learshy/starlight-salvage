// Starlight Salvage — the world: ship, rocks, darters, mines, bullets,
// pickups, particles, waves, upgrades, score and combo. No drawing here;
// render.js reads this state and draws it.
import { PALETTE, SHIP, WAVES, SCORE, UPGRADE_POOL } from './config.js';
import { mulberry32, pickDistinct, range, angleTo } from './random.js';

export function createWorld(seed) {
  const rng = mulberry32(seed);
  const world = {
    rng,
    seed,
    time: 0,
    state: 'title', // title | play | upgrade | victory | defeat | paused
    wave: 0,
    score: 0,
    salvage: 0,
    combo: 1,
    comboTimer: 0,
    kills: 0,
    shotsFired: 0,
    shake: 0,
    spawnQueue: [],
    spawnTimer: 0,
    toSpawn: 0,
    choices: [],
    choiceIndex: 0,
    levels: {},
    message: '',
    messageTimer: 0,
    ship: freshShip(),
    bullets: [],
    rocks: [],
    darters: [],
    mines: [],
    pickups: [],
    particles: [],
    floats: [],
    stars: [],
    nebulae: [],
  };
  for (let i = 0; i < 130; i++) {
    world.stars.push({
      x: rng() * 1280,
      y: rng() * 800,
      r: range(rng, 0.5, 2.2),
      tw: range(rng, 0, Math.PI * 2),
      sp: range(rng, 0.5, 2),
    });
  }
  for (let i = 0; i < 5; i++) {
    world.nebulae.push({
      x: rng() * 1280,
      y: rng() * 800,
      r: range(rng, 180, 380),
      color: [PALETTE.nebulaA, PALETTE.nebulaB, PALETTE.nebulaC][i % 3],
    });
  }
  return world;
}

function freshShip() {
  return {
    x: 640,
    y: 400,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hull: SHIP.hull,
    maxHull: SHIP.hull,
    fireCd: 0,
    invuln: 0,
    thrust: 0,
    spread: 1,
    damage: SHIP.bulletDamage,
    fireRate: 1,
    speedMul: 1,
    magnet: 90,
    pierce: 0,
    scanner: 1,
  };
}

export function startRun(world) {
  world.ship = freshShip();
  world.bullets = [];
  world.rocks = [];
  world.darters = [];
  world.mines = [];
  world.pickups = [];
  world.particles = [];
  world.floats = [];
  world.wave = 0;
  world.score = 0;
  world.salvage = 0;
  world.combo = 1;
  world.comboTimer = 0;
  world.kills = 0;
  world.shotsFired = 0;
  world.levels = {};
  world.state = 'play';
  nextWave(world);
}

export function nextWave(world) {
  world.wave += 1;
  const n = world.wave;
  const queue = [];
  for (let i = 0; i < WAVES.rocks(n); i++) queue.push('rock');
  for (let i = 0; i < WAVES.darters(n); i++) queue.push('darter');
  for (let i = 0; i < WAVES.mines(n); i++) queue.push('mine');
  // Shuffle the queue so the wave arrives mixed.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(world.rng() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  world.spawnQueue = queue;
  world.toSpawn = queue.length;
  world.spawnTimer = 0.5;
  setMessage(world, `WAVE ${n} / ${WAVES.total}`);
}

function setMessage(world, text) {
  world.message = text;
  world.messageTimer = 2.4;
}

function edgeSpawn(world) {
  const rng = world.rng;
  const side = Math.floor(rng() * 4);
  const m = 40;
  if (side === 0) return { x: range(rng, 0, 1280), y: -m };
  if (side === 1) return { x: 1280 + m, y: range(rng, 0, 800) };
  if (side === 2) return { x: range(rng, 0, 1280), y: 800 + m };
  return { x: -m, y: range(rng, 0, 800) };
}

function spawnRock(world, x, y, small) {
  const rng = world.rng;
  const speed = range(rng, 40, 90) + world.wave * 4;
  const a = rng() * Math.PI * 2;
  world.rocks.push({
    x,
    y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    r: small ? 14 : range(rng, 26, 44),
    rot: rng() * Math.PI * 2,
    rotV: range(rng, -1.2, 1.2),
    small: !!small,
    hp: small ? 1 : 3,
    verts: Array.from({ length: 9 }, () => range(rng, 0.75, 1.15)),
  });
}

function spawnDarter(world) {
  const p = edgeSpawn(world);
  world.darters.push({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    r: 15,
    hp: 2,
    speed: 150 + world.wave * 12,
    wobble: world.rng() * Math.PI * 2,
  });
}

function spawnMine(world) {
  const p = edgeSpawn(world);
  world.mines.push({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    r: 16,
    hp: 1,
    fuse: 0,
    armed: false,
  });
}

function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: range(world.rng, 0.3, 0.8),
      maxLife: 0.8,
      r: range(world.rng, 1.5, 3.5),
      color,
    });
  }
}

function addFloat(world, x, y, text, color) {
  world.floats.push({ x, y, text, color: color || PALETTE.text, life: 1.1 });
}

function dropPickup(world, x, y, kind) {
  const rng = world.rng;
  const a = rng() * Math.PI * 2;
  world.pickups.push({
    x,
    y,
    vx: Math.cos(a) * 40,
    vy: Math.sin(a) * 40,
    kind: kind || 'shard',
    r: 10,
    life: 12,
    bob: rng() * Math.PI * 2,
  });
}

function awardScore(world, base, x, y) {
  const pts = Math.round(base * world.combo);
  world.score += pts;
  world.kills += 1;
  world.combo = Math.min(SCORE.comboMax, world.combo + 0.25);
  world.comboTimer = SCORE.comboWindow;
  addFloat(world, x, y, `+${pts}`, PALETTE.gold);
}

function damageShip(world, amount, audio) {
  const ship = world.ship;
  if (ship.invuln > 0 || world.state !== 'play') return;
  ship.hull -= amount;
  ship.invuln = SHIP.invulnTime;
  world.combo = 1;
  world.shake = 14;
  burst(world, ship.x, ship.y, PALETTE.danger, 18, 220);
  audio.hurt();
  if (ship.hull <= 0) {
    ship.hull = 0;
    world.state = 'defeat';
    burst(world, ship.x, ship.y, PALETTE.shipGlow, 60, 320);
    burst(world, ship.x, ship.y, PALETTE.shipTrim, 40, 200);
    audio.defeat();
    audio.stopMusic();
  }
}

function killRock(world, rock, audio) {
  world.rocks.splice(world.rocks.indexOf(rock), 1);
  burst(world, rock.x, rock.y, PALETTE.rock, rock.small ? 10 : 22, 200);
  audio.boom(!rock.small);
  world.shake = Math.max(world.shake, rock.small ? 3 : 7);
  awardScore(world, rock.small ? SCORE.rockSmall : SCORE.rock, rock.x, rock.y);
  if (!rock.small) {
    spawnRock(world, rock.x, rock.y, true);
    spawnRock(world, rock.x, rock.y, true);
    if (world.rng() < 0.5) dropPickup(world, rock.x, rock.y, 'shard');
  } else if (world.rng() < 0.35) {
    dropPickup(world, rock.x, rock.y, 'shard');
  }
}

function killDarter(world, darter, audio) {
  world.darters.splice(world.darters.indexOf(darter), 1);
  burst(world, darter.x, darter.y, PALETTE.darter, 20, 240);
  audio.boom(false);
  awardScore(world, SCORE.darter, darter.x, darter.y);
  if (world.rng() < 0.7) dropPickup(world, darter.x, darter.y, 'shard');
}

function detonateMine(world, mine, audio) {
  world.mines.splice(world.mines.indexOf(mine), 1);
  burst(world, mine.x, mine.y, PALETTE.mine, 30, 280);
  audio.boom(true);
  world.shake = Math.max(world.shake, 9);
  awardScore(world, SCORE.mine, mine.x, mine.y);
  const ship = world.ship;
  const d = Math.hypot(ship.x - mine.x, ship.y - mine.y);
  if (d < 110) damageShip(world, 12, audio);
  if (world.rng() < 0.5) dropPickup(world, mine.x, mine.y, 'shard');
}

function fireBullets(world, audio) {
  const ship = world.ship;
  const n = ship.spread;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 0.14;
    const a = ship.angle + off;
    world.bullets.push({
      x: ship.x + Math.cos(a) * 22,
      y: ship.y + Math.sin(a) * 22,
      vx: Math.cos(a) * SHIP.bulletSpeed + ship.vx * 0.4,
      vy: Math.sin(a) * SHIP.bulletSpeed + ship.vy * 0.4,
      r: 4,
      life: SHIP.bulletLife,
      damage: ship.damage,
      pierce: ship.pierce,
    });
  }
  world.shotsFired += n;
  audio.shoot();
}

function applyUpgrade(world, choice) {
  const ship = world.ship;
  world.levels[choice.id] = (world.levels[choice.id] || 0) + 1;
  if (choice.id === 'twin') ship.spread = Math.min(3, ship.spread + 1);
  if (choice.id === 'rapid') ship.fireRate *= 1.25;
  if (choice.id === 'heavy') ship.damage += 1;
  if (choice.id === 'hull') {
    ship.maxHull += 25;
    ship.hull = Math.min(ship.maxHull, ship.hull + 25);
  }
  if (choice.id === 'thrusters') ship.speedMul *= 1.2;
  if (choice.id === 'magnet') ship.magnet *= 2.5;
  if (choice.id === 'pierce') ship.pierce += 1;
  if (choice.id === 'scanner') ship.scanner *= 1.5;
}

function offerUpgrades(world) {
  const available = UPGRADE_POOL.filter((u) => (world.levels[u.id] || 0) < u.max);
  world.choices = pickDistinct(world.rng, available.length ? available : UPGRADE_POOL, 3);
  world.choiceIndex = 0;
}

export function update(world, input, audio, dt) {
  world.time += dt;
  if (world.messageTimer > 0) world.messageTimer -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 30);
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 1;
  }
  for (const p of world.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const f of world.floats) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  world.floats = world.floats.filter((f) => f.life > 0);

  if (world.state !== 'play') return;
  const ship = world.ship;

  // --- steering: WASD / arrows move, mouse aims ---
  let ax = 0;
  let ay = 0;
  if (input.down('w') || input.down('ArrowUp')) ay -= 1;
  if (input.down('s') || input.down('ArrowDown')) ay += 1;
  if (input.down('a') || input.down('ArrowLeft')) ax -= 1;
  if (input.down('d') || input.down('ArrowRight')) ax += 1;
  if (ax !== 0 || ay !== 0) {
    const len = Math.hypot(ax, ay);
    ship.vx += (ax / len) * SHIP.accel * ship.speedMul * dt;
    ship.vy += (ay / len) * SHIP.accel * ship.speedMul * dt;
    ship.thrust = 1;
    if (world.rng() < 0.5) {
      world.particles.push({
        x: ship.x - Math.cos(ship.angle) * 18,
        y: ship.y - Math.sin(ship.angle) * 18,
        vx: -ship.vx * 0.1 + range(world.rng, -20, 20),
        vy: -ship.vy * 0.1 + range(world.rng, -20, 20),
        life: 0.35,
        maxLife: 0.35,
        r: 2,
        color: PALETTE.shipTrim,
      });
    }
  } else {
    ship.thrust = 0;
  }
  ship.vx *= Math.pow(SHIP.drag, dt * 60);
  ship.vy *= Math.pow(SHIP.drag, dt * 60);
  const sp = Math.hypot(ship.vx, ship.vy);
  const max = SHIP.maxSpeed * ship.speedMul;
  if (sp > max) {
    ship.vx = (ship.vx / sp) * max;
    ship.vy = (ship.vy / sp) * max;
  }
  ship.x = Math.max(20, Math.min(1260, ship.x + ship.vx * dt));
  ship.y = Math.max(20, Math.min(780, ship.y + ship.vy * dt));
  ship.angle = angleTo(ship.x, ship.y, input.mouseX, input.mouseY);
  if (ship.invuln > 0) ship.invuln -= dt;

  // --- firing ---
  ship.fireCd -= dt;
  if ((input.mouseDown || input.down('Space')) && ship.fireCd <= 0) {
    ship.fireCd = SHIP.fireInterval / ship.fireRate;
    fireBullets(world, audio);
  }

  // --- spawning ---
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = WAVES.spawnInterval(world.wave);
      const kind = world.spawnQueue.shift();
      const p = edgeSpawn(world);
      if (kind === 'rock') spawnRock(world, p.x, p.y, false);
      if (kind === 'darter') spawnDarter(world);
      if (kind === 'mine') spawnMine(world);
    }
  }

  // --- bullets ---
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  world.bullets = world.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < 1300 && b.y > -20 && b.y < 820);

  // --- rocks drift and spin ---
  for (const r of world.rocks) {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.rot += r.rotV * dt;
    if (r.x < -60) r.x = 1340;
    if (r.x > 1340) r.x = -60;
    if (r.y < -60) r.y = 860;
    if (r.y > 860) r.y = -60;
  }

  // --- darters chase, with a wobble ---
  for (const d of world.darters) {
    d.wobble += dt * 3;
    const a = angleTo(d.x, d.y, ship.x, ship.y) + Math.sin(d.wobble) * 0.5;
    d.vx += Math.cos(a) * d.speed * dt * 2;
    d.vy += Math.sin(a) * d.speed * dt * 2;
    const s = Math.hypot(d.vx, d.vy);
    if (s > d.speed) {
      d.vx = (d.vx / s) * d.speed;
      d.vy = (d.vy / s) * d.speed;
    }
    d.x += d.vx * dt;
    d.y += d.vy * dt;
  }

  // --- mines drift in and arm; they blow up when shot or touched ---
  for (const m of world.mines) {
    if (!m.armed) {
      const a = angleTo(m.x, m.y, 640, 400);
      m.vx += Math.cos(a) * 30 * dt;
      m.vy += Math.sin(a) * 30 * dt;
      if (m.x > 60 && m.x < 1220 && m.y > 60 && m.y < 740) m.armed = true;
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.fuse += dt;
  }

  // --- pickups drift and get magnet-pulled ---
  for (const p of world.pickups) {
    p.bob += dt * 4;
    p.life -= dt;
    const d = Math.hypot(ship.x - p.x, ship.y - p.y);
    if (d < ship.magnet) {
      const a = angleTo(p.x, p.y, ship.x, ship.y);
      const pull = 420 * (1 - d / ship.magnet);
      p.vx += Math.cos(a) * pull * dt;
      p.vy += Math.sin(a) * pull * dt;
    }
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  world.pickups = world.pickups.filter((p) => p.life > 0);

  // --- bullet hits ---
  for (const b of [...world.bullets]) {
    let spent = false;
    for (const r of [...world.rocks]) {
      if (Math.hypot(b.x - r.x, b.y - r.y) < r.r + b.r) {
        r.hp -= b.damage;
        burst(world, b.x, b.y, PALETTE.bullet, 4, 120);
        if (r.hp <= 0) killRock(world, r, audio);
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          spent = true;
        }
        break;
      }
    }
    if (spent) {
      world.bullets.splice(world.bullets.indexOf(b), 1);
      continue;
    }
    for (const d of [...world.darters]) {
      if (Math.hypot(b.x - d.x, b.y - d.y) < d.r + b.r) {
        d.hp -= b.damage;
        burst(world, b.x, b.y, PALETTE.darter, 4, 120);
        if (d.hp <= 0) killDarter(world, d, audio);
        if (b.pierce > 0) b.pierce -= 1;
        else spent = true;
        break;
      }
    }
    if (spent) {
      world.bullets.splice(world.bullets.indexOf(b), 1);
      continue;
    }
    for (const m of [...world.mines]) {
      if (Math.hypot(b.x - m.x, b.y - m.y) < m.r + b.r) {
        detonateMine(world, m, audio);
        spent = true;
        break;
      }
    }
    if (spent) world.bullets.splice(world.bullets.indexOf(b), 1);
  }

  // --- ship collisions ---
  for (const r of world.rocks) {
    if (Math.hypot(ship.x - r.x, ship.y - r.y) < r.r + SHIP.radius - 4) {
      damageShip(world, r.small ? 8 : 15, audio);
      const a = angleTo(r.x, r.y, ship.x, ship.y);
      ship.vx += Math.cos(a) * 260;
      ship.vy += Math.sin(a) * 260;
      break;
    }
  }
  if (world.state === 'play') {
    for (const d of world.darters) {
      if (Math.hypot(ship.x - d.x, ship.y - d.y) < d.r + SHIP.radius - 4) {
        damageShip(world, 12, audio);
        killDarter(world, d, audio);
        break;
      }
    }
  }
  if (world.state === 'play') {
    for (const m of [...world.mines]) {
      if (Math.hypot(ship.x - m.x, ship.y - m.y) < m.r + SHIP.radius - 2) {
        detonateMine(world, m, audio);
        break;
      }
    }
  }

  // --- pickups collected ---
  for (const p of [...world.pickups]) {
    if (Math.hypot(ship.x - p.x, ship.y - p.y) < SHIP.radius + p.r + 4) {
      world.pickups.splice(world.pickups.indexOf(p), 1);
      if (p.kind === 'shard') {
        const val = Math.round(SCORE.shard * ship.scanner);
        world.score += val;
        world.salvage += 1;
        addFloat(world, p.x, p.y, `+${val} salvage`, PALETTE.shard);
        audio.pickup();
      } else if (p.kind === 'repair') {
        ship.hull = Math.min(ship.maxHull, ship.hull + 30);
        addFloat(world, p.x, p.y, '+30 HULL', PALETTE.repair);
        audio.upgrade();
      }
    }
  }

  // --- wave cleared? ---
  if (
    world.spawnQueue.length === 0 &&
    world.rocks.length === 0 &&
    world.darters.length === 0 &&
    world.mines.length === 0
  ) {
    if (world.wave >= WAVES.total) {
      world.state = 'victory';
      audio.victory();
      audio.stopMusic();
    } else {
      world.state = 'upgrade';
      world.messageTimer = 0;
      offerUpgrades(world);
      audio.waveClear();
      if (world.rng() < 0.6) dropPickup(world, ship.x + 60, ship.y, 'repair');
    }
  }
}

// Choosing an upgrade card (1/2/3 keys or click) applies it and starts
// the next wave. Called by main.js while the state is 'upgrade'.
export function chooseUpgrade(world, index, audio) {
  const choice = world.choices[index];
  if (!choice) return;
  applyUpgrade(world, choice);
  audio.upgrade();
  world.state = 'play';
  nextWave(world);
}
