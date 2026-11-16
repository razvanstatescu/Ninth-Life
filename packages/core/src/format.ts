/**
 * Deterministic formatting, applied after validation. It changes case and adds the punctuation
 * the person chose; it never adds, removes or reorders words.
 * Requirements: core-encoder Req 6.1 – 6.4.
 */

export type Punct = '.' | '?' | '!' | ',';

/** "i", "i'm", "i'll", "i've", "i'd" (straight or curly apostrophe). */
const I_FORM = /^i(?:['\u2019\u02BC][a-z]+)?$/;
const FIRST_LETTER = /\p{L}/u;

function capitalizeFirst(w: string): string {
  const m = FIRST_LETTER.exec(w);
  if (!m) return w;
  const i = m.index;
  const ch = String.fromCodePoint(w.codePointAt(i)!);
  return w.slice(0, i) + ch.toUpperCase() + w.slice(i + ch.length);
}

/** Marks that end a sentence: the next word starts a new one (web-ui Req 34.3). */
export const SENTENCE_END: ReadonlySet<Punct> = new Set<Punct>(['.', '?', '!']);

/**
 * Sentence case, "i" -> "I", "i'm" -> "I'm". With `marks` (web-ui Req 34.1), each word's own mark follows it with
 * no space and the word after ". ? !" gets a capital; `end` goes after the last word only when it has no mark of
 * its own. Without `marks` it is the old behaviour: `end` after the last word. Empty -> "".
 */
export function formatSentence(words: string[], end?: Punct, marks?: readonly (Punct | undefined)[]): string {
  const ws: { w: string; mark?: Punct }[] = [];
  words.forEach((raw, i) => {
    const w = raw.trim();
    if (w.length === 0) return;
    ws.push({ w: I_FORM.test(w) ? 'I' + w.slice(1) : w, mark: marks?.[i] });
  });
  if (ws.length === 0) return '';
  ws[0]!.w = capitalizeFirst(ws[0]!.w);
  for (let i = 1; i < ws.length; i++) {
    const m = ws[i - 1]!.mark;
    if (m && SENTENCE_END.has(m)) ws[i]!.w = capitalizeFirst(ws[i]!.w);
  }
  const last = ws[ws.length - 1]!;
  if (!last.mark && end) last.mark = end;
  return ws.map((x) => x.w + (x.mark ?? '')).join(' ');
}

/**
 * Words always shown with a capital (web-ui Req 34.4): folded word -> display. Small and unambiguous: no word that
 * is also an ordinary lower-case word (may, march, august, china, turkey, polish, nice, us). Every display folds
 * back to its key.
 */
export const CAPITALS: Readonly<Record<string, string>> = Object.freeze({
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
  january: 'January', february: 'February', april: 'April', june: 'June', july: 'July',
  september: 'September', october: 'October', november: 'November', december: 'December',
  christmas: 'Christmas', easter: 'Easter',
  mr: 'Mr', mrs: 'Mrs', ms: 'Ms', dr: 'Dr',
  tv: 'TV', ok: 'OK', dvd: 'DVD', usb: 'USB', uk: 'UK', usa: 'USA',
  english: 'English', french: 'French', spanish: 'Spanish', german: 'German', italian: 'Italian',
  american: 'American', british: 'British', european: 'European',
  england: 'England', scotland: 'Scotland', ireland: 'Ireland', wales: 'Wales', britain: 'Britain', europe: 'Europe',
  america: 'America', canada: 'Canada', australia: 'Australia', india: 'India', japan: 'Japan', africa: 'Africa',
  asia: 'Asia', london: 'London', paris: 'Paris',
});
