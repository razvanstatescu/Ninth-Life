import fc from 'fast-check';
import { runs } from './arbitraries';
import { describe, expect, it } from 'vitest';
import { initialScan, scanReducer, type ScanConfig, type ScanEvent, type ScanState } from '../src/index';

const TICK: ScanEvent = { type: 'tick' };
const ADVANCE: ScanEvent = { type: 'advance' };
const SELECT: ScanEvent = { type: 'select' };

/** Ragged grid: 1..8 rows, each 0..8 cells, at least one non-empty row. */
const grid = fc
  .tuple(fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 1, maxLength: 8 }), fc.integer({ min: 1, max: 5 }))
  .filter(([rows]) => rows.some((n) => n > 0))
  .map(([rows, loops]): ScanConfig => ({ rows, loops }));

/** A grid plus a target cell that exists. */
const gridAndTarget = grid.chain((cfg) => {
  const rowsWithCells = cfg.rows.flatMap((n, r) => (n > 0 ? [r] : []));
  return fc
    .constantFrom(...rowsWithCells)
    .chain((r) => fc.record({ cfg: fc.constant(cfg), row: fc.constant(r), cell: fc.integer({ min: 0, max: cfg.rows[r]! - 1 }) }));
});

/**
 * Drive the scanner the way a switch user would: move the highlight until the target row is lit,
 * select, move until the target cell is lit, select. Returns the counts.
 */
function reach(cfg: ScanConfig, row: number, cell: number, move: ScanEvent) {
  let s: ScanState = initialScan(cfg);
  let steps = 0;
  let selects = 0;
  let chosen: { row: number; cell: number } | undefined;
  const send = (e: ScanEvent) => {
    const r = scanReducer(cfg, s, e);
    s = r.state;
    if (e === SELECT) selects++;
    else steps++;
    if (r.chosen) chosen = r.chosen;
  };
  const guard = 1000;
  while (!(s.phase === 'rows' && s.row === row) && steps < guard) send(move);
  send(SELECT);
  while (!(s.phase === 'cells' && s.cell === cell) && steps < guard) send(move);
  send(SELECT);
  return { steps, selects, chosen, state: s };
}

describe('access-modes: scanning reducer', () => {
  it('Req 1.1 – 1.4 auto scan walks rows, then cells, and chooses (example)', () => {
    const cfg: ScanConfig = { rows: [5, 3, 3, 3, 3, 5], loops: 3 };
    let s = initialScan(cfg);
    expect(s).toEqual({ phase: 'idle', row: 0, cell: 0, loopsLeft: 3, steps: 0 });
    s = scanReducer(cfg, s, TICK).state;
    expect([s.phase, s.row]).toEqual(['rows', 0]);
    s = scanReducer(cfg, s, TICK).state;
    s = scanReducer(cfg, s, TICK).state;
    expect([s.phase, s.row, s.steps]).toEqual(['rows', 2, 3]);
    s = scanReducer(cfg, s, SELECT).state;
    expect([s.phase, s.row, s.cell]).toEqual(['cells', 2, 0]);
    s = scanReducer(cfg, s, TICK).state;
    const r = scanReducer(cfg, s, SELECT);
    expect(r.chosen).toEqual({ row: 2, cell: 1 });
    expect([r.state.phase, r.state.row, r.state.steps]).toEqual(['rows', 0, 0]);
  });

  it('Req 3.1 reachability: any cell in an R x C grid is reachable in <= R + C highlight steps and exactly 2 selects, R,C in 1..8 (exhaustive)', () => {
    for (let R = 1; R <= 8; R++)
      for (let C = 1; C <= 8; C++)
        for (let row = 0; row < R; row++)
          for (let cell = 0; cell < C; cell++)
            for (const move of [TICK, ADVANCE]) {
              const cfg = { rows: Array<number>(R).fill(C), loops: 1 };
              const res = reach(cfg, row, cell, move);
              expect(res.chosen).toEqual({ row, cell });
              expect(res.selects).toBe(2);
              expect(res.steps).toBeLessThanOrEqual(R + C);
              expect(res.steps).toBe(row + 1 + cell);
            }
  });

  it('Req 3.1 reachability holds for ragged grids with empty rows, auto and step scan (property)', () => {
    fc.assert(
      fc.property(gridAndTarget, fc.constantFrom(TICK, ADVANCE), ({ cfg, row, cell }, move) => {
        const R = cfg.rows.length;
        const C = Math.max(...cfg.rows);
        const res = reach(cfg, row, cell, move);
        expect(res.chosen).toEqual({ row, cell });
        expect(res.selects).toBe(2);
        expect(res.steps).toBeLessThanOrEqual(R + C);
      }),
      { numRuns: runs(1000) },
    );
  });

  it('Req 1.5 pause after loops: each row is lit exactly `loops` times, then ticks do nothing (property)', () => {
    fc.assert(
      fc.property(grid, fc.integer({ min: 1, max: 40 }), (cfg, extra) => {
        let s = initialScan(cfg);
        const lit = new Map<number, number>();
        let ticks = 0;
        while (s.phase !== 'paused' && ticks < 10_000) {
          s = scanReducer(cfg, s, TICK).state;
          ticks++;
          if (s.phase === 'rows') lit.set(s.row, (lit.get(s.row) ?? 0) + 1);
        }
        expect(s.phase).toBe('paused');
        cfg.rows.forEach((n, r) => expect(lit.get(r) ?? 0).toBe(n > 0 ? cfg.loops : 0));
        const paused = s;
        for (let i = 0; i < extra; i++) s = scanReducer(cfg, s, TICK).state;
        expect(s).toEqual(paused);
      }),
      { numRuns: runs(500) },
    );
  });

  it('Req 1.5 pause after loops inside a row: each cell is lit exactly `loops` times (property)', () => {
    fc.assert(
      fc.property(gridAndTarget, ({ cfg, row }) => {
        let s = initialScan(cfg);
        while (!(s.phase === 'rows' && s.row === row)) s = scanReducer(cfg, s, ADVANCE).state;
        s = scanReducer(cfg, s, SELECT).state;
        const lit = new Map<number, number>([[0, 1]]);
        let ticks = 0;
        while (s.phase !== 'paused' && ticks < 10_000) {
          s = scanReducer(cfg, s, TICK).state;
          ticks++;
          if (s.phase === 'cells') lit.set(s.cell, (lit.get(s.cell) ?? 0) + 1);
        }
        expect(s.phase).toBe('paused');
        for (let c = 0; c < cfg.rows[row]!; c++) expect(lit.get(c)).toBe(cfg.loops);
      }),
      { numRuns: runs(500) },
    );
  });

  it('Req 1.6 select while paused resumes row scanning and chooses nothing', () => {
    const cfg: ScanConfig = { rows: [2, 2], loops: 1 };
    let s = initialScan(cfg);
    for (let i = 0; i < 3; i++) s = scanReducer(cfg, s, TICK).state;
    expect(s.phase).toBe('paused');
    const r = scanReducer(cfg, s, SELECT);
    expect(r.chosen).toBeUndefined();
    expect([r.state.phase, r.state.row, r.state.loopsLeft, r.state.steps]).toEqual(['rows', 0, 1, 0]);
  });

  it('Req 2.1 + 2.2 step scan (advance) never pauses, and advance resumes a paused scan (property)', () => {
    fc.assert(
      fc.property(grid, fc.integer({ min: 1, max: 200 }), (cfg, n) => {
        let s = initialScan(cfg);
        for (let i = 0; i < n; i++) {
          s = scanReducer(cfg, s, ADVANCE).state;
          expect(s.phase).toBe('rows');
        }
        s = { ...s, phase: 'paused' };
        expect(scanReducer(cfg, s, ADVANCE).state.phase).toBe('rows');
      }),
    );
  });

  it('Req 3.2 + 3.3 any event sequence, even with the grid changing underneath, only chooses cells that exist (property)', () => {
    const ev = fc.constantFrom<ScanEvent>(TICK, ADVANCE, SELECT, { type: 'reset' });
    fc.assert(
      fc.property(fc.array(fc.tuple(ev, fc.option(grid, { freq: 5 })), { maxLength: 200 }), grid, (events, cfg0) => {
        let cfg = cfg0;
        let s = initialScan(cfg);
        for (const [e, newCfg] of events) {
          if (newCfg) cfg = newCfg;
          const before = JSON.stringify(s);
          const r = scanReducer(cfg, s, e);
          expect(JSON.stringify(s)).toBe(before); // Req 3.5 pure: input state not mutated
          if (r.chosen) {
            expect(r.chosen.row).toBeGreaterThanOrEqual(0);
            expect(r.chosen.row).toBeLessThan(cfg.rows.length);
            expect(r.chosen.cell).toBeGreaterThanOrEqual(0);
            expect(r.chosen.cell).toBeLessThan(cfg.rows[r.chosen.row]!);
          }
          s = r.state;
          if (s.phase === 'rows' || s.phase === 'cells') expect(cfg.rows[s.row]!).toBeGreaterThan(0);
        }
      }),
      { numRuns: runs(500) },
    );
  });

  it('Req 3.2 messy configs (negative, fractional, NaN cell counts; loops 0, NaN, 2.5, Infinity) never break the reducer (property)', () => {
    const messyCfg = fc.record({
      rows: fc.array(fc.oneof(fc.integer({ min: 0, max: 8 }), fc.constantFrom(-1, 2.5, 0.5, Number.NaN, 1e9)), { minLength: 0, maxLength: 8 }),
      loops: fc.oneof(fc.integer({ min: -2, max: 5 }), fc.constantFrom(Number.NaN, 2.5, Number.POSITIVE_INFINITY)),
    });
    const ev = fc.constantFrom<ScanEvent>(TICK, ADVANCE, SELECT, { type: 'reset' });
    fc.assert(
      fc.property(messyCfg, fc.array(ev, { maxLength: 300 }), (cfg, events) => {
        let s = initialScan(cfg);
        for (const e of events) {
          const r = scanReducer(cfg, s, e);
          if (r.chosen) {
            expect(Number.isInteger(r.chosen.row) && Number.isInteger(r.chosen.cell)).toBe(true);
            expect(r.chosen.cell).toBeLessThan(Math.floor(cfg.rows[r.chosen.row]!));
            expect(r.chosen.cell).toBeGreaterThanOrEqual(0);
          }
          s = r.state;
          expect(['idle', 'rows', 'cells', 'paused']).toContain(s.phase);
          expect(Number.isNaN(s.loopsLeft)).toBe(false);
        }
      }),
      { numRuns: runs(500) },
    );
  });

  it('Req 3.3 an all-empty grid stays idle; empty rows are skipped', () => {
    const empty: ScanConfig = { rows: [0, 0], loops: 3 };
    const s0 = initialScan(empty);
    for (const e of [TICK, ADVANCE, SELECT]) expect(scanReducer(empty, s0, e)).toEqual({ state: s0 });
    const cfg: ScanConfig = { rows: [0, 4, 0, 3], loops: 3 };
    let s = scanReducer(cfg, initialScan(cfg), TICK).state;
    expect(s.row).toBe(1);
    s = scanReducer(cfg, s, TICK).state;
    expect(s.row).toBe(3);
  });

  it('Req 3.4 reset returns the initial state from anywhere', () => {
    const cfg: ScanConfig = { rows: [3, 3], loops: 2 };
    let s = initialScan(cfg);
    for (const e of [TICK, TICK, SELECT, TICK]) s = scanReducer(cfg, s, e).state;
    expect(scanReducer(cfg, s, { type: 'reset' }).state).toEqual(initialScan(cfg));
  });
});
