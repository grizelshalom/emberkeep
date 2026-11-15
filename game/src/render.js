// Emberkeep — everything the player sees, drawn on one canvas.
// One job: turn the world state into pictures (background, foes, HUD, screens).

import { VIEW_W, VIEW_H, CENTER_X, CENTER_Y, COLORS, WAVE_COUNT, BETWEEN_WAVES_S } from './config.js';
import { makeRng } from './random.js';

const TITLE_FONT = 'Georgia, "Times New Roman", serif';
const UI_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Card and button geometry, shared by draw and hitTest.
const CARDS = [0, 1, 2].map((i) => ({ x: 170 + i * 320, y: 250, w: 300, h: 230 }));
const BUTTONS = {
  start: { x: CENTER_X - 140, y: 512, w: 280, h: 64 },
  restart: { x: CENTER_X - 140, y: 556, w: 280, h: 64 },
  resume: { x: CENTER_X - 130, y: 420, w: 260, h: 60 },
  restartPaused: { x: CENTER_X - 130, y: 496, w: 260, h: 60 },
};

function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function hitTest(world, x, y) {
  if (world.state === 'title' && inside(BUTTONS.start, x, y)) return 'start';
  if (world.state === 'levelup') {
    for (let i = 0; i < 3; i += 1) {
      if (inside(CARDS[i], x, y)) return `upgrade:${i}`;
    }
  }
  if (world.state === 'paused') {
    if (inside(BUTTONS.resume, x, y)) return 'resume';
    if (inside(BUTTONS.restartPaused, x, y)) return 'restart';
  }
  if ((world.state === 'gameover' || world.state === 'victory') && inside(BUTTONS.restart, x, y)) return 'restart';
  return null;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const treeRng = makeRng(20261115);
  const trees = [];
  for (let i = 0; i < 46; i += 1) {
    trees.push({
      x: treeRng() * VIEW_W,
      y: treeRng() < 0.5 ? treeRng() * 70 : VIEW_H - treeRng() * 70,
      h: 46 + treeRng() * 60,
      w: 30 + treeRng() * 22,
      dark: treeRng() < 0.5,
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(str, x, y, size, color, font, align = 'center', weight = '') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function drawBackground(world) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, COLORS.nightTop);
    g.addColorStop(1, COLORS.nightBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Stars.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i += 1) {
      const sx = (i * 331) % VIEW_W;
      const sy = (i * 173) % 200;
      ctx.globalAlpha = 0.15 + ((i * 7) % 10) / 28;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Clearing: concentric ground rings.
    ctx.fillStyle = COLORS.ground;
    ctx.beginPath();
    ctx.ellipse(CENTER_X, CENTER_Y, 560, 330, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.groundRing;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(CENTER_X, CENTER_Y, 430, 250, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(CENTER_X, CENTER_Y, 280, 165, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Pine silhouettes along the top and bottom edges.
    for (const t of trees) {
      ctx.fillStyle = t.dark ? COLORS.pineDark : COLORS.pine;
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2, t.y);
      ctx.lineTo(t.x, t.y - t.h);
      ctx.lineTo(t.x + t.w / 2, t.y);
      ctx.closePath();
      ctx.fill();
    }

    // Fireflies.
    for (const f of world.fireflies) {
      const tw = 0.35 + 0.3 * Math.sin(f.phase * 2);
      ctx.fillStyle = `rgba(255, 209, 102, ${tw})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLight(world) {
    const k = world.keeper;
    const flicker = 1 + 0.05 * Math.sin(world.time * 7) + 0.03 * Math.sin(world.time * 13.7);
    const r = k.lightRadius * flicker;
    const g = ctx.createRadialGradient(k.x, k.y, r * 0.1, k.x, k.y, r * 1.9);
    g.addColorStop(0, 'rgba(3, 5, 16, 0)');
    g.addColorStop(0.42, 'rgba(3, 5, 16, 0.06)');
    g.addColorStop(0.72, 'rgba(3, 5, 16, 0.55)');
    g.addColorStop(1, 'rgba(3, 5, 16, 0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const glow = ctx.createRadialGradient(k.x, k.y, 4, k.x, k.y, 90);
    glow.addColorStop(0, 'rgba(255, 183, 3, 0.34)');
    glow.addColorStop(1, 'rgba(255, 183, 3, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 90, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawKeeper(world) {
    const k = world.keeper;
    const blink = k.invuln > 0 && Math.floor(world.time * 14) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    // Cloak.
    ctx.fillStyle = '#4a3a72';
    ctx.beginPath();
    ctx.moveTo(k.x, k.y - 18);
    ctx.quadraticCurveTo(k.x + 15, k.y + 2, k.x + 12, k.y + 16);
    ctx.lineTo(k.x - 12, k.y + 16);
    ctx.quadraticCurveTo(k.x - 15, k.y + 2, k.x, k.y - 18);
    ctx.fill();
    // Hood.
    ctx.fillStyle = '#2c2145';
    ctx.beginPath();
    ctx.arc(k.x, k.y - 12, 10, 0, Math.PI * 2);
    ctx.fill();
    // Face glow.
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(k.x, k.y - 12, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Lantern, swinging at the keeper's side.
    const swing = Math.sin(world.time * 2.2) * 3;
    const lx = k.x + 18;
    const ly = k.y + 4 + swing;
    ctx.strokeStyle = '#8a6d2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(k.x + 8, k.y + 2);
    ctx.lineTo(lx, ly - 6);
    ctx.stroke();
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(lx, ly, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawEnemy(world, e) {
    if (e.spawnT > 0) ctx.globalAlpha = Math.max(0.15, 1 - e.spawnT * 3);
    const angle = Math.atan2(world.keeper.y - e.y, world.keeper.x - e.x);
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.kind === 'dart') ctx.rotate(angle);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, e.radius + 12);
    glow.addColorStop(0, e.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = e.spawnT > 0 ? Math.max(0.15, 1 - e.spawnT * 3) : 1;

    ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
    if (e.kind === 'wisp') {
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0e24';
      ctx.beginPath();
      ctx.arc(-4, -2, 2.4, 0, Math.PI * 2);
      ctx.arc(4, -2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'dart') {
      ctx.beginPath();
      ctx.moveTo(e.radius + 4, 0);
      ctx.lineTo(-e.radius, -e.radius * 0.8);
      ctx.lineTo(-e.radius * 0.4, 0);
      ctx.lineTo(-e.radius, e.radius * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (e.kind === 'splitter') {
      ctx.beginPath();
      ctx.arc(-6, 0, e.radius * 0.62, 0, Math.PI * 2);
      ctx.arc(6, 0, e.radius * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0e24';
      ctx.beginPath();
      ctx.arc(-6, -3, 2.2, 0, Math.PI * 2);
      ctx.arc(6, -3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'brute') {
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.moveTo(Math.cos(a) * e.radius * 0.7, Math.sin(a) * e.radius * 0.7);
        ctx.lineTo(Math.cos(a) * (e.radius + 9), Math.sin(a) * (e.radius + 9));
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = e.color;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0e24';
      ctx.beginPath();
      ctx.arc(-7, -4, 3, 0, Math.PI * 2);
      ctx.arc(7, -4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'herald') {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.42;
        ctx.moveTo(Math.cos(a) * e.radius * 0.8, Math.sin(a) * e.radius * 0.8);
        ctx.lineTo(Math.cos(a) * (e.radius + 18), Math.sin(a) * (e.radius + 18));
      }
      ctx.lineWidth = 5;
      ctx.strokeStyle = e.color;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0e24';
      ctx.beginPath();
      ctx.arc(-12, -8, 5, 0, Math.PI * 2);
      ctx.arc(12, -8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0a0e24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.quadraticCurveTo(0, 20, 10, 12);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (e.hp < e.maxHp && e.kind !== 'wisp') {
      const wBar = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(e.x - wBar / 2, e.y - e.radius - 12, wBar, 5);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(e.x - wBar / 2, e.y - e.radius - 12, wBar * (e.hp / e.maxHp), 5);
    }
  }

  function drawBolts(world) {
    for (const b of world.bolts) {
      const g = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, 12);
      g.addColorStop(0, '#fff3c4');
      g.addColorStop(0.4, '#ffb703');
      g.addColorStop(1, 'rgba(255,123,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawShards(world) {
    for (const s of world.shards) {
      const bob = Math.sin(world.time * 4 + s.x) * 2;
      ctx.save();
      ctx.translate(s.x, s.y + bob);
      if (s.kind === 'shard') {
        ctx.fillStyle = COLORS.shard;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
      } else if (s.kind === 'heart') {
        ctx.fillStyle = COLORS.heart;
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♥', 0, 0);
      } else {
        ctx.fillStyle = COLORS.star;
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, 0);
      }
      ctx.restore();
    }
  }

  function drawParticles(world) {
    for (const p of world.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of world.floaters) {
      ctx.globalAlpha = Math.min(1, f.life / 0.5);
      text(f.text, f.x, f.y, 15, f.color, UI_FONT, 'center', 'bold');
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(world) {
    const k = world.keeper;
    // Flame bar.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(20, 16, 268, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#2a1a08';
    roundRect(28, 24, 200, 14, 7);
    ctx.fill();
    const flameW = 200 * Math.max(0, k.flame / k.flameMax);
    const fg = ctx.createLinearGradient(28, 0, 228, 0);
    fg.addColorStop(0, '#ff7b00');
    fg.addColorStop(1, '#ffd166');
    ctx.fillStyle = fg;
    if (flameW > 0) { roundRect(28, 24, flameW, 14, 7); ctx.fill(); }
    text('🔥', 240, 31, 16, '#fff', UI_FONT);
    text(`${Math.ceil(k.flame)} / ${k.flameMax}`, 296, 31, 14, COLORS.text, UI_FONT, 'left', 'bold');
    // XP bar + level.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(20, 52, 268, 16, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.shard;
    const xpW = 252 * Math.min(1, k.xp / k.xpNext);
    if (xpW > 0) { roundRect(28, 56, xpW, 8, 4); ctx.fill(); }
    text(`LV ${k.level}`, 296, 60, 14, COLORS.shard, UI_FONT, 'left', 'bold');
    // Wave, centre top.
    text(`WAVE ${Math.max(1, world.wave)} / ${WAVE_COUNT}`, CENTER_X, 30, 20, COLORS.text, UI_FONT, 'center', 'bold');
    if (world.boss) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(CENTER_X - 180, 46, 360, 12, 6);
      ctx.fill();
      ctx.fillStyle = '#a78bfa';
      const bw = 360 * Math.max(0, world.boss.hp / world.boss.maxHp);
      if (bw > 0) { roundRect(CENTER_X - 180, 46, bw, 12, 6); ctx.fill(); }
      text('GLOOM HERALD', CENTER_X, 74, 13, '#c4b5fd', UI_FONT, 'center', 'bold');
    }
    // Score, top right.
    text(`SCORE  ${world.score}`, VIEW_W - 24, 30, 20, COLORS.text, UI_FONT, 'right', 'bold');
    const mm = Math.floor(world.time / 60);
    const ss = String(Math.floor(world.time % 60)).padStart(2, '0');
    text(`${world.kills} slain   •   ${mm}:${ss}`, VIEW_W - 24, 56, 14, COLORS.textDim, UI_FONT, 'right');
    // Best score, bottom left.
    text(`Best: ${world.best}`, 24, VIEW_H - 22, 13, COLORS.textDim, UI_FONT, 'left');
    text('WASD move  •  P pause  •  M mute', VIEW_W - 24, VIEW_H - 22, 13, COLORS.textDim, UI_FONT, 'right');
  }

  function drawBanner(world) {
    if (world.wavePhase !== 'banner' && world.wavePhase !== 'between') return;
    const a = Math.min(1, world.waveTimer > 2.4 ? (BETWEEN_WAVES_S - world.waveTimer) * 2 : 1);
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 150, VIEW_W, 96);
    text(world.bannerText, CENTER_X, 188, 44, COLORS.amber, TITLE_FONT, 'center', 'bold');
    text(world.bannerSub, CENTER_X, 224, 18, COLORS.text, UI_FONT);
    ctx.globalAlpha = 1;
  }

  function drawButton(rect, label, hover) {
    ctx.fillStyle = hover ? '#e69c00' : COLORS.amber;
    roundRect(rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fill();
    ctx.strokeStyle = '#7c4a00';
    ctx.lineWidth = 2;
    roundRect(rect.x, rect.y, rect.w, rect.h, 12);
    ctx.stroke();
    text(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 24, '#241500', UI_FONT, 'center', 'bold');
  }

  function drawTitle(world, input) {
    ctx.fillStyle = 'rgba(4, 6, 18, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text('E M B E R K E E P', CENTER_X, 168, 76, COLORS.amber, TITLE_FONT, 'center', 'bold');
    text('— The Last Lantern —', CENTER_X, 224, 26, COLORS.text, TITLE_FONT, 'center', 'italic');
    text('Night after night the gloom sends its wisps to snuff your flame.', CENTER_X, 272, 19, COLORS.textDim, UI_FONT);
    text('Keep the lantern lit. Survive 10 waves. Slay the Gloom Herald.', CENTER_X, 300, 19, COLORS.textDim, UI_FONT);
    drawButton(BUTTONS.start, '▶  LIGHT THE LANTERN', inside(BUTTONS.start, input.mouse.x, input.mouse.y));
    text('or press Enter', CENTER_X, 594, 15, COLORS.textDim, UI_FONT);
    text('Move: WASD / Arrows   •   Embers fire on their own — just dodge and gather', CENTER_X, 624, 16, COLORS.textDim, UI_FONT);
    text('Gather shards to level up and choose upgrades  •  P pause  •  M mute', CENTER_X, 650, 16, COLORS.textDim, UI_FONT);
    if (world.best > 0) text(`Best score: ${world.best}`, CENTER_X, 684, 16, COLORS.amber, UI_FONT, 'center', 'bold');
  }

  function drawLevelUp(world, input) {
    ctx.fillStyle = 'rgba(4, 6, 18, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text('✦  LEVEL UP  ✦', CENTER_X, 150, 40, COLORS.amber, TITLE_FONT, 'center', 'bold');
    text(`The flame grows stronger — choose one, Keeper (press 1, 2 or 3)`, CENTER_X, 196, 18, COLORS.text, UI_FONT);
    world.choices.forEach((u, i) => {
      const c = CARDS[i];
      const hover = inside(c, input.mouse.x, input.mouse.y);
      ctx.fillStyle = hover ? 'rgba(255, 183, 3, 0.16)' : COLORS.panel;
      roundRect(c.x, c.y, c.w, c.h, 14);
      ctx.fill();
      ctx.strokeStyle = hover ? COLORS.amber : '#3a4470';
      ctx.lineWidth = 2;
      roundRect(c.x, c.y, c.w, c.h, 14);
      ctx.stroke();
      text(u.icon, c.x + c.w / 2, c.y + 52, 40, '#fff', UI_FONT);
      text(u.title, c.x + c.w / 2, c.y + 108, 23, COLORS.text, UI_FONT, 'center', 'bold');
      text(u.blurb, c.x + c.w / 2, c.y + 146, 16, COLORS.textDim, UI_FONT);
      const count = world.upgradeCounts[u.id] ?? 0;
      const max = u.max >= 99 ? '∞' : `Lv ${count}/${u.max}`;
      text(max, c.x + c.w / 2, c.y + 186, 15, COLORS.shard, UI_FONT, 'center', 'bold');
      text(`[${i + 1}]`, c.x + c.w / 2, c.y + 210, 14, COLORS.textDim, UI_FONT);
    });
  }

  function drawPaused(world, input) {
    ctx.fillStyle = 'rgba(4, 6, 18, 0.7)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text('PAUSED', CENTER_X, 300, 52, COLORS.text, TITLE_FONT, 'center', 'bold');
    text('The night waits for no one — except right now.', CENTER_X, 352, 18, COLORS.textDim, UI_FONT);
    drawButton(BUTTONS.resume, '▶  RESUME', inside(BUTTONS.resume, input.mouse.x, input.mouse.y));
    drawButton(BUTTONS.restartPaused, '↻  RESTART', inside(BUTTONS.restartPaused, input.mouse.x, input.mouse.y));
    text('or press P to resume', CENTER_X, 580, 15, COLORS.textDim, UI_FONT);
  }

  function drawEnd(world, input, won) {
    ctx.fillStyle = won ? 'rgba(10, 26, 14, 0.72)' : 'rgba(24, 6, 14, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(won ? '☀  DAWN BREAKS  ☀' : 'THE LANTERN DIES', CENTER_X, 168, 56, won ? COLORS.amber : '#fb7185', TITLE_FONT, 'center', 'bold');
    text(
      won ? 'The Gloom Herald is gone. Your light kept the forest alive.' : 'The gloom swallows the clearing… but embers never truly die.',
      CENTER_X, 224, 19, COLORS.text, UI_FONT,
    );
    const mm = Math.floor(world.time / 60);
    const ss = String(Math.floor(world.time % 60)).padStart(2, '0');
    const rows = [
      ['Score', `${world.score}`],
      ['Waves survived', `${won ? WAVE_COUNT : Math.max(0, world.wave - (world.enemies.length ? 1 : 0))} / ${WAVE_COUNT}`],
      ['Foes slain', `${world.kills}`],
      ['Level reached', `${world.keeper.level}`],
      ['Time', `${mm}:${ss}`],
    ];
    let y = 292;
    for (const [label, value] of rows) {
      text(label, CENTER_X - 180, y, 19, COLORS.textDim, UI_FONT, 'left');
      text(value, CENTER_X + 180, y, 19, COLORS.text, UI_FONT, 'right', 'bold');
      y += 38;
    }
    if (world.newBest) text('★ NEW BEST SCORE ★', CENTER_X, y + 8, 20, COLORS.amber, UI_FONT, 'center', 'bold');
    drawButton(BUTTONS.restart, '↻  PLAY AGAIN', inside(BUTTONS.restart, input.mouse.x, input.mouse.y));
    text('or press R / Enter', CENTER_X, 640, 15, COLORS.textDim, UI_FONT);
  }

  function drawWorldScene(world) {
    drawBackground(world);
    drawShards(world);
    for (const e of world.enemies) drawEnemy(world, e);
    drawBolts(world);
    drawKeeper(world);
    drawParticles(world);
    drawLight(world);
  }

  return {
    draw(world, input) {
      ctx.save();
      if (world.shake > 0.2) {
        ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
      }
      if (world.state === 'title') {
        drawWorldScene(world);
        drawTitle(world, input);
      } else if (world.state === 'playing' || world.state === 'paused') {
        drawWorldScene(world);
        drawHud(world);
        drawBanner(world);
        if (world.state === 'paused') drawPaused(world, input);
      } else if (world.state === 'levelup') {
        drawWorldScene(world);
        drawHud(world);
        drawLevelUp(world, input);
      } else {
        drawWorldScene(world);
        drawHud(world);
        drawEnd(world, input, world.state === 'victory');
      }
      ctx.restore();
      if (world.hurtFlash > 0) {
        const g = ctx.createRadialGradient(CENTER_X, CENTER_Y, 200, CENTER_X, CENTER_Y, 700);
        g.addColorStop(0, 'rgba(251, 113, 133, 0)');
        g.addColorStop(1, `rgba(251, 113, 133, ${world.hurtFlash * 0.55})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    },
  };
}
