/** Key-line pieces with no hooks, so server-rendered parts (ProofChip on the website) can use them too. */
import { codeEdit, type CodeEdit } from '@ninth/core';
/**
 * One word's keys on the key line (web-ui Req 31.3): the keys pressed, then the ones that came with a word
 * picked from Finish the word, with a dotted underline (`nl-filled`) and ", N filled in" for screen readers.
 */
export function KeyCode({ code, typed, was, lead = '' }: { code: string; typed?: number; was?: string; lead?: string }) {
  if (was !== undefined && was !== code)
    return (
      <>
        {lead}
        <EditedCode was={was} code={code} />
      </>
    );
  if (typed === undefined || typed >= code.length) return <>{lead + code}</>;
  const filled = code.length - typed;
  return (
    <>
      {lead + code.slice(0, typed)}
      <span className="nl-filled">{code.slice(typed)}</span>
      <span className="nl-sr-only">, {filled} filled in</span>
    </>
  );
}

/** A key change in words, for screen readers (web-ui Req 32.5): "key 4 changed from 6 to 5", "key 3 added", "extra 5 removed". */
export function editWords(e: CodeEdit): string {
  if (e.kind === 'change') return `key ${e.at + 1} changed from ${e.from} to ${e.to}`;
  if (e.kind === 'add') return `key ${e.to} added`;
  return `extra ${e.from} removed`;
}

/**
 * A word's keys after a word one key away was taken (web-ui Req 32.5): a changed or added key in a box
 * (`nl-keyfix`), a removed key shown in its place struck through (`nl-keyfix-removed`, hidden from screen
 * readers), then the change in words. A shape, never colour alone.
 */
export function EditedCode({ was, code, srText = true }: { was: string; code: string; srText?: boolean }) {
  const e = codeEdit(was, code);
  if (!e) return <>{code}</>;
  const body =
    e.kind === 'remove' ? (
      <>
        {code.slice(0, e.at)}
        <span className="nl-keyfix-removed" aria-hidden="true">
          {e.from}
        </span>
        {code.slice(e.at)}
      </>
    ) : (
      <>
        {code.slice(0, e.at)}
        <span className="nl-keyfix">{code[e.at]}</span>
        {code.slice(e.at + 1)}
      </>
    );
  return (
    <>
      {body}
      {srText ? <span className="nl-sr-only">, {editWords(e)}</span> : null}
    </>
  );
}
