/* ==========================================================================
   ASCI ON THE OFFICE - PC Speaker / 8-bit Synthesizer (Web Audio API)
   ========================================================================== */

window.AsciiAudio = (function () {
  let ctx = null;
  let enabled = true;
  let bossMuted = false;

  function getContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, durationMs, type = 'square', volume = 0.04, delayMs = 0) {
    if (!enabled || bossMuted) return;
    const audio = getContext();
    if (!audio) return;

    const start = audio.currentTime + delayMs / 1000;
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start(start);
    osc.stop(start + durationMs / 1000);
  }

  return {
    isEnabled() {
      return enabled;
    },
    toggle() {
      enabled = !enabled;
      if (enabled) this.click();
      return enabled;
    },
    setBossMute(muted) {
      bossMuted = muted;
    },
    click() {
      tone(660, 28, 'square', 0.03);
    },
    move() {
      tone(440, 22, 'triangle', 0.025);
    },
    score() {
      tone(587.33, 60, 'square', 0.04, 0);
      tone(880, 90, 'square', 0.04, 60);
    },
    clearLine() {
      tone(523.25, 65, 'square', 0.045, 0);
      tone(659.25, 65, 'square', 0.045, 65);
      tone(783.99, 65, 'square', 0.045, 130);
      tone(1046.5, 130, 'square', 0.05, 195);
    },
    error() {
      tone(180, 110, 'sawtooth', 0.045, 0);
      tone(140, 140, 'sawtooth', 0.045, 100);
    },
    explosion() {
      tone(120, 120, 'sawtooth', 0.06, 0);
      tone(85, 180, 'sawtooth', 0.06, 90);
      tone(55, 250, 'triangle', 0.07, 190);
    },
    win() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      const durs = [80, 80, 80, 140, 80, 240];
      let delay = 0;
      for (let i = 0; i < notes.length; i++) {
        tone(notes[i], durs[i], 'square', 0.045, delay);
        delay += durs[i] + 15;
      }
    }
  };
})();
