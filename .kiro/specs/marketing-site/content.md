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
  - `{REPO_URL}`, `{RESULTS_URL}`, `{METHOD_URL}` from `site-data.ts`.
- Sentence case, plain verbs, digits for numbers, no exclamation marks (web-ui Req 14.1).
- Checked against `.kiro/steering/product.md` (banned claims, honest limits) and
  `.kiro/steering/trademarks.md`; `node scripts/tm-lint.mjs` is clean on this file.

## Page metadata

| Field | Text |
|---|---|
| `<title>` | Ninth Life: type on 9 keys, hear your sentence |
| `description` | Free web app for typing to talk. Press one key per letter and hear the sentence you meant. Every spoken word matches your keys. Works offline. |
| `og:title` | Ninth Life: the old phone keypad, back as a way to talk |
| `og:description` | Press one key per letter and hear the sentence you meant. Every spoken word matches the keys you pressed. Free, works offline, runs in your browser. |
| `og:type`, `og:site_name`, `og:locale` | `website`, `Ninth Life`, `en` |
| `twitter:card` | `summary` (same title and description) |

No `og:image` in this change (no deployed origin yet; see design.md "Out of scope"). No `keywords` tag.

## 0. Skip link and header

- Skip link: **Skip to content** (to `#main`)
- Brand link (to `#top`): favicon image (`alt=""`) and **Ninth Life**
- Nav, `aria-label="Main"`: **How it works** (`#how`) · **Proof check** (`#proof`) · **Ways to type** (`#access`) · **Privacy** (`#privacy`) · **Questions** (`#faq`)
- Header button (secondary): **Open the app** (to `/app`)

## 1. Hero (`#top`)

- `h1`: **Ninth Life**
- Line: **Press keys. Hear your sentence.**
- Lead: **Ninth Life brings back 9-key predictive text as a way to talk. Press one key per letter on a phone, tablet or laptop, and it speaks the sentence you meant, after checking every word against the keys you pressed.**
- Primary button (the ember fill of this viewport): **Open the app** (to `/app`)
- Secondary button: **See how it works** (to `#how`)
- Note: **Free. Works offline. No account.**

Keypad demo (`KeypadDemo`):

- Sentence well: the decoder's sentence for the keys so far, in sentence case (finished frame: the build-time
  result for `4 6333 92837`, "I need water" with the shipped dictionary). Under it, screen-reader prefix
  **Keys:** then the digits.
- Button while stopped, before any play: **Play the example**. After a play has finished: **Play the example again**. While playing: **Stop**.
- Button **Hear it** (speaker icon), only where the browser has speech; while playing it stays focusable, is marked unavailable (`aria-disabled`) and ignores presses.
- Proof chips: one per word, with the `ProofChip` state text ("water, matches your keys. Keys 9 2 8 3 7.").
- Chip list `aria-label`: **Proof check**
- Live region after a play the person started: **Typed {codes}. Ninth Life shows: {sentence}.**
- Visually hidden caption of the keypad picture: **Example: the keys 4, 0, 6 3 3 3, 0, 9 2 8 3 7 type "i need water". 0 is space.**

## 2. How it works (`#how`)

- `h2`: **How it works**
- Step label `01`, `h3` **Press one key per letter**: **Keys 2 to 9 carry the letters. G, H and I share key 4, so "home" is 4 6 6 3, and so is "good". No tapping a key three times and no code to learn. 0 is space.** (Changed 2026-11-11, decision V2.)
- Step label `02`, `h3` **Pick the sentence you meant**: **Sentences appear as you type, ranked by an offline dictionary on your device. If you turn on model ranking, a language model can use what the other person just said to put the likely one first. Choosing a sentence never speaks it.**
- Step label `03`, `h3` **Hear it out loud**: **Nothing is spoken until you press Speak. Your browser's voice says it. If there is no voice, Show puts the sentence in big text for the other person to read.**
- After the steps: **You need to be able to spell. Ninth Life types words, not symbols.**

Drawing text (decorative, `aria-hidden`, round 2): the empty well **Press a key to start** (in `label` type,
16px, weight 600, `--ink-muted`, on one line; decision V27); the well after each
press of 4 6 6 3, from `getHowData().typing` (today "I", "I'm", "Hmm", "Good") with the digits typed so far; the
build-time sentences for `4663` with rank numbers 1 to 3 (today good, home, gone), "home" chosen and shown in the
well as "Home"; a drawn **Speak** button that then reads **Speaking**.

## 3. The proof check (`#proof`)

- `h2`: **Every spoken word matches the keys you pressed**
- Lead: **A language model can suggest sentences. It cannot put words in your mouth. Ninth Life turns every suggested word back into keys and drops any word that does not match, so it is never spoken.**
- Figure caption (the accessible content of the figure): **Your keys: {proof.keys}**
- Chips (finished frame): **water** (matches), **waves** (matches), **wafer** (does not match, struck through), from `getProofExample()`.
- Under the chips: **For example, if a model suggested "{proof.reject.word}", the check would drop it: {proof.reject.word} is {proof.reject.code}, and your keys are {proof.keys}.** (`proof.reject.word` is wafer today.)
- Legend, `h3` **How to read the chips**:
  - **A check: the word matches your keys and is in your words.**
  - **A plus: the word matches your keys but is not in your words yet.**
  - **Struck through with an x: suggested, but your keys do not spell it. It is never spoken.**
- Closing line: **With model ranking on, the check runs on the server and again in your browser. You decide what is said: only a press of Speak speaks.**
- Button (secondary): **Open the app** (to `/app`)

Figure, round 2 (MS-7.9): no frame labels. The caption's accessible text stays **Your keys: {proof.keys}** in a
visually hidden span; the visible label and the digits beside it are `aria-hidden` (V31). Under each word, `aria-hidden`, its letters over their key digits, the
differing digit of the dropped word boxed with an x. After the chips (accessible, built from `proof` by
`proofSaidLine`): **Can be spoken: {proof.matches joined with ", "}. Never spoken: {proof.reject.word}.** (today "Can
be spoken: water, waves. Never spoken: wafer."), then the "For example…" sentence above.

## 4. In a conversation (`#conversation`)

- `h2`: **Made for both sides of a conversation**
- Lead: **Ninth Life keeps the other person in view, so a conversation does not stop while a sentence is typed.**
- `h3` **They said**: **Type the other person's last line, or press Listen and let your browser turn their speech into text. Listen is off until you allow it.**
- `h3` **Show and Flip**: **Show puts your sentence in big text. Flip turns it around for the person sitting opposite.**
- `h3` **Saved phrases**: **Keep the sentences you say often. They stay on this device, and only when you press Save phrase.**
- `h3` **Spell and My words**: **Spell a name or a rare word letter by letter. Add it to My words so you spell it only once.**

Drawing text (decorative, `aria-hidden`, round 2):

- They said: label **They said**, first **Nothing yet.**, then **What do you need?**; below, the well with the demo's
  finished sentence ("I need water") and its digits ("4 6333 92837").
- Show and Flip: card label **Show**, text = the demo's finished sentence, drawn buttons **Done** and **Flip**.
- Saved phrases: the well with the demo's finished sentence and a drawn **Save phrase**; then the heading **Your
  phrases** with rows **I need water** (the demo's sentence), **Thank you**, **Yes, please**.
- Spell and My words: the chip **Mihai** with **64424** (from `getSpellExample()`), first with **Not in your words
  yet.** and a drawn **Add to my words**, then **In my words.**

## 5. Ways to type (`#access`)

- `h2`: **Works the way you type**
- `h3` **Keyboard**: **Number keys or the numpad. Enter speaks, Backspace goes back, arrow keys pick a sentence.**
- `h3` **Touch**: **Large keys, from 72 to 128 pixels. Single taps only: no swipes, no long presses.**
- `h3` **One or two switches**: **Row and column scanning, from 0.4 to 5 seconds a step, with no time limits. Space or Enter is the switch.**
- `h3` **Your view**: **Night or Day theme, large or extra-large keys, and Show for big text.**
- `h3` **Phones, tablets and laptops**: **On phones and tablets the whole app fits on one screen and never scrolls. Tablets work either way up. Phones work upright: held sideways, Ninth Life asks you to turn the phone and keeps your sentence.**
- Note, `h3` **Accessibility**: **We aim for WCAG 2.2 AA as a minimum and check the app with automated accessibility, keyboard and switch tests. One known exception: on phones the app works in portrait only. Found a problem?** link **Open an issue on GitHub** (to `{REPO_URL}/issues`).

The numbers here are product settings, not eval results: 72 and 128 are the `key-min` and `key-xl` tokens;
0.4 to 5 seconds is `accessibility.md` rule 9.

Drawing text (decorative, `aria-hidden`, round 2):

- Keyboard: drawn keys **4**, **Enter**, **Backspace** and the two arrows, with **types g h i**, **speaks**, **goes
  back**, **pick a sentence**.
- Touch: key **2 ABC** twice, with **72** and **128** under them.
- One or two switches: the keypad, and a drawn switch labelled **Switch**.
- Your view: half labels **Night** and **Day**, the text **Hi**, key **4 GHI**, then **Large** and **Extra large**.
- Phones, tablets and laptops: box labels **Phone**, **Tablet**, **Laptop** (14px; no other text).

## 6. Offline and private (`#privacy`)

- `h2`: **Offline unless you choose**
- Lead: **Typing, the dictionary and the proof check run in your browser. After one visit the app works with no connection. No account, no cookies, no analytics, no ads.**
- `h3` **On your device**: **What you type, the dictionary, your saved phrases and My words. Nothing you say is saved unless you press Save phrase, and then only on this device.**
- `h3` **Model ranking, if you turn it on**: **It is off until you turn it on in Settings. Then Ninth Life sends your keys, the dictionary words that match them, its own best guesses and the other person's last line to {provider.service} to rank the sentences. {provider.region} {provider.retention} Our server logs timings and counts, never your words.** (`provider.region` is "Processing is not limited to the EU." for both current providers, MS-4.6.)
- `h3` **Voices**: **Speech uses your browser's voices. Voices marked "on this device" keep your words on the device; online voices send the text to the browser maker.**
- `h3` **Listen**: **Listen uses your browser's speech service. The other person's voice may be sent to the browser maker (Google in Chrome, Apple in Safari) to turn it into text, unless the browser can do it on this device. Ninth Life never receives or keeps the audio.**
- Line: **Check it yourself: the code is open, and your browser's storage shows no cookies.** Link: **Read the source code** (to `{REPO_URL}`).

Drawing text (decorative, `aria-hidden`, round 2):

- On your device: boundary label **This device**; rows **What you type**, **The dictionary**, **Saved phrases**, **My
  words**; status chip **Offline. Using your dictionary.**
- Model ranking (no title in the drawing; the card's `h3` names it, V31): **Off, the default** and **Ranked on this
  device**; then **On. Sent to rank:**
  and the items of `RANKING_SENT` (`lib/rankingProvider.ts`), one per line: **Your keys**, **The dictionary words that
  match them**, **Ninth Life's own best guesses**, **The other person's last line**. No count, no provider name
  (MS-7.10). The list is what `buildRequest` in `lib/decodeClient.ts` sends (`codes`, `lattice`, `beams`,
  `context.partner`; `context.recent` is always empty) in the wording of this section's card and the §9 answer.
- Voices: **Voice (en, on this device)** with **Keeps your words on the device**; **Voice (en, online)** with **Sends
  the text to the browser maker** (the Settings help text in the singular; no browser maker named here, MS-4.8).
- Listen: label **They said**, **Nothing yet.**, a drawn **Listen**, then **Stop** with the status **Listening. Ask
  them to speak now.** (the app's own status line), then **What do you need?** and **Listen** again.

## 7. Measured, not promised (`#results`)

When `getResults()` returns results:

- `h2`: **Measured, not promised**
- Lead: **We typed {results.items} test sentences from public AAC text collections with a simulated typist, one press per letter, using the offline dictionary that ships with the app.**
- Stat card `dt` **Right sentence first**: `{results.ghost.top1}`, then **of sentences, with no correction ({results.dict.top1} with word frequency alone).**
- Stat card `dt` **Right sentence in the top 5**: `{results.ghost.top5}`, then **of sentences ({results.dict.top5} with word frequency alone).**
- Stat card `dt` **Right word first**: `{results.ghost.wordAcc}`, then **of words, before any correction.**
- Paragraph: **Every letter is still one press, so letter mode saves no key presses ({results.ghost.ksr} keystroke savings). With one switch it takes {results.ghost.scanStepsPerChar} scan steps per character. These figures come from a simulated typist, not from studies with people.**
- Caveat, right after that paragraph, with no number (the share is in `docs/architecture/data-and-eval.md`, not in RESULTS.md): **Some test sentences, mostly short stock phrases such as "Thank you.", also appear in the text the dictionary was built from, so these figures are somewhat optimistic.**
- Model line, only when `results.modelRuns` is not null: **Model ranking has also been measured, on samples of {modelRuns.sizes} sentences with {modelRuns.count} models from one provider. Those numbers, with how often a reply would have come too late to use, are in the full results.**
  - `{modelRuns.sizes}`: the distinct sample sizes, ascending, joined with ", " and a final " and " ("200"; "200 and 300").
  - `{modelRuns.count}`: the number of distinct models with a counted run. When it is 1, the clause reads
    "with 1 model" (no "from one provider").
  - No model or provider name appears on the page (D14). The line exists only while every counted run is from
    one provider; otherwise `getResults()` gives no model line (design.md "Build-time data").
- Links: **Read the full results** (to `{RESULTS_URL}`) · **How we measured** (to `{METHOD_URL}`)

When `getResults()` returns null: `h2` as above, the line **The eval results are not available in this build.**, and the two links. No numbers.

Today's values (2026-11-10, for review only; the page reads them from the files): 866, 85.6%, 62.4%, 97.3%,
92.0%, 96.8%, -0.0%, 3.57; model line "on samples of 200 sentences with 2 models from one provider". No
accuracy, latency or cost number from a model run, and no model name, appears on the page (D14).

## 8. Good to know (`#limits`)

- `h2`: **Good to know**
- List:
  - **You need to be able to spell. Ninth Life types words, not symbols, so it does not suit someone who cannot spell yet.**
  - **Voices depend on your device and browser.**
  - **English first.**
  - **It has not yet been tested with people who use AAC.**
  - **It has been checked in phone and tablet simulators, not yet on real phones and tablets.**
  - **With model ranking on, your keys and the candidate words leave your device, as described under Privacy.**
  - **It is not a replacement for an AAC device, a speech-language assessment or professional advice.**

The fourth and fifth items stay until `docs/` records user testing and a real-device check (product.md, Honest limits).

## 9. Questions (`#faq`)

- `h2`: **Questions**. Each item is a native `<details>`, closed by default; the summary is the question.
- **Is it free?** Yes. There is no paid tier, no ads and no account. The code is open source under the MIT license.
- **Do I need to install anything?** No. Open it in your browser. After one visit it works offline.
- **Can the model say something I did not type?** No. Every word is turned back into keys and checked against the keys you pressed. A word that does not match is dropped. Nothing is spoken until you press Speak.
- **What does model ranking send, and to whom?** Your keys, the dictionary words that match them, Ninth Life's own best guesses and the other person's last line, to {provider.service}. It is off until you turn it on. {provider.retention}
- **Does it work without a connection?** Yes, after the first visit. The dictionary and the proof check run on your device. Model ranking and online voices need a connection; the dictionary does not.
- **Which languages?** English first.
- **Which devices?** Phones (upright), tablets (either way up) and laptops, in a current browser. It runs in your browser, so voices and Listen depend on that browser.
- **Can I use it with a switch?** Yes, with one or two switches. Space or Enter acts as the switch, and the scan speed goes from 0.4 to 5 seconds a step.
- **Is it a medical device?** No. {NOT_A_MEDICAL_DEVICE}

## 10. Free and open source (`#source`)

- `h2`: **Free and open source**
- Lead: **Ninth Life is free, with no paid tier, and its code is MIT licensed. The dictionary is built from open word lists and public text, credited in the repository.**
- `h3` **Why it is free**: **After one visit, typing, the dictionary and the proof check run on your device, and speech uses your browser's voices. Model ranking costs a little per sentence. We can switch it off at any time, and the app then keeps working with the offline dictionary.**
- `h3` **Who made it**: **Made for Kiroween 2026. The first version was written with Claude Code by Anthropic; the work continued in Kiro.**
- Credits card, `h3` **Credits**:
  - **Word frequencies: wordfreq by Robyn Speer.**
  - **Sentence and word-pair data: AACText by Keith Vertanen and Per Ola Kristensson, and the Turk dialogues by Keith Vertanen.**
  - **Type: Atkinson Hyperlegible Next and Mono by the Braille Institute, SIL Open Font License.**
  - **Model ranking: {provider.company}.**
- Links: **Source code on GitHub** (to `{REPO_URL}`) · **Data sources and licenses** (to `{REPO_URL}/blob/main/data/NOTICE.md`) · **About Ninth Life** (to `/about`)

## 11. Closing call to action (`#start`)

- Icon image (`/icons/icon.svg`, 96px, `alt=""`), still.
- `h2`: **Type your first sentence**
- Line: **Free, works offline, no account.**
- Primary button (the ember fill of this viewport): **Open the app** (to `/app`)

## 12. Footer

- Brand: favicon (`alt=""`) and **Ninth Life**
- Nav, `aria-label="Footer"`: **Open the app** (`/app`) · **About** (`/about`) · **Privacy** (`#privacy`) · **Accessibility** (`#access`) · **Source code** (`{REPO_URL}`)
- Licence line (`caption`): **Code MIT. Data CC BY-SA 4.0. Fonts SIL Open Font License.**
- Statement (`caption`, full width): `{NOT_A_MEDICAL_DEVICE}`, which reads:

> Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment.

## Never on the page

- Any word listed in `.kiro/steering/trademarks.md`; device brand or model names (say phone, tablet, laptop).
- "nothing is kept", "100% private", "EU only", "encrypted", badge-like marks, "AI understands you",
  "reads your mind", any treatment, therapy, recovery or clinical wording, any condition named as who it is for.
- Testimonials, user counts, "trusted by", third-party logos, pictures of people, a mascot or cartoon cat.
- Numbers that `packages/eval/RESULTS.md` did not measure; any model-run accuracy, latency or cost figure (D14).
- "Model ranking has not been measured yet" and "Built with Kiro for Kiroween 2026" (D15).
