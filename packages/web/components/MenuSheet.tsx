'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { SHEET_REPLY_ROWS, type ReplyCell } from '@/lib/replies';
import { Button } from './Button';
import { WebsiteLink } from './Footer';
import { Icon, type IconName } from './Icon';
import { QuickReplies } from './QuickReplies';
import { Sheet } from './Sheet';

/** The id of a Menu item, so the Menu can open with focus on the item a surface was opened from (Back to Menu). */
export const menuItemId = (item: string) => `menu-item-${item}`;

/** A large tile: icon above the word, at least 72px tall (web-ui Req 37.1). */
function Tile({ item, icon, onClick, children }: { item: string; icon: IconName; onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="secondary" className="menu-tile" id={menuItemId(item)} onClick={onClick} data-autofocus={item === 'phrases' ? '' : undefined}>
      <Icon name={icon} />
      <span>{children}</span>
    </Button>
  );
}

/** A 64px list row: icon, word, and a chevron because it opens another surface. */
function Row({ item, icon, onClick, children, value }: { item: string; icon: IconName; onClick: () => void; children: ReactNode; value?: string }) {
  return (
    <Button variant="quiet" className="menu-row" id={menuItemId(item)} onClick={onClick}>
      <Icon name={icon} />
      <span className="menu-row__label">{children}</span>
      {value ? <span className="menu-row__value">{value}</span> : null}
      <Icon name="next" className="menu-row__chevron" />
    </Button>
  );
}

/**
 * Menu (web-ui Req 37.1): a short sheet on phones, a popover from its button on tablets and narrow laptop windows. Top to
 * bottom, each block only when it applies:
 *   1. Quick replies, first in every Menu, also while typing (web-ui Req 28.4);
 *   2. tiles: Phrases, Show a card, Conversation, They said;
 *   3. This sentence (phones, with a sentence): Fix a word, Spell this word, Save phrase, Check the words (and
 *      Sentences, Finish the word on a short phone, web-ui Req 24.9, 31.5);
 *   4. rows: My words, Voice, Settings;
 *   5. Status and About Ninth Life (a new tab).
 * Each choice opens its surface in place of this one, with Back to Menu (web-ui Req 36.6).
 * Scan rows: Close, the replies, the tiles, This sentence in rows of 2, the rows, Status and About.
 */
export function MenuSheet({
  open,
  scanning,
  onClose,
  initialFocusId,
  replies,
  onPhrases,
  onCards,
  onConversation,
  onPartner,
  sentence,
  onMyWords,
  onVoice,
  onSettings,
  onStatus,
  statusText,
}: {
  open: boolean;
  scanning?: boolean;
  onClose: () => void;
  /** Focus this item on opening (the one a surface was opened from, after Back to Menu). */
  initialFocusId?: string;
  /** Quick replies (web-ui Req 28.4); the caller closes the Menu after one is spoken. */
  replies?: { rows?: readonly (readonly ReplyCell[])[]; onReply: (text: string) => void } | null;
  onPhrases: () => void;
  onCards: () => void;
  onConversation: () => void;
  onPartner: () => void;
  /** Phones and tablets with a sentence: its actions that are not on the screen. */
  sentence?: {
    canFix: boolean;
    onFix: () => void;
    canSpell: boolean;
    onSpell: () => void;
    canSave: boolean;
    onSave: () => void;
    /** This sentence was just saved (web-ui Req 39.4): the Undo, or null when it was already in Phrases. */
    saved?: { undo: (() => void) | null } | null;
    onProof: () => void;
    /** Short phones with no suggestion row (web-ui Req 24.9): every sentence for the keys. */
    onSentences?: () => void;
    /** Short phones: the Finish the word group (web-ui Req 31.5), or null. */
    words?: ReactNode;
  } | null;
  onMyWords: () => void;
  onVoice: () => void;
  onSettings: () => void;
  onStatus: () => void;
  /** The short status ("On device"), shown on the Status row. */
  statusText: string;
}) {
  // Focus follows the press (web-ui Req 39.4): onto Undo after a save, back onto Save phrase after Undo. Not while scanning.
  const wasSaved = useRef<boolean | null>(null);
  const isSaved = !!sentence?.saved;
  useEffect(() => {
    const before = wasSaved.current;
    wasSaved.current = isSaved;
    if (!open || scanning || before === null || before === isSaved) return;
    document.getElementById(menuItemId(isSaved ? (sentence?.saved?.undo ? 'save-undo' : 'proof') : 'save'))?.focus();
  }, [open, scanning, isSaved, sentence?.saved?.undo]);
  useEffect(() => {
    if (!open) wasSaved.current = null;
    else if (wasSaved.current === null) wasSaved.current = isSaved;
  }, [open, isSaved]);
  return (
    <Sheet open={open} name="menu" kind="fit" title="Menu" onClose={onClose} scanning={scanning} initialFocusId={initialFocusId}>
      {replies ? (
        <section className="group group--tight" aria-labelledby="menu-replies">
          <h3 className="group__title group__title--small" id="menu-replies">
            Quick replies
          </h3>
          <QuickReplies variant="menu" rows={replies.rows ?? SHEET_REPLY_ROWS} onSay={replies.onReply} />
        </section>
      ) : null}
      <div className="menu-tiles scan-cluster" data-scan-row="tiles">
        <Tile item="phrases" icon="save" onClick={onPhrases}>
          Phrases
        </Tile>
        <Tile item="cards" icon="show" onClick={onCards}>
          Show a card
        </Tile>
        <Tile item="conversation" icon="thread" onClick={onConversation}>
          Conversation
        </Tile>
        <Tile item="partner" icon="said" onClick={onPartner}>
          They said
        </Tile>
      </div>
      {sentence?.words ?? null}
      {sentence ? (
        <section className="group group--tight" aria-labelledby="menu-sentence">
          <h3 className="group__title group__title--small" id="menu-sentence">
            This sentence
          </h3>
          {sentence.onSentences ? (
            <div className="menu-grid scan-cluster" data-scan-row="sentence-list">
              <Button variant="secondary" icon="menu" id={menuItemId('sentences')} onClick={sentence.onSentences}>
                Sentences
              </Button>
            </div>
          ) : null}
          <div className="menu-grid scan-cluster" data-scan-row="sentence">
            <Button variant="secondary" icon="edit" id={menuItemId('fix')} onClick={sentence.onFix} disabled={!sentence.canFix}>
              Fix a word
            </Button>
            <Button variant="secondary" icon="spell" id={menuItemId('spell')} onClick={sentence.onSpell} disabled={!sentence.canSpell}>
              Spell this word
            </Button>
          </div>
          {sentence.saved ? (
            // Save phrase becomes its result, in place (web-ui Req 39.4): what happened, and Undo as its own scan row.
            <div className="menu-saved scan-cluster" data-scan-row="saved">
              <p className="menu-saved__text">
                <Icon name="check" />
                {sentence.saved.undo ? 'Saved to Phrases' : 'Already in Phrases'}
              </p>
              {sentence.saved.undo ? (
                <Button variant="secondary" icon="back" id={menuItemId('save-undo')} onClick={sentence.saved.undo} aria-label="Saved to Phrases. Undo">
                  Undo
                </Button>
              ) : null}
            </div>
          ) : null}
          <div className="menu-grid scan-cluster" data-scan-row="sentence-2">
            {sentence.saved ? null : (
              <Button variant="secondary" icon="save" id={menuItemId('save')} onClick={sentence.onSave} disabled={!sentence.canSave}>
                Save phrase
              </Button>
            )}
            <Button variant="secondary" icon="check" id={menuItemId('proof')} onClick={sentence.onProof}>
              Check the words
            </Button>
          </div>
        </section>
      ) : null}
      <div className="menu-rows scan-cluster" data-scan-row="rows">
        <Row item="words" icon="spell" onClick={onMyWords}>
          My words
        </Row>
        <Row item="voice" icon="voice" onClick={onVoice}>
          Voice
        </Row>
        <Row item="settings" icon="gear" onClick={onSettings}>
          Settings
        </Row>
      </div>
      <div className="menu-foot scan-cluster" data-scan-row="status">
        <Button variant="quiet" className="menu-row" id={menuItemId('status')} onClick={onStatus}>
          <Icon name="status" />
          <span className="menu-row__label">Status</span>
          <span className="nl-sr-only">: </span>
          <span className="menu-row__value">{statusText}</span>
        </Button>
        <WebsiteLink className="nl-btn nl-btn--quiet menu-row" href="/about">
          <Icon name="newtab" />
          <span className="menu-row__label">About Ninth Life</span>
        </WebsiteLink>
      </div>
    </Sheet>
  );
}
