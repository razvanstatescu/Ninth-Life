/**
 * Quick replies (web-ui Req 28): "Hold on." "Yes." "No." "Pardon?" "Thanks." and a Phrases button, in the
 * suggestion area whenever there is no sentence to choose (nothing typed, or the sentence was just spoken).
 *
 * - The person's pinned phrases first (up to 5, in pin order, web-ui Req 35.1), then the usual five to fill 5:
 *   the same words everywhere, and what you see is exactly what is spoken.
 * - One press speaks (Req 28.2), through CommunicationScreen's `sayAndRecord(text, 'quick')`, so each reply
 *   becomes a "you said" turn (Req 27.2, 28.7). Nothing is ever spoken or shown without that press (28.3).
 * - Where they go: the suggestion area's rows (lib/layout.ts), Menu > Quick replies on every layout with a
 *   Menu (the only place on a short phone, Req 24.9), and the top of Phrases on laptops (Req 28.4).
 * - Reply types (web-ui Req 29) share the area: with 2 or more rows, the last row (just above the keys) holds
 *   their group (`slot`) while the newest turn is theirs, so the replies stay together at the top and the
 *   group sits by the keys it changes; on 2 rows the second reply row stays in Menu.
 */

export const QUICK_REPLIES = ['Hold on.', 'Yes.', 'No.', 'Pardon?', 'Thanks.'] as const;
export type QuickReply = (typeof QUICK_REPLIES)[number];
/** At most this many pinned phrases, each at most this many characters, so a reply fits its cell (Req 35.1). */
export const MAX_PINNED = 5;
export const MAX_PIN_CHARS = 20;
export const PIN_FULL = '5 phrases are pinned. Unpin one first.';
export const PIN_TOO_LONG = 'Too long for a quick reply: it must fit 2 lines on a phone (about 20 letters). Use Phrases or Show a card for longer ones.';
/**
 * A reply longer than this does not fit a third of a 360px phone on 2 lines, so on phones the area then lays its
 * replies out 2 to a row (web-ui Req 35.1); the rest stay in Menu and Phrases.
 */
export const SHORT_REPLY_CHARS = 9;
/** Columns of the phone area for these replies: 3, or 2 when any reply is long. */
export function replyColumns(list: readonly string[]): 2 | 3 {
  return list.some((t) => t.length > SHORT_REPLY_CHARS) ? 2 : 3;
}
/** The narrowest 2-column cell's text box (360px phone): 164px cell less 8px padding each side and 2px borders. */
export const PIN_TEXT_WIDTH = 144;
export const PIN_FONT = '600 20px "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, sans-serif';

/**
 * Whether a phrase can be a quick reply (web-ui Req 35.1): at most 20 characters, and, where the browser can measure
 * text, its words wrap into at most 2 lines of PIN_TEXT_WIDTH at the reply font (a word wider than a line never fits).
 * `measure` returns a text's width in px; without one the character rule alone decides.
 */
export function fitsQuickReply(text: string, measure?: ((s: string) => number) | null): boolean {
  const t = text.trim();
  if (!t || t.length > MAX_PIN_CHARS) return false;
  if (!measure) return true;
  let lines = 1;
  let line = '';
  for (const word of t.split(/\s+/)) {
    if (measure(word) > PIN_TEXT_WIDTH) return false;
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= PIN_TEXT_WIDTH) line = next;
    else {
      lines++;
      line = word;
    }
  }
  return lines <= 2;
}

/** A text measurer at the reply font, or null where there is no canvas (tests, server). */
export function replyMeasurer(): ((s: string) => number) | null {
  if (typeof document === 'undefined') return null;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return null;
    ctx.font = PIN_FONT;
    return (s: string) => ctx.measureText(s).width;
  } catch {
    return null;
  }
}

/** The five quick replies: pinned phrases in pin order (at most 5), then the usual ones not already there. */
export function quickReplies(pinned: readonly string[] = []): string[] {
  const out: string[] = [];
  for (const t of [...pinned.slice(0, MAX_PINNED), ...QUICK_REPLIES]) {
    const x = t.trim();
    if (x && !out.includes(x)) out.push(x);
    if (out.length === MAX_PINNED) break;
  }
  return out;
}

/** What the suggestion area holds. */
export type SuggestionMode = 'sentences' | 'replies';

/**
 * Replies when there is nothing to choose: nothing typed, or the sentence on show was just spoken
 * (the next key starts a new one). Otherwise the sentences for the keys. Off in Settings: always sentences.
 */
export function suggestionMode(s: { typed: boolean; spoken: boolean; enabled: boolean }): SuggestionMode {
  if (!s.enabled) return 'sentences';
  return !s.typed || s.spoken ? 'replies' : 'sentences';
}

/** One cell of the area, in reading (and scanning) order. */
export type ReplyCell = { kind: 'reply'; text: string } | { kind: 'phrases' } | { kind: 'slot'; index: number };

const reply = (text: string): ReplyCell => ({ kind: 'reply', text });
/** Row 1: the answers needed most. */
export const REPLY_ROW_1: readonly ReplyCell[] = [reply('Hold on.'), reply('Yes.'), reply('No.')];
/** Row 2: the rest, then Phrases (opens the sheet, does not speak). */
export const REPLY_ROW_2: readonly ReplyCell[] = [reply('Pardon?'), reply('Thanks.'), { kind: 'phrases' }];

/** Menu and Phrases: the 5 replies in rows of 3 (Phrases is a sibling there, so no Phrases cell). */
export const SHEET_REPLY_ROWS: readonly (readonly ReplyCell[])[] = [REPLY_ROW_1, [reply('Pardon?'), reply('Thanks.')]];
/** The same rows for a list of replies (`quickReplies`): 3, then the rest. */
export function sheetReplyRows(list: readonly string[] = QUICK_REPLIES): ReplyCell[][] {
  return [list.slice(0, 3).map(reply), list.slice(3, 5).map(reply)].filter((r) => r.length > 0);
}

/**
 * The rows of the area, top to bottom.
 *   rows     how many rows the area has (0 on a short phone, 1 to 4 on the shells, lib/layout.ts);
 *   slot     cells of the reply-type group (web-ui Req 29) when it is shown, else 0;
 *   line     a laptop: the 5 replies on one row, no Phrases (the header has Phrases).
 * 1 row: row 1 only. 2 rows: row 1, then the slot or row 2. 3 or more: row 1, row 2, then the slot (last, by
 * the keys: it changes what the keys give, it does not say anything).
 */
export function replyRows(rows: number, slot = 0, line = false, list: readonly string[] = QUICK_REPLIES, columns: 2 | 3 = 3): ReplyCell[][] {
  const slotRow: ReplyCell[] = Array.from({ length: slot }, (_, index) => ({ kind: 'slot', index }));
  const all = list.slice(0, 5).map(reply);
  if (!line && columns === 2) {
    // Long replies on a phone (Req 35.1): 2 to a row; the last reply row ends with Phrases (the rest are there).
    const avail = Math.max(0, rows - (slot > 0 && rows >= 2 ? 1 : 0));
    if (avail <= 0) return [];
    if (avail === 1) return slot > 0 && rows >= 2 ? [all.slice(0, 2), slotRow] : [all.slice(0, 2)];
    const out: ReplyCell[][] = [];
    const pairs = Math.min(avail - 1, Math.floor(all.length / 2));
    for (let r = 0; r < pairs; r++) out.push(all.slice(r * 2, r * 2 + 2));
    const used = out.length * 2;
    out.push(used < all.length ? [all[used]!, { kind: 'phrases' }] : [{ kind: 'phrases' }]);
    return slot > 0 && rows >= 2 ? [...out, slotRow] : out;
  }
  const row1 = all.slice(0, 3);
  const row2: ReplyCell[] = [...all.slice(3, 5), { kind: 'phrases' }];
  if (line) return slot > 0 ? [all, slotRow] : [all];
  if (rows <= 0) return [];
  if (rows === 1) return [row1];
  if (slot > 0) return rows === 2 ? [row1, slotRow] : [row1, row2, slotRow];
  return [row1, row2];
}

/** Scan cells of the area: the rows read left to right, top to bottom (one scan row, Req 28.6). */
export const replyCells = (rows: ReplyCell[][]): ReplyCell[] => rows.flat();

/**
 * The repeat guard (Req 28.2): a second press of the same reply inside the accept delay is a tremor.
 * Returns the new "last press" and whether this press counts.
 */
export function acceptReply(last: { text: string; at: number } | null, text: string, at: number, delayMs: number): { ok: boolean; last: { text: string; at: number } } {
  if (last && last.text === text && at - last.at >= 0 && at - last.at < delayMs) return { ok: false, last };
  return { ok: true, last: { text, at } };
}
