// Game feel: tweens, trauma-based shake, hitstop, particles, flashes.
// Feedback is state communication, not decoration: every effect is tied
// to a gameplay event, driven by accumulated game time (never wall clock),
// and scaled so the strongest events are unmistakable and the weakest
// stay subtle. All randomness comes from the seeded RNG.

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function createFeel(rng) {
  const tweens = [];
  const particles = [];
  let trauma = 0;
  let hitstopLeft = 0;
  let timeScale = 1;
  let flashAlpha = 0;
  let zoomPunch = 0;

  // Deterministic value noise in [-1, 1] from accumulated game time.
  function noise(t, seed) {
    const x = Math.sin(t * 12.9898 + seed * 78.233) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  }

  return {
    // --- tweens (updated with the REAL delta so feedback stays live
    // during hitstop, when the gameplay delta is scaled down) ---
    tween(duration, onUpdate, easing, onComplete) {
      tweens.push({ elapsed: 0, duration, easing: easing || easeOutCubic, onUpdate, onComplete });
    },

    // --- trauma shake: shake is trauma^2, so small events barely move
    // the camera and big ones snap hard; hard-capped at 1. ---
    addTrauma(amount) {
      trauma = Math.min(1, trauma + amount);
    },
    shakeOffset(time, maxPx) {
      if (trauma <= 0) return { x: 0, y: 0 };
      const s = trauma * trauma;
      const f = time * 32;
      return {
        x: maxPx * s * noise(f, 1),
        y: maxPx * s * noise(f, 2),
      };
    },

    // --- hitstop: freeze the gameplay delta briefly on heavy contact.
    // The render loop never stops; only gameplay slows. ---
    hitstop(seconds) {
      hitstopLeft = Math.max(hitstopLeft, seconds);
      timeScale = 0.05;
    },
    gameplayDelta(realDt) {
      if (hitstopLeft > 0) {
        hitstopLeft -= realDt;
        if (hitstopLeft <= 0) timeScale = 1;
      }
      return realDt * timeScale;
    },
    get ducked() {
      return timeScale < 1;
    },

    // --- one-frame-scale flashes and zoom punches ---
    flash(amount) {
      flashAlpha = Math.max(flashAlpha, amount);
    },
    punchZoom(amount) {
      zoomPunch = Math.min(0.06, zoomPunch + amount);
    },
    zoom() {
      return 1 + zoomPunch;
    },

    // --- particles: pooled, allocation-light, additive when drawn ---
    burst(x, y, opts) {
      const n = opts.count || 10;
      for (let i = 0; i < n; i++) {
        if (particles.length > 400) return;
        const a = rng.range(0, Math.PI * 2);
        const sp = rng.range(opts.speedMin || 40, opts.speedMax || 160);
        particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          ttl: rng.range(opts.ttlMin || 0.3, opts.ttlMax || 0.8),
          size: rng.range(opts.sizeMin || 2, opts.sizeMax || 5),
          color: opts.color || '#ffcf5c',
          drag: opts.drag || 0.9,
          rise: opts.rise || 0,
        });
      }
    },

    update(realDt) {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const t = tweens[i];
        t.elapsed += realDt;
        const k = Math.min(t.elapsed / t.duration, 1);
        t.onUpdate(t.easing(k));
        if (t.elapsed >= t.duration) {
          if (t.onComplete) t.onComplete();
          tweens.splice(i, 1);
        }
      }
      trauma = Math.max(0, trauma - 1.4 * realDt);
      flashAlpha = Math.max(0, flashAlpha - 2.2 * realDt);
      zoomPunch *= Math.exp(-realDt / 0.2);
      if (zoomPunch < 0.001) zoomPunch = 0;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += realDt;
        if (p.life >= p.ttl) {
          particles.splice(i, 1);
          continue;
        }
        p.vx *= Math.pow(p.drag, realDt * 60);
        p.vy *= Math.pow(p.drag, realDt * 60);
        p.vy -= p.rise * realDt;
        p.x += p.vx * realDt;
        p.y += p.vy * realDt;
      }
    },

    drawParticles(ctx) {
      if (particles.length === 0) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        const k = 1 - p.life / p.ttl;
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * k), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    drawFlash(ctx, w, h) {
      if (flashAlpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = '#fff6d8';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },

    get particleCount() {
      return particles.length;
    },
  };
}
