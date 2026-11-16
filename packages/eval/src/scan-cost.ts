/**
 * Single-switch row/column scan cost, measured by driving @ninth/core's scanReducer (so the
 * harness counts exactly what the app does, not a formula).
 *
 * Grid (plan section 4.5): row 0 = up to 5 candidates; rows 1-4 = keypad
 *   1 2 3 / 4 5 6 / 7 8 9 / * 0 #; row 5 = actions (speak, delete, next, save, mode).
 */
import { initialScan, scanReducer, type ScanConfig, type ScanState } from '@ninth/core';

export const GRID: ScanConfig = { rows: [5, 3, 3, 3, 3, 5], loops: Number.POSITIVE_INFINITY };
/**
 * The app's grid (web-ui Req 8.1, 31.6): keypad rows first (1 2 3 / 4 5 6 / 7 8 9 / * 0 #), then Finish the
 * word (3 places), then the sentences (5). The word row is counted as always there; in the app it is
 * skipped while empty, so this over-counts one row step per sentence pick made while it is hidden.
 */
export const APP_GRID: ScanConfig = { rows: [3, 3, 3, 3, 3, 5], loops: Number.POSITIVE_INFINITY };

const KEY_CELL: Record<string, [number, number]> = {
  '1': [1, 0], '2': [1, 1], '3': [1, 2],
  '4': [2, 0], '5': [2, 1], '6': [2, 2],
  '7': [3, 0], '8': [3, 1], '9': [3, 2],
  '*': [4, 0], '0': [4, 1], '#': [4, 2],
};

/** A key, a sentence (candidate rank) or a word from Finish the word (its place, 0-2). */
export type Target = { key: string } | { candidate: number } | { word: number };

export function cellOf(t: Target): [number, number] {
  // On the harness grid a word to finish sits in row 0 with the sentences, as in the plan's simulation.
  if ('word' in t) return [0, t.word];
  if ('key' in t) {
    const c = KEY_CELL[t.key];
    if (!c) throw new Error(`no scan cell for key ${t.key}`);
    return c;
  }
  if (t.candidate < 0 || t.candidate >= GRID.rows[0]!) throw new Error(`no candidate cell ${t.candidate}`);
  return [0, t.candidate];
}

/**
 * Drive the reducer from `state` to choose (row, cell) with auto-scan ticks and two selects.
 * Returns the new state and the number of highlight steps (ticks) used.
 */
export function scanTo(state: ScanState, row: number, cell: number, grid: ScanConfig = GRID): { state: ScanState; ticks: number } {
  let s = state;
  let ticks = 0;
  const step = (type: 'tick' | 'select') => {
    const r = scanReducer(grid, s, { type });
    s = r.state;
    if (type === 'tick') ticks++;
    return r.chosen;
  };
  if (s.phase === 'idle' || s.phase === 'paused') step('tick');
  let guard = 0;
  while (!(s.phase === 'rows' && s.row === row)) {
    step('tick');
    if (++guard > 1000) throw new Error('scan: row not reachable');
  }
  step('select');
  // `s` is reassigned inside step(); re-read it through a function so TS does not narrow it.
  const cur = (): ScanState => s;
  while (!(cur().phase === 'cells' && cur().cell === cell)) {
    step('tick');
    if (++guard > 2000) throw new Error('scan: cell not reachable');
  }
  const chosen = step('select');
  if (!chosen || chosen.row !== row || chosen.cell !== cell) throw new Error('scan: wrong cell chosen');
  return { state: s, ticks };
}

/** Where a target sits on the app's grid (APP_GRID). */
export function appCellOf(t: Target): [number, number] {
  if ('word' in t) return [4, t.word];
  if ('candidate' in t) return [5, t.candidate];
  const [r, c] = cellOf(t);
  return [r - 1, c];
}

/** Total highlight steps to choose a sequence of targets, starting from idle (harness grid, or the app's). */
export function scanSteps(targets: Target[], grid: 'harness' | 'app' = 'harness'): number {
  const cfg = grid === 'app' ? APP_GRID : GRID;
  const where = grid === 'app' ? appCellOf : cellOf;
  let s = initialScan(cfg);
  let total = 0;
  for (const t of targets) {
    const [r, c] = where(t);
    const out = scanTo(s, r, c, cfg);
    s = out.state;
    total += out.ticks;
  }
  return total;
}
