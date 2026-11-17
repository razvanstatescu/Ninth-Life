# Content: marketing-site (final page copy for `/`)

The words the landing page shows, section by section. Requirements: `requirements.md` (MS-4, MS-5).
Layout and visuals: `design.md`. Source drafts: `docs/research/marketing-site/structure-content.md`,
the old `/welcome` page and `/about`. Decisions: `.agents/tasks/marketing-landing/decisions.md` (D1-D15).

Rules for this file:

- Copy goes into the components exactly as written here. A change to the words is a change to this file
  first, then to the code, in the same change.
- `{curly}` values are filled at build time, never typed by hand:
  - `{provider.service}`, `{provider.company}`, `{provider.retention}` from `providerCopy()` in
    `packages/web/lib/rankingProvider.ts`;
  - `{results.*}` from `getResults()` in `packages/web/components/site/site-data.ts` (reads
    `packages/eval/RESULTS.json` and `RESULTS.llm.json`);
  - `{NOT_A_MEDICAL_DEVICE}` is the constant in `packages/web/components/Footer.tsx`, never retyped;
  - `{REPO_URL}`, `{RESULTS_URL}`, `{METHOD_URL}`, `{ISSUES_URL}`, `{PRIVACY_RULES_URL}`, `{RANKING_REQUEST_URL}`
    from `site-data.ts`;
  - `{rankingSentText()}` from `lib/rankingProvider.ts` (what model ranking sends, one list everywhere).
- Sentence case, plain verbs, digits for numbers, no exclamation marks (web-ui Req 14.1).
- Checked against `.kiro/steering/product.md` (banned claims, honest limits) and
  `.kiro/steering/trademarks.md`; `node scripts/tm-lint.mjs` is clean on this file.

## Round 5 (2026-11-17): one place for each fact

The product owner: "the website feels quite long and messy … see if the same info doesn't get explained in multiple
sections across the website and consolidate that." Each fact is now said once, where a reader looks for it:

- Page order (MS-3.1): How, Proof, Conversation, Access, Privacy, Results, Good to know, Questions, the close. The
  product comes first; the evidence (Results) and its limits (Good to know) sit together. The bands still alternate.
- The limits live in Good to know only: the caveats under How ("You need to be able to spell …"), in Access (the
  simulator line) and the last sentence of the Results caveat (people who use AAC) are gone; Good to know's Model
  ranking row is gone (Privacy says what ranking sends).
- Privacy lists what ranking sends once: the three door cards and the note card become one card of rows (§6).
- Questions keeps the five no section answers (§9).
- The sticky bar carries "Open the app" on every screen, so the four mid-page "Open the app" rows (after Proof,
  Access, Privacy and Results) are gone. The hero and the close keep their ember buttons.
- Up to date: laptops fit one screen too (web-ui Req 40, ADR-012), and the They said card names the quick replies and
  the reply types (web-ui Req 28, 29), which the page did not mention.

Removed copy is written without bold in the notes below, so MS-4.1 does not look for it on the page.

## Page metadata

| Field | Text |
|---|---|
| `<title>` | Ninth Life: type on 9 keys, hear your sentence |
| `description` | Free web app for typing to talk. Press one key per letter and hear the sentence you meant. Every spoken word matches the keys on screen. Works offline. |
| `og:title` | Ninth Life: the old phone keypad, back as a way to talk |
| `og:description` | Press one key per letter and hear the sentence you meant. Every spoken word matches the keys on screen. Free, works offline, runs in your browser. |
| `og:type`, `og:site_name`, `og:locale` | `website`, `Ninth Life`, `en_US` |
| `twitter:card` | `summary_large_image` when the social card is emitted (the origin is known), else `summary` (same title and description) |

No `keywords` tag.

Round 3 (2026-11-12; MS-3.6 to MS-3.9). The definition, used word for word in the layout
`description`, `public/manifest.webmanifest`, the JSON-LD, `/llms.txt` and the README's first paragraph
(`SITE_DEFINITION` in `components/site/seo.ts`):

> Ninth Life brings back 9-key predictive text as a free web app for typing to talk. Press one key per letter on keys 2 to 9 and hear the sentence you meant: every spoken word matches the keys on screen, and nothing gets there without your press.

| Page | `<title>` | `description` |
|---|---|---|
| `/about` | About Ninth Life | How Ninth Life checks every spoken word against your keys, what model ranking sends and to whom, and what Ninth Life is not. |
| `/app` | Ninth Life app: type on 9 keys | The Ninth Life keypad: press one key per letter on keys 2 to 9 and hear the sentence you meant. Free, no account, works offline after the first visit. |
| 404 | Ninth Life: page not found | There is no page at this address. Open the Ninth Life app, or go to the home page. |

`/about` and `/app` share the Open Graph base (`website`, `Ninth Life`, `en_US`) with their own title and description.
With a known origin (`SITE_URL`, else `VERCEL_PROJECT_PRODUCTION_URL`) each page also gets its own canonical and
`og:url`, and every page the social card `public/social-card.png` (1200x630) with alt text **Ninth Life: a 9-key keypad
and the sentence I need water**. Without an origin none of these absolute URLs is emitted.

The social card shows the icon, **Ninth Life**, **Type on 9 keys. Hear your sentence.**, **Free web app. Works
offline. No account.** and a drawn keypad under the sentence **I need water** with its keys `4 6333 92837`.

JSON-LD feature list (`FEATURE_LIST` in `components/site/structured-data.ts`): **One press per letter on keys 2 to 9**;
**Every spoken word matches the keys on screen**; **Works offline after the first visit**; **Type with a keyboard, by
touch, or with one or two switches**.

404 page: `h1` **Page not found**; **There is no page at this address. It may have moved, or the link may be
mistyped.**; buttons **Open the app** (to `/app`, primary) and **Go to the home page** (to `/`).
R3-P5 (2026-11-13): the 404 page is in the site look, Night in both themes: the site bar, the `h1` at the
section-title scale with the line as its lead, the two buttons as a `.site-cta` row of 64px buttons, and the site
footer with the intended-purpose statement. Its title follows the site's "Ninth Life: …" pattern and it has its own
description (it used to inherit the definition); Next still answers 404 with `noindex`.

## 0. Skip link and header

- Skip link: **Skip to content** (to `#main`)
- Brand link (to `#top`): favicon image (`alt=""`) and **Ninth Life**
- Nav, `aria-label="Main"`: **How it works** (`#how`) · **Proof check** (`#proof`) · **Ways to type** (`#access`) · **Privacy** (`#privacy`) · **Questions** (`#faq`)
- Header button (secondary): **Open the app** (to `/app`). Round 5: the bar is fixed at the top of the window on every
  website page (`.site-barline`, Night in both themes, a translucent night fill), so this button is always in view.

## 1. Hero (`#top`)

Round 3 (2026-11-12): the `h1` is the promise and matches the `<title>`; "Ninth Life" is the
bar's brand and the small brand line above the `h1`; the lead starts with `product.md`'s one-line answer (what it is,
for what, at what cost); "See how it works" is a link, so the demo reaches the first phone screen; the demo's chips
sit under the sentence they check, the caption is visible and the keypad can be tried (W4).

- Brand line (with the icon `/icons/icon.svg`, `alt=""`): **Ninth Life** (R3-P8, 2026-11-13: not shown under 600px,
  where the bar right above already shows the brand; under 352px, where the bar shows the icon only, the line stays
  as the name alone)
- `h1`: **Type on 9 keys. Hear your sentence.**
- Lead: **A free web app for typing to talk. Press one key per letter and hear the sentence you meant.**
- Primary button (the ember fill of this viewport): **Open the app** (to `/app`)
- Link beside it: **See how it works** (to `#how`)
- Note, under them: **Free. Works offline. No account.**

Round 4 (2026-11-13): the demo is a small app screen with no caption (the product owner: "too crowded …
find a way to remove the text from there"). The words "Checked against the keys. How the check works" leave the hero
(the proof check section and the bar's "Proof check" explain the check; the ✓ chips stay); the visible caption becomes
the keypad's description for screen readers, word for word; the buttons' words become their names, shown on hover and
keyboard focus. One short line stays visible, the invitation in the status line. "Play the example again" is gone: the
button's name is **Play the example** before and after a play.

Keypad demo (`KeypadDemo`), top to bottom:

- Sentence card: the decoder's sentence for the keys so far as proof chips, one per word, each word over its keys
  (the `ProofChip` state text is read: "water, matches your keys. Keys 9 2 8 3 7."; finished frame: the build-time
  result for `4 6333 92837`, "I need water" with the shipped dictionary). Chip list `aria-label`: **Proof check**
- Status line, one line under the card: in the example **Press the keys to try it.** (shown once the keys work, so a
  page without JavaScript promises nothing).
- The keypad: 12 real buttons in a group labelled **Keypad, try it**, each named as the app names its key
  ("4 GHI, G H I", "Back", "0 Space", "Next word"). Its description (for screen readers): **One press per letter:
  {keys} types “{sentence}”. 0 is space. Press the keys to try your own words. Your keyboard works too.** (`{keys}`
  read as "4, 0, 6 3 3 3, 0, 9 2 8 3 7"; `{sentence}` the finished frame, "I need water").
- Toolbar, three icon buttons whose names show as tooltips: **Play the example** (replay icon; **Stop** with the stop
  icon while it plays), **Hear it** (speaker icon, only where the browser has speech; while the example plays, or
  while the visitor's keys are not a whole sentence yet, it stays focusable, is marked unavailable (`aria-disabled`)
  and ignores presses), **Clear** (x icon; marked unavailable while there is nothing to clear).
- Live region after a play the person started: **Typed {codes}. Ninth Life shows: {sentence}.**

Try it (W4). After the visitor's first key press the live region (polite) reads the result line once typing pauses.
The result is only what the app's offline decoder returns: sentences whose every word matches the keys, best first,
at most 3. It never says the page understood anything.

- Keys and their sentences (live region): **Keys {codes} match: {sentences}.** (for example `Keys 4663 match:
  “Good”, “Home”, “Gone”.`) R3-P4 (2026-11-13): `{sentences}` are the matches for the keys alone, so after
  # the list stays whole and the sentence on show is marked when it is not the first: `Keys 4663 match: “Good”, “Home”
  (shown), “Gone”.`; a reading # reached past the top three is added, marked, at the end. When the last match ends in
  punctuation from key 1 the line adds no second full stop (`… “Gone.”`).
- Status line while trying (round 4): the readings # gives next for the last word, at most 2, in the order # gives
  them, as the sentence would write them: **Next: {readings}** (for example `Next: Home, Gone` after 4663); nothing
  when the last word has no other reading.
- Nothing typed (after Clear), in the card and the live region: **Press a key to start.** With a mouse or trackpad the
  card adds the app's own words: **Your keyboard works too.**
- Key 1 before any letter (R3-P8), in the card and the live region: **Key 1 adds punctuation at the end of the
  sentence. Now type a word with keys 2 to 9.**
- Key 0 or # before any letter (R3-P8), in the card and the live region: **Keys 2 to 9 type the letters. Start with
  those.**
- Chips (R3-P8): each chip writes its word as the sentence does, from the app's own tokens (`buildSentence` →
  `formatSentence`, as the app's proof panel labels its chips): **I**, not "i", and a capital first word. In try
  mode only the last 3 words get a chip, in one row that shows its end (R3-P1); Hear it speaks them all.
- While the dictionary loads (status line and live region): **Loading the offline dictionary.**
- An unfinished or unknown word: live region **No sentence matches these keys yet. Keep typing, or press Back.**;
  status line **No sentence matches yet.**
- The dictionary could not load: live region **The dictionary did not load, so only the keys show. The app has the
  whole keypad.**; status line **The dictionary did not load.**

## 2. How it works (`#how`)

Round 4 (2026-11-13): three steps in a row, Press, Pick and Speak, each a picture cut from the
app with a short title and one line (design.md "Round 4: How it works"). Fewer words, the same facts.

- `h2`: **How it works**
- Lead: **Three steps. Nothing is said until you press Speak.**
- Step 1 (number `1`), `h3` **Press one key per letter**: **G, H and I share key 4, so "home" and "good" are both 4663.**
- Step 2 (number `2`), `h3` **Pick what you meant**: **Ranked by an offline dictionary on your device. Picking one never speaks it.**
- Step 3 (number `3`), `h3` **Hear it out loud**: **Your browser's voice says it. With no voice, Show puts it in big text.**
- Round 5: no caveat under the row. "You need to be able to spell. Ninth Life types words, not symbols. English only
  for now." is said once, in Good to know (§8).

Removed in round 4, and where each fact lives now: "Keys 2 to 9 carry the letters" and "No tapping a key three times
and no code to learn" (the keypad picture shows the keys; the hero says one press per letter); "0 is space" (the
hero); "Sentences appear as you type" (the step 2 picture plays right after the keys); "Nothing is spoken until you
press Speak" (now the lead, and the FAQ); "for the other person to read" (Conversation's Show and Flip card). The
old lead "Three steps from the keys you press to the sentence you hear." is replaced. No "Play the steps again" button:
the product owner chose play once only (PO-2, 2026-11-13).

Drawing text (decorative, `aria-hidden`): step 1, keypad rows 1 and 2 (the key faces) and the digits 4 6 6 3; step
2, the app's status pill **Offline dictionary ready**, then the build-time top 3 for `4663` in the app's sentence case
with rank numbers 1 to 3 (today Good, Home, Gone), the marker on the first row moving to "Home"; step 3, the sentence
card with "Home" and 4663, a drawn **Speak** button that then reads **Speaking**, and a drawn **Show** button. Gone
with the typing well: "Press a key to start", the well after each press and "Sentences appear here".

## 3. The proof check (`#proof`)

Round 4 (2026-11-13): the product owner asked for "a more visual and intuitive visual on the right,
possibly animated and coordinated with the left section". The lead keeps its first two sentences. Its third becomes
four steps that light up in time with the figure. The legend becomes the figure's closing lines. The claims are
unchanged.

- `h2`: **Every spoken word matches the keys on screen**
- Lead: **A language model can suggest sentences. It cannot put words in your mouth.**
- Figure caption (the accessible content of the figure): **Your keys: {proof.keys}**
- Chips (finished frame): **water** (matches), **waves** (matches), **wafer** (does not match, struck through), from
  `getProofExample()`.
- Closing lines (accessible, each led by its chip's icon; "never spoken" is said once in the figure):
  - **Can be spoken: {proof.matches joined with ", "}.**
    - Built by `proofCanLine`; today "Can be spoken: water, waves."
  - **Never spoken: {proof.reject.word}. "{proof.reject.word}" is {proof.reject.code}. Your keys are {proof.keys}.**
    - Built by `proofNeverLine`; today 'Never spoken: wafer. "wafer" is 92337. Your keys are 92837.'
    - It regroups round 3's two lines by state.
- Steps (an `ol` after the figure in the DOM, beside it from 1024px), each a `.site-step` with its number:
  1. **You press keys.**
  2. **Words are suggested for them.**
  3. **Each word is turned back into keys.**
  4. **A word that does not match is dropped, never spoken.**
- Note: **With model ranking on, the check runs on the server and again in your browser. You decide what is said: only a press of Speak speaks.**
- Round 5: no button row after the note; the sticky bar carries "Open the app".

Removed in round 4, and where it went:
- The lead's third sentence. The steps keep its words: "turned back into keys", "does not match", "never spoken".
- The legend: the `h3` "How to read the chips" and its two items.
  - The closing lines' icons now say what a check and an x mean.
  - The dictionary-or-My-words side of the check is said by §4's Spell card, which explains the plus.

Order on the page: head, then the figure, the steps, the note and the button (MS-10.9).

Drawing text (decorative, `aria-hidden`, round 4):
- The label **Your keys** (no colon).
- Each key's digit and its letters, from `KEY_LETTERS`: today 9 WXYZ, 2 ABC, 8 TUV, 3 DEF, 7 PQRS.
- Each word's letters under its keys, the dropped word's "f" boxed with an x.
- No frame labels.

## 4. In a conversation (`#conversation`)

- `h2`: **Made for both sides of a conversation**
- Lead: **Ninth Life keeps the other person in view, so a conversation does not stop while a sentence is typed.**
Round 3 (2026-11-12, P2-9): each card's `h3` says what it does for you; the app's feature name sits above
it as a small label (`label` type, `--ink-muted`, in an `hgroup` with the `h3`).
Round 4 (2026-11-13; decisions §2 "Boxes"): They said is the lead card (across the grid); each feature
name carries its icon (`said`, `flip`, `save`, `spell`); one short line per card, never fewer facts.

- Label **They said**, `h3` **Answer what they just said**: **Type their last line, or press Listen to turn their speech into text. Listen is off until you allow it. Answer in one press with a quick reply such as Yes or Pardon?, or pick Agree, Disagree or Ask to bring the sentences that fit to the top.** (Round 5: the last sentence is new; the app's quick replies are "Hold on.", "Yes.", "No.", "Pardon?" and "Thanks." (`lib/replies.ts`), and the reply types reorder the sentences, never change the words (`REPLY_TYPES_HELP`).)
- Label **Show and Flip**, `h3` **Turn your words to face them**: **Show puts your sentence in big text. Flip turns it around for the person sitting opposite.**
- Label **Saved phrases**, `h3` **Keep what you say often**: **Press Save phrase to keep a sentence on this device. Nothing is saved until you do.**
- Label **Spell and My words**, `h3` **Spell a name once**: **Spell it letter by letter, then add it to My words. A plus means it matches your keys but is not in the dictionary or My words yet.** (Round 3: the plus moved here from §3's legend.)

Round 4 wording changes, the facts kept: They said drops "and let your browser" (Privacy's Listen card says where the
voice goes); Saved phrases says the action first (round 3: "Keep the sentences you say often. They stay on this
device, and only when you press Save phrase."); Spell and My words says "add it" before the plus (round 3: "Spell a
name or a rare word letter by letter. ... Add it to My words so you spell it only once.", the title keeps "once").

Drawing text (decorative, `aria-hidden`; round 4: one scale, an arrow from each cause to its result):

- They said (the lead): the strip **They said**, its line **Nothing yet.**, then the Listen status **Listening. Ask
  them to speak now.**, then **What do you need?**; a drawn **Listen** that reads **Stop** while it listens; below, the
  well **Press a key to start**, then the demo's finished sentence ("I need water") and its digits ("4 6333 92837").
- Show and Flip: the table's far edge **The person opposite** and near edge **You**; the Show card with the app's
  label **Show this to the other person** and the demo's finished sentence, turned to face the far edge; drawn
  **Done** and **Flip**, upright. (Round 4 amends W1 for this drawing: the edges replace the small upright card.)
- Saved phrases: the well with the demo's finished sentence and a drawn **Save phrase**; then the Phrases sheet,
  **Your phrases**, with rows **I need water** (the demo's sentence, outlined as new) and **Thank you**.
- Spell and My words: the chip **Mihai** with **64424** (from `getSpellExample()`), first with **Not in your words
  yet.** and a drawn **Add to my words**, then **In my words.** (R3-P3, 2026-11-13: these stay the app's own strings,
  `SpellSheet.tsx`, because the drawing shows what the app says; the site's running text names the list **My words**
  everywhere: this card's text, the FAQ and `/about`; the Proof legend that also did is gone in round 4.)

Round 3 (W1, amends V5-V7): each finished drawing shows the before and the after together. Round 4: Saved phrases
keeps the well with the pressed Save phrase above the sheet; Spell and My words keeps the New chip and Add to my words
above the Matches chip; Show and Flip shows the before and the after through the table's edges.

## 5. Ways to type (`#access`)

- `h2`: **Works the way you type**
- Lead (round 3): **Keyboard, touch or one or two switches, on the screen you have.**
Round 4 (2026-11-13): One or two switches is the lead card (first in the grid); each `h3` carries its
icon (`switch`, `keyboard`, `key`, `view`, `screens`).
- `h3` **One or two switches**: **Row and column scanning, from 0.4 to 5 seconds a step, with no time limits. Space or Enter is the switch.**
- `h3` **Keyboard**: **Number keys or the numpad. Enter speaks, Backspace goes back, arrow keys pick a sentence.**
- `h3` **Touch**: **Large keys, from 72 to 128 pixels. Single taps only: no swipes, no long presses.**
- `h3` **Your view**: **Night or Day theme, large or extra-large keys, and Show for big text.**
- `h3` **Phones, tablets and laptops**: **The whole app fits on one screen and never scrolls, on phones, tablets and laptops. Phones work upright, tablets either way up.** (Round 5: laptops too, web-ui Req 40 and ADR-012; round 4 said "On phones and tablets the whole app fits …" and had the simulator caveat, now only in Good to know.)
  (Round 3 said "Tablets work either way up. Phones work upright: held sideways, Ninth Life asks you to turn the phone
  and keeps your sentence." The Accessibility note keeps the portrait-only exception and the FAQ says "Phones
  (upright)".)
- Note, `h3` **Accessibility** (round 4: `id="accessibility"`, the footer's link): **We aim for WCAG 2.2 AA as a minimum and check the app with automated accessibility, keyboard and switch tests. One known exception: on phones the app works in portrait only. Found a problem?** link **Open an issue on GitHub** (to `{REPO_URL}/issues`).
- Round 5: no closing "Open the app" row (R3-P10 added one; the sticky bar replaces it).

The numbers here are product settings, not eval results: 72 and 128 are the `key-min` and `key-xl` tokens;
0.4 to 5 seconds is `accessibility.md` rule 9.

Drawing text (decorative, `aria-hidden`; round 4: every loose key sits on a key panel):

- One or two switches (the lead): the well **Press a key to start**, then the word the demo's first press types and
  its key (**I** and **4**, from `getDemoData().steps[0]`, MS-7.8); the keypad; a drawn switch labelled **Switch**
  with the scan speed range **0.4 s** to **5 s**.
- Keyboard: drawn keys **4**, **Enter**, **Backspace** and the two arrows, with **types g h i**, **speaks**, **goes
  back**, **pick a sentence**.
- Touch: key **2 ABC** twice on one key panel, with **72** and **128** under them.
- Your view: half labels **Night** and **Day** (with the moon and sun icons), the text **Hi**, key **4 GHI**, then
  **Large** and **Extra large**.
- Phones, tablets and laptops: box labels **Phone**, **Tablet**, **Laptop** (16px; no other text).

## 6. Offline and private (`#privacy`)

- `h2`: **Offline unless you choose**
- Lead: **Typing, the dictionary and the proof check run in your browser. After one visit the app works with no connection. No account, no cookies, no analytics, no ads.**
Round 4 (2026-11-13; decisions §2 "Boxes"): On your device is the lead card (a map of this device and its
three ways out), then one card per way out; each `h3` carries its icon (`offline`, `toggle`, `voice`, `mic`).
- `h3` **On your device**: **Your saved phrases and My words are kept in your browser. Only three features send words or speech off this device: model ranking, online voices and Listen.**
  (The second sentence is the lead's approved wording. Checked against every network call in the app on 2026-11-13:
  the dictionary files (same origin), `/api/decode` only with model ranking on (`lib/decodeClient.ts`), a word pack's
  link (the link only, `lib/vocabPack.ts`), the service worker (same-origin files; decode network-only) and the
  browser's own speech services (online voices, Listen). Round 3 said "What you type, the dictionary, your saved
  phrases and My words. Nothing you say is saved unless you press Save phrase, and then only on this device."; the
  Saved phrases card and the FAQ keep the saving rule.)
- Round 5 (2026-11-17): under the map, one card, `h3` **What leaves this device, and only when you use it**, with one
  row per way out in Good to know's row look (`.site-rows`: an icon tile, the name as an `h4`, then the text). It
  replaces the three door cards and the note card below, which drew the map's ways out again with their own outlines.
  - **Model ranking** (toggle icon): **Off until you turn it on in Settings. Then Ninth Life sends {rankingSentText()} to {provider.service} to rank the sentences. {RANKING_SENT_ALSO}** Then a small list: `{provider.region}` · `{provider.retention}` · **Our server logs timings and counts, never your words.**
  - **Online voices** (voice icon): **Voices marked "on this device" keep your words on the device; online voices send the text to the browser maker.**
  - **Listen** (mic icon): **The other person's voice may be sent to the browser maker (Google in Chrome, Apple in Safari) to turn it into text, unless the browser can do it on this device. Ninth Life never receives or keeps the audio.**
  - Last in the card: **Check it yourself: the code is open, and your browser's storage shows no cookies.** and the
    two evidence links below.
- Round 4, replaced in round 5: the card "Model ranking, if you turn it on" with "Sent to rank: …" drawn at the top of
  its stage and the line "It is off until you turn it on in Settings. Then Ninth Life sends these to … to rank the
  sentences." (`rankingSentText()` in `lib/rankingProvider.ts` writes the four `RANKING_SENT` items as one clause: "your keys, the dictionary words that match them, Ninth Life's own best guesses and the other person's last line", the same list as §8, §9 and `/about`. Round 3 moved the region, retention and log lines out of this card; round 4 stops the line repeating the list.)
- Round 4, replaced in round 5: the cards "Voices" and "Listen" (the same sentences, now rows) and the note card "What
  happens to what ranking sends" (its three lines are now Model ranking's list; `provider.region` is "Processing is
  not limited to the EU." for both current providers, MS-4.6).
  - The evidence links, last in the rows card (the evidence,
    not the repo root; round 4: `.site-go--out`, an external icon): **The privacy rules the code follows** (to
    `{PRIVACY_RULES_URL}`, `.kiro/steering/privacy.md`) · **The code that builds the ranking request** (to
    `{RANKING_REQUEST_URL}`, `packages/web/lib/decodeClient.ts`).
- Round 5: no closing "Open the app" row (the sticky bar replaces it).

Drawing text (decorative, `aria-hidden`; round 5: only the map remains, the Model ranking, Voices and Listen drawings
below are gone with their cards; round 4: a dashed outline is this device, a feature on its edge is one way
out, an arrow leaving it is data leaving, a cloud marks where it goes; no locks, shields or badges):

- On your device (the lead): the outline's name **This device**; its ways out **Model ranking**, **Online voices** and
  **Listen** (their icons only under 600px); inside, the well with the demo's finished sentence and its digits, the
  rows **The dictionary**, **Saved phrases**, **My words**, and the status **Offline. Using your dictionary.**
- Model ranking (no title in the drawing; the card's `h3` names it, V31): the switch row "Model ranking" with "Off",
  then "On"; inside the outline "Off until you turn it on"; an arrow to the sent text. No count, no provider name
  (MS-7.10). What is sent is real text (above): the four `RANKING_SENT` items, what `buildRequest` in
  `lib/decodeClient.ts` sends (`codes`, `lattice`, `beams`, `context.partner`; `context.recent` is always empty).
- Voices: "Voice (en, online)" on the outline's edge with "Sends the text to the browser maker", an arrow "The
  text" to "The browser maker"; inside, "Voice (en, on this device)" with "Keeps your words on the device" (the
  Settings help text in the singular; no browser maker named in the drawing, MS-4.8; no voice shown as the default).
- Listen: a drawn "Listen" on the outline's edge that reads "Stop" while it listens; inside, the strip "They
  said" with "Nothing yet.", then "Listening. Ask them to speak now." (the app's own status line), then "What do
  you need?"; arrows "Their voice" out and "Text" back, to and from "The browser maker".

## 7. Measured, not promised (`#results`)

Round 3 (2026-11-12): on the page this section came right after §3, the proof check (MS-3.1). Round 5
(2026-11-17): it comes after §6, Privacy, right before §8, Good to know. The section numbers here stay as they were.

Round 4 (2026-11-13; decisions "Results", PO-1): the figures are graphics now, with far fewer sentences.
Every number still comes from `getResults()` (RESULTS.json, the harness output that RESULTS.md is written from); each
item names the RESULTS.md line that prints it.

When `getResults()` returns results:

- `h2`: **Measured, not promised**. No lead since round 4 (phone length): its facts are in the captions, the presses
  card and the "Ninth Life, offline" label, and the caveat follows the title.
- The caveat first, a `.site-caveat` with the info icon, one paragraph: **These figures come from a simulated typist, not from studies with people.** (in bold) **Some test sentences also appear in the dictionary's source text, so the figures are somewhat optimistic.** (Round 5: the third sentence, "The app has not yet been tested with people who use AAC.", left; Good to know, right after this section, says it as a Testing so far row.) The overlap's share is in `data-and-eval.md` §4, not in RESULTS.md, so no number.
- The chart, a `dl` of three measures. Each has its `dt`, then Ninth Life offline (B1), word frequency alone (B0) and what it counts; a drawn bar under each value is that value on a full track from 0:
  - **Right sentence first**: `{ghost.top1}` **Ninth Life, offline** · `{dict.top1}` **Word frequency alone** · **of {items} sentences, with no correction**. RESULTS.md, Summary rows "B1 ghost" and "B0 dict", "Sent top-1": 85.6% and 62.4%; "Test set: … 866 items".
  - **Right sentence in the top 5**: `{ghost.top5}` · `{dict.top5}` · **of {items} sentences**. RESULTS.md "Sent top-5": 97.3% and 92.0%.
  - **Right word first**: `{ghost.wordAcc}` · `{dict.wordAcc}` · **of {words} words, before any correction**. RESULTS.md "Word acc": 96.8% and 91.5%; word frequency's 91.5% is new on the page in round 4, so every measure has its pair. The 4,890 words: B1 `words` in RESULTS.json; RESULTS.md "By source" Words 2730 + 2160, and "2306 of 4890" in the initials table. With no `words`: "of words, before any correction".
  - Once, under the three: **Word frequency alone: the same dictionary, ranked without word pairs.** (B0 is the same lexicon with the unigram model, `packages/eval/src/decoders.ts`.)
- Card (only with `bySource`), `h3` **Right sentence first, by source**: `{bySource.aac.top1}` **of {bySource.aac.items} AAC sentences** · `{bySource.turk.top1}` **of {bySource.turk.items} dialogue replies** · **The replies are longer and more varied.** RESULTS.md "By source", rows "B1 ghost | aac | 566" (88.7%) and "B1 ghost | turk | 300" (79.7%); "longer and more varied" is the method's wording (`data-and-eval.md` §4).
- Card, `h3` **Presses and scan steps**: a figure of "home" over the keys that type it (`pressExample()`, `encodeWord`; aria-hidden) · `{ghost.pressesPerChar}` **key presses per character** · **Typing every letter. With Finish the word,** `{finish.pressesPerChar}`: `{finish.ksr}` **fewer. Real people save less.** (B1c, RESULTS.md "Finish the word (B1c)"; without B1c the note is "Every letter is one press."; the Results section stays within its height budget at 390x699) · the scan steps as marks, whole and part (aria-hidden) · `{ghost.scanStepsPerChar}` **scan steps per character, with one switch**. RESULTS.md: "Letter-mode B1 needs 1.00 presses per character on the same items."; Summary "Scan steps/char" 3.57. With no `pressesPerChar` the card falls back to "Every letter is one press ({ghost.ksr} keystroke savings without Finish the word)." Round 6 (2026-11-16): "Letter mode saves no key presses." is retired now that Finish the word is measured. Round 4 drops "0.0% keystroke savings" from the page: RESULTS.md prints that measurement as "-0.0%" (the page's `pct` lost the sign of -0.04%), and 1.00 presses per character is RESULTS.md's own figure for it.
- Model status (only with `modelRuns`; `modelStatus()`), `h3` **Model ranking**, one row per status, each with an icon and a status word:
  - check: **Measured with {count} {company} models ({models}), on samples of {sizes} sentences, with how often a reply came too late.** ("1 MiniMax model" for one; a model id never breaks inside.)
  - dash, while this build's provider is not the measured one: **Not measured yet: {service}, which the app's model ranking uses.** When it is the measured one, row 1 ends with "The app's model ranking uses {service}, the provider measured here." and there is no second row.
  - Round 4 replaces the round-3 model line on the page; `/llms.txt` keeps it (`modelRunsLine`, the same values). R3-P7's reasons hold: the measured provider and model ids are named and the configured provider's status is said, with no model-run accuracy, latency or cost number (D14). It never says that model ranking as a whole has not been measured (D15).
- Links, `.site-go site-go--out` (they leave the site): **Full results** (to `{RESULTS_URL}`, the name `/llms.txt` uses) · **How we measured** (to `{METHOD_URL}`).
- Round 5: no closing "Open the app" row (the sticky bar replaces it). Results now sits after Privacy, right before Good to know.

When `getResults()` returns null: `h2` as above, the line **The eval results are not available in this build.** and the two links. No numbers.

Replaced in round 4. These lines are no longer on the page; their facts stay, as listed above:
- the lead "We typed {items} test sentences from public AAC text collections…";
- the stat-card captions with word frequency in brackets;
- the keystroke-savings paragraph;
- the per-source sentence;
- the model-line paragraph.

Today's values (2026-11-13, for review only; the page reads them from the files):
- 866 sentences and 4,890 words;
- 85.6% and 62.4%, 97.3% and 92.0%, 96.8% and 91.5%;
- by source, 88.7% of 566 and 79.7% of 300;
- 1.00 presses per character and 3.57 scan steps per character;
- model status "2 MiniMax models (MiniMax-M3 and MiniMax-M3.1-Flash), on samples of 200 sentences", with Anthropic's Claude API not measured yet.

No accuracy, latency or cost number from a model run appears on the page (D14; model names since R3-P7).

## 8. Good to know (`#limits`)

- `h2`: **Good to know**
- Lead (round 4): **Ninth Life is not a replacement for an AAC device, a speech-language assessment or professional advice.**
- Card `h3` **Before you start**, one row per limit (an icon tile, the key, then the approved sentence word for word):
  - **Spelling**: **You need to be able to spell. Ninth Life types words, not symbols, so it does not suit someone who cannot spell yet.**
  - **Language**: **English only for now.**
  - **Voices**: **Voices depend on your device and browser.**
  - Round 5: no Model ranking row (it was "With model ranking on, … leave your device, as described under Privacy."; Privacy says it).
- Card `h3` **Testing so far**, one row per check and its state in words, never colour alone (**Done** has a solid edge and a check; **Not yet** a dashed edge; a visually hidden colon between the check and its state):
  - **Checked in phone and tablet simulators**: **Done**
  - **Checked on real phones and tablets**: **Not yet**
  - **Tested with people who use AAC**: **Not yet**
- Then, in that card: **Want to help test it?** link **Open an issue on GitHub** (to `{ISSUES_URL}`).

Round 4 (2026-11-13; MS-4.5, MS-4.5a). The biggest limit is the lead: it was the "What it is not" item,
with "It" spelled out as "Ninth Life". The two "Not tested yet" sentences ("It has not yet been tested with people who
use AAC." and "It has been checked in phone and tablet simulators, not yet on real phones and tablets.") are the
three Testing so far rows: the same facts, with each state in a word. The keys Spelling, Language, Voices and Model
ranking are new labels; the four sentences are unchanged. Every limit is also said beside the claim it qualifies, in
the shared `.site-caveat` line (an info icon and the sentence in ink), written by each section's owner: How, under its
row, "You need to be able to spell. Ninth Life types words, not symbols. English only for now." (§2); Results, in its
caveat note, "It has not yet been tested with people who use AAC." (§7); Access, in Phones, tablets and laptops, "It
has been checked in phone and tablet simulators, not yet on real phones and tablets." (§5). Voices, model ranking and
the not-a-replacement limit already sit by their claims (How's Speak step, Privacy, the FAQ and the footer statement).
`/llms.txt` lists the lead and the seven rows (`LIMITS` in `Limits.tsx`). Research: FTC .com Disclosures (2013: "A
disclosure is more effective if it is placed near the claim it qualifies") and W3C WAI's accessibility statements
(known limitations in common terms, with a way to report problems).

"English only for now." was "English first." until 2026-11-13 (verifier): the app has only an English dictionary and
accepts only English word packs (`lib/vocabPack.ts`), so it now says the same as the FAQ; Romanian and Spanish packs
are a later plan (`product.md`), not something the app has. The ranking item is written by `rankingSentText()` (round 3: it used to say only "your keys and the candidate
words", less than Privacy and the FAQ). The two Not yet rows stay until `docs/` records user testing and a
real-device check (product.md, Honest limits).

Round 5 (2026-11-17; amends MS-4.5a): Good to know is the one home of the limits. The three caveats beside their
claims (How, Access, the Results caveat's last sentence) are gone: the product owner found the page repeating itself,
and Results, the claim the testing rows qualify most, now sits right before this section. The Results caveat keeps
what is about its own numbers (a simulated typist; the overlap with the dictionary's text). `/llms.txt` lists the lead
and the six rows.

## 9. Questions (`#faq`)

- `h2`: **Questions**. Each item is a native `<details>`, closed by default; the summary is the question.
- **Is it free?** Yes. There is no paid tier, no ads and no account. The code is open source under the MIT license. Model ranking costs a little per sentence. We can switch it off at any time, and the app then keeps working with the offline dictionary.
- **Do I need to install anything?** No. Open it in your browser. After one visit it works offline. To keep it on your home screen, use your browser's Add to Home Screen or Install option.
- **What if the sentence I meant is not first?** Other sentences that match your keys are listed under it: pick one with a tap, the arrow keys or your switch. If a word is still wrong, Spell this word lets you choose the letter for each key you pressed.
- **Where are my saved phrases?** In your browser on this device, nowhere else. Nothing is saved unless you press Save phrase. Delete one in Phrases; clearing this site's data in your browser deletes them all, with My words.
- **Is it a medical device?** No. {NOT_A_MEDICAL_DEVICE}
- The head's lead (round 5; round 3 put it after the list): **Something else?** link **Ask on GitHub** (to `{ISSUES_URL}`), so it fills the column beside the list on desktop.

Round 5 (2026-11-17): five questions, the ones no section answers. Removed, and where each answer lives: "Which
devices and languages?" (Access's Phones, tablets and laptops card; Good to know's Language and Voices rows); "Can I
type names and my own words?" (Conversation's Spell a name once card); "Can I use it with a switch?" (Access's One or
two switches card); "Can the model say something I did not type?" (the proof check, §3); "What does model ranking
send, and to whom?" (Privacy's Model ranking row); "Does it work without a connection?" (the Privacy lead, the
hero's and the close's Works offline). The FAQPage JSON-LD and `/llms.txt` read the same five.

Round 3 (2026-11-12): every new answer names only what the app does (`SpellSheet` "Spell this word" and
"Add to my words", `MyWordsSheet`, `PhrasesSheet` "Delete", IndexedDB in `lib/storage.ts`, the candidate list and
its arrow keys in `lib/keyboard.ts`, the web manifest's `display: standalone`). "Which languages?" is folded into
"Which devices and languages?" and the home screen into "Do I need to install anything?", so the list stays at 11.
The ranking answer starts with `rankingSentText()`, its first letter capitalised.
`faqItems()` in `Faq.tsx` is the one list: the page, the FAQPage JSON-LD and `/llms.txt` read it.

## 10. Free and open source (`#source`): dissolved in round 4

Round 4 (2026-11-13; MS-3.1, amends D12): the section is no longer on the page; the product owner asked to
put its information across the site and make it more visual. No fact is lost; every sentence it had is now here, word
for word (the copy is in the sections named, so it is written out there):

| Was in this section | Now |
|---|---|
| `h2` Free and open source; the lead "Ninth Life is free, with no paid tier, and its code is MIT licensed. The dictionary is built from open word lists and public text, credited in the repository." | §11's facts row (Free: No paid tier, no ads; Open source: MIT licensed); the lead word for word in `/about`'s Free and open source section |
| `h3` Why it is free and its paragraph | `/about`, word for word; its last two sentences ("Model ranking costs a little per sentence. We can switch it off at any time, and the app then keeps working with the offline dictionary.") end §9's "Is it free?" answer |
| `h3` Who made it: the history line (MS-4.7, D15) | §12: the footer of every page (`HISTORY_LINE` in `site-data.ts`), and `/llms.txt` |
| The Credits card (four lines; the model line from `providerCopy()`) | `/about#credits`, word for word; the footer's Credits link |
| Links Source code on GitHub, Data sources and licenses, About Ninth Life | the footer's Project group (Source code, Data sources and licenses, About); the first two also in `/about` |

The maker is still not named anywhere (W6).

## 11. Closing call to action (`#start`)

A Night band with the hero's night sky in both themes (round 3, W2).

- Icon image (`/icons/icon.svg`, 96px, `alt=""`), still.
- `h2`: **Type your first sentence**
- Facts row (round 4, 2026-11-13; replaces the line "Free. Works offline. No account.", which the hero
  keeps): four items, a title and a line each, typographic with 2px rules between them, never badges ("badge-like
  marks" are banned below: they would read as certifications); each reads "Title: line" to a screen reader:
  **Free** / **No paid tier, no ads.** · **Works offline** / **After the first visit.** · **No account** / **No
  cookies, no analytics.** · **Open source** / **MIT licensed.** (the words of §9, §6's lead and the old §10 lead).
- Primary button (the ember fill of this viewport): **Open the app** (to `/app`)
- Note under the button (round 3, the input methods, wording from `/about`): **Type with a keyboard, by touch or with one or two switches.**

## 12. Footer

Round 4 (2026-11-13): rebuilt as a brand column, the Footer navigation in three labelled groups and a
legal block (NN/g's doormat navigation for long pages: under 960px the bar shows no navigation, so on phones these
groups are the page's map; GOV.UK's footer: an `h2` and a list per group).

- Brand: favicon (`alt=""`) and **Ninth Life**; the promise **A free web app for typing to talk.** (the hero lead's
  first sentence); a secondary button **Open the app** (to `/app`, 56px as in the bar, never an ember fill; it was a
  nav link).
- Nav, `aria-label="Footer"`, three groups:
  - `h2` **Product**: **How it works** (`#how`) · **Proof check** (`#proof`) · **Ways to type** (`#access`) · **Questions** (`#faq`)
  - `h2` **Trust**: **Privacy** (`#privacy`) · **Good to know** (`#limits`) · **Accessibility** (`#accessibility`, the Access note) · **How we measured** (`{METHOD_URL}`)
  - `h2` **Project**: **About** (`/about`) · **Source code** (`{REPO_URL}`) · **Data sources and licenses** (`{NOTICE_URL}`) · **Credits** (`/about#credits`) · **Report a problem** (`{ISSUES_URL}`)
  - Links that leave the site carry the external icon beside their word. On `/about` and the 404 the anchors are
    `/#how` and so on.
- History line (MS-4.7, D15; moved from §10, `HISTORY_LINE`): **Made for Kiroween 2026.**
- Licence line (`caption`): **Code MIT. Data CC BY-SA 4.0. Fonts SIL Open Font License.**
- Last: **Back to top** (to `#top`, the banner; on `/about` and the 404 their header): the page is about 23 phone
  screens long.
- Statement (`body` type since R3-P8, 2026-11-13: the one legal statement on the page, and text is 16px or more): `{NOT_A_MEDICAL_DEVICE}`, which reads:

> Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment.

On `/about` (round 3, W3) the footer leaves the statement out: the page shows it once, in its own "What Ninth
Life is not" note card.

R3-P6 (2026-11-13, lead decision extending W2): the footer is Night in both themes on every page, so a Day page ends
the way it opens (the Night close, then a Night footer, not a light strip); its favicon tile now sits on Night as in
the bar. The copy is unchanged.

## `/about` (round 3, W3: the website's look)

`/about` keeps its own copy (it is not on `/`), now in the site chrome: the site bar (`SiteBar`, anchors to
`/#how` and so on, brand to `/`, **Open the app** instead of "Back to the keypad"), a Night header with the `h1`
**About Ninth Life** and the lead **Ninth Life brings back 9-key predictive text as a way to talk. Press one key
per letter on keys 2 to 9, and it speaks the sentence you meant.**, then the sections What it does, Every word is
checked against your keys, Privacy and What Ninth Life is not, and the site footer. Round 3 copy fixes: "sent to
{provider.service}" (a missing space rendered "toAnthropic's"); what ranking sends is `rankingSentText()` (the
four `RANKING_SENT` items, the same list as Privacy and the FAQ); the Privacy list adds `{provider.region}` and
"Our server logs timings and counts, never your words." R3-P3 (2026-11-13): the proof-panel sentence names the list
**My words** (round 5: it starts "Check the words shows each word with its keys", the app's name for the check since
web-ui Req 40, and the ranking paragraph's three sentences get their missing spaces): "a check means the word matches your keys and is in the dictionary or in My words, a plus means it
matches but is not in the dictionary or My words yet (add it to My words), and a struck-through word was suggested
but does not match."

Round 4 (2026-11-13; MS-14.5): two sections before What Ninth Life is not, from the dissolved §10, word
for word: "Free and open source" (the old lead, then the "Why it is free" paragraph, then the links "Source code on
GitHub" and "Data sources and licenses") and "Credits" (`#credits`, the target of the footer's Credits link: the four
credit lines, the model line from `providerCopy()`). The header is `#top`, the target of the footer's "Back to top"
(the 404's header too). The footer itself is §12's, with the history line; it still leaves the statement out here.

## Never on the page

- Any word listed in `.kiro/steering/trademarks.md`; device brand or model names (say phone, tablet, laptop).
- "nothing is kept", "100% private", "EU only", "encrypted", badge-like marks, "AI understands you",
  "reads your mind", any treatment, therapy, recovery or clinical wording, any condition named as who it is for.
- Testimonials, user counts, "trusted by", third-party logos, pictures of people, a mascot or cartoon cat.
- Numbers that `packages/eval/RESULTS.md` did not measure; any model-run accuracy, latency or cost figure (D14).
- Any wording that lets a reader take the configured ranking provider as measured when RESULTS.md has no run of it (R3-P7).
- "Model ranking has not been measured yet" and "Built with Kiro for Kiroween 2026" (D15).
