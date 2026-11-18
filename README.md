# INKLIGHT — Paint the light back

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Learshy/starlight-salvage/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Learshy/starlight-salvage/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An entry for [make.fun's best game bounty](https://make.fun/bounty/best-game-01).

The Gloom eats the world, one night at a time. You are the last Lumen
Painter. Your brush is the only weapon the dark fears: paint strokes of
light, and the shades burn where the light touches them. Ink buys the
light, embers refill the ink, and dawn only comes when every shade of the
night is banished. Survive seven nights, and the sun returns.

## How to play

- **WASD / arrow keys** — move the painter
- **Hold the mouse and drag** — paint strokes of light
- **Space** — dash (leaves a trail of light, costs a little ink)
- **M** — mute · **P** — pause · **R** — restart after the end

Light burns the shades. The paint fades as the Gloom reclaims it, so keep
painting. Spitters shoot gloom globs that erase your paint — dash clear of
them, or paint over the gap. On the Seventh Night the Gloom Herald comes,
and it calls more shades to its side.

## The game

- One verb: **paint**. The brush is the weapon, the wall and the way home.
- Seven nights, each with its own roster — crawlers, skitters, spitters,
  splitters, and the Herald.
- Ink as the economy: painting and dashing spend it, embers and slow
  regeneration bring it back.
- A dawn after every night: wounds close, the inkwell refills, the next
  night waits in the dark.
- Synthesized sound throughout (WebAudio, no files): the brush, the burn,
  the ember chime, the dawn chord.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Build the dossier (what the judge reads):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`?selftest=1` runs the game's own checks in the browser.
`?shot=start|play|night|end&seed=1` stages the four screenshot scenes.

## Files

- `game/index.html`, `game/style.css` — the page shell
- `game/src/main.js` — the loop and the state machine
- `game/src/config.js` — every tuning number and the seven nights
- `game/src/paint.js` — the strokes of light
- `game/src/painter.js` — the wisp with the brush
- `game/src/shades.js` — the Gloom's creatures and their globs
- `game/src/nights.js` — the campaign
- `game/src/render.js` — everything drawn on the canvas
- `game/src/particles.js` — sparks, bursts and dawn motes
- `game/src/audio.js` — synthesized sound
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — the staged screenshot scenes
- `game/src/selftest.js` — the game's own checks
- `game/src/util.js` — seeded random and small helpers
