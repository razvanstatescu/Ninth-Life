import type { ReactNode } from 'react';
import { Button } from './Button';
import type { StatusLine } from '@/lib/status';
import { Icon, type IconName } from './Icon';

export function StatusPill({ icon, tone, children }: { icon?: IconName; tone?: 'ok' | 'warn' | 'info'; children: ReactNode }) {
  return (
    <span className={tone ? `pill pill--${tone}` : 'pill'}>
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
      <span className="brand__name">Ninth Life</span>
    </>
  );
  // On the communication screen the brand is not a link, so a stray tap cannot lose a sentence.
  return href ? (
    <a className="brand" href={href}>
      {inner}
    </a>
  ) : (
    <div className="brand">{inner}</div>
  );
}

/**
 * The header. Wide (>= 960px, the artboard): brand, every status pill, Phrases, Voice, Settings.
 * Compact: one row with brand, one summary pill and Menu (web-ui Req 15.2). Both are in the HTML and
 * CSS shows one, so phones never see the wide header wrap before the page script runs.
 * In switch scanning the actions are the last scan row (Req 16.1).
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
}: {
  status: StatusLine[];
  summary: StatusLine & { full: string };
  /** The actions are the lit scan row. */
  scanning?: boolean;
  /** Lit cell in that row: Phrases 0, Voice 1, Settings 2 (wide) or Menu 0 (compact). */
  litCell?: number;
  onMenu: () => void;
  onPhrases: () => void;
  onVoice: () => void;
  onSettings: () => void;
}) {
  const row = scanning ? 'nl-scanrow is-scanning' : 'nl-scanrow';
  return (
    <header className="app-header">
      <div className="app-header__start">
        <Brand />
        <div className="app-header__pills app-header--wide" role="status" aria-live="polite">
          {status.map((l) => (
            <StatusPill key={l.text} icon={l.icon} tone={l.tone}>
              {l.text}
            </StatusPill>
          ))}
        </div>
        <div className="app-header__pills app-header--compact" role="status" aria-live="polite">
          <StatusPill icon={summary.icon} tone={summary.tone}>
            <span aria-hidden="true">{summary.text}</span>
            <span className="nl-sr-only">{summary.full}</span>
          </StatusPill>
        </div>
      </div>
      <div className={`app-header__actions app-header--wide ${row}`}>
        <Button variant="quiet" compact icon="save" onClick={onPhrases} lit={scanning && litCell === 0}>
          Phrases
        </Button>
        <Button variant="quiet" compact icon="voice" onClick={onVoice} lit={scanning && litCell === 1}>
          Voice
        </Button>
        <Button variant="quiet" compact icon="gear" onClick={onSettings} lit={scanning && litCell === 2}>
          Settings
        </Button>
      </div>
      <div className={`app-header__actions app-header--compact ${row}`}>
        <Button variant="quiet" compact icon="menu" onClick={onMenu} lit={scanning && litCell === 0} aria-haspopup="dialog">
          Menu
        </Button>
      </div>
    </header>
  );
}
