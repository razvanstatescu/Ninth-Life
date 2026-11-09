'use client';
import type { StatusLine } from '@/lib/status';
import { StatusPill } from './AppHeader';
import { Button } from './Button';
import { Sheet } from './Sheet';

/**
 * The compact header's Menu (web-ui Req 15.3): the full status, then Phrases, My words, Voice and Settings.
 * Each choice opens its own sheet in place of this one. In the phone layout (web-ui Req 24) the Menu
 * button sits in the action bar and the sheet also holds the sentence's less used actions: Save
 * phrase and Spell this word.
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
  sentence,
}: {
  open: boolean;
  status: StatusLine[];
  scanning?: boolean;
  onPhrases: () => void;
  onMyWords?: () => void;
  onVoice: () => void;
  onSettings: () => void;
  onClose: () => void;
  /** Phone layout: the sentence's Save phrase and Spell this word. */
  sentence?: { canSave: boolean; onSave: () => void; canSpell: boolean; onSpell: () => void } | null;
}) {
  return (
    <Sheet open={open} name="menu" title="Menu" onClose={onClose} scanning={scanning}>
      {sentence ? (
        <section className="group" aria-labelledby="menu-sentence">
          <h3 className="group__title" id="menu-sentence">
            This sentence
          </h3>
          <div className="menu scan-cluster" data-scan-row="sentence">
            <Button variant="secondary" icon="save" onClick={sentence.onSave} disabled={!sentence.canSave}>
              Save phrase
            </Button>
            <Button variant="secondary" icon="spell" onClick={sentence.onSpell} disabled={!sentence.canSpell}>
              Spell this word
            </Button>
          </div>
        </section>
      ) : null}
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
