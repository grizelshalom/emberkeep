// Emberkeep — screenshot mode for the maker (?shot=start|play|levelup|victory).
// One job: build a fixed, readable scene for each screenshot, then signal ready.
//
// The game reads ?shot= on load. Each scene uses a fixed seed so the same
// shot always renders the same night. A normal visit (no ?shot=) plays the game.

import { VIEW_W, VIEW_H, CENTER_X, CENTER_Y } from './config.js';
import { makeRng, range } from './random.js';

function scatterFoes(world, rng, kinds, n) {
  for (let i = 0; i < n; i += 1) {
    const kind = kinds[i % kinds.length];
    const a = (i / n) * Math.PI * 2 + rng() * 0.4;
    const r = 150 + rng() * 170;
    const x = Math.max(40, Math.min(VIEW_W - 40, CENTER_X + Math.cos(a) * r));
    const y = Math.max(40, Math.min(VIEW_H - 40, CENTER_Y + Math.sin(a) * r));
    world.enemies.push({
      kind, x, y,
      hp: kind === 'brute' ? 20 : kind === 'splitter' ? 5 : 3,
      maxHp: kind === 'brute' ? 26 : kind === 'splitter' ? 7 : 3,
      speed: 50, radius: kind === 'brute' ? 24 : kind === 'splitter' ? 17 : 13,
      damage: 8, score: 10, shards: 1,
      color: kind === 'brute' ? '#f0abfc' : kind === 'splitter' ? '#c4b5fd' : '#bcd6ff',
      flash: 0, spawnT: 0, slow: 0,
    });
  }
}

function scatterShards(world, rng, n) {
  for (let i = 0; i < n; i += 1) {
    world.shards.push({
      kind: 'shard',
      x: CENTER_X + range(rng, -260, 260),
      y: CENTER_Y + range(rng, -160, 160),
      vx: 0, vy: 0, value: 1,
    });
  }
}

function scatterBolts(world, rng, n) {
  for (let i = 0; i < n; i += 1) {
    const a = rng() * Math.PI * 2;
    const d = 60 + rng() * 180;
    world.bolts.push({
      x: CENTER_X + Math.cos(a) * d,
      y: CENTER_Y + Math.sin(a) * d,
      vx: Math.cos(a + 1.2) * 300, vy: Math.sin(a + 1.2) * 300,
      damage: 3, pierce: 0, life: 0.8,
    });
  }
}

export function applyShot(world, audio) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = Number(params.get('seed') ?? 1) || 1;
  const rng = makeRng(seed * 7919 + 13);
  // NOTE: startGame() replaces world.keeper with a fresh object, so every
  // branch below re-reads world.keeper AFTER calling it.
  let k = world.keeper;

  if (shot === 'start') {
    world.state = 'title';
    world.best = 1240;
    scatterFoes(world, rng, ['wisp', 'dart', 'wisp'], 6);
  } else if (shot === 'play') {
    world.startGame();
    k = world.keeper;
    world.wave = 4;
    world.wavePhase = 'fighting';
    world.bannerText = '';
    k.x = CENTER_X - 60;
    k.y = CENTER_Y + 40;
    k.flame = 78;
    k.level = 3;
    k.xp = 9;
    k.xpNext = 16;
    k.boltsPerVolley = 2;
    world.score = 1240;
    world.kills = 47;
    world.best = 1240;
    world.time = 148;
    scatterFoes(world, rng, ['wisp', 'dart', 'splitter', 'brute', 'wisp', 'dart'], 14);
    scatterShards(world, rng, 18);
    scatterBolts(world, rng, 8);
    for (let i = 0; i < 24; i += 1) {
      world.particles.push({
        x: CENTER_X + range(rng, -320, 320),
        y: CENTER_Y + range(rng, -200, 200),
        vx: range(rng, -30, 30), vy: range(rng, -30, 30),
        life: 0.5, maxLife: 0.75, size: 2 + rng() * 3,
        color: ['#ffb703', '#5eead4', '#bcd6ff'][i % 3],
      });
    }
  } else if (shot === 'levelup') {
    world.startGame();
    k = world.keeper;
    world.wave = 3;
    world.wavePhase = 'fighting';
    k.x = CENTER_X - 40;
    k.y = CENTER_Y + 60;
    k.flame = 86;
    k.level = 4;
    k.xp = 0;
    k.xpNext = 20;
    world.score = 860;
    world.kills = 31;
    world.best = 860;
    world.time = 96;
    scatterFoes(world, rng, ['wisp', 'dart', 'wisp'], 7);
    scatterShards(world, rng, 6);
    world.choices = [
      { id: 'damage', icon: '🔥', title: 'Kindled Shot', max: 5, blurb: '+25% ember damage', apply: () => {} },
      { id: 'multishot', icon: '✦', title: 'Twin Flame', max: 3, blurb: '+1 ember per volley', apply: () => {} },
      { id: 'magnet', icon: '🧲', title: 'Lodestone', max: 5, blurb: '+40% shard pickup radius', apply: () => {} },
    ];
    world.state = 'levelup';
  } else if (shot === 'victory') {
    world.startGame();
    k = world.keeper;
    world.wave = 10;
    world.score = 4860;
    world.kills = 214;
    world.time = 412;
    k.level = 9;
    k.flame = 64;
    world.newBest = true;
    world.best = 4860;
    for (let i = 0; i < 40; i += 1) {
      world.particles.push({
        x: CENTER_X + range(rng, -360, 360),
        y: CENTER_Y + range(rng, -220, 220),
        vx: range(rng, -40, 40), vy: range(rng, -60, -10),
        life: 0.7, maxLife: 0.9, size: 2 + rng() * 3,
        color: ['#ffb703', '#ffd166', '#5eead4'][i % 3],
      });
    }
    world.state = 'victory';
  } else {
    return false;
  }

  // Let one frame render, then tell the screenshot driver we are ready.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { window.__shotReady = true; });
  });
  return true;
}
