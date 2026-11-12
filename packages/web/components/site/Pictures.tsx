/**
 * The website's drawings (marketing-site design.md §2-§6 and "Drawings", MS-7). Built from the design
 * system's nl- classes, tokens and Icon only: no images, no third-party assets, no device outline.
 * The How it works screen is in pictures/HowScreen.tsx; the 13 box drawings are in
 * pictures/Conversation.tsx, pictures/Access.tsx and pictures/Privacy.tsx.
 *
 * - Every drawing is aria-hidden and holds nothing focusable (MS-7.2). The one exception is the proof
 *   figure, whose caption, real ProofChips and closing lines are its accessible content.
 * - Played drawings (round 2) carry role and step classes from pictures/roles.ts; the base styles
 *   show the finished state and site.css plays the sequence once (A7, MS-8.11).
 * - No ember fill anywhere (MS-7.3): ember appears only as the pressed ring or the scan ring. Drawn
 *   buttons are divs with nl-btn classes, never <button>.
 */
import { Icon } from '@/components/Icon';
import { ProofChip } from '@/components/ProofChip';
import { role, type KStep, type Span } from './pictures/roles';
import { proofSaidLine, type ProofColumn, type ProofExample } from './site-data';

/** The column box sweeps the 5 columns, one step each, in all 4 digit lines together (design.md 4.2). */
const SWEEP: readonly [Span, Span, Span, Span, Span] = [[4, 5], [5, 6], [6, 7], [7, 8], [8, 9]];
/** The word rows' digit lines rise one step apart, then their real chips arrive after the sweep. */
const DIGIT_LINE: readonly [KStep, KStep, KStep] = [1, 2, 3];
const CHIP: readonly [KStep, KStep, KStep] = [9, 10, 11];
const ROWS = [0, 1, 2] as const;

/**
 * One digit line: 5 digits and the 5 sweep boxes in the same cells. For the dropped word the digit at
 * `diffAt` is boxed, with an x under it, once the sweep reaches that column (a shape cue, MS-9.3).
 */
function DigitLine({ code, roles, diffAt }: { code: string; roles?: string; diffAt?: ProofColumn }) {
  const mark = diffAt === undefined ? null : role('mark', SWEEP[diffAt][0]);
  return (
    <span className={roles ? `site-proof__digits ${roles}` : 'site-proof__digits'}>
      {code.split('').map((d, i) => (
        <span key={i} className={i === diffAt ? 'site-digit site-digit--diff' : 'site-digit'}>
          {d}
          {i === diffAt ? <span className={`site-digit__box ${mark}`} data-d={d} /> : null}
        </span>
      ))}
      {SWEEP.map((span, c) => (
        <span key={`box${c}`} className={`site-proof__box ${role('ring', ...span)}`} />
      ))}
      {diffAt === undefined ? null : (
        <span className={`site-digit__x ${mark}`} style={{ gridColumn: diffAt + 1 }}>
          <Icon name="x" />
        </span>
      )}
    </span>
  );
}

/**
 * The proof check, played once (design.md 4.2, MS-7.9): each word keeps its row; the digit lines
 * arrive, a column box sweeps the 5 columns, the dropped word's differing digit is boxed with an x,
 * the chips turn real, then the closing lines. Rendered inside figure.site-proof (the data-play root).
 */
export function ProofCheck({ proof }: { proof: ProofExample }) {
  return (
    <>
      <figcaption className="site-proof__keys">
        <span className="nl-sr-only">{`Your keys: ${proof.keys}`}</span>
        <span className="site-proof__spell" aria-hidden="true">
          <span className="site-proof__label">Your keys:</span>
          <DigitLine code={proof.keys} />
        </span>
      </figcaption>
      <ul className="site-proof__rows">
        {ROWS.map((row) => {
          const w = proof.words[row];
          if (!w) return null;
          const match = proof.matches.includes(w.word);
          return (
            <li key={w.word} className="site-proof__row">
              <div className="site-cell site-proof__chip">
                <span className={role('in', CHIP[row])}>
                  <ProofChip state={match ? 'match' : 'reject'} word={w.word} code={w.code} />
                </span>
                <span className={role('out', CHIP[row])} aria-hidden="true">
                  {/* Hidden slots for the real chip's icon and code, so both words start at the same x and the
                      cross-fade never shows two offset copies (review R3-B1). */}
                  <span className="nl-chip nl-chip--typing">
                    <Icon name="check" className="site-proof__slot" />
                    <span className="nl-chip__word">{w.word}</span>
                    <span className="nl-chip__code site-proof__slot">{w.code}</span>
                  </span>
                </span>
              </div>
              <div className="site-proof__spell" aria-hidden="true">
                <span className="site-proof__letters">
                  {w.word.split('').map((l, i) => (
                    <span key={i}>{l}</span>
                  ))}
                </span>
                <DigitLine code={w.code} roles={role('rise', DIGIT_LINE[row])} diffAt={w.word === proof.reject.word ? proof.reject.diffAt : undefined} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className={`site-proof__said ${role('in', 12)}`}>{proofSaidLine(proof)}</p>
      <p className={`site-proof__example ${role('in', 12)}`}>
        For example, if a model suggested &quot;{proof.reject.word}&quot;, the check would drop it: {proof.reject.word} is {proof.reject.code}, and your keys are {proof.keys}.
      </p>
    </>
  );
}
