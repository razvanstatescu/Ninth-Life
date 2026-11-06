// Parse the model's reply into raw candidate word lists. This step only checks shape; the
// validator in @ninth/core decides what may be spoken.

export interface ParsedReply {
  /** Candidates with string words, lowercased and trimmed. Length is not checked here. */
  candidates: string[][];
  /** Entries inside `c` that were not arrays of strings. */
  malformed: number;
  /** True when no JSON object with a `c` array could be found. */
  unparseable: boolean;
}

const MAX_CANDIDATES = 20;

/** Find the first balanced {...} block, skipping braces inside JSON strings. */
function firstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Recover complete inner arrays from a reply cut off by max_tokens, e.g.
 * `{"c":[["i","need","water"],["i","need","wa` -> [["i","need","water"]].
 */
function salvage(text: string): string[][] {
  const at = text.search(/"c"\s*:\s*\[/);
  if (at < 0) return [];
  const out: string[][] = [];
  const re = /\[\s*("(?:[^"\\]|\\.)*"(?:\s*,\s*"(?:[^"\\]|\\.)*")*)\s*\]/g;
  re.lastIndex = at;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && out.length < MAX_CANDIDATES) {
    try {
      const arr = JSON.parse(`[${m[1]}]`) as unknown[];
      if (arr.every((w) => typeof w === 'string')) out.push((arr as string[]).map((w) => w.trim().toLowerCase()));
    } catch {
      // skip
    }
  }
  return out;
}

export function parseReply(text: string): ParsedReply {
  const block = firstJsonObject(text);
  if (!block) {
    const rescued = salvage(text);
    return rescued.length
      ? { candidates: rescued, malformed: 0, unparseable: false }
      : { candidates: [], malformed: 0, unparseable: true };
  }
  let obj: unknown;
  try {
    obj = JSON.parse(block);
  } catch {
    return { candidates: [], malformed: 0, unparseable: true };
  }
  const c = (obj as { c?: unknown } | null)?.c;
  if (!Array.isArray(c)) return { candidates: [], malformed: 0, unparseable: true };
  const candidates: string[][] = [];
  let malformed = 0;
  for (const entry of c.slice(0, MAX_CANDIDATES)) {
    if (Array.isArray(entry) && entry.length > 0 && entry.every((w) => typeof w === 'string')) {
      candidates.push((entry as string[]).map((w) => w.trim().toLowerCase()));
    } else {
      malformed++;
    }
  }
  malformed += Math.max(0, c.length - MAX_CANDIDATES);
  return { candidates, malformed, unparseable: false };
}
