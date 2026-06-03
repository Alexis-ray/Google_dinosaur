(() => {
  function createAudioManager() {
    let audioContext = null;
    let unlocked = false;

    function ensureContext() {
      if (audioContext) {
        return audioContext;
      }

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        return null;
      }

      audioContext = new AudioContextCtor();
      return audioContext;
    }

    function unlock() {
      const ctx = ensureContext();
      if (!ctx) {
        return false;
      }

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      unlocked = true;
      return true;
    }

    function playTone({ frequency, duration, type, volume, attack = 0.01, release = 0.08, detune = 0 }) {
      const ctx = ensureContext();
      if (!ctx || !unlocked) {
        return;
      }

      const start = ctx.currentTime;
      const end = start + duration;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.detune.setValueAtTime(detune, start);

      gainNode.gain.setValueAtTime(0.0001, start);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, end + release);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(end + release + 0.01);
    }

    function playJump() {
      playTone({ frequency: 540, duration: 0.07, type: "square", volume: 0.03, detune: 90 });
      playTone({ frequency: 680, duration: 0.06, type: "square", volume: 0.022, attack: 0.005 });
    }

    function playScore() {
      playTone({ frequency: 920, duration: 0.06, type: "triangle", volume: 0.022, attack: 0.004 });
      playTone({ frequency: 1180, duration: 0.05, type: "triangle", volume: 0.018, attack: 0.004 });
    }

    function playHighScore() {
      playTone({ frequency: 740, duration: 0.09, type: "triangle", volume: 0.026 });
      playTone({ frequency: 990, duration: 0.11, type: "triangle", volume: 0.022, attack: 0.012 });
    }

    function playHit() {
      playTone({ frequency: 180, duration: 0.12, type: "sawtooth", volume: 0.035, release: 0.12 });
      playTone({ frequency: 120, duration: 0.15, type: "square", volume: 0.022, attack: 0.005, release: 0.15 });
    }

    return {
      unlock,
      playJump,
      playScore,
      playHighScore,
      playHit,
    };
  }

  window.createDinoAudioManager = createAudioManager;
})();
