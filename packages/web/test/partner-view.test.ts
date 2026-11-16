/** The partner strip's content and size (web-ui Req 33.2, 33.3, 33.5). */
import { describe, expect, it } from 'vitest';
import type { Turn } from '@/lib/conversation';
import { partnerBand, partnerView } from '@/lib/partner';

const me = (text: string, at: number): Turn => ({ id: at, who: 'me', text, at, via: 'keys' });
const them = (text: string, at: number): Turn => ({ id: at, who: 'them', text, at, via: 'typed' });

describe('partnerView (Req 33.2, 33.3)', () => {
  it('nothing typed or said: empty', () => expect(partnerView({ typing: false, lastKeyAt: null, newest: null })).toEqual({ kind: 'empty' }));
  it('their line is the newest: empty', () => expect(partnerView({ typing: false, lastKeyAt: null, newest: them('Hi', 5) })).toEqual({ kind: 'empty' }));
  it('typing: Typing… (never the words)', () => expect(partnerView({ typing: true, lastKeyAt: 10, newest: them('Hi', 5) })).toEqual({ kind: 'typing' }));
  it('spoken: what was said', () => expect(partnerView({ typing: false, lastKeyAt: 10, newest: me('Yes.', 12) })).toEqual({ kind: 'said', text: 'Yes.' }));
  it('the next key after speaking: Typing…', () => expect(partnerView({ typing: true, lastKeyAt: 20, newest: me('Yes.', 12) })).toEqual({ kind: 'typing' }));
  it('a quick reply while typing shows, until the next key', () => {
    expect(partnerView({ typing: true, lastKeyAt: 10, newest: me('Hold on.', 15) })).toEqual({ kind: 'said', text: 'Hold on.' });
    expect(partnerView({ typing: true, lastKeyAt: 16, newest: me('Hold on.', 15) })).toEqual({ kind: 'typing' });
  });
  it('Clear after speaking keeps what was said', () => expect(partnerView({ typing: false, lastKeyAt: 20, newest: me('Yes.', 12) })).toEqual({ kind: 'said', text: 'Yes.' }));
});

describe('partnerBand (Req 33.5)', () => {
  it('stack, split and laptops', () => {
    expect([639, 640, 739, 740].map((h) => partnerBand('stack', h))).toEqual(['none', 'compact', 'compact', 'full']);
    expect([687, 688, 751, 752].map((h) => partnerBand('split', h))).toEqual(['none', 'compact', 'compact', 'full']);
    expect(partnerBand('wide', 400)).toBe('full');
    expect(partnerBand('compact', 400)).toBe('full');
  });
});
