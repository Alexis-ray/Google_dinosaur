(() => {
const {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEBUG_FONT_SIZE,
  SCORE_DIGITS,
  SCORE_PER_SECOND,
  SCORE_SOUND_MILESTONE,
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
  DINO_RUN_FRAME_DURATION,
  DINO_DUCK_FRAME_DURATION,
  GRAVITY,
  JUMP_VELOCITY,
  FAST_FALL_GRAVITY_MULTIPLIER,
  JUMP_RELEASE_GRAVITY_MULTIPLIER,
  GROUND_Y,
  WORLD_START_SPEED,
  WORLD_MAX_SPEED,
  WORLD_ACCELERATION_PER_SCORE,
  GROUND_PATTERN_WIDTH,
  GROUND_PATTERN_HEIGHT,
  GROUND_PATTERN_GAP,
  GROUND_PATTERN_OFFSET_Y,
  PLAYER_HITBOX,
  OBSTACLE_SPAWN_OFFSET_X,
  OBSTACLE_INITIAL_SPAWN_DISTANCE,
  OBSTACLE_MIN_GAP,
  OBSTACLE_MAX_GAP,
  OBSTACLE_GAP_SPEED_REDUCTION,
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
} = window.DinoConfig;

const storageApi = window.DinoStorage;
const SPRITE_TINT_CACHE_LIMIT = 96;

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
    this.spriteTintCache = new Map();

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
      runFrame: 0,
      duckFrame: 0,
      animationTime: 0,
      state: PLAYER_IDLE,
    };
  }

  resetRunState() {
    this.worldSpeed = WORLD_START_SPEED;
    this.groundOffset = 0;
    this.obstacles = [];
    this.obstacleDistanceRemaining = OBSTACLE_INITIAL_SPAWN_DISTANCE;
    this.score = 0;
    this.scoreAccumulator = 0;
    this.lastScoreSoundScore = 0;
    this.player = this.createPlayer();
    this.background = this.createBackground();
    this.clearStatus();
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

  startRun() {
    if (this.state === STATE_IDLE) {
      this.state = STATE_RUNNING;
      this.player.state = PLAYER_RUNNING;
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
      this.restartGame();
      return true;
    }

    if (this.state === STATE_IDLE) {
      this.startRun();
      return this.jump();
    }

    return this.jump();
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
    return {
      ...THEMES.day,
      showNightDecor: false,
    };
  }

  applyThemeToDom() {
    const theme = this.getActiveTheme();

    this.root.style.setProperty("--bg-color", theme.skyColor);
    this.root.style.setProperty("--game-bg", theme.skyColor);
    this.root.style.setProperty("--text-color", theme.textColor);
    this.root.style.setProperty("--accent-color", theme.accentColor);
    this.root.style.setProperty("--hint-color", theme.hintColor);
    this.root.style.setProperty("--border-color", theme.borderColor);
    this.root.style.setProperty("--button-bg", theme.buttonBg);
    this.root.style.setProperty("--button-hover-bg", theme.buttonHoverBg);
  }

  updateTheme() {
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

  updateDifficulty() {
    this.worldSpeed = clamp(
      WORLD_START_SPEED + this.score * WORLD_ACCELERATION_PER_SCORE,
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
          player.state = this.state === STATE_RUNNING ? PLAYER_RUNNING : PLAYER_IDLE;
        }

        return;
      }

      player.state = PLAYER_JUMPING;
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

    if (this.state === STATE_RUNNING) {
      player.animationTime += deltaTime;
      if (player.animationTime >= DINO_RUN_FRAME_DURATION) {
        player.animationTime = 0;
        player.runFrame = player.runFrame === 0 ? 1 : 0;
      }
      player.state = PLAYER_RUNNING;
      return;
    }

    player.runFrame = 0;
    player.animationTime = 0;
    player.state = PLAYER_IDLE;
  }

  updateGround(deltaTime) {
    this.groundOffset = (this.groundOffset + this.worldSpeed * deltaTime) % SPRITE_HORIZON_SEGMENT_WIDTH;
  }

  getAvailableObstacleDefinitions() {
    return OBSTACLE_DEFINITIONS.filter((definition) => this.score >= definition.minScore);
  }

  createObstacle(definition) {
    return {
      id: `${definition.id}-${this.frameCount}`,
      definition,
      definitionId: definition.id,
      type: definition.type,
      x: this.width + OBSTACLE_SPAWN_OFFSET_X,
      y: definition.y,
      width: definition.width,
      height: definition.height,
      hitbox: definition.hitbox,
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

    const previous = this.obstacles[this.obstacles.length - 1] || null;
    const pool = available.filter((definition) => {
      if (!previous) {
        return true;
      }

      if (previous.definitionId === "bird-low" && definition.id === "bird-low") {
        return false;
      }

      if (previous.type === "bird" && definition.type === "bird" && this.score < 420) {
        return false;
      }

      return true;
    });

    return pickRandom(pool.length > 0 ? pool : available);
  }

  getNextSpawnGap(definition) {
    const speedFactor = (this.worldSpeed - WORLD_START_SPEED) / Math.max(1, WORLD_MAX_SPEED - WORLD_START_SPEED);
    const gapReduction = OBSTACLE_GAP_SPEED_REDUCTION * clamp(speedFactor, 0, 1);
    const minGap = Math.max(205, OBSTACLE_MIN_GAP - gapReduction);
    const maxGap = Math.max(minGap + 60, OBSTACLE_MAX_GAP - gapReduction * 0.8);
    let gap = minGap + Math.random() * (maxGap - minGap);

    if (definition.type === "bird") {
      gap += 54;
    }

    if (definition.id === "bird-low") {
      gap += 48;
    }

    return gap;
  }

  updateObstacles(deltaTime) {
    this.obstacleDistanceRemaining -= this.worldSpeed * deltaTime;

    if (this.obstacleDistanceRemaining <= 0) {
      const nextDefinition = this.chooseNextObstacle();
      if (nextDefinition) {
        this.obstacles.push(this.createObstacle(nextDefinition));
        this.obstacleDistanceRemaining = this.getNextSpawnGap(nextDefinition);
      }
    }

    for (const obstacle of this.obstacles) {
      obstacle.x -= this.worldSpeed * deltaTime;

      if (obstacle.type === "bird") {
        obstacle.animationTime += deltaTime;
        if (obstacle.animationTime >= 0.14) {
          obstacle.animationTime = 0;
          obstacle.flapFrame = obstacle.flapFrame === 0 ? 1 : 0;
        }
      }
    }

    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -8);
  }

  getPlayerHitbox() {
    const player = this.player;
    const preset = player.isDucking && player.isOnGround ? PLAYER_HITBOX.ducking : PLAYER_HITBOX.standing;
    return {
      x: player.x + preset.insetX,
      y: player.y + preset.insetTop,
      width: player.width - preset.insetX * 2,
      height: player.height - preset.insetTop - preset.insetBottom,
    };
  }

  getObstacleHitbox(obstacle) {
    return {
      x: obstacle.x + obstacle.hitbox.insetX,
      y: obstacle.y + obstacle.hitbox.insetTop,
      width: obstacle.width - obstacle.hitbox.insetX * 2,
      height: obstacle.height - obstacle.hitbox.insetTop - obstacle.hitbox.insetBottom,
    };
  }

  intersects(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  triggerGameOver() {
    this.state = STATE_GAMEOVER;
    this.player.velocityY = 0;
    this.player.isJumping = false;
    this.player.isDucking = false;
    this.player.gravity = GRAVITY;
    this.setPlayerHeight(this.player.standingHeight);
    this.player.state = PLAYER_GAMEOVER;
    this.player.animationTime = 0;
    this.player.runFrame = 0;
    this.showStatus("GAME OVER");
    this.playAudio("playHit");
  }

  checkCollisions() {
    const playerHitbox = this.getPlayerHitbox();

    for (const obstacle of this.obstacles) {
      if (this.intersects(playerHitbox, this.getObstacleHitbox(obstacle))) {
        this.triggerGameOver();
        return;
      }
    }
  }

  updateScore(deltaTime) {
    this.scoreAccumulator += SCORE_PER_SECOND * deltaTime;
    const nextScore = Math.floor(this.scoreAccumulator);

    if (nextScore <= this.score) {
      return;
    }

    const previousHighScore = this.highScore;
    this.score = nextScore;

    if (Math.floor(this.score / SCORE_SOUND_MILESTONE) > Math.floor(this.lastScoreSoundScore / SCORE_SOUND_MILESTONE)) {
      this.lastScoreSoundScore = this.score;
      this.playAudio("playScore");
    }

    if (this.score > this.highScore) {
      this.setHighScore(this.score);
      if (previousHighScore > 0 && previousHighScore < this.score) {
        this.playAudio("playHighScore");
      }
    }
  }

  update(deltaTime) {
    this.lastDelta = deltaTime;
    this.elapsed += deltaTime;
    this.frameCount++;
    this.updateStatus(deltaTime);

    if (this.state === STATE_GAMEOVER) {
      this.updateTheme(deltaTime);
      return;
    }

    if (this.state === STATE_RUNNING) {
      this.updateDifficulty();
      this.updateGround(deltaTime);
      this.updateBackground(deltaTime);
      this.updateObstacles(deltaTime);
      this.updateTheme(deltaTime);
    }

    this.updatePlayer(deltaTime);

    if (this.state === STATE_RUNNING) {
      this.checkCollisions();
      if (this.state === STATE_RUNNING) {
        this.updateScore(deltaTime);
      }
    }
  }

  renderBackground(theme) {
    const ctx = this.ctx;

    for (const cloud of this.background.clouds) {
      this.drawTintedSprite(
        SPRITE_CLOUD_X,
        SPRITE_CLOUD_Y,
        SPRITE_CLOUD_WIDTH,
        SPRITE_CLOUD_HEIGHT,
        Math.round(cloud.x),
        Math.round(cloud.y),
        SPRITE_CLOUD_WIDTH,
        SPRITE_CLOUD_HEIGHT,
        theme.spriteColor
      );
    }

    if (!theme.showNightDecor) {
      return;
    }

    for (const star of this.background.stars) {
      const twinkle = Math.sin(this.elapsed * 2.3 + star.blinkOffset);
      ctx.globalAlpha = 0.35 + (twinkle + 1) * 0.18;
      this.drawTintedSprite(
        SPRITE_STAR_X,
        SPRITE_STAR_Y,
        SPRITE_STAR_WIDTH,
        SPRITE_STAR_HEIGHT,
        Math.round(star.x),
        Math.round(star.y),
        SPRITE_STAR_WIDTH,
        SPRITE_STAR_HEIGHT,
        theme.spriteColor
      );
    }
    ctx.globalAlpha = 1;

    this.drawTintedSprite(
      SPRITE_MOON_X + SPRITE_MOON_WIDTH * this.background.moon.phase,
      SPRITE_MOON_Y,
      SPRITE_MOON_WIDTH,
      SPRITE_MOON_HEIGHT,
      Math.round(this.background.moon.x),
      Math.round(this.background.moon.y),
      SPRITE_MOON_WIDTH,
      SPRITE_MOON_HEIGHT,
      theme.spriteColor
    );
  }

  renderGround(theme) {
    const segmentWidth = SPRITE_HORIZON_SEGMENT_WIDTH;
    const firstX = -Math.floor(this.groundOffset);
    const secondX = firstX + segmentWidth;

    this.drawTintedSprite(
      SPRITE_HORIZON_X,
      SPRITE_HORIZON_Y,
      segmentWidth,
      SPRITE_HORIZON_HEIGHT,
      firstX,
      SPRITE_HORIZON_DRAW_Y,
      segmentWidth,
      SPRITE_HORIZON_HEIGHT,
      theme.spriteColor
    );

    this.drawTintedSprite(
      SPRITE_HORIZON_X + segmentWidth,
      SPRITE_HORIZON_Y,
      segmentWidth,
      SPRITE_HORIZON_HEIGHT,
      secondX,
      SPRITE_HORIZON_DRAW_Y,
      segmentWidth,
      SPRITE_HORIZON_HEIGHT,
      theme.spriteColor
    );

    if (secondX < this.width) {
      this.drawTintedSprite(
        SPRITE_HORIZON_X,
        SPRITE_HORIZON_Y,
        segmentWidth,
        SPRITE_HORIZON_HEIGHT,
        secondX + segmentWidth,
        SPRITE_HORIZON_DRAW_Y,
        segmentWidth,
        SPRITE_HORIZON_HEIGHT,
        theme.spriteColor
      );
    }
  }

  getTintedSprite(sourceX, sourceY, sourceWidth, sourceHeight, color) {
    if (!this.spriteImage || !this.spriteImage.complete || this.spriteImage.naturalWidth === 0) {
      return null;
    }

    const cacheKey = `${sourceX},${sourceY},${sourceWidth},${sourceHeight},${color}`;
    const cached = this.spriteTintCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = sourceWidth;
    spriteCanvas.height = sourceHeight;

    const spriteCtx = spriteCanvas.getContext("2d");
    if (!spriteCtx) {
      return null;
    }

    spriteCtx.imageSmoothingEnabled = false;
    spriteCtx.drawImage(
      this.spriteImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );

    const spriteData = spriteCtx.getImageData(0, 0, sourceWidth, sourceHeight);
    const pixels = spriteData.data;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];

      if (alpha === 0 || (red < 10 && green < 10 && blue < 10)) {
        pixels[index + 3] = 0;
      } else {
        pixels[index] = 255;
        pixels[index + 1] = 255;
        pixels[index + 2] = 255;
        pixels[index + 3] = 255;
      }
    }

    spriteCtx.clearRect(0, 0, sourceWidth, sourceHeight);
    spriteCtx.putImageData(spriteData, 0, 0);
    spriteCtx.globalCompositeOperation = "source-in";
    spriteCtx.fillStyle = color;
    spriteCtx.fillRect(0, 0, sourceWidth, sourceHeight);

    if (this.spriteTintCache.size >= SPRITE_TINT_CACHE_LIMIT) {
      this.spriteTintCache.delete(this.spriteTintCache.keys().next().value);
    }
    this.spriteTintCache.set(cacheKey, spriteCanvas);

    return spriteCanvas;
  }

  drawTintedSprite(sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, color) {
    const ctx = this.ctx;

    const tintedSprite = this.getTintedSprite(sourceX, sourceY, sourceWidth, sourceHeight, color);
    if (!tintedSprite) {
      ctx.fillStyle = color;
      ctx.fillRect(destX, destY, destWidth, destHeight);
      return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      tintedSprite,
      0,
      0,
      sourceWidth,
      sourceHeight,
      destX,
      destY,
      destWidth,
      destHeight
    );
  }

  renderObstacleSprite(obstacle, color) {
    const frameOffset = obstacle.type === "bird" && obstacle.definition.frameGap
      ? obstacle.definition.frameGap * obstacle.flapFrame
      : 0;

    this.drawTintedSprite(
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
    const x = player.x;
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

    if (player.state === PLAYER_JUMPING) {
      frameOffsetX = TREX_JUMP_X;
    } else if (player.state === PLAYER_DUCKING) {
      frameOffsetX = player.duckFrame === 0 ? TREX_DUCK_1_X : TREX_DUCK_2_X;
      sourceWidth = TREX_DUCK_FRAME_WIDTH;
      sourceHeight = TREX_DUCK_FRAME_HEIGHT;
      drawWidth = 59;
    } else if (player.state === PLAYER_RUNNING) {
      frameOffsetX = player.runFrame === 0 ? TREX_RUN_1_X : TREX_RUN_2_X;
    }

    this.drawTintedSprite(
      TREX_SPRITE_X + frameOffsetX,
      TREX_SPRITE_Y,
      sourceWidth,
      sourceHeight,
      x,
      y,
      drawWidth,
      player.height,
      theme.spriteColor
    );
  }

  renderScore(theme) {
    const scoreText = this.formatScore(this.score);
    const highScoreText = this.highScore > 0 ? `HI ${this.formatScore(this.highScore)}` : "";
    const digitGap = 1;
    const drawY = 12;
    let drawX = this.width - 16 - scoreText.length * (SPRITE_DIGIT_WIDTH + digitGap);

    for (const character of scoreText) {
      this.drawScoreGlyph(character, drawX, drawY, theme.spriteColor);
      drawX += SPRITE_DIGIT_WIDTH + digitGap;
    }

    if (highScoreText) {
      drawX = this.width - 164 - highScoreText.length * (SPRITE_DIGIT_WIDTH + digitGap);
      for (const character of highScoreText) {
        if (character !== " ") {
          this.drawScoreGlyph(character, drawX, drawY, theme.spriteColor);
        }
        drawX += SPRITE_DIGIT_WIDTH + digitGap;
      }
    }
  }

  drawScoreGlyph(character, x, y, color) {
    const glyphIndex = character === "H" ? 10 : character === "I" ? 11 : Number.parseInt(character, 10);
    if (!Number.isFinite(glyphIndex)) {
      return;
    }

    this.drawTintedSprite(
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

    this.drawTintedSprite(
      SPRITE_GAME_OVER_X,
      SPRITE_GAME_OVER_Y,
      SPRITE_GAME_OVER_WIDTH,
      SPRITE_GAME_OVER_HEIGHT,
      Math.round(this.width / 2 - SPRITE_GAME_OVER_WIDTH / 2),
      40,
      SPRITE_GAME_OVER_WIDTH,
      SPRITE_GAME_OVER_HEIGHT,
      theme.spriteColor
    );
    this.drawTintedSprite(2, 2, 36, 32, Math.round(this.width / 2 - 18), 70, 36, 32, theme.spriteColor);
  }

  renderDebug(theme) {
    if (!this.debugVisible) {
      return;
    }

    const ctx = this.ctx;
    const playerHitbox = this.getPlayerHitbox();

    ctx.strokeStyle = theme.accentColor;
    ctx.strokeRect(playerHitbox.x, playerHitbox.y, playerHitbox.width, playerHitbox.height);
    for (const obstacle of this.obstacles) {
      const hitbox = this.getObstacleHitbox(obstacle);
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
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
