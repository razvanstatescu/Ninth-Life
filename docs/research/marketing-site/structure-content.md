# Marketing site: structure and content (research)

Research for the one-page website at `/` (the app moves to its own route). Owner of this file: the structure-and-content research agent, 2026-11-10. Research only: the design and implementation agents decide the final layout; every line of copy below is a first draft for them and for the product owner.

Products and sites named below are named for research only (as in `docs/research/competitive-landscape.md`). Nothing is copied from them: no layouts, words, pictures or logos go into Ninth Life.

## Sources

- Steering: `.kiro/steering/product.md` (allowed and banned claims, honest limits, intended purpose), `privacy.md`, `trademarks.md`, `accessibility.md`, `design-system.md`.
- Design system: `design/system/README.md` (Voice and content, Write / Not table, Surfaces: Website, Motion, Logo).
- Existing copy: `packages/web/app/welcome/page.tsx` (the current website draft, already built on the design system), `packages/web/app/about/page.tsx`, `packages/web/lib/rankingProvider.ts` (provider and retention copy), `docs/submission/DEVPOST.md`, `README.md`, `data/NOTICE.md`.
- Numbers: `packages/eval/RESULTS.md` only, method `docs/architecture/data-and-eval.md` section 4 (linked on the site as `METHOD_URL` in `packages/web/components/site/site-data.ts`).
- Mobbin MCP: available and used (`search_sections` 5 queries, `search_flows` 1 query, web platform). Links in "Patterns found".
- Web: pages read directly with a browser (Playwright MCP), listed in "Patterns found". There was no separate web-search tool, so search went through DuckDuckGo's HTML results page.

## Starting point: `/welcome` already exists

`packages/web/app/welcome/page.tsx` is a working one-page site built on the design system: Night hero with the icon, the name, a keypad demo computed at build time from the real offline decoder (`KeypadDemo`, `getDemoData()`), then How it works, Proof, Ways to type, Privacy, Measured results (read from `RESULTS.json` at build time), Free and open source with "Good to know", and a footer with `NOT_A_MEDICAL_DEVICE`. Its copy has already been checked against the steering rules.

Recommendation: the new `/` page grows out of `/welcome` instead of starting over. Keep its sections, its build-time data (so numbers can only come from the harness) and its tone, and add the sections it lacks: "In a conversation", "Good to know" as its own section, FAQ, "Why it is free", credits, and a closing call to action. `/welcome` can then redirect to `/` (decision for the design phase).

Two lines in the current `/welcome` need changing whatever the new design is:

1. "Model ranking has not been measured yet, so we quote no number for it." `RESULTS.md` now has model-ranking sections (from line 71: two MiniMax models, 200-item samples, 2026-11-09). The sentence is shown because the Summary table and `RESULTS.json` still say "not run". Proposed replacement in "Measured, not promised" below.
2. "Built with Kiro for Kiroween 2026." Proposed replacement in "Free and open source" below: "Made for Kiroween 2026."

## Patterns found

### Mobbin (web sections and flows)

| Pattern | Seen in | What it means for Ninth Life |
|---|---|---|
| Hero: one headline, one line under it, one primary button, a short reassurance line next to or under the button ("No credit card required") | [Lyssna](https://mobbin.com/sites/sections/c237a96b-d808-4ad7-bf78-d32e4f6425cd), [Fibery](https://mobbin.com/sites/sections/22a8a669-15fa-4129-8210-fb03b6b4e00a), [Lemon Squeezy](https://mobbin.com/sites/sections/0823c6ef-79d1-4ba5-818a-25cff74d3dda) | Our reassurance line is "Free. Works offline. No account." It removes the three usual doubts before the first click. |
| Dark hero with the product itself as the picture, primary and secondary button side by side | [Supabase](https://mobbin.com/sites/sections/6d6921ce-b43a-4232-9ebd-966b1338c349) | Matches the brand book (Night hero, live keypad demo). The demo is the product, not a screenshot. |
| Header with the brand, 4 to 5 anchor links and one button on the right; open-source sites add a source-code link in the header | [Supabase](https://mobbin.com/sites/sections/3e9e47f0-2868-4f09-bbcd-3cad018ba793), [Glide](https://mobbin.com/sites/sections/2a3f3d99-2397-4ea1-b0c8-fe33cffc0939) | Header: Ninth Life, anchors, "Open the app". Source code goes in the credits and footer, not the header, to keep one clear action. |
| Closing band before the footer that repeats the main action with one line ("Start ... for free", "No coding needed") | [Glide](https://mobbin.com/sites/sections/2a3f3d99-2397-4ea1-b0c8-fe33cffc0939), [Figma](https://mobbin.com/sites/sections/ca825e99-08b1-42f7-afde-ab3790f9978a) | Add a closing band: "Press a key to start" with "Open the app". |
| How it works in 3 numbered steps, short title plus one or two sentences each | [Railway](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479), [Beside](https://mobbin.com/sites/sections/2cfd3169-f61f-4ca5-bd2a-67627febbc84), [ClassPass](https://mobbin.com/sites/sections/193363c3-3373-49a5-a1d0-00ff01f07b4d) | Keep the current 3 steps (press, pick, speak). Beside's mono "01 02 03" step labels fit our mono key-sequence type. |
| One step per screen-height block with a large visual beside it | [Function](https://mobbin.com/sites/sections/7c72acdf-c8a3-425c-b7a6-2e0c487bb17c), [Trawelt](https://mobbin.com/sites/sections/629aae31-4a94-46df-a97f-3180a6ae22e0) | A good fit for the proof check on desktop (copy left, animated chips right), stacked on phones. |
| Privacy as a short plain summary first, details after ("TLDR", "Privacy, by design", principles) | [Craft](https://mobbin.com/sites/sections/186d65b3-ec98-4a7b-af3d-5e200b92debf), [Serus](https://mobbin.com/sites/sections/d674ddba-26f4-40ad-a39f-f710227c0085), [mymind](https://mobbin.com/sites/sections/6c5b12b1-4fff-4e90-82be-3719038d6919) | Lead with one sentence ("Offline unless you choose"), then a "what leaves your device" list. We do not use badges: we hold no certifications, and badge-like marks would read as one. |
| Privacy beside a picture of the actual control | [Grain](https://mobbin.com/sites/sections/68dc4f4e-2d13-4a81-9060-f9195553706f) | Show the real "Model ranking" switch in its off state next to the copy. |
| FAQ as an accordion, question rows with a plus icon, title on the left on desktop | [Family](https://mobbin.com/sites/sections/e64d9ea0-551d-4122-823a-cac8c58e8661), [Vizcom](https://mobbin.com/sites/sections/4d5922ae-3341-4c7e-9cc1-b629dfd2aa6f), [Lemon Squeezy](https://mobbin.com/sites/sections/754ee4d4-3a41-4292-a2f6-c4d834d20e4b), [Square](https://mobbin.com/sites/sections/177b2d55-48c0-4520-8bd4-b8899c14476a) | Use native `<details>`/`<summary>` (no script, works with keyboard and switch). Vizcom's "Does ... use my data to train AI models?" is the kind of question our visitors will ask. |
| A plain statement of what the company is not, in full-width small text under the footer links | [Function](https://mobbin.com/sites/sections/86b57046-171c-45b5-80e5-61e86bc6747c), [Parker](https://mobbin.com/sites/sections/90aace03-4a60-4020-b57d-b7ad356f4051), [Slash](https://mobbin.com/sites/sections/11bef592-05db-4c10-9750-54e83f0a7fe8) | The intended-purpose sentence goes there, verbatim, in `caption`, never shortened. Unlike those footers we keep it to that one sentence so it is read. |
| Web flows from landing page to product all go through sign-up, a plan choice or a trial modal | [Kajabi](https://mobbin.com/flows/8fe9c347-0e57-442a-8bde-53c5db4c1d2d), [Plain](https://mobbin.com/flows/151c8257-ff2f-4d92-9123-bc9d4173f9b3), [Polywork](https://mobbin.com/flows/2596b356-8058-4dc9-9d5d-1c6aa4584cb5), [Etsy](https://mobbin.com/flows/e2e19cce-8554-463a-941c-b463ab6929f3) | Ninth Life has none of these steps: the button opens the keypad. Say so ("No account") and make every "Open the app" go straight to the keypad, with no interstitial. |

### Web

| Source | What it shows | Use |
|---|---|---|
| [Cboard](https://www.cboard.io/) (open-source AAC web app), read 2026-11-10 | Hero, feature carousel, testimonials, FAQ, news, footer; a cookie consent banner; several `h1` elements. | We can match the open, free story without a carousel (hard to use by switch), without testimonials (we have none and must not invent them) and without a cookie banner (we set no cookies). One `h1`. |
| [Organic Maps](https://organicmaps.app/) (free, open-source, offline maps), read 2026-11-10 | Sections "Why Organic?" (privacy, with a link to an outside tracker check) and "Who is paying for the free app?" | Two good ideas: let people verify the privacy claim themselves (link to the source code, "no cookies" is checkable in the browser), and answer "why is it free" directly. |
| [Unicorn Platform, "Landing Page Structure in 2026"](https://unicornplatform.com/blog/optimal-landing-page-structure/), read 2026-11-10 | Order: first screen (fit, value, next step), problem, mechanism, proof and trust, terms and limits, one action, final objections. Primary call to action in the first screen, again after the mechanism, again near the end. Trust cues near the point of doubt, terms visible before commitment. | Our order follows it: hero, how it works, proof check, results, then limits and FAQ before the closing call to action. |
| [W3C WAI, Developing an Accessibility Statement](https://www.w3.org/WAI/planning/statements/) | A statement names the standard, the conformance target, known limitations, how it was checked and how to give feedback. | "Ways to type" ends with a short accessibility note: WCAG 2.2 AA as the floor, the portrait-only phone exception, how we check, where to report a problem. |

## Proposed section order

One `h1` (the hero). Each section is an `h2` with an `id` for the header anchors. Calls to action into the app sit in the header, the hero, after the proof check and in the closing band (the 2026 pattern above: first screen, after the mechanism, at the end).

| # | Section (`id`) | Job of the section | Main visual (animated where noted) |
|---|---|---|---|
| 0 | Skip link and header | Get to content or straight into the app. | Icon and wordmark. |
| 1 | Hero (`top`) | Say what it is, what it costs and the next step in one screen. | Live keypad demo typing "i need water", animated. |
| 2 | How it works (`how`) | One press per letter, pick, speak. | Keys lighting one at a time as letters appear. |
| 3 | The proof check (`proof`) | Why a model can never put words in your mouth. | Proof chips: match, new, reject, animated. |
| 4 | In a conversation (`conversation`) | They said, Listen, Show mode and Flip, saved phrases. | Show-mode card flipping between the two readers (slow fade). |
| 5 | Ways to type (`access`) | Keyboard, touch, 1 and 2 switches, view settings, accessibility note. | Scan highlight jumping row by row (jump, never slide). |
| 6 | Offline and private (`privacy`) | What stays on the device, what leaves it and to whom. | The Model ranking switch, off; an offline badge. |
| 7 | Measured, not promised (`results`) | The eval numbers with the method linked. | Three stat cards; numbers can count up once with reduced motion off. |
| 8 | Good to know (`limits`) | The honest limits, before anyone commits. | None; plain list. |
| 9 | Questions (`faq`) | Answer the last doubts. | None; `<details>` list. |
| 10 | Free and open source (`source`) | Why it is free, who made it, credits and licenses. | None or the icon. |
| 11 | Closing call to action (`start`) | One last way in. | One ember key. |
| 12 | Footer | Links, licenses, the intended-purpose sentence verbatim. | Favicon. |

Why limits come before the FAQ and the closing call to action: the steering asks for the honest limits to stay visible, and the structure research above puts terms and limits before the final commitment. A person who cannot spell yet should learn it here, not after opening the app.

Why "In a conversation" comes before "Ways to type": the people around the person (family, friends, conversation partners) are a named audience in `product.md`, and this section is the one written for them.

## Page metadata

- Title (46 characters): **Ninth Life: type on 9 keys, hear your sentence**
- Meta description (142 characters): **Free web app for typing to talk. Press one key per letter and hear the sentence you meant. Every spoken word matches your keys. Works offline.**
- Open Graph
  - `og:title`: **Ninth Life: the old keypad, back as your voice** (the brand line from `design/system/README.md`)
  - `og:description` (148 characters): **Press one key per letter and hear the sentence you meant. Every spoken word matches the keys you pressed. Free, works offline, runs in your browser.**
  - `og:type`: `website`; `og:site_name`: `Ninth Life`; `og:locale`: `en`
  - `og:image`: a self-hosted 1200 x 630 PNG made from the brand book's social card (night ground, the icon, one line in `display`: "Press keys. Hear your sentence.", the URL in `body`). `og:image:alt`: **The Ninth Life icon, a speech bubble with cat ears and 9 keys, one of them lit, above the line "Press keys. Hear your sentence."**
  - `og:url`: the deployed origin once it exists (not live yet; use `metadataBase` from one env value, not a hard-coded host).
- `twitter:card`: `summary_large_image`, same title, description and image. These are plain meta tags; no third-party script.
- No `keywords` meta tag (ignored by search engines). No word from `trademarks.md` anywhere in the metadata.

## Draft copy, section by section

Copy rules applied throughout: sentence case, plain verbs, no exclamation marks, numbers as digits, describe the tool, not the person, "people who use AAC" when a group must be named, no condition named as who it is for. Product facts such as key sizes come from the design tokens and `accessibility.md`; eval numbers come from `RESULTS.md` with the line and method link.

### 0. Skip link and header

- Skip link: **Skip to content**
- Brand: icon (favicon variant below 48px) and **Ninth Life**, linking to `#top`
- Nav (`aria-label="Main"`): **How it works** · **Proof check** · **Ways to type** · **Privacy** · **Questions**
- Button (secondary): **Open the app** → the app's new route (assumed `/app` in this file; the design phase picks it)

On phones the nav collapses. Suggest a native `<details>` "Menu" or simply hiding the anchor links and keeping "Open the app", so no script is needed.

### 1. Hero

- `h1`: **Ninth Life**
- Line: **Press keys. Hear your sentence.**
- Lead: **Ninth Life brings back 9-key predictive text as a way to talk. Press one key per letter on any device, and it speaks the sentence you meant, after checking every word against the keys you pressed.**
- Primary button (the one ember thing on this screen): **Open the app** → `/app`
- Secondary button: **See how it works** → `#how`
- Reassurance line: **Free. Works offline. No account.**
- Demo caption (visually hidden or small, for the animated keypad): **Example: 4, 0, 6 3 3 3, 0, 9 2 8 3 7 types "i need water".** The sentences shown in the demo come from the shipped offline dictionary at build time (`getDemoData()`), so the demo cannot show a result the app would not give.
- Demo control: **Pause demo** / **Play demo** (WCAG 2.2.2: anything that moves for more than 5 seconds needs a pause). With `prefers-reduced-motion: reduce`, show the finished sentence and its keys and no animation.

Primary button label: "Open the app" matches the header and footer, so every way in has the same name. "Try it in your browser" (current `/welcome`) is a fine alternative for the hero only; choose one in design.

### 2. How it works

- `h2`: **How it works**
- Step 1, **Press one key per letter**: **Keys 2 to 9 carry the letters. H and I share key 4, so "hi" is 4 4. No tapping a key three times and no code to learn. 0 is space.**
- Step 2, **Pick the sentence you meant**: **Sentences appear as you type, ranked by an offline dictionary on your device. If you turn on model ranking, a language model can use what the other person just said to put the likely one first.**
- Step 3, **Hear it out loud**: **Nothing is spoken until you press Speak. Your browser's voice says it. If there is no voice, Show puts the sentence in big text for the other person to read.**
- Under the steps: **You need to be able to spell. Ninth Life types words, not symbols.**

Visual: the 12-key keypad from the design system (never a phone body, never a recognizable phone model). Keys light one at a time, the sentence card fills in under it. One lit key at a time, as in the app.

### 3. The proof check

- `h2`: **Every word matches the keys you pressed**
- Lead: **A language model can suggest sentences. It cannot put words in your mouth. Ninth Life turns every suggested word back into keys and drops any word that does not match, so it is never spoken.**
- Figure: **Your keys: 92837**, then chips **water** (matches), **waves** (matches), **wafer** (does not match, 92337, struck through). Caption: **The model suggested "wafer". Your keys spell "water", so "wafer" was dropped and will not be spoken.** (Write / Not table, `design/system/README.md`.)
- Chip legend: **Check: matches your keys and is in your words. Plus: matches your keys, not in your words yet. Struck through: suggested, but your keys do not spell it.**
- Closing line: **The check runs on the server and again in your browser. You decide what is said: only a press of Speak speaks.**
- Call to action (secondary): **Open the app**

Codes checked against the keymap: water = 9 2 8 3 7, waves = 9 2 8 3 7, wafer = 9 2 3 3 7.

Visual: the three chips arrive one after another with a short fade; the reject chip gets its strike-through and x icon. State is never shown by color alone (icon, border style and the word).

### 4. In a conversation

- `h2`: **Made for both sides of a conversation**
- Lead: **Ninth Life keeps the other person in view, so a conversation does not stop while a sentence is typed.**
- **They said**: **Type the other person's last line, or press Listen and let your browser turn their speech into text. Listen is off until you allow it.**
- **Show and Flip**: **Show puts your sentence in big text. Flip turns it around for the person sitting opposite.**
- **Saved phrases**: **Keep the sentences you say often. They stay on this device, and only when you press Save phrase.**
- **Spell and My words**: **Spell a name or a rare word letter by letter. Add it to My words and it comes first next time.** (web-ui Req 19, 21)

Avoid in this section: any wording about caregivers "managing" someone, progress, therapy goals or tracking.

### 5. Ways to type

- `h2`: **Works the way you type**
- **Keyboard**: **Number keys or the numpad. Enter speaks, Backspace goes back, arrow keys pick a sentence.**
- **Touch**: **Large keys, from 72 to 128 pixels. Single taps only: no swipes, no long presses.** (sizes: `key-min` and `key-xl` tokens)
- **One or two switches**: **Row and column scanning, from 0.4 to 5 seconds a step, with no time limits. Space or Enter is the switch.** (range: `accessibility.md` rule 9)
- **Your view**: **Night or Day theme, large or extra-large keys, and Atkinson Hyperlegible type, made for clear letter shapes.**
- **Phones, tablets and laptops**: **On phones and tablets the whole app fits on one screen and never scrolls. Tablets work either way up. Phones work upright: held sideways, Ninth Life asks you to turn the phone and keeps your sentence.**
- Accessibility note (small, after the cards): **We build to WCAG 2.2 AA as a minimum and check it with automated accessibility, keyboard and switch tests. One known exception: on phones the app works in portrait only. Found a problem? [Open an issue on GitHub].**

Visual: a keypad where the scan highlight jumps row by row, then key by key, at a calm speed (1.2 s, the app's default). It jumps; it never slides or pulses (`design/system/README.md`, Motion).

### 6. Offline and private

- `h2`: **Offline unless you choose**
- Summary line: **Typing, the dictionary and the proof check run in your browser. After one visit the app works with no connection. No account, no cookies, no analytics, no ads.**
- Card **On your device**: **What you type, the dictionary, your saved phrases and your words. Ninth Life does not store what you say.**
- Card **Model ranking, if you turn it on**: **It is off until you turn it on in Settings. Then Ninth Life sends your keys, the dictionary words that match them, its own best guesses and the other person's last line to {provider.service} to rank the sentences. Processing is not limited to the EU. {provider.retention} Our server logs timings and counts, never your words.** (provider and retention text from `lib/rankingProvider.ts`, never hard-coded)
- Card **Voices**: **Speech uses your browser's voices. Voices marked "on this device" keep your words on the device; online voices send the text to the browser maker.**
- Card **Listen**: **Listen uses your browser's speech service. The other person's voice may be sent to the browser maker (Google in Chrome, Apple in Safari) to turn it into text, unless the browser can do it on this device. Ninth Life never receives or keeps the audio.**
- Line: **Check it yourself: the code is open, and your browser's storage shows no cookies.** with a link **Read the source code**

Visual: the real Model ranking switch, shown off, beside the second card. An "Offline. Using your dictionary." status chip (Write / Not table).

Never write in this section: "nothing is kept", "100% private", "EU only", "encrypted" (not a claim we make anywhere), or any badge-like mark.

### 7. Measured, not promised

- `h2`: **Measured, not promised**
- Lead: **We typed 866 test sentences from public AAC text collections with a simulated typist, one press per letter, using the offline dictionary that ships with the app.**
- Stat 1, **Right sentence first**: **85.6%** of sentences, with no correction (**62.4%** with word frequency alone).
- Stat 2, **Right sentence in the top 5**: **97.3%** of sentences (**92.0%** with word frequency alone).
- Stat 3, **Right word first**: **96.8%** of words, before any correction.
- Paragraph: **Every letter is still one press, so letter mode saves no key presses (−0.0% keystroke savings). With one switch it takes 3.57 scan steps per character. These figures come from a simulated typist, not from studies with people.**
- Model ranking line (replaces the current "has not been measured yet"): **Model ranking has been measured on 200-sentence samples with two models from one provider. Those numbers, and their delays, are in the full results.** No model number on the page itself (see below).
- Links: **Read the full results** → `RESULTS_URL` · **How we measured** → `METHOD_URL`

Every number, with its source:

| Number in the copy | `packages/eval/RESULTS.md` | Column | Method |
|---|---|---|---|
| 866 test sentences | lines 7-8 (test set and run) | items | [`docs/architecture/data-and-eval.md` §4](../../architecture/data-and-eval.md#4-evaluation-method) |
| 85.6% | line 18, B1 ghost | Sent top-1 | same |
| 62.4% | line 17, B0 dict | Sent top-1 | same |
| 97.3% | line 18, B1 ghost | Sent top-5 | same |
| 92.0% | line 17, B0 dict | Sent top-5 | same |
| 96.8% | line 18, B1 ghost | Word acc | same |
| −0.0% | line 18, B1 ghost | KSR (defined on line 23) | same |
| 3.57 | line 18, B1 ghost | Scan steps/char | same |
| 200-sentence samples, two models | lines 71-76 and 107 (MiniMax-M3 and MiniMax-M3.1-Flash letter runs) | `--limit 200` | same |

Implementation note: keep reading these from `RESULTS.json` at build time (`getResults()`), as `/welcome` does, so a new eval run updates the page and nobody types a number by hand. If the build cannot read the file, show "The eval results are not available in this build." and no numbers.

Why no model-ranking number on the page: the measured gain is real but narrow. On the 200-item MiniMax-M3 sample, B4 lattice+val ranks the right sentence first for 95.5% (line 86) against 84.5% for B1 offline on the same items (line 83), but p95 latency is 5,565.88 ms and 24.8% of calls ran past the route's 1.2 s deadline and would have fallen back to the offline ranking (line 86). The run also covers one provider, while the deployed provider is set by env (`lib/rankingProvider.ts`). Quoting 95.5% alone would overstate it; quoting it with every caveat would crowd the section. If the product owner wants it anyway: only when the deployed provider is MiniMax-M3, always with the sample size, the same-items offline figure, the fallback share and the link.

Do not quote: initials-mode numbers (lines 46-68, an experimental mode, not v1), latency figures (wall-clock in Node, not a browser measurement), the AACText-only subset without the Turk subset beside it (DEVPOST notes the AACText subset is optimistic), cost per 1,000.

### 8. Good to know

- `h2`: **Good to know**
- **You need to be able to spell. Ninth Life types words, not symbols, so it does not suit someone who cannot spell yet.**
- **Voices depend on your device and browser.**
- **English first.**
- **It has not yet been tested with people who use AAC.** (keep until the user-validation log says otherwise)
- **It has been checked in phone and tablet simulators, not yet on real phones and tablets.** (keep until a real-device check is recorded)
- **With model ranking on, your keys and the candidate words leave your device, as described under Privacy.**
- **It is not a replacement for an AAC device, a speech-language assessment or professional advice.**

### 9. Questions

`h2`: **Questions**. Native `<details>` items, closed by default.

- **Is it free?** Yes. There is no paid tier, no ads and no account. The code is open source under the MIT license.
- **Do I need to install anything?** No. Open it in your browser. After one visit it works offline, and you can add it to your home screen from your browser's menu. *(Check before release that "add to home screen" works in the browsers we name; the manifest exists, the install path is not yet tested on real devices.)*
- **Can the model say something I did not type?** No. Every word is turned back into keys and checked against the keys you pressed. A word that does not match is dropped. Nothing is spoken until you press Speak.
- **What does model ranking send, and to whom?** Your keys, the dictionary words that match them, Ninth Life's own best guesses and the other person's last line, to {provider.service}. It is off until you turn it on. {provider.retention}
- **Does it work without a connection?** Yes, after the first visit. The dictionary and the proof check run on your device. Model ranking and online voices need a connection; the dictionary does not.
- **Which languages?** English first.
- **Which devices?** Phones (upright), tablets (either way up) and laptops, in a current browser. It runs in your browser, so voices and Listen depend on that browser.
- **Can I use it with a switch?** Yes, with one or two switches. Space or Enter acts as the switch, and the scan speed goes from 0.4 to 5 seconds a step.
- **Is it a medical device?** No. Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment.

### 10. Free and open source

- `h2`: **Free and open source**
- Lead: **Ninth Life is free, with no paid tier, and its code is MIT licensed. The dictionary is built from open word lists and public text, credited in the repository.**
- Why it is free (from the Organic Maps pattern): **Typing, the dictionary and the voices run in your browser, so they need no server of ours. Model ranking does cost us a little per sentence; a spend limit caps it, and if it is reached the app keeps working with the offline dictionary.** (kill switch and spend cap: `privacy.md`, Always)
- Who made it: **Made for Kiroween 2026.**
- Credits (short list, full text in the repository):
  - **Word frequencies: wordfreq by Robyn Speer.**
  - **Sentence and word-pair data: AACText by Keith Vertanen and Per Ola Kristensson, and the Turk dialogues by Keith Vertanen.** (`data/NOTICE.md`; data CC BY-SA 4.0)
  - **Type: Atkinson Hyperlegible Next and Mono by the Braille Institute, SIL Open Font License.**
  - **Model ranking: {provider.company}.**
- Links: **Source code on GitHub** → `REPO_URL` · **Data sources and licenses** → `data/NOTICE.md` on GitHub · **About Ninth Life** → `/about`

### 11. Closing call to action

- `h2`: **Press a key to start**
- Line: **Free, works offline, no account.**
- Primary button: **Open the app** → `/app`

Visual: the icon's ember ninth key, still or with one slow fade-in. This is the one ember thing in view at this point of the page.

### 12. Footer

- Brand: favicon and **Ninth Life**
- Nav (`aria-label="Footer"`): **Open the app** · **About** · **Privacy** (`#privacy`) · **Accessibility** (`#access`) · **Source code**
- Line: **Code MIT. Data CC BY-SA 4.0. Fonts SIL Open Font License.**
- Intended-purpose sentence, verbatim, full width, `caption` style (`NOT_A_MEDICAL_DEVICE` from `components/Footer.tsx`, never retyped):

> Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment.

## Notes for design and implementation

These come out of the research and affect the content; the design phase owns the decisions.

- **Route.** The app's current comment says it stays at `/` because it is the PWA start URL. After the move, the manifest's `start_url` (and scope, if set) must point at the app's route so a home-screen icon opens the keypad, not the website. The service worker should cache the app route for offline use; the website can be cached too, but it must never block the app.
- **Returning visitors.** People who bookmarked `/` will now see the website. "Open the app" in the header, above the fold on every size, keeps them one tap away.
- **Motion and "rich animated visuals".** The user asked for animation; the brand asks for calm. What fits both: slow fades, the keypad demo stepping key by key, chips arriving one by one, a scan highlight that jumps. No sliding, bouncing, pulsing, flicker or fog, nothing flashing more than 3 times a second (WCAG 2.3.1), a pause control for anything that moves longer than 5 seconds (2.2.2), and a still final frame under `prefers-reduced-motion`.
- **Lighthouse.** The hero's largest element should be text (the `h1` or lead), not an image, so the page paints fast. All visuals are inline SVG and CSS from the design system; the demo data is computed at build time. No video embed and no third-party request of any kind: a demo video, if added, is a link or a self-hosted file loaded only on a press.
- **Headings and landmarks.** One `h1`, an `h2` per section, `header`, `nav`, `main`, `footer`. Skip link first.
- **Never on the page.** No phone body or recognizable phone model around the keypad, no phone-maker, keyboard-app or OS logos, no other app's UI, no pictures of people, no cartoon cat, no testimonials (none exist), no "trusted by" counts, no cookie banner.

## Checks on this draft

- **Banned claims** (`product.md`), checked line by line: no "treats", "helps recover", "rehabilitates", "restores speech" or "therapy"; no "clinically proven", "validated", "evidence-based", "approved", "certified" or "medical device" except in the verbatim intended-purpose sentence and the FAQ answer that quotes it; no claim to replace an AAC device, an assessment or advice (the page says the opposite under Good to know); no speed or keystroke-saving claim (the page says letter mode saves no key presses, from line 18); no research result presented as ours; no "AI understands you" or wording that the model decides (the copy says the person decides and only Speak speaks). No condition is named as who it is for.
- **Allowed claims used**: "free", "works offline", "runs in your browser", "every spoken word matches the keys you pressed", numbers copied from `RESULTS.md` with the method linked.
- **Honest limits** from `product.md`: literacy and spelling, voices per device, what model ranking sends and each provider's retention (through `providerCopy()`), Listen and the browser maker, not tested with people who use AAC, not yet tried on real phones and tablets. All appear under Privacy or Good to know.
- **Privacy** (`privacy.md`): no "nothing is kept", no EU-only claim, provider and retention copy from `lib/rankingProvider.ts`, browser speech described as required.
- **Trademarks**: `node scripts/tm-lint.mjs docs/research/marketing-site/structure-content.md` run on this file on 2026-11-10: "tm-lint: clean (1 file(s) scanned)". Third-party names here (Mobbin examples, Google, Apple, Chrome, Safari, Anthropic, MiniMax, Kiro, data and font sources) are within the "Fine to name" list or are research citations; none of them go into the site except the ones `trademarks.md` allows in privacy copy and credits.
