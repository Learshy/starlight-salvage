// All sound is synthesized with WebAudio. No audio files ship with the
// game: every effect is an oscillator or a burst of filtered noise, and
// the night hum is a low drone under a slow wind. Pitch varies a little
// on every repeat (seeded RNG), so the ear never hears the exact same
// sample twice. Ducking lowers the whole mix while hitstop holds.

export function createAudio(rng) {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    duck: 1,
    humNodes: null,
  };

  function ensure() {
    if (audio.ctx) return audio.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : 0.5 * audio.duck;
      audio.master.connect(audio.ctx.destination);
    } catch {
      return null;
    }
    return audio.ctx;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (audio.muted) return;
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') return;
    const t = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noiseBurst(dur, vol, freq, q, slideTo) {
    if (audio.muted) return;
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (rng.next() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    filter.Q.value = q || 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start(t);
  }

  // Pitch wobble so repeats stay alive: +/-6% from the seeded RNG.
  function wobble(base) {
    return base * (1 + (rng.next() - 0.5) * 0.12);
  }

  return {
    ensure,
    setMuted(m) {
      audio.muted = m;
      if (audio.master) audio.master.gain.value = m ? 0 : 0.5 * audio.duck;
    },
    get muted() {
      return audio.muted;
    },
    setDuck(v) {
      audio.duck = v;
      if (audio.master && !audio.muted) audio.master.gain.value = 0.5 * v;
    },
    click() {
      tone(wobble(660), 0.07, 'triangle', 0.25);
    },
    chime() {
      // Ember pickup: a bright two-note pop, pitch-varied per pickup.
      tone(wobble(880), 0.16, 'sine', 0.3);
      tone(wobble(1320), 0.22, 'sine', 0.18, null, 0.05);
    },
    flare() {
      noiseBurst(0.28, 0.5, 2400, 0.8, 500);
      tone(wobble(190), 0.25, 'sawtooth', 0.12, 90);
    },
    dissolve() {
      noiseBurst(0.35, 0.35, 900, 1.2, 180);
      tone(wobble(320), 0.3, 'sine', 0.16, 60);
    },
    hurt() {
      tone(wobble(140), 0.25, 'square', 0.22, 70);
      noiseBurst(0.18, 0.3, 500, 1, 150);
    },
    thud() {
      tone(wobble(75), 0.3, 'sine', 0.5, 40);
      noiseBurst(0.12, 0.35, 220, 1, 90);
    },
    relight() {
      noiseBurst(0.4, 0.3, 1800, 0.7, 3200);
      tone(wobble(520), 0.3, 'triangle', 0.22, 780);
      tone(wobble(1040), 0.4, 'sine', 0.14, null, 0.08);
    },
    lampOut() {
      tone(wobble(300), 0.5, 'sine', 0.2, 110);
    },
    bell() {
      // The night bell: a low toll that opens each night.
      tone(wobble(196), 1.4, 'sine', 0.32, 190);
      tone(wobble(294), 1.1, 'sine', 0.14, 288);
      tone(wobble(392), 0.8, 'triangle', 0.08, null, 0.05);
    },
    dawn() {
      // Dawn chord: warm major lift over two seconds.
      const notes = [262, 330, 392, 523];
      notes.forEach((f, i) => tone(wobble(f), 1.8, 'triangle', 0.16, null, i * 0.12));
    },
    startHum() {
      const ctx = ensure();
      if (!ctx || audio.humNodes) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55;
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 55.7;
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.025;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(audio.master);
      osc.start();
      osc2.start();
      lfo.start();
      audio.humNodes = { osc, osc2, lfo, gain };
    },
    stopHum() {
      if (!audio.humNodes) return;
      try {
        audio.humNodes.osc.stop();
        audio.humNodes.osc2.stop();
        audio.humNodes.lfo.stop();
      } catch {
        // already stopped
      }
      audio.humNodes = null;
    },
  };
}
