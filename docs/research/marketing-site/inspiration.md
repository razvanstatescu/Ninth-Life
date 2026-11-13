# Marketing site: visual direction, motion and performance

Research for the one-page marketing website at `/`. Checked **2026-11-10**. Visual direction only: structure and copy are covered by the other research files in this folder. Nothing here is a design decision yet; the design phase picks from it.

**Sources.** The Mobbin MCP was available: 8 `search_sections` queries and 1 `search_screens` query (web). Browser support comes from the caniuse data file (updated 2026-11-05) and MDN browser-compat-data, both read on 2026-11-10. Other sources are linked where they are used. References are described in words only. No third-party screenshot, image, font, icon or animation file was saved or is proposed for shipping.

**Brand limits that shape every idea below** (from `design/system/README.md`, `.kiro/steering/design-system.md`, `.kiro/steering/accessibility.md`):

- Night is the brand. The three shapes carry it: the cat-eared bubble, the 3 x 3 keys, the one ember key. No mascot, no faces, no cartoon cat, no phone outline, no logo redraws, rotation or recoloring.
- One ember fill on screen at a time. Ember is a fill, never text or a hairline.
- Motion: highlights **jump** with at most a 120 ms linear color change. No pulsing, blinking, sliding or bouncing. "The website hero and the video may use slow fades." `prefers-reduced-motion` removes even the 120 ms change.
- No flicker, fog, jump scares, dripping text or low-contrast "ghost" text. Spooky, but calm.
- Fonts are self-hosted (Atkinson Hyperlegible Next 34 KB and Mono 18 KB, latin woff2). No third-party requests.
- `caption` (14 px) is allowed on the website footer. Everything else follows the app's sizes.

**What exists today.** `design/artboards/In-context-web.dc.html` is a full website mock (Night hero with a keypad and "I need water", How it works in 3 steps, the proof check with water / waves / wafer, Ways to type, footer with the intended-purpose line). `packages/web/app/welcome/page.tsx` builds most of it, with `components/site/KeypadDemo.tsx`: a replay of "i need water" built from real `nl-key` markup. It shows the finished sentence first, starts only when pressed, steps every 520 ms and has Stop. That is a good base. The new page should grow from it, not replace it.

## Summary: three recommended directions

1. **The live keypad.** The hero is the product: real `nl-key` markup (no image) replays a typed sentence one key at a time. The lit key jumps, the sentence grows in `utterance` type with the mono digits under it, and the proof chips turn to "matches". The finished state is in the server HTML, so the page reads fully with no JavaScript and with reduced motion.
2. **Scroll steps, not slides.** Scroll-driven CSS animations with `steps()` timing. States change in jumps as the reader scrolls: the how-it-works keypad lights the key for each step, the proof check goes suggested → checked → dropped, and the switch-scan ring jumps row by row. It needs no JavaScript and runs off the main thread. Without support or with reduced motion, each section shows its finished state.
3. **Night sky, one ember.** A still, atmospheric Night page made of CSS gradients and the moon bubble panel. One slow fade on arrival brings in the ninth key last. Afterwards nothing moves on its own, and every other "rich" moment is user-started or tied to scroll.

These three combine into one page: direction 3 is the ground, 1 is the hero and 2 is the body.

## 1. References (Mobbin, described in words)

Patterns worth borrowing, and why. Links go to Mobbin; we copy none of them.

### Heroes

- **Descript, enterprise hero** ([Mobbin](https://mobbin.com/sites/sections/d8d07829-3c7e-4c6e-b7ea-1651b01944ae)). A dark ground with a two-line serif headline centered. One short sub-line, one white button, then the real product UI pinned under the fold edge so it peeks in. *Take:* show the actual product directly under a short literal headline. Ours is the keypad, rendered live.
- **Descript, "Try a live demo"** ([Mobbin](https://mobbin.com/sites/sections/ed5cea87-d748-4ed3-ab0d-502cfd70b495)). A big text field ("Type to generate speech") with a Speak button next to a voice select, on the page itself. *Take:* the demo can be played, not only watched. Our "Hear it" uses the browser voice. The voice picker must not appear: vendor voice names are off limits on screen.
- **Wispr Flow, dictation hero** ([Mobbin](https://mobbin.com/sites/sections/e0030809-614c-4bcb-9c53-746c90165df9)). A large serif headline in two tones. A ribbon of transcribed sentence text curves across the hero and passes through a small waveform pill. *Take:* the sentence itself is the visual. We would keep our sentence straight and still (a moving ribbon is sliding text), but text as the main image fits a text-entry tool.
- **ElevenLabs, mobile app hero** ([Mobbin](https://mobbin.com/sites/sections/d9762327-6169-49b0-a99e-90fff0b3a750)). Speech bubbles with sample lines float at different depths under the headline. *Take:* speech bubbles as the hero image. Ours would be one moon bubble with the cat ears (the brand shape), not a cloud of them. Floating or drifting bubbles are out (sliding).
- **Aqua, voice input hero** ([Mobbin](https://mobbin.com/sites/sections/2f15b024-cf4d-435d-a596-c612c3bb1e82)). One two-line statement in a light grotesk on a soft blurred texture, with almost nothing else. *Take:* restraint. A hero can be one sentence and still feel rich if the ground has depth. The blurred texture would be costly to paint (see section 3).
- **Subframe** ([Mobbin](https://mobbin.com/screens/3343e3b4-7217-4c52-86c8-46a1cdd9ee60)). A single glossy 3-segment control floats above a huge headline. *Take:* one object, lit, above the name. It is close to our icon idea: eight dark keys and one lit one above "Ninth Life".

### How it works and features

- **Railway, program steps** ([Mobbin](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479)). Inside a dark rounded card, three numbered circles are joined by a thin vertical line, each with a short title and one line of text. *Take:* a vertical 1-2-3 that works the same on a phone and on desktop.
- **Clay, How it works** ([Mobbin](https://mobbin.com/sites/sections/28c16d19-1b1c-4c38-b06e-660c77901cbc)) and **Beside** ([Mobbin](https://mobbin.com/sites/sections/2cfd3169-f61f-4ca5-bd2a-67627febbc84)). Numbered steps in small mono labels ("[1]", "01") above short headings. *Take:* our step numbers can be set in Atkinson Hyperlegible Mono like key digits, so the steps quietly echo the keypad.
- **Linear, product areas** ([Mobbin](https://mobbin.com/sites/sections/11fa0cf7-8a9c-41f1-b38f-66918fac01f4)). Four columns on near-black, separated by hairlines, with mono numbers ("1.0 Intake") above two-line headings. *Take:* very quiet type-only feature rows. They suit "Ways to type".
- **Attio, feature grid** ([Mobbin](https://mobbin.com/sites/sections/9038df26-d13c-4c95-98d5-62ba4fd5fad3)). Six dark cards, each topped by an abstract line-drawn miniature of the product's UI (rows, keys, chips) on a dotted grid. *Take:* draw tiny diagrams from our own components (a 3 x 4 key grid, a proof chip, a scan ring) in CSS or inline SVG instead of screenshots. They are crisp, cost no image bytes and follow the theme.
- **Monologue, dark bento** ([Mobbin](https://mobbin.com/sites/sections/fc7e526f-de26-4d5c-8852-fe838c27dd47)). A textured dark grid of tiles, each holding one object (a speaker grille with a waveform, a word cloud, labeled tiles), with a serif title. *Take:* one strong object per tile. The grain texture and blur are a paint cost, and the moving waveform would be pulsing.
- **Wispr Flow, edits as chips** ([Mobbin](https://mobbin.com/sites/sections/10a1becb-23ac-4a6e-9fcf-0e0081f9672c)). A paragraph with orange labeled chips pinned to the phrases that were changed. *Take:* annotate the sentence with our ProofChips ("water, matches"; "wafer" struck through, "dropped"). The chips carry icon, word and border style, so meaning never rests on color.
- **Overmind, three-step cards** ([Mobbin](https://mobbin.com/sites/sections/42f58ee7-e7a8-492d-b8c6-3d752496629f)). On a dark ground, the active card is a solid orange fill and the other two are dimmed outlines, with retro pixel art (bats, towers). *Take:* "one lit card among dark ones" is our ninth-key idea applied to layout. The bats and pixel art are a costume, and the dimmed cards are low-contrast ghost text. Skip both.
- **Webflow, accessibility controls** ([Mobbin](https://mobbin.com/sites/sections/5a4df209-e3fe-48d1-bae6-b92304f428ab)). An icon grid with a heading, two lines and a "learn more" link per control. *Take:* the plain, scannable layout for the access section. Their bright primaries are the "clinic blue" look that `Directions.dc.html` already dropped.

### Footers

- **Parker** ([Mobbin](https://mobbin.com/sites/sections/90aace03-4a60-4020-b57d-b7ad356f4051)). Centered links, a row of legal footnotes in small text, then a huge cropped wordmark in a slightly lighter tone filling the bottom. *Take:* the closest match to our need. The intended-purpose sentence sits as a readable footnote, with the "Ninth Life" wordmark set large below it. The large wordmark must keep text contrast or be `aria-hidden` decoration in `line`; the legal line must not be low-contrast.
- **Cosmos** ([Mobbin](https://mobbin.com/sites/sections/277145c1-b152-4185-ba3a-5568988cc33a)) and **Zellerfeld** ([Mobbin](https://mobbin.com/sites/sections/18df6730-6569-49da-9c23-3bee32fbe638)). A display-size wordmark running edge to edge under small link columns; Zellerfeld puts its logo mark beside it at the same height. *Take:* the brand book allows the icon beside the "Ninth Life" wordmark in ExtraBold. A footer-scale version is a strong closing image that costs no bytes.
- **Luma** ([Mobbin](https://mobbin.com/sites/sections/5b439406-fe96-4064-8312-5a744023659e)) and **Current** ([Mobbin](https://mobbin.com/sites/sections/33353d30-cc34-4205-949a-a72e0cde3d6d)). The last section is one centered line and one big CTA on a dark gradient (Current uses a full-width pill). *Take:* the final "Open Ninth Life" can be the page's last ember fill, alone on the screen.

### What Mobbin did not give

- The "privacy section" query returned only long legal policy pages (folk, Clay, Glide, Current, Dropbox, Reflect, Coda), no visual privacy blocks. The privacy section will need its own pattern: a short list of plain statements with icons. The copy has to follow `lib/rankingProvider.ts` and `.kiro/steering/privacy.md`. Note that the artboard's "Nothing you say is stored or logged" needs checking against what model ranking and Listen send to third parties; that belongs to the content research.
- No result showed a 12-key keypad demo, an AAC tool or a switch-access demo on a marketing page. The live keypad hero has no close precedent on Mobbin, which helps us stand out.

## 2. Trends, and which ones fit

The GDJ round-up of 2026 landing pages ([graphicdesignjunction.com](https://graphicdesignjunction.com/2026/01/landing-page-design-trends-2026/)) lists these trends: shorter pages, literal headlines, one primary action per screen, visuals as evidence rather than decoration, scrolling treated as a choice, specific social proof, shorter forms, copy and design planned together, and accessibility as a baseline. The Mobbin set agrees: dark grounds with one accent, product UI shown directly, mono labels for numbers, bento grids and giant footer wordmarks.

| Trend | Fit | Why |
|---|---|---|
| Literal headline + the real product in the hero | Yes | Our product renders as HTML, so the "screenshot" is live, sharp and theme-aware. |
| One primary action per screen | Yes | It is already our ember rule. |
| Visuals as evidence | Yes | The proof check is evidence: show a dropped word with its digits. |
| Bento grid of features | Yes, with care | On phones it becomes one column. Tiles hold component miniatures, not photos. |
| Mono numerals and labels | Yes | They match the key-digit style. |
| Giant wordmark footer | Yes | The wordmark is text, so it costs nothing. |
| Social proof, testimonials, logo walls | No | We have no user testing to quote (product.md) and no third-party logos. |
| Count-up stat counters | No | Motion on numbers, and screen readers can read the in-between values. Show eval numbers static, copied from RESULTS.md with the method linked. |
| Parallax, marquees, drifting objects | No | Sliding motion. Marquees also break 2.2.2 unless they can be paused. |
| Grain, blur and glass layers | Limited | Paint cost on mid-range phones and contrast risk. Use solid tokens and gradients. |
| WebGL or 3D heroes, Lottie, background video | No | Heavy JavaScript or bytes, hard to make reduced-motion safe, and off-brand. |

## 3. Techniques: cost, risk, fit

Costs are rough and relative, for a mid-range phone on a slow connection, which is how Lighthouse mobile tests. Lighthouse 10+ weights the performance score as Total Blocking Time 30%, Largest Contentful Paint 25%, Cumulative Layout Shift 25%, First Contentful Paint 10% and Speed Index 10% ([Chrome for Developers](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)). The budget therefore goes to: little JavaScript, a text LCP, and no layout shift.

### 3.1 The live keypad demo (hero), direction 1

- **What.** Reuse `KeypadDemo`: 12 `nl-key` divs (`aria-hidden`, a picture of the keypad, not controls), the sentence in `utterance`, digits in mono, and ProofChips under it. Steps come from `site-data.ts`, which the offline decoder produces at build time, so every shown sentence is real decoder output. Play / Stop is a real `<button>`. "Hear it" uses `speechSynthesis` with the default voice and shows no voice name.
- **Motion.** The pressed key changes state in a jump. Text is swapped, never typed out with a sliding caret. If a caret is wanted, use a static bar with no blink (blinking is banned).
- **Ember budget.** The hero CTA is the one ember fill. The demo shows the current key with the **pressed** style (inner ember ring, per the Key README), not the lit style (ember fill + glow). Otherwise two ember fills share the screen. The alternative is a secondary CTA with a lit demo key, which is a design-phase choice.
- **Autoplay.** WCAG 2.2.2 (Pause, Stop, Hide) requires a pause control for motion that starts on its own and lasts over 5 s ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). "I need water" is 12 presses × 520 ms ≈ 6 s. So either keep today's click-to-play, or autoplay once when the hero is in view and keep Stop visible. Never loop. Autoplay only when `prefers-reduced-motion: no-preference` is known on the client.
- **Performance.** The server HTML holds the finished frame, so LCP is the `h1` or hero text and the demo causes no layout shift (key boxes have fixed sizes from tokens). The client island is small: one interval timer and no libraries. It should start only when `IntersectionObserver` reports it visible and stop on `visibilitychange`.
- **Accessibility risk.** Low if the keys stay `aria-hidden` and a polite live region announces only the final sentence (as now). Do not announce every step.
- **Brand fit.** Exact. The design system's "Website" surface asks for "a live keypad demo".

A **no-JavaScript variant** is possible. All frames are rendered as stacked `aria-hidden` spans and one `@keyframes` with `step-end` timing shows each in turn. A single visible text carries the meaning for screen readers. It costs no hydration, but WCAG 2.2.2 still needs a pause control, and that control needs a little script (or a checkbox hack). Recommendation: keep the small island. It already exists and is tested.

### 3.2 Scroll-driven animations, direction 2

- **What.** `animation-timeline: view()` (or `scroll()`) with `animation-range`, so an animation's progress follows scroll position. Combined with `steps(n)` or keyframes that hold each state, the state **jumps** at thresholds instead of sliding, which fits our motion rule.
  - *How it works:* on tablet and desktop, the keypad picture is `position: sticky` and the three steps scroll past. Each step's `view()` timeline (shared through `timeline-scope`) sets which key shows pressed: step 1 key 4 ("hi" is 4 4), step 2 the candidate row, step 3 the Speak button. On phones, nothing is sticky; each step carries its own small static picture.
  - *Proof check:* as the block crosses the middle of the viewport, it moves in three steps: "wafer" suggested → digits compared (92337 vs 92837, the differing digit boxed, which is a shape, not only a color) → "wafer" struck through with the x chip, "dropped", "water" with the check chip.
  - *One switch:* a mini keypad in which the `scan-width` ring jumps row 1 → row 2 → row 3 → key, in step with scroll. Highlight jumps, never slides, as in the app.
- **Support (MDN BCD, 2026-11-10).** `animation-timeline` and `animation-range`: Chrome 115, Safari 26, Firefox 159. Wrap rules in `@supports (animation-timeline: view())`. Outside it, show the finished state. Gotcha: the `animation` shorthand resets `animation-timeline`, so declare the timeline after the shorthand.
- **Performance.** CSS scroll timelines run on the compositor and keep working while the main thread is busy ([Chrome case study](https://developer.chrome.com/blog/scroll-animation-performance-case-study); [overview](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)). Zero JavaScript, so nothing is added to TBT. Animate `opacity` and `transform` only. For state swaps, cross-fade stacked layers rather than changing `background-color` or `box-shadow`. Lighthouse flags non-composited animations ([audit](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations)), and the `glow-ember` shadow is the usual offender. Put the glow on a pseudo-element and change its opacity.
- **Accessibility risk.** Medium if misused. Never hijack or snap scroll. Content must never be hidden until scrolled: the unanimated state is the finished, fully readable state, and the animation only replays it. The motion is triggered by interaction, so reduced motion must remove it (2.3.3, [W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)). Put every scroll animation inside `@media (prefers-reduced-motion: no-preference)` and do not rely only on the global kill switch in `globals.css`.
- **Brand fit.** Good, as long as the motion is jumps and fades. "Reveal on scroll" that slides cards up 40 px is the common version and breaks the no-sliding rule. Use opacity only, or ask the product owner for a website exception (an open point in the brief).

### 3.3 Slow fades and the arrival moment, direction 3

- **What.** On first paint, the hero's 3 x 3 key picture is already there with eight plum keys. The ninth fades to ember over about 600-900 ms after a short delay: the life coming back. This is the one autoplaying animation. It lasts under 5 s, plays once and never loops, so 2.2.2 does not apply.
- **How.** A CSS `@keyframes` on `opacity` of an ember layer over the ninth key, inside `@media (prefers-reduced-motion: no-preference)`. Use `animation-fill-mode: backwards` so the server HTML shows the final ember state when animation is off or CSS fails. Do **not** animate the logo file itself. The brand book forbids changing the icon, so this is a separate picture built from `nl-key` styles.
- **Cost.** Near zero. LCP is unaffected if the fading layer is not the largest element, and it is small.
- **Risk.** None for flashing: one slow fade is far below the 3-flashes threshold ([2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)). Check the ember-plus-CTA budget: if the CTA is ember too, the fading key uses the pressed ring or sits outside the first viewport.
- **Fit.** Exact. "The website hero and the video may use slow fades."

### 3.4 Night sky ground

- **What.** Layered `radial-gradient`s from `night` to `plum`, with a faint moon-colored glow behind the keypad panel. A large panel bubble (`panel` fill, `radius-panel`) holds the demo. Ears on the bubble only if the design system adds them as a shape; the logo is not redrawn here.
- **Avoid.** Twinkling stars (blinking), drifting fog, noise or grain via SVG `feTurbulence` (expensive to paint), large `filter: blur()` or `backdrop-filter` layers (slow paint and scroll on phones).
- **Cost.** Gradients are effectively free. A static decorative SVG under 2 KB inlined is fine too.
- **Risk.** Text over gradients must keep 4.5:1. Put text on solid token surfaces (`ground`, `surface`) and keep gradients behind non-text areas or very close to `night`.
- **Fit.** Good. It carries Kiroween atmosphere without a costume.

### 3.5 Cross-document View Transitions into the app

- **What.** When "Open the app" is pressed, the page cross-fades into the app, optionally keeping the keypad in place (`view-transition-name: keypad` on both pages).
- **Support (caniuse, 2026-11-05).** Cross-document: Chrome 126, Safari 18.2, Firefox partial. Same-document: Chrome 111, Safari 18, Firefox 144. Opt in with `@view-transition { navigation: auto; }` on both routes.
- **Next.js catch.** `next/link` does client-side navigation, which is not a cross-document navigation, so `@view-transition` does nothing there. React's `<ViewTransition>` sits behind an experimental Next flag in releases after the pinned 15.1.12, so it is not available to us. A plain `<a href>` to the app route makes a full load. That suits us anyway: the app has its own layout and service worker scope, and the landing then ships no router prefetch.
- **Motion.** Keep the default cross-fade (a fade is allowed). A morph of the keypad from the hero position to the app position is movement and scaling, which is sliding. Skip it, or use it only with an explicit OK.
- **Reduced motion.** The global rule in `globals.css` matches `*, *::before, *::after` and does **not** reach `::view-transition-*` pseudo-elements. Add `@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }`.
- **Cost.** Zero JavaScript. **Risk.** Low. **Fit.** Good, as a quiet fade.

### 3.6 Component miniatures instead of images (feature tiles)

- **What.** Tiles in the access and privacy sections show small diagrams built from real classes and inline SVG icons from `components/Icon.tsx`: keypad rows, a candidate row, a ProofChip of each kind, the scan ring, an "offline" icon. This follows the Attio pattern without copying it.
- **Cost.** A few KB of HTML, no image requests, sharp at any zoom, follows Day and Night.
- **Risk.** Decorative miniatures get `aria-hidden` and the tile text carries the meaning. Every icon follows the 24 px, 2.5 px round-stroke style.
- **Fit.** Exact. "Other apps' screenshots" are banned, and this uses only our own UI.

### 3.7 `@starting-style` and small transitions

- **Use.** Fade in the phone navigation sheet or disclosure from `display: none` with `@starting-style` and `transition-behavior: allow-discrete` (Chrome 117, Safari 17.5, Firefox 129). Opacity only, 120 ms linear, no slide. Without support, it simply appears.
- **Cost.** Zero JavaScript. **Risk.** Low. Keep it inside the no-preference media query.

### 3.8 Ruled out

| Technique | Why not |
|---|---|
| GSAP, Framer Motion, Lottie, Three.js or WebGL | Adds tens to hundreds of KB of JavaScript and hurts TBT on mobile. Most need extra work to honor reduced motion. Lottie and Rive files are also third-party assets that would need licenses. |
| SVG SMIL (`<animate>`) | Not controlled by CSS media queries, so `prefers-reduced-motion` needs extra script. Use CSS on SVG instead. |
| Autoplaying background video, or a GIF demo | Heavy bytes. A GIF cannot be paused. Video needs captions and a pause control. If the demo video is embedded, use a self-hosted file with a poster image, no autoplay, `preload="none"` and captions. |
| Count-up numbers, typewriter loops, marquees, cursor-follow glows | Banned motion types (sliding, pulsing) or 2.2.2 problems. |
| Ambient "breathing" ember glow | That is pulsing. |
| Autoplay sound or keypad tones on load | WCAG 1.4.2. Tones play only from a press. |

## 4. Page weight and Lighthouse habits

- **Render statically.** Keep `export const dynamic = 'force-static'` on the landing route, with server components everywhere except the demo island. The App Router always ships its React runtime, so the main gain is having no other client components.
- **Separate CSS from the app.** `app/layout.tsx` imports `app.css` for every route, which loads the app's one-screen shell styles on the landing page. Route groups with separate layouts (for example `(site)` and `(app)`) let each load only its own CSS. The shared `tokens.css`, `globals.css` and `components.css` stay in the root.
- **Fonts.** The root layout preloads both latin woff2 files. On the landing, the Mono face appears only in digits, so its preload could be dropped there (one less early request). Keep `font-display: swap`. To reduce the reflow when the font swaps in, add a fallback `@font-face` for `system-ui` with `size-adjust` and `ascent-override` tuned to Atkinson Hyperlegible Next. `next/font/local` would compute this automatically from the same local files and works on 15.1, but it moves the `@font-face` rules out of `globals.css`, against the current design-system rule. That is a design-phase choice; the manual fallback face is the smaller change.
- **The LCP element is text.** With no hero image, LCP is the `h1` or lead paragraph, painted as soon as the font (or fallback) is ready. Never fade in the `h1` or lead: an element that starts at opacity 0 delays its LCP.
- **Images, if any.** Prefer inline SVG and CSS. For any raster (for example a still from the video), use AVIF with WebP fallback (AVIF: Chrome 85, Safari 16.1 partial / iOS 16, Firefox 93; about 96.7% global), `next/image` with explicit `width` and `height`, and `fetchpriority="high"` only on an LCP image. Lazy-load everything below the fold. The OG and social card stays a separate file, not shown on the page.
- **Below-the-fold sections.** `content-visibility: auto` with `contain-intrinsic-size: auto 800px` skips rendering until needed (Chrome 85, Safari 18, Firefox 125; [web.dev](https://web.dev/articles/content-visibility)). Watch for scrollbar jumps on anchor links and test find-in-page.
- **No layout shift.** Key, chip and card sizes come from tokens. The demo's sentence box has a fixed line count. `text-wrap: balance` on headings (Chrome 114, Safari 17.5, Firefox 121) changes nothing in layout timing.
- **Measuring.** Lighthouse mobile against a production build (`next build` + `next start`), never the dev server (unminified, HMR). Per tech.md, never build while the dev server runs from the same `.next`: stop it first or build in a copy. Record the Lighthouse version, mode (mobile, simulated throttling), URL and the four category scores.

## 5. Reduced motion and no-JavaScript, all in one place

| Feature | `no-preference` | `reduce` | No JavaScript | No support |
|---|---|---|---|---|
| Hero ninth-key fade | One slow fade (≤ 900 ms) | Ember shown at once | Same as `reduce` (CSS) | n/a |
| Keypad demo | Play / Stop; optional single autoplay when in view | Finished frame; Play still works but steps without the 120 ms change | Finished frame; Play hidden | n/a |
| Scroll-driven steps | Jump between states with scroll | Finished states, static | Same (CSS only) | Finished states, static |
| Phone nav fade | 120 ms opacity | Instant | `<details>` disclosure or a plain link list | Instant |
| Into-app transition | Cross-fade | None | Normal navigation | Normal navigation |

The pattern is **opt in to motion**: write the static, finished state as the base, and add motion only inside `@media (prefers-reduced-motion: no-preference)`. In React, read the media query with `useSyncExternalStore` and a server snapshot that means "do not animate" (tech.md rule 5). The server HTML is always the still version, and motion starts after hydration only when allowed.

## 6. Points for the design phase

1. **Motion vocabulary for the website.** Allowed: jumps, the 120 ms linear color change, opacity fades (hero up to about 900 ms). Not allowed: slides, scale morphs, parallax, loops. Whether a small translate (8-16 px) on reveal is acceptable on the marketing page is the open "motion rules" point; this research assumes **no**.
2. **Motion tokens.** `tokens.json` has none. Add them to the design system first (design-system.md): for example `motion-jump` 120 ms linear, `motion-fade` 600-900 ms ease-out (website hero and video only), `demo-step` 520 ms.
3. **Ember budget per viewport.** Pick one: CTA ember with a pressed-style demo key, or a lit demo key with a secondary CTA. The final CTA band is the only ember fill in its viewport.
4. **Day theme.** The hero stays Night in both themes (brand book). Body sections follow `prefers-color-scheme`. In Day, `glow-ember` becomes the plum ring, so any glow-based visual needs its Day form designed.
5. **Phones in landscape.** The landing is a scrolling document, not the one-screen app, so this research assumes it reflows in landscape (WCAG 1.3.4) and the portrait-only rule stays with the app route. That is an open point for the user.
