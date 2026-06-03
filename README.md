# Google Dinosaur

A lightweight, browser-based recreation of the Chrome offline Dino game built with native Canvas and plain JavaScript.

This project focuses on the feel of `chrome://dino` without adding a framework, build step, or extra UI. The game runs from a single HTML page, uses one sprite atlas, stores the high score locally, and supports both keyboard and touch input.

## Features

- Native Canvas rendering with no framework or bundler
- Sprite-based Dino, obstacles, score digits, and game-over banner
- Keyboard and touch controls for desktop and mobile play
- Increasing game speed and obstacle variety as the score rises
- Local high-score persistence via `localStorage`
- Lightweight generated sound effects using the Web Audio API
- Simple codebase that is easy to tune and extend

## Controls

### Keyboard

- `Space`, `ArrowUp`, or `W`: jump / start / restart
- `ArrowDown` or `S`: duck

### Touch / Pointer

- Tap or click: jump / start / restart
- On touch devices while running, press the lower part of the canvas: duck
- Release touch or pointer: stop ducking / release jump

## Quick Start

This is a static project. No install step is required.

1. Clone or download the repository.
2. Start a local static server from the project root.
3. Open the served URL in a modern browser.

Example with Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Alternative with Node.js:

```bash
npx serve .
```

Directly opening `index.html` with `file://` may work in some browsers, but a local static server is the reliable way to run the game.

## Gameplay Notes

- The run starts when the player first jumps.
- World speed increases over time with score progression.
- Obstacles begin with cacti and later introduce birds.
- High score is saved in the browser under the `dino-high-score` storage key.
- Score and game-over rendering are drawn inside the canvas to match the minimalist Chrome Dino presentation.

## Project Structure

```text
.
├── index.html          # Page shell and script loading order
├── styles.css          # Minimal page layout and canvas presentation
├── offline-sprite.png  # Main sprite atlas used by the game
└── src
    ├── audio.js        # Web Audio sound effect manager
    ├── config.js       # Physics, sizing, sprites, themes, obstacle config
    ├── game.js         # Core game loop, rendering, state, collision, scoring
    ├── main.js         # Bootstrap, input binding, animation frame loop
    └── storage.js      # High-score persistence wrapper
```

## Customization

If you want to tune the game feel or make it closer to the original Chrome Dino, start with `src/config.js`.

Useful areas to tweak include:

- jump velocity and gravity
- world speed and acceleration
- obstacle spacing and unlock thresholds
- sprite coordinates and visual theme colors

For gameplay or render behavior changes, `src/game.js` is the main implementation file.

## Debugging

At runtime, the game instance is exposed as:

```js
window.__dinoGameDebug
```

This is useful for inspecting state in the browser console while tuning physics or validating behavior.

## Browser Support

The game targets modern browsers with Canvas 2D, `localStorage`, Pointer Events, and Web Audio API support. Audio unlock behavior follows standard browser restrictions and activates after user interaction.

## Contributing

Issues and pull requests are welcome. If you plan to modify gameplay feel, try to keep changes aligned with the minimalist style and timing of the original offline Dino experience.

## License

No license file is included in this repository yet. If you plan to open-source this project broadly, adding a license is recommended.
