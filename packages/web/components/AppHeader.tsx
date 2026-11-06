import type { ReactNode } from 'react';
import { Button } from './Button';
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

export function AppHeader({
  pills,
  onPhrases,
  onVoice,
  onSettings,
}: {
  pills: ReactNode;
  onPhrases: () => void;
  onVoice: () => void;
  onSettings: () => void;
}) {
  return (
    <header className="app-header">
      <div className="app-header__start">
        <Brand />
        <div className="app-header__start" role="status" aria-live="polite">
          {pills}
        </div>
      </div>
      <div className="app-header__actions">
        <Button variant="quiet" compact icon="save" onClick={onPhrases}>
          Phrases
        </Button>
        <Button variant="quiet" compact icon="voice" onClick={onVoice}>
          Voice
        </Button>
        <Button variant="quiet" compact icon="gear" onClick={onSettings}>
          Settings
        </Button>
      </div>
    </header>
  );
}
