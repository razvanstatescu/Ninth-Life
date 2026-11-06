'use client';
import { encodeWord, type Lexicon } from '@ninth/core';
import { useEffect, useId, useRef, useState } from 'react';
import type { MyWord } from '@/lib/myWords';
import { PACK_LIMITS, exportVocabPack, fetchPackText, packUrl, parseVocabPack, planImport, type ImportPlan, type ParsedPack } from '@/lib/vocabPack';
import { Button } from './Button';
import { Sheet } from './Sheet';

/** Words listed at first, and how many more each "More words" adds. */
export const WORDS_PAGE = 20;
const PREVIEW_WORDS = 24;

function names(list: { display: string }[], max = PREVIEW_WORDS): string {
  const shown = list.slice(0, max).map((x) => x.display);
  return list.length > max ? `${shown.join(', ')} and ${list.length - max} more` : shown.join(', ');
}
/** File text, with a FileReader fallback for browsers (and jsdom) without Blob.text(). */
function readText(f: File): Promise<string> {
  if (typeof f.text === 'function') return f.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(r.error);
    r.readAsText(f);
  });
}
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/**
 * My words (web-ui Req 21, 22): words the person added, stored on this device only. Remove works
 * by switch (each word is a scan row). Word packs (VocabPack JSON, docs/architecture/vocab-packs.md)
 * come from a file or a pasted link, are checked, and are shown before anything is added.
 */
export function MyWordsSheet({
  open,
  scanning,
  words,
  phrases,
  lexicon,
  error,
  onAdd,
  onRemove,
  onImport,
  onClose,
}: {
  open: boolean;
  scanning?: boolean;
  words: MyWord[];
  /** Saved phrase texts (exported with the words; pack phrases already saved are not added again). */
  phrases: string[];
  lexicon: Lexicon | null;
  error: string | null;
  /** Add a typed word; returns a message when it cannot be added. */
  onAdd: (raw: string) => string | null;
  onRemove: (w: string) => void;
  onImport: (pack: ParsedPack, plan: ImportPlan) => void;
  onClose: () => void;
}) {
  const ids = useId();
  const [text, setText] = useState('');
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [shown, setShown] = useState(WORDS_PAGE);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [packMsg, setPackMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ pack: ParsedPack; plan: ImportPlan; from: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) return;
    setPreview(null);
    setPackMsg(null);
    setAddMsg(null);
    setConfirming(null);
  }, [open]);
  useEffect(() => {
    if (preview) previewRef.current?.focus();
  }, [preview]);

  const add = () => {
    const msg = onAdd(text);
    setAddMsg(msg);
    if (!msg) setText('');
  };

  const showPack = (raw: string, from: string) => {
    const res = parseVocabPack(raw);
    if (!res.ok) {
      setPreview(null);
      setPackMsg(res.error);
      return;
    }
    setPackMsg(null);
    setPreview({ pack: res.pack, plan: planImport(res.pack, words, phrases, lexicon), from });
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > PACK_LIMITS.bytes) {
      setPreview(null);
      setPackMsg('This file is too big for a word pack. A pack can be at most 1 MB.');
      return;
    }
    try {
      showPack(await readText(f), f.name);
    } catch {
      setPackMsg('This file could not be read.');
    }
  };

  const getLink = async () => {
    const u = packUrl(link);
    if ('error' in u) {
      setPackMsg(u.error);
      return;
    }
    setBusy(true);
    setPackMsg('Getting the pack.');
    try {
      showPack(await fetchPackText(u.url), new URL(u.url).hostname);
    } catch (e) {
      setPreview(null);
      setPackMsg(e instanceof Error ? e.message : 'The pack could not be fetched.');
    } finally {
      setBusy(false);
    }
  };

  const exportPack = () => {
    const pack = exportVocabPack(words, phrases);
    const blob = new Blob([JSON.stringify(pack, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ninth-life-my-words.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setPackMsg(`Saved ${plural(pack.words.length, 'word')} and ${plural(pack.phrases.length, 'phrase')} as ninth-life-my-words.json.`);
  };

  const list = words.slice(0, shown);
  const plan = preview?.plan;
  const toAdd = plan ? plan.add.length + plan.update.length : 0;
  const phrasesToAdd = plan?.phrasesNew.length ?? 0;

  return (
    <Sheet open={open} name="words" title="My words" onClose={onClose} scanning={scanning}>
      <section className="group" aria-labelledby={`${ids}-words`}>
        <h3 className="group__title" id={`${ids}-words`}>
          Your words
        </h3>
        <p className="field__help">
          Names and words the dictionary does not know. They stay on this device, rank higher when you type, and keep their capital letters.
        </p>
        {error ? <p className="notice notice--warn">{error}</p> : null}

        <div className="field">
          <label className="field__label" htmlFor={`${ids}-add`}>
            Add a word
          </label>
          <div className="field__row">
            <input
              id={`${ids}-add`}
              className="input"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={64}
              value={text}
              aria-describedby={addMsg ? `${ids}-addmsg` : undefined}
              onChange={(e) => {
                setText(e.target.value);
                setAddMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <div className="scan-cluster" data-scan-row="add-word">
              <Button variant="secondary" icon="plus" onClick={add} disabled={!text.trim()}>
                Add to my words
              </Button>
            </div>
          </div>
          {addMsg ? (
            <p className="field__help" id={`${ids}-addmsg`} role="status">
              {addMsg}
            </p>
          ) : null}
        </div>

        {words.length === 0 ? (
          <p className="field__help">No words yet. When a word is not in the dictionary, choose Spell this word, then Add to my words.</p>
        ) : (
          <>
            <p className="field__help">{plural(words.length, 'word')}, newest first.</p>
            <ul className="mywords">
              {list.map((w) => (
                <li key={w.w} className="myword scan-cluster" data-scan-row={`word-${w.w}`}>
                  <span className="myword__text" lang="en">
                    {w.display}
                  </span>
                  <span className="myword__code">
                    <span className="nl-sr-only">Keys </span>
                    {encodeWord(w.w)}
                  </span>
                  {confirming === w.w ? (
                    <>
                      <Button
                        variant="danger"
                        icon="x"
                        onClick={() => {
                          setConfirming(null);
                          onRemove(w.w);
                        }}
                      >
                        Remove word
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirming(null)}>
                        Keep
                      </Button>
                    </>
                  ) : (
                    <Button variant="danger" icon="x" onClick={() => setConfirming(w.w)} aria-label={`Remove ${w.display}`}>
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {shown < words.length ? (
              <div className="scan-cluster" data-scan-row="words-more">
                <Button variant="secondary" icon="plus" onClick={() => setShown((n) => n + WORDS_PAGE)}>
                  More words
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="group" aria-labelledby={`${ids}-packs`}>
        <h3 className="group__title" id={`${ids}-packs`}>
          Word packs
        </h3>
        <p className="field__help">
          A word pack is a file of words and phrases, for example made by someone close to you. You see what it adds before anything is added. Export saves your words and your phrases as a pack file.
        </p>
        <div className="field__row scan-cluster" data-scan-row="packs">
          <Button variant="secondary" icon="plus" onClick={() => fileRef.current?.click()}>
            Import a pack file
          </Button>
          <Button variant="secondary" icon="save" onClick={exportPack} disabled={words.length === 0 && phrases.length === 0}>
            Export my words
          </Button>
        </div>
        <input
          ref={fileRef}
          className="nl-sr-only"
          type="file"
          accept=".json,application/json"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <div className="field">
          <label className="field__label" htmlFor={`${ids}-link`}>
            Or paste a link to a pack file
          </label>
          <p className="field__help" id={`${ids}-linkhelp`}>
            Ninth Life gets the file from that address. Nothing you typed is sent.
          </p>
          <div className="field__row">
            <input
              id={`${ids}-link`}
              className="input"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://"
              value={link}
              aria-describedby={`${ids}-linkhelp`}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void getLink();
                }
              }}
            />
            <div className="scan-cluster" data-scan-row="pack-link">
              <Button variant="secondary" onClick={() => void getLink()} disabled={!link.trim() || busy}>
                Get pack
              </Button>
            </div>
          </div>
        </div>
        {packMsg ? (
          <p className="field__help" role="status">
            {packMsg}
          </p>
        ) : null}

        {preview && plan ? (
          <section className="pack-preview card" aria-labelledby={`${ids}-preview`} tabIndex={-1} ref={previewRef}>
            <h4 className="group__title" id={`${ids}-preview`}>
              Pack &quot;{preview.pack.id}&quot;, version {preview.pack.version}
            </h4>
            <p className="field__help">From {preview.from}. Nothing is added until you choose Add.</p>
            <ul className="pack-preview__list">
              {plan.add.length > 0 ? (
                <li>
                  Adds {plural(plan.add.length, 'word')}: <span lang="en">{names(plan.add)}</span>.
                  {plan.known > 0 ? ` ${plan.known.toLocaleString('en-US')} of them ${plan.known === 1 ? 'is' : 'are'} already in the dictionary and will rank higher.` : ''}
                </li>
              ) : null}
              {plan.update.length > 0 ? (
                <li>
                  Updates {plural(plan.update.length, 'word')} already in my words: <span lang="en">{names(plan.update)}</span>.
                </li>
              ) : null}
              {plan.same.length > 0 ? <li>{plural(plan.same.length, 'word is', 'words are')} already in my words.</li> : null}
              {plan.phrasesNew.length > 0 ? (
                <li>
                  Adds {plural(plan.phrasesNew.length, 'phrase')} to your phrases:{' '}
                  <span lang="en">
                    {plan.phrasesNew
                      .slice(0, 5)
                      .map((p) => `"${p}"`)
                      .join(', ')}
                    {plan.phrasesNew.length > 5 ? ` and ${plan.phrasesNew.length - 5} more` : ''}
                  </span>
                  .
                </li>
              ) : null}
              {plan.phrasesExisting.length > 0 ? <li>{plural(plan.phrasesExisting.length, 'phrase is', 'phrases are')} already saved.</li> : null}
              {preview.pack.skipped.length > 0 ? (
                <li>
                  Leaves out {plural(preview.pack.skipped.length, 'entry', 'entries')}:{' '}
                  {preview.pack.skipped
                    .slice(0, 10)
                    .map((s) => `"${s.item}" (${s.reason})`)
                    .join(', ')}
                  {preview.pack.skipped.length > 10 ? ` and ${preview.pack.skipped.length - 10} more` : ''}.
                </li>
              ) : null}
            </ul>
            {toAdd + phrasesToAdd === 0 ? <p className="field__help">Nothing new in this pack.</p> : null}
            <div className="field__row scan-cluster" data-scan-row="pack-confirm">
              {toAdd + phrasesToAdd > 0 ? (
                <Button
                  variant="secondary"
                  icon="check"
                  onClick={() => {
                    onImport(preview.pack, plan);
                    setPreview(null);
                    setPackMsg(`Added ${plural(toAdd, 'word')} and ${plural(phrasesToAdd, 'phrase')}.`);
                  }}
                >
                  Add {plural(toAdd, 'word')}
                  {phrasesToAdd > 0 ? ` and ${plural(phrasesToAdd, 'phrase')}` : ''}
                </Button>
              ) : null}
              <Button variant="secondary" icon="x" onClick={() => setPreview(null)}>
                Cancel
              </Button>
            </div>
          </section>
        ) : null}
      </section>
    </Sheet>
  );
}
