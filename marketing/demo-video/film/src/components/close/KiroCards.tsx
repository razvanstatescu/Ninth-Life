/**
 * Scene 14's glass cards: one real excerpt from .kiro/ each (kiro.ts, checked by verify-kiro.ts).
 * A card: the kind ("Spec") in brand type, the file's path in mono, a hairline, then the quoted lines in
 * Atkinson Hyperlegible Mono at 38 px with their source line numbers in a gutter (a jump in the numbers
 * shows where lines were left out). Colours only from tokens; never ember (the chapter has no ember thing).
 * Text you are meant to read is 28 px or more (path, line numbers) and 38 px for the excerpt.
 */
import React from 'react';
import { C, FONT } from '../../tokens';
import { LightSweep } from '../brand/Studio';
import { shownText, type KiroCard, type KiroLang } from './kiro';

type Tok = { t: string; c: string; w?: number };

const EARS = /\b(WHEN|THE|SHALL|IF|THEN|WHILE|WHERE|AND|NOT)\b/;

/** Quiet colouring: structure in line-strong, the words that matter in ink, the rest muted. */
const tokens = (lang: KiroLang, text: string, check = 1): Tok[] => {
  if (lang === 'yaml') {
    const m = /^([\w-]+:)(\s*)(.*)$/.exec(text);
    if (m) return [{ t: m[1]!, c: C.lineStrong }, { t: m[2]!, c: C.inkMuted }, { t: m[3]!, c: C.ink, w: 700 }];
    return [{ t: text, c: C.ink, w: 600 }];
  }
  if (lang === 'json') {
    const m = /^("[^"]*":)(\s*)(.*?)(,?)$/.exec(text);
    if (!m) return [{ t: text, c: C.inkMuted }];
    return [
      { t: m[1]!, c: C.lineStrong },
      { t: m[2]!, c: C.inkMuted },
      { t: m[3]!, c: C.ink, w: 700 },
      { t: m[4]!, c: C.lineStrong },
    ];
  }
  if (lang === 'ears') {
    const out: Tok[] = [];
    let rest = text;
    const num = /^(\d+\.\d+)( )/.exec(rest);
    if (num) {
      out.push({ t: num[1]!, c: C.lineStrong, w: 700 }, { t: num[2]!, c: C.inkMuted });
      rest = rest.slice(num[0].length);
    }
    for (const part of rest.split(EARS)) {
      if (!part) continue;
      out.push(EARS.test(part) && part === part.toUpperCase() ? { t: part, c: C.moon, w: 700 } : { t: part, c: C.ink });
    }
    return out;
  }
  // A done task: "- [x] ...". The x is drawn in as the task is ticked (`check`), so the line ends exactly as in the file.
  const task = /^(- \[)(x)(\] )(.*)$/.exec(text);
  if (task) return [{ t: task[1]!, c: C.lineStrong, w: 700 }, { t: check >= 0.5 ? 'x' : ' ', c: C.moon, w: 800 }, { t: task[3]!, c: C.lineStrong, w: 700 }, { t: task[4]!, c: C.ink }];
  if (/^#+ /.test(text)) return [{ t: text, c: C.moon, w: 700 }];
  const bullet = /^(- )(.*)$/.exec(text);
  if (bullet) return [{ t: bullet[1]!, c: C.lineStrong, w: 700 }, { t: bullet[2]!, c: C.ink }];
  return [{ t: text, c: C.ink }];
};

export const GLASS = {
  /** Excerpt type. */
  font: 38,
  line: 50,
};

export const GlassCard: React.FC<{
  card: KiroCard;
  width: number;
  height: number;
  sweep?: number;
  /** Excerpt type size and line height (default GLASS: 38 / 50). */
  font?: number;
  line?: number;
  /** 0..1: a done task's x is drawn in at 0.5. */
  check?: number;
  /** 0..1: the card's edge lights in moon (a hook that fires). */
  lit?: number;
}> = ({ card, width, height, sweep = 0, font = GLASS.font, line = GLASS.line, check = 1, lit = 0 }) => {
  const indent = Math.min(...card.lines.map((l) => /^ */.exec(l.text)![0].length));
  // The line-number gutter fits the longest number (three digits for the spec files).
  const gutter = 30 + String(Math.max(...card.lines.map((l) => l.n))).length * 16;
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        boxSizing: 'border-box',
        padding: '30px 38px 0 34px',
        borderRadius: 30,
        background: 'linear-gradient(160deg, rgba(61,36,120,0.80) 0%, rgba(37,21,79,0.86) 48%, rgba(31,18,67,0.92) 100%)',
        border: `2px solid rgba(${Math.round(141 + 97 * lit)},${Math.round(128 + 104 * lit)},${Math.round(194 + 61 * lit)},${0.46 + 0.5 * lit})`,
        boxShadow: `inset 0 2px 0 rgba(238,232,255,0.12), 0 36px 90px rgba(8,4,20,0.6)${lit > 0 ? `, 0 0 ${48 * lit}px rgba(238,232,255,${0.22 * lit})` : ''}`,
        overflow: 'hidden',
      }}
    >
      {/* Glass: a top-left light and one soft sweep. */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(155deg, rgba(238,232,255,0.10) 0%, rgba(238,232,255,0) 38%)', pointerEvents: 'none' }} />
      <LightSweep progress={sweep} intensity={0.12} />

      <div style={{ position: 'relative', fontFamily: FONT.sans, fontSize: 50, lineHeight: '56px', fontWeight: 800, letterSpacing: '-0.01em', color: C.moon }}>{card.title}</div>
      <div style={{ position: 'relative', marginTop: 6, fontFamily: FONT.mono, fontSize: 28, lineHeight: '36px', fontWeight: 500, color: C.inkMuted, whiteSpace: 'nowrap' }}>
        {card.path}
      </div>
      <div style={{ position: 'relative', height: 2, margin: '20px -38px 18px -34px', background: 'rgba(141,128,194,0.32)' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', fontFamily: FONT.mono }}>
        {card.lines.map((l) => {
          const lead = /^ */.exec(l.text)![0].length - indent;
          const body = l.text.trimStart();
          return (
            <div key={l.n} style={{ display: 'flex', alignItems: 'flex-start', fontSize: font, lineHeight: `${line}px` }}>
              <div style={{ width: gutter, flex: 'none', boxSizing: 'border-box', textAlign: 'right', paddingRight: 18, color: C.lineStrong, fontSize: 28, fontWeight: 500 }}>{l.n}</div>
              <div style={{ paddingLeft: `${lead}ch`, whiteSpace: 'pre-wrap', minWidth: 0 }}>
                {tokens(card.lang, body, check).map((t, i) => (
                  <span key={i} style={{ color: t.c, fontWeight: t.w ?? 500 }}>
                    {t.t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Third cut, second pass (the owner: "messy, text getting out of boxes"): a card that sizes itself to its content.
 * - Width is the content's own (max-content), up to `maxWidth`; height is the content's own; padding is the same on all
 *   sides, so no line can touch or cross an edge.
 * - Lines never wrap (white-space: pre): every quoted line was chosen, or cut with a marked "…", to fit one line.
 * - `focus`: index of the line to keep bright while the others dim (line focus); undefined = all bright.
 */
export const QuoteCard: React.FC<{
  card: KiroCard;
  font?: number;
  line?: number;
  check?: number;
  lit?: number;
  sweep?: number;
  maxWidth?: number;
  focus?: number;
  /** A fixed width (where wires must meet the edge); the content must fit it. Default: the content's own. */
  width?: number;
  /** 0..1: darkens the card towards night when another card takes the focus (darkening, never transparency). */
  dim?: number;
}> = ({ card, font = 40, line = 56, check = 1, lit = 0, sweep = 0, maxWidth = 1760, focus, width, dim = 0 }) => {
  const shown = card.lines.map((l) => shownText(l));
  const indent = Math.min(...shown.map((t) => /^ */.exec(t)![0].length));
  const gutter = 24 + String(Math.max(...card.lines.map((l) => l.n))).length * 17;
  const pad = 36;
  return (
    <div
      style={{
        position: 'relative',
        width: width ?? 'max-content',
        maxWidth,
        boxSizing: 'border-box',
        padding: `${pad - 4}px ${pad + 8}px ${pad}px ${pad}px`,
        borderRadius: 30,
        background: 'linear-gradient(160deg, rgba(61,36,120,0.84) 0%, rgba(37,21,79,0.9) 48%, rgba(31,18,67,0.95) 100%)',
        border: `2px solid rgba(${Math.round(141 + 97 * lit)},${Math.round(128 + 104 * lit)},${Math.round(194 + 61 * lit)},${0.46 + 0.5 * lit})`,
        boxShadow: `inset 0 2px 0 rgba(238,232,255,0.12), 0 36px 90px rgba(8,4,20,0.6)${lit > 0 ? `, 0 0 ${48 * lit}px rgba(238,232,255,${0.22 * lit})` : ''}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(155deg, rgba(238,232,255,0.10) 0%, rgba(238,232,255,0) 38%)', pointerEvents: 'none' }} />
      <LightSweep progress={sweep} intensity={0.12} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 22, whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: FONT.sans, fontSize: 46, lineHeight: '54px', fontWeight: 800, letterSpacing: '-0.01em', color: C.moon }}>{card.title}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 26, lineHeight: '34px', fontWeight: 500, color: C.inkMuted }}>{card.path}</span>
      </div>
      <div style={{ position: 'relative', height: 2, margin: `22px -${pad + 8}px 22px -${pad}px`, background: 'rgba(141,128,194,0.32)' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', fontFamily: FONT.mono }}>
        {card.lines.map((l, i) => {
          const text = shown[i]!;
          const lead = /^ */.exec(text)![0].length - indent;
          const dim = focus !== undefined && focus !== i ? 0.38 : 1;
          return (
            <div key={l.n} style={{ display: 'flex', alignItems: 'baseline', fontSize: font, lineHeight: `${line}px`, whiteSpace: 'pre', opacity: dim }}>
              <div style={{ width: gutter, flex: 'none', boxSizing: 'border-box', textAlign: 'right', paddingRight: 18, color: C.lineStrong, fontSize: 26, fontWeight: 500 }}>{l.n}</div>
              <div style={{ paddingLeft: `${lead}ch` }}>
                {tokens(card.lang, text.trimStart(), check).flatMap((t, k) =>
                  t.t.split('…').map((part, j, all) => (
                    <React.Fragment key={`${k}-${j}`}>
                      {part ? <span style={{ color: t.c, fontWeight: t.w ?? 500 }}>{part}</span> : null}
                      {j < all.length - 1 ? <span style={{ color: C.lineStrong, fontWeight: 500 }}>…</span> : null}
                    </React.Fragment>
                  )),
                )}
              </div>
            </div>
          );
        })}
      </div>
      {dim > 0 ? <div style={{ position: 'absolute', inset: 0, background: C.night, opacity: 0.55 * dim, pointerEvents: 'none' }} /> : null}
    </div>
  );
};

