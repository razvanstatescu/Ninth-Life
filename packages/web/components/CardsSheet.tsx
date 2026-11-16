'use client';
import { SHOW_CARDS } from '@/lib/cards';
import { chunk } from './PhrasesSheet';
import { Button } from './Button';
import { Sheet } from './Sheet';

/**
 * Show a card (web-ui Req 35.2): Show with nothing typed opens the ready cards, then the person's saved phrases.
 * A press opens Show mode with that text (big, with Flip); nothing is spoken. Each card is its own scan row.
 */
export function CardsSheet({
  open,
  scanning,
  phrases,
  onShow,
  onClose,
}: {
  open: boolean;
  scanning?: boolean;
  /** Saved phrase texts. */
  phrases: readonly string[];
  onShow: (text: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} name="cards" kind="fit" title="Show a card" onClose={onClose} scanning={scanning}>
      <section className="group" aria-labelledby="cards-ready">
        <h3 className="group__title" id="cards-ready">
          Cards
        </h3>
        <div className="cards">
          {SHOW_CARDS.map((t, i) => (
            <div className="scan-cluster" data-scan-row={`card-${i}`} key={t}>
              <Button variant="secondary" icon="show" className="cards__card" onClick={() => onShow(t)}>
                {t}
              </Button>
            </div>
          ))}
        </div>
      </section>
      <section className="group" aria-labelledby="cards-phrases">
        <h3 className="group__title" id="cards-phrases">
          Your phrases
        </h3>
        {phrases.length === 0 ? (
          <p className="field__help">Save a phrase to show it here.</p>
        ) : (
          <div className="cards">
            {chunk(phrases, 1).map(([t], i) => (
              <div className="scan-cluster" data-scan-row={`card-phrase-${i}`} key={`${i}-${t}`}>
                <Button variant="secondary" icon="show" className="cards__card" onClick={() => onShow(t!)}>
                  {t}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </Sheet>
  );
}
