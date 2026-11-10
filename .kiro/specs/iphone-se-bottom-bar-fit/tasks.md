# Tasks: iPhone SE with the Bottom tab bar fits one screen

- [x] 1. Reproduce: add 375 x 495 and 402 x 654 (Safari, Bottom tab bar) to `test/e2e/responsive.mjs`;
      375 x 495 scrolls 53px (Req 25.1)
- [x] 2. Bugfix spec and requirement text: `bugfix.md`, `design.md`; `web-ui` Req 25.1, 24.6 edited, 24.9 added
- [x] 3. `STACK_SHORT_QUERY` and the `short` rung in `stackSuggestionRows`; `CommunicationScreen` drops the
      suggestion section and offer row; Menu > This sentence > Sentences (Req 24.9, 25.1)
- [x] 4. Tests: `test/layout.test.ts` (24.9), `test/phone.test.tsx` (24.9, 24.8), `test/mobile.test.tsx` (25.1),
      `test/e2e/responsive.mjs` (no suggestion row under 548px, no page scroll) (Req 24.9, 25.1)
- [x] 5. Re-measure: `responsive.mjs` on Chromium and WebKit, then `axe.mjs`, `keyboard.mjs`, `switch.mjs` (Req 25.1)
- [x] 6. ADR-005; sizes counted as 24 in the docs (Req 25.1)
