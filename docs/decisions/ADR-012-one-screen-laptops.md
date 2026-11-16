# ADR-012: Laptops get one screen too, showing what the moment needs

- Status: accepted
- Date: 2026-11-16
- Decided by: the lead (laptop UX pass), to be confirmed by the product owner
- Spec: `web-ui` Requirement 40; code `packages/web/lib/layout.ts`, `packages/web/components/CommunicationScreen.tsx`,
  `packages/web/styles/app.css` (the `.app--wide` block)

## Context
Phones and tablets have been one screen since ADR-003; laptops kept the original scrolling page. Measured on
2026-11-16, the laptop page was 1,248-1,438px tall at every common window size (1024x768 to 1920x1080), so it always
scrolled. While typing at 1366x768 only 2 of the 5 sentences were on screen, and Check the words sat below the fold.
The page also showed everything all the time: an empty conversation card of 160-260px, five sentence-action buttons in
two styles even with no sentence, a dashed "Sentences appear here" box, the Check the words card with nothing in it, two
status pills, the switch-scanning card, a four-line keyboard paragraph and the footer. Every block carried the same
weight, so the product owner found it hard to know where to look.

The pattern research (Mobbin, web; the notes are in the laptop UX pass): chat and assistant apps (Plane, Attio, Remote,
Base44) keep one calm composer and show suggestions only when they apply; editors (Canva, Luma, Givingli) attach actions
to the thing they act on and only while it exists; Luma, Subframe, Mercury, Shopify, Plain and Telegram put keyboard
shortcuts behind a "?" or a menu, never on the page. AAC grids keep the message window, the prediction row and the keys
on one screen, because scrolling costs a switch user many presses.

## Options
1. Keep the page and trim it. Rejected: anything that grows (5 sentences, a word row, reply types, notes) scrolls again
   on a 768px-tall laptop, and a switch user cannot scroll.
2. Make the sentence list a scrolling box. Rejected as the main answer: rows cut in half at the bottom are what the
   product owner called "options not fully visible". Kept only as the fallback for an extreme window.
3. One screen, content by context, sentences in whole rows that fit. Chosen.

## Decision
- **Wide (960px or wider, fine pointer) is one screen** with no page scroll: header, the conversation's one row, the
  SpeakBar, the sentence's actions, Finish the word, reply types, then the sentences that fit in whole 56px rows, and
  More sentences (a popover with all of them) when more exist. A sentence chosen past them (ArrowDown, Alt+4) is added,
  so the chosen one is always on screen. Keys shrink with the window's height (never under 72px) before anything else.
- **Narrower laptop windows (under 960px) use the stack shell**, the phone and tablet layout, instead of the old
  one-column scrolling page. A half-screen window on a 1440px laptop (720px) is the common case.
- **By context.** No sentence: no sentence actions, no Sentences heading, no proof. A sentence: Fix a word, Spell this
  word, Save phrase, Check the words, one row of equal cells with short labels where the column is narrow. No
  conversation yet: no Whole conversation.
- **Speak's neighbours are its kind.** Clear (an icon, or Undo after a clear) and Show sit next to Speak in the SpeakBar,
  as in the phone action bar; Clear is no longer the first of six equal buttons.
- **The proof stays the claim, not a card.** The keys show under the sentence (they always did); every word with its keys
  is Check the words, a popover from the sentence's actions or More; the main screen keeps only what needs the person
  now: Add to my words and a model word that was dropped.
- **Less chrome.** One status pill (Status has every line); the keyboard paragraph is Keyboard shortcuts (a button under
  the keypad and a More row); the footer's links and the intended-purpose sentence move to More (Settings > About
  keeps the sentence too).

## Consequences
- Everything on a laptop is reachable without scrolling, by mouse, keyboard and switch; the scan rows keep their order
  (the sentence actions join the SpeakBar row only while there is a sentence).
- A very short window (under about 640px) shows one sentence and More; the list scrolls inside as a last resort.
- `layout = 'compact'` is no longer chosen; its code paths stay for the layout prop in tests.
- The newest "they said" line is one row on laptops and can be cut with an ellipsis; its full text is the row's title,
  name and one press away in Whole conversation.
