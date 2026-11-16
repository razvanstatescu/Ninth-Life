// Partner strip (web-ui Req 33; spec r6 4-partner-strip): what the band shows (partnerView, AC 12), which band a
// screen gets (partnerBand, AC 8 table) and the setting (AC 1, 33.1). The screen and the 24 sizes:
// test/partner-ui.test.tsx and test/e2e/partner.mjs.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Turn } from '@/lib/conversation';
import { partnerBand, partnerView } from '@/lib/partner';
import { DEFAULT_SETTINGS, sanitizeSettings } from '@/lib/settings';

const me = (text: string, at: number, id = at): Turn => ({ id, who: 'me', text, at, via: 'keys' } as Turn);
const them = (text: string, at: number, id = at): Turn => ({ id, who: 'them', text, at, via: 'typed' } as Turn);

describe('partnerView (Req 33.2, 33.3; spec §1 table, AC 12)', () => {
  it('nothing typed or said yet: empty', () => {
    expect(partnerView({ typing: false, lastKeyAt: null, newest: null })).toEqual({ kind: 'empty' });
  });

  it('the newest turn is theirs (They said): empty', () => {
    expect(partnerView({ typing: false, lastKeyAt: null, newest: them('Tea?', 10) })).toEqual({ kind: 'empty' });
  });

  it('a key pressed (a sentence in progress): Typing', () => {
    expect(partnerView({ typing: true, lastKeyAt: 20, newest: null })).toEqual({ kind: 'typing' });
    expect(partnerView({ typing: true, lastKeyAt: 20, newest: them('Tea?', 10) })).toEqual({ kind: 'typing' });
  });

  it('spoken: what was said, until the next key', () => {
    expect(partnerView({ typing: false, lastKeyAt: 20, newest: me('I need water.', 30) })).toEqual({ kind: 'said', text: 'I need water.' });
    // The next key: typing is newer than the turn.
    expect(partnerView({ typing: true, lastKeyAt: 40, newest: me('I need water.', 30) })).toEqual({ kind: 'typing' });
  });

  it('Clear after speaking: still what was said', () => {
    expect(partnerView({ typing: false, lastKeyAt: 20, newest: me('I need water.', 30) })).toEqual({ kind: 'said', text: 'I need water.' });
  });

  it('Clear while typing (nothing said since): the last thing said, or nothing', () => {
    expect(partnerView({ typing: false, lastKeyAt: 40, newest: me('I need water.', 30) })).toEqual({ kind: 'said', text: 'I need water.' });
    expect(partnerView({ typing: false, lastKeyAt: 40, newest: null })).toEqual({ kind: 'empty' });
  });

  it('a quick reply spoken from Menu while typing shows; the next key turns it back to Typing', () => {
    expect(partnerView({ typing: true, lastKeyAt: 40, newest: me('Hold on.', 50) })).toEqual({ kind: 'said', text: 'Hold on.' });
    expect(partnerView({ typing: true, lastKeyAt: 60, newest: me('Hold on.', 50) })).toEqual({ kind: 'typing' });
  });

  it('33.3 property: the view is only ever empty, Typing, or the text of a "you said" turn (never anything else)', () => {
    const turn = fc.oneof(
      fc.constant(null),
      fc.record({ id: fc.nat(), who: fc.constantFrom('me', 'them'), text: fc.string({ minLength: 1, maxLength: 40 }), at: fc.nat(1000), via: fc.constant('keys') }) as fc.Arbitrary<Turn>,
    );
    fc.assert(
      fc.property(fc.boolean(), fc.option(fc.nat(1000), { nil: null }), turn, (typing, lastKeyAt, newest) => {
        const v = partnerView({ typing, lastKeyAt, newest });
        if (v.kind === 'said') {
          expect(newest?.who).toBe('me');
          expect(v.text).toBe(newest!.text);
        } else if (v.kind === 'typing') expect(typing).toBe(true);
        else expect(v).toEqual({ kind: 'empty' });
        if (newest?.who === 'them' && !typing) expect(v.kind).toBe('empty');
      }),
    );
  });
});

describe('partnerBand (Req 33.5; spec §1 per-screen table)', () => {
  it('stack: none under 640, compact 640-739, full from 740', () => {
    expect(partnerBand('stack', 639)).toBe('none');
    expect(partnerBand('stack', 640)).toBe('compact');
    expect(partnerBand('stack', 739)).toBe('compact');
    expect(partnerBand('stack', 740)).toBe('full');
    expect(partnerBand('stack', 495)).toBe('none');
  });
  it('split: none under 688, compact 688-751, full from 752', () => {
    expect(partnerBand('split', 687)).toBe('none');
    expect(partnerBand('split', 688)).toBe('compact');
    expect(partnerBand('split', 751)).toBe('compact');
    expect(partnerBand('split', 752)).toBe('full');
  });
  it('laptops: always full (a phone held sideways shows only "turn upright", no band: e2e)', () => {
    expect(partnerBand('wide', 400)).toBe('full');
    expect(partnerBand('compact', 600)).toBe('full');
  });
  it('the 24 responsive sizes get the band the spec table names', () => {
    const table: [string, 'stack' | 'split', number, 'none' | 'compact' | 'full'][] = [
      ['iPhone SE Safari', 'stack', 549, 'none'],
      ['iPhone SE installed', 'stack', 647, 'compact'],
      ['iPhone SE bottom bar', 'stack', 495, 'none'],
      ['iPhone 17 Pro bottom bar', 'stack', 654, 'compact'],
      ['iPhone 16e', 'stack', 699, 'compact'],
      ['iPhone 17 Pro', 'stack', 714, 'compact'],
      ['iPhone 17 Pro Max', 'stack', 796, 'full'],
      ['Android 360x800', 'stack', 668, 'compact'],
      ['Android 412x915', 'stack', 783, 'full'],
      ['iPad mini', 'stack', 1047, 'full'],
      ['iPad mini 2 tabs', 'stack', 1005, 'full'],
      ['iPad mini landscape', 'split', 658, 'none'],
      ['iPad mini landscape 2 tabs', 'split', 616, 'none'],
      ['iPad Air 11"', 'stack', 1094, 'full'],
      ['iPad Air 11" landscape', 'split', 734, 'compact'],
      ['iPad Pro 11"', 'stack', 1124, 'full'],
      ['iPad Pro 11" landscape', 'split', 748, 'compact'],
      ['iPad Pro 13"', 'stack', 1290, 'full'],
      ['iPad Pro 13" landscape', 'split', 946, 'full'],
      ['iPad Air 13" narrow', 'stack', 840, 'full'],
      ['Android tablet 10"', 'stack', 1200, 'full'],
      ['Android tablet 10" landscape', 'split', 720, 'compact'],
    ];
    for (const [name, layout, h, band] of table) expect(partnerBand(layout, h), name).toBe(band);
  });
});

describe('partnerStrip setting (Req 33.1)', () => {
  it('is off by default', () => {
    expect((DEFAULT_SETTINGS as unknown as { partnerStrip: string }).partnerStrip).toBe('off');
  });
  it('keeps the three values and turns anything else into off', () => {
    for (const v of ['off', 'facing', 'upright']) expect((sanitizeSettings({ partnerStrip: v }) as unknown as { partnerStrip: string }).partnerStrip).toBe(v);
    for (const v of ['on', 1, null, 'words', true]) expect((sanitizeSettings({ partnerStrip: v }) as unknown as { partnerStrip: string }).partnerStrip).toBe('off');
  });
});
