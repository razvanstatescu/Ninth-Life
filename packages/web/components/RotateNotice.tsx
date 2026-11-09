'use client';
import { useEffect } from 'react';
import { Brand } from './AppHeader';

/**
 * Phones are portrait only (product decision, ADR-003). A phone held sideways sees this instead of
 * the keypad. It is announced once (role="alert"), uses no motion, and the screen comes back as soon
 * as the phone is upright. Where the browser allows it (an installed Android app, or fullscreen) the
 * app also asks for a portrait lock, so most installed phones never see this.
 */
export function RotateNotice() {
  return (
    <main className="rotate" role="alert" aria-live="assertive">
      <Brand />
      <svg className="rotate__icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <rect x="20" y="6" width="24" height="44" rx="5" />
        <path d="M28 44h8" />
        <path d="M50 54a22 22 0 0 1-30 4" />
        <path d="M18 52l2 6 6-2" />
      </svg>
      <div className="rotate__words">
        <h1 className="rotate__title">Turn your phone upright</h1>
        <p className="rotate__text">On a phone, Ninth Life works upright, so the keys stay where your thumb expects them. Your sentence is kept.</p>
      </div>
    </main>
  );
}

/** Ask for a portrait lock on phones where the browser allows it (installed app or fullscreen). */
export function usePortraitLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof screen === 'undefined' || Math.min(screen.width, screen.height) >= 600) return;
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    o?.lock?.('portrait').catch(() => undefined);
  }, [enabled]);
}
