// The Keeper: one person, one lantern. Movement has acceleration and
// a little glide so the verb lands with weight; the aim follows the
// mouse; the flare is the only attack and it spends fuel, so every shot
// is a decision. When fuel hits zero the lantern dies to a stub and the
// dark itself starts hurting — the fail spiral the fuel economy is for.

export function createKeeper(cfg, rng) {
  const k = cfg.keeper;
  return {
    x: cfg.beacon.x,
    y: cfg.beacon.y + 120,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hp: k.hp,
    fuel: k.fuel,
    flareCd: 0,
    invuln: 0,
    moving: false,
    stepT: 0,
    flareFlash: 0, // counts down after a flare; the renderer draws it

    lanternRadius() {
      // The light shrinks as the oil runs out: full fuel is a wide pool,
      // empty fuel is a stub of light around the Keeper's feet.
      const f = Math.max(0, this.fuel) / k.fuel;
      return k.lanternMin + (k.lanternBase - k.lanternMin) * f;
    },

    update(dt, game) {
      const input = game.input;
      const ax = input.axisX();
      const ay = input.axisY();
      const len = Math.hypot(ax, ay) || 1;
      const tx = (ax / len) * k.speed * (ax || ay ? 1 : 0);
      const ty = (ay / len) * k.speed * (ax || ay ? 1 : 0);
      // Accelerate toward the intended velocity; the glide is the feel.
      this.vx += (tx - this.vx) * Math.min(1, (k.accel / k.speed) * dt);
      this.vy += (ty - this.vy) * Math.min(1, (k.accel / k.speed) * dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // The island holds the Keeper: clamp to the ellipse, not a box.
      const isl = cfg.island;
      const dx = (this.x - isl.x) / isl.rx;
      const dy = (this.y - isl.y) / isl.ry;
      const d = Math.hypot(dx, dy);
      if (d > 0.96) {
        this.x = isl.x + (dx / d) * isl.rx * 0.96;
        this.y = isl.y + (dy / d) * isl.ry * 0.96;
        this.vx *= 0.4;
        this.vy *= 0.4;
      }
      this.moving = Math.hypot(this.vx, this.vy) > 30;
      if (this.moving) this.stepT += dt;

      this.angle = input.aimAngle(this.x, this.y);
      this.flareCd = Math.max(0, this.flareCd - dt);
      this.invuln = Math.max(0, this.invuln - dt);
      this.flareFlash = Math.max(0, this.flareFlash - dt * 3);

      // The dark closes in when the oil is gone.
      if (this.fuel <= 0) {
        this.hp -= k.darkDrain * dt;
        if (this.hp <= 0) game.lose('dark');
      }

      // Flare: a cone of light that burns everything in it and leaves a
      // lingering burn. It costs fuel, so it is a decision, not a reflex.
      if (input.flarePressed() && this.flareCd <= 0 && this.fuel >= k.flareCost) {
        this.fuel -= k.flareCost;
        this.flareCd = k.flareCd;
        this.flareFlash = 1;
        game.fireFlare(this.x, this.y, this.angle);
      }

      // Relight: stand by a dead lamp and press E. Costs oil, buys light.
      if (input.relightPressed()) {
        const lamp = game.nearestDarkLamp(this.x, this.y, k.relightRange);
        if (lamp && this.fuel >= k.relightCost) {
          this.fuel -= k.relightCost;
          game.relightLamp(lamp);
        }
      }
    },

    hurt(amount, game) {
      if (this.invuln > 0 || this.hp <= 0) return;
      this.hp -= amount;
      this.invuln = cfg.keeper.contactInvuln;
      game.onKeeperHurt();
      if (this.hp <= 0) game.lose('fallen');
    },
  };
}
