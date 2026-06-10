(() => {
const { MAX_DELTA_TIME, CANVAS_WIDTH, CANVAS_HEIGHT } = window.DinoConfig;
const Game = window.DinoGame;

const canvas = document.getElementById("game-canvas");
if (!canvas) {
  throw new Error("Canvas element with id 'game-canvas' not found");
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Failed to get 2D context from canvas");
}

const domHooks = {
  gameContainer: document.getElementById("game-container"),
};

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const game = new Game(canvas, ctx, domHooks);
window.__dinoGameDebug = game;

let lastTimestamp = 0;

function loop(timestamp) {
  let deltaTime = (timestamp - lastTimestamp) / 1000;

  if (deltaTime > MAX_DELTA_TIME) {
    deltaTime = MAX_DELTA_TIME;
  }

  game.update(deltaTime);
  game.render();

  lastTimestamp = timestamp;
  requestAnimationFrame(loop);
}

function handleVisibilityChange() {
  if (!document.hidden) {
    lastTimestamp = performance.now();
    game.resetTiming();
  }
}

function handleResize() {
  game.resize();
  game.render();
}

function unlockAudio() {
  game.unlockAudio();
}

function triggerJump() {
  unlockAudio();
  game.handleJumpInput();
}

function startDuck() {
  unlockAudio();
  game.handleDuckStart();
}

function endDuck() {
  game.handleDuckEnd();
}

function releaseJump() {
  game.handleJumpRelease();
}

function triggerRestart() {
  unlockAudio();
  game.handleRestartInput();
}

function triggerImmediateRestart() {
  unlockAudio();
  game.handleRestartInput({ immediate: true });
}

function isDuckKey(code) {
  return code === "ArrowDown" || code === "KeyS";
}

function isJumpKey(code) {
  return code === "Space" || code === "ArrowUp" || code === "KeyW";
}

function isRestartKey(code) {
  return code === "Enter";
}

function handleKeyDown(event) {
  if (event.repeat) {
    return;
  }

  if (isJumpKey(event.code)) {
    event.preventDefault();
    triggerJump();
    return;
  }

  if (isRestartKey(event.code)) {
    event.preventDefault();
  }

  if (isDuckKey(event.code)) {
    event.preventDefault();
    startDuck();
  }
}

function handleKeyUp(event) {
  if (isJumpKey(event.code)) {
    event.preventDefault();
    releaseJump();

    if (game.canRestart()) {
      triggerRestart();
    }

    return;
  }

  if (isRestartKey(event.code)) {
    event.preventDefault();
    if (game.canRestart({ immediate: true })) {
      triggerImmediateRestart();
    }

    return;
  }

  if (isDuckKey(event.code)) {
    event.preventDefault();
    endDuck();
  }
}

function resolvePointerIntent(event) {
  const rect = canvas.getBoundingClientRect();
  const yRatio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const touchLike = coarsePointer || event.pointerType === "touch" || event.pointerType === "pen";

  if (touchLike && game.isRunning() && yRatio > 0.62) {
    return "duck";
  }

  return "jump";
}

function handlePointerDown(event) {
  event.preventDefault();

  if (resolvePointerIntent(event) === "duck") {
    startDuck();
    return;
  }

  triggerJump();
}

function handlePointerUp() {
  releaseJump();
  endDuck();

  if (game.canRestart({ immediate: true })) {
    triggerImmediateRestart();
  }
}

document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("resize", handleResize);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
window.addEventListener("pointerup", handlePointerUp);
window.addEventListener("pointercancel", handlePointerUp);
window.addEventListener("blur", handlePointerUp);

lastTimestamp = performance.now();
game.resize();
game.render();
requestAnimationFrame(loop);

console.log("[Dino] Game initialized. Canvas:", CANVAS_WIDTH, "x", CANVAS_HEIGHT);
})();
