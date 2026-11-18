// INKLIGHT — the painter: a wisp of light with a brush.
// Moves with WASD or the arrows, paints with the mouse, dashes with Space.
// Ink is the painter's only resource: it buys paint and dashes, and it
// comes back slowly — or fast, from an ember.

import { PAINTER, INK, VIEW_W, VIEW_H } from './config.js';
import { clamp } from './util.js';

export function createPainter() {
  return {
    x: VIEW_W / 2,
    y: VIEW_H / 2,
    hp: PAINTER.maxHp,
    ink: INK.start,
    dashTimer: 0,
    dashCooldown: 0,
    invulnTimer: 0,
    dashDirX: 1,
    dashDirY: 0,
    moving: false,
    // Where the brush points, for the render: toward the mouse.
    aimX: VIEW_W / 2 + 40,
    aimY: VIEW_H / 2,

    reset() {
      this.x = VIEW_W / 2;
      this.y = VIEW_H / 2;
      this.hp = PAINTER.maxHp;
      this.ink = INK.start;
      this.dashTimer = 0;
      this.dashCooldown = 0;
      this.invulnTimer = 0;
      this.moving = false;
    },

    update(dt, input, paint, audio, now) {
      const ax = input.axis();
      this.moving = ax.x !== 0 || ax.y !== 0;
      this.aimX = input.mouse.x;
      this.aimY = input.mouse.y;

      // Dash: a burst of speed that leaves a trail of light behind.
      if (this.dashCooldown > 0) this.dashCooldown -= dt;
      if (this.invulnTimer > 0) this.invulnTimer -= dt;
      if (input.dashPressed() && this.dashCooldown <= 0 && this.ink >= PAINTER.dashInkCost) {
        const dx = ax.x !== 0 || ax.y !== 0 ? ax.x : this.aimX - this.x;
        const dy = ax.x !== 0 || ax.y !== 0 ? ax.y : this.aimY - this.y;
        const len = Math.hypot(dx, dy) || 1;
        this.dashDirX = dx / len;
        this.dashDirY = dy / len;
        this.dashTimer = PAINTER.dashTime;
        this.dashCooldown = PAINTER.dashCooldown;
        this.ink -= PAINTER.dashInkCost;
        paint.addTrail(this.x, this.y, this.x + this.dashDirX * 70, this.y + this.dashDirY * 70, now);
        audio.dash();
      }

      if (this.dashTimer > 0) {
        this.dashTimer -= dt;
        this.x += this.dashDirX * PAINTER.dashSpeed * dt;
        this.y += this.dashDirY * PAINTER.dashSpeed * dt;
      } else if (this.moving) {
        this.x += ax.x * PAINTER.speed * dt;
        this.y += ax.y * PAINTER.speed * dt;
      }

      this.x = clamp(this.x, PAINTER.radius, VIEW_W - PAINTER.radius);
      this.y = clamp(this.y, PAINTER.radius, VIEW_H - PAINTER.radius);

      // Ink comes back on its own, slowly.
      this.ink = Math.min(INK.max, this.ink + INK.regenPerSec * dt);
    },

    // A shade or a glob hits the painter. Returns true when damage landed.
    takeHit(dmg, audio) {
      if (this.invulnTimer > 0) return false;
      this.hp -= dmg;
      this.invulnTimer = PAINTER.invulnTime;
      audio.hit();
      return true;
    },

    collectEmber(audio) {
      this.ink = Math.min(INK.max, this.ink + INK.emberRefill);
      audio.ember();
    },

    get alive() {
      return this.hp > 0;
    },
  };
}
