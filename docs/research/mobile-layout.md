# Mobile and tablet layout (2026)

How to make the communication screen work well on phones (344-440 CSS px wide) and tablets (744-1376), in both
orientations, for people with tremor, fatigue, limited reach, one-switch scanning or low vision. Research only; no
app code was changed. Checked **2026-11-09**. Read with `.kiro/steering/accessibility.md`,
`design/system/README.md` and `docs/architecture/web.md` (Layout, Known gaps). The hard rules still apply: targets
>= 56 px, keys 72-128 px (default 96), text >= 16 px, sentence 40 px, no gesture-only actions, one ember thing.

Status tags: **Verified** = an official or primary source (W3C, Apple, Google/Chrome, WebKit bug tracker, a
peer-reviewed paper) says so. **Secondary** = a vendor, clinician or developer source. **Unverified** = our inference
or not checked on a real device. Nothing here has been tested on a real device yet.

**Status (2026-11-09, plan F15-F18):** done: keys no longer move while typing (fixed-height SpeakBar text), key size
from `svh`, a split layout for phones held sideways, `viewport-fit=cover` with safe-area padding, no pull-to-refresh or
double-tap zoom, no long-press menu on keys; checked on 20 viewports in Chromium and WebKit by
`packages/web/test/e2e/responsive.mjs` (see `docs/architecture/web.md`, Layout). Open proposals: keypad at the bottom
with Speak beside it on phones (F16), keys wider than tall (F17), keypad left/right setting (F18). Still untested on a
real device, including the installed home-screen app. Later the same day the phone layout itself was redone
(web-ui Req 24): keypad at the bottom with Speak under it, keys wider than tall, suggestions above the keys
(`mobile-patterns-mobbin.md`, `mobile-aac-evidence.md`), which closes F16 and F17.

## Summary: what to do

1. **Pin the keypad's position to the viewport, not to the content above it.** Today the compact layout stacks
   SpeakBar → keypad, so a sentence that wraps to 2-3 lines at 40 px pushes every key down. Keyguards, motor memory
   and switch users all need keys that never move (S20, S21, S22).
2. **Size keys from `100svh`, not `100dvh`.** `dvh` changes whenever Safari or Chrome shows or hides its toolbar, so
   keys resize in the middle of a sentence. `svh` only changes when the window really changes (S7).
3. **On phones in portrait, put the keypad at the bottom and Speak right next to it.** Every dial pad, PIN pad and
   amount pad found on Mobbin does this. The top of a 430x932 phone is out of thumb reach (M1-M4, S23). This changes
   the focus order, so the web-ui spec and `accessibility.md` rule 7 need updating together.
4. **Add a phone-landscape layout (height < 480 px): two panes with the keypad on one side.** The current compact
   layout needs about 480 px above the keys, and in landscape phones are only 344-440 px tall (S5, S9).
5. **Make keys wider than tall on phones.** Fill the width in 3 columns, as system keypads do (M2). A 96 px key is
   about 16 mm on an iPhone, and a CHI 2017 study recommends at least 18 mm for people with upper-body motor
   impairments (S19).
6. **Add `viewport-fit=cover` and `env(safe-area-inset-*)` padding.** The layout already sets
   `statusBarStyle: 'black-translucent'`, which draws an installed iOS app under the status bar. Without the safe-area
   padding, the header can sit under the clock or Dynamic Island (S6, S12). Unverified on device.
7. **Give the header, the status pills and the offer rows a fixed height, or place them below the keypad.** A pill
   that appears ("Offline") must never shift the keys.
8. **Add a "Keypad on the left / right" setting for landscape and tablets.** It helps one-handed and wheelchair-mount
   setups. Once chosen, the position never changes by itself.
9. **Keep orientation free and zoom on.** The manifest's `"orientation": "any"` and the missing `maximum-scale` are
   right (S2, S13). When the height is small or the page is zoomed, sticky panels must become static (S3).
10. **Block page-level accidents, not accessibility.** Use `touch-action: manipulation` on the whole app (stops
    double-tap zoom in the gaps between keys), `overscroll-behavior-y: none` (stops pull-to-refresh from wiping a
    sentence), and `user-select: none` on controls only (S10, S11).
11. **Test in the browser tab and as an installed app**, on the viewports below. Safe areas, toolbars and the 300 ms
    delay all behave differently in standalone mode (S8, S12).

## Viewports to test

CSS px, portrait (landscape is the same numbers swapped). In a browser tab, toolbars make the visible height smaller,
by an amount that changes as you scroll. Measure `svh` on the device rather than guessing. Popularity comes from
StatCounter worldwide, October 2026 (S15, S16), fetched 2026-11-09. Sizes come from Apple HIG (S14) and the Chrome
DevTools device list (S17).

| Device (example) | CSS viewport | Why it matters |
|---|---|---|
| Galaxy Z Fold 5, cover screen | 344 x 882 | Narrower than 360; 3 keys at 72 px plus padding must still fit (S17) |
| Galaxy S8+ (older Android) | 360 x 740 | Already a known gap: the last 16 px of the keypad sits below the fold (`web.md`) |
| Galaxy A55 / generic Android | 360 x 800 | 2nd most common mobile size, 8.57% (S15, S17) |
| (unknown model, likely Samsung) | 384 x 832 | 3rd, 7.24%; StatCounter does not name the model (Unverified) |
| iPhone SE 2nd/3rd gen, 6s-8 | 375 x 667 | Shortest current iPhone, with a Home button and no notch (S14) |
| iPhone 12/13 mini | 375 x 812 | Narrow and tall, with a notch (S14) |
| iPhone 12-14, 16e | 390 x 844 | 4th, 5.33%; the size the app is tuned for today (S14, S15) |
| iPhone XR/11, 11 Pro Max | 414 x 896 | Most common mobile size, 12.67% (S14, S15) |
| iPhone 14 Pro, 15, 16 | 393 x 852 | Dynamic Island (S14) |
| iPhone 16 Pro, 17, 17 Pro | 402 x 874 | Current base iPhones (S14) |
| Pixel 8/8a, Galaxy S20 Ultra | 412 x 915 | Common Android size; Pixel 9/10 are 412 x 924 (S17) |
| iPhone 15 Plus/Pro Max, 16 Plus | 430 x 932 | Large phone: worst one-handed reach (S14) |
| iPhone 16/17 Pro Max | 440 x 956 | Largest iPhone (S14) |
| iPad mini 8.3" | 744 x 1133 | Smallest current iPad; portrait is the compact layout, landscape the wide one (S14) |
| iPad 9.7", older iPad mini | 768 x 1024 | 3rd most common tablet size, 7.39% (S14, S16) |
| iPad 10.2" | 810 x 1080 | 4.66% (S14, S16) |
| iPad Air 11", iPad 11" | 820 x 1180 | 4.71%; a common AAC mount size (S14, S16) |
| iPad Pro 11" | 834 x 1194 | (S14) |
| iPad Pro 12.9" / Air 13" | 1024 x 1366 | iPad Pro 13" (M4) is 1032 x 1376 in DevTools (S14, S17) |
| Android tablet | 800 x 1280 | Top tablet size in both orientations, about 7.9% each; models not named (S16) |
| (unknown) | 601 x 1007 | 4.02% of tablets; just above Android's 600 dp "compact" line (S16) |

Breakpoints for reference: Android/Material width classes are compact < 600, medium 600-839, expanded 840-1199.
Height is compact below 480, which covers 99.78% of phones in landscape (S9, Verified). Apple treats every iPhone in
landscape as compact height, and every full-screen iPad as regular x regular (S14). The app's single 960 px switch
means every iPad and Android tablet in portrait gets the phone layout. That is fine if keys may grow to `key-xl` there.
iPad Split View, Slide Over and Stage Manager can produce any width, so use media queries on the window, never device
or user-agent checks (S9, S14).

Approximate key size in mm (our calculation from Apple's ppi and @2x/@3x scale; Unverified): on iPhone (460 ppi @3x),
1 CSS px ≈ 0.166 mm, so 72 px ≈ 12 mm, 96 px ≈ 16 mm, 128 px ≈ 21 mm. On iPhone SE, 96 px ≈ 15 mm. On an
11" iPad (about 132 CSS px per inch), 96 px ≈ 18.5 mm. 18 mm (S19) is about 109 CSS px on an iPhone.

## Patterns from Mobbin

The Mobbin MCP returned iOS phone and desktop-web screens only. It returned no iPad, no Android, no landscape and no
AAC apps; the "AAC" query returned general text-to-speech apps.

- **Dial pads (M1).** [Quo](https://mobbin.com/screens/df5e5847-ddfc-4dc5-957c-46491c73d635),
  [Granola](https://mobbin.com/screens/d85216ee-49ca-485c-81c4-b45a01d29341) and
  [TextNow](https://mobbin.com/screens/dea6b058-4c1b-4356-b1dc-684528130687) show the number at the top and a 3x4
  pad of round keys (about 1/5 of the screen width each) in the lower 55-60%. The primary action (Call) is centered
  directly under the 0 key, with Delete beside it. Nothing between the number and the pad changes height.
- **System-style keypad, full width (M2).** [Grab](https://mobbin.com/screens/08cea26a-c7c2-43e3-9ab3-7601dad1b33d),
  [Neo Financial](https://mobbin.com/screens/a852e021-1fc3-4ab4-a2d7-8ce1cc53b4eb),
  [Truecaller](https://mobbin.com/screens/cd5c39d3-8561-42c2-90f3-cc18a4a55f52),
  [Zip](https://mobbin.com/screens/66c1421b-5d12-4d6e-b8a3-e8772ab6a9c0) and
  [Suno](https://mobbin.com/screens/3a0ce562-683e-432b-aa0c-2397a8cbdf3c) use 3 columns from edge to edge, each key
  about a third of the width and clearly wider than tall. The pad is anchored to the bottom, and letters sit under the
  digit. The primary action (Next / Continue) is a full-width button directly above the pad (Grab,
  [talabat](https://mobbin.com/screens/6e9ef288-dffb-4df8-a759-837b7ac16393),
  [Klarna](https://mobbin.com/screens/e86dfc7e-4038-4ac1-8393-1ed2651b7485)).
- **Amount and PIN pads (M3).** [Lightyear](https://mobbin.com/screens/c3c4d8af-855c-4106-a2ba-0b4bc1a432ea),
  [Fuse](https://mobbin.com/screens/0709fdce-454d-4d0c-80ee-b5215d0fba0a),
  [Public](https://mobbin.com/screens/02eb5050-dc11-4754-a248-078f59ef8756) and
  [Cash App](https://mobbin.com/screens/8a902fd0-d9f2-4fab-a90d-763c6cde9d1f) show a large value at the top, the pad
  in the lower half, and a full-width primary button (or Request / Pay) under the pad at the bottom. Quick-pick chips
  sit right above the pad in a fixed-height row (talabat, Public, Klarna), the closest analog to our candidates.
  PIN screens ([Venmo](https://mobbin.com/screens/02e071b2-f1a8-4336-bce3-82863da55b2e),
  [Starling](https://mobbin.com/screens/de0a2b53-1c07-4292-a7d8-a8dce0238601)) keep empty space between the dots and
  the pad, so feedback never moves the keys.
- **Text-to-speech composers (M4).** [ElevenLabs](https://mobbin.com/screens/7499cc65-b72b-46d8-8c0f-e0137138a836)
  and [Speechify](https://mobbin.com/screens/fa805cd9-edde-4a94-af40-ac59f88eded9) put the text at the top and one
  control row (voice, then Generate / Play) directly above the input surface. The primary action sits right next to
  where the fingers already are.
- **Bottom sheets on phones (M5).** [Lightyear](https://mobbin.com/screens/525fb1c6-8b7d-4694-801a-835f448fc637),
  [Discord](https://mobbin.com/screens/c368e8ed-641f-45fe-8b8f-6db40342ae1a) and
  [Reddit](https://mobbin.com/screens/0b12db0b-8312-464a-a819-6cb450f51dda) use a grabber (drag to dismiss) plus a
  visible X or a full-width button at the bottom. For us, only the visible Close counts (no gesture-only rule).
- **Wide screens (M6).** [Skype web](https://mobbin.com/screens/4bdf69ab-9d27-426d-ac7e-1a24197a60de),
  [Quo web](https://mobbin.com/screens/eb1df0ef-4a3a-4cd7-a5ae-6390d840003f) and
  [Dialpad web](https://mobbin.com/screens/a3828d38-563f-41d8-8248-9355863ef439) keep the keypad a fixed-size panel.
  Extra width goes to side content (lists, conversation), never to stretching the keys. Quo puts the pad at the right
  of a floating call panel.

Takeaway: keypad at the bottom (phones) or in a fixed side panel (wide), the primary action adjacent to the keypad, and
variable content above it in a region whose size does not depend on that content.

## Platform and browser pitfalls

| Pitfall | Fix | Source |
|---|---|---|
| `100vh` is taller than the visible area while toolbars show; `.app` and `body` use `min-height: 100vh` | `min-height: 100vh; min-height: 100svh;` (fallback first) | S7 Verified |
| Keys sized with `100dvh` (`styles/app.css`) resize while toolbars animate; updates are throttled, not 60 fps | Use `100svh` in the key `clamp()`. In standalone mode sv/dv/lv are equal | S7 Verified; effect on us Unverified |
| No `viewport-fit=cover`, but `black-translucent` status bar | Next `viewport: { viewportFit: 'cover' }`; `.app { padding-top: max(16px, env(safe-area-inset-top)); padding-inline: max(16px, env(safe-area-inset-left)) max(16px, env(safe-area-inset-right)); padding-bottom: max(48px, env(safe-area-inset-bottom)); }` | S6, S12 Verified (web.dev); our case Unverified |
| Home indicator under a bottom keypad / Speak | Bottom padding `max(16px, env(safe-area-inset-bottom))` on the bottom panel. Landscape iPhones also have left/right insets | S6 Verified |
| iOS 26 Safari: `viewport-fit=cover` ignored in portrait in a tab; fixed elements not drawn under the floating toolbar; blank strip below fixed footers with the keyboard open (bug 292603 open, fix PR proposed 2026-09-15) | Don't put essential controls in the toolbar area; do not depend on `env()` being non-zero in a tab. Re-test on iOS 26.x | S24 Verified (bug tracker), status open |
| Double-tap zoom when a tremor taps twice in a gap between keys | `touch-action: manipulation` on `.app` (keeps pinch zoom), not only on `.nl-key` | S10 Verified |
| 300 ms tap delay | Gone with `width=device-width` (Chrome 32+, iOS 9.3+). An old WebKit bug reported it persisting in home-screen apps; reportedly fixed in iOS 11 | S10 Verified; S8 Secondary |
| `user-scalable=no` / `maximum-scale<2` fails 1.4.4 | Keep as is: no `maximumScale` | S13 Verified |
| Long-press shows the text magnifier or callout on keys | `user-select: none` is already on `.nl-key`. Add `-webkit-touch-callout: none` to keys and buttons only (non-standard, iOS). Keep the sentence selectable | S25 Verified (MDN) |
| Pull-to-refresh reloads and loses the sentence | `html { overscroll-behavior-y: none; }`. Chrome 63+ honours it; whether iOS Safari's pull-to-refresh obeys it is Unverified | S11 Verified (Chrome) |
| Sticky hover on touch | Wrap hover styles in `@media (hover: hover) and (pointer: fine)`. iPad with a trackpad matches it | Unverified |
| iOS Dynamic Type ignored: Safari renders 1rem as 16 px; only `font: -apple-system-body` follows it | Don't switch the app to `-apple-system-body` (keys are fixed-size). Keep the in-app key size setting and support Safari's page zoom (aA), which reflows like browser zoom | S26 Verified (WebKit bug); S27 Secondary |
| Android Chrome ignores OS font size unless `<meta name="text-scale" content="scale">` (Chrome/Edge 146+, March 2026; not Safari or Firefox) | Not yet: our type tokens are px and the key text must fit fixed keys. Revisit with rem tokens and a key-fit test | S28, S29 Verified |
| On-screen keyboard (PartnerTurn field) covers the field on Android | `interactiveWidget: 'resizes-content'` in the Next viewport, or keep the field above the fold. Chrome 108+ only | S30 Verified |
| Focus hidden behind a sticky bottom keypad or SpeakBar (2.4.11) | `html { scroll-padding-bottom: <panel height>; scroll-padding-top: <header height>; }` (technique C43) | S4 Verified |
| iPad + hardware keyboard: Tab does not reach buttons unless Full Keyboard Access (iPad) or "Press Tab to highlight each item" (Mac) is on | Digit and Enter shortcuts already work without focus; say so in Help. Do not rely on Tab order alone | S31 Verified (Apple); iPad Safari detail Unverified |
| iPadOS Safari sends a desktop user agent | Never branch on user agent or "isTablet"; use window size media queries | S9, S14 Verified |

## AAC-specific layout guidance

- **Fixed key positions are the contract.** Keyguards are physical grids made for one layout ("customized to fit any
  grid size and layout", S20). AAC practice stresses consistent placement for motor memory (S21, S22). AssistiveWare
  notes that each grid change makes people "relearn the motor patterns" (S22). So for a given viewport and key-size
  setting, the 12 keys must have the same screen rectangles all session long. Nothing above or beside them may change
  height: no growing sentence, no candidates appearing, no status pill, no "Add to my words" row, no "They said". Test
  this: record each key's `getBoundingClientRect()`, then type a 3-line sentence, go offline, open and close sheets,
  and compare (Unverified method, ours).
- **Reserve space instead of inserting it.** Give the SpeakBar a fixed height, enough for 2 lines at 40 px, and
  scroll inside it with a visible "more above" cue. Never truncate. Candidates go in fixed slots (3 + More) below or
  beside the keypad; changing text updates the slots and announces politely (4.1.3).
- **Spacing for keyguards.** AssistiveWare advises more space between buttons when a keyguard is used, and notes that
  buttons get smaller as spacing grows (S32). Consider a "Keyguard spacing" option (16-24 px gaps) that also fixes
  the keypad to a set physical position. Keep 8 px as the minimum. A keyguard user also needs the browser chrome to
  stay put: recommend the installed app (standalone) plus Guided Access on iPad, which can lock rotation and disable
  screen areas and hardware buttons (S33).
- **Landscape mounting.** WCAG 1.3.4 names devices "mounted in a fixed orientation (e.g. on the arm of a power
  wheelchair)" (S2). The wide layout (keypad right, talk left) suits a landscape mount. Add the left/right keypad
  setting, and keep the keypad top-aligned at a fixed offset under a fixed-height header. On iPad mini landscape
  (1133 x 744) check that the keypad at 96 px plus SpeakBar fits with no scroll.
- **Key size vs accuracy.** Findlater et al. (CHI 2017, iPad 3, 16 participants with and 16 without upper-body
  motor impairments) found tap error rates of 42.1% at 6 mm vs 7.0% at 18 mm for the motor-impaired group, and
  recommend "minimum touchscreen target sizes to at least 18mm" (S19). Earlier work suggested 12 mm (cited there).
  On phones this argues for the 128 px `key-xl` option and wider-than-tall keys. On 11" tablets the 96 px default
  already reaches about 18 mm.
- **One-handed reach.** About half of people observed used one hand (Hoober 2013, S23, Secondary). On phones, put
  the keypad and Speak in the bottom half, the read-only sentence on top, and settings (rarely used) top right. On a
  432+ px wide phone, let people shift the keypad toward their thumb with the left/right setting rather than
  shrinking keys.
- **Scanning is unaffected by position.** The scan order (keypad rows first) is logical, not spatial. Moving Speak
  next to the keypad only changes the visual and focus order, so update the scan-grid docs if row 6 moves.

## Sources

| # | Source | Status |
|---|---|---|
| S1 | [W3C, Understanding 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): 24x24 CSS px; 2.5.5 uses 44x44 | Verified |
| S2 | [W3C, Understanding 1.3.4 Orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html): wheelchair-mounted devices | Verified |
| S3 | [W3C, Understanding 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): 320 wide / 256 tall; make sticky content static at small sizes | Verified |
| S4 | [W3C, Understanding 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html): sticky footers, C43 `scroll-padding` | Verified |
| S5 | [W3C, Understanding 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) and [1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html): check "PQRS"/"WXYZ" in 72 px keys with the text-spacing overrides | Verified (criteria); the key check is Unverified |
| S6 | [WebKit blog, Designing websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/): `viewport-fit=cover`, `env(safe-area-inset-*)`, `max()` | Verified |
| S7 | [web.dev, Large, small and dynamic viewport units](https://web.dev/blog/viewport-units): dv* updates are throttled; Safari 15.4, Chrome 108 | Verified |
| S8 | [WebKit bug 156232](https://bugs.webkit.org/show_bug.cgi?id=156232): 300 ms delay in home-screen apps (2016) | Secondary (old) |
| S9 | [Android Developers, Use window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes): 600/840/1200 width, 480/900 height | Verified |
| S10 | [Chrome for Developers, 300ms tap delay, gone away](https://developer.chrome.com/blog/300ms-tap-delay-gone-away); [firt.dev, iOS 9.3](https://firt.dev/ios-9.3) | Verified / Secondary |
| S11 | [Chrome for Developers, overscroll-behavior](https://developer.chrome.com/blog/overscroll-behavior) | Verified |
| S12 | [web.dev Learn PWA, Enhancements](https://web.dev/learn/pwa/enhancements): black-translucent moves content under the status bar | Verified |
| S13 | [W3C ACT rule b4f0c3, Meta viewport allows for zoom](https://www.w3.org/WAI/standards-guidelines/act/rules/b4f0c3/) | Verified |
| S14 | Apple HIG Layout, device screen dimensions and size classes (removed from the live page in the 2026-09-09 update; read from the [Wayback copy of 2025-12-01](https://web.archive.org/web/20251201140322/https://developer.apple.com/design/human-interface-guidelines/layout)); [live page](https://developer.apple.com/design/human-interface-guidelines/layout) | Verified (archived official) |
| S15 | [StatCounter, mobile screen resolution, worldwide, Oct 2026](https://gs.statcounter.com/screen-resolution-stats/mobile/worldwide) | Secondary (analytics sample) |
| S16 | [StatCounter, tablet screen resolution, worldwide, Oct 2026](https://gs.statcounter.com/screen-resolution-stats/tablet/worldwide) | Secondary |
| S17 | [Chrome DevTools emulated devices](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/emulation/EmulatedDevices.ts) (main, fetched 2026-11-09) | Verified (Google source) |
| S18 | [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): iOS 44x44 pt default, 28x28 minimum; [Android accessibility: 48x48 dp](https://developer.android.com/guide/topics/ui/accessibility/apps) | Verified |
| S19 | [Findlater et al., CHI 2017, touchscreen vs mouse, people with/without upper-body motor impairments](https://makeabilitylab.cs.washington.edu/media/publications/Findlater_ComparingTouchscreenAndMouseInputPerformanceByPeopleWithAndWithoutUpperBodyMotorImpairments_CHI2017.pdf) | Verified (peer-reviewed) |
| S20 | [AbleNet, When to consider a keyguard](https://support.ablenetinc.com/quicktalker-freestyle/accessories/keyguards/when-to-consider-a-keyguard/) | Secondary (vendor) |
| S21 | [PRC-Saltillo, KeyGuard vs TouchGuide](https://www.prc-saltillo.com/articles/keyguard-touchguide-keyguide-whats-the-difference); [Boston Children's handout](https://www.childrenshospital.org/sites/default/files/media_migration/68ac7eb1-8087-471b-bf97-fc0ce39467d9.pdf) (not opened, search snippet only) | Secondary / Unverified |
| S22 | [AssistiveWare, Why does Proloquo have a fixed grid size?](https://www.assistiveware.com/blog/why-does-proloquo-have-a-fixed-grid-size) | Secondary (AAC vendor) |
| S23 | [Hoober, How Do Users Really Hold Mobile Devices? (UXmatters, 2013)](https://uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php) | Secondary (observational, old) |
| S24 | WebKit bugs [292603](https://bugs.webkit.org/show_bug.cgi?id=292603) (open, read 2026-11-09), [306465](https://bugs.webkit.org/show_bug.cgi?id=306465), [301108](https://bugs.webkit.org/show_bug.cgi?id=301108); [Apple forum 800798](https://developer.apple.com/forums/thread/800798) | 292603 Verified; others from search snippets, Unverified |
| S25 | [MDN, -webkit-touch-callout](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-touch-callout) (non-standard) | Verified |
| S26 | [WebKit bug 260880, rem ignores system font size](https://bugs.webkit.org/show_bug.cgi?id=260880) | Verified (title via search) |
| S27 | [furbo.org, Dynamic Type on the Web](https://furbo.org/?p=2791) | Secondary |
| S28 | [Chrome for Developers, Respect OS text scale](https://developer.chrome.com/docs/modern-web-guidance/guides/accessibility/respect-os-text-scale) | Verified |
| S29 | [web-features explorer, meta text-scale](https://web-platform-dx.github.io/web-features-explorer/features/meta-text-scale/): Chrome/Edge 146, limited availability | Verified |
| S30 | [Chrome for Developers, viewport resize behavior / interactive-widget](https://developer.chrome.com/blog/viewport-resize-behavior) | Verified |
| S31 | [Apple, iPad keyboards / Full Keyboard Access](https://support.apple.com/en-eg/guide/ipad/keyboards-ipad424a3e13/15.0/ipados) (search result, not opened) | Unverified |
| S32 | [AssistiveWare, Proloquo2Go button spacing](https://www.assistiveware.com/support/proloquo2go/appearance/button-spacing) | Secondary |
| S33 | [Apple Support, Use Guided Access](https://support.apple.com/en-us/111795) | Verified |
| M1-M6 | Mobbin screens linked inline above (fetched through the Mobbin MCP, 2026-11-09) | Secondary (design library) |

Not checked: iPadOS Split View / Slide Over exact widths, Android tablet model names behind 800x1280, iOS Safari
landscape visible heights with toolbars, and whether iOS Safari's pull-to-refresh obeys `overscroll-behavior`. Measure
these on devices before relying on them.
