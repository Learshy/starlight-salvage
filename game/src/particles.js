// INKLIGHT — particles: the sparks, bursts and rising motes that make
// every banish, pickup and dawn feel like something happened.
// Particles are pure feedback: they never change the game state.

export function createParticles() {
  const list = [];

  return {
    list,

    burst(x, y, color, n, speed) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        list.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 30,
          life: 0.45 + Math.random() * 0.35,
          maxLife: 0.8,
          size: 2 + Math.random() * 3.5,
          color,
        });
      }
      if (list.length > 420) list.splice(0, list.length - 420);
    },

    // Slow golden motes that rise when dawn breaks or the sun returns.
    dawnMotes(x, y, n) {
      for (let i = 0; i < n; i++) {
        list.push({
          x: x + (Math.random() - 0.5) * 500,
          y: y + Math.random() * 120,
          vx: (Math.random() - 0.5) * 14,
          vy: -22 - Math.random() * 26,
          life: 1.6 + Math.random() * 1.2,
          maxLife: 2.8,
          size: 2 + Math.random() * 3,
          color: '#ffe9a8',
        });
      }
    },

    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life -= dt;
        if (p.life <= 0) {
          list.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.985;
        p.vy *= 0.985;
      }
    },

    clear() {
      list.length = 0;
    },

    draw(ctx) {
      for (const p of list) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}
