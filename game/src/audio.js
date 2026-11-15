// Emberkeep — synthesized sound, no audio files.
// One job: every blip, pop, chime and horn, made with WebAudio oscillators.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain, lowpass) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(ac.destination);
    src.start(t0);
  }

  // A slow, quiet music-box loop in A minor, one note per beat.
  const MELODY = [220, 261.63, 329.63, 261.63, 196, 220, 246.94, 329.63];

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopMusic();
      return muted;
    },
    shoot() { tone(720 + Math.random() * 120, 0.07, 'square', 0.045, 320); },
    pop() { noise(0.12, 0.12, 2400); tone(320, 0.1, 'triangle', 0.08, 90); },
    shard() { tone(880 + Math.random() * 80, 0.09, 'sine', 0.06, 1320); },
    hurt() { tone(140, 0.25, 'sawtooth', 0.16, 55); noise(0.18, 0.1, 900); },
    heal() { tone(523.25, 0.16, 'sine', 0.08, 783.99); },
    levelUp() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => tone(f, 0.22, 'triangle', 0.09), i * 90);
      });
    },
    waveHorn() { tone(196, 0.5, 'sawtooth', 0.1, 392); tone(98, 0.5, 'triangle', 0.08, 196); },
    bossRoar() { tone(82, 0.9, 'sawtooth', 0.18, 41); noise(0.7, 0.12, 500); },
    victory() {
      [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => {
        setTimeout(() => tone(f, 0.3, 'triangle', 0.1), i * 120);
      });
    },
    gameOver() {
      [392, 329.63, 261.63, 196].forEach((f, i) => {
        setTimeout(() => tone(f, 0.5, 'sine', 0.1), i * 220);
      });
    },
    startMusic() {
      if (musicTimer || muted) return;
      ensure();
      musicTimer = setInterval(() => {
        if (muted) return;
        tone(MELODY[musicStep % MELODY.length], 0.5, 'sine', 0.028);
        musicStep += 1;
      }, 460);
    },
    stopMusic() {
      if (musicTimer) clearInterval(musicTimer);
      musicTimer = null;
    },
  };
}
