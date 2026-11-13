import { REPLY_INTENTS, type ReplyIntent } from '@ninth/core';
import { useId, type ReactNode } from 'react';
import { REPLY_TYPES_HELP } from '@/lib/rankingProvider';
import { Icon } from './Icon';

/**
 * Reply types (web-ui Req 29, ADR-008): Agree, Disagree and Ask, a `role="group"` of toggle buttons
 * (`aria-pressed`), at most one pressed; pressing the pressed one releases it. They only change the order
 * of the sentences for the keys, never the words; Ask also adds a "?" (lib/composer.ts).
 *
 * A segmented control, not a row of things to say: the three sit on one sunken track, bare until pressed.
 * The pressed one is lifted onto the surface with a 4px ink ring inside and a check mark (the Settings
 * segmented style), never ember: Speak stays the screen's one ember thing.
 *
 *   row     the last row of the shells' suggestion area (QuickReplies `slot`), by the keys: the track with
 *           its "Reply type" label at the start, so it reads as a setting and not as a fourth reply;
 *   line    laptops: a "Reply type" title over the row, above the Sentences list;
 *   sheet   the Conversation and Sentences sheets: title, the row (one sheet scan row) and what it does.
 */
export const REPLY_TYPE_LABEL: Readonly<Record<ReplyIntent, string>> = { agree: 'Agree', disagree: 'Disagree', ask: 'Ask' };

export function ReplyTypes({
  value,
  onToggle,
  variant,
  litIndex = -1,
}: {
  value: ReplyIntent | undefined;
  /** Press a type (the pressed one again releases it: the caller passes undefined then). */
  onToggle: (next: ReplyIntent | undefined) => void;
  variant: 'row' | 'line' | 'sheet';
  /** Switch scanning has this cell lit (-1: none). */
  litIndex?: number;
}) {
  const titleId = useId();
  const helpId = useId();
  const buttons = REPLY_INTENTS.map((t, i) => {
    const pressed = value === t;
    return (
      <button
        key={t}
        type="button"
        className={litIndex === i ? 'reply-type is-lit' : 'reply-type'}
        aria-pressed={pressed}
        data-intent={t}
        onClick={() => onToggle(pressed ? undefined : t)}
      >
        {pressed ? <Icon name="check" className="reply-type__mark" /> : null}
        <span className="reply-type__text">{REPLY_TYPE_LABEL[t]}</span>
      </button>
    );
  });
  const group = (extra: string, label: ReactNode = null) => (
    <div
      className={`reply-types ${extra}`.trim()}
      role="group"
      aria-labelledby={titleId}
      aria-describedby={variant === 'sheet' ? helpId : undefined}
      data-reply-types={variant}
      {...(variant === 'sheet' ? { 'data-scan-row': 'reply-types' } : {})}
    >
      {label}
      {buttons}
    </div>
  );
  if (variant === 'row')
    return group(
      'reply-types--row reply-types--labelled',
      <span className="reply-types__label" id={titleId}>
        Reply type
      </span>,
    );
  if (variant === 'line')
    return (
      <div className="reply-types-line">
        <h3 className="cands__title" id={titleId}>
          Reply type
        </h3>
        {group('reply-types--line')}
      </div>
    );
  return (
    <section className="reply-types-sheet" aria-labelledby={titleId}>
      <h3 className="reply-types-sheet__title" id={titleId}>
        Reply type
      </h3>
      {group('reply-types--sheet scan-cluster')}
      <p className="field__help" id={helpId}>
        {REPLY_TYPES_HELP}
      </p>
    </section>
  );
}
