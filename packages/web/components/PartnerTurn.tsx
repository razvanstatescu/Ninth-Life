'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from './Button';
import { DICTATION_MESSAGES, dictationLang, joinHeard, startDictation, type DictationProblem, type DictationSession, useDictationSupported } from '@/lib/dictation';

export const PARTNER_MAX = 280;

/** Where the audio goes, for the one-time notice and Settings (ADR-004). */
export const DICTATION_NOTICE =
  'Voice to text uses your browser’s speech service. Their voice may be sent to the browser maker (Google in Chrome, Apple in Safari) to turn it into text. Ninth Life never receives or keeps the audio, and the text is not stored.';

/**
 * "They said": an optional line typed by the other person, or heard with Listen (voice to text,
 * web-ui Req 26). It is only used as context for model ranking when that is on, and is never stored.
 */
export function PartnerTurn({
  value,
  onChange,
  startEditing = false,
  onDone,
  dictation = null,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Open straight in the text field (the They said sheet on phones and tablets: one tap, then type). */
  startEditing?: boolean;
  /** Called after Done or Cancel (the sheet closes itself then). */
  onDone?: () => void;
  /** Voice to text: whether the person has allowed it (Settings), and how to allow it. Null hides Listen. */
  dictation?: { allowed: boolean; onAllow: () => void } | null;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(value);
  const [listening, setListening] = useState(false);
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState<DictationProblem | null>(null);
  const session = useRef<DictationSession | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const listenRef = useRef<HTMLButtonElement>(null);
  const allowRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);
  const wasEditing = useRef(false);
  const id = useId();
  const noticeId = useId();
  const supported = useDictationSupported();
  const canListen = dictation !== null && supported;

  // Focus moves into the field when editing starts and back to Change or Add when it ends.
  useEffect(() => {
    if (editing) inputRef.current?.focus();
    else if (wasEditing.current) changeRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

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
    const before = draft;
    const s = startDictation({
      lang: dictationLang(),
      onText: (heard) => setDraft(joinHeard(before, heard, PARTNER_MAX)),
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

  const close = (save: boolean) => {
    stopListening(false);
    setAsking(false);
    setProblem(null);
    if (save) onChange(draft.trim().slice(0, PARTNER_MAX));
    else setDraft(value);
    setEditing(false);
    onDone?.();
  };

  if (editing) {
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
            They said
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
                stopListening(false);
                setDraft(value);
                setEditing(false);
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
  }

  return (
    <div className="partner order-partner">
      <div className="partner__body">
        <span className="partner__label">They said</span>
        <span className={value ? 'partner__text' : 'partner__text is-empty'}>{value || 'Nothing yet. Add what the other person said, if you like.'}</span>
      </div>
      <div className="partner__actions">
        <Button
          ref={changeRef}
          variant="secondary"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          {value ? 'Change' : 'Add'}
        </Button>
        {value ? (
          <Button variant="secondary" onClick={() => onChange('')}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
