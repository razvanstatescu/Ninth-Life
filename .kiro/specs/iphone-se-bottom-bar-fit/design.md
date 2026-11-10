# Design: iPhone SE with the Bottom tab bar fits one screen

Requirements: `web-ui` Req 25.1, 24.6, 24.9 (see `bugfix.md`). Decision: ADR-005.

1. `lib/layout.ts`: `STACK_SHORT_QUERY = '(max-height: 547px)'`, one less than 548px, the smallest
   visible height measured to fit one suggestion row with 72px keys. It is an exception query
   (`max-height`), so it is false on the server and in jsdom, and existing phone tests keep their row.
2. `stackSuggestionRows({ r2, r3, r4, short })` returns `0` first when `short`; `short` is optional.
3. `components/CommunicationScreen.tsx` passes `short: useMediaQuery(STACK_SHORT_QUERY)` (tech rule 5:
   server snapshot `false`). With 0 rows (`noSugRow`): no Spell or Add offer row, `sug` is empty with
   no More, the scan row for suggestions has 0 cells (skipped), and the `cands` section is not rendered,
   so the keypad area (`flex: 1 1 0`) takes the room. The split shell is untouched.
4. `components/MenuSheet.tsx`: an optional `sentence.onSentences`; when set, a "Sentences" button leads
   the "This sentence" group and opens the existing "Sentences for your keys" sheet.
5. No CSS change: the freed 64px (row and gap) leaves 11px spare at 495px.
