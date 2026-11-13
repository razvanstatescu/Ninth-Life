'use client';
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { Button } from './Button';
import { DICTATION_MESSAGES, dictationLang, joinHeard, startDictation, type DictationProblem, type DictationSession, useDictationSupported } from '@/lib/dictation';

export const PARTNER_MAX = 280;

/** Where the audio goes, for the one-time notice and Settings (ADR-004). */
export const DICTATION_NOTICE =
  'Voice to text uses your browser’s speech service. Their voice may be sent to the browser maker (Google in Chrome, Apple in Safari) to turn it into text. Ninth Life never receives or keeps the audio, and the text is not stored.';

/** What PartnerTurn hands back on Done: the line, and whether Listen filled any of it. */
export type PartnerVia = 'typed' | 'heard';

export interface PartnerTurnHandle {
  /** Start Listen now, inside the caller's tap (Safari needs the user gesture): the sheet's Listen button. */
  listen(): void;
}

/**
 * "They said": the field for the other person's line, typed or heard with Listen (voice to text,
 * web-ui Req 26). Done hands the line to the conversation (web-ui Req 27.3): a new 'them' turn, or the
 * newest one changed. It is used as context for model ranking only when that is on, and is never stored.
 * The line on show (the old read-only view) is the thread now: ConversationStrip and ConversationSheet.
 */
export const PartnerTurn = forwardRef<PartnerTurnHandle, {
  /** The line to start from: '' to add a line, the newest line to change it. */
  value: string;
  /** Done: the trimmed line (may be '' to remove a changed line) and how it got in. */
  onChange: (v: string, via: PartnerVia) => void;
  /** Called after Done or Cancel (the caller closes the field or the sheet then). */
  onDone?: () => void;
  /** Voice to text: whether the person has allowed it (Settings), and how to allow it. Null hides Listen. */
  dictation?: { allowed: boolean; onAllow: () => void } | null;
  /** The field's visible label. */
  label?: string;
  /** The field's id, so a sheet can open with focus in it (Sheet initialFocusId). */
  inputId?: string;
  /** Focus the field when it appears. Off while switch scanning, where Space must stay the switch. */
  autoFocus?: boolean;
}>(function PartnerTurn({ value, onChange, onDone, dictation = null, label = 'They said', inputId, autoFocus = true }, ref) {
  const [draft, setDraft] = useState(value);
  const [listening, setListening] = useState(false);
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState<DictationProblem | null>(null);
  const session = useRef<DictationSession | null>(null);
  const heard = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listenRef = useRef<HTMLButtonElement>(null);
  const allowRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const autoId = useId();
  const id = inputId ?? autoId;
  const noticeId = useId();
  const supported = useDictationSupported();
  const canListen = dictation !== null && supported;

  // Focus starts in the field (one tap, then type).
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, []); // only when the field appears

  // The notice takes the buttons' place: focus goes to Allow and listen, then back to Listen.
  useEffect(() => {
    if (asking) allowRef.current?.focus();
    else if (wasAsking.current) listenRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  // Never leave the microphone on: stop when the form goes away.
  useEffect(() => () => session.current?.abort(), []);

  const stopListening = (keep: boolean) => {
    const s = session.current;
    session.current = null;
    if (s) (keep ? s.stop : s.abort)();
    setListening(false);
  };

  const listen = () => {
    setProblem(null);
    const before = draftRef.current;
    const s = startDictation({
      lang: dictationLang(),
      onText: (text) => {
        if (text.trim()) heard.current = true;
        setDraft(joinHeard(before, text, PARTNER_MAX));
      },
      onEnd: (p) => {
        if (session.current === s) session.current = null;
        setListening(false);
        setProblem(p);
      },
    });
    if (!s) {
      setProblem('unavailable');
      return;
    }
    session.current = s;
    setListening(true);
  };

  const onListen = () => {
    if (listening) return stopListening(true);
    if (!dictation?.allowed) return setAsking(true);
    listen();
  };

  useImperativeHandle(ref, () => ({ listen: () => (canListen && !listening ? onListen() : undefined) }));

  const close = (save: boolean) => {
    stopListening(false);
    setAsking(false);
    setProblem(null);
    if (save) onChange(draft.trim().slice(0, PARTNER_MAX), heard.current ? 'heard' : 'typed');
    onDone?.();
  };

  const status = listening ? 'Listening. Ask them to speak now.' : problem ? DICTATION_MESSAGES[problem] : '';
  return (
    <form
      className="partner order-partner"
      onSubmit={(e) => {
        e.preventDefault();
        close(true);
      }}
    >
      <div className="partner__body">
        <label className="partner__label" htmlFor={id}>
          {label}
        </label>
      </div>
      <div className="partner__form">
        <input
          ref={inputRef}
          id={id}
          className="input"
          type="text"
          value={draft}
          maxLength={PARTNER_MAX}
          placeholder={canListen ? 'Type, or press Listen' : 'Type what the other person said'}
          autoComplete="off"
          onChange={(e) => {
            // Typing wins: stop listening and drop anything still on its way.
            if (listening) stopListening(false);
            setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              close(false);
            }
          }}
        />
        {asking ? (
          // The notice takes the buttons' place until the person answers, so its buttons are on screen.
          <div className="partner__notice" role="group" aria-labelledby={noticeId}>
            <p id={noticeId}>{DICTATION_NOTICE} You can turn it off in Settings.</p>
            <div className="partner__buttons scan-cluster" data-scan-row="dictation-notice">
              <Button
                ref={allowRef}
                variant="secondary"
                icon="mic"
                onClick={() => {
                  setAsking(false);
                  dictation?.onAllow();
                  listen();
                }}
              >
                Allow and listen
              </Button>
              <Button variant="secondary" onClick={() => setAsking(false)}>
                Not now
              </Button>
            </div>
          </div>
        ) : (
          <div className="partner__buttons scan-cluster" data-scan-row="partner">
            {canListen ? (
              <Button
                ref={listenRef}
                variant="secondary"
                icon={listening ? 'stop' : 'mic'}
                onClick={onListen}
                className={listening ? 'partner__listen is-listening' : 'partner__listen'}
              >
                {listening ? 'Stop' : 'Listen'}
              </Button>
            ) : null}
            <Button variant="secondary" type="submit">
              Done
            </Button>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
      {canListen ? (
        <p className="partner__status" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </form>
  );
});
