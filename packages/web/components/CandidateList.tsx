import { formatSentence, type Candidate, type Punct } from '@ninth/core';
import { Button } from './Button';
import { CandidateButton } from './Candidate';

/** "Sentences for your keys": up to 5 ranked rows; the rank doubles as Alt+1..5. */
export function CandidateList({
  candidates,
  selectedIndex,
  punct,
  scanning,
  litIndex,
  emptyText,
  onSelect,
  shown,
  toggle,
}: {
  candidates: Candidate[];
  selectedIndex: number;
  punct?: Punct;
  /** This list is the scan row with the ring. */
  scanning?: boolean;
  litIndex?: number;
  emptyText: string | null;
  onSelect: (index: number) => void;
  /** How many to show (compact layout shows 3); the rest wait behind `toggle`. */
  shown?: number;
  /** "More sentences" / "Fewer sentences", the last cell of the scan row when present. */
  toggle?: { label: string; onClick: () => void } | null;
}) {
  const visible = candidates.slice(0, shown ?? candidates.length);
  const usedModel = candidates.some((c) => c.source === 'llm');
  return (
    <section className={scanning ? 'cands nl-scanrow is-scanning' : 'cands nl-scanrow'} aria-labelledby="cands-title">
      <h2 className="cands__title" id="cands-title">
        Sentences for your keys
      </h2>
      {visible.length > 0 ? (
        <ol className="cands__list">
          {visible.map((c, i) => (
            <li key={c.words.join(' ')}>
              <CandidateButton
                rank={i + 1}
                text={formatSentence(c.words, punct)}
                selected={i === selectedIndex}
                lit={litIndex === i}
                onSelect={() => onSelect(i)}
              />
            </li>
          ))}
        </ol>
      ) : emptyText ? (
        <p className="cands__empty">{emptyText}</p>
      ) : null}
      {toggle && visible.length > 0 ? (
        <div className="cands__more">
          <Button variant="secondary" onClick={toggle.onClick} lit={litIndex === visible.length} aria-expanded={visible.length === candidates.length}>
            {toggle.label}
          </Button>
        </div>
      ) : null}
      <p className="nl-sr-only" aria-live="polite" aria-atomic="true">
        {candidates.length === 0
          ? ''
          : `${candidates.length} ${candidates.length === 1 ? 'sentence' : 'sentences'} for your keys${usedModel ? ', ranked with the model' : ''}.`}
      </p>
    </section>
  );
}
