import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { DisplayWord } from '@/lib/sentence';
import { Button } from './Button';
import { KeyCode } from './KeyCode';

export { EditedCode, KeyCode, editWords } from './KeyCode';

/**
 * design-system SpeakBar (nl-speakbar): the sentence about to be spoken (utterance, 40px),
 * its keys in mono under it, and Speak, the screen's one primary button.
 * Long sentences wrap; never truncate what someone is about to say. On phones and in the split
 * layout the text area has a fixed height (styles/app.css) so the keypad never moves while typing
 * (keyguards, motor memory; docs/research/mobile-layout.md): a longer sentence scrolls inside it,
 * kept scrolled to the newest word, and is focusable then so it can be scrolled from a keyboard.
 * The phone layout leaves Speak out (it lives in the action bar under the keypad) and puts Clear /
 * Undo in `extra`.
 */
export function SpeakBar({
  tokens,
  words,
  codes,
  canSpeak,
  emptyText,
  speakVariant,
  speakLit,
  speaking,
  onSpeak,
  hideSpeak = false,
  digitsApart = false,
  extra,
  tag,
  retype = false,
  onFix,
  fixLit = false,
}: {
  tokens: string[];
  words: DisplayWord[];
  codes: string[];
  canSpeak: boolean;
  emptyText: string;
  /** 'primary' normally; 'quiet' while the scan highlight is the screen's ember thing. */
  speakVariant: 'primary' | 'quiet';
  speakLit?: boolean;
  speaking?: boolean;
  onSpeak: () => void;
  /** The phone layout puts Speak in the action bar under the keypad. */
  hideSpeak?: boolean;
  /**
   * Phone layout: the key line sits under the sentence box on one line (its end in view), so the
   * sentence alone scrolls, in whole lines.
   */
  digitsApart?: boolean;
  /** Controls at the end of the bar (the phone layout's Clear / Undo). */
  extra?: ReactNode;
  /** The reply type pressed ("Ask"), shown as a word at the start of the key line (web-ui Req 29.6). */
  tag?: string;
  /** A word is being retyped: the key line starts with "Retype ·" (web-ui Req 32.3). */
  retype?: boolean;
  /** Fix a word (web-ui Req 32.1, ADR-009): the sentence itself is the button that opens it. */
  onFix?: () => void;
  /** Switch scanning has the sentence button lit. */
  fixLit?: boolean;
}) {
  const empty = tokens.length === 0;
  const textRef = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);
  const shown = `${tokens.join(' ')}|${codes.join(' ')}`;
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const over = el.scrollHeight > el.clientHeight + 1;
    setOverflows(over);
    if (over) el.scrollTop = el.scrollHeight;
  }, [shown]);
  // Apart from the sentence, the key line keeps its place even when empty, so nothing moves on the first key.
  // The key line is always there on the shells, so the type shows even before the first key; on laptops
  // the group itself stays on screen, so the word joins the keys only once there are keys.
  const tagWord = retype ? 'Retype' : tag;
  const tagEl =
    tagWord && (!empty || digitsApart) ? (
      <span className="nl-speakbar__tag">
        <span className="nl-sr-only">{retype ? 'Retyping a word: ' : 'Reply type: '}</span>
        {tagWord}
        {empty ? null : (
          <span className="nl-speakbar__sep" aria-hidden="true">
            ·
          </span>
        )}
        {empty ? null : <span className="nl-sr-only">. </span>}
      </span>
    ) : null;
  const digits =
    empty && !digitsApart ? null : (
      <span className="nl-speakbar__digits">
        {tagEl}
        {empty ? null : (
          <>
            <span className="nl-sr-only">Keys: </span>
            <span className="nl-speakbar__digits-end">
              {codes.map((c, i) => (
                <KeyCode key={i} code={c} typed={words[i]?.typed} was={words[i]?.was} lead={i > 0 ? ' ' : ''} />
              ))}
            </span>
          </>
        )}
      </span>
    );
  const tokenEls = tokens.map((t, i) => (
    <span key={i}>
      {i > 0 ? ' ' : null}
      <span className={words[i]?.word === null || words[i]?.editing ? 'nl-speakbar__partial' : undefined}>{t}</span>
    </span>
  ));
  const text = (
      <p ref={textRef} className={empty ? 'nl-speakbar__text is-empty' : 'nl-speakbar__text'} id="utterance" tabIndex={overflows && !onFix ? 0 : undefined}>
        {empty ? (
          emptyText
        ) : onFix ? (
          <button type="button" className={fixLit ? 'nl-speakbar__fix is-lit' : 'nl-speakbar__fix'} onClick={onFix} aria-label={`${tokens.join(' ')}. Fix a word`} data-action="fix">
            {tokenEls}
          </button>
        ) : (
          tokenEls
        )}
        {digitsApart ? null : digits}
      </p>
  );
  return (
    <div className="nl-speakbar">
      {digitsApart ? (
        <div className="nl-speakbar__body">
          {text}
          {digits}
        </div>
      ) : (
        text
      )}
      {hideSpeak ? null : <SpeakButton canSpeak={canSpeak} variant={speakVariant} lit={speakLit} speaking={speaking} onSpeak={onSpeak} />}
      {extra}
    </div>
  );
}

/** Speak: the screen's one primary button (in the SpeakBar, or in the phone action bar). */
export function SpeakButton({
  canSpeak,
  variant,
  lit,
  speaking,
  onSpeak,
  className,
}: {
  canSpeak: boolean;
  variant: 'primary' | 'quiet';
  lit?: boolean;
  speaking?: boolean;
  onSpeak: () => void;
  className?: string;
}) {
  return (
    <Button
      // Disabled: an outlined button, so its shape stays visible on the sunken card (a quiet button
      // has the card's own fill and its label looked like it floated off-centre).
      variant={canSpeak ? variant : 'secondary'}
      size="xl"
      icon="speaker"
      disabled={!canSpeak}
      lit={lit}
      onClick={onSpeak}
      aria-describedby="utterance"
      data-action="speak"
      className={className}
    >
      {speaking ? 'Speaking' : 'Speak'}
    </Button>
  );
}

