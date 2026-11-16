'use client';
/**
 * Back closes the open surface (web-ui Req 36.3, ADR-011): the browser's Back button, Android's Back gesture
 * or key, and a mouse's back button close the sheet, popover or Show mode on top instead of leaving the app
 * (and the sentence) behind.
 *
 * One history entry is added when a surface opens (never on first load), and only one: a surface that replaces
 * another (Menu > Settings) keeps it. Back takes the entry off and the surface closes; closing any other way
 * (Close, Done, Escape, the backdrop) takes the entry off with history.back(), and the popstate that follows is
 * ignored. The entry keeps the page's URL, so nothing is navigated, stored or sent.
 */
import { useEffect, useRef } from 'react';

const MARK = 'nlSurface';

export function useBackCloses(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  const s = useRef({ pushed: false, selfBacks: 0, wantPush: false });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const st = s.current;
    if (open && !st.pushed) {
      // A history.back() of ours is still on its way: add the entry once it has landed.
      if (st.selfBacks > 0) st.wantPush = true;
      else {
        window.history.pushState({ [MARK]: true }, '');
        st.pushed = true;
      }
    } else if (!open) {
      st.wantPush = false;
      if (st.pushed) {
        st.pushed = false;
        if (window.history.state?.[MARK]) {
          st.selfBacks += 1;
          window.history.back();
        }
      }
    }
  }, [open]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const st = s.current;
    const onPop = () => {
      if (st.selfBacks > 0) {
        st.selfBacks -= 1;
        if (st.selfBacks === 0 && st.wantPush) {
          st.wantPush = false;
          window.history.pushState({ [MARK]: true }, '');
          st.pushed = true;
        }
        return;
      }
      if (st.pushed) {
        st.pushed = false;
        closeRef.current();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}
