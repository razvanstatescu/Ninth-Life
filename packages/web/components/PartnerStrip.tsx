'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { TYPING, type PartnerBand, type PartnerView } from '@/lib/partner';

/** Text sizes the full band steps down through to fit (web-ui Req 33.6); 24px may take 3 lines. */
const FULL_SIZES = [40, 32, 28, 24] as const;

/**
 * The partner strip (web-ui Req 33, ADR-010): a band at the top of the screen for the other person. It shows
 * nothing, "Typing…" while a sentence is in progress, or what was said or shown, never the words before Speak.
 * No controls, not a live region, no motion, no timeout. "Facing" turns the text 180° for someone across a table.
 */
export function PartnerStrip({ view, band, flipped }: { view: PartnerView; band: Exclude<PartnerBand, 'none'>; flipped: boolean }) {
  const text = view.kind === 'typing' ? TYPING : view.kind === 'said' ? view.text : '';
  const ref = useRef<HTMLParagraphElement>(null);
  const [size, setSize] = useState<number>(FULL_SIZES[0]);
  const [cut, setCut] = useState(false);
  // Full band: the largest size whose lines fit; at the smallest, a sentence still too long shows its end.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || band !== 'full' || view.kind !== 'said') {
      setSize(FULL_SIZES[0]);
      setCut(false);
      return;
    }
    let chosen: number = FULL_SIZES[FULL_SIZES.length - 1]!;
    for (const s of FULL_SIZES) {
      el.style.fontSize = `${s}px`;
      el.style.lineHeight = `${Math.round(s * 1.2)}px`;
      if (el.scrollHeight <= el.clientHeight + 1) {
        chosen = s;
        break;
      }
    }
    el.style.fontSize = '';
    el.style.lineHeight = '';
    setSize(chosen);
    el.style.fontSize = `${chosen}px`;
    el.style.lineHeight = `${Math.round(chosen * 1.2)}px`;
    setCut(el.scrollHeight > el.clientHeight + 1);
    el.style.fontSize = '';
    el.style.lineHeight = '';
  }, [text, band, view.kind]);
  const cls = ['partner-strip', `partner-strip--${band}`, view.kind === 'typing' ? 'is-typing' : '', cut ? 'is-cut' : ''].filter(Boolean).join(' ');
  const style = band === 'full' && view.kind === 'said' ? { fontSize: `${size}px`, lineHeight: `${Math.round(size * 1.2)}px` } : undefined;
  return (
    <section className={cls} aria-label="Partner strip" data-section="partner" data-flipped={flipped ? '' : undefined} data-view={view.kind}>
      <p ref={ref} className={flipped ? 'partner-strip__text is-flipped' : 'partner-strip__text'} style={style}>
        {text}
      </p>
    </section>
  );
}
