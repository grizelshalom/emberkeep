# Emberkeep — The Last Lantern

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/grizelshalom/emberkeep/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/grizelshalom/emberkeep/reward.svg)](https://make.fun/bounty/best-game-01)

An original arena-survival game for the make.fun best-game-01 competition.
You are the Keeper of the last lantern in a dark forest clearing. Night after
night the gloom sends its wisps to snuff your flame: keep the lantern lit,
survive 10 waves, and slay the Gloom Herald.

## How to play

- **Move:** WASD or arrow keys (mouse/touch drag also works)
- **Fight:** embers fire on their own at the nearest foe — just dodge and gather
- **Level up:** gather shards, then pick 1 of 3 upgrades (8 kinds: damage,
  multishot, pierce, fire rate, speed, magnet, max flame, slow aura)
- **Win:** slay the Gloom Herald at the end of wave 10
- **Lose:** the flame hits 0
- **Pause:** P or Esc · **Mute:** M · **Restart:** R (or click the button)

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

No build step, no network request, no library: plain ES modules under
`game/src/` (one clear job per file), WebAudio synth for sound and music.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored make.fun library.

## Screenshots

`shots.json` lists the four renders in `screenshots/` (title, play, level-up,
victory). They were taken from the game itself with
`../test/drive.mjs` (headless Chromium play-test: title → start → play →
level-up → pause → game over → restart → victory shot) and are reproducible
from `game/index.html?shot=<name>&seed=1`.
