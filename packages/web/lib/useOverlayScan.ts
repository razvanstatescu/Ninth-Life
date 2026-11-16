'use client';
/**
 * Switch scanning inside an open sheet or show mode (web-ui Req 16). The sheet marks its rows of
 * controls with `data-scan-row`; the first row is always Close. Cells are the enabled buttons, radios
 * and checkboxes in the row, in DOM order. The rows go to the same scanReducer as the keypad, and
 * choosing a cell clicks it, so a switch does exactly what a tap would.
 *
 * The highlight is drawn with `data-scan-state` attributes ("row" on the lit row, "lit" on the lit
 * cell), never with React class names, so it survives the sheet re-rendering itself.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useScanner, type Scanner } from './useScanner';

export const SCAN_ROW_ATTR = 'data-scan-row';
export const SCAN_STATE_ATTR = 'data-scan-state';
/** A link counts too: About Ninth Life in Menu and Settings opens in a new tab by switch as by touch (web-ui Req 37.1). */
export const SCAN_CELL_SELECTOR = 'button:not(:disabled), a[href], input[type="radio"]:not(:disabled), input[type="checkbox"]:not(:disabled)';

/** The rows of controls under `root`, each a list of its cells. Rows with no enabled control are kept (empty). */
export function collectScanRows(root: ParentNode): { row: HTMLElement; cells: HTMLElement[] }[] {
  return [...root.querySelectorAll<HTMLElement>(`[${SCAN_ROW_ATTR}]`)].map((row) => ({
    row,
    cells: [...row.querySelectorAll<HTMLElement>(SCAN_CELL_SELECTOR)].filter((el) => el.closest(`[${SCAN_ROW_ATTR}]`) === row),
  }));
}

/** What the highlight is drawn on: a radio or checkbox is drawn as its whole label. */
export function highlightOf(cell: HTMLElement): HTMLElement {
  return cell.tagName === 'INPUT' ? (cell.closest('label') ?? cell) : cell;
}

export interface OverlayScanOptions {
  /** The scan mode the overlay was opened in, or null for no scanning. */
  mode: 'scan1' | 'scan2' | null;
  /** Which overlay is open ('settings', 'phrases', 'show'...); a change starts a new scan. */
  overlay: string | null;
  /** Finds the open overlay's root element. */
  findRoot: () => HTMLElement | null;
  loops: number;
  scanMs: number;
  acceptDelayMs: number;
}

export function useOverlayScan(opts: OverlayScanOptions): Scanner {
  const active = opts.mode !== null && opts.overlay !== null;
  const [counts, setCounts] = useState<number[]>([]);
  const rowsRef = useRef<{ row: HTMLElement; cells: HTMLElement[] }[]>([]);
  const findRoot = useRef(opts.findRoot);
  findRoot.current = opts.findRoot;

  // Watch the overlay's DOM: rows appear when it opens and change as it re-renders.
  useEffect(() => {
    if (!active) {
      rowsRef.current = [];
      setCounts([]);
      return;
    }
    const root = findRoot.current();
    if (!root) return;
    const measure = () => {
      rowsRef.current = collectScanRows(root);
      const next = rowsRef.current.map((r) => r.cells.length);
      setCounts((cur) => (cur.join(',') === next.join(',') ? cur : next));
    };
    measure();
    if (typeof MutationObserver === 'undefined') return;
    const mo = new MutationObserver(measure);
    mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    return () => mo.disconnect();
  }, [active, opts.overlay]);

  const onChoose = useCallback((row: number, cell: number) => {
    const el = rowsRef.current[row]?.cells[cell];
    if (el && el.isConnected) el.click();
  }, []);

  const scanner = useScanner({
    mode: active ? opts.mode : null,
    rows: counts,
    loops: opts.loops,
    scanMs: opts.scanMs,
    acceptDelayMs: opts.acceptDelayMs,
    autoStart: true,
    resetKey: opts.overlay ?? '',
    onChoose,
  });

  // Draw the highlight.
  const { phase, row, cell } = scanner.state;
  useLayoutEffect(() => {
    const marked: HTMLElement[] = [];
    if (active && (phase === 'rows' || phase === 'cells')) {
      const r = rowsRef.current[row];
      if (r) {
        if (phase === 'rows') {
          r.row.setAttribute(SCAN_STATE_ATTR, 'row');
          marked.push(r.row);
          r.row.scrollIntoView?.({ block: 'nearest' });
        } else {
          const c = r.cells[cell];
          if (c) {
            const h = highlightOf(c);
            h.setAttribute(SCAN_STATE_ATTR, 'lit');
            marked.push(h);
            h.scrollIntoView?.({ block: 'nearest' });
          }
        }
      }
    }
    return () => marked.forEach((el) => el.removeAttribute(SCAN_STATE_ATTR));
  }, [active, phase, row, cell, counts]);

  return scanner;
}
