import { describe, expect, it } from 'vitest';
import { mapKey } from '@/lib/keyboard';

describe('keyboard map', () => {
  it('maps digits, *, #, Backspace and numpad keys', () => {
    expect(mapKey({ key: '4', code: 'Digit4' }, 'keyboard', 'pad')).toEqual({ type: 'key', key: '4' });
    expect(mapKey({ key: '4', code: 'Numpad4' }, 'keyboard', 'pad')).toEqual({ type: 'key', key: '4' });
    expect(mapKey({ key: '*', code: 'NumpadMultiply' }, 'keyboard', 'pad')).toEqual({ type: 'key', key: '*' });
    expect(mapKey({ key: '/', code: 'NumpadDivide' }, 'keyboard', 'pad')).toEqual({ type: 'key', key: '#' });
    expect(mapKey({ key: '#', code: 'Digit3' }, 'keyboard', 'pad')).toEqual({ type: 'key', key: '#' });
    expect(mapKey({ key: 'Backspace' }, 'keyboard', 'pad')).toEqual({ type: 'key', key: '*' });
  });

  it('Enter speaks and Space is 0 only when focus is on the pad', () => {
    expect(mapKey({ key: 'Enter' }, 'keyboard', 'pad')).toEqual({ type: 'speak' });
    expect(mapKey({ key: ' ', code: 'Space' }, 'keyboard', 'pad')).toEqual({ type: 'key', key: '0' });
    expect(mapKey({ key: 'Enter' }, 'keyboard', 'control')).toBeNull();
    expect(mapKey({ key: ' ', code: 'Space' }, 'keyboard', 'control')).toBeNull();
  });

  it('Alt+1..5 picks a sentence; arrows move', () => {
    expect(mapKey({ key: '¡', code: 'Digit1', altKey: true }, 'keyboard', 'pad')).toEqual({ type: 'rank', rank: 1 });
    expect(mapKey({ key: '5', code: 'Numpad5', altKey: true }, 'keyboard', 'pad')).toEqual({ type: 'rank', rank: 5 });
    expect(mapKey({ key: '6', code: 'Digit6', altKey: true }, 'keyboard', 'pad')).toBeNull();
    expect(mapKey({ key: 'ArrowDown' }, 'keyboard', 'pad')).toEqual({ type: 'move', delta: 1 });
  });

  it('switch modes: Space and Enter are the switch, anywhere but a text field', () => {
    expect(mapKey({ key: ' ', code: 'Space' }, 'scan1', 'control')).toEqual({ type: 'switch', action: 'select' });
    expect(mapKey({ key: 'Enter' }, 'scan1', 'pad')).toEqual({ type: 'switch', action: 'select' });
    expect(mapKey({ key: ' ', code: 'Space' }, 'scan2', 'pad')).toEqual({ type: 'switch', action: 'advance' });
    expect(mapKey({ key: 'Enter' }, 'scan2', 'pad')).toEqual({ type: 'switch', action: 'select' });
    expect(mapKey({ key: ' ', code: 'Space', repeat: true }, 'scan1', 'pad')).toBeNull();
  });

  it('leaves text fields and browser shortcuts alone', () => {
    expect(mapKey({ key: '4' }, 'keyboard', 'text')).toBeNull();
    expect(mapKey({ key: '4', ctrlKey: true }, 'keyboard', 'pad')).toBeNull();
  });
});
