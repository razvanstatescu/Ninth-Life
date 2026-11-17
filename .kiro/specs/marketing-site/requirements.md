# Requirements: marketing-site

## Introduction
A one-page website at `/` that says what Ninth Life is, shows it working and sends people into the app,
which moves from `/` to `/app`. The page is part of `packages/web` (Next.js 15.1 App Router), statically
rendered, built on the design system, and works on phones, tablets and laptops. It has rich, animated
visuals within a bounded website motion tier, every one of which switches off for people who ask for
reduced motion. The app keeps all its behaviour (web-ui Req 1-26) at its new route and keeps working
offline.

Decisions D1-D15 in `.agents/tasks/marketing-landing/decisions.md` are binding; the trade-offs are in
`docs/decisions/ADR-006-landing-page-at-root.md`. Round 2 (2026-11-11: played sequences, How step sync and a drawing
in every feature box) adds decisions V1-V17 in `.agents/tasks/marketing-landing-v2/decisions.md` and the ADR-006
amendment of that date; it changed MS-7.3-7.5, MS-8.5 and MS-10.8 and added MS-7.7-7.10, MS-8.11-8.13, MS-10.9 and
MS-11.6. The round-2 design review (same date, decisions V18-V24) changed MS-7.2, MS-7.7, MS-7.10, MS-8.3,
MS-8.11-8.13, MS-10.8 and MS-10.9. The second round-2 review (same date, decisions V25-V31) changed the "Play line"
entry of the glossary, MS-7.3, MS-7.7, MS-7.9, MS-8.11 and MS-8.12. The third round-2 review (same date,
decisions V32-V35) changed the "Play line" entry, MS-8.11, MS-8.12 and MS-8.13. Research: `docs/research/marketing-site/`
(`repo-audit.md`, `inspiration.md`, `structure-content.md`). Final copy: `content.md` in this folder.
Steering: `product.md`, `accessibility.md`, `design-system.md`, `privacy.md`, `trademarks.md`,
`data-licenses.md`, `voice.md`, `tech.md`.

Round 3 (2026-11-12): a landing review whose product-owner answers W1-W6 are
recorded in the ADR-006 amendment of that date. The shared-primitives and theme part (W2, W3) changed MS-1.4, MS-1.5,
MS-4.4, MS-9.1 and MS-11.3 and added MS-14; other round-3 builders note their own changes here. The lower sections
(Results, Access, Privacy, Limits, Questions, Source) changed MS-3.1 (Results after the proof check), MS-4.6 (one
list of what ranking sends), MS-5.4 (caveat first, per-source line) and MS-7.7 (W1: phone stages hug their drawing).
The hero and bar (findings P1-1, P1-2, P2-1, P2-2, P2-10, W1, W4) changed MS-3.1 (the `h1` text), MS-3.3 (nav from
960px), MS-6.1, MS-6.2, MS-6.4, MS-6.7, MS-6.10, MS-7.2 and MS-11.3 and added MS-6.2a (the first phone screen) and
MS-6.11 to MS-6.14 (the try-it keypad;
W4 overturns D13 and the old MS-6.2 "the keys SHALL be an aria-hidden picture").

Round 3 polish (2026-11-13): the final review's fixes R3-P1 to R3-P10 (tasks.md)
changed MS-3.9 (the 404 page in the site look; the canonical of `/` with its trailing slash), MS-4.4 and MS-10.5 (the
footer statement in `body` type), MS-4.7 (the history line with the year), MS-5.3 (the model line names the measured
provider and models and says the provider this build uses has not been measured: a lead decision amending D14),
MS-6.10 (the keypad never moves), MS-6.12 (the try-it line after # and before any letter; chip labels), MS-9.1 (a
mid-page row after Access) and MS-14.2 (the footer is Night too, a lead decision extending W2).

Round 4 (2026-11-13): a visual and motion review with one shared language
(`design.md` "Round 4: shared language"; decisions in the round's `01-decisions.md`). The language part changed MS-7.1
(website icons in `components/site/icons.tsx`), MS-7.3 (the press ring v2 and keys on their panel), MS-8.2 (tokens
`motion-hint`, `motion-grow`, `state-hover`) and MS-8.11 (the lead's rulings: two lead columns, sequenced rows, the
proof's one play root; the product owner's PO-1: Results bars grow once), and added MS-8.14 (control feedback) and
MS-8.15 (live part entry); each other round-4 builder notes their own changes here. The end of the page (Good to know,
Free and open source, the close and the footer, after the product owner's "put the info across the site and make it
more visually appealing" and "make a better footer") changed MS-3.1 (Free and open source dissolves into the close,
the footer and `/about`; amends D12), MS-3.8 (`/llms.txt` lists the limits and the history line), MS-4.4 (the footer's
parts), MS-4.5 (Good to know as a lead and two cards) and added MS-4.5a (each limit also beside its claim), MS-4.7
(the history line in the footer of every page), MS-9.1 (the footer's "Open the app" is a secondary button) and MS-14.5
(`/about` carries Free and open source and Credits; `#top` on `/about` and the 404). How it works (the product owner's
"a total revamp, both in the way it looks, feels and works") became a three-step story row, Press, Pick and Speak:
it removed MS-8.12 (the step sync, its sticky picture and runway; A8 retired) and the How clause of MS-8.13, and
changed MS-7.4, MS-7.7, MS-7.8 and MS-10.9 for How; its row is MS-8.11's sequenced row, and it plays once (PO-2).
The proof check (the product owner's "a more visual and intuitive visual on the right, possibly animated and
coordinated with the left section") became one comparison grid with four steps beside it: it changed MS-7.6 (the
dropped letter is not on its key), MS-7.9 (drawn keys with their letters, each word's letters under its keys, the
closing lines split by state), MS-8.4 (four reveal blocks in `#proof`), MS-8.11 (the proof's play root is its whole
layout), MS-9.3 (the legend becomes the closing lines' icons), MS-10.5 (the proof's 52px keys) and MS-10.9 (head, then
figure, steps and note); it plays once (PO-2).
Measured, not promised (the product owner's "find a way to introduce more graphics and visuals ... too much raw
text") turned its figures into paired bars, a by-source chart, a presses-and-scan-steps card and model-ranking status
rows: it changed MS-5.1 (the fields read, the links, bars as long as their printed value), MS-5.3 (status rows instead
of the model line on the page), MS-5.4 (the caveat first, before the numbers, with the not-yet-tested limit) and
MS-5.5 (bars grow once; numbers stay static), and its play roots join MS-8.11 (PO-1).
The hero's keypad demo (the product owner's "too crowded, the buttons are too big, use some icons, too big in height,
find a way to remove the text from there") became a small app screen: it changed MS-6.2 (card, status line, keypad,
toolbar; no caption, no check label), MS-6.2a (the keypad's first three rows on the first phone screen), MS-6.3 and
MS-6.4 (the autoplay waits for its Stop), MS-6.7 (Hear it is an icon button), MS-6.10 (the keypad and the toolbar
never move), MS-6.12 and MS-6.13 (the result line in the live region; the "Next:" line) and MS-10.8 (the hero keys are
64px tall), and added MS-6.15 (icon buttons with visible names) and MS-6.16 (keys typed anywhere in the demo).
The three box sections, Conversation, Access and Privacy (the product owner's "research and improve visuals in these
boxes"), became a lead card and its row of cards each, drawn in the shared language: they changed MS-4.6 (the Privacy
ranking card's list is real text, and its line no longer repeats it), MS-7.2 (that list is a second exception),
MS-7.4 and MS-7.5 (the drawings and their finished frames; amends W1 for Show and Flip and V14 for model ranking),
MS-7.7 (a lead card's stage, equal stages per row, all three sections hug on phones), MS-7.8 (the switch types the
demo's first key), MS-7.10 (the ranking and voice drawings), MS-8.11 (their column leads, at most 2) and MS-10.9 (the
box grids; amends V37 and R3-P1), and added MS-12.4 (the "only three features" sentence matches the code's requests).
Round 5 (2026-11-17, the product owner's "the website feels quite long and messy … see if the same info doesn't get
explained in multiple sections … consolidate that", plus a details pass on spacing, borders and consistency): each fact
is said once. It changed MS-1.6 and MS-9.1 (the bar is fixed at the top of the window on every website page, so the
mid-page "Open the app" rows after Proof, Results, Access and Privacy are gone; the hero and the close keep the only
ember fills), MS-3.1 (order: How, Proof, Conversation, Access, Privacy, Results, Good to know, Questions, the close; the
bands still alternate), MS-4.5 (Good to know keeps three limits and three checks; its Model ranking row left) and
MS-4.5a (amended: each limit is said once, in Good to know, which now follows Results; the caveats in How and Access
and the Results caveat's people sentence are gone), MS-4.6 and MS-7.10 (what ranking sends is said once, in Privacy's
Model ranking row; the FAQ answer and the door drawings that repeated it are gone), MS-7.4, MS-7.7 and MS-10.9
(Privacy is its map, then one card of rows; no grid), MS-3.4 (five questions, the ones no section answers) and MS-9.3
(no drawn toggle in forced colours). Content: content.md "Round 5"; design: design.md "Round 5: one place for each fact".

Requirement IDs carry the `MS-` prefix so tests can name them without clashing with web-ui's numbers
(`it('MS-6.3 ...')`).

## Glossary
- **Landing page**: the page served at `/`.
- **The app**: the communication screen (`CommunicationScreen`), served at `/app`.
- **Motion on**: the visitor's browser reports `prefers-reduced-motion: no-preference` AND the page's
  boot script has set `data-site-motion` on `<html>` (which needs JavaScript).
- **Finished state**: what a section shows with no motion: the end of every drawing's sequence, every block
  fully visible, the demo showing the whole example sentence.
- **Drawing**: a decorative picture built from our own components, tokens and icons (`aria-hidden`, with the
  one exception in MS-7.2).
- **Frame**: one state of a multi-state drawing. Parts that replace each other are stacked in one box; one shows
  at a time.
- **Sequence**: the ordered changes a drawing plays once (MS-8.11), ending on its finished state.
- **Play line**: the horizontal line 30% above the bottom of the viewport. A drawing **reaches** the play line when
  its whole box is between the top of the viewport and the line, or its whole box is on screen with its top in the
  top 30% of the viewport; for a drawing too tall for that, when its whole box is on screen or its top is at the top
  of the viewport, or at most 30% of the viewport above it, with its bottom at or below the line
  (`shouldPlay` in `motion.ts`; changed 2026-11-11, V25, V32, and review B2 and N1).
- **Middle line**: the horizontal line through the middle of the viewport (MS-8.12).
- **Stage**: the `aria-hidden` box of a set (minimum) height at the top of a feature card that holds its drawing (MS-7.7).
- **Ember fill**: an element whose background is `--ember`. The logo's own ember key does not count:
  it is the brand mark, shown unchanged.
- **Viewport position**: the visible part of the page at one scroll offset.

## Requirement MS-1: Routes and links (D1, D2, D3)
**User story:** As a visitor, I want the address of the product to explain it, and the app one press away,
so that I understand what it is before I start, and people who use it get straight to the keypad.

1.1 WHEN a browser requests `/`, THE web app SHALL answer 200 with the landing page, rendered at build time
    (`force-static`).
1.2 WHEN a browser requests `/app`, THE web app SHALL serve the communication screen with the behaviour web-ui
    Req 1-26 describe for it at `/`.
1.3 WHEN a browser requests `/welcome`, THE server SHALL answer 308 with `Location: /`, AND the `/welcome` page
    file SHALL no longer exist.
1.4 THE `/about` page SHALL stay, in the website's look (round 3, W3, overturns D3): the site bar, whose brand
    link SHALL go to `/`, whose nav links SHALL go to the landing page's sections (`/#how` and so on) and whose
    "Open the app" (replacing "Back to the keypad") SHALL go to `/app`; AND its "See the demo, the measured results
    and the source code" link SHALL go to `/`.
1.5 THE app footer's "Back to the keypad" SHALL go to `/app`, AND "How Ninth Life works" in the app footer and in
    the Menu sheet SHALL go to `/` (`/about` uses the site footer since round 3).
1.6 Every "Open the app" control on the landing page SHALL be a plain `<a href="/app">` (a full document
    navigation, not a client-side route change).
1.7 No link, test helper, script, CI step or agent setting that means "the app" SHALL still point at `/`: the
    e2e `openApp` default, `axe.mjs`, `responsive.mjs`, `scripts/perf-check.mjs`, the CI readiness probe, the
    `a11y-auditor` default route and the ship-feature workflow's audit URL SHALL use `/app`.

## Requirement MS-2: Install and offline (D4, D5)
**User story:** As a person who installed Ninth Life or opened it once, I want it to open the keypad and work
with no connection, so that I can talk wherever I am.

2.1 THE manifest SHALL have `start_url` `/app`, `id` `/`, `scope` `/` and `orientation` `any`.
2.2 THE service worker precache SHALL hold the documents `/`, `/app` and `/about` and SHALL NOT hold `/welcome`;
    the rest of the precache SHALL be as web-ui Req 23.4 describes.
2.3 WHILE offline, WHEN a document is requested that is not in the cache, THE service worker SHALL answer with
    `/app`.
2.4 THE service worker SHALL register from every page, including `/`; AFTER one online visit to `/` only, an
    offline load of `/app` SHALL reach "Offline dictionary ready".
2.5 WHEN the landing page loads, the landing page document and its scripts SHALL request no file under `/data/`
    (its demo data is computed at build time); the service worker's precache downloads (MS-2.4) are exempt.
2.6 AFTER one online visit, an offline load of `/` SHALL show the landing page from the precache.

## Requirement MS-3: Structure, landmarks and metadata
3.1 THE landing page SHALL have exactly one `h1` ("Type on 9 keys. Hear your sentence.", round 3: the promise, matching
    the `<title>`; "Ninth Life" is the bar's brand and the hero's brand line) and, in this order, one section per row below,
    each with an `h2` and the `id` given: How it works `how`, the proof check `proof`, Measured, not promised
    `results`, In a conversation `conversation`, Ways to type `access`, Offline and private `privacy`,
    Good to know `limits`, Questions `faq`, the closing call to action `start`
    (round 3: `results` moved up from after `privacy`, so the numbers follow the proof check; the bands
    still alternate ground and surface from `how`, and `start` is the Night close). (Round 4, 2026-11-13;
    amends D12: Free and open source `source` is no longer a section: its facts are the close's facts row, its
    links and the history line are in the footer, and "Why it is free" and the credits are on `/about`, word for word,
    content.md §10.)
3.2 THE first focusable element SHALL be "Skip to content", which moves focus to `<main id="main">`; THE banner
    (`<header id="top">`) SHALL hold the brand link, the Main navigation, the header "Open the app" and the hero;
    `<main>` SHALL hold sections `how` to `start`; `<footer>` SHALL follow `<main>`; no content SHALL sit outside
    these landmarks except the skip link.
3.3 THE Main navigation SHALL link to `#how`, `#proof`, `#access`, `#privacy` and `#faq`; WHILE the viewport is
    narrower than 960px (round 3, W1; was 720px), OR is landscape and at most 500px tall, THE navigation links SHALL be
    hidden AND the header "Open the app" SHALL stay visible; THE bar SHALL be one row at every width from 320px, AND
    under 352px the brand link SHALL show its icon only, its name kept as the link's accessible name.
3.4 THE questions SHALL be native `<details>` elements with the question as `<summary>`, all closed when the
    page loads, opened and closed with a press, Enter or Space, with no script.
3.5 THE page SHALL set the title, description and Open Graph and `twitter:card` tags of `content.md`, `lang="en"`,
    no `keywords` tag and no `noindex`; `/robots.txt` SHALL allow every user agent.
3.6 (Round 3, 2026-11-12) WHERE the build knows the site origin (`SITE_URL`, else
    `VERCEL_PROJECT_PRODUCTION_URL`), `/`, `/about` and `/app` SHALL each set their own canonical link and `og:url`,
    every page SHALL carry the social card (`og:image` 1200x630 PNG with alt text, `twitter:card`
    `summary_large_image`), `/robots.txt` SHALL name `/sitemap.xml`, and `/sitemap.xml` SHALL list `/`, `/about` and
    `/app`; WHERE it does not, no page SHALL emit an absolute URL and `/sitemap.xml` SHALL answer 404.
    `/robots.txt` SHALL keep one `*` group that allows every crawler, AI crawlers included (W5).
3.7 (Round 3) WHERE the origin is known, `/` SHALL include one JSON-LD `@graph` with WebSite, WebApplication and
    FAQPage built from the copy the page shows (the definition, the intended-purpose sentence, the FAQ list
    `Faq.tsx` renders) and SHALL name no person or maker (W6).
3.8 (Round 3) `/llms.txt` SHALL be plain-text Markdown with an H1, the definition, the intended-purpose sentence,
    links, the measured numbers with the results and method linked, what model ranking sends and the FAQ, all from
    the same values the pages use. The layout description, the manifest, the JSON-LD, `/llms.txt` and the README
    SHALL use one definition sentence (`content.md` "Page metadata") word for word. (Round 4, 2026-11-13)
    `/llms.txt` SHALL also list every limit of Good to know (`LIMITS`, the list `Limits.tsx` renders) and state
    the history line (`HISTORY_LINE`, MS-4.7).
3.9 (Round 3) `/about` and `/app` SHALL have their own title and description (`content.md`); `/app` SHALL have
    one `h1`; an unknown URL SHALL answer 404 with one `<title>`, `noindex` and links to `/` and `/app`; the first
    paint of `/app` SHALL NOT shift when the layout is chosen (Lighthouse mobile CLS at most 0.1 on `/app`).
    (R3-P5, 2026-11-13) The 404 page SHALL use the site look (Night in both themes, `SiteBar`, the site
    type, a `.site-cta` row, `SiteFooter`), its own title "Ninth Life: page not found" and its own description.
    (R3-P9) With a known origin, the canonical and `og:url` of `/` SHALL be `${origin}/` with the trailing slash, the
    URL the sitemap and the JSON-LD use; so the layout sets no `metadataBase` and the pages write absolute URLs.

## Requirement MS-4: Copy and claims
**User story:** As a visitor, I want plain, honest words, so that I know what the tool does and what it does not.

4.1 THE landing page SHALL show the copy in `content.md`, in sentence case, with plain verbs, digits for numbers
    and no exclamation marks.
4.2 THE page SHALL NOT make any claim on the banned list in `.kiro/steering/product.md` (treatment, recovery,
    therapy; clinical proof, validation, approval, certification, medical device except in the
    intended-purpose sentence; replacing an AAC device, an assessment or advice; numbers not measured by
    `packages/eval`; research results as ours; a model that understands or decides), AND SHALL NOT name a
    condition or diagnosis as who it is for.
4.3 THE page, its file names, identifiers, comments and alt text SHALL contain none of the words listed in
    `.kiro/steering/trademarks.md` (`node scripts/tm-lint.mjs` clean), no device brand or model name, and no
    drawing of a phone body, a recognizable phone model, a maker's, keyboard app's or operating system's logo,
    another app's UI or a person.
4.4 THE footer SHALL show the intended-purpose sentence verbatim from `NOT_A_MEDICAL_DEVICE` in `body` type (R3-P8,
    2026-11-13: was `caption`; it is the page's one legal statement and text is 16px or more),
    AND the answer to "Is it a medical device?" SHALL be "No. " followed by the same constant. ON `/about` the
    sentence SHALL appear exactly once, in its "What Ninth Life is not" note card, and the footer SHALL leave it
    out (round 3). (Round 4, 2026-11-13) THE site footer SHALL hold, in this order: the brand with the
    promise "A free web app for typing to talk." and a secondary "Open the app"; one Footer navigation of three
    groups, each an `h2` and a list (Product, Trust, Project, content.md §12), in which every in-page anchor exists on
    its page and every link that leaves the site carries the external icon beside its word; then the statement (as
    above), the history line (MS-4.7), the licence line in `caption` and "Back to top" to `#top`. It SHALL be the same
    component on `/`, `/about` and the 404, so "Report a problem" sits in the same place on every page (WCAG 2.2 SC
    3.2.6).
4.5 THE "Good to know" section SHALL list every honest limit in `content.md` §8 AND SHALL come before Questions
    and the closing call to action. (Round 4, 2026-11-13) Its lead SHALL be the not-a-replacement limit;
    then two cards: "Before you start", a row per limit with its icon in a tile, a key and the approved sentence word
    for word; and "Testing so far", a row per check with its state in words, "Done" (solid edge and a check) or "Not
    yet" (dashed edge), never by colour alone, then the invitation to help test it. No limit SHALL be hidden behind a
    closed control.
4.5a (Round 4, 2026-11-13; research: FTC .com Disclosures, proximity) Each limit SHALL also be said beside
    the claim it qualifies, in the shared `.site-caveat` line (an info icon and the sentence in ink, never fainter than
    its claim): the spelling and language limits under the How it works row, "not yet tested with people who use AAC"
    in the Results caveat note, the simulator limit in Access's "Phones, tablets and laptops" card (content.md §8 names
    the exact lines); voices, model ranking and the not-a-replacement limit already sit by their claims.
4.6 Provider names and retention text SHALL come from `providerCopy()`, never typed into the page; every place on the
    website that says what model ranking sends (Privacy, Good to know, Questions, `/about`, `/llms.txt`) SHALL list the
    four `RANKING_SENT` items, in running text through `rankingSentText()` (round 3). (Round 4, 2026-11-13;
    decisions §2 "Boxes") In Privacy the list SHALL be the one real-text line "Sent to rank: {rankingSentText()}."
    drawn at the top of the Model ranking card's stage and placed after the card's `h3` in the DOM (MS-7.2), AND the
    card's line SHALL NOT repeat the list ("It is off until you turn it on in Settings. Then Ninth Life sends these to
    {provider.service} to rank the sentences."); the region, the retention and the log line SHALL be `.site-fact` rows
    in a note card under the grid.
4.7 THE page SHALL say "Made for Kiroween 2026." AND SHALL
    NOT say "Built with Kiro" or "Model ranking has not been measured yet" (R3-P7 may say that the one provider this
    build sends ranking to has not been measured, when RESULTS.md has no run of it). (Round 4, 2026-11-13) The line
    SHALL come from one constant (`HISTORY_LINE`, `site-data.ts`) and SHALL be shown in the site footer, so every page
    of the website says it (`/`, `/about`, the 404), and in `/llms.txt`; the Source section that held it is gone
    (MS-3.1). Its text is the one sentence above.
4.8 Browser makers (Google, Apple, Chrome, Safari) SHALL appear only as plain words in the Listen privacy copy.

## Requirement MS-5: Numbers (D14)
5.1 THE eval numbers on the page SHALL be read at build time from `packages/eval/RESULTS.json` (configs B0 and B1
    with status `ok`), formatted with one decimal, AND links to `RESULTS.md` ("Read the full results") and the
    method ("How we measured") SHALL sit in the same section. (Round 4, 2026-11-13: each measure SHALL
    show B1 with B0 beside it, word accuracy included, as paired bars whose length is the printed value (`barShare`)
    on a full track from 0, the value and its label as real text beside each bar; the word measure SHALL say its
    denominator, B1 `words`, when RESULTS.json has it; the presses figure SHALL be B1 `pressesPerChar` ("1.00 key
    presses per character", RESULTS.md's "Letter-mode B1 needs 1.00 presses per character") instead of the KSR, with
    the KSR sentence only as a fallback; the links SHALL be "Full results" and "How we measured", as `.site-go`
    links that leave the site.)
5.2 IF `RESULTS.json` cannot be read, or B0 or B1 is missing or not `ok`, THEN THE section SHALL say "The eval
    results are not available in this build." AND SHALL show no number.
5.3 THE page SHALL show no accuracy, latency or cost number from a model run (R3-P7, 2026-11-13, lead decision,
    amends D14: it SHALL name the provider and the models that were measured, and SHALL say when the provider this
    build sends model ranking to, `rankingProvider()`, has not been measured; `/llms.txt` the same); WHEN
    `RESULTS.llm.json` holds at least one letter-mode run of a known model whose B4 config is `ok`, AND every such
    run's model belongs to the same provider, THE section SHALL show the model line of `content.md` §7 with the
    sample sizes and the model count read from that file; OTHERWISE it SHALL show no model line. (Round 4,
    2026-11-13: on the page the model line becomes status rows from `modelStatus()`, an icon and a status
    word on each: "Measured" with the models, the sample sizes and how often a reply came too late, then "Not
    measured yet:" with the provider this build uses, while it is not the measured one. `/llms.txt` keeps the line,
    `modelRunsLine`, from the same values.)
5.4 THE sentence "These figures come from a simulated typist, not from studies with people." SHALL appear with
    the numbers (round 3: first under them, in a note card, with the contamination caveat). A per-source line MAY
    show B1's right-sentence-first for each test source, read from `RESULTS.json` (`bySource`, RESULTS.md "By
    source") by `getResults()`, and only while both sources are there. (Round 4, 2026-11-13: the caveat
    SHALL come first, after the section title and before any number, as a `.site-caveat` with the info icon: the
    sentence in bold, the overlap caveat, and the limit "The app has not yet been tested with people who use AAC.";
    the per-source split is a bar chart with each source's item count, from `bySource`.)
5.5 Numbers SHALL be static text: never counted up, animated or revealed digit by digit. (Round 4, 2026-11-13
    ; the product owner's PO-1: a Results bar MAY grow once from its start edge, MS-8.11; the number beside
    it stays still, real text from the first frame.)

## Requirement MS-6: Hero and keypad demo
**User story:** As a visitor, I want to see the keypad work on the first screen, so that I understand one press
per letter without reading.

6.1 THE hero SHALL use the Night theme in both themes AND SHALL show, in this order, the brand line (the icon
    `/icons/icon.svg`, 48px on phones and 64px from 600px, beside "Ninth Life"), the `h1` (the promise, at the `display`
    scale, 36 to 56px), the lead (starting "A free web app for typing to talk."), the primary "Open the app" (the ember
    fill of its viewport) with the link "See how it works" beside it, and the note "Free. Works offline. No account."
    under them (round 3: P1-1, P2-2).
6.2 THE server HTML SHALL show the demo's finished frame (the whole example sentence, its digits and a `match`
    chip per word); every sentence the example shows SHALL be output of the offline decoder on the shipped
    dictionary at build time (`decodeGhost`, and `Lexicon.completions` for the word being typed); top to bottom the
    demo SHALL show the sentence bar, the chips that check it, their label "Checked against the keys." with a link to
    `#proof`, the keypad, a visible caption of the example, then Clear and the play button last (round 3, P2-1; the
    keys are real buttons since W4, MS-6.11). (Round 4, 2026-11-13: replaces the order.) Top to bottom the
    demo SHALL show the sentence card, which shows the sentence as one `ProofChip` per word with each word over its keys
    (the example's words and digits shown once, together), one status line, the keypad, and the toolbar: "Play the
    example" ("Stop" while it plays), "Hear it" and "Clear" as icon buttons (MS-6.15). It SHALL show no caption and no
    check label (the proof check section explains the check); the example's words are the keypad's description for
    screen readers. The status line SHALL show "Press the keys to try it." in the example, only once the keys work
    (never in the server HTML).
6.2a ON a 390x844 portrait screen the demo's sentence bar, its chips and their label SHALL be visible without
    scrolling, AND on 320x640 the sentence bar SHALL start inside the first screen (round 3, W1, P1-2). (Round 4,
    2026-11-13) ON a 390x844 portrait screen the sentence card AND the keypad's first three rows SHALL be
    visible without scrolling, AND on 320x640 the card SHALL start inside the first screen.
6.3 WHEN motion is on AND the demo has been at least 60% in view for `motion-autoplay-delay` (1,200 ms) AND the
    page is visible AND the visitor has not pressed Play or Stop, THE demo SHALL play the example once; it SHALL
    never play on its own again during that page view and SHALL never loop. (Round 4, 2026-11-13) The
    autoplay SHALL also wait until the demo's toolbar, with its Stop, is wholly on screen (MS-8.9's visible Stop), AND
    an automatic play SHALL stop on the finished frame when the toolbar leaves the screen.
6.4 WHILE the demo plays, its button SHALL read "Stop"; WHEN Stop is pressed, OR the demo falls under 10% in
    view, OR the page is hidden, OR the reduced-motion preference becomes `reduce`, OR the visitor presses a key
    (round 3, MS-6.14), THE demo SHALL stop and show the finished frame. (Round 4) The button's name SHALL be "Play the
    example" before and after a play (no "again"), with a replay icon, and "Stop" with a stop icon while it plays.
6.5 WHILE the demo plays, THE key being pressed SHALL show the pressed ring (an inner ember ring), never the lit
    style or an ember fill; one key at a time; the sentence and digits SHALL change in jumps, with no typing
    caret.
6.6 WHEN a play that the visitor started finishes, THE demo SHALL announce "Typed {codes}. Ninth Life shows:
    {sentence}." in a polite live region; an automatic play SHALL announce nothing.
6.7 "Hear it" SHALL appear only where the browser has speech; while the demo plays it SHALL be `aria-disabled`,
    stay focusable in the Tab order and ignore presses (review R3-N6); AND it SHALL
    speak the finished sentence (or the visitor's sentence, MS-6.12) only on a press, synchronously in the handler, with `lang` `en` and a voice from
    `pickVoice` (on-device first); no voice name SHALL be shown. (Round 4, 2026-11-13) "Hear it" SHALL be
    the toolbar's middle icon button (speaker icon, the filled variant); without speech its cell stays empty, so Play
    and Clear keep their places.
6.8 WHILE motion is off, THE demo SHALL NOT play on its own; "Play the example" SHALL still replay it in jumps.
6.9 WHEN motion is on, THE ember ring on key 9 (the ninth key) SHALL fade in once per page view,
    `motion-fade-slow` (900 ms) after `motion-delay-arrival` (300 ms), and SHALL NOT fade in again after a play of
    the demo; the moon glow behind the hero SHALL fade in once over `motion-fade-slow`; WHILE motion is off they
    SHALL show at once, AND neither SHALL fade in later when the reduced-motion preference changes back to
    `no-preference`. THE `h1`, the lead and the icon SHALL never be animated.
6.10 THE demo box SHALL keep its size while it plays, so nothing on the page moves (no layout shift); WHILE the
    visitor types (MS-6.12) the keypad SHALL NOT move until the visitor's sentence or chips outgrow the finished
    example's. (R3-P1, 2026-11-13: replaces the "until" clause.) THE keypad, Clear and Play SHALL NOT move
    at all while the visitor types, after Clear and for any length of sentence, at every width from 320 to 1920px in
    Chromium and WebKit: the empty text is body size on one line; the sentence and the keys are one line each that
    shows its end; the chips are one reserved row with the last 3 words' chips; the caption keeps at least 3 lines (or
    the example caption's height) and the try-it line is held to 3 lines. (Round 4, 2026-11-13: replaces
    the list.) THE keypad and the toolbar SHALL NOT move at all while the demo plays, while the visitor types, after
    Clear and for any sentence, at every width from 320 to 1920px in Chromium and WebKit: the card keeps one height (two
    chip lines, or up to three lines of its hints); its chips are one line that shows its end, with the last 3 words'
    chips; the status line is one line.
6.11 (Round 3, W4, 2026-11-12; overturns D13) THE hero's 12 keys SHALL be real buttons in a group labelled
    "Keypad, try it", each named as the app names its key, with one Tab stop for the group (the arrow keys move between
    keys) and the design system's visible focus ring; AND nothing for trying it SHALL load before the first press: the
    engine (`components/site/try-engine.ts`) SHALL be reached only by a dynamic `import()` on the first press or Clear,
    and the dictionary only by the app's own `loadDictionary()` after it, so the first load's bytes (MS-11.2) and
    MS-2.5 (no request under `/data/` while loading, scrolling or playing) are unchanged.
6.12 WHEN the visitor presses keys (touch, mouse, Enter or Space on a key, or a digit, `*`, `#` or Backspace typed while
    a key has focus), THE demo SHALL show the app's own composer and offline decoder result for those keys: the top
    sentence in the well with its digits, a ProofChip per word, and, in the caption, "Keys {codes} match: {up to 3
    sentences}." — only sentences whose every word matches the keys (R3-P4: the matches for the keys alone, so after
    `#` the list stays whole and the sentence on show is marked "(shown)" when it is not the first; no second full
    stop after a match that ends in punctuation; R3-P8: a 1, 0 or # before any letter gets its own line, and each chip
    writes its word as the sentence does, "I", from the app's tokens); `*` and Backspace go back, `0` is space, `#` moves
    the last word to its next reading, Clear empties the keys; "Hear it" SHALL speak the visitor's sentence only when
    every word matches, and stay `aria-disabled` otherwise. The copy SHALL say the words match the keys and SHALL NOT
    claim that anything understands the visitor (MS-4.2). IF the dictionary cannot load, THEN the keys SHALL still
    show and the caption SHALL say so. (Round 4, 2026-11-13: there is no caption.) The result line SHALL
    be the live region's (MS-6.13); the card SHALL show the chips, or, while no word is typed, the R3-P8 answers and
    "Press a key to start." (adding "Your keyboard works too." with a fine pointer); the status line SHALL show "Next:
    {readings}", the readings `#` gives next for the last word, at most 2, in that order, when it has any, or the
    decoder's state in a few words ("Loading the offline dictionary.", "No sentence matches yet.", "The dictionary did
    not load.").
6.13 THE result line SHALL be read in the demo's polite live region once typing pauses (400 ms), the same words as the
    visible caption; WITH reduced motion nothing in trying it SHALL animate. (Round 4) The live region is the result
    line's only place (there is no visible caption).
6.14 THE example and pressing SHALL coexist this way: before any press the finished example shows (MS-6.2) and may
    autoplay once (MS-6.3); a press stops a running play on its finished frame without an announcement and ends the
    autoplay for the page view; "Play the example" clears the visitor's keys and plays the example (MS-6.4 labels).
6.15 (Round 4, 2026-11-13) THE toolbar's controls SHALL be icon buttons (`.site-icon-btn`): a 56px target
    drawn as a 48px circle, at least 8px from the next target, in DOM and Tab order Play the example, Hear it, Clear,
    each centred under a key column; each SHALL carry its name as its own text in a tooltip (`.site-tip`) that shows on
    hover (pointer devices only) and on keyboard focus, never covers a key or another control, and hides on Escape
    (WCAG 1.4.13), so its accessible name is the word on screen (WCAG 2.5.3); icons from `Icon.tsx` and
    `components/site/icons.tsx`, never ember. "Clear" SHALL be `aria-disabled` (focusable, ignoring presses) while there
    is nothing to clear.
6.16 (Round 4, 2026-11-13) WHILE focus is anywhere in the demo (a key or a toolbar button), digits, `*`, `#`
    and Backspace typed on a keyboard SHALL press the keys (the arrow keys move only inside the keypad; Enter and
    Space stay the focused control's); AND after a pointer press in the demo, until a pointer press anywhere else, the
    same keys typed while nothing has focus and the demo is on screen SHALL press the keys too (Safari does not focus a
    clicked button), so typing on a keyboard goes on in every browser; focus SHALL never be moved by script (a mouse
    click shows no focus ring), and no key typed into another control SHALL be taken.

## Requirement MS-7: Drawings
7.1 THE body sections SHALL illustrate with drawings built from `nl-` component classes, tokens and
    `components/Icon.tsx`, as HTML and inline SVG: no raster image, no video, no third-party asset. (Round 4,
    2026-11-13: website-only icons, in the same style, come from `components/site/icons.tsx`; the app's
    icons still come only from `components/Icon.tsx`.)
7.2 Every drawing SHALL be `aria-hidden` (the hero keypad is not a drawing since W4, MS-6.11), except the proof
    figure's ProofChips and its two closing lines (MS-7.9),
    which are the figure's accessible content; every drawing SHALL contain nothing focusable and repeat nothing the
    section's text does not also say. (Round 4, 2026-11-13; decisions §2 "Boxes") The second exception:
    what model ranking sends, "Sent to rank: {rankingSentText()}." (MS-4.6), SHALL be real text drawn at the top of the
    Model ranking card's stage AND placed after the card's `h3` in the DOM (so a heading reader meets it under its
    heading); the stage SHALL hold only an `aria-hidden`, invisible copy of it, which keeps its room in the drawing.
7.3 A drawing SHALL NOT use an ember fill; ember SHALL appear in drawings only as the pressed ring (the Key's
    3px inner ember ring, on a drawn key, a drawn computer key or a drawn button) or as the scan ring (the
    Keypad's `is-scanning` ember and plum ring), AND a drawing SHALL show at most one ember ring at any moment; a
    handover, one ring fading out over `motion-jump` while the next fades in over the same time, counts as one ring;
    AND WHEN a drawing shows the same key pressed twice in a row, THE second press SHALL be its own ring, starting
    `motion-jump` after the first has gone, so each press shows once. (Changed 2026-11-11; the handover and repeated
    press rules added after the second design review, V29.) Round 4 (2026-11-13; decisions §1.3): on a
    drawn button or a drawn computer key THE pressed ring SHALL cover the control's 2px edge and carry a 2px plum
    line inside it, so ember always sits on plum (in Day an ember ring on white is 1.7:1); a key drawn outside a
    keypad SHALL sit on its panel (`--panel` with `--lift`), never straight on a stage (in Night the stage is plum,
    the key's own fill); AND a row of cards SHALL show at most one ember ring at any moment.
7.4 THE page SHALL have these drawings (changed 2026-11-11, decisions V2-V16 in
    `.agents/tasks/marketing-landing-v2/decisions.md`; parts and steps in `design.md` "Round 2"): How it works (one
    app screen with a sentence well, a drawn Speak, up to three sentence rows and the keypad, acted on by the three
    steps), the proof check (MS-7.9), and in the box sections They said, Show and Flip, Saved phrases, Spell and My
    words, Keyboard, Touch, One or two switches, Your view, Phones tablets and laptops, On your device, Model
    ranking, Voices and Listen. (Round 4, 2026-11-13, How it works: three scenes, one per step stage:
    keypad rows 1 and 2 with the keys 4 6 6 3 pressed and their digits; the app's "Offline dictionary ready" pill and
    the top 3 sentences with the pick moving to "Home"; the sentence card with Speak, pressed once to read Speaking,
    and Show. No full keypad and no typing well: the hero shows both.) (Round 4, 2026-11-13, the box
    sections: the same thirteen drawings, redrawn in the shared language with a still arrow from each cause to its
    result; They said is Listen pressed, their line arriving and the reply forming; Privacy's are a map of this
    device (a dashed outline with what stays inside and its three ways out on its edge) and one drawing per way out.)
7.5 THE finished state of every drawing SHALL be what its base styles show with no animation: the end of its
    sequence. (Changed 2026-11-11.) THE finished states of Show and Flip, Saved phrases and Spell and My words SHALL
    show the before and the after together (the upright card above the turned one; the pressed Save phrase above the
    list; the New chip and Add to my words above the Matches chip), so a still frame tells the whole story. (Round 3,
    2026-11-12; W1, amends V5-V7.) (Round 4, 2026-11-13: Show and Flip's finished frame SHALL
    show the turned card between the table's two edges, "The person opposite" and "You", with Done and Flip upright,
    instead of the small upright card (amends W1 for this drawing); Model ranking's SHALL show the switch On with "Off
    until you turn it on" in words and an arrow to what is sent (amends V14's two rows); the switch drawing's SHALL show
    key 4 in the scan ring and the word it typed; They said, Saved phrases, Spell and My words and the three ways out
    in Privacy SHALL show a still arrow from the cause to its result.)
7.6 THE proof example SHALL be computed at build time with `encodeWord`: the keys are the code of "water", the
    matches are the words whose code equals the keys, and the dropped word's code SHALL differ from the keys.
    (Round 4, 2026-11-13) The drawn keys' letters SHALL come from `KEY_LETTERS` (`@ninth/core`), every
    word SHALL have one letter per key, AND the dropped word's letter at the first differing column SHALL NOT be one
    of the letters of the key pressed there; otherwise `getProofExample()` throws and the build fails.
7.7 Every card in the sections `conversation`, `access` and `privacy` SHALL begin with an `aria-hidden` stage that
    holds one drawing; stages in one section SHALL have the same height (in `access`: stages in one row, the switch
    card's row taking the switch stage's height), set from tokens; below 600px (one card per row) the `access` and
    `privacy` stages SHALL hug their drawing with `space-3` above and below, 24px in all (round 3, W1); each How it works step card SHALL hold a stage of a set height from tokens below 1024px;
    AND no drawing SHALL be larger than its stage, and no part of the desktop How picture or the proof figure SHALL
    overflow its box, at any width from 320 to 1920px or with the XL key setting; text in a drawing SHALL NOT wrap
    where its design gives one line (the How well's "Press a key to start", in `label` type, stays on one line at
    320px and at 1024px); AND a width overflow SHALL be fixed by narrowing the drawing's boxes and gaps, never its
    text. Stage heights SHALL be minimums, so under the WCAG 1.4.12 text-spacing overrides a stage grows instead
    of cutting its drawing off. (New 2026-11-11; How stages, the desktop picture and the proof figure added after the
    design review; the one-line and width rules after the second review, V27, V31; heights as minimums after the
    round-2 review, N8.) (Round 4, 2026-11-13, How it works: each step's stage SHALL hug its scene with
    `space-3` above and below under 1024px and SHALL be `--stage-m` (a minimum) in the row from 1024px, the three
    equal; the desktop How picture and the "Press a key to start" one-line clause are gone with them.) (Round 4,
    2026-11-13, the box sections: each section's first card SHALL be its lead card, across the grid, with
    a stage of at least `--stage-l` from 600px; THE other stages in one row SHALL have the same height (`--stage-m`
    minimums in Conversation and Privacy, `--stage-s` in Access; the row's cards share its lines), the lead card
    keeping its own; a drawing SHALL keep `space-4` clear of its stage's sides (`space-2` under 360px) and, from 600px,
    above and below; AND below 600px every box stage in all three sections SHALL hug its drawing with `space-3` above
    and below.)
7.8 THE How it works example and the Spell and My words example SHALL be computed at build time: the How drawing
    SHALL show the keys `4663`, the decoder's well text after each press and its top 3 sentences, one of which is
    "home"; the Spell drawing SHALL show "Mihai" with `encodeWord('mihai')`; IF the dictionary is loaded AND "home" is
    not in the top 3 for `4663`, OR "mihai" is in the shipped dictionary, OR a code differs, THEN the build SHALL fail.
    (New 2026-11-11. Round 4, 2026-11-13: the How drawing no longer shows the well text after each press;
    it shows the keys 4663 and the top 3, in the app's sentence case.) (Round 4, the switch drawing: it SHALL type the
    demo's first press, key 4, and show its word as the demo's chip writes it ("I", `getDemoData().steps[0]`); IF the
    demo ever starts on another key, the drawing keeps key 4 with its digit only and a unit test fails, so the page
    never breaks while the demo changes.)
7.9 THE proof figure SHALL keep each word in its own row for the whole sequence: each row SHALL hold the word's
    chip and, `aria-hidden`, its letters over their key digits in the same five columns as the "Your keys" digits,
    with the differing digit of the dropped word boxed and marked with an x; its finished state SHALL show the real
    ProofChips, the line "Can be spoken: {matches}. Never spoken: {reject}." and the line "\"{reject}\" is {code}. Your
    keys are {keys}." (round 3, P2-7; was the longer "For example" sentence), outside
    `aria-hidden`; the column box that steps across the columns SHALL be drawn inside each digit line (the caption's
    and each row's) and SHALL never cover a chip; THE caption's accessible text SHALL be exactly "Your keys:
    {proof.keys}" with its visible digit grid `aria-hidden`; AND the figure SHALL have no frame labels. (New
    2026-11-11; the column box rule added after the design review, the caption rule after the second review, V31.)
    Round 4 (2026-11-13; amends round 3's P2-7 and P3-3) replaces the rows above. THE proof figure SHALL be
    one grid in which a word's letters always sit under the key that types them:
    - a "Your keys" line of five drawn keys on one keypad panel, each with its digit and its letters (MS-7.6), 52px
      wide (the lead's exception to 64px: five keys in a row at 320px), with `label` text;
    - then one row per word: its ProofChip (the first column from 600px, its own line above the letters below 600px)
      and, `aria-hidden`, its five letters in the five key columns;
    - the dropped word's letter at the first differing column SHALL be boxed in `--proof-reject` and marked with an x
      under it;
    - the column box that steps across the five columns SHALL be drawn inside each line (the keys' and each word's)
      and SHALL never cover a chip;
    - its finished state SHALL show the real ProofChips and, outside `aria-hidden`, two closing lines, each led by its
      chip's icon (`check`, `x`; `aria-hidden`): "Can be spoken: {matches}." and "Never spoken: {reject}.
      \"{reject}\" is {code}. Your keys are {keys}." ("never spoken" once in the figure);
    - THE caption's accessible text SHALL stay exactly "Your keys: {proof.keys}", with its visible line `aria-hidden`;
    - the figure SHALL have no frame labels.
    THE section's legend is gone: the closing lines are the chips' legend (MS-9.3).
7.10 THE Model ranking drawing SHALL list exactly the items of `RANKING_SENT` in `lib/rankingProvider.ts`, with no
    count and no provider name, AND each item SHALL match a field the model-ranking request carries that holds
    visitor data, in this order: "Your keys" `codes`, "The dictionary words that match them" `lattice`, "Ninth
    Life's own best guesses" `beams`, "The other person's last line" `context.partner` (the protocol fields `v`,
    `lang`, `mode` and `k` carry no visitor data and are not listed; `context.recent` SHALL stay empty); THE Voices
    drawing SHALL use the voice picker's label format with the generic name "Voice" and the wording of the Settings
    help text ("keep your words on the device", "send the text to the browser maker") and SHALL name no browser
    maker. (New 2026-11-11.) (Round 4, 2026-11-13; decisions §2 "Boxes") The items SHALL be the card's
    real text "Sent to rank: {rankingSentText()}." (MS-4.6, MS-7.2), in that order, with no count and no provider name;
    the drawing SHALL show the switch row "Model ranking" going from Off to On on the edge of this device's dashed
    outline, "Off until you turn it on" inside it, and an arrow out. The privacy drawings SHALL draw this device as a
    dashed outline whose only ways out are model ranking, online voices and Listen; THE Voices drawing SHALL show no
    voice as the default (`pickVoice` may choose an online voice); no lock, shield or badge SHALL be drawn.

## Requirement MS-8: Motion (website tier, D6, D6.1; ADR-006)
**User story:** As a visitor who may watch a screen for a long time, or who finds motion tiring, I want the page
to be lively only in calm ways and completely still when I ask, so that it is safe to look at.

8.1 THE landing page SHALL animate only WHILE motion is on; the view-transition cross-fade (8.6) SHALL depend only
    on `prefers-reduced-motion: no-preference`. The design system's own state transitions on controls
    (`components.css`: `.nl-key`, `.nl-candidate`, `.nl-btn`, 120 ms, already inside `no-preference`) are exempt.
8.2 Every duration, delay, distance and easing SHALL come from the motion tokens in `design/system/tokens.json`
    (`--motion-*`). (Round 4, 2026-11-13: `motion-hint` 4px and `motion-grow` 600ms join them; the
    hover layer's opacity is `state-hover`, 0.08, in the new `state` group.)
8.3 THE page SHALL NOT animate the logo and SHALL NOT pulse, blink, bounce, flicker, fog, parallax, marquee, type
    out text, count up numbers, loop any animation or flash (WCAG 2.3.1); it SHALL use no animation library, no
    SMIL and no third-party file. A drawn keypad's state changing once per drawn key press (the hero demo and How it
    works step 1: the well text and its digits after each press) is not typing out text.
8.4 WHEN motion is on AND a block marked `data-reveal` first comes into view, THE block SHALL fade in over
    `motion-fade` while moving up by at most `motion-reveal-distance` (16px), once per page view; blocks already
    in view or above it when the page becomes interactive SHALL show at once; a block with focus inside SHALL
    always be fully visible, AND a block that receives focus before it is revealed SHALL then stay visible with
    no reveal animation; the marked blocks SHALL be the ones `design.md` A4 lists, AND no marked block SHALL sit
    inside another marked block; the hero, the closing call to action, logos, the `h1`, the lead and the footer
    SHALL NOT be marked.
8.5 THE page SHALL NOT use scroll timelines (`animation-timeline`, `animation-range`, `view-timeline`,
    `scroll-timeline`, `timeline-scope`), AND SHALL NOT capture, snap or smooth the scroll or listen to scroll
    events in script; drawings move only as MS-8.11 and MS-8.12 describe. (Changed 2026-11-11, ADR-006 amendment.)
8.6 WHEN `prefers-reduced-motion` is `no-preference` AND the browser supports cross-document view transitions,
    a navigation between `/`, `/app` and `/about` SHALL cross-fade over `motion-crossfade` (250 ms); WHEN it is
    `reduce`, no view transition SHALL run.
8.7 WHILE motion is off (reduced motion, no JavaScript, or no support), every section SHALL show its finished
    state, AND `document.getAnimations()` SHALL be empty once the page has loaded and been scrolled to the end.
8.8 WHEN the reduced-motion preference changes to `reduce` while the page is open, THE page SHALL stop every
    animation and show every finished state at once.
8.9 Anything that moves on its own for more than 5 seconds SHALL have a visible Stop (only the demo does).
8.10 Animations SHALL change only `opacity` and `transform`.
8.11 WHEN motion is on AND a drawing marked `data-play` first reaches the play line (30% above the bottom of the
     viewport; "reaches" as the glossary defines it: its whole box between the top of the viewport and the line,
     or on screen with its top in the top 30%; for a drawing too tall for that, its whole box on screen or its top
     at the top of the viewport, or at most 30% of the viewport above it, with its bottom at or below the line),
     THE drawing SHALL play its sequence once:
     each change SHALL fade over `motion-state` with at most `motion-nudge` of rise, OR, for rings, scan highlights
     and marks, jump over `motion-jump`; no change SHALL come earlier than the lead, `motion-play-lead` plus
     `motion-frame` for each column before the card's column in its row (at most 2 since round 4), plus, for a card whose row
     neighbour's ember rings last longer, the time those rings take (Touch: 4 × `motion-frame-quick`), so no two
     ember rings in a row show together (MS-7.3; changed after the round-2 review, N7), after the trigger, AND every
     change SHALL come a whole number of steps after the lead (t(k) = lead + k × step length; a repeated press's
     ring, MS-7.3, adds `motion-jump`); the last change SHALL come at most 4,000 ms after the trigger; AND THEN the drawing SHALL show its finished state with no
     animation left running or filling on its parts (drawing play rules fill `backwards` only; the arrival fades
     and reveals of MS-6.9 and MS-8.4 are not drawing parts). The `data-play` roots SHALL be the box drawings, the
     proof figure and the How it works per-step stages. (New 2026-11-11, A7; "reaches", the lead and the step
     timing reworded after the second design review, V25, V28, V31; "reaches" changed after the third, V32.)
     Round 4 (2026-11-13; lead rulings in decisions §1.2, and the product owner's PO-1):
     - the column lead counts at most 2 columns, so a row of three cards staggers (the box sections, r4-boxes: each
       lead card is alone in its row, column 0; Conversation's and Privacy's three cards are columns 0-2 from 1024px;
       Access's two a row, Touch waiting for Keyboard's four rings; the longest box play, Listen in a third column, ends
       3,700 ms after the trigger, and no instant changes more than three parts);
     - in a sequenced row (the How row), a step's lead adds the play time of the steps before it, and the whole row's
       last change SHALL still come at most 4,000 ms after the trigger;
     - one `data-play` root MAY wrap both columns of the proof section; text outside the figure SHALL take only marks
       (the step numbers light), and real text SHALL never wait for a play. The proof's root is its whole layout
       (`.site-proof-layout`: the figure, the four steps and the note), in place of the figure: each step number lights
       during its beat on the figure's clock (steps 0-2, 2-5, 5-10 and 10-13 of `motion-sweep`), the last change
       3,620 ms after the trigger, and no number is lit at rest (r4-proof);
     - a Results chart bar MAY grow once along its axis (`transform: scaleX` from its start edge over `motion-grow`),
       its last change at most 1,600 ms after the trigger, its number static text (MS-5.5 unchanged), and with motion
       off it SHALL show the full bar. The Results `data-play` roots are the three measures, the by-source rows and
       the scan marks (which jump in, as marks); in each, ours grows first and the comparison one sweep later, so the
       last change comes 1,140 ms after the trigger.
8.12 (Removed in round 4, 2026-11-13; lead ruling, decisions §1.2.) The How it works step sync (A8), its
     sticky picture and its runway are gone; this amends V26, V30, V33, V35, V36 and W1's How runway. In their place:
     THE How it works section SHALL show three steps, each a stage holding one `data-play` scene (MS-8.11) and then
     its `.site-step` (the number, the title, one line). WHILE the viewport is 1024px or wider the steps SHALL sit in
     one row, every stage the same height, and play as MS-8.11's sequenced row: step 2 after step 1's four key
     presses, step 3 after step 2's pick, the row's last change 3,780 ms after the trigger. Below 1024px each step
     SHALL play on its own. While a step's scene plays, its number SHALL show the lit key look; at rest no number is
     lit. Nothing SHALL be sticky, and no script SHALL follow the middle line. The row plays once per page view (the
     product owner's PO-2: no replay button).
8.13 A played `data-play` drawing SHALL never play again in that page view; a `data-play` drawing on screen or
     above it (its top above the bottom of the viewport) when motion starts SHALL show its finished state and never
     play, so nothing in view
     changes when motion starts (the MS-8.4 rule for reveals); a drawing with no box when motion starts (hidden by
     the layout) SHALL NOT be marked finished and SHALL play the first time it reaches the play line after it is
     shown; WHEN the reduced-motion preference changes to `reduce`, every drawing, including one playing, SHALL show
     its finished state and SHALL NOT play when the preference changes back. (New 2026-11-11; the on-screen and
     no-box rules changed after the design review; scoped to `data-play` roots after the third review, V33. Round 4,
     2026-11-13: "the desktop How picture follows MS-8.12" removed with MS-8.12; PO-2 keeps "never plays
     again": no replay button anywhere.)
8.14 (Round 4, 2026-11-13; A9, decisions §1.1.) Control feedback:
     - WHEN a pointer hovers a real control (a `.nl-btn` that is not a drawing, or a try-it key) on a device that can
       hover, THE control SHALL show its own text colour laid over its fill at `state-hover` opacity. The layer
       changes only opacity and fades over `motion-jump` WHILE motion is on.
     - On hover, a secondary button's edge SHALL turn ink, and a link's underline SHALL thicken to `line-width`.
     - A standalone link that goes somewhere (`.site-go`) SHALL move its trailing icon at most `motion-hint` the way
       it points, on hover and on keyboard focus, and only WHILE motion is on.
     - Press SHALL be the design system's own press. Focus SHALL be the 4px ring with its 3px offset, shown at once
       and never animated.
     - No key, button, chip or keypad SHALL move, scale or change size on hover, press or focus.
     - Disabled controls, `aria-disabled` controls and drawn controls SHALL show no hover layer.
8.15 (Round 4, 2026-11-13; A10.) Live part entry:
     - WHILE motion is on, a try-it chip and the check that lands on it SHALL fade in over `motion-jump` as they
       appear, changing only opacity, so nothing moves (MS-6.10).
     - WHILE motion is on, a question's answer SHALL rise in over `motion-state`, with at most `motion-nudge` of
       rise, each time it is opened.
     - WHILE motion is off, both SHALL appear at once.

## Requirement MS-9: Ember, colour and focus
9.1 AT every viewport position there SHALL be at most one ember fill on screen; the ember fills SHALL be the
    hero's and the closing section's "Open the app", both 64px (`target-cta`) and both on Night (the closing
    section is a Night band since round 3, W2); every other "Open the app" (header, proof, mid-page rows) SHALL be a
    secondary button. The mid-page rows end Results, Access (R3-P10, 2026-11-13) and Privacy. (Round 4, 2026-11-13
    ) The footer's "Open the app" is a secondary button too (56px, as in the bar; it was a nav link), so a
    viewport that shows the close and the footer still has one ember fill.
9.2 THE page SHALL use tokens only (no raw colours), keep text at 4.5:1 and large text, control edges, icons and
    focus rings at 3:1 in Night and Day, AND the hero's gradient behind text SHALL be no lighter than `--night`
    mixed with 8% `--moon`.
9.3 Proof states SHALL be told apart by icon, border style and text treatment, never by colour alone. (Round 4,
    2026-11-13) The proof legend is gone: the figure's two closing lines lead with the chips' check and x
    icons, and the dropped word's letter is boxed with an x (MS-7.9).
9.4 Focus SHALL be visible on every focusable element (4px `--focus`, 3px offset) and never hidden by another
    element.

## Requirement MS-10: Phones, tablets and laptops (D7)
**User story:** As a visitor on any device, I want the page to fit my screen and read well, so that I can learn
about the app on the device I have.

10.1 THE page SHALL use three layouts: phone (under 600px wide), tablet (600 to 1023px) and desktop (1024px and
     wider), as `design.md` describes per section.
10.2 Nothing SHALL scroll sideways at any width from 320 to 1920px, AND the page SHALL stay usable at 200% zoom
     and with WCAG 1.4.12 text spacing.
10.3 ON a phone held sideways, THE landing page SHALL show and scroll normally, with no "Turn your phone upright"
     notice (it meets WCAG 1.3.4); `/app` keeps the notice (ADR-003).
10.4 Buttons, navigation links, standalone links, link rows and question summaries SHALL be at least 56px tall
     and wide, with at least 8px between them; links inside a sentence are exempt.
10.5 Text outside `aria-hidden` drawings SHALL be at least 16px, except the footer's licence line (`caption`, 14px;
     the statement is `body` since R3-P8); body text SHALL be `body` (17px) or larger. Text inside drawings SHALL be at least 16px (`label`; review
     R3-P2, the product owner's answer: no `caption` inside drawings, accessibility.md rule 2),
     AND every key drawing SHALL use `--nl-key` of 64px or more (so the 4-letter keys' letters are 17px or more).
     (Round 4, 2026-11-13) The proof figure's five keys are not keypad key drawings (`.nl-key`): they are
     52px wide (48 to 64px on phones) with `label` text (16px), so five fit in a row at 320px.
10.6 Content and controls SHALL stay inside the safe areas (`env(safe-area-inset-*)`) in both orientations.
10.7 ON every size in `test/e2e/site.mjs`, THE `h1` and the header "Open the app" SHALL be visible without
     scrolling; ON portrait sizes 640px tall or more, the hero's "Open the app" SHALL be too. "Visible" means the
     element's bounding box lies fully inside the viewport at scroll offset 0.
10.8 Key drawings SHALL keep their own size whatever key size the visitor picked in the app (the `nl-keysize`
     setting, `data-keysize` on `<html>`): every drawn keypad key (`.nl-key`) SHALL be 64 to 84px wide at every width from 320 to
     1920px, with the XL setting too, EXCEPT the Touch drawing, whose two keys SHALL be exactly `key-min` (72px) and
     `key-xl` (128px) wide under the same conditions. (Exception added 2026-11-11, decision V9.) (Round 4, 2026-11-13
     ) The hero's try-it keys (a real control) SHALL be 64px tall (`--nl-key` inline, so the XL setting never
     reaches them), each taking a third of its row: 84px wide, 80px in a 320px window with a classic scrollbar, never
     under 64px.
10.9 THE box grids in `conversation`, `access` and `privacy` SHALL use columns of at least 288px; `conversation` and
     `privacy` SHALL show one column below 648px AND 2 columns from 648px (a 2 × 2 grid, never 3 + 1), and the
     `privacy` cards SHALL keep their own height (not stretched to a neighbour's); `access` SHALL show one column
     below 648px AND 2 columns of normal cards from 648px at every width, the switch card spanning one row and one
     column with its stage at most `space-6` (24px) taller than its drawing, and the last card spanning both columns
     (changed after the round-2 review, P2 and N6: the switch card was a tall tile); (Round 4, 2026-11-13;
     decisions §2 "Boxes"; replaces the box clauses before it; amends V37 and R3-P1) each box grid SHALL start with a
     lead card across the grid, its stage beside its words from 1024px (Conversation and Privacy on the left, Access on
     the right) and above them below; `conversation` and `privacy` SHALL then show their three cards one a row below
     648px, two and then the third across the row (its stage beside its words) from 648px, AND three in one row from
     1024px; `access` SHALL show its four cards one a row below 648px AND two a row from 648px at every width, each stage
     above its words; the switch card SHALL be Access's lead (first in the DOM), alone in its row, with its stage at most
     its padding taller than its drawing (24px on phones, 32px from 600px); the cards of a row SHALL share its lines
     (subgrid), so their stages, titles and lines are level;
     THE How it works section SHALL show its three steps in one row from 1024px and in one column below, each step's
     stage first (beside its text from 600px to 1023px, above it otherwise) (round 4, 2026-11-13: was
     the sticky picture beside the steps, MS-8.12); THE proof section SHALL put its figure
     right after its head in the DOM (round 4, 2026-11-13: head, then the play root holding the figure,
     the four steps and the note with its button; was head, figure, legend), one column below 1024px and, from 1024px,
     the head across the top, then the steps and the note on the left with the figure on the right across both rows by
     grid areas (round 3, P2-6; round 4); in every layout the DOM
     order SHALL be the reading and Tab order (no CSS `order`). (New 2026-11-11.)

## Requirement MS-11: Performance and Lighthouse (D8, D9)
11.1 Lighthouse (mobile preset, simulated throttling, a fresh profile each run) on `/` of a production build,
     median of 3 runs, SHALL score Performance 95 or more and Accessibility, Best Practices and SEO 100. The
     desktop preset SHALL be measured and reported the same way, with no target.
11.2 In the mobile run with the median Performance score: the largest contentful paint element SHALL be text;
     cumulative layout shift SHALL be at most 0.02; transferred bytes of the page's own requests (Lighthouse
     `network-requests` items with `sessionTargetType` `page`) SHALL be at most 125 KB of script, 16 KB of CSS,
     32 KB for the document, 60 KB of fonts, 16 KB of images and 250 KB in total; the service worker's requests
     SHALL be reported on a separate line with no budget; there SHALL be no request to another origin, from the
     page or the worker.
11.3 THE landing page and `/about` (round 3) SHALL NOT load `styles/app.css`, AND its only client components SHALL be `KeypadDemo` and
     `SiteMotion`; `try-engine.ts` (W4) is a plain module that only `KeypadDemo` imports, dynamically (MS-6.11).
11.4 `scripts/lighthouse.mjs` SHALL measure against a running production server (default
     `http://localhost:3202/`), SHALL refuse a development server, AND SHALL write the Lighthouse version, preset,
     URL, date, commit, the three runs, the medians and the budget results to `docs/testing/performance.md`.
11.5 THE measurement SHALL never build while a development server runs (`tech.md` rule 1).
11.6 THE server-rendered markup of the landing page, gzipped, SHALL be at most 15 KB, checked by a unit test.
     (New 2026-11-11.)

## Requirement MS-12: Privacy
12.1 THE landing page SHALL set no cookie and write nothing to `localStorage`, `sessionStorage` or IndexedDB; its
     own scripts SHALL only read the theme and key size settings and the motion preference. The only storage a
     visit causes is the service worker's precache of the app (MS-2.4).
12.2 Every request the landing page causes, while loading, scrolling, playing the demo and opening questions,
     including the service worker's precache requests, SHALL go to its own origin; outside links (GitHub) SHALL
     be plain links.
12.3 THE page SHALL need no consent banner and SHALL load no analytics, embed, font, icon or script from another
     origin.
12.4 (Round 4, 2026-11-13; decisions §2 "Boxes") THE Privacy lead card's sentence "Only three features
     send words or speech off this device: model ranking, online voices and Listen." SHALL stay true of the app: its
     only requests that carry what a person types or says SHALL be the model-ranking request (`/api/decode`, only with
     model ranking on, `lib/decodeClient.ts`) and the browser's own speech services (an online voice; Listen, only
     after "Allow and listen"); the dictionary files, the service worker's files and a word pack's link (which sends
     only the link, `lib/vocabPack.ts`) SHALL carry none. A change that adds such a request SHALL change this sentence
     first. (Checked against every `fetch` in `lib/`, `components/` and `app/` on 2026-11-13.)

## Requirement MS-13: Accessibility checks
13.1 axe (WCAG 2.0, 2.1, 2.2 A and AA rules) SHALL find no serious or critical violation on `/` in Night and Day,
     at 1280 and 390px, with reduced motion, and with motion on after scrolling to the end.
13.2 With the keyboard only, every control SHALL be reachable in visual order, AND Enter and Space SHALL work the
     demo buttons and the questions.
13.3 Logo images SHALL have `alt=""` beside the visible name "Ninth Life".

## Requirement MS-14: One theme across the website (round 3, 2026-11-12; W2, W3)
**User story:** As a visitor, I want every section and page of the website to look like one product, and the page
to match my device's light or dark setting the first time I come, so that it reads as one calm, trustworthy whole.

14.1 WHEN no theme is stored (`nl-theme`), THE landing page and `/about` SHALL follow the device's
     `prefers-color-scheme` (`data-theme="system"`, set before the first paint) AND `/app` SHALL keep its default,
     Night; a stored theme SHALL win on every page, AND the app SHALL store `nl-theme` only once the person has
     chosen a theme (opening `/app` with the default SHALL NOT store one). The banner stays Night in both themes
     (MS-6.1).
14.2 THE closing section `#start` SHALL be a Night band with the banner's night sky in both themes. (R3-P6,
     2026-11-13, lead decision extending W2) THE site footer SHALL be Night in both themes on every page (`/`, `/about`,
     the 404), so a Day page ends the way it opens; the 404 page is Night throughout.
14.3 THE website SHALL build its sections from the shared primitives documented at the top of
     `components/site/site.css` (bands, `.site-night`, `.site-head`, `.site-prose`, `.site-card` and
     `.site-card--note`, `.site-stage` with `--stage-s/m/l`, `.site-cta`) and the one brand lockup `.nl-brand`
     (components.css, also used by `/app`): every feature card has the same fill and 2px `--line` edge, every note
     card the same edge and no fill, every running text the `--measure` (760px), every call-to-action button
     `--target-cta` (64px).
14.4 Nav links (bar, footer) SHALL be ink, label weight, underlined on hover; content links `--link`, underlined,
     regular weight. Primary content text SHALL be ink; ink-muted only for leads, card supporting text, captions and
     drawing labels.
14.5 `/about` SHALL use the site bar, a Night header with its `h1` at the section-title scale and a lead, prose at
     `--measure` in `body` type, the statement as a note card and the site footer (with "How we measured" and
     "Report a problem", anchors pointing at `/`). (Round 4, 2026-11-13) Before the statement it SHALL
     carry "Free and open source" (the old landing Source lead and "Why it is free", word for word, with links to the
     source code and the data sources) and "Credits" (`#credits`, the four credit lines, the model line from
     `providerCopy()`); its header SHALL be `#top`, as SHALL the 404's, the target of the footer's "Back to top".
