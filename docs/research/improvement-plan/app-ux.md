# App UX walkthrough: findings (app-ux, 2026-11-14)

Playwright on http://localhost:3410/app (dev, no model ranking): phone 390x844 touch, tablet 820x1180, laptop 1280x800; speech
stubbed. Screenshot names in brackets below refer to the walkthrough's own captures, which are not kept in the repository. Press counts include Speak.

## What works (keep it)

The offline decoder is very good on everyday sentences: 28 of 35 test sentences were rank 1, the other 7 rank 2-3 (one tap; 20
of them chosen to include good/home ambiguities). Quick replies: 1 tap. Say again and Show + Flip: 2 taps. A name added
once ("Mihai") is rank 1 next time. One switch: "I need water" in 27 presses, 43.7 s at 1.2 s a step; no dead end found.

## The 12 tasks (phone, touch)

| Task | Presses | Rank 1? | Stumble / fix |
|---|---|---|---|
| I need water | 13 | yes | none (`02-water-step12.png`) |
| Can you call my daughter | 25 | yes | none |
| Not now, later please | 21 | yes, but spoken as "Not now later please" | **comma impossible**: workaround is two Speaks, 23 presses |
| What time is the appointment? | 30 | yes | none |
| My name is Mihai | 22 first time | digits "64424" | Spell row (1) + 3 letter picks + Add to my words (1) (`04b-mihai-*.png`). Fine |
| Meet me at 3 pm | 21 | "Meet me at three **so**" | **no digits**: spell "three", pick rank 3 for "pm" |
| No, the other one | 17 | yes, no comma | as above |
| Thank you so much | 18 | yes | none |
| I'm tired, can we go home | 24 | yes, "I'm" automatic | comma impossible |
| Two sentences: "Yes. I will be there soon." | 23 | n/a | **pressing 1 after "Yes" moved the full stop to the end**: "Yes I will be there soon." (`05b-two-sentences.png`). Workaround: quick reply "Yes." and then a second sentence |
| Wrong key in word 2 of 5, seen at word 4 | **40** vs 23 | n/a | Back 5 times (the open word one key at a time, then whole words) and retype 15 keys. A slip gives a wrong real word ("call" with 2266 became "camo") or digits: one extra key in "please" (7532573) showed digits and only "Spell 7532573" (`06b-wrong-key.png`) |
| Change word 1 after typing 4 words ("Mum…" to "Dad…") | **32** vs 16 | n/a | no way to reach word 1: Next (#) cycles only the last word, so Clear and retype |

Other misses: "I am too tired" gave rank 1 "I am too **three**", and "Are you home" gave rank 1 "Are you **good**" (home was
rank 3) (`19-replytype-disagree.png`).

## Ranked problems and proposals

Good for a 3-minute demo: 5 (partner strip, the wow), 1 (fix a word / "Did you mean"), 3 (hear the comma), 4 ("at 3 pm"), 2 (5 s).

### 1. One wrong key loses the word, and earlier words cannot be reached (M) [demo: yes]
**Problem.** The keys must be exact. An extra key or a missed key turns a known word into digits, or into the wrong real word.
The only fix offered is a Spell sheet for the wrong keys, and the only way to reach an earlier word is Back through everything
typed after it: 17 extra presses in task 11 and 16 in task 12. The tremor setting (`acceptDelayMs`) shows slips are expected input.
**Solution.** (a) **Tap a word to fix it.** Each word in the sentence card (`SpeakBar.tsx`) is a button. Pressing one fills the
suggestion area (`PhoneSuggestions.tsx`; the laptop list) with that word's other readings (`readings()` in `lib/sentence.ts`)
plus "Retype this word". The composer already pins a word at any position (`{type:'pin', index}` in `lib/composer.ts`);
retyping needs a new `recode` action. (b) **Keys one off.** When a word's keys match no word, offer the dictionary words whose
keys differ by one key (one inserted, dropped or changed): "Did you mean **please** (753273)?". Choosing one replaces that
slot's keys with the word's keys. Those keys stay visible in the card's key line, so the proof check still holds: every spoken
word matches the keys on screen. Add a `nearCodes(code, lexicon)` function to `packages/core` (lexicon lookup, about 150 probes
for a 7-key word).
**Why.** The two most expensive tasks I measured drop to 2-4 presses.
**Risks.** (b) changes keys the person typed. It must only ever be an offer they press, and the card must show the old and new
keys. Scanning needs the word row as a scan row. Never correct anything automatically.

### 2. Nothing on the screen teaches the method; the old multi-tap habit is a dead end (S) [demo: yes, 5 s]
**Problem.** A first-time phone user sees "Press a key to start" and twelve keys (`01-first-phone.png`). Nothing says "one press
per letter", what Next (#) or 1 does, or what "On device" means. On laptops the hint lists keyboard keys, not the method. Anyone
who used an old phone may multi-tap. "hello" typed as 44 33 555 555 666 gives "4433555555666" and a "Spell 4433555555666" button
that leads to a 13-letter spell sheet (`08-multitap-hello.png`). There is no practice step and no install hint.
**Solution.** A first-run card in the empty card and suggestion area: "Press each key once per letter: 4 6 6 3 is good or
home", "0 ends a word, # shows other words", "Pick a sentence, then Speak", a "Try: type hi (4 4)" step and "Got it" (saved
as a setting only after that press, `lib/settings.ts`); Menu > "How to type" brings it back.
Add a multi-tap hint: when a word with no match has runs of the same key, the Spell row becomes "One press per letter. Back to
retype" (in `spellTarget` in `lib/sentence.ts`).
**Why.** If the method is not understood in the first minute, nothing else matters.
**Risks.** Keep it to one dismissible card. No modal tour, no animation.

### 3. Punctuation goes to the end of the sentence, so there are no commas and no second sentence (M) [demo: yes, audible]
**Problem.** Key 1 sets one mark for the whole sentence. Pressed after a word and before more words, the mark silently jumps to
the end (task 10). TTS then runs "Not now later please" together. The app's own quick phrases contain commas ("No, thank
you." in `data/packs/core-en.json`), but typed sentences cannot have them.
**Solution.** Store punctuation per word (`Slot.punct` in `lib/composer.ts`). Key 1 cycles the mark after the last word: the
open word, or the last one closed. Typing on keeps the mark where it was. `formatSentence` in `packages/core/src/format.ts`
capitalises after . ? ! and the decoder treats a full stop as a sentence boundary for the word-pair model. Back removes the
mark first, as it does now.
**Why.** 3 of my 12 tasks needed it; speech engines pause at commas.
**Risks.** Decoder context across a boundary. The proof check is not affected, because punctuation is not a word.

### 4. No numbers (M) [demo: yes, "Meet me at 3 pm"]
**Problem.** Times, room numbers, phone numbers and "call 911" cannot be typed. "Meet me at 3 pm" needs "three" spelled out and
a pick to reach "pm".
**Solution.** A "123" toggle in the action bar row (phone: Menu > Numbers; laptop: next to Spell). While it is on, keys 0-9
type their digit as one number word. Key 1 still cycles punctuation. Toggling it off, or pressing Space twice, closes the
number. A number word matches its keys by definition, so the proof chip shows it as matched. It is spoken as written (TTS says
"3").
**Why.** "What time is the appointment?" invites "At 3".
**Risks.** Key 0 doubles as digit and Space here, so the mode needs a clear on-screen state.

### 5. The partner cannot see that the person is typing (M; wow) [demo: yes, best shot]
**Problem.** While the person types, the partner sees nothing and hears nothing. Show is a separate, later press. "Hold on." is
the only signal. Research we already have: partners should pause and wait, and finishing someone's sentence is "intensely
dismissive" (`docs/research/mobile-aac-evidence.md` §5). TD Talk's Partner Window shows the typed text to the partner (E27).
On tablets a band of about 200 px between the suggestions and the keypad is empty (`01-first-tablet.png`).
**Solution.** A **Partner strip**: a band at the top of the screen, turned 180° for the person opposite. It shows "Typing…"
while keys are pressed, then the spoken sentence in big text after Speak, until the next key. Setting `partnerView: off |
typing | words`. "words" shows the rank-1 sentence live, and only when the person turns it on. New component `PartnerStrip.tsx`
reuses the `.show__message.is-flipped` styles from `ShowMode.tsx`. `lib/layout.ts` gives it a row on tablets, laptops and
phones taller than about 760 px, and turns it off on short phones.
**Why.** Fills the silence without speaking for the person; works with the device flat on a table.
**Risks.** Live words invite guessing, so the default is "typing". Phone height. Static text, no animation.

### 6. Setting up once is painful, and phrases are a flat list (S-M)
**Problem.** Names can be typed with a normal keyboard (My words > Add a word). Saved phrases can only be made on the 9-key pad
(24 keys + Menu + Save for "Can you call my daughter"), or with a hand-written JSON pack file. Phrases is one list: saved
phrases, then 198 pack phrases with near-duplicates ("Thank you." / "Thanks.", "I am hungry." / "I'm hungry.")
(`21-phrases-one.png`). The quick replies are a fixed five; Settings can only turn them on or off.
**Solution.** In My words, add "Add names and phrases": two text areas, one item per line, for a helper with a normal keyboard.
They build an in-memory pack and go through the existing import preview (`lib/vocabPack.ts`, "Add N words and M phrases"). Add
**Pin to quick replies** on saved phrases (up to 5, replacing the fixed list in `lib/replies.ts` from a setting). Remove the
duplicates from `core-en.json`.
**Why.** A helper sets it up in two minutes instead of writing JSON.
**Risks.** Typed phrases bypass the keys, as saved phrases already do; they are the person's own choice, made with a press.

### 7. Daily-use basics (S each) [demo: partly]
**Problem.** No Screen Wake Lock (grep: none): the screen can sleep while the partner reads Show mode. Nothing says the
app works offline or can be installed (our research's "push installing" item is not done). Speaking and showing are two separate presses, yet 6 of 12 users in the
interview study show text where speech cannot be heard (E30). Show mode uses `clamp(48px, 8vw, 112px)`, so "Tea please" fills
about a quarter of a phone screen (`15-show.png`).
**Solution.** Request `navigator.wakeLock` while the app is visible (re-request on `visibilitychange`). Add a Menu card: "Ready
offline · Add to Home Screen", with `beforeinstallprompt` on Chrome and the steps for iOS, and a status line "Saved for
offline use" once the precache is done. Add a setting "Speak also shows big text". Fit the Show text to the screen (largest
size that fits).
**Risks.** Battery use from the wake lock: only while the app is visible.

## Considered and rejected

- **Speak each word as you type**: speaks readings nobody chose; breaks "nothing spoken without a press".
- **Emergency/alarm button**: calm-UI rule and medical-claim risk; a pinned "Excuse me" quick reply (6) covers attention.
- **Volume control**: TTS volume cannot exceed device volume; suggest a speaker in Help.
- **Store today's history or the draft**: privacy posture; memory thread, Say again and Save phrase cover repeats.
- **Partner's phone as a second screen**: needs a relay server and pairing; not offline.
- **Auto-accept multi-tap**: clashes with the method and tremor double presses; a hint is enough.
- **Share/copy a sentence**: exists (Copy, Copy all in the Conversation sheet).
- **Phrase category boards**: large UI; pinning and text setup give most of the value.

## Small polish items

1. Phone header: They said is an unlabelled icon (`01-first-phone.png`); label it.
2. The header bubble cuts their line to "Shall we g…" while replying (`19-replytype-disagree.png`); allow 2 lines.
3. Suggestion rows show junk ("I'd is good now", "Of uno"); highlight the word that differs.
4. Same-key presses within 150 ms are silently dropped (fast taps turned "good" into "463"); mark an ignored press on the key line.
5. Spell sheet starts at first letters ("Mggag"); start at the most likely letters.
6. After a sheet closes, an ember focus ring on They said sits beside the ember Speak (`41-typing-tablet.png`).
7. "On device" pill is unexplained.
8. Reply types take a phone row after every They said, yet "Disagree" did not reorder "I am too tired" offline; show them only when they change the order.
9. Tablet portrait: keypad about 530 px wide in 820 px, with an empty band above (`01-first-tablet.png`).
10. Show mode under scanning stops after 3 passes of its one row; a press is needed before Done.
