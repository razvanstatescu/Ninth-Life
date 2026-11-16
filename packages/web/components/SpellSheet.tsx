'use client';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { initialChoice, spellOptions, spelledWord, withCapital } from '@/lib/spell';
import { Button } from './Button';
import { Sheet } from './Sheet';

export const SPELL_USE_ID = 'spell-use';
const posId = (p: number) => `spell-pos-${p}`;

/**
 * Spell this word (web-ui Req 19): one row per key the person pressed, each offering only that
 * key's letters, so the word always matches the keys. Touch: tap a letter. Keyboard: 1-4 picks the
 * letter for the current key and moves on, arrows move (left/right letters, up/down keys), Enter
 * uses the word. Switch: the sheet's scan rows are Close, the two actions, one row per key, then
 * the capital letter switch.
 */
export function SpellSheet({
  open,
  code,
  word,
  capital: capitalStart,
  known,
  mine,
  scanning,
  onUse,
  onClose,
}: {
  open: boolean;
  /** The keys of the word being spelled. */
  code: string;
  /** Letters to start from (the word on show, or the likeliest completion); null for none. */
  word: string | null;
  /** Start with a capital first letter (names). */
  capital: boolean;
  /** True if the dictionary knows this folded word. */
  known: (w: string) => boolean;
  /** True if it is already in my words. */
  mine: (w: string) => boolean;
  scanning?: boolean;
  /** `display` is the person's spelling ("Mihai"); `add` also keeps it in my words. */
  onUse: (display: string, add: boolean) => void;
  onClose: () => void;
}) {
  const uid = useId();
  const options = spellOptions(code);
  const startKey = open ? `${code}|${word ?? ''}|${capitalStart}` : '';
  const [st, setSt] = useState(() => ({ key: startKey, choice: initialChoice(code, word), capital: capitalStart }));
  // A new word to spell starts from its own letters (state adjusted during render, before the sheet opens).
  const lastPos = useRef(0);
  if (open && st.key !== startKey) {
    lastPos.current = 0;
    setSt({ key: startKey, choice: initialChoice(code, word), capital: capitalStart });
  }

  const choice = st.choice.length === options.length ? st.choice : initialChoice(code, word);
  const spelled = spelledWord(code, choice);
  const display = spelled ? withCapital(spelled, st.capital) : '';
  const isKnown = spelled ? known(spelled) : false;
  const isMine = spelled ? mine(spelled) : false;

  const choose = (p: number, j: number) =>
    setSt((s) => {
      const base = s.choice.length === options.length ? s.choice : initialChoice(code, word);
      return { ...s, choice: base.map((c, i) => (i === p ? j : c)) };
    });
  const focusPos = (p: number) => {
    const el = p >= options.length ? document.getElementById(SPELL_USE_ID) : document.getElementById(posId(Math.max(0, p)));
    el?.focus();
  };
  const use = (add: boolean) => {
    if (display) onUse(display, add);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (scanning || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement;
    const at = t.closest('[data-pos]');
    const pos = at ? Number(at.getAttribute('data-pos')) : -1;
    if (/^[1-4]$/.test(e.key) && !(t.tagName === 'INPUT' && (t as HTMLInputElement).type === 'checkbox')) {
      // The key being spelled: where focus is, or the next one after the last digit.
      const p = Math.min(lastPos.current, options.length - 1);
      const j = Number(e.key) - 1;
      if (!options[p] || j >= options[p]!.length) return;
      e.preventDefault();
      choose(p, j);
      // Move on now (the next key's chosen letter is already in the page), so fast typing never lands twice on one key.
      lastPos.current = p + 1;
      focusPos(p + 1);
      return;
    }
    if (pos < 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusPos(Math.min(options.length - 1, Math.max(0, pos + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      use(false);
    }
  };

  return (
    <Sheet open={open} name="spell" kind="panel" title="Spell this word" onClose={onClose} scanning={scanning} initialFocusId={posId(0)}>
      <div className="spell" onKeyDown={onKeyDown}>
        <div className="spell__preview">
          <p className="spell__word" lang="en" aria-live="polite" aria-atomic="true">
            {display || code}
          </p>
          <p className="spell__code">
            <span className="nl-sr-only">Keys: </span>
            {code}
          </p>
          <p className="field__help">
            {isMine ? 'In my words.' : isKnown ? 'In your dictionary.' : 'Not in your words yet.'} Each letter matches the key you pressed.
          </p>
        </div>

        <div className="spell__actions scan-cluster" data-scan-row="spell-done">
          <Button variant="secondary" icon="check" id={SPELL_USE_ID} onClick={() => use(false)} disabled={!display}>
            Use this word
          </Button>
          {isMine ? null : (
            <Button variant="secondary" icon="plus" onClick={() => use(true)} disabled={!display}>
              Add to my words
            </Button>
          )}
        </div>

        <p className="field__help">
          Choose the letter for each key. On a keyboard, 1 to 4 picks a letter, the arrows move and Enter uses the word.
        </p>

        <div className="spell__positions">
          {options.map((letters, p) => (
            <fieldset className="spell__pos" key={p} data-pos={p}>
              <legend className="field__label spell__legend">
                Letter {p + 1}
                <span className="spell__key">key {code[p]}</span>
              </legend>
              <div className="spell__letters scan-cluster" data-scan-row={`pos-${p}`}>
                {letters.map((ch, j) => {
                  const checked = choice[p] === j;
                  return (
                    <label key={ch} className="spell__letter">
                      <input
                        type="radio"
                        name={`${uid}-pos-${p}`}
                        id={checked ? posId(p) : undefined}
                        value={ch}
                        checked={checked}
                        onChange={() => choose(p, j)}
                        onFocus={() => (lastPos.current = p)}
                      />
                      <span className="spell__char">{p === 0 && st.capital ? ch.toUpperCase() : ch}</span>
                      <span className="spell__num" aria-hidden="true">
                        {j + 1}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="scan-cluster" data-scan-row="spell-case">
          <label className="toggle">
            <input type="checkbox" role="switch" checked={st.capital} onChange={(e) => setSt((s) => ({ ...s, capital: e.target.checked }))} />
            <span className="toggle__text">Capital first letter</span>
            <span className="toggle__state" aria-hidden="true">
              {st.capital ? 'On' : 'Off'}
            </span>
          </label>
        </div>
      </div>
    </Sheet>
  );
}
