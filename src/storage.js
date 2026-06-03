(() => {
const { HIGH_SCORE_STORAGE_KEY } = window.DinoConfig;

function normalizeScore(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function loadHighScore() {
  try {
    return normalizeScore(window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY));
  } catch (error) {
    console.warn("[Dino] Failed to read high score from localStorage.", error);
    return 0;
  }
}

function saveHighScore(score) {
  const normalizedScore = normalizeScore(score);

  try {
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(normalizedScore));
    return normalizedScore;
  } catch (error) {
    console.warn("[Dino] Failed to save high score to localStorage.", error);
    return normalizedScore;
  }
}

function resetHighScore() {
  try {
    window.localStorage.removeItem(HIGH_SCORE_STORAGE_KEY);
  } catch (error) {
    console.warn("[Dino] Failed to reset high score in localStorage.", error);
  }

  return 0;
}

window.DinoStorage = {
  loadHighScore,
  saveHighScore,
  resetHighScore,
};
})();
