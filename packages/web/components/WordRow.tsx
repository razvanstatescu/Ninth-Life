import { useId } from 'react';
import { showWord, type DisplayMap } from '@/lib/myWords';
import { Button } from './Button';

/** The heading of the word row and of its Menu group on short phones (web-ui Req 31). */
export const FINISH_THE_WORD = 'Finish the word';
/** The same places, for keys that spell nothing (web-ui Req 32.4). */
export const DID_YOU_MEAN = 'Did you mean';
/** Three fixed places: word 1 is always left, word 3 right; fewer words leave the later places empty. */
export const WORD_PLACES = 3;
/** A word this long drops from 20px to 16px and may wrap to 2 lines (never cut, never under 16px). */
const LONG_WORD = 9;

/**
 * Finish the word (web-ui Req 31.1, 31.5, 31.6): up to 3 words that start with the keys typed so far, in
 * three places that never move. One press puts the whole word in and closes it; nothing is spoken. The
 * row can be ignored: keys, 0, # and Speak work as before. `row` is the main screen's row (its own scan
 * row); `menu` is the group in Menu > This sentence on short phones (one scan cluster).
 */
export function WordRow({
  words,
  display,
  onPick,
  variant = 'row',
  scanning = false,
  litIndex = -1,
  title = FINISH_THE_WORD,
  ariaFor,
  extra = null,
}: {
  words: readonly string[];
  display?: DisplayMap | null;
  onPick: (word: string) => void;
  variant?: 'row' | 'menu';
  scanning?: boolean;
  litIndex?: number;
  /** "Finish the word", or "Did you mean" for keys that spell nothing. */
  title?: string;
  /** An accessible name that starts with the word (Did you mean adds the new keys and the change). */
  ariaFor?: (w: string) => string;
  /** A last cell after the words (a 1-row phone's "Spell 7532573" beside Did you mean). */
  extra?: { label: string; onClick: () => void } | null;
}) {
  const id = useId();
  const n = extra ? WORD_PLACES - 1 : WORD_PLACES;
  const places = Array.from({ length: n }, (_, i) => words[i] ?? null);
  const cells = (
    <div className="word-row__cells">
      {places.map((w, i) => {
        if (w === null) return <span key={`empty-${i}`} className="word-row__empty" aria-hidden="true" />;
        const shown = showWord(w, display);
        return (
          <Button
            key={`${i}-${w}`}
            variant="secondary"
            className={shown.length >= LONG_WORD ? 'word-row__word word-row__word--long' : 'word-row__word'}
            lit={litIndex === i}
            data-word={w}
            aria-label={ariaFor ? ariaFor(w) : undefined}
            onClick={() => onPick(w)}
          >
            {shown}
          </Button>
        );
      })}
      {extra ? (
        <Button variant="secondary" icon="spell" className="word-row__word word-row__word--long" lit={litIndex === words.slice(0, n).length} onClick={extra.onClick}>
          {extra.label}
        </Button>
      ) : null}
    </div>
  );
  if (variant === 'menu') {
    return (
      <section className="group word-row word-row--menu" aria-labelledby={id}>
        <h3 className="group__title" id={id}>
          {title}
        </h3>
        <div className="scan-cluster" data-scan-row="words">
          {cells}
        </div>
      </section>
    );
  }
  return (
    <section className={scanning ? 'word-row nl-scanrow is-scanning' : 'word-row nl-scanrow'} aria-labelledby={id} data-section-inner="words">
      <h2 className="nl-sr-only" id={id}>
        {title}
      </h2>
      {cells}
    </section>
  );
}
