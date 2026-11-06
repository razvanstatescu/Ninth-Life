import { formatSentence } from '@ninth/core';
import type { RejectedSuggestion } from '@/lib/decodeClient';
import type { DisplayWord } from '@/lib/sentence';
import { ProofChip } from './ProofChip';

function quoteList(words: string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
}

/**
 * The proof: every word on show as a ProofChip, plus any model suggestion that was dropped
 * because its letters do not match the keys. Dropped words are shown, struck through, and never spoken.
 */
export function ProofPanel({
  words,
  labels = [],
  rejected,
  rejectedCount = 0,
  alternatives,
}: {
  words: DisplayWord[];
  /** How each word is written in the sentence ("I", not "i"); trailing punctuation is dropped. */
  labels?: string[];
  rejected: RejectedSuggestion[];
  /** Suggestions the server dropped before replying (shown as a count when it sent no words). */
  rejectedCount?: number;
  /** For slot i, the words the keys do spell (from the valid sentences). */
  alternatives: (i: number) => string[];
}) {
  const rejectChips: { word: string; code: string; key: string }[] = [];
  const notes: string[] = [];
  const seen = new Set<string>();
  // Whole sentences the client re-check refused (at most 3), then single words the server
  // reported (F7, `slot` set, at most 5). Every one is struck through and never spoken.
  const shown = [...rejected.filter((r) => r.slot === undefined).slice(0, 3), ...rejected.filter((r) => r.slot !== undefined).slice(0, 5)];
  for (const r of shown) {
    const bad = r.proof.map((p, i) => ({ p, i: r.slot ?? i })).filter(({ p }) => p.state === 'reject' && p.word);
    for (const { p } of bad) {
      if (seen.has(p.word)) continue;
      seen.add(p.word);
      rejectChips.push({ word: p.word, code: p.code ?? '', key: `r-${p.word}` });
    }
    const first = bad[0];
    if (first && notes.length < 3) {
      const spells = alternatives(first.i).filter((w) => w !== first.p.word).slice(0, 3);
      const dropped = quoteList(bad.map(({ p }) => p.word));
      const said = r.slot === undefined ? formatSentence(r.words) : first.p.word;
      notes.push(
        spells.length > 0
          ? `The model suggested "${said}". Your keys spell ${quoteList(spells)}, so ${dropped} was dropped and will not be spoken.`
          : `The model suggested "${said}". ${dropped} does not match your keys, so it was dropped and will not be spoken.`,
      );
    }
  }

  return (
    <section className="card proof" aria-labelledby="proof-title">
      <div className="proof__head">
        <h2 className="proof__title" id="proof-title">
          Proof
        </h2>
        <p className="proof__lead">Every word that can be spoken matches the keys you pressed.</p>
      </div>
      {words.length === 0 && rejectChips.length === 0 ? (
        <p className="proof__note">Each word shows here with its keys as you type.</p>
      ) : (
        <ul className="proof__chips">
          {words.map((w, i) => (
            <li key={`w-${i}`}>
              <ProofChip state={w.state} word={labels[i]?.replace(/[.?!,]+$/, '') || w.word || w.partial || w.code} code={w.code} />
            </li>
          ))}
          {rejectChips.map((c) => (
            <li key={c.key}>
              <ProofChip state="reject" word={c.word} code={c.code} />
            </li>
          ))}
        </ul>
      )}
      {words.some((w) => w.state === 'typing') ? (
        <p className="proof__note">The last word is not finished yet. Keep typing, or press Back.</p>
      ) : null}
      {words.some((w) => w.state === 'new') ? <p className="proof__note">A word with a plus is not in your words yet. It matches your keys and can be spoken.</p> : null}
      {rejectedCount > 0 && rejected.length === 0 ? (
        <p className="proof__note">
          The model suggested {rejectedCount === 1 ? '1 sentence' : `${rejectedCount} sentences`} that did not match your keys. {rejectedCount === 1 ? 'It was' : 'They were'} dropped and will not be spoken.
        </p>
      ) : null}
      {notes.map((n) => (
        <p className="proof__note" key={n}>
          {n}
        </p>
      ))}
    </section>
  );
}
