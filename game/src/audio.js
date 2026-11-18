// INKLIGHT — sound: every effect is synthesized with WebAudio, no files.
// The context is created on the first user gesture (autoplay policy), and
// M toggles mute. Each sound is a short function so the game can call it
// by name at the moment the thing happens.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let noiseBuf = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // One shared white-noise buffer for brush, burn and whoosh sounds.
      const len = ctx.sampleRate * 1;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, filterFreq, type = 'bandpass', delay = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  return {
    // Call once from the first pointer or key gesture.
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    // The brush dragging across the dark: soft, high noise.
    paint() {
      noise(0.09, 0.10, 5200, 'highpass');
    },
    // A shade burning in the light: a short crackle.
    burn() {
      noise(0.16, 0.22, 2400, 'bandpass');
      tone(190, 0.12, 'sawtooth', 0.05, 60);
    },
    // An ember collected: a bright two-note chime.
    ember() {
      tone(880, 0.12, 'sine', 0.16);
      tone(1318, 0.18, 'sine', 0.12, null, 0.06);
    },
    // The painter is hit: a low thud.
    hit() {
      tone(140, 0.22, 'sine', 0.30, 55);
      noise(0.12, 0.18, 300, 'lowpass');
    },
    // A dash: air rushing past.
    dash() {
      noise(0.18, 0.16, 1200, 'bandpass');
    },
    // A shade splits: a wet pop.
    split() {
      tone(320, 0.10, 'square', 0.08, 120);
    },
    // A spitter fires a glob: a low spit.
    spit() {
      tone(220, 0.14, 'sawtooth', 0.07, 90);
    },
    // Dawn breaks and a night is cleared: a warm major chord.
    dawn() {
      tone(523, 0.9, 'sine', 0.14);
      tone(659, 0.9, 'sine', 0.12, null, 0.05);
      tone(784, 1.1, 'sine', 0.12, null, 0.10);
    },
    // The sun returns: a rising fanfare.
    win() {
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((f, i) => tone(f, 0.5, 'triangle', 0.14, null, i * 0.12));
    },
    // The Gloom takes the painter: a low drone that falls away.
    gameOver() {
      tone(220, 1.4, 'sawtooth', 0.12, 55);
      tone(110, 1.6, 'sine', 0.16, 40, 0.1);
    },
  };
}
