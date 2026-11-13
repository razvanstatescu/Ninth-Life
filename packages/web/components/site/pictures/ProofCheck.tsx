/**
 * The proof figure (#proof, MS-7.9; round 4, 2026-11-13, Claude Code). One grid in which a word's letters always sit
 * under the key that types them: "Your keys" as five drawn keys on a panel (the digit and the key's letters, from
 * KEY_LETTERS at build time), then one row per suggested word with its real ProofChip and, aria-hidden, its letters
 * in the five key columns. The dropped word's letter at diffAt is boxed in reject with an x under it: shape, not
 * only colour (MS-9.3). Two closing lines, real text, each led by its chip's icon, say what can and cannot be spoken.
 *
 * Accessible content (MS-7.2): the caption "Your keys: {keys}", the three ProofChips and the two closing lines. The
 * key line, the letter lines and the typing chips are aria-hidden; nothing here is focusable.
 *
 * Played (A7, MS-8.11): the data-play root is the whole proof layout (sections/Proof.tsx), whose step numbers light
 * on the same clock. Base styles are the finished frame (MS-7.5). The steps below are motion-sweep (240 ms) steps:
 * the keys' outline k0-2; suggestions arrive as typing chips k2, k3, k4; a column box sweeps the five columns k5-k9
 * and each column's letters land under their key in the same step; the differing letter's box and x at its column's
 * step; the match chips at k10, the reject chip at k11; the closing lines at k12.
 */
import { Icon } from '@/components/Icon';
import { ProofChip } from '@/components/ProofChip';
import { proofCanLine, proofNeverLine, type ProofExample } from '../site-data';
import { role, type KStep, type Span } from './roles';

/** The column box: one step per column, in the key line and every letter line together. */
const SWEEP: readonly [Span, Span, Span, Span, Span] = [[5, 6], [6, 7], [7, 8], [8, 9], [9, 10]];
/** Each suggestion arrives as a typing chip, one step apart (rows 1-3). */
const ARRIVE: readonly [KStep, KStep, KStep] = [2, 3, 4];
/** The verdicts after the sweep: the matching words first, then the dropped one. */
const VERDICT = { match: 10, reject: 11 } as const;
/** Step 1's outline around the keys, and the closing lines. */
const SPOT: Span = [0, 2];
const CLOSING: KStep = 12;

/** The five column boxes of one line, in the same cells as its keys or letters (site.css places them). */
function Boxes() {
  return (
    <>
      {SWEEP.map((span, c) => (
        <span key={`box${c}`} className={`site-proof__box ${role('ring', ...span)}`} />
      ))}
    </>
  );
}

export function ProofCheck({ proof }: { proof: ProofExample }) {
  const { keys, keyLetters, words, matches, reject } = proof;
  return (
    <figure className="site-proof" data-reveal="">
      <figcaption className="site-proof__keys">
        <span className="nl-sr-only">{`Your keys: ${keys}`}</span>
        <span className="site-proof__keyrow" aria-hidden="true">
          <span className="site-proof__label">Your keys</span>
          <span className="site-proof__line site-proof__keyline">
            {keys.split('').map((d, c) => (
              <span key={c} className="site-keycap">
                <span className="site-keycap__digit">{d}</span>
                <span className="site-keycap__letters">{keyLetters[c]}</span>
              </span>
            ))}
            <Boxes />
            <span className={`site-proof__spot ${role('ring', ...SPOT)}`} />
          </span>
        </span>
      </figcaption>
      <ul className="site-proof__rows">
        {words.map((w, row) => {
          const state = matches.includes(w.word) ? 'match' : 'reject';
          const dropped = w.word === reject.word;
          const arrive = ARRIVE[Math.min(row, 2)]!;
          return (
            <li key={w.word} className="site-proof__row">
              <div className="site-cell site-proof__chip">
                <span className={role('in', VERDICT[state])}>
                  <ProofChip state={state} word={w.word} code={w.code} />
                </span>
                <span className={role('during', arrive, VERDICT[state])} aria-hidden="true">
                  {/* Hidden slots for the real chip's icon and code, so both words start at the same x (review R3-B1). */}
                  <span className="nl-chip nl-chip--typing">
                    <Icon name="check" className="site-proof__slot" />
                    <span className="nl-chip__word">{w.word}</span>
                    <span className="nl-chip__code site-proof__slot">{w.code}</span>
                  </span>
                </span>
              </div>
              <div className="site-proof__line site-proof__spell" aria-hidden="true">
                {w.word.split('').map((l, c) => {
                  const k = SWEEP[c as 0 | 1 | 2 | 3 | 4][0];
                  return (
                    <span key={c} className={`site-letter ${role('rise', k)}`}>
                      {l}
                      {dropped && c === reject.diffAt ? <span className={`site-letter__box ${role('mark', k)}`} data-l={l} /> : null}
                    </span>
                  );
                })}
                <Boxes />
                {dropped ? (
                  <span className={`site-proof__x ${role('mark', SWEEP[reject.diffAt][0])}`} style={{ gridColumn: reject.diffAt + 1 }}>
                    <Icon name="x" />
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className={`site-proof__closing ${role('in', CLOSING)}`}>
        <p className="site-proof__said site-proof__said--can">
          <Icon name="check" />
          <span>{proofCanLine(proof)}</span>
        </p>
        <p className="site-proof__said site-proof__said--never">
          <Icon name="x" />
          <span>{proofNeverLine(proof)}</span>
        </p>
      </div>
    </figure>
  );
}
