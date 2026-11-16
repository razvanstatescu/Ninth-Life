'use client';
import { useState } from 'react';
import { PIN_TOO_LONG, SHEET_REPLY_ROWS, fitsQuickReply, replyMeasurer, type ReplyCell } from '@/lib/replies';
import { PHONE_CALLS_HELP, PHONE_LINES } from '@/lib/cards';
import type { Phrase } from '@/lib/storage';
import { Button } from './Button';
import { Confirm } from './Confirm';
import { QuickReplies } from './QuickReplies';
import { Sheet } from './Sheet';

/** Quick phrases shown at first, and how many more each "More quick phrases" adds (web-ui Req 17.3). */
export const QUICK_PAGE = 12;
/** Quick phrases per scan row: a switch user picks a group of 4, then the phrase. */
export const QUICK_PER_ROW = 4;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Saved phrases (stored on this device only, and only after "Save phrase") and quick phrases
 * from the vocab pack. Choosing a phrase speaks it; nothing here is spoken on its own. On laptops (no Menu)
 * the quick replies come first (web-ui Req 28.4).
 */
export function PhrasesSheet({
  open,
  phrases,
  quickPhrases = [],
  error,
  scanning,
  onSpeak,
  onSpeakQuick,
  onDelete,
  onReply,
  replyRows = SHEET_REPLY_ROWS,
  onPin,
  onShow,
  onClose,
}: {
  open: boolean;
  phrases: Phrase[];
  /** Ready-made phrases from the vocab pack (data/packs/core-en.json). */
  quickPhrases?: readonly string[];
  error: string | null;
  /** Switch scanning drives the sheet (web-ui Req 16). */
  scanning?: boolean;
  onSpeak: (p: Phrase) => void;
  onSpeakQuick: (text: string) => void;
  onDelete: (p: Phrase) => void;
  /** Laptops: speak a quick reply (web-ui Req 28.4). */
  onReply?: (text: string) => void;
  /** The quick replies in rows (pinned phrases first, web-ui Req 35.1). */
  replyRows?: readonly (readonly ReplyCell[])[];
  /** Pin or unpin a saved phrase as a quick reply (web-ui Req 35.1). */
  onPin?: (p: Phrase, pinned: boolean) => void;
  /** Show a phrase in big text (web-ui Req 39.2). */
  onShow?: (text: string) => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  // The phrase whose More is open (one at a time); closed again each time the sheet opens.
  const [openId, setOpenId] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setOpenId(null);
    setConfirming(null);
  }
  const [shown, setShown] = useState(QUICK_PAGE);
  const quick = quickPhrases.slice(0, shown);
  const measure = open ? replyMeasurer() : null;
  const fits = (t: string) => fitsQuickReply(t, measure);
  return (
    <Sheet open={open} name="phrases" kind="panel" title="Phrases" onClose={onClose} scanning={scanning}>
      {onReply ? (
        <section className="group" aria-labelledby="phrases-replies">
          <h3 className="group__title" id="phrases-replies">
            Quick replies
          </h3>
          <QuickReplies variant="menu" rows={replyRows} onSay={onReply} />
        </section>
      ) : null}
      <section className="group" aria-labelledby="phrases-saved">
        <h3 className="group__title" id="phrases-saved">
          Your phrases
        </h3>
        <p className="field__help">Phrases stay on this device. Nothing is saved unless you press Save phrase.</p>
        {error ? <p className="notice notice--warn">{error}</p> : null}
        {phrases.length === 0 ? (
          <p className="field__help">No saved phrases yet. Type a sentence, then press Save phrase.</p>
        ) : (
          <ul className="phrases">
            {phrases.map((p) => {
              const tooLong = !p.pinned && !fits(p.text);
              const isOpen = openId === p.id;
              return (
                <li key={p.id} className="phrase-row">
                  {/* One row: the phrase speaks on a press; More opens its other actions (web-ui Req 39.2). */}
                  <div className="phrase-row__main scan-cluster" data-scan-row={`saved-${p.id}`}>
                    <Button variant="quiet" icon="speaker" className="phrase-row__say" onClick={() => onSpeak(p)} aria-label={`Speak "${p.text}"`} lang="en">
                      <span className="phrase-row__text">{p.text}</span>
                      {p.pinned ? <span className="phrase-row__pin">Pinned</span> : null}
                    </Button>
                    <Button
                      variant="secondary"
                      icon="more"
                      className="phrase-row__more"
                      aria-label={`More for ${p.text}`}
                      aria-expanded={isOpen}
                      aria-controls={`phrase-${p.id}-actions`}
                      onClick={() => {
                        setOpenId(isOpen ? null : p.id);
                        setConfirming(null);
                      }}
                    >
                      {null}
                    </Button>
                  </div>
                  {isOpen ? (
                    <div className="phrase-row__actions" id={`phrase-${p.id}-actions`}>
                      {confirming === p.id ? (
                        <Confirm
                          name="delete-phrase"
                          question={`Delete "${p.text}"?`}
                          detail="It goes from your phrases on this device."
                          action="Delete phrase"
                          actionIcon="x"
                          irreversible
                          scanning={scanning}
                          scanRow={`saved-${p.id}-confirm`}
                          onSafe={() => setConfirming(null)}
                          onAction={() => {
                            setConfirming(null);
                            setOpenId(null);
                            onDelete(p);
                          }}
                        />
                      ) : (
                        <>
                          <div className="field__row scan-cluster" data-scan-row={`saved-${p.id}-actions`}>
                            {onPin ? (
                              <Button
                                variant="secondary"
                                icon={p.pinned ? 'check' : 'plus'}
                                aria-pressed={p.pinned}
                                aria-label={`Pin "${p.text}" to quick replies`}
                                aria-describedby={tooLong ? `pin-long-${p.id}` : undefined}
                                disabled={tooLong}
                                onClick={() => onPin(p, !p.pinned)}
                              >
                                {p.pinned ? 'Unpin from quick replies' : 'Pin to quick replies'}
                              </Button>
                            ) : null}
                            {onShow ? (
                              <Button variant="secondary" icon="show" onClick={() => onShow(p.text)}>
                                Show
                              </Button>
                            ) : null}
                            <Button variant="danger" icon="x" onClick={() => setConfirming(p.id)} aria-label={`Delete "${p.text}"`}>
                              Delete
                            </Button>
                          </div>
                          {onPin && tooLong ? (
                            <span className="field__help phrase__note" id={`pin-long-${p.id}`}>
                              {PIN_TOO_LONG}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="group" aria-labelledby="phrases-calls">
        <h3 className="group__title" id="phrases-calls">
          Phone calls
        </h3>
        <p className="field__help">{PHONE_CALLS_HELP}</p>
        <ul className="quick" aria-labelledby="phrases-calls">
          {PHONE_LINES.map((text, i) => (
            <li key={text} className="quick__row scan-cluster" data-scan-row={`call-${i}`}>
              <Button variant="quiet" icon="speaker" className="quick__phrase" onClick={() => onSpeakQuick(text)} aria-label={`Speak "${text}"`} lang="en">
                {text}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {quickPhrases.length > 0 ? (
        <section className="group" aria-labelledby="phrases-quick">
          <h3 className="group__title" id="phrases-quick">
            Quick phrases
          </h3>
          <p className="field__help">Press a phrase to speak it.</p>
          <ul className="quick" aria-labelledby="phrases-quick">
            {chunk(quick, QUICK_PER_ROW).map((group, g) => (
              <li key={g} className="quick__row scan-cluster" data-scan-row={`quick-${g}`}>
                {group.map((text) => (
                  <Button key={text} variant="quiet" icon="speaker" className="quick__phrase" onClick={() => onSpeakQuick(text)} aria-label={`Speak "${text}"`} lang="en">
                    {text}
                  </Button>
                ))}
              </li>
            ))}
          </ul>
          {shown < quickPhrases.length ? (
            <div className="scan-cluster" data-scan-row="quick-more">
              <Button variant="secondary" icon="plus" onClick={() => setShown((n) => n + QUICK_PAGE)}>
                More quick phrases
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </Sheet>
  );
}
