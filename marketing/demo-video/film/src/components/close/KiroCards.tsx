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
import type { KiroCard, KiroLang } from './kiro';

type Tok = { t: string; c: string; w?: number };

const EARS = /\b(WHEN|THE|SHALL|IF|THEN|WHILE|WHERE|AND|NOT)\b/;

/** Quiet colouring: structure in line-strong, the words that matter in ink, the rest muted. */
const tokens = (lang: KiroLang, text: string): Tok[] => {
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
  const bullet = /^(- )(.*)$/.exec(text);
  if (bullet) return [{ t: bullet[1]!, c: C.lineStrong, w: 700 }, { t: bullet[2]!, c: C.ink }];
  return [{ t: text, c: C.ink }];
};

export const GLASS = {
  /** Excerpt type. */
  font: 38,
  line: 50,
};

export const GlassCard: React.FC<{ card: KiroCard; width: number; height: number; sweep?: number }> = ({ card, width, height, sweep = 0 }) => {
  const indent = Math.min(...card.lines.map((l) => /^ */.exec(l.text)![0].length));
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
        border: '2px solid rgba(141,128,194,0.46)',
        boxShadow: 'inset 0 2px 0 rgba(238,232,255,0.12), 0 36px 90px rgba(8,4,20,0.6)',
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
            <div key={l.n} style={{ display: 'flex', alignItems: 'flex-start', fontSize: GLASS.font, lineHeight: `${GLASS.line}px` }}>
              <div style={{ width: 58, flex: 'none', textAlign: 'right', paddingRight: 20, color: C.lineStrong, fontSize: 28, fontWeight: 500 }}>{l.n}</div>
              <div style={{ paddingLeft: `${lead}ch`, whiteSpace: 'pre-wrap', minWidth: 0 }}>
                {tokens(card.lang, body).map((t, i) => (
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
