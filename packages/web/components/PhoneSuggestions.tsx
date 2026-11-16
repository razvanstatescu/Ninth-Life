import { formatSentence, type Candidate, type Punct } from '@ninth/core';
import { useLayoutEffect, useRef } from 'react';
import { showWord, type DisplayMap } from '@/lib/myWords';
import { Button } from './Button';

/**
 * The phone layout's sentence suggestions (web-ui Req 24): the other sentences for the keys as
 * 1 or 2 full-width rows right above the keypad (three suggestions next to the input is the norm;
 * whole sentences as rows, not chips: docs/research/mobile-patterns-mobbin.md). The sentence card
 * already shows the chosen one, so it is left out here (and the rows are plain buttons, not toggles:
 * choosing one moves it into the card). Each row is one line and shows the END of
 * the sentence (where readings differ) when it is too long; the full sentence is its accessible name
 * and goes to the sentence card when chosen. The area has a fixed height, so the keypad under it never
 * moves. "More" (on the last row) opens every sentence in a sheet; when a word is not in the person's
 * words, a Spell row takes the last slot (the caller then passes one row fewer).
 * Scan cells, in order: the rows, then More (or Spell).
 */
export interface PhoneSuggestion {
  /** Index in the full candidate list (rank - 1). */
  index: number;
  text: string;
}

export function phoneSuggestions(
  candidates: Candidate[],
  selectedIndex: number,
  rows: number,
  punct?: Punct,
  display?: DisplayMap | null,
  marks?: readonly (Punct | undefined)[],
): { items: PhoneSuggestion[]; more: boolean } {
  const chosen = selectedIndex >= 0 ? selectedIndex : 0;
  const others = candidates
    .map((c, index) => ({ index, text: formatSentence(c.words.map((w) => showWord(w, display)), punct, marks) }))
    .filter((s) => s.index !== chosen);
  return { items: others.slice(0, rows), more: others.length > rows };
}

export function PhoneSuggestions({
  items,
  more,
  spell,
  emptyText,
  rows,
  scanning,
  litIndex = -1,
  onSelect,
  onMore,
}: {
  items: PhoneSuggestion[];
  more: boolean;
  /** One contextual row: "Spell 7663" (a word the dictionary lacks) or "Add Mihai to my words". */
  spell: { label: string; icon?: 'spell' | 'plus'; onClick: () => void } | null;
  emptyText: string | null;
  /** Rows that fit (1 to 4 by screen height, lib/layout.ts). */
  rows: number;
  scanning?: boolean;
  litIndex?: number;
  onSelect: (index: number) => void;
  onMore: () => void;
}) {
  const cls = ['phone-sugg', 'nl-scanrow', `phone-sugg--${rows}`, scanning ? 'is-scanning' : ''].filter(Boolean).join(' ');
  // A row whose start is cut fades in from the left, so it is clear that words come before.
  const root = useRef<HTMLElement>(null);
  const shownKey = items.map((s) => s.text).join('|');
  useLayoutEffect(() => {
    for (const el of root.current?.querySelectorAll<HTMLElement>('.phone-sugg__text') ?? []) {
      el.classList.toggle('is-cut', el.scrollWidth > el.clientWidth + 1);
    }
  }, [shownKey]);
  const lastCell = items.length; // More or Spell, after the rows
  const rowEls = items.map((s, i) => {
    const isLast = i === items.length - 1;
    return (
      <div className="phone-sugg__row" key={s.index}>
        <button
          type="button"
          className={litIndex === i ? 'phone-sugg__item is-lit' : 'phone-sugg__item'}
          data-rank={s.index + 1}
          onClick={() => onSelect(s.index)}
        >
          <span className="phone-sugg__rank" aria-hidden="true">
            {s.index + 1}
          </span>
          <span className="phone-sugg__text">
            <span className="phone-sugg__end">
              <span className="nl-sr-only">Sentence {s.index + 1}: </span>
              {s.text}
            </span>
          </span>
        </button>
        {isLast && more && !spell ? (
          <Button variant="secondary" className="phone-sugg__more" lit={litIndex === lastCell} onClick={onMore} aria-label="More sentences">
            More
          </Button>
        ) : null}
      </div>
    );
  });
  return (
    <section ref={root} className={cls} aria-labelledby="phone-sugg-title" data-section-inner="cands">
      <h2 className="nl-sr-only" id="phone-sugg-title">
        Other sentences for your keys
      </h2>
      {rowEls.length > 0 ? rowEls : !spell && emptyText ? <p className="phone-sugg__empty">{emptyText}</p> : null}
      {spell ? (
        <div className="phone-sugg__row">
          <Button variant="secondary" icon={spell.icon ?? 'spell'} className="phone-sugg__spell" lit={litIndex === lastCell} onClick={spell.onClick}>
            {spell.label}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
