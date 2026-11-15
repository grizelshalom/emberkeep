// Emberkeep — the world: keeper, foes, embers, shards, waves, upgrades.
// One job: everything that changes while the game runs. Rendering lives in render.js.

import {
  VIEW_W, VIEW_H, CENTER_X, CENTER_Y, KEEPER, ENEMIES, WAVES, WAVE_COUNT,
  BETWEEN_WAVES_S, SPAWN_INTERVAL_S, xpForLevel, UPGRADES,
} from './config.js';
import { range, pickWeighted, shuffle } from './random.js';
import { loadBest, saveBest } from './storage.js';

const FEAST = {
  id: 'feast', icon: '🍲', title: 'Flame Feast', max: 99,
  blurb: 'Heal 40 flame right now',
  apply: (k) => { k.flame = Math.min(k.flameMax, k.flame + 40); },
};

function freshKeeper() {
  return {
    x: CENTER_X, y: CENTER_Y,
    flame: KEEPER.flameMax, flameMax: KEEPER.flameMax,
    speed: KEEPER.speed, boltDamage: KEEPER.boltDamage,
    boltSpeed: KEEPER.boltSpeed, fireInterval: KEEPER.fireInterval,
    boltsPerVolley: KEEPER.boltsPerVolley, pierce: KEEPER.pierce,
    pickupRadius: KEEPER.pickupRadius, lightRadius: KEEPER.lightRadius,
    lightSlow: 0, fireTimer: 0, invuln: 0, rapidTimer: 0,
    level: 1, xp: 0, xpNext: xpForLevel(1),
  };
}

export function createWorld(rng, audio) {
  const w = {
    state: 'title', // title | playing | levelup | paused | gameover | victory
    time: 0,
    score: 0,
    kills: 0,
    wave: 0,
    wavePhase: 'banner', // banner | fighting | between
    waveTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    bannerText: '',
    bannerSub: '',
    keeper: freshKeeper(),
    enemies: [],
    bolts: [],
    shards: [],
    particles: [],
    floaters: [],
    choices: [],
    upgradeCounts: {},
    boss: null,
    bossSpawnTimer: 0,
    shake: 0,
    hurtFlash: 0,
    best: loadBest(),
    newBest: false,
    fireflies: [],
  };

  for (let i = 0; i < 26; i += 1) {
    w.fireflies.push({
      x: rng() * VIEW_W, y: rng() * VIEW_H,
      phase: rng() * Math.PI * 2, speed: 0.3 + rng() * 0.7,
    });
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = rng() * Math.PI * 2;
      const v = speed * (0.3 + rng() * 0.7);
      w.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.4 + rng() * 0.35, maxLife: 0.75, size: 2 + rng() * 3, color,
      });
    }
  }

  function floater(x, y, text, color) {
    // Stagger floaters that would land on the same spot so text stays readable.
    let yy = y;
    for (const f of w.floaters) {
      if (Math.abs(f.x - x) < 40 && Math.abs(f.y - yy) < 16) yy -= 18;
    }
    w.floaters.push({ x, y: yy, text, life: 0.9, color });
    if (w.floaters.length > 14) w.floaters.splice(0, w.floaters.length - 14);
  }

  function spawnEnemy(kind, x, y) {
    const def = ENEMIES[kind];
    const hpScale = 1 + (w.wave - 1) * 0.09;
    const enemy = {
      kind, x, y,
      hp: Math.round(def.hp * hpScale), maxHp: Math.round(def.hp * hpScale),
      speed: def.speed * range(rng, 0.9, 1.1),
      radius: def.radius, damage: def.damage,
      score: def.score, shards: def.shards, color: def.color,
      flash: 0, spawnT: 0.25, slow: 0,
    };
    w.enemies.push(enemy);
    if (kind === 'herald') w.boss = enemy;
    return enemy;
  }

  function spawnAtEdge(kind) {
    const a = rng() * Math.PI * 2;
    const r = 480 + rng() * 90;
    const x = Math.max(36, Math.min(VIEW_W - 36, CENTER_X + Math.cos(a) * r));
    const y = Math.max(36, Math.min(VIEW_H - 36, CENTER_Y + Math.sin(a) * r));
    return spawnEnemy(kind, x, y);
  }

  function buildWave(n) {
    const plan = WAVES[n - 1];
    const entries = Object.entries(plan.mix);
    const queue = [];
    for (let i = 0; i < plan.count; i += 1) queue.push(pickWeighted(rng, entries));
    shuffle(rng, queue);
    w.spawnQueue = queue;
    w.spawnTimer = 0.4;
    w.wavePhase = 'banner';
    w.waveTimer = 1.7;
    if (plan.boss) {
      w.bannerText = 'WAVE 10 — THE GLOOM HERALD';
      w.bannerSub = 'Slay the Herald to win the night';
      spawnEnemy('herald', CENTER_X, 110);
      audio.bossRoar();
    } else {
      w.bannerText = `WAVE ${n}`;
      w.bannerSub = `${plan.count} foes approach the lantern`;
      audio.waveHorn();
    }
  }

  function startWave(n) {
    w.wave = n;
    buildWave(n);
  }

  function waveCleared() {
    const bonus = w.wave * 50;
    w.score += bonus;
    floater(CENTER_X, CENTER_Y - 60, `Wave ${w.wave} cleared! +${bonus}`, '#ffd166');
    if (w.wave >= WAVE_COUNT) return;
    w.wavePhase = 'between';
    w.waveTimer = BETWEEN_WAVES_S;
    w.bannerText = `WAVE ${w.wave} CLEARED`;
    w.bannerSub = `+${bonus} points — catch your breath`;
  }

  function rollChoices() {
    const available = UPGRADES.filter((u) => (w.upgradeCounts[u.id] ?? 0) < u.max);
    shuffle(rng, available);
    const picks = available.slice(0, 3);
    while (picks.length < 3) picks.push(FEAST);
    return picks;
  }

  function levelUp() {
    const k = w.keeper;
    k.level += 1;
    k.xp -= k.xpNext;
    k.xpNext = xpForLevel(k.level);
    w.choices = rollChoices();
    w.state = 'levelup';
    audio.levelUp();
  }

  function gainXp(n, x, y) {
    const k = w.keeper;
    k.xp += n;
    floater(x, y, `+${n} xp`, '#5eead4');
    if (k.xp >= k.xpNext) levelUp();
  }

  function killEnemy(enemy, index) {
    w.enemies.splice(index, 1);
    w.kills += 1;
    w.score += enemy.score;
    burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'brute' ? 18 : 12, 190);
    floater(enemy.x, enemy.y - 14, `+${enemy.score}`, '#ffd166');
    audio.pop();
    for (let i = 0; i < enemy.shards; i += 1) {
      w.shards.push({
        kind: 'shard', x: enemy.x + range(rng, -14, 14), y: enemy.y + range(rng, -14, 14),
        vx: range(rng, -40, 40), vy: range(rng, -40, 40), value: 1,
      });
    }
    if (enemy.kind === 'splitter') {
      spawnEnemy('wisp', enemy.x - 12, enemy.y);
      spawnEnemy('wisp', enemy.x + 12, enemy.y);
    }
    if (enemy.kind === 'herald') {
      w.boss = null;
      burst(enemy.x, enemy.y, '#a78bfa', 60, 320);
      burst(enemy.x, enemy.y, '#ffd166', 40, 240);
      w.score += Math.max(0, Math.round(600 - w.time)) * 2;
      endGame(true);
      return;
    }
    if (rng() < 0.03) {
      w.shards.push({
        kind: 'heart', x: enemy.x, y: enemy.y,
        vx: range(rng, -30, 30), vy: range(rng, -30, 30), value: 25,
      });
    } else if (rng() < 0.025) {
      w.shards.push({
        kind: 'star', x: enemy.x, y: enemy.y,
        vx: range(rng, -30, 30), vy: range(rng, -30, 30), value: 5,
      });
    }
  }

  function endGame(won) {
    w.state = won ? 'victory' : 'gameover';
    if (w.score > w.best) {
      w.best = w.score;
      w.newBest = true;
      saveBest(w.best);
    }
    if (won) audio.victory(); else audio.gameOver();
    audio.stopMusic();
  }

  function hurtKeeper(damage) {
    const k = w.keeper;
    if (k.invuln > 0 || w.state !== 'playing') return;
    k.flame -= damage;
    k.invuln = KEEPER.touchInvuln;
    w.shake = 14;
    w.hurtFlash = 0.45;
    burst(k.x, k.y, '#fb7185', 10, 160);
    audio.hurt();
    if (k.flame <= 0) {
      k.flame = 0;
      burst(k.x, k.y, '#ffb703', 50, 260);
      endGame(false);
    }
  }

  function fireBolts() {
    const k = w.keeper;
    let nearest = null;
    let nearestD = 560;
    for (const e of w.enemies) {
      const d = Math.hypot(e.x - k.x, e.y - k.y);
      if (d < nearestD) { nearestD = d; nearest = e; }
    }
    if (!nearest) return;
    const base = Math.atan2(nearest.y - k.y, nearest.x - k.x);
    const n = k.boltsPerVolley;
    for (let i = 0; i < n; i += 1) {
      const spread = (i - (n - 1) / 2) * 0.14;
      const a = base + spread;
      w.bolts.push({
        x: k.x + Math.cos(a) * 20, y: k.y + Math.sin(a) * 20,
        vx: Math.cos(a) * k.boltSpeed, vy: Math.sin(a) * k.boltSpeed,
        damage: k.boltDamage, pierce: k.pierce, life: 1.1,
      });
    }
    audio.shoot();
  }

  function updatePlaying(dt, input) {
    const k = w.keeper;
    w.time += dt;
    k.fireTimer -= dt;
    k.invuln -= dt;
    k.rapidTimer -= dt;

    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      k.x = Math.max(30, Math.min(VIEW_W - 30, k.x + mx * k.speed * dt));
      k.y = Math.max(30, Math.min(VIEW_H - 30, k.y + my * k.speed * dt));
    }

    const interval = k.fireInterval * (k.rapidTimer > 0 ? 0.45 : 1);
    if (k.fireTimer <= 0) {
      fireBolts();
      k.fireTimer = interval;
    }

    if (w.wavePhase === 'banner') {
      w.waveTimer -= dt;
      if (w.waveTimer <= 0) w.wavePhase = 'fighting';
    } else if (w.wavePhase === 'between') {
      w.waveTimer -= dt;
      if (w.waveTimer <= 0) startWave(w.wave + 1);
    } else if (w.wavePhase === 'fighting') {
      if (w.spawnQueue.length > 0) {
        w.spawnTimer -= dt;
        if (w.spawnTimer <= 0) {
          spawnAtEdge(w.spawnQueue.shift());
          w.spawnTimer = SPAWN_INTERVAL_S * range(rng, 0.8, 1.2);
        }
      } else if (w.enemies.length === 0) {
        waveCleared();
      }
    }

    if (w.boss) {
      w.bossSpawnTimer -= dt;
      if (w.bossSpawnTimer <= 0 && w.enemies.length < 26) {
        w.bossSpawnTimer = 5;
        spawnEnemy('wisp', w.boss.x - 30, w.boss.y);
        spawnEnemy('wisp', w.boss.x + 30, w.boss.y);
      }
    }

    for (let i = w.bolts.length - 1; i >= 0; i -= 1) {
      const b = w.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > VIEW_W + 20 || b.y < -20 || b.y > VIEW_H + 20) {
        w.bolts.splice(i, 1);
        continue;
      }
      for (let j = w.enemies.length - 1; j >= 0; j -= 1) {
        const e = w.enemies[j];
        if (e.spawnT > 0) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < e.radius + 6) {
          e.hp -= b.damage;
          e.flash = 0.12;
          floater(b.x, b.y - 8, `${Math.round(b.damage)}`, '#ffd166');
          burst(b.x, b.y, '#ffb703', 4, 120);
          if (e.hp <= 0) killEnemy(e, j);
          if (b.pierce > 0) { b.pierce -= 1; } else { w.bolts.splice(i, 1); }
          break;
        }
      }
    }

    for (const e of w.enemies) {
      e.spawnT -= dt;
      e.flash -= dt;
      const dx = k.x - e.x;
      const dy = k.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const inLight = d < k.lightRadius;
      const slow = inLight ? Math.max(0, 1 - k.lightSlow) : 1;
      const step = e.speed * slow * dt;
      e.x += (dx / d) * step;
      e.y += (dy / d) * step;
      if (d < e.radius + KEEPER.radius && e.spawnT <= 0) hurtKeeper(e.damage);
    }
    // Gentle separation so foes do not stack on one point.
    for (let i = 0; i < w.enemies.length; i += 1) {
      for (let j = i + 1; j < w.enemies.length; j += 1) {
        const a = w.enemies[i];
        const b = w.enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.radius + b.radius - 2;
        if (d > 0.01 && d < min) {
          const push = (min - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }

    for (let i = w.shards.length - 1; i >= 0; i -= 1) {
      const s = w.shards[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.92;
      s.vy *= 0.92;
      const d = Math.hypot(k.x - s.x, k.y - s.y);
      if (d < k.pickupRadius) {
        const pull = 620 * dt;
        s.x += ((k.x - s.x) / (d || 1)) * pull;
        s.y += ((k.y - s.y) / (d || 1)) * pull;
      }
      if (d < 26) {
        w.shards.splice(i, 1);
        if (s.kind === 'shard') { gainXp(s.value, s.x, s.y); audio.shard(); }
        else if (s.kind === 'heart') {
          k.flame = Math.min(k.flameMax, k.flame + s.value);
          floater(s.x, s.y, `+${s.value} flame`, '#fb7185');
          audio.heal();
        } else {
          k.rapidTimer = s.value;
          floater(s.x, s.y, 'RAPID FIRE!', '#fde68a');
          audio.levelUp();
        }
      }
    }
  }

  function updateParticles(dt) {
    for (let i = w.particles.length - 1; i >= 0; i -= 1) {
      const p = w.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) w.particles.splice(i, 1);
    }
    for (let i = w.floaters.length - 1; i >= 0; i -= 1) {
      const f = w.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) w.floaters.splice(i, 1);
    }
    for (const f of w.fireflies) {
      f.phase += dt * f.speed;
      f.x += Math.sin(f.phase * 0.7) * 12 * dt;
      f.y += Math.cos(f.phase * 0.5) * 10 * dt;
    }
    w.shake = Math.max(0, w.shake - dt * 42);
    w.hurtFlash = Math.max(0, w.hurtFlash - dt);
  }

  w.update = function update(dt, input) {
    const step = Math.min(dt, 0.05);
    if (w.state === 'playing') updatePlaying(step, input);
    else if (w.state === 'title' || w.state === 'gameover' || w.state === 'victory') {
      w.time += step * 0.2;
    }
    updateParticles(step);
  };

  w.startGame = function startGame() {
    w.keeper = freshKeeper();
    w.enemies = [];
    w.bolts = [];
    w.shards = [];
    w.particles = [];
    w.floaters = [];
    w.choices = [];
    w.upgradeCounts = {};
    w.boss = null;
    w.bossSpawnTimer = 4;
    w.score = 0;
    w.kills = 0;
    w.time = 0;
    w.newBest = false;
    w.state = 'playing';
    startWave(1);
    audio.startMusic();
  };

  w.chooseUpgrade = function chooseUpgrade(index) {
    if (w.state !== 'levelup') return;
    const pick = w.choices[index];
    if (!pick) return;
    pick.apply(w.keeper);
    w.upgradeCounts[pick.id] = (w.upgradeCounts[pick.id] ?? 0) + 1;
    w.choices = [];
    w.state = 'playing';
    audio.shard();
  };

  w.togglePause = function togglePause() {
    if (w.state === 'playing') { w.state = 'paused'; audio.stopMusic(); }
    else if (w.state === 'paused') { w.state = 'playing'; audio.startMusic(); }
  };

  // Test helpers (used by the headless play-test only).
  w.test = {
    addXp(n) { gainXp(n, w.keeper.x, w.keeper.y - 30); },
    hurt(n) { w.keeper.invuln = 0; hurtKeeper(n); },
    winNow() { if (w.boss) { w.boss.hp = 1; } },
  };

  return w;
}
