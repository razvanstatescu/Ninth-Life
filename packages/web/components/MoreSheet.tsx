'use client';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { WebsiteLink } from './Footer';
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
 * Show a card, Conversation, Check the words, Status and About Ninth Life (a new tab). A popover under its button; a
 * choice opens its surface in place of this one, with Back to Menu.
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
        <Row item="status" icon="status" onClick={onStatus}>
          Status
        </Row>
        <WebsiteLink className="nl-btn nl-btn--quiet menu-row" href="/about">
          <Icon name="newtab" />
          <span className="menu-row__label">About Ninth Life</span>
        </WebsiteLink>
      </div>
    </Sheet>
  );
}
