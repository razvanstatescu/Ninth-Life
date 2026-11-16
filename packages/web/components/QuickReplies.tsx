import { useId, type ReactNode } from 'react';
import type { ReplyCell } from '@/lib/replies';

/**
 * Quick replies (web-ui Req 28): equal cells in rows of 3 (or one row of 5 on laptops), each a button
 * whose visible text is exactly what it speaks. Phrases opens the Phrases sheet. No ember, no rank badge,
 * so they do not read as sentences. No live region: the swap with the sentences is not announced (28.6).
 *
 *   area   the shells' suggestion area: the same fixed height as the sentence rows it replaces
 *          (`phone-sugg--<size>`), so the keypad never moves;
 *   line   laptops: above the Sentences list;
 *   menu   the "Quick replies" group in Menu and Phrases: one sheet scan row (`data-scan-row`).
 *
 * Scan cells are the rows read in order (`litIndex` counts across them). The reply-type group (web-ui
 * Req 29) slots in as a row of its own through `slot`, drawn by its owner with its lit cell.
 */
export interface ReplySlot {
  /** How many scan cells the group has (its buttons, left to right). */
  cells: number;
  /**
   * The group as one row of the area, a 3-column grid like the reply rows: return its buttons (a
   * fragment), each with `is-lit` when it is `litIndex` (-1: none).
   */
  render: (litIndex: number) => ReactNode;
  /** A switch chose cell `i` of the group. */
  choose: (i: number) => void;
}

export function QuickReplies({
  rows,
  variant,
  size = rows.length,
  scanning,
  litIndex = -1,
  onSay,
  onPhrases,
  slot,
  columns = 3,
}: {
  rows: readonly (readonly ReplyCell[])[];
  variant: 'area' | 'line' | 'menu';
  /** Rows the area has (its fixed height); defaults to the rows shown. */
  size?: number;
  scanning?: boolean;
  litIndex?: number;
  onSay: (text: string) => void;
  onPhrases?: () => void;
  slot?: ReplySlot | null;
  /** 2 on a phone when a reply is long (web-ui Req 35.1). */
  columns?: 2 | 3;
}) {
  const titleId = useId();
  let n = -1;
  const grid = rows.map((row, r) => {
    const first = n + 1;
    n += row.length;
    if (row[0]?.kind === 'slot') {
      return (
        <div className="quick-replies__row quick-replies__slot" key="slot">
          {slot?.render(litIndex >= first && litIndex <= n ? litIndex - first : -1)}
        </div>
      );
    }
    return (
      <div className="quick-replies__row" key={r}>
        {row.map((cell, i) => {
          const lit = litIndex === first + i;
          if (cell.kind === 'phrases') {
            return (
              <button key="phrases" type="button" className={lit ? 'quick-reply quick-reply--phrases is-lit' : 'quick-reply quick-reply--phrases'} onClick={onPhrases}>
                Phrases
              </button>
            );
          }
          if (cell.kind !== 'reply') return null;
          return (
            <button key={cell.text} type="button" className={lit ? 'quick-reply is-lit' : 'quick-reply'} data-reply={cell.text} lang="en" onClick={() => onSay(cell.text)}>
              {cell.text}
            </button>
          );
        })}
      </div>
    );
  });

  if (variant === 'menu') return <div className="quick-replies quick-replies--menu scan-cluster" data-scan-row="quick-replies">{grid}</div>;

  const cls =
    variant === 'area'
      ? ['quick-replies', 'quick-replies--area', 'phone-sugg', `phone-sugg--${size}`, `quick-replies--${rows.length}`, columns === 2 ? 'quick-replies--pairs' : '', 'nl-scanrow', scanning ? 'is-scanning' : '']
      : ['quick-replies', 'quick-replies--line', scanning ? 'is-scanning' : ''];
  return (
    <section className={cls.filter(Boolean).join(' ')} aria-labelledby={titleId} data-section-inner="replies">
      <h2 className={variant === 'line' ? 'cands__title' : 'nl-sr-only'} id={titleId}>
        Quick replies
      </h2>
      {grid}
    </section>
  );
}
