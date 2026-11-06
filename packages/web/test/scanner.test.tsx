import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScanner } from '@/lib/useScanner';

afterEach(() => vi.useRealTimers());

const rows = [3, 3, 3, 3, 0, 3];

describe('useScanner', () => {
  it('1 switch: starts on select, ticks every scanMs, picks row then key', () => {
    vi.useFakeTimers();
    const onChoose = vi.fn();
    const { result } = renderHook(() => useScanner({ mode: 'scan1', rows, loops: 3, scanMs: 1200, acceptDelayMs: 0, onChoose }));
    expect(result.current.state.phase).toBe('idle');
    act(() => result.current.select());
    expect(result.current.state).toMatchObject({ phase: 'rows', row: 0 });
    act(() => void vi.advanceTimersByTime(1200));
    expect(result.current.state.row).toBe(1);
    act(() => result.current.select());
    act(() => void vi.advanceTimersByTime(1200));
    expect(result.current.state).toMatchObject({ phase: 'cells', row: 1, cell: 1 });
    act(() => result.current.select());
    expect(onChoose).toHaveBeenCalledWith(1, 1);
  });

  it('skips the empty candidate row and pauses after the set loops', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useScanner({ mode: 'scan1', rows, loops: 1, scanMs: 400, acceptDelayMs: 0, onChoose: () => undefined }));
    act(() => result.current.select());
    const seen: number[] = [];
    for (let i = 0; i < 4; i++) {
      act(() => void vi.advanceTimersByTime(400));
      seen.push(result.current.state.row);
    }
    expect(seen).toEqual([1, 2, 3, 5]);
    act(() => void vi.advanceTimersByTime(400));
    expect(result.current.state.phase).toBe('paused');
  });

  it('accept delay ignores a second press inside the window; 2 switches never tick', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useScanner({ mode: 'scan2', rows, loops: 3, scanMs: 400, acceptDelayMs: 300, onChoose: () => undefined }));
    act(() => result.current.advance());
    expect(result.current.state).toMatchObject({ phase: 'rows', row: 0 });
    act(() => result.current.advance()); // within 300 ms: ignored
    expect(result.current.state.row).toBe(0);
    act(() => void vi.advanceTimersByTime(5000));
    expect(result.current.state.row).toBe(0);
    act(() => result.current.advance());
    expect(result.current.state.row).toBe(1);
  });

  it('Req 16.2: autoStart lights the first row once rows exist; a new resetKey starts again', () => {
    const onChoose = vi.fn();
    const { result, rerender } = renderHook((p: { rows: number[]; key: string }) =>
      useScanner({ mode: 'scan2', rows: p.rows, loops: 3, scanMs: 400, acceptDelayMs: 0, autoStart: true, resetKey: p.key, onChoose }),
    { initialProps: { rows: [] as number[], key: 'menu' } });
    expect(result.current.state.phase).toBe('idle');
    rerender({ rows: [1, 3], key: 'menu' });
    expect(result.current.state).toMatchObject({ phase: 'rows', row: 0 });
    act(() => result.current.advance());
    expect(result.current.state.row).toBe(1);
    rerender({ rows: [1, 2, 2], key: 'settings' });
    expect(result.current.state).toMatchObject({ phase: 'rows', row: 0 });
  });
});
