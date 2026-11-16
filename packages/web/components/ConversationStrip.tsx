'use client';
/**
 * The conversation on the main screen (web-ui Req 27.4-27.6, ADR-007). Where it fits, by layout
 * (lib/layout.ts threadRows): their newest line inside the header's They said button (ThreadBubble,
 * stack 640-1149px; yours only before they have said anything), a fixed-height strip of the newest 2 turns above the sentence card (ThreadStrip,
 * split and stack 1150px or taller) or a panel of the newest 3 (ThreadPanel, laptop layouts). Each turn
 * opens the Conversation sheet on that turn. Who said it is a word, "They" or "You", never color alone.
 * Nothing here is a live region (the polite announcements are CommunicationScreen's), and nothing is ember.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useDictationSupported } from '@/lib/dictation';
import type { ThemVia, Turn } from '@/lib/conversation';
import { Button } from './Button';
import { PartnerTurn, type PartnerTurnHandle } from './PartnerTurn';

export type Dictation = { allowed: boolean; onAllow: () => void } | null;

/** "They" or "You": the short word on the main screen. */
export const whoShort = (t: Pick<Turn, 'who'>) => (t.who === 'them' ? 'They' : 'You');
/** "They said" or "You said": the sheet and Show mode. */
export const whoLong = (t: Pick<Turn, 'who'>) => (t.who === 'them' ? 'They said' : 'You said');

/** The tag and the line, cut to one row by CSS. */
function TurnLine({ turn, textClass }: { turn: Turn; textClass: string }) {
  return (
    <>
      <span className="thread-tag">{whoShort(turn)}</span>{' '}
      {/* The space keeps "They" and the line apart in the visible text (WCAG 2.5.3; flex layout ignores it). */}
      <span className={textClass} lang="en">
        {turn.text}
      </span>
    </>
  );
}
/** The name of a turn button: "They: <the whole line>", the visible words first (WCAG 2.5.3), never cut. */
export const turnName = (t: Turn) => `${whoShort(t)}: ${t.text}`;

/**
 * The header's They said button (stack 640-1149px). No turns: the 56px speech-bubble square that opens
 * the They said field (Req 25.3). With turns: their newest line (or, before they have said anything,
 * yours) on one row, cut with an ellipsis, which opens the Conversation sheet on it. Their line, not
 * yours, because what you said is already on the sentence card.
 */
export function ThreadBubble({ last, onOpen, onAdd, lit = false }: { last: Turn | null; onOpen: () => void; onAdd: () => void; lit?: boolean }) {
  if (!last)
    return (
      <Button variant="secondary" icon="said" onClick={onAdd} aria-label="They said" className="header-partner header-partner--empty" lit={lit} data-thread="bubble">
        {null}
      </Button>
    );
  return (
    <Button variant="secondary" onClick={onOpen} className="header-partner thread-bubble" data-who={last.who} lit={lit} aria-haspopup="dialog" aria-label={turnName(last)} data-thread="bubble">
      <TurnLine turn={last} textClass="header-partner__text" />
    </Button>
  );
}

/**
 * The strip (split, and stack 1150px or taller): fixed height (2 rows of 56px and a gap), so the keys
 * never move whatever is said. Newest first; They said and All on the right, always in the same place.
 * One turn takes both rows (up to 3 lines of it, so a long line is readable); none: an outlined empty box.
 * Scan cells, in order: the turns shown, They said, All.
 */
export function ThreadStrip({
  turns,
  onOpenTurn,
  onOpen,
  onAdd,
  scanning = false,
  litIndex = -1,
}: {
  /** Newest first, at most 2. */
  turns: readonly Turn[];
  onOpenTurn: (id: number) => void;
  onOpen: () => void;
  onAdd: () => void;
  scanning?: boolean;
  litIndex?: number;
}) {
  const shown = turns.slice(0, 2);
  const cls = ['thread-strip', 'nl-scanrow', scanning ? 'is-scanning' : ''].filter(Boolean).join(' ');
  return (
    <section className={cls} aria-labelledby="thread-strip-title" data-thread="strip">
      <h2 className="nl-sr-only" id="thread-strip-title">
        Conversation, newest first
      </h2>
      <div className="thread-strip__turns">
        {shown.length === 0 ? <p className="thread-strip__empty">Nothing said yet. Add their line with They said.</p> : null}
        {shown.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className={['thread-row', shown.length === 1 ? 'thread-row--tall' : '', litIndex === i ? 'is-lit' : ''].filter(Boolean).join(' ')}
            data-who={t.who}
            aria-haspopup="dialog"
            aria-label={turnName(t)}
            onClick={() => onOpenTurn(t.id)}
          >
            <TurnLine turn={t} textClass="thread-row__text" />
          </button>
        ))}
      </div>
      <div className="thread-strip__actions">
        <Button variant="secondary" icon="said" onClick={onAdd} lit={litIndex === shown.length} aria-haspopup="dialog">
          They said
        </Button>
        <Button variant="secondary" icon="thread" onClick={onOpen} lit={litIndex === shown.length + 1} aria-label="All of the conversation" aria-haspopup="dialog">
          All
        </Button>
      </div>
    </section>
  );
}

/**
 * Listen and "Type their line": both open the They said field in place; Listen starts at once, inside
 * the tap (Safari needs the user gesture, voice.md). Done adds a 'them' turn.
 */
export function AddTheirLine({
  adding,
  onAdding,
  onAdd,
  dictation,
  autoFocus = true,
  className,
  scanRow,
  litIndex = -1,
  extra,
}: {
  adding: boolean;
  onAdding: (on: boolean) => void;
  onAdd: (text: string, via: ThemVia) => void;
  dictation: Dictation;
  /** Focus moves into the field and back (off while switch scanning: Space must stay the switch). */
  autoFocus?: boolean;
  className: string;
  /** `data-scan-row` for scanning inside a sheet. */
  scanRow?: string;
  /** Main-screen scanning: the lit button (Listen, Type their line, then `extra`). */
  litIndex?: number;
  /** More buttons after these two, in the same row (the panel's All). */
  extra?: (firstIndex: number) => ReactNode;
}) {
  const field = useRef<PartnerTurnHandle>(null);
  const typeRef = useRef<HTMLButtonElement>(null);
  const was = useRef(adding);
  const supported = useDictationSupported();
  const canListen = dictation !== null && supported;
  useEffect(() => {
    if (was.current && !adding && autoFocus) typeRef.current?.focus();
    was.current = adding;
  }, [adding, autoFocus]);
  if (adding)
    return (
      <PartnerTurn
        ref={field}
        value=""
        onChange={(text, via) => {
          if (text) onAdd(text, via);
        }}
        onDone={() => onAdding(false)}
        dictation={dictation}
        autoFocus={autoFocus}
      />
    );
  const listenAt = canListen ? 0 : -1;
  const typeAt = canListen ? 1 : 0;
  return (
    <div className={className} data-scan-row={scanRow}>
      {canListen ? (
        <Button
          variant="secondary"
          icon="mic"
          lit={litIndex === listenAt}
          onClick={() => {
            flushSync(() => onAdding(true));
            field.current?.listen();
          }}
        >
          Listen
        </Button>
      ) : null}
      <Button ref={typeRef} variant="secondary" icon="said" lit={litIndex === typeAt} onClick={() => onAdding(true)}>
        Type their line
      </Button>
      {extra?.(typeAt + 1)}
    </div>
  );
}

/** How many scan cells AddTheirLine shows (Listen where supported, Type their line). */
export function useAddCells(dictation: Dictation): number {
  const supported = useDictationSupported();
  return dictation !== null && supported ? 2 : 1;
}

/**
 * Laptop layouts (wide, compact): the newest 3 turns, Listen, Type their line and All, in the place of
 * the old They said card. Scan cells, in order: the turns shown, then Listen, Type their line, All
 * (none of those while the field is open).
 */
export function ThreadPanel({
  turns,
  adding,
  onAdding,
  onAdd,
  onOpenTurn,
  onOpen,
  dictation,
  switchOn = false,
  scanning = false,
  litIndex = -1,
}: {
  /** Newest first, at most 3. */
  turns: readonly Turn[];
  adding: boolean;
  onAdding: (on: boolean) => void;
  onAdd: (text: string, via: ThemVia) => void;
  onOpenTurn: (id: number) => void;
  onOpen: () => void;
  dictation: Dictation;
  /** Switch scanning is on: the field does not take focus (Space must stay the switch). */
  switchOn?: boolean;
  /** This is the lit scan row. */
  scanning?: boolean;
  litIndex?: number;
}) {
  const shown = turns.slice(0, 3);
  const cls = ['thread-panel', 'nl-scanrow', 'order-partner', scanning ? 'is-scanning' : ''].filter(Boolean).join(' ');
  return (
    <section className={cls} aria-labelledby="thread-panel-title" data-thread="panel">
      <h2 className="thread-panel__title" id="thread-panel-title">
        Conversation
      </h2>
      {shown.length === 0 ? (
        <p className="thread-panel__empty">Nothing said yet. Add what the other person said, if you like.</p>
      ) : (
        <div className="thread-panel__turns">
          {shown.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className={litIndex === i ? 'thread-row is-lit' : 'thread-row'}
              data-who={t.who}
              aria-haspopup="dialog"
              aria-label={turnName(t)}
              onClick={() => onOpenTurn(t.id)}
            >
              <TurnLine turn={t} textClass="thread-row__text" />
            </button>
          ))}
        </div>
      )}
      <AddTheirLine
        adding={adding}
        onAdding={onAdding}
        onAdd={onAdd}
        dictation={dictation}
        autoFocus={!switchOn}
        className="thread-panel__actions"
        litIndex={litIndex - shown.length}
        extra={(at) => (
          <Button variant="secondary" icon="thread" onClick={onOpen} lit={litIndex - shown.length === at} aria-label="All of the conversation" aria-haspopup="dialog">
            All
          </Button>
        )}
      />
    </section>
  );
}
