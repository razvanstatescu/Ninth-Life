/**
 * Quick replies (web-ui Req 28): "Hold on." "Yes." "No." "Pardon?" "Thanks." and a Phrases button, in the
 * suggestion area whenever there is no sentence to choose (nothing typed, or the sentence was just spoken).
 *
 * - A fixed set, the same words everywhere, and what you see is exactly what is spoken. Editing your own
 *   words lives in Phrases.
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
export type ReplyCell = { kind: 'reply'; text: QuickReply } | { kind: 'phrases' } | { kind: 'slot'; index: number };

const reply = (text: QuickReply): ReplyCell => ({ kind: 'reply', text });
/** Row 1: the answers needed most. */
export const REPLY_ROW_1: readonly ReplyCell[] = [reply('Hold on.'), reply('Yes.'), reply('No.')];
/** Row 2: the rest, then Phrases (opens the sheet, does not speak). */
export const REPLY_ROW_2: readonly ReplyCell[] = [reply('Pardon?'), reply('Thanks.'), { kind: 'phrases' }];

/** Menu and Phrases: the 5 replies in rows of 3 (Phrases is a sibling there, so no Phrases cell). */
export const SHEET_REPLY_ROWS: readonly (readonly ReplyCell[])[] = [REPLY_ROW_1, [reply('Pardon?'), reply('Thanks.')]];

/**
 * The rows of the area, top to bottom.
 *   rows     how many rows the area has (0 on a short phone, 1 to 4 on the shells, lib/layout.ts);
 *   slot     cells of the reply-type group (web-ui Req 29) when it is shown, else 0;
 *   line     a laptop: the 5 replies on one row, no Phrases (the header has Phrases).
 * 1 row: row 1 only. 2 rows: row 1, then the slot or row 2. 3 or more: row 1, row 2, then the slot (last, by
 * the keys: it changes what the keys give, it does not say anything).
 */
export function replyRows(rows: number, slot = 0, line = false): ReplyCell[][] {
  const slotRow: ReplyCell[] = Array.from({ length: slot }, (_, index) => ({ kind: 'slot', index }));
  if (line) return slot > 0 ? [QUICK_REPLIES.map(reply), slotRow] : [QUICK_REPLIES.map(reply)];
  if (rows <= 0) return [];
  if (rows === 1) return [[...REPLY_ROW_1]];
  if (slot > 0) return rows === 2 ? [[...REPLY_ROW_1], slotRow] : [[...REPLY_ROW_1], [...REPLY_ROW_2], slotRow];
  return [[...REPLY_ROW_1], [...REPLY_ROW_2]];
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
