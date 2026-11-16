import type { ReactNode } from 'react';
import { Button } from './Button';
import type { StatusLine } from '@/lib/status';
import type { Turn } from '@/lib/conversation';
import { ThreadBubble } from './ConversationStrip';
import { Icon, type IconName } from './Icon';

export function StatusPill({ icon, tone, children, className }: { icon?: IconName; tone?: 'ok' | 'warn' | 'info'; children: ReactNode; className?: string }) {
  return (
    <span className={['pill', tone ? `pill--${tone}` : '', className ?? ''].filter(Boolean).join(' ')}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </span>
  );
}

export function Brand({ href }: { href?: string }) {
  const inner = (
    <>
      {/* Below 48px the favicon variant is used (brand book, Logo). */}
      <img src="/icons/favicon.svg" alt="" width={44} height={44} />
      <span className="nl-brand__name">Ninth Life</span>
    </>
  );
  // The shared lockup (.nl-brand in components.css): the website's bar, footer and /about use the same one.
  // On the communication screen the brand is not a link, so a stray tap cannot lose a sentence.
  return href ? (
    <a className="nl-brand" href={href}>
      {inner}
    </a>
  ) : (
    <div className="nl-brand">{inner}</div>
  );
}

/**
 * The header. Wide (>= 960px, the artboard): brand, the status (every pill), Phrases, Voice, Settings, More.
 * Compact: one row with brand, the status (one summary pill) and Menu (web-ui Req 15.2). Both are in the HTML and
 * CSS shows one, so phones never see the wide header wrap before the page script runs. The status is a button that
 * opens Status (web-ui Req 37.6); its changes are still announced politely.
 * In switch scanning the actions are the last scan row (Req 16.1): on wide screens the status, then the buttons.
 */
export function AppHeader({
  status,
  summary,
  scanning = false,
  litCell = -1,
  onMenu,
  onPhrases,
  onVoice,
  onSettings,
  onMore,
  onStatus,
  actions = true,
  thread = null,
  scanPill = null,
}: {
  status: StatusLine[];
  summary: StatusLine & { full: string };
  /** The actions are the lit scan row. */
  scanning?: boolean;
  /** Lit cell in that row: Status 0, Phrases 1, Voice 2, Settings 3, More 4 (wide) or Menu 0 (compact). */
  litCell?: number;
  onMenu: () => void;
  onPhrases: () => void;
  onVoice: () => void;
  onSettings: () => void;
  /** Wide: More (web-ui Req 37.5). */
  onMore?: () => void;
  /** The status button (web-ui Req 37.6). */
  onStatus?: () => void;
  /** False in the phone layout: Menu lives in the action bar under the keypad (web-ui Req 24). */
  actions?: boolean;
  /**
   * Phones and tablets 640-1149px tall (web-ui Req 25.3, 27.4): the They said button at the end of the
   * header. No turns: opens the They said field. With turns: the newest one, which opens the Conversation sheet.
   */
  thread?: { last: Turn | null; onOpen: () => void; onAdd: () => void; lit?: boolean } | null;
  /** Phones and tablets: switch scanning state, shown as a pill (the scan bar is not on the screen). */
  scanPill?: string | null;
}) {
  const row = scanning ? 'nl-scanrow is-scanning' : 'nl-scanrow';
  return (
    <header className="app-header">
      <div className="app-header__start">
        <Brand />
        <button
          type="button"
          className={`app-header__pills app-header--wide status-btn nl-scanrow${scanning ? ' is-scanning' : ''}${scanning && litCell === 0 ? ' is-lit' : ''}`}
          onClick={onStatus}
          aria-haspopup="dialog"
          data-action="status"
        >
          <span className="nl-sr-only">Status: </span>
          {status.map((l, i) => (
            <StatusPill key={l.text} icon={l.icon} tone={l.tone} className="status-btn__line">
              {l.text}
              {i < status.length - 1 ? <span className="nl-sr-only">. </span> : null}
            </StatusPill>
          ))}
          {/* Narrower laptop windows: the one summary pill, so the header keeps one row (styles/app.css). */}
          <StatusPill icon={summary.icon} tone={summary.tone} className="status-btn__summary">
            <span aria-hidden="true">{summary.text}</span>
            <span className="nl-sr-only">{summary.full}</span>
          </StatusPill>
        </button>
        <button type="button" className="app-header__pills app-header--compact status-btn" onClick={onStatus} aria-haspopup="dialog" data-action="status">
          <StatusPill icon={summary.icon} tone={summary.tone}>
            <span className="nl-sr-only">Status: </span>
            <span aria-hidden="true">{summary.text}</span>
            <span className="nl-sr-only">{summary.full}</span>
          </StatusPill>
          {scanPill ? <StatusPill icon="switch" tone="info">{scanPill}</StatusPill> : null}
        </button>
        {/* Changes of state are announced, as when the pills were a status region. */}
        <p className="nl-sr-only" aria-live="polite">
          {summary.full}
        </p>
        {thread ? <ThreadBubble last={thread.last} onOpen={thread.onOpen} onAdd={thread.onAdd} lit={thread.lit} /> : null}
      </div>
      {actions ? (
        <>
          <div className={`app-header__actions app-header--wide ${row}`}>
            <Button variant="quiet" compact icon="save" onClick={onPhrases} lit={scanning && litCell === 1} aria-haspopup="dialog">
              Phrases
            </Button>
            <Button variant="quiet" compact icon="voice" onClick={onVoice} lit={scanning && litCell === 2} aria-haspopup="dialog">
              Voice
            </Button>
            <Button variant="quiet" compact icon="gear" onClick={onSettings} lit={scanning && litCell === 3} aria-haspopup="dialog">
              Settings
            </Button>
            <Button variant="quiet" compact icon="more" onClick={onMore} lit={scanning && litCell === 4} aria-haspopup="dialog">
              More
            </Button>
          </div>
          <div className={`app-header__actions app-header--compact ${row}`}>
            <Button variant="quiet" compact icon="menu" onClick={onMenu} lit={scanning && litCell === 0} aria-haspopup="dialog">
              Menu
            </Button>
          </div>
        </>
      ) : null}
    </header>
  );
}
