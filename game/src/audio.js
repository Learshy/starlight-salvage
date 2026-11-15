// Starlight Salvage — all sound is synthesized with WebAudio.
// No audio files ship with the game; every effect is an oscillator or a
// burst of filtered noise, and the music is a small scheduled bass line.
export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    musicTimer: null,
    musicStep: 0,
  };

  function ensure() {
    if (audio.ctx) return audio.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio.ctx = new AC();
    } catch {
      return null;
    }
    return audio.ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (audio.muted) return;
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (audio.muted) return;
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
  }

  audio.unlock = () => {
    const ctx = ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };
  audio.shoot = () => tone(880, 0.09, 'square', 0.05, 220);
  audio.boom = (big) => {
    noise(big ? 0.5 : 0.28, big ? 0.35 : 0.2, big ? 900 : 1400);
    tone(big ? 120 : 160, 0.3, 'sine', 0.25, 40);
  };
  audio.pickup = () => {
    tone(660, 0.07, 'sine', 0.12, 990);
    tone(1320, 0.1, 'sine', 0.06, 1320);
  };
  audio.hurt = () => {
    tone(200, 0.25, 'sawtooth', 0.2, 60);
    noise(0.2, 0.2, 700);
  };
  audio.upgrade = () => {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => tone(f, 0.16, 'triangle', 0.14), i * 70);
    });
  };
  audio.waveClear = () => {
    [392, 523, 659].forEach((f, i) => {
      setTimeout(() => tone(f, 0.2, 'triangle', 0.12), i * 90);
    });
  };
  audio.victory = () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      setTimeout(() => tone(f, 0.3, 'triangle', 0.14), i * 120);
    });
  };
  audio.defeat = () => {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => tone(f, 0.35, 'sawtooth', 0.1), i * 160);
    });
  };

  // A slow minor-key bass walk, one note every 240 ms, scheduled ahead.
  const BASS = [55, 55, 65.41, 55, 49, 55, 73.42, 65.41];
  audio.startMusic = () => {
    if (audio.musicTimer || audio.muted) return;
    const ctx = ensure();
    if (!ctx) return;
    audio.musicTimer = setInterval(() => {
      if (audio.muted) return;
      const f = BASS[audio.musicStep % BASS.length];
      audio.musicStep += 1;
      tone(f, 0.22, 'triangle', 0.05);
      if (audio.musicStep % 2 === 0) tone(f * 2, 0.12, 'sine', 0.02);
    }, 240);
  };
  audio.stopMusic = () => {
    if (audio.musicTimer) clearInterval(audio.musicTimer);
    audio.musicTimer = null;
  };
  audio.toggleMute = () => {
    audio.muted = !audio.muted;
    if (audio.muted) audio.stopMusic();
    return audio.muted;
  };
  return audio;
}
