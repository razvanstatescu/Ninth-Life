'use client';
import type { StatusLine } from '@/lib/status';
import { StatusPill } from './AppHeader';
import { Button } from './Button';
import { Sheet } from './Sheet';

/**
 * The compact header's Menu (web-ui Req 15.3): the full status, then Phrases, My words, Voice and Settings.
 * Each choice opens its own sheet in place of this one.
 */
export function MenuSheet({
  open,
  status,
  scanning,
  onPhrases,
  onMyWords,
  onVoice,
  onSettings,
  onClose,
}: {
  open: boolean;
  status: StatusLine[];
  scanning?: boolean;
  onPhrases: () => void;
  onMyWords?: () => void;
  onVoice: () => void;
  onSettings: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} name="menu" title="Menu" onClose={onClose} scanning={scanning}>
      <div className="menu scan-cluster" data-scan-row="menu">
        <Button variant="secondary" icon="save" onClick={onPhrases}>
          Phrases
        </Button>
        {onMyWords ? (
          <Button variant="secondary" icon="spell" onClick={onMyWords}>
            My words
          </Button>
        ) : null}
        <Button variant="secondary" icon="voice" onClick={onVoice}>
          Voice
        </Button>
        <Button variant="secondary" icon="gear" onClick={onSettings}>
          Settings
        </Button>
      </div>
      <section className="group" aria-labelledby="menu-status">
        <h3 className="group__title" id="menu-status">
          Status
        </h3>
        <div className="menu__status">
          {status.map((l) => (
            <StatusPill key={l.text} icon={l.icon} tone={l.tone}>
              {l.text}
            </StatusPill>
          ))}
        </div>
      </section>
    </Sheet>
  );
}
