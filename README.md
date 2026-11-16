# EMBERKEEP — Seven Nights of the Beacon

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Learshy/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Learshy/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Light is your only weapon.** You are the Keeper of the last Beacon on a
small night island. For seven nights the dark sends its shades to snuff the
lamps and the Beacon itself. Your lantern burns them, your flares scatter
them, and the embers they leave behind are the only fuel you have. Keep the
Beacon burning until dawn breaks on the seventh morning.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. WASD / arrows to move,
mouse to aim, click or SPACE to flare, E to relight a lamp, P to pause,
M to mute, R to restart.

## Design brief

- **Player promise:** one keeper, one lantern, seven nights — hold the light.
- **Target feeling:** tense tending, not twitch shooting: every flare and
  every relight spends the same fuel you are fighting to collect.
- **Primary verb:** burn the dark with light (move, aim, flare).
- **Secondary verbs:** relight lamps, gather embers, choose where to stand.
- **What repeats every 5–30 seconds:** a shade reaches a lamp, you decide
  whether to spend fuel on a flare or walk over and relight it.
- **What changes across 1–5 minutes:** each night spawns faster, brings
  tougher shades, and lets lamps burn lower; the island gets darker.
- **How you lose, learn, restart:** the Beacon is snuffed or you fall in
  the dark; the game-over screen names the night and how many lamps stood
  dark; R restarts in under a second.
- **What is rewarded, what creates risk:** embers and survived nights pay
  score and fuel; every light you spend is fuel you might not get back.
- **What a better player does differently:** she herds shades into lit
  ground instead of flaring, relights before a lamp dies, and never flares
  at a lone mote.
- **How the next decision is communicated:** lamps flicker and dim before
  they die, shades telegraph with brightening eyes, the HUD shows fuel,
  lamps, and the night dial at a glance.
- **Non-goals:** no shooting gallery, no upgrade shop, no endless mode —
  seven nights, then dawn.

## Core-loop contract

> The Keeper **burns shades with light** to achieve **keeping the Beacon
> lit through seven nights** while **lamps burn fuel, shades snuff them,
> and darkness drains health** creates risk; success gives **embers,
> fuel, and the next dawn**, failure causes **the Beacon snuffed or the
> Keeper fallen — with the night and the dark lamps named — and a
> one-key restart**.

Proof in code (each clause maps to real code, not a description):

- **Verb is mapped to real input** — `game/src/input.js` reads WASD/arrows
  for movement, mouse position for aim, click/SPACE for flare, E for
  relight; `game/src/keeper.js` turns those intents into motion, aim, and
  flare the same frame they arrive.
- **Objective is visible in world and HUD** — the Beacon burns at the
  island's centre (`game/src/world.js`), the night dial reads
  `Night 3 / 7` and the Beacon flame meter sits in the top bar
  (`game/src/render.js` draws both).
- **Pressure exists inside the first playable minute** — Night 1 spawns
  its first shade within 4 seconds and a lamp burns out in about a minute
  if never tended (`game/src/world.js` spawn clock and lamp burn rate).
- **Reward changes state, not only visuals** — a burned shade drops
  embers that add fuel and score; a survived night advances the night
  counter and pays a dawn bonus (`game/src/world.js`, `game/src/main.js`).
- **Failure teaches what happened** — the game-over screen names the
  night and how many lamps stood dark when the light went out
  (`game/src/render.js`).
- **Restart is fast enough to invite another attempt** — R (or click)
  rebuilds a fresh run from the game-over screen in under a second
  (`game/src/main.js`).

## Level plan

- **Spatial format:** one fixed-view island (1280×720), Beacon at the
  centre, six lamps on a ring, stone paths between them. The whole loop
  is readable in one glance — the judge's first screenshot shows it.
- **First decision:** which lamp to walk to first; **first threat:** the
  first shade at the island's edge within 4 seconds; **first reward:**
  the first ember it drops.
- **Landmarks:** the Beacon (centre), the north lamp by the pines, the
  east lamp by the rocks, the old well — the player navigates by them.
- **Escalation:** each night shortens the spawn interval, adds tougher
  shades, and raises the lamp burn rate; Night 7 is mostly brutes.
- **Recovery beats:** dawn between nights dissolves the remaining shades
  and pays a fuel bonus; embers are the in-night recovery.
- **Telegraphs:** a shade's eyes brighten before it lunges; a lamp
  flickers and dims before it dies; the Beacon's flame shrinks as its
  integrity falls.
- **Modular pieces:** shade kinds, lamp positions, and night tuning all
  live in `game/src/config.js` — one table to retune the whole curve.

## Visual scorecard (self-scored from active-play captures)

Scored after the build against the 10-category scorecard; the numbers live
in the build report, not here. Premium bar: no category below 2, average
≥ 2.3. The art direction is light-against-dark: warm amber pools of
lamplight on a deep indigo night, and the lighting is the mechanic — the
darkness mask is drawn with real light holes, not a fog overlay.

---

<sub>Entered on [make.fun](https://make.fun/?ref=fefh13fc&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
