# Devpost text (paste-ready)

Last updated 2026-11-19. Numbers are copied from `packages/eval/RESULTS.md`; check them again on the day you submit.
Before pasting, run `node scripts/tm-lint.mjs docs/submission/DEVPOST.md`.

## About the project (paste everything between the lines)

---

## Inspiration

My grandmother's hands shake hard, from a medical condition she lives with. For years she kept a phone with
buttons: a key gives a shaking finger something to find, rest on and press. A pane of glass does not.

This year she had to give it up. Phones with buttons are getting hard to find, so she moved to a smartphone. Not
because it was easier, but because nothing else was left.

That made me see the old keypad differently. It was never just an old phone. It was a way of writing that asked very
little of your hands: 12 big keys, one press per letter, and the phone worked out the word. The phones moved on, but
the idea still works. So I brought it back, not for texting, but as a voice. Cats get nine lives; this keypad gets its
ninth.

## What it does

**Ninth Life is a free web app: type on 9 keys, hear your sentence.**

It keeps what made the keypad easy: 12 large keys, single taps, no swipes and no time limits. Then it supercharges the
keypad with what an old phone never could:

- **Whole sentences, not single words.** Press one key per letter, and a dictionary on your device ranks whole
  sentences for your keys: `4 6333 92837` becomes *I need water*. Press **Speak** to say it out loud, or **Show** it in
  big text and **Flip** it to face the person opposite.
- **AI that cannot put words in your mouth.** Turn on model ranking, and an AI model uses what the other
  person just said to pick the most likely sentence. It may only choose among words that match your keys. A proof
  check then turns every word back into keys, and drops any word that does not match before it can be spoken. Nothing
  is said until you press Speak.
- **Made for conversations.** Press **Listen** to turn the other person's speech into text. **Agree**, **Disagree**
  and **Ask** bring the fitting replies to the top.
- **Fewer presses.** It can finish a word early, fix any word in the sentence, and remember a name once you spell it.
- **Any way you type.** Touch, a real number pad, or one or two switches, on a phone, tablet or laptop, always on one
  screen.
- **Private by default.** It works offline after the first visit, with no account, no cookies and no analytics.
  Model ranking and Listen stay off until you turn them on.

Try it: https://night.statescu.net · Code: https://github.com/razvanstatescu/Ninth-Life

## How we built it

- **Spec first, with Kiro.** Every feature started as a spec with clear requirements, a design and tasks. The product
  rules lived in steering files: privacy, accessibility, plain words and the claims we must never make.
- **An engine that runs in your browser.** The keypad logic, the dictionary and the proof check run on your device, so
  typing works offline. The dictionary is built from open word lists and conversational text.
- **AI as an option, never a dependency.** One small server route asks the AI model to rank sentences. The proof check
  runs on the server and again in your browser. If the AI is slow or unavailable, the offline sentences stay.
- **Tested like it matters.** Property-based tests on the core logic, plus end-to-end checks of the layout at 24
  screen sizes, accessibility and performance.

## Challenges we ran into

- **AI alone cannot read keypad digits.** Given only the digits, the model put the right sentence first 3.5% of the
  time. Given only the words that fit, with every word checked after, it did so 95.5% of the time. That gap became
  the design.
- **A voice cannot wait.** Some AI replies took over 5 seconds. So the offline sentences show at once, and the AI only
  reorders them if it answers within 2 seconds.
- **Dictionaries have surprises.**
  - Word lists count every letter as a word, which once gave *H need water*.
  - Slurs turned up among the suggestions.

  Both are fixed, and neither fix makes a word impossible to type.
- **Easy for everyone, on every screen.** This was the hardest part of the design.
  - The sentence, the suggestions, the keypad and Speak all fit on one screen with nothing to scroll, from a small
    phone to a laptop, and no key is ever smaller than 72px.
  - Everything works with a single tap, a keyboard or one switch, with no swipes, no long presses and no time limits.
  - A word in the sentence is too small to tap reliably, so fixing a word opens a sheet with big buttons instead.
  - Plain words, high contrast, a typeface made for legibility and calm motion do the rest.

## Accomplishments that we're proud of

- **Measured, not promised.** On 866 test sentences, the right sentence comes first 85.6% of the time offline. With
  AI ranking it comes first 95.5% of the time, measured on a sample of 200.
- **Fewer presses.** With finish the word, a sentence takes 37.6% fewer presses than typing every letter.
- **Free, offline and private.** No account, no cookies and no analytics, and the AI never decides what is said.

The numbers come from a simulated typist, not from people
([results and method](https://github.com/razvanstatescu/Ninth-Life/blob/main/packages/eval/RESULTS.md)).

## What we learned

- **Trust in AI comes from what happens after it answers.** Constrain it, then check it.
- **Measure before you claim.** An idea that failed measurement, one press per word, never shipped.
- **Specs keep a fast project consistent.** Writing the requirements first made each change easy to check against
  them.

## What's next for Ninth Life

- Sessions with people who use AAC. It has not been tested with them yet.
- Testing on real phones and tablets.
- Romanian and Spanish.

*Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to
diagnose, treat or replace a clinical AAC assessment.*

---

## Built with (tags, in this order)

kiro, typescript, next.js, react, node.js, vercel, minimax, web-speech-api, serwist, indexeddb, pnpm, python, wordfreq,
vitest, fast-check, playwright, axe-core, lighthouse, zod, css, github-actions, mcp, context7
