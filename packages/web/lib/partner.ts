/**
 * The partner strip (web-ui Req 33): what the band facing the other person shows. Pure. It never sees the
 * sentence being typed, only whether keys are being pressed, and the conversation's own turns (what was
 * said or shown). Nothing here is stored or sent.
 */
import type { Turn } from './conversation';

export type PartnerView = { kind: 'empty' } | { kind: 'typing' } | { kind: 'said'; text: string };
export type PartnerStripSetting = 'off' | 'facing' | 'upright';
export const PARTNER_STRIP_SETTINGS: readonly PartnerStripSetting[] = ['off', 'facing', 'upright'];
export const TYPING = 'Typing…';

/**
 * The newest event wins: a "you said" turn newer than the last key press shows its text; else "Typing…"
 * while a sentence is in progress; else the newest turn's text if it is yours; else nothing (their line, or
 * nothing said yet).
 */
export function partnerView(a: { typing: boolean; lastKeyAt: number | null; newest: Turn | null }): PartnerView {
  const n = a.newest;
  if (n?.who === 'me' && (a.lastKeyAt === null || n.at >= a.lastKeyAt)) return { kind: 'said', text: n.text };
  if (a.typing) return { kind: 'typing' };
  if (n?.who === 'me') return { kind: 'said', text: n.text };
  return { kind: 'empty' };
}

export type PartnerBand = 'none' | 'compact' | 'full';
/** Band height plus its gap, in px, that the rest of the screen gives up (spec 4 §1). */
export const BAND_SHIFT = { compact: 72, full: 120, fullSplit: 136 } as const;
/** With the compact band the stack hides its header up to 711px (639 + 72, the same rule at the height left). */
export const PARTNER_COMPACT_NO_HEADER_QUERY = '(max-height: 711px)';

/**
 * Which band fits (web-ui Req 33.5), from the visible height: stack 640 / 740, split 688 / 752; laptops always
 * full (the page may scroll there).
 */
export function partnerBand(layout: 'wide' | 'compact' | 'stack' | 'split', height: number): PartnerBand {
  if (layout === 'wide' || layout === 'compact') return 'full';
  if (layout === 'split') return height >= 752 ? 'full' : height >= 688 ? 'compact' : 'none';
  return height >= 740 ? 'full' : height >= 640 ? 'compact' : 'none';
}
