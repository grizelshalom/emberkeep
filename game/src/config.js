// Emberkeep — The Last Lantern: tuning and content tables.
// One job: every number and name the rest of the game reads.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const CENTER_X = VIEW_W / 2;
export const CENTER_Y = VIEW_H / 2;

// Palette: a cold indigo night against warm lantern amber.
export const COLORS = {
  nightTop: '#0a0e24',
  nightBottom: '#141a38',
  ground: '#10152c',
  groundRing: '#1a2142',
  pine: '#0d2b26',
  pineDark: '#08211d',
  amber: '#ffb703',
  ember: '#ff7b00',
  flame: '#ffd166',
  shard: '#5eead4',
  heart: '#fb7185',
  star: '#fde68a',
  wisp: '#bcd6ff',
  dart: '#8ef1ff',
  splitter: '#c4b5fd',
  brute: '#f0abfc',
  herald: '#a78bfa',
  text: '#f4ead8',
  textDim: '#b8b09a',
  panel: 'rgba(10, 14, 36, 0.88)',
  panelEdge: '#ffb703',
};

export const KEEPER = {
  radius: 16,
  speed: 245,
  flameMax: 100,
  boltDamage: 3,
  boltSpeed: 560,
  fireInterval: 0.42,
  boltsPerVolley: 1,
  pierce: 0,
  pickupRadius: 90,
  lightRadius: 240,
  touchInvuln: 0.6,
};

// Enemy kinds. hp scales a little with wave (see world.js).
export const ENEMIES = {
  wisp:     { name: 'Wisp',     radius: 13, hp: 3,  speed: 58,  damage: 8,  score: 10, shards: 1, color: COLORS.wisp },
  dart:     { name: 'Dart',     radius: 10, hp: 2,  speed: 128, damage: 6,  score: 15, shards: 1, color: COLORS.dart },
  splitter: { name: 'Splitter', radius: 17, hp: 7,  speed: 46,  damage: 10, score: 25, shards: 2, color: COLORS.splitter },
  brute:    { name: 'Brute',    radius: 24, hp: 26, speed: 34,  damage: 16, score: 40, shards: 3, color: COLORS.brute },
  herald:   { name: 'Gloom Herald', radius: 44, hp: 340, speed: 40, damage: 22, score: 500, shards: 12, color: COLORS.herald },
};

// Wave plan: ten waves, the tenth ends with the Gloom Herald.
// count = total enemies in the wave; mix = weights per kind.
export const WAVES = [
  { count: 10, mix: { wisp: 1 } },
  { count: 14, mix: { wisp: 0.8, dart: 0.2 } },
  { count: 18, mix: { wisp: 0.6, dart: 0.3, splitter: 0.1 } },
  { count: 22, mix: { wisp: 0.5, dart: 0.3, splitter: 0.2 } },
  { count: 26, mix: { wisp: 0.4, dart: 0.3, splitter: 0.2, brute: 0.1 } },
  { count: 30, mix: { wisp: 0.35, dart: 0.3, splitter: 0.2, brute: 0.15 } },
  { count: 34, mix: { wisp: 0.3, dart: 0.3, splitter: 0.2, brute: 0.2 } },
  { count: 38, mix: { wisp: 0.25, dart: 0.3, splitter: 0.25, brute: 0.2 } },
  { count: 42, mix: { wisp: 0.2, dart: 0.3, splitter: 0.25, brute: 0.25 } },
  { count: 12, mix: { wisp: 0.5, dart: 0.5 }, boss: true },
];
export const WAVE_COUNT = WAVES.length;
export const BETWEEN_WAVES_S = 3.5;
export const SPAWN_INTERVAL_S = 0.55;

// XP needed to go from level L to L+1.
export function xpForLevel(level) {
  return 4 + level * 4 + Math.floor(level * level * 0.6);
}

// The eight upgrades offered on level-up. Each has a title, a one-line
// description, an icon (drawn glyph), a max stack, and an apply() that
// mutates the keeper's stats.
export const UPGRADES = [
  {
    id: 'damage', icon: '🔥', title: 'Kindled Shot', max: 5,
    blurb: '+25% ember damage',
    apply: (k) => { k.boltDamage *= 1.25; },
  },
  {
    id: 'rate', icon: '⚡', title: 'Rapid Wick', max: 5,
    blurb: '+18% fire rate',
    apply: (k) => { k.fireInterval *= 0.85; },
  },
  {
    id: 'multishot', icon: '✦', title: 'Twin Flame', max: 3,
    blurb: '+1 ember per volley',
    apply: (k) => { k.boltsPerVolley += 1; },
  },
  {
    id: 'speed', icon: '💨', title: 'Swift Boots', max: 5,
    blurb: '+12% move speed',
    apply: (k) => { k.speed *= 1.12; },
  },
  {
    id: 'magnet', icon: '🧲', title: 'Lodestone', max: 5,
    blurb: '+40% shard pickup radius',
    apply: (k) => { k.pickupRadius *= 1.4; },
  },
  {
    id: 'flame', icon: '❤', title: 'Stout Flame', max: 5,
    blurb: '+25 max flame, heal 25',
    apply: (k) => { k.flameMax += 25; k.flame = Math.min(k.flameMax, k.flame + 25); },
  },
  {
    id: 'pierce', icon: '➶', title: 'Piercing Ember', max: 3,
    blurb: 'Embers pierce +1 foe',
    apply: (k) => { k.pierce += 1; },
  },
  {
    id: 'lantern', icon: '🏮', title: 'Wide Lantern', max: 5,
    blurb: '+18% light; foes in light slow 12%',
    apply: (k) => { k.lightRadius *= 1.18; k.lightSlow += 0.12; },
  },
];
