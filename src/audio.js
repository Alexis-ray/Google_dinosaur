(() => {
  const SOUND_BASE = "assets/sounds";

  function createAudioManager() {
    let audioContext = null;
    let unlocked = false;
    const soundEffects = {
      jump: new Audio(`${SOUND_BASE}/button-press.mp3`),
      score: new Audio(`${SOUND_BASE}/score-reached.mp3`),
      hit: new Audio(`${SOUND_BASE}/hit.mp3`),
    };

    for (const audio of Object.values(soundEffects)) {
      audio.preload = "auto";
    }

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
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }

      unlocked = true;
      return true;
    }

    function playAsset(audio, onFailure = null) {
      if (!unlocked || !audio) {
        return false;
      }

      try {
        audio.currentTime = 0;
        const playback = audio.play();
        if (playback && typeof playback.catch === "function") {
          playback.catch(() => {
            if (typeof onFailure === "function") {
              onFailure();
            }
          });
        }
        return true;
      } catch (error) {
        if (typeof onFailure === "function") {
          onFailure();
        }
        return false;
      }
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
      if (playAsset(soundEffects.jump, playJumpFallback)) {
        return;
      }
      playJumpFallback();
    }

    function playJumpFallback() {
      playTone({ frequency: 540, duration: 0.07, type: "square", volume: 0.03, detune: 90 });
      playTone({ frequency: 680, duration: 0.06, type: "square", volume: 0.022, attack: 0.005 });
    }

    function playScore() {
      if (playAsset(soundEffects.score, playScoreFallback)) {
        return;
      }
      playScoreFallback();
    }

    function playScoreFallback() {
      playTone({ frequency: 920, duration: 0.06, type: "triangle", volume: 0.022, attack: 0.004 });
      playTone({ frequency: 1180, duration: 0.05, type: "triangle", volume: 0.018, attack: 0.004 });
    }

    function playHighScore() {
      if (playAsset(soundEffects.score, playHighScoreFallback)) {
        return;
      }
      playHighScoreFallback();
    }

    function playHighScoreFallback() {
      playTone({ frequency: 740, duration: 0.09, type: "triangle", volume: 0.026 });
      playTone({ frequency: 990, duration: 0.11, type: "triangle", volume: 0.022, attack: 0.012 });
    }

    function playHit() {
      if (playAsset(soundEffects.hit, playHitFallback)) {
        return;
      }
      playHitFallback();
    }

    function playHitFallback() {
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
