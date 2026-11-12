'use client';
import type { StatusLine } from '@/lib/status';
import { StatusPill } from './AppHeader';
import { Button } from './Button';
import { Sheet } from './Sheet';

/**
 * The compact header's Menu (web-ui Req 15.3): the full status, then Phrases, My words, Voice and Settings.
 * Each choice opens its own sheet in place of this one. In the phone layout (web-ui Req 24) the Menu
 * button sits in the action bar and the sheet also holds the sentence's less used actions: Save
 * phrase and Spell this word, and Sentences on a short phone that has no suggestion row (Req 24.9).
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
  about,
}: {
  open: boolean;
  status: StatusLine[];
  scanning?: boolean;
  onPhrases: () => void;
  onMyWords?: () => void;
  onVoice: () => void;
  onSettings: () => void;
  onClose: () => void;
  /** Phones and tablets: the sentence's actions that are not on the screen, and They said. */
  sentence?: {
    canSave: boolean;
    onSave: () => void;
    canSpell: boolean;
    onSpell: () => void;
    /** Short phones with no suggestion row (web-ui Req 24.9): every sentence for the keys. */
    onSentences?: () => void;
    onProof?: () => void;
    onPartner?: () => void;
  } | null;
  /** Phones and tablets: the About links and this sentence (the footer is not on the screen). */
  about?: string | null;
}) {
  return (
    <Sheet open={open} name="menu" title="Menu" onClose={onClose} scanning={scanning}>
      {sentence ? (
        <section className="group" aria-labelledby="menu-sentence">
          <h3 className="group__title" id="menu-sentence">
            This sentence
          </h3>
          <div className="menu scan-cluster" data-scan-row="sentence">
            {sentence.onSentences ? (
              <Button variant="secondary" icon="menu" onClick={sentence.onSentences}>
                Sentences
              </Button>
            ) : null}
            <Button variant="secondary" icon="save" onClick={sentence.onSave} disabled={!sentence.canSave}>
              Save phrase
            </Button>
            <Button variant="secondary" icon="spell" onClick={sentence.onSpell} disabled={!sentence.canSpell}>
              Spell this word
            </Button>
            {sentence.onProof ? (
              <Button variant="secondary" icon="check" onClick={sentence.onProof}>
                Check the words
              </Button>
            ) : null}
            {sentence.onPartner ? (
              <Button variant="secondary" icon="voice" onClick={sentence.onPartner}>
                They said
              </Button>
            ) : null}
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
      {about ? (
        <section className="group" aria-labelledby="menu-about">
          <h3 className="group__title" id="menu-about">
            About
          </h3>
          <div className="menu scan-cluster" data-scan-row="about">
            <a className="nl-btn nl-btn--secondary" href="/">
              How Ninth Life works
            </a>
            <a className="nl-btn nl-btn--secondary" href="/about">
              About Ninth Life
            </a>
          </div>
          <p className="menu__note">{about}</p>
        </section>
      ) : null}
    </Sheet>
  );
}
