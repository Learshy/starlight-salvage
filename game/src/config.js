// Starlight Salvage — tuning constants and palette.
// One place for every number the game balances on, so a tweak never
// means hunting through the world or the renderer.
export const VIEW = { width: 1280, height: 800 };

export const PALETTE = {
  spaceTop: '#070b1e',
  spaceBottom: '#0d1330',
  nebulaA: '#1b2a5e',
  nebulaB: '#3d1f5e',
  nebulaC: '#0e3a4a',
  star: '#dfe8ff',
  hull: '#9fb4d8',
  shipBody: '#e8eef7',
  shipTrim: '#ffb454',
  shipGlow: '#7fd4ff',
  bullet: '#ffe08a',
  rock: '#8a7f72',
  rockDark: '#5d5348',
  darter: '#ff6b81',
  mine: '#c792ff',
  shard: '#7dffd4',
  repair: '#8aff7d',
  text: '#eef3ff',
  textDim: '#9aa7c7',
  danger: '#ff5d5d',
  gold: '#ffcf5c',
  panel: 'rgba(10, 16, 38, 0.86)',
  panelLine: '#3a4a7a',
};

export const SHIP = {
  radius: 16,
  accel: 1500,
  maxSpeed: 340,
  drag: 0.92,
  turnRate: 9,
  hull: 100,
  fireInterval: 0.16,
  bulletSpeed: 720,
  bulletDamage: 1,
  bulletLife: 0.9,
  invulnTime: 1.2,
};

export const WAVES = {
  total: 10,
  // Rocks, darters and mines spawned across a wave, by wave number (1-based).
  rocks: (n) => 4 + 2 * n,
  darters: (n) => (n >= 2 ? n : 0),
  mines: (n) => (n >= 3 ? n - 1 : 0),
  spawnInterval: (n) => Math.max(0.35, 1.1 - n * 0.07),
};

export const SCORE = {
  rock: 50,
  rockSmall: 25,
  darter: 100,
  mine: 75,
  shard: 25,
  comboWindow: 3,
  comboMax: 5,
};

export const UPGRADE_POOL = [
  { id: 'twin', name: 'Twin Cannons', desc: 'Fire an extra bullet in a spread.', max: 2 },
  { id: 'rapid', name: 'Rapid Cycler', desc: 'Shoot 25% faster.', max: 3 },
  { id: 'heavy', name: 'Heavy Rounds', desc: '+1 bullet damage.', max: 3 },
  { id: 'hull', name: 'Reinforced Hull', desc: '+25 max hull and repair 25.', max: 3 },
  { id: 'thrusters', name: 'Ion Thrusters', desc: 'Fly 20% faster.', max: 3 },
  { id: 'magnet', name: 'Magnet Coil', desc: 'Pull salvage in from far away.', max: 2 },
  { id: 'pierce', name: 'Piercing Rounds', desc: 'Bullets pass through one extra rock.', max: 2 },
  { id: 'scanner', name: 'Salvage Scanner', desc: 'Salvage shards are worth +50%.', max: 2 },
];
