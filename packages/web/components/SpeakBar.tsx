import type { DisplayWord } from '@/lib/sentence';
import { Button } from './Button';

/**
 * design-system SpeakBar (nl-speakbar): the sentence about to be spoken (utterance, 40px),
 * its keys in mono under it, and Speak, the screen's one primary button.
 * Long sentences wrap; never truncate what someone is about to say.
 */
export function SpeakBar({
  tokens,
  words,
  codes,
  canSpeak,
  emptyText,
  speakVariant,
  speakLit,
  speaking,
  onSpeak,
}: {
  tokens: string[];
  words: DisplayWord[];
  codes: string[];
  canSpeak: boolean;
  emptyText: string;
  /** 'primary' normally; 'quiet' while the scan highlight is the screen's ember thing. */
  speakVariant: 'primary' | 'quiet';
  speakLit?: boolean;
  speaking?: boolean;
  onSpeak: () => void;
}) {
  const empty = tokens.length === 0;
  return (
    <div className="nl-speakbar">
      <p className={empty ? 'nl-speakbar__text is-empty' : 'nl-speakbar__text'} id="utterance">
        {empty
          ? emptyText
          : tokens.map((t, i) => (
              <span key={i}>
                {i > 0 ? ' ' : null}
                <span className={words[i]?.word === null ? 'nl-speakbar__partial' : undefined}>{t}</span>
              </span>
            ))}
        {empty ? null : (
          <span className="nl-speakbar__digits">
            <span className="nl-sr-only">Keys: </span>
            {codes.join(' ')}
          </span>
        )}
      </p>
      <Button
        variant={canSpeak ? speakVariant : 'quiet'}
        size="xl"
        icon="speaker"
        disabled={!canSpeak}
        lit={speakLit}
        onClick={onSpeak}
        aria-describedby="utterance"
        data-action="speak"
      >
        {speaking ? 'Speaking' : 'Speak'}
      </Button>
    </div>
  );
}
