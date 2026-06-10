(() => {
const {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEBUG_FONT_SIZE,
  SCORE_DIGITS,
  SCORE_SOUND_MILESTONE,
  SCORE_FLASH_DURATION,
  SCORE_FLASH_ITERATIONS,
  STATUS_MESSAGE_DURATION,
  STATE_IDLE,
  STATE_RUNNING,
  STATE_GAMEOVER,
  PLAYER_IDLE,
  PLAYER_RUNNING,
  PLAYER_JUMPING,
  PLAYER_DUCKING,
  PLAYER_GAMEOVER,
  DINO_X,
  DINO_WIDTH,
  DINO_HEIGHT,
  DINO_DUCK_HEIGHT,
  DINO_DUCK_DRAW_OFFSET_X,
  DINO_RUN_FRAME_DURATION,
  DINO_DUCK_FRAME_DURATION,
  DINO_IDLE_BLINK_DURATION,
  DINO_IDLE_BLINK_INTERVAL_MIN,
  DINO_IDLE_BLINK_INTERVAL_MAX,
  GRAVITY,
  JUMP_VELOCITY,
  FAST_FALL_GRAVITY_MULTIPLIER,
  JUMP_RELEASE_GRAVITY_MULTIPLIER,
  GROUND_Y,
  GAMEOVER_RESTART_DELAY,
  INVERT_FADE_DURATION,
  INVERT_DISTANCE,
  INTRO_DURATION,
  INTRO_RUNNER_OFFSET,
  COLLISION_BOX_TRIM,
  WORLD_FRAME_RATE,
  WORLD_START_SPEED_FRAMES,
  WORLD_MAX_SPEED_FRAMES,
  WORLD_ACCELERATION_FRAMES,
  WORLD_START_SPEED,
  WORLD_MAX_SPEED,
  DISTANCE_SCORE_COEFFICIENT,
  GROUND_PATTERN_WIDTH,
  GROUND_PATTERN_HEIGHT,
  GROUND_PATTERN_GAP,
  GROUND_PATTERN_OFFSET_Y,
  PLAYER_HITBOX,
  OBSTACLE_SPAWN_OFFSET_X,
  OBSTACLE_CLEAR_TIME,
  OBSTACLE_GAP_COEFFICIENT,
  OBSTACLE_MAX_GAP_COEFFICIENT,
  OBSTACLE_MAX_DUPLICATION,
  OBSTACLE_DEFINITIONS,
  THEMES,
  SPRITE_CLOUD_X,
  SPRITE_CLOUD_Y,
  SPRITE_CLOUD_WIDTH,
  SPRITE_CLOUD_HEIGHT,
  CLOUD_MIN_Y,
  CLOUD_MAX_Y,
  CLOUD_MIN_GAP,
  CLOUD_MAX_GAP,
  SPRITE_HORIZON_X,
  SPRITE_HORIZON_Y,
  SPRITE_HORIZON_SEGMENT_WIDTH,
  SPRITE_HORIZON_HEIGHT,
  SPRITE_HORIZON_DRAW_Y,
  SPRITE_MOON_X,
  SPRITE_MOON_Y,
  SPRITE_MOON_WIDTH,
  SPRITE_MOON_HEIGHT,
  SPRITE_STAR_X,
  SPRITE_STAR_Y,
  SPRITE_STAR_WIDTH,
  SPRITE_STAR_HEIGHT,
  NIGHT_STAR_COUNT,
  TREX_SPRITE_X,
  TREX_SPRITE_Y,
  TREX_FRAME_WIDTH,
  TREX_FRAME_HEIGHT,
  TREX_RUN_1_X,
  TREX_RUN_2_X,
  TREX_IDLE_X,
  TREX_JUMP_X,
  TREX_CRASHED_X,
  TREX_DUCK_1_X,
  TREX_DUCK_2_X,
  TREX_DUCK_FRAME_WIDTH,
  TREX_DUCK_FRAME_HEIGHT,
  SPRITE_DIGITS_X,
  SPRITE_DIGITS_Y,
  SPRITE_DIGIT_WIDTH,
  SPRITE_DIGIT_HEIGHT,
  SPRITE_GAME_OVER_X,
  SPRITE_GAME_OVER_Y,
  SPRITE_GAME_OVER_WIDTH,
  SPRITE_GAME_OVER_HEIGHT,
  SPRITE_GAME_OVER_DRAW_Y,
  SPRITE_RESTART_X,
  SPRITE_RESTART_Y,
  SPRITE_RESTART_WIDTH,
  SPRITE_RESTART_HEIGHT,
  SPRITE_RESTART_DRAW_Y,
} = window.DinoConfig;

const storageApi = window.DinoStorage;
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function mixColor(colorA, colorB, t) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const mixed = {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };

  return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)] || null;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function trimCollisionBox(box, trim) {
  return {
    x: box.x + trim,
    y: box.y + trim,
    width: Math.max(0, box.width - trim * 2),
    height: Math.max(0, box.height - trim * 2),
  };
}

class Game {
  constructor(canvas, ctx, domHooks) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.dom = domHooks;
    this.root = document.documentElement;
    this.spriteImage = document.getElementById("offline-sprite");
    this.audio = typeof window.createDinoAudioManager === "function"
      ? window.createDinoAudioManager()
      : null;

    this.width = CANVAS_WIDTH;
    this.height = CANVAS_HEIGHT;
    this.state = STATE_IDLE;
    this.frameCount = 0;
    this.elapsed = 0;
    this.lastDelta = 0;
    this.debugVisible = false;
    this.highScore = storageApi ? storageApi.loadHighScore() : 0;
    this.lastScoreSoundScore = 0;
    this.statusMessage = "";
    this.statusTimer = 0;
    this.gameOverTimer = 0;
    this.nightMode = false;
    this.isIntroPlaying = false;
    this.introTimer = 0;

    this.background = this.createBackground();
    this.player = this.createPlayer();
    this.resetRunState();
    this.applyThemeToDom();
  }

  createBackground() {
    const stars = [];
    for (let index = 0; index < NIGHT_STAR_COUNT; index += 1) {
      stars.push({
        x: 460 + index * 96,
        y: 24 + (index % 2) * 18,
        blinkOffset: index * 0.27,
      });
    }

    return {
      clouds: [
        { x: 180, y: 52, width: SPRITE_CLOUD_WIDTH, height: SPRITE_CLOUD_HEIGHT, speedFactor: 0.2 },
        { x: 610, y: 68, width: SPRITE_CLOUD_WIDTH, height: SPRITE_CLOUD_HEIGHT, speedFactor: 0.2 },
      ],
      stars,
      moon: { x: 650, y: 30, phase: 3 },
    };
  }

  createPlayer() {
    return {
      x: DINO_X,
      y: GROUND_Y - DINO_HEIGHT,
      width: DINO_WIDTH,
      height: DINO_HEIGHT,
      standingHeight: DINO_HEIGHT,
      duckHeight: DINO_DUCK_HEIGHT,
      velocityY: 0,
      gravity: GRAVITY,
      isOnGround: true,
      isJumping: false,
      isDucking: false,
      jumpReleased: false,
      idleFrame: 0,
      waitingFrame: 0,
      blinkTimer: 0,
      nextBlinkDelay: randomBetween(DINO_IDLE_BLINK_INTERVAL_MIN, DINO_IDLE_BLINK_INTERVAL_MAX),
      runFrame: 0,
      duckFrame: 0,
      animationTime: 0,
      state: PLAYER_IDLE,
    };
  }

  resetRunState() {
    this.worldSpeedFrames = WORLD_START_SPEED_FRAMES;
    this.worldSpeed = WORLD_START_SPEED;
    this.groundDistance = 0;
    this.groundOffset = 0;
    this.obstacles = [];
    this.obstacleHistory = [];
    this.runningTime = 0;
    this.distanceRan = 0;
    this.score = 0;
    this.lastScoreSoundScore = 0;
    this.scoreFlashActive = false;
    this.scoreFlashTimer = 0;
    this.scoreFlashIteration = 0;
    this.lastInvertTriggerScore = 0;
    this.invertTimer = 0;
    this.gameOverTimer = 0;
    this.nightMode = false;
    this.isIntroPlaying = false;
    this.introTimer = 0;
    this.player = this.createPlayer();
    this.background = this.createBackground();
    this.clearStatus();
    this.syncContainerIntroState();
  }

  formatScore(score) {
    const safeScore = Math.max(0, Math.floor(score));
    return String(safeScore).padStart(SCORE_DIGITS, "0");
  }

  unlockAudio() {
    if (this.audio) {
      this.audio.unlock();
    }
  }

  playAudio(methodName) {
    if (this.audio && typeof this.audio[methodName] === "function") {
      this.audio[methodName]();
    }
  }

  showStatus(message, duration = STATUS_MESSAGE_DURATION) {
    this.statusMessage = message;
    this.statusTimer = duration;
  }

  clearStatus() {
    this.statusMessage = "";
    this.statusTimer = 0;
  }

  setHighScore(score) {
    const normalizedScore = Math.max(0, Math.floor(score));
    this.highScore = normalizedScore;

    if (storageApi) {
      storageApi.saveHighScore(normalizedScore);
    }
  }

  resetHighScore() {
    if (this.state === STATE_RUNNING) {
      return false;
    }

    this.highScore = storageApi ? storageApi.resetHighScore() : 0;
    return true;
  }

  restartGame() {
    this.resetRunState();
    this.state = STATE_RUNNING;
    this.player.state = PLAYER_RUNNING;
  }

  canRestart({ immediate = false } = {}) {
    if (this.state !== STATE_GAMEOVER) {
      return false;
    }

    return immediate || this.gameOverTimer >= GAMEOVER_RESTART_DELAY;
  }

  handleRestartInput(options = {}) {
    if (!this.canRestart(options)) {
      return false;
    }

    this.restartGame();
    return true;
  }

  startRun() {
    if (this.state === STATE_IDLE) {
      this.state = STATE_RUNNING;
      this.player.state = PLAYER_IDLE;
      this.isIntroPlaying = true;
      this.introTimer = 0;
      this.syncContainerIntroState();
    }
  }

  isRunning() {
    return this.state === STATE_RUNNING;
  }

  canDuck() {
    return this.state === STATE_RUNNING && this.player.isOnGround;
  }

  setPlayerHeight(nextHeight) {
    this.player.height = nextHeight;
    this.player.y = GROUND_Y - nextHeight;
  }

  jump() {
    if (!this.player.isOnGround) {
      return false;
    }

    this.player.isDucking = false;
    this.setPlayerHeight(this.player.standingHeight);
    this.player.velocityY = JUMP_VELOCITY;
    this.player.isOnGround = false;
    this.player.isJumping = true;
    this.player.jumpReleased = false;
    this.player.state = PLAYER_JUMPING;
    this.player.animationTime = 0;
    this.playAudio("playJump");
    return true;
  }

  handleJumpInput() {
    if (this.state === STATE_GAMEOVER) {
      return false;
    }

    if (this.state === STATE_IDLE) {
      this.startRun();
      return this.jump();
    }

    if (this.isIntroPlaying) {
      return false;
    }

    return this.jump();
  }

  syncContainerIntroState() {
    if (!this.dom || !this.dom.gameContainer) {
      return;
    }

    this.dom.gameContainer.classList.toggle("intro", this.state === STATE_IDLE || this.isIntroPlaying);
    this.dom.gameContainer.classList.toggle("intro-complete", this.state !== STATE_IDLE && !this.isIntroPlaying);
  }

  handleDuckStart() {
    if (this.state === STATE_GAMEOVER || this.state === STATE_IDLE) {
      return false;
    }

    if (!this.player.isOnGround) {
      this.player.gravity = GRAVITY * FAST_FALL_GRAVITY_MULTIPLIER;
      return false;
    }

    this.player.isDucking = true;
    this.setPlayerHeight(this.player.duckHeight);
    this.player.state = PLAYER_DUCKING;
    return true;
  }

  handleDuckEnd() {
    this.player.isDucking = false;
    this.player.gravity = GRAVITY;

    if (this.state === STATE_GAMEOVER) {
      return;
    }

    if (this.player.isOnGround) {
      this.setPlayerHeight(this.player.standingHeight);
      this.player.state = this.state === STATE_RUNNING ? PLAYER_RUNNING : PLAYER_IDLE;
    }
  }

  handleJumpRelease() {
    if (!this.player.isOnGround && this.player.velocityY < 0) {
      this.player.jumpReleased = true;
    }
  }

  getActiveTheme() {
    const baseTheme = THEMES.day;

    return {
      ...baseTheme,
      showNightDecor: this.nightMode,
    };
  }

  applyThemeToDom() {
    const theme = this.getActiveTheme();

    this.root.classList.add("offline");
    this.root.classList.toggle("inverted", this.nightMode);
    this.root.style.setProperty("--dino-bg", theme.skyColor);
    this.root.style.setProperty("--bg-color", theme.skyColor);
    this.root.style.setProperty("--game-bg", theme.skyColor);
    this.root.style.setProperty("--text-color", theme.textColor);
    this.root.style.setProperty("--page-filter", "invert(1)");
    this.root.style.setProperty("--accent-color", theme.accentColor);
    this.root.style.setProperty("--hint-color", theme.hintColor);
    this.root.style.setProperty("--border-color", theme.borderColor);
    this.root.style.setProperty("--button-bg", theme.buttonBg);
    this.root.style.setProperty("--button-hover-bg", theme.buttonHoverBg);
  }

  updateTheme() {
    if (this.nightMode) {
      this.invertTimer += this.lastDelta;
      if (this.invertTimer >= INVERT_FADE_DURATION) {
        this.nightMode = false;
        this.invertTimer = 0;
      }
    } else if (this.score > 0 && this.score % INVERT_DISTANCE === 0 && this.score !== this.lastInvertTriggerScore) {
      this.nightMode = true;
      this.invertTimer = 0;
      this.lastInvertTriggerScore = this.score;
    }

    this.applyThemeToDom();
  }

  updateStatus(deltaTime) {
    if (this.statusTimer <= 0) {
      return;
    }

    this.statusTimer = Math.max(0, this.statusTimer - deltaTime);
    if (this.statusTimer === 0) {
      this.statusMessage = "";
    }
  }

  updateDifficulty(deltaTime) {
    const elapsedFrames = deltaTime * WORLD_FRAME_RATE;
    this.worldSpeedFrames = clamp(
      this.worldSpeedFrames + WORLD_ACCELERATION_FRAMES * elapsedFrames,
      WORLD_START_SPEED_FRAMES,
      WORLD_MAX_SPEED_FRAMES
    );
    this.worldSpeed = clamp(
      this.worldSpeedFrames * WORLD_FRAME_RATE,
      WORLD_START_SPEED,
      WORLD_MAX_SPEED
    );
  }

  updateBackground(deltaTime) {
    for (const cloud of this.background.clouds) {
      cloud.x -= Math.ceil(this.worldSpeed * cloud.speedFactor * deltaTime);
      if (cloud.x + cloud.width < -10) {
        cloud.x = this.width + randomBetween(CLOUD_MIN_GAP, CLOUD_MAX_GAP);
        cloud.y = Math.round(randomBetween(CLOUD_MIN_Y, CLOUD_MAX_Y));
      }
    }

    this.background.moon.x -= 15 * deltaTime;
    if (this.background.moon.x + SPRITE_MOON_WIDTH < -20) {
      this.background.moon.x = this.width + 80;
    }

    for (const star of this.background.stars) {
      star.x -= 18 * deltaTime;
      if (star.x + SPRITE_STAR_WIDTH < -8) {
        star.x = this.width + randomBetween(40, 160);
        star.y = Math.round(randomBetween(18, 68));
      }
    }
  }

  updatePlayer(deltaTime) {
    const player = this.player;

    if (this.isIntroPlaying) {
      this.introTimer = Math.min(INTRO_DURATION, this.introTimer + deltaTime);
      if (this.introTimer >= INTRO_DURATION) {
        this.isIntroPlaying = false;
        this.syncContainerIntroState();
      }
    }

    if (!player.isOnGround) {
      if (player.jumpReleased && player.velocityY < 0) {
        player.gravity = GRAVITY * JUMP_RELEASE_GRAVITY_MULTIPLIER;
      }
      player.velocityY += player.gravity * deltaTime;
      player.y += player.velocityY * deltaTime;

      const groundPlayerY = GROUND_Y - player.standingHeight;
      if (player.y >= groundPlayerY) {
        player.y = groundPlayerY;
        player.velocityY = 0;
        player.isOnGround = true;
        player.isJumping = false;
        player.jumpReleased = false;
        player.gravity = GRAVITY;

        if (player.isDucking) {
          this.setPlayerHeight(player.duckHeight);
          player.state = PLAYER_DUCKING;
        } else {
          this.setPlayerHeight(player.standingHeight);
          player.state = this.state === STATE_RUNNING && !this.isIntroPlaying ? PLAYER_RUNNING : PLAYER_IDLE;
        }

        return;
      }

      player.state = PLAYER_JUMPING;
      return;
    }

    if (this.state === STATE_IDLE) {
      player.blinkTimer += deltaTime;
      player.animationTime += deltaTime;

      if (player.idleFrame === 0 && player.blinkTimer >= player.nextBlinkDelay) {
        player.idleFrame = 1;
        player.waitingFrame = 1;
        player.animationTime = 0;
      } else if (player.idleFrame === 1 && player.animationTime >= DINO_IDLE_BLINK_DURATION) {
        player.idleFrame = 0;
        player.waitingFrame = 0;
        player.animationTime = 0;
        player.blinkTimer = 0;
        player.nextBlinkDelay = randomBetween(DINO_IDLE_BLINK_INTERVAL_MIN, DINO_IDLE_BLINK_INTERVAL_MAX);
      }

      this.setPlayerHeight(player.standingHeight);
      player.state = PLAYER_IDLE;
      this.syncContainerIntroState();
      return;
    }

    if (player.isDucking && this.canDuck()) {
      player.animationTime += deltaTime;
      if (player.animationTime >= DINO_DUCK_FRAME_DURATION) {
        player.animationTime = 0;
        player.duckFrame = player.duckFrame === 0 ? 1 : 0;
      }
      this.setPlayerHeight(player.duckHeight);
      player.state = PLAYER_DUCKING;
      return;
    }

    this.setPlayerHeight(player.standingHeight);

    if (this.state === STATE_RUNNING && !this.isIntroPlaying) {
      player.animationTime += deltaTime;
      if (player.animationTime >= DINO_RUN_FRAME_DURATION) {
        player.animationTime = 0;
        player.runFrame = player.runFrame === 0 ? 1 : 0;
      }
      player.state = PLAYER_RUNNING;
      return;
    }

    player.runFrame = player.idleFrame;
    player.animationTime = 0;
    player.state = PLAYER_IDLE;
  }

  updateGround(deltaTime) {
    this.groundDistance += this.worldSpeed * deltaTime;
    this.groundOffset = this.groundDistance % SPRITE_HORIZON_SEGMENT_WIDTH;
  }

  getAvailableObstacleDefinitions() {
    return OBSTACLE_DEFINITIONS.filter((definition) => this.worldSpeedFrames >= definition.minSpeed);
  }

  createObstacle(definition) {
    const y = Array.isArray(definition.yPositions)
      ? pickRandom(definition.yPositions) ?? definition.y
      : definition.y;

    return {
      id: `${definition.id}-${this.frameCount}`,
      definition,
      definitionId: definition.id,
      type: definition.type,
      x: this.width + OBSTACLE_SPAWN_OFFSET_X,
      y,
      width: definition.width,
      height: definition.height,
      hitboxes: definition.hitboxes,
      gap: this.getNextSpawnGap(definition),
      passed: false,
      flapFrame: 0,
      animationTime: 0,
    };
  }

  chooseNextObstacle() {
    const available = this.getAvailableObstacleDefinitions();
    if (available.length === 0) {
      return null;
    }

    const pool = available.filter((definition) => {
      if (this.obstacleHistory.length < OBSTACLE_MAX_DUPLICATION) {
        return true;
      }

      const recent = this.obstacleHistory.slice(-OBSTACLE_MAX_DUPLICATION);
      return recent.some((recentId) => recentId !== definition.id);
    });

    return pickRandom(pool.length > 0 ? pool : available);
  }

  getNextSpawnGap(definition) {
    const minGap = Math.round(
      definition.width * this.worldSpeedFrames + definition.minGap * OBSTACLE_GAP_COEFFICIENT
    );
    const maxGap = Math.round(minGap * OBSTACLE_MAX_GAP_COEFFICIENT);
    return randomBetween(minGap, Math.max(minGap + 1, maxGap));
  }

  updateObstacles(deltaTime) {
    for (const obstacle of this.obstacles) {
      obstacle.x -= (this.worldSpeed + (obstacle.definition.speedOffset || 0)) * deltaTime;

      if (obstacle.type === "bird") {
        obstacle.animationTime += deltaTime;
        if (obstacle.animationTime >= (obstacle.definition.frameDuration || 0.14)) {
          obstacle.animationTime = 0;
          obstacle.flapFrame = obstacle.flapFrame === 0 ? 1 : 0;
        }
      }
    }

    if (this.runningTime >= OBSTACLE_CLEAR_TIME) {
      const lastObstacle = this.obstacles[this.obstacles.length - 1] || null;
      const readyForNext = !lastObstacle || lastObstacle.x + lastObstacle.width + lastObstacle.gap < this.width;

      if (readyForNext) {
        const nextDefinition = this.chooseNextObstacle();
        if (nextDefinition) {
          const obstacle = this.createObstacle(nextDefinition);
          this.obstacles.push(obstacle);
          this.obstacleHistory.push(obstacle.definitionId);
          if (this.obstacleHistory.length > OBSTACLE_MAX_DUPLICATION) {
            this.obstacleHistory.shift();
          }
        }
      }
    }

    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -8);
  }

  getPlayerHitboxes() {
    const player = this.player;
    const preset = player.isDucking && player.isOnGround ? PLAYER_HITBOX.ducking : PLAYER_HITBOX.standing;
    const drawX = player.isDucking && player.isOnGround ? player.x + DINO_DUCK_DRAW_OFFSET_X : player.x;
    const drawY = player.isDucking && player.isOnGround ? GROUND_Y - TREX_FRAME_HEIGHT : player.y;

    return preset.map((box) => ({
      x: drawX + box.x,
      y: drawY + box.y,
      width: box.width,
      height: box.height,
    }));
  }

  getObstacleHitboxes(obstacle) {
    return obstacle.hitboxes.map((box) => ({
      x: obstacle.x + box.x,
      y: obstacle.y + box.y,
      width: box.width,
      height: box.height,
    }));
  }

  triggerGameOver() {
    this.state = STATE_GAMEOVER;
    this.player.velocityY = 0;
    this.player.isJumping = false;
    this.player.isDucking = false;
    this.player.isOnGround = this.player.y >= GROUND_Y - this.player.standingHeight;
    this.player.gravity = GRAVITY;
    this.player.width = TREX_FRAME_WIDTH;
    this.player.height = TREX_FRAME_HEIGHT;
    this.player.state = PLAYER_GAMEOVER;
    this.player.animationTime = 0;
    this.player.runFrame = 0;
    this.gameOverTimer = 0;
    if (this.score > this.highScore) {
      this.setHighScore(this.score);
    }
    this.showStatus("GAME OVER");
    this.playAudio("playHit");
  }

  checkCollisions() {
    const playerHitboxes = this.getPlayerHitboxes();
    const playerOuterBox = trimCollisionBox({
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height,
    }, COLLISION_BOX_TRIM);

    for (const obstacle of this.obstacles) {
      const obstacleOuterBox = trimCollisionBox({
        x: obstacle.x,
        y: obstacle.y,
        width: obstacle.width,
        height: obstacle.height,
      }, COLLISION_BOX_TRIM);

      if (!intersects(playerOuterBox, obstacleOuterBox)) {
        continue;
      }

      const obstacleHitboxes = this.getObstacleHitboxes(obstacle);
      for (const playerHitbox of playerHitboxes) {
        for (const obstacleHitbox of obstacleHitboxes) {
          if (intersects(playerHitbox, obstacleHitbox)) {
            this.triggerGameOver();
            return;
          }
        }
      }
    }
  }

  updateDistance(deltaTime) {
    this.distanceRan += this.worldSpeed * deltaTime;
  }

  updateScore() {
    const nextScore = Math.max(0, Math.round(this.distanceRan * DISTANCE_SCORE_COEFFICIENT));

    if (nextScore <= this.score) {
      return;
    }

    this.score = nextScore;

    if (Math.floor(this.score / SCORE_SOUND_MILESTONE) > Math.floor(this.lastScoreSoundScore / SCORE_SOUND_MILESTONE)) {
      this.lastScoreSoundScore = this.score;
      this.scoreFlashActive = true;
      this.scoreFlashTimer = 0;
      this.scoreFlashIteration = 1;
      this.playAudio("playScore");
    }
  }

  updateScoreFlash(deltaTime) {
    if (!this.scoreFlashActive) {
      return;
    }

    this.scoreFlashTimer += deltaTime;
    if (this.scoreFlashTimer < SCORE_FLASH_DURATION) {
      return;
    }

    this.scoreFlashTimer = 0;
    this.scoreFlashIteration += 1;

    if (this.scoreFlashIteration >= SCORE_FLASH_ITERATIONS * 2) {
      this.scoreFlashActive = false;
      this.scoreFlashIteration = 0;
    }
  }

  shouldRenderCurrentScore() {
    if (!this.scoreFlashActive) {
      return true;
    }

    return this.scoreFlashIteration % 2 === 0;
  }

  update(deltaTime) {
    this.lastDelta = deltaTime;
    this.elapsed += deltaTime;
    this.frameCount++;
    this.updateStatus(deltaTime);
    this.updateScoreFlash(deltaTime);

    if (this.state === STATE_GAMEOVER) {
      this.gameOverTimer += deltaTime;
      this.applyThemeToDom();
      return;
    }

    if (this.state === STATE_RUNNING) {
      this.runningTime += deltaTime;
      this.updateDifficulty(deltaTime);
      this.updateGround(deltaTime);
      this.updateBackground(deltaTime);
      this.updateObstacles(deltaTime);
    }

    this.updatePlayer(deltaTime);

    if (this.state === STATE_RUNNING) {
      this.checkCollisions();
      if (this.state === STATE_RUNNING) {
        this.updateDistance(deltaTime);
        this.updateScore();
      }
      this.updateTheme();
    }
  }

  renderBackground(theme) {
    const ctx = this.ctx;

    for (const cloud of this.background.clouds) {
      this.drawSprite(
        SPRITE_CLOUD_X,
        SPRITE_CLOUD_Y,
        SPRITE_CLOUD_WIDTH,
        SPRITE_CLOUD_HEIGHT,
        Math.round(cloud.x),
        Math.round(cloud.y),
        SPRITE_CLOUD_WIDTH,
        SPRITE_CLOUD_HEIGHT
      );
    }

    if (!theme.showNightDecor) {
      return;
    }

    for (const star of this.background.stars) {
      const twinkle = Math.sin(this.elapsed * 2.3 + star.blinkOffset);
      ctx.globalAlpha = 0.35 + (twinkle + 1) * 0.18;
      this.drawSprite(
        SPRITE_STAR_X,
        SPRITE_STAR_Y,
        SPRITE_STAR_WIDTH,
        SPRITE_STAR_HEIGHT,
        Math.round(star.x),
        Math.round(star.y),
        SPRITE_STAR_WIDTH,
        SPRITE_STAR_HEIGHT
      );
    }
    ctx.globalAlpha = 1;

    this.drawSprite(
      SPRITE_MOON_X + SPRITE_MOON_WIDTH * this.background.moon.phase,
      SPRITE_MOON_Y,
      SPRITE_MOON_WIDTH,
      SPRITE_MOON_HEIGHT,
      Math.round(this.background.moon.x),
      Math.round(this.background.moon.y),
      SPRITE_MOON_WIDTH,
      SPRITE_MOON_HEIGHT
    );
  }

  renderGround(theme) {
    const segmentWidth = SPRITE_HORIZON_SEGMENT_WIDTH;
    const firstX = -Math.floor(this.groundOffset);
    const firstSegmentIndex = Math.floor(this.groundDistance / segmentWidth);

    for (let segment = 0; segment < 3; segment += 1) {
      const segmentIndex = firstSegmentIndex + segment;
      const sourceX = SPRITE_HORIZON_X + (segmentIndex % 2 === 0 ? 0 : segmentWidth);
      const destX = firstX + segment * segmentWidth;

      this.drawSprite(
        sourceX,
        SPRITE_HORIZON_Y,
        segmentWidth,
        SPRITE_HORIZON_HEIGHT,
        destX,
        SPRITE_HORIZON_DRAW_Y,
        segmentWidth,
        SPRITE_HORIZON_HEIGHT
      );
    }
  }

  drawSprite(sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, color = null) {
    const ctx = this.ctx;

    if (!this.spriteImage || !this.spriteImage.complete || this.spriteImage.naturalWidth === 0) {
      ctx.fillStyle = color || "#535353";
      ctx.fillRect(destX, destY, destWidth, destHeight);
      return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (color) {
      ctx.fillStyle = color;
    }
    ctx.drawImage(
      this.spriteImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      destX,
      destY,
      destWidth,
      destHeight
    );
    ctx.restore();
  }

  renderObstacleSprite(obstacle, color) {
    const frameOffset = obstacle.type === "bird" && obstacle.definition.frameGap
      ? obstacle.definition.frameGap * obstacle.flapFrame
      : 0;

    this.drawSprite(
      obstacle.definition.spriteX + frameOffset,
      obstacle.definition.spriteY,
      obstacle.definition.sourceWidth,
      obstacle.definition.sourceHeight,
      Math.round(obstacle.x),
      Math.round(obstacle.y),
      obstacle.width,
      obstacle.height,
      color
    );
  }

  renderObstacles(theme) {
    for (const obstacle of this.obstacles) {
      this.renderObstacleSprite(obstacle, theme.spriteColor);
    }
  }

  renderPlayer(theme) {
    const ctx = this.ctx;
    const player = this.player;
    const introProgress = this.isIntroPlaying ? clamp(this.introTimer / INTRO_DURATION, 0, 1) : 1;
    const x = player.x - Math.round((1 - introProgress) * INTRO_RUNNER_OFFSET);
    const y = player.y;

    if (!this.spriteImage || !this.spriteImage.complete) {
      ctx.fillStyle = theme.spriteColor;
      ctx.fillRect(x, y, player.width, player.height);
      return;
    }

    let frameOffsetX = TREX_IDLE_X;
    let sourceWidth = TREX_FRAME_WIDTH;
    let sourceHeight = TREX_FRAME_HEIGHT;
    let drawWidth = player.width;
    let drawHeight = player.height;
    let drawY = y;

    if (player.state === PLAYER_JUMPING) {
      frameOffsetX = TREX_JUMP_X;
    } else if (player.state === PLAYER_GAMEOVER) {
      frameOffsetX = TREX_CRASHED_X;
      drawWidth = TREX_FRAME_WIDTH;
      drawHeight = TREX_FRAME_HEIGHT;
    } else if (player.state === PLAYER_DUCKING) {
      frameOffsetX = player.duckFrame === 0 ? TREX_DUCK_1_X : TREX_DUCK_2_X;
      sourceWidth = TREX_DUCK_FRAME_WIDTH;
      sourceHeight = TREX_DUCK_FRAME_HEIGHT;
      drawWidth = TREX_DUCK_FRAME_WIDTH;
      drawHeight = TREX_FRAME_HEIGHT;
      drawY = GROUND_Y - TREX_FRAME_HEIGHT;
    } else if (player.state === PLAYER_RUNNING) {
      frameOffsetX = player.runFrame === 0 ? TREX_RUN_1_X : TREX_RUN_2_X;
    } else if (player.state === PLAYER_IDLE) {
      frameOffsetX = player.waitingFrame === 1 ? TREX_JUMP_X : TREX_IDLE_X;
    }

    const drawX = player.state === PLAYER_DUCKING
      ? x + DINO_DUCK_DRAW_OFFSET_X
      : x;

    this.drawSprite(
      TREX_SPRITE_X + frameOffsetX,
      TREX_SPRITE_Y,
      sourceWidth,
      sourceHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );
  }

  renderScore(theme) {
    if (this.state === STATE_IDLE) {
      return;
    }

    const scoreText = this.formatScore(this.score);
    const highScoreText = this.highScore > 0 ? `HI ${this.formatScore(this.highScore)}` : "";
    const digitGap = 1;
    const drawY = 5;
    let drawX = this.width - 10 - scoreText.length * (SPRITE_DIGIT_WIDTH + digitGap);

    if (this.shouldRenderCurrentScore()) {
      for (const character of scoreText) {
        this.drawScoreGlyph(character, drawX, drawY, theme.spriteColor);
        drawX += SPRITE_DIGIT_WIDTH + digitGap;
      }
    }

    if (highScoreText) {
      let hiDrawX = this.width - 10 - (scoreText.length + highScoreText.length + 2) * (SPRITE_DIGIT_WIDTH + digitGap);
      for (const character of highScoreText) {
        if (character !== " ") {
          this.drawScoreGlyph(character, hiDrawX, drawY, theme.spriteColor);
        }
        hiDrawX += SPRITE_DIGIT_WIDTH + digitGap;
      }
    }
  }

  drawScoreGlyph(character, x, y, color) {
    const glyphIndex = character === "H" ? 10 : character === "I" ? 11 : Number.parseInt(character, 10);
    if (!Number.isFinite(glyphIndex)) {
      return;
    }

    this.drawSprite(
      SPRITE_DIGITS_X + glyphIndex * SPRITE_DIGIT_WIDTH,
      SPRITE_DIGITS_Y,
      SPRITE_DIGIT_WIDTH,
      SPRITE_DIGIT_HEIGHT,
      Math.round(x),
      y,
      SPRITE_DIGIT_WIDTH,
      SPRITE_DIGIT_HEIGHT,
      color
    );
  }

  renderGameOver(theme) {
    if (this.state !== STATE_GAMEOVER) {
      return;
    }

    this.drawSprite(
      SPRITE_GAME_OVER_X,
      SPRITE_GAME_OVER_Y,
      SPRITE_GAME_OVER_WIDTH,
      SPRITE_GAME_OVER_HEIGHT,
      Math.round(this.width / 2 - SPRITE_GAME_OVER_WIDTH / 2),
      SPRITE_GAME_OVER_DRAW_Y,
      SPRITE_GAME_OVER_WIDTH,
      SPRITE_GAME_OVER_HEIGHT
    );
    if (this.canRestart()) {
      this.drawSprite(
        SPRITE_RESTART_X,
        SPRITE_RESTART_Y,
        SPRITE_RESTART_WIDTH,
        SPRITE_RESTART_HEIGHT,
        Math.round(this.width / 2 - SPRITE_RESTART_WIDTH / 2),
        SPRITE_RESTART_DRAW_Y,
        SPRITE_RESTART_WIDTH,
        SPRITE_RESTART_HEIGHT
      );
    }
  }

  renderDebug(theme) {
    if (!this.debugVisible) {
      return;
    }

    const ctx = this.ctx;
    const playerHitboxes = this.getPlayerHitboxes();

    ctx.strokeStyle = theme.accentColor;
    for (const playerHitbox of playerHitboxes) {
      ctx.strokeRect(playerHitbox.x, playerHitbox.y, playerHitbox.width, playerHitbox.height);
    }
    for (const obstacle of this.obstacles) {
      for (const hitbox of this.getObstacleHitboxes(obstacle)) {
        ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      }
    }

    ctx.fillStyle = theme.textColor;
    ctx.font = `${DEBUG_FONT_SIZE}px "Courier New", Courier, monospace`;
    ctx.textBaseline = "top";
    ctx.fillText(`Frame: ${this.frameCount} Time: ${this.elapsed.toFixed(1)}s`, 24, 8);
    ctx.fillText(`State: ${this.state} Player: ${this.player.state}`, 24, 24);
    ctx.fillText(`Speed: ${this.worldSpeed.toFixed(0)} Obstacles: ${this.obstacles.length}`, 24, 40);
  }

  render() {
    const ctx = this.ctx;
    const theme = this.getActiveTheme();

    this.applyThemeToDom();

    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = theme.skyColor;
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderBackground(theme);
    this.renderGround(theme);
    this.renderObstacles(theme);
    this.renderPlayer(theme);
    this.renderGameOver(theme);
    this.renderDebug(theme);
    this.renderScore(theme);
  }

  resize() {
    const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    this.canvas.width = CANVAS_WIDTH * ratio;
    this.canvas.height = CANVAS_HEIGHT * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = CANVAS_WIDTH;
    this.height = CANVAS_HEIGHT;
  }

  resetTiming() {
    this.lastDelta = 0;
  }
}

window.DinoGame = Game;
})();
