/**
 * Single-switch row/column scan cost, measured by driving @ninth/core's scanReducer (so the
 * harness counts exactly what the app does, not a formula).
 *
 * Grid (plan section 4.5): row 0 = up to 5 candidates; rows 1-4 = keypad
 *   1 2 3 / 4 5 6 / 7 8 9 / * 0 #; row 5 = actions (speak, delete, next, save, mode).
 */
import { initialScan, scanReducer, type ScanConfig, type ScanState } from '@ninth/core';

export const GRID: ScanConfig = { rows: [5, 3, 3, 3, 3, 5], loops: Number.POSITIVE_INFINITY };

const KEY_CELL: Record<string, [number, number]> = {
  '1': [1, 0], '2': [1, 1], '3': [1, 2],
  '4': [2, 0], '5': [2, 1], '6': [2, 2],
  '7': [3, 0], '8': [3, 1], '9': [3, 2],
  '*': [4, 0], '0': [4, 1], '#': [4, 2],
};

export type Target = { key: string } | { candidate: number };

export function cellOf(t: Target): [number, number] {
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
export function scanTo(state: ScanState, row: number, cell: number): { state: ScanState; ticks: number } {
  let s = state;
  let ticks = 0;
  const step = (type: 'tick' | 'select') => {
    const r = scanReducer(GRID, s, { type });
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

/** Total highlight steps to choose a sequence of targets, starting from idle. */
export function scanSteps(targets: Target[]): number {
  let s = initialScan(GRID);
  let total = 0;
  for (const t of targets) {
    const [r, c] = cellOf(t);
    const out = scanTo(s, r, c);
    s = out.state;
    total += out.ticks;
  }
  return total;
}
