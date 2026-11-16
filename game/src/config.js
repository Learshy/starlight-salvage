// EMBERKEEP tuning table: one place retunes the whole difficulty curve.
// Every number here is a design decision, not a magic constant scattered
// through the game. Night N runs 1..7; dawn between nights lasts DAWN_LEN.

export const CFG = {
  W: 1280,
  H: 720,

  NIGHTS: 7,
  NIGHT_LEN: 60, // seconds of darkness per night
  DAWN_LEN: 4, // seconds of dawn intermission between nights
  DAWN_FUEL_BONUS: 20,
  NIGHT_SCORE_BONUS: 250,

  island: { x: 640, y: 372, rx: 575, ry: 295 },

  keeper: {
    speed: 265, // top speed, world units / second
    accel: 2600, // acceleration toward the intended velocity
    radius: 14,
    hp: 100,
    fuel: 100, // also the lantern's oil; 0 fuel means the dark closes in
    lanternBase: 150, // light radius at full fuel
    lanternMin: 70, // light radius at empty fuel
    flareRange: 270,
    flareArc: 0.61, // half-angle of the flare cone, radians (~35 deg)
    flareDmg: 60,
    flareCost: 6,
    flareCd: 0.35, // seconds between flares
    burnDps: 20, // lingering burn a flare leaves on a shade
    burnTime: 1.5,
    relightCost: 12,
    relightRange: 54,
    pickupRange: 26,
    darkDrain: 4, // hp per second while fuel is 0 (the dark closes in)
    contactInvuln: 0.6, // seconds of grace after a mote hits
  },

  beacon: {
    x: 640,
    y: 372,
    integrity: 100,
    radius: 178, // its ring of light
    dps: 20, // shades standing in it burn
    hitDmg: 6, // integrity lost per brute blow
    hitInterval: 1.2, // seconds between brute blows on the beacon
  },

  // Six lamps on a ring around the beacon. Each burns its own fuel; when
  // it runs dry the lamp goes dark and the island gets smaller.
  lamps: [
    { x: 640, y: 167 },
    { x: 986, y: 268 },
    { x: 986, y: 476 },
    { x: 640, y: 577 },
    { x: 294, y: 476 },
    { x: 294, y: 268 },
  ],
  lamp: {
    radius: 132,
    dps: 15, // shades standing in lamplight burn
    fuelMax: 100,
    burnBase: 1.55, // fuel per second on night 1
    burnPerNight: 0.16, // extra burn per later night
    snuffDrain: 26, // fuel per second a creeper drains while hugging a lamp
  },

  // Shade kinds. Motes hunt the keeper, creepers snuff lamps, brutes
  // lumber for the beacon. Weights are per night, [mote, creeper, brute].
  shades: {
    mote: { hp: 20, r: 10, speed: 96, score: 10, embers: 1 },
    creeper: { hp: 48, r: 15, speed: 56, score: 15, embers: 2 },
    brute: { hp: 130, r: 24, speed: 33, score: 30, embers: 4 },
  },
  nightMix: [
    [0.7, 0.3, 0.0],
    [0.55, 0.4, 0.05],
    [0.45, 0.45, 0.1],
    [0.4, 0.45, 0.15],
    [0.35, 0.45, 0.2],
    [0.3, 0.45, 0.25],
    [0.25, 0.45, 0.3],
  ],

  spawn: {
    first: 3.5, // seconds into night 1 before the first shade
    intervalBase: 2.2, // seconds between spawns on night 1
    intervalMin: 0.85, // seconds between spawns on night 7
    maxAliveBase: 12,
    maxAlivePerNight: 2,
  },

  ember: { fuel: 6, score: 5, ttl: 12 },

  // Where shades crawl in from: eight points on the island's rim.
  spawnPoints: [
    { x: 120, y: 372 },
    { x: 240, y: 150 },
    { x: 640, y: 92 },
    { x: 1040, y: 150 },
    { x: 1160, y: 372 },
    { x: 1040, y: 594 },
    { x: 640, y: 652 },
    { x: 240, y: 594 },
  ],

  // Feel tuning (game-feel reference: trauma^2 shake, hitstop on heavy
  // contact only, feedback that never hides the next decision).
  feel: {
    traumaPickup: 0.12,
    traumaKill: 0.25,
    traumaHurt: 0.45,
    traumaBeaconHit: 0.6,
    traumaNight: 0.35,
    shakeMax: 14, // pixels at full trauma
    hitstopHurt: 0.07, // seconds
    hitstopKill: 0.03,
    hitstopBeacon: 0.09,
  },
};
