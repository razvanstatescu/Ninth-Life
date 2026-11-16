'use client';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { NOT_A_MEDICAL_DEVICE, WebsiteLink } from './Footer';
import { Icon, type IconName } from './Icon';
import { menuItemId } from './MenuSheet';
import { Sheet } from './Sheet';

function Row({ item, icon, onClick, children }: { item: string; icon: IconName; onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="quiet" className="menu-row" id={menuItemId(item)} onClick={onClick} data-autofocus={item === 'words' ? '' : undefined}>
      <Icon name={icon} />
      <span className="menu-row__label">{children}</span>
      <Icon name="next" className="menu-row__chevron" />
    </Button>
  );
}

/**
 * More (web-ui Req 37.5): on the laptop header, everything the phone Menu has that the header does not show: My words,
 * Show a card, Conversation, Check the words, Keyboard shortcuts, Status, and the website (new tabs). A popover under its
 * button; a choice opens its surface in place of this one, with Back to Menu. The intended-purpose sentence that was the
 * laptop footer ends it (web-ui Req 40.8).
 */
export function MoreSheet({
  open,
  scanning,
  onClose,
  initialFocusId,
  onMyWords,
  onCards,
  onConversation,
  onProof,
  onStatus,
  onShortcuts,
}: {
  open: boolean;
  scanning?: boolean;
  onClose: () => void;
  initialFocusId?: string;
  onMyWords: () => void;
  onCards: () => void;
  onConversation: () => void;
  onProof: () => void;
  onStatus: () => void;
  onShortcuts?: () => void;
}) {
  return (
    <Sheet open={open} name="more" kind="fit" title="More" onClose={onClose} scanning={scanning} initialFocusId={initialFocusId}>
      <div className="menu-rows scan-cluster" data-scan-row="more">
        <Row item="words" icon="spell" onClick={onMyWords}>
          My words
        </Row>
        <Row item="cards" icon="show" onClick={onCards}>
          Show a card
        </Row>
        <Row item="conversation" icon="thread" onClick={onConversation}>
          Conversation
        </Row>
        <Row item="proof" icon="check" onClick={onProof}>
          Check the words
        </Row>
      </div>
      <div className="menu-rows scan-cluster" data-scan-row="more-2">
        {onShortcuts ? (
          <Row item="shortcuts" icon="keys" onClick={onShortcuts}>
            Keyboard shortcuts
          </Row>
        ) : null}
        <Row item="status" icon="status" onClick={onStatus}>
          Status
        </Row>
      </div>
      <div className="menu-rows scan-cluster" data-scan-row="more-3">
        <WebsiteLink className="nl-btn nl-btn--quiet menu-row" href="/about">
          <Icon name="newtab" />
          <span className="menu-row__label">About Ninth Life</span>
        </WebsiteLink>
        <WebsiteLink className="nl-btn nl-btn--quiet menu-row" href="/">
          <Icon name="newtab" />
          <span className="menu-row__label">How Ninth Life works</span>
        </WebsiteLink>
      </div>
      <p className="field__help more__purpose">{NOT_A_MEDICAL_DEVICE}</p>
    </Sheet>
  );
}
