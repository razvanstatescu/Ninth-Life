# Improvement plan (draft for the product owner)

- Date: 2026-11-14. Status: **Part 1 and Part 2 built on 2026-11-16, without C1** (web-ui Requirements 30-35,
  ADR-009, ADR-010). The wow feature chosen is A, the partner strip. Parts 3 and 4 are not built.
- Window: feature freeze Nov 26, submission Dec 4 (`01-implementation-plan.md`). That is 9 working days.
- Evidence: `docs/research/improvement-plan/` holds the six research files this plan is built on:
  `engine.md` (code review and simulations), `app-ux.md` (walkthrough of the running app),
  `competitors.md`, `community.md` (62 Reddit threads and other sources, with links), `tech.md`
  (feasibility) and `hackathon.md` (rules and past winners). The draft was then reviewed by an independent
  critic, and this version includes the corrections.

## The short version

The app works and its core idea holds up: in the walkthrough the intended sentence came first for 28 of 35
everyday sentences. It feels simple for three reasons, and each has a fix:

1. **Typing costs too much.** Every letter is one press and the app never offers a word. A typical sentence
   costs about 26 presses. Word completion cuts that by 37.6% (measured with a simulated typist, RESULTS.md).
2. **Mistakes are expensive.** One wrong key in word 2 of 5 cost 40 presses instead of 23 (walkthrough).
3. **It helps you make a sentence, but not hold a conversation.** The loudest complaint from people who type
   to talk is timing: "Nobody tells you a conversation has a timer on it."

For the wow feature there are two candidates, and the choice is yours (Part 3):

- **The two-sided conversation** (recommended): the top of the screen turns to face the other person and says
  "Typing…", then shows the sentence as it is spoken. Best evidence, low risk, about 3 days.
- **The camera switch**: a raised eyebrow presses the keys. The most striking shot on video, but it serves
  fewer people, is the riskiest item here, and needs an exception to a privacy rule. About 5 days.

## Words used here

- **Measured:** the number is in `packages/eval/RESULTS.md`. Only these may be used in public text.
- **Simulation:** a script ran the real engine on the test sentences with an ideal user who always takes a
  correct suggestion (`docs/research/improvement-plan/sim/`). Real people will save less. Each simulated
  feature needs its own run in the evaluation (an "eval config") before any number is quoted.
- **Walkthrough:** presses counted while driving the real app in a browser.
- **Word-pair model:** the offline list of which word tends to follow which; it ranks the sentences today.
- **Switch scanning:** a highlight steps across the keys and one button (the switch) picks. Each move of the
  highlight is a **step**. With two switches, one moves the highlight and the other picks.
- **Effort:** S is up to 1 day, M is 2-3 days, L is 4-5 days, for one developer. Each item also needs a spec,
  tests on 24 screen sizes, and switch and accessibility checks; the schedule below allows for that.

## Part 1. Make a sentence cheaper to say

### T1. Word completion — the biggest gain (M)
- **Problem.** Keystroke savings are about 0% (measured). The engine can already list the words that start
  with the keys typed so far, but the app never offers them. Most of the paid text-to-speech apps we checked
  offer word completion (one does not).
- **Solution.** After the first key of a word, show up to 3 words that start with those keys, ranked by the
  word-pair model. One press takes the word and closes it. The three places never move and can be ignored.
  The key line shows the word's full keys, with the keys you did not press marked as filled in.
- **Measured (RESULTS.md, config B1c):** 37.6% fewer presses (0.62 presses per character instead of 1.00);
  the right sentence first 88.9% of the time (85.6% before); 35.2% fewer presses on the harder dialogue
  sentences. By switch, on the app's own scan layout, 1.88 steps per character instead of 2.59 (about 49 steps
  for an average sentence instead of 67). Measured with a simulated typist, not with people.
- **Risks.** Fewer presses is not always faster talking: reading suggestions costs attention (one scanning
  study found no gain in text rate). Phones under 548px tall have no suggestion row today (ADR-005), so the
  words have nowhere to show there yet. The public claim changes: decision 1.
- **Not now:** suggesting the next word before any key. It adds about 6 points and offers words your keys did
  not choose.

### T2. Fix any word, and "Did you mean" for a slip (M)
- **Problem.** Only the last word can be changed. A wrong key in an earlier word means deleting back through
  everything after it: 40 presses instead of 23 in one task, 32 instead of 16 in another (walkthrough). A
  slip that spells nothing shows digits and only offers to spell the word letter by letter.
- **Solution.** (a) "Fix a word": one press shows the sentence's words as a row of full-size buttons; pick
  one, then pick another reading or retype it. (b) When the keys spell no word, offer the words one key
  away: "Did you mean please?". Taking the offer changes that word's keys, and the changed key is marked.
- **Evidence (simulation).** When a slip spells nothing, the intended sentence is in the top 5 for 90-96% of
  cases. Seven in ten wrong-key slips still spell some word, which is why (a) is needed too.
- **Risks.** Nothing is ever fixed automatically. ADR-008 turned down word buttons once (the 56px size rule,
  and a third level for scanning); this reopens it with a row of full-size buttons and needs a new decision
  record. Decision 1 covers the claim.

### T3. Punctuation where you typed it, and capitals (M)
- **Problem.** Key 1 puts one mark at the end of the sentence. Pressed mid-sentence, the mark jumps to the
  end, so "Not now, later please" and "Yes. I will be there soon." cannot be typed (walkthrough). 19% of
  the test sentences have punctuation inside. Days, places and "TV" come out in lower case.
- **Solution.** Keep each mark on the word it was typed after; start a new sentence after . ? !; add a small
  table of words that are always capitalised. The proof check is unchanged (a mark is not a word).

### Bugs found on the way (S each)
- **Model ranking stops for the rest of the sentence once any word is fixed in place** by # or by choosing a
  sentence (`CommunicationScreen.tsx:272`, confirmed). With word completion it would almost never run. Fix
  it before T1 ships.
- Ranking requests are sent while a word is still half typed, which wastes the quota.
- The 17th key of a word and the 21st word are dropped without a message.
- A second tap on the same key within 150 ms is ignored on purpose (it steadies shaky presses), but nothing
  shows that it was ignored. Mark the ignored press.

## Part 2. Keep up with the conversation

Source: `community.md`. Being left behind by the conversation came up in about 14 of the sources read (the
researcher's count, not a statistic), more than any other need. Phone calls, the voice, and cost followed.

### C1. Keep typing while it speaks (S)
- **Problem.** People want to say a long reply one sentence at a time, typing the next while the first
  plays. One user describes that setup: "I can be typing my next sentence as it speaks the first one."
  ([thread](https://reddit.com/comments/1xk52vq)). Today you can type on after Speak, but a second Speak
  cuts off the first sentence if it is still playing, and nothing tells the partner to wait.
- **Solution.** Queue the second sentence instead of cutting the first. Add an optional soft sound when you
  start typing, which tells people to wait.
- **Rejected:** speaking automatically at the full stop. It would speak the top-ranked sentence unseen (the
  first sentence is right 86% of the time, measured) and it breaks two of our rules: only a Speak press
  speaks (requirement 12.5), and nothing is spoken automatically (accessibility rule 9).

### C2. Partner strip (M) — wow candidate A
- **Problem.** While the person types, the partner sees and hears nothing, so they talk on, guess or leave.
  "it makes me very anxious to keep the person waiting." ([thread](https://reddit.com/comments/1i46olu)).
- **Solution.** A setting, off by default. A band at the top of the screen is turned to face the person
  opposite. It shows "Typing…" while keys are pressed, then the sentence in big text when it is spoken. For a
  phone or tablet lying between two people; tall phones, tablets and laptops.
- **Risks.** Requirement 28.3 says the app shows no typing status unless the person chose it, so this stays
  opt-in. Showing the words before Speak would invite the partner to guess, so it shows only "Typing…".

### C3. Your own quick replies, cards and setup (S-M)
- **Problem.** The five quick replies are fixed. Phrases can only be added on the keypad or with a
  hand-written file ("Can you call my daughter" took 26 presses to save). People get ignored or hung up on
  before their first sentence is ready: "you'd better be prepared with a saved or copied phrase to 'say'
  first, or you'll probably get hung up on." ([thread](https://reddit.com/comments/1n6btwu)).
- **Solution.** Pin your own saved phrases as the quick replies. Add full-screen cards in Show mode ("I type
  to talk. Please wait for me."). Add starter opening lines for phone calls, without promising that the app
  works on calls. Let a helper paste names and phrases, one per line, with a normal keyboard. Remove the
  near-duplicates from the built-in phrases.

## Part 3. The wow feature: two candidates

| | A. Two-sided conversation (C2 + C1) | B. Camera switch |
|---|---|---|
| What the video shows | A phone on a table between two people. The top band faces the partner: "Typing…", then the sentence, large, as it is spoken. | Hands still. Eyebrows go up, a key lights, a sentence is spoken. |
| Who it helps | Everyone who uses the app with another person. The most-raised need in the community research. | People who use switch scanning and have no switch to hand. No thread we read asked for this. |
| Effort and risk | About 3 days. Low risk: text and layout only. | About 5 days. High risk: lighting, glasses and head angle cause missed or false presses; nothing was tested on a phone. Slow on video (about 50 seconds for 12 letters at the default scan speed), so the clip needs a short reply. |
| Rules | Opt-in (requirement 28.3). | Needs a recorded exception: the privacy rules forbid the browser's capture API, which the camera uses. About 7 MB, downloaded only on request. |
| What exists already | One dedicated communication device has a partner window. | Android, iPhones and Macs have built-in face switches for the whole screen. |

**Recommendation: build A as the headline.** It answers the best-evidenced problem, it is safe to finish, and
it gives the video a human moment that needs no explanation. Treat **B as a stretch with a gate**: one day
of testing on two phones and a laptop, then go or stop. If B passes, it becomes the closing shot. If the
video moment matters more to you than the risk, B can swap places with C3 and T3.

**How B would work**, if chosen: Settings > Access > "Camera switch". The front camera watches for a chosen
gesture (raised eyebrows, open mouth, a smile or a long blink). Each one counts as a switch press. A short
calibration sets the threshold, and a calm level bar shows what the camera sees. If no face is seen,
scanning pauses. The video never leaves the page and nothing is stored. It changes how a press arrives, not
what is said, so the proof check is untouched.

**Free, and worth doing either way (S):** a USB or Bluetooth number pad already works as the keypad. Put it
in the help and in the video: it is the physical "old phone keypad" moment for the Resurrection category.

## Part 4. The first minute and daily use (S each)

- **D1. Teach the method.** Nothing says "one press per letter". Typing "hello" the old multi-tap way gives
  a row of digits and a dead end. Add one first-run card with a practice step ("Try: 4 4 is hi") and a hint
  when the keys look like multi-tap.
- **D2. Keep the screen awake** while the app is open. Today it can sleep while the partner reads.
- **D3. Say that it works offline and can be installed**, with the steps for each platform.
- **D4. Show mode:** fit the text to the screen, and add a setting "Speak also shows big text".
- Ten smaller polish items are listed at the end of `app-ux.md`.

## Looked at and left out

| Idea | Why not, or why later |
|---|---|
| Initials mode (one key per word) | Measured: the right sentence is reachable for about 3% of test sentences. Every variant loses to word completion. |
| A model that writes or completes whole sentences | The model would choose the words; it breaks the proof check. |
| Speaking automatically at the full stop | Breaks two rules (see C1). |
| Typed shortcuts that expand to a phrase ("ctrn") | Users ask for it, but a pinned phrase is one press and keeps "every word matches its keys" simple. Revisit after C3. |
| Parking a half-typed sentence | Asked for once. Later. |
| A receipt of keys under each spoken word | The sentence card already shows each word's keys. Make sure the video shows it. |
| A natural voice that runs on the device (about 30 MB) | The voice is the third most-raised complaint, so this is the best candidate after the hackathon. Now: speed on phones is unknown, and the browser builds include data under a licence (GPL-3.0) that needs a decision. |
| Remembering what you said, to rank it higher | Small gain in a realistic test (86.4% from 85.6%, simulation); "Say again" already repeats a sentence. Later, as an opt-in kept on the device. |
| Numbers ("at 3 pm") | Real gap (walkthrough), 2-3 days. First item after the freeze list. |
| Voice cloning or cloud voices | Sends a voice recording to a third party. A web page cannot use the phone's own personal voice. |
| A language model on the device | Does not run on phones today. |
| Speaking into phone calls | A web page cannot do it. Opening lines only (C3). |
| A second screen on the partner's phone | Needs a relay server or two QR scans. The partner strip covers face to face. |
| Always-on typo correction | Costs 9 points of accuracy on clean typing (simulation) and hides what was pressed. |
| Other languages before judging ends | The dictionary drops accents, so some words would be spoken wrongly; no conversation data for Romanian. |

## Decisions for the product owner

1. **The claim, once words can be completed or corrected.** Today: "Every spoken word matches the keys you
   pressed." With T1 a word is typed in part and picked; with T2 a key can be changed by accepting an offer.
   Proposed: "Every spoken word matches the keys on screen, and nothing gets there without your press."
   The website, the FAQ, the About page and `product.md` change together (about nine files).
2. **Which wow:** A (two-sided conversation), B (camera switch), or A with B as a gated stretch?
3. **Partner strip:** opt-in, showing only "Typing…" until Speak?
4. **If B:** accept a privacy exception for the camera (video stays on the device), a 7 MB optional
   download, and a camera permission, each asked for only on a press?
5. **Fix a word (T2a):** reopen the word-button decision in ADR-008 with a row of full-size buttons?
6. **Short phones (under 548px tall):** ship word completion without them at first?

## Order of work

There are 9 working days to the freeze, and the plan's existing commitments also fall in them (model choice,
the accessibility pass, the kill-switch drill, real-device tests). Sizes below include the spec, the tests
and the evaluation run for each item.

| Order | Item | Days | Notes |
|---|---|---|---|
| 1 | Ranking bug | 0.5 | Before T1 |
| 2 | T1 word completion, with its evaluation run and decision 1's copy | 4 | The measured number goes into RESULTS.md |
| 3 | T2 fix any word and "Did you mean" | 3.5 | |
| 4 | D1-D3 first-run card, screen awake, offline and install | 2 | |
| 5 | C2 partner strip and C1 keep typing while it speaks | 3.5 | Wow A |
| 6 | T3 punctuation and capitals | 2.5 | |
| 7 | C3 quick replies, cards, setup | 2 | |
| 8 | B camera switch | 1 + 5 | Day 1 is the go or stop test |

- **One developer:** items 1 to 3, and the first-run card from item 4. For the wow, swap T2(b) for item 5.
- **Two developers:** items 1 to 6, with 7 if things go well.
- **Three developers, or B chosen as the wow:** add item 8, and move C3 after the freeze.
- After the freeze (Nov 27 to Dec 3): re-run the evaluation, test on real devices, film, write up.

## What the video can show

1. Before and after: the same sentence, about 26 presses and then about 16, with a press counter on screen
   (using the measured number once the evaluation has it).
2. A slip fixed with one press, the changed key marked.
3. The phone between two people: "Typing…" facing the partner, then the sentence, large and spoken.
4. A number pad as the keypad. If B is built: the eyebrow shot to close.

## After the hackathon

Numbers; a natural voice on the device; opt-in learning kept on the device; captions for Listen that run on
the device; a display form for words with accents, which other languages need first. A test with people who
use AAC (`docs/validation/`) matters more than any feature in this plan.
