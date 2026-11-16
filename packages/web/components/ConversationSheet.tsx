'use client';
/**
 * The Conversation sheet (web-ui Req 27.7-27.10, ADR-007): every turn, newest first, each with its own
 * actions, and the whole thread's Share (or Copy all) and Clear conversation.
 *
 * Scan rows, top to bottom (each turn is its own row, so the likeliest line is closest to Close):
 *   Close; the reply types (Agree, Disagree, Ask; web-ui Req 29) while their line is the newest; Listen and
 *   Type their line; one row per turn; Share or Copy all, and Clear conversation.
 * A 'you said' turn: Say again, Show, Copy. A 'they said' turn: Show, Copy, and on the newest one
 * Change and Remove. Copy, Copy all and Share appear only where the browser can do them.
 * Say again speaks inside the press (iOS needs the gesture); nothing here speaks on its own.
 */
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { lastThem, threadText, useConversation, type ThemVia, type Turn } from '@/lib/conversation';
import { AddTheirLine, whoLong, type Dictation } from './ConversationStrip';
import { Button } from './Button';
import { Confirm } from './Confirm';
import { PartnerTurn } from './PartnerTurn';
import { Sheet } from './Sheet';

export const CONVERSATION_LEAD = 'Newest first. Kept on this page only, never saved; it clears when you reload, leave or close the page.';

const noSubscribe = () => () => undefined;
/** The browser can copy text for us: the async clipboard, on a secure page. False on the server. */
export function canCopy(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true && typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
}
/** The browser can hand text to another app (the share sheet), on a secure page. False on the server. */
export function canShare(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true && typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
const useCanCopy = () => useSyncExternalStore(noSubscribe, canCopy, () => false);
const useCanShare = () => useSyncExternalStore(noSubscribe, canShare, () => false);

/** The id of a turn's first button, so the sheet can open on it. */
export const turnFirstId = (id: number) => `turn-${id}-first`;

export function ConversationSheet({
  open,
  scanning,
  focusTurnId = null,
  dictation,
  onSayAgain,
  onShow,
  onAdded,
  onAnnounce,
  onClose,
  replyTypes = null,
}: {
  open: boolean;
  /** Switch scanning drives the sheet (web-ui Req 16). */
  scanning?: boolean;
  /** Open with focus on this turn's first button (a turn tapped on the main screen). */
  focusTurnId?: number | null;
  dictation: Dictation;
  /** Say again: speak this and add it as a 'you said' turn (sayAndRecord in CommunicationScreen). */
  onSayAgain: (text: string) => void;
  /** Show this turn in big text, labelled "You said" or "They said". */
  onShow: (turn: Turn) => void;
  /** A 'they said' line was added (the screen announces it). */
  onAdded?: () => void;
  /** Polite announcements ("Copied.", "Conversation cleared."). */
  onAnnounce: (msg: string) => void;
  onClose: () => void;
  /** The reply-type group (web-ui Req 29) while their line is the newest: at the top, under the lead. */
  replyTypes?: ReactNode;
}) {
  const conv = useConversation();
  const copyOk = useCanCopy();
  const shareOk = useCanShare();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const clearRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // A fresh sheet every time it opens.
  useEffect(() => {
    if (!open) {
      setAdding(false);
      setEditing(null);
      setConfirming(false);
    }
  }, [open]);

  // The question takes the row's place: focus goes to Keep (the Confirm), then back to Clear conversation.
  useEffect(() => {
    if (!scanning && !confirming && wasConfirming.current) clearRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming, scanning]);

  const newestThem = lastThem(conv.state);
  const newestFirst = [...conv.turns].reverse();

  const copy = (text: string, done: string) => {
    void navigator.clipboard
      .writeText(text)
      .then(() => onAnnounce(done))
      .catch(() => onAnnounce('Could not copy.'));
  };
  const share = () => {
    // Called inside the press: the share sheet needs the user gesture. Cancelling it is not an error.
    navigator.share({ title: 'Conversation', text: threadText(conv.turns) }).catch(() => undefined);
  };
  const add = (text: string, via: ThemVia) => {
    conv.addThem(text, via);
    onAdded?.();
  };
  /** After a turn goes away, keep focus in the sheet: the next turn, or the Close button. */
  const refocusAfter = (id: number) => {
    if (scanning) return;
    const i = newestFirst.findIndex((t) => t.id === id);
    const next = newestFirst[i + 1] ?? newestFirst[i - 1];
    requestAnimationFrame(() => {
      const el = (next && next.id !== id ? document.getElementById(turnFirstId(next.id)) : null) ?? document.querySelector<HTMLElement>('dialog[data-overlay="conversation"] [data-autofocus]');
      el?.focus();
    });
  };

  return (
    <Sheet
      open={open}
      name="conversation"
      kind="panel"
      title="Conversation"
      onClose={onClose}
      scanning={scanning}
      initialFocusId={focusTurnId !== null && conv.turns.some((t) => t.id === focusTurnId) ? turnFirstId(focusTurnId) : undefined}
    >
      <p className="sheet__lead">{CONVERSATION_LEAD}</p>
      {replyTypes}
      <AddTheirLine
        adding={adding}
        onAdding={setAdding}
        onAdd={add}
        dictation={dictation}
        autoFocus={!scanning}
        className="thread-add scan-cluster"
        scanRow="add"
      />
      {conv.turns.length === 0 ? (
        <p className="field__help">Nothing said yet. What they say and what you say shows here, newest first.</p>
      ) : (
        <ol className="thread-list" aria-label="Conversation, newest first">
          {newestFirst.map((t) => {
            const textId = `turn-${t.id}-text`;
            const isNewestThem = t.id === newestThem?.id;
            return (
              <li key={t.id} className="thread-item scan-cluster" data-scan-row={`turn-${t.id}`} data-who={t.who}>
                <p className="thread-item__who">{whoLong(t)}</p>
                {editing === t.id ? (
                  <PartnerTurn
                    value={t.text}
                    label="Change what they said"
                    onChange={(text, via) => {
                      conv.edit(t.id, text, via === 'heard' ? 'heard' : undefined);
                      if (!text) {
                        onAnnounce('Removed from the conversation.');
                        refocusAfter(t.id);
                      }
                    }}
                    onDone={() => {
                      setEditing(null);
                      if (!scanning) requestAnimationFrame(() => document.getElementById(turnFirstId(t.id))?.focus());
                    }}
                    dictation={dictation}
                    autoFocus={!scanning}
                  />
                ) : (
                  <>
                    <p className="thread-item__text" id={textId} lang="en">
                      {t.text}
                    </p>
                    <div className="thread-item__actions">
                      {/* Two even rows on a phone: what to do with the line, then Change and Remove (the newest
                          "they said" only); one row where the sheet is wide. One scan row either way. */}
                      <div className="thread-item__row">
                      {t.who === 'me' ? (
                        <Button id={turnFirstId(t.id)} variant="secondary" icon="speaker" onClick={() => onSayAgain(t.text)} aria-describedby={textId}>
                          Say again
                        </Button>
                      ) : null}
                      <Button id={t.who === 'me' ? undefined : turnFirstId(t.id)} variant="secondary" icon="show" onClick={() => onShow(t)} aria-describedby={textId}>
                        Show
                      </Button>
                      {copyOk ? (
                        <Button variant="secondary" icon="copy" onClick={() => copy(t.text, 'Copied.')} aria-describedby={textId}>
                          Copy
                        </Button>
                      ) : null}
                      </div>
                      {isNewestThem ? (
                        <div className="thread-item__row">
                          <Button variant="secondary" icon="edit" onClick={() => setEditing(t.id)} aria-describedby={textId}>
                            Change
                          </Button>
                          <Button
                            variant="secondary"
                            icon="x"
                            onClick={() => {
                              refocusAfter(t.id);
                              conv.remove(t.id);
                              onAnnounce('Removed from the conversation.');
                            }}
                            aria-describedby={textId}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {conv.turns.length > 0 ? (
        confirming ? (
          // Keep first, so a stray press keeps the conversation (web-ui Req 39.3).
          <Confirm
            name="clear-conversation"
            className="thread-confirm"
            question="Clear the whole conversation?"
            detail="This cannot be undone."
            action="Clear conversation"
            actionIcon="x"
            irreversible
            scanning={scanning}
            scanRow="confirm-clear"
            onSafe={() => setConfirming(false)}
            onAction={() => {
              conv.clear();
              setConfirming(false);
              onAnnounce('Conversation cleared.');
              if (!scanning) requestAnimationFrame(() => document.querySelector<HTMLElement>('dialog[data-overlay="conversation"] [data-autofocus]')?.focus());
            }}
          />
        ) : (
          <div className="thread-all scan-cluster" data-scan-row="all">
            {shareOk ? (
              <Button variant="secondary" icon="share" onClick={share}>
                Share
              </Button>
            ) : copyOk ? (
              <Button variant="secondary" icon="copy" onClick={() => copy(threadText(conv.turns), 'Conversation copied.')}>
                Copy all
              </Button>
            ) : null}
            <Button ref={clearRef} variant="danger" icon="x" onClick={() => setConfirming(true)}>
              Clear conversation
            </Button>
          </div>
        )
      ) : null}
    </Sheet>
  );
}
