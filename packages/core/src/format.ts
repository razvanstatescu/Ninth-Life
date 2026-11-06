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

/** Sentence case, "i" -> "I", "i'm" -> "I'm", then the punctuation mark (if any). Empty -> "". */
export function formatSentence(words: string[], punct?: Punct): string {
  const ws = words
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
    .map((w) => (I_FORM.test(w) ? 'I' + w.slice(1) : w));
  if (ws.length === 0) return '';
  ws[0] = capitalizeFirst(ws[0]!);
  return ws.join(' ') + (punct ?? '');
}
