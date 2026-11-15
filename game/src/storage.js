// Emberkeep — the best score, kept in the browser.
// One job: read and write the saved best score, safely.

const KEY = 'emberkeep.best.v1';

export function loadBest() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    window.localStorage.setItem(KEY, String(Math.floor(score)));
  } catch {
    // Private mode or blocked storage: the game plays on without it.
  }
}
