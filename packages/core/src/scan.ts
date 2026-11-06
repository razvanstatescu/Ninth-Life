/**
 * Row/column scanning for switch access, as a pure reducer (no timers: the UI sends 'tick').
 *   1-switch auto scan: 'tick' advances the highlight, 'select' picks the row, then the cell.
 *   2-switch step scan: 'advance' moves the highlight, 'select' picks.
 * Requirements: access-modes Req 1.1 – 3.4.
 */

export interface ScanConfig {
  /** rows[i] = number of cells in row i. Rows with 0 cells are skipped. */
  rows: number[];
  /** Full passes without a select before auto scan pauses. Values < 1 mean 1; Infinity never pauses. */
  loops: number;
}
export type ScanPhase = 'idle' | 'rows' | 'cells' | 'paused';
export interface ScanState {
  phase: ScanPhase;
  row: number;
  cell: number;
  /** Passes left in the current phase, including the one in progress. */
  loopsLeft: number;
  /** Highlight steps since the last chosen cell, reset or resume. */
  steps: number;
}
export type ScanEvent = { type: 'tick' } | { type: 'select' } | { type: 'advance' } | { type: 'reset' };
export interface ScanResult {
  state: ScanState;
  chosen?: { row: number; cell: number };
}

function loopsOf(cfg: ScanConfig): number {
  const n = Math.floor(cfg.loops);
  return n >= 1 ? n : 1;
}

function rowLen(cfg: ScanConfig, r: number): number {
  const n = Math.floor(cfg.rows[r] ?? 0);
  return n > 0 ? n : 0;
}

function firstRow(cfg: ScanConfig): number {
  for (let r = 0; r < cfg.rows.length; r++) if (rowLen(cfg, r) > 0) return r;
  return -1;
}

/** Next non-empty row after r, wrapping; wrapped = true when it went back past the last row. */
function nextRow(cfg: ScanConfig, r: number): { row: number; wrapped: boolean } {
  for (let i = r + 1; i < cfg.rows.length; i++) if (rowLen(cfg, i) > 0) return { row: i, wrapped: false };
  return { row: firstRow(cfg), wrapped: true };
}

export function initialScan(cfg: ScanConfig): ScanState {
  return { phase: 'idle', row: 0, cell: 0, loopsLeft: loopsOf(cfg), steps: 0 };
}

function startRows(cfg: ScanConfig, first: number, steps: number): ScanState {
  return { phase: 'rows', row: first, cell: 0, loopsLeft: loopsOf(cfg), steps };
}

/** Repair a state whose row or cell no longer exists (the grid changed, e.g. fewer candidates). */
function sanitize(cfg: ScanConfig, s: ScanState, first: number): ScanState {
  if (s.phase === 'rows' && rowLen(cfg, s.row) === 0) return { ...s, row: first, cell: 0 };
  if (s.phase === 'cells') {
    const len = rowLen(cfg, s.row);
    if (len === 0) return { ...s, phase: 'rows', row: first, cell: 0 };
    if (!(s.cell >= 0 && s.cell < len)) return { ...s, cell: 0 };
  }
  return s;
}

export function scanReducer(cfg: ScanConfig, s: ScanState, e: ScanEvent): ScanResult {
  if (e.type === 'reset') return { state: initialScan(cfg) };
  const first = firstRow(cfg);
  if (first < 0) return { state: s.phase === 'idle' ? s : initialScan(cfg) }; // nothing to scan
  const st = sanitize(cfg, s, first);

  if (e.type === 'select') {
    switch (st.phase) {
      case 'idle':
      case 'paused':
        return { state: startRows(cfg, first, 0) }; // start / resume; chooses nothing
      case 'rows':
        return { state: { ...st, phase: 'cells', cell: 0, loopsLeft: loopsOf(cfg) } };
      case 'cells':
        return { state: startRows(cfg, first, 0), chosen: { row: st.row, cell: st.cell } };
    }
  }

  // 'tick' (auto scan) or 'advance' (step scan): move the highlight one step.
  const auto = e.type === 'tick';
  switch (st.phase) {
    case 'paused':
      return { state: auto ? st : startRows(cfg, first, 1) };
    case 'idle':
      return { state: startRows(cfg, first, st.steps + 1) };
    case 'rows': {
      const { row, wrapped } = nextRow(cfg, st.row);
      if (wrapped && auto) {
        if (st.loopsLeft - 1 <= 0) return { state: { ...st, phase: 'paused', loopsLeft: 0 } };
        return { state: { ...st, row, loopsLeft: st.loopsLeft - 1, steps: st.steps + 1 } };
      }
      return { state: { ...st, row, steps: st.steps + 1 } };
    }
    case 'cells': {
      const len = rowLen(cfg, st.row);
      const wrapped = st.cell + 1 >= len;
      const cell = wrapped ? 0 : st.cell + 1;
      if (wrapped && auto) {
        if (st.loopsLeft - 1 <= 0) return { state: { ...st, phase: 'paused', loopsLeft: 0 } };
        return { state: { ...st, cell, loopsLeft: st.loopsLeft - 1, steps: st.steps + 1 } };
      }
      return { state: { ...st, cell, steps: st.steps + 1 } };
    }
  }
}
