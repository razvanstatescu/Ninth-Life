'use client';
/**
 * Switch scanning on top of scanReducer from @ninth/core. The reducer is pure; this hook owns
 * the timer (1 switch auto scan) and the accept delay that ignores a second press caused by a
 * tremor. Motion is a highlight jump; the reducer never animates anything.
 */
import { initialScan, scanReducer, type ScanConfig, type ScanState } from '@ninth/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface ScannerOptions {
  /** 'scan1': auto scan with one switch. 'scan2': one switch moves, the other selects. null: off. */
  mode: 'scan1' | 'scan2' | null;
  rows: number[];
  loops: number;
  scanMs: number;
  acceptDelayMs: number;
  /** Stop the timer (a sheet is open, speech is running...). */
  paused?: boolean;
  onChoose: (row: number, cell: number) => void;
}

export interface Scanner {
  state: ScanState;
  select: () => void;
  advance: () => void;
  reset: () => void;
}

export function useScanner(opts: ScannerOptions): Scanner {
  const rowsKey = opts.rows.join(',');
  const cfg: ScanConfig = useMemo(() => ({ rows: rowsKey ? rowsKey.split(',').map(Number) : [], loops: opts.loops }), [rowsKey, opts.loops]);
  const [state, setState] = useState<ScanState>(() => initialScan(cfg));
  const stateRef = useRef(state);
  const cfgRef = useRef(cfg);
  const chooseRef = useRef(opts.onChoose);
  const lastSwitch = useRef(0);
  cfgRef.current = cfg;
  chooseRef.current = opts.onChoose;

  const dispatch = useCallback((type: 'tick' | 'select' | 'advance' | 'reset') => {
    const { state: next, chosen } = scanReducer(cfgRef.current, stateRef.current, { type });
    stateRef.current = next;
    setState(next);
    if (chosen) chooseRef.current(chosen.row, chosen.cell);
  }, []);

  const debounced = useCallback(
    (type: 'select' | 'advance') => {
      const now = Date.now();
      if (now - lastSwitch.current < opts.acceptDelayMs) return;
      lastSwitch.current = now;
      dispatch(type);
    },
    [dispatch, opts.acceptDelayMs],
  );

  // Turning scanning off or on starts again from idle.
  useEffect(() => {
    stateRef.current = initialScan(cfgRef.current);
    setState(stateRef.current);
  }, [opts.mode]);

  const running = opts.mode === 'scan1' && !opts.paused && (state.phase === 'rows' || state.phase === 'cells');
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => dispatch('tick'), opts.scanMs);
    return () => clearInterval(id);
  }, [running, opts.scanMs, dispatch]);

  return {
    state,
    select: () => debounced('select'),
    advance: () => debounced('advance'),
    reset: () => dispatch('reset'),
  };
}
