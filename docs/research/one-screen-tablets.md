# One screen, no scrolling: tablets, and phones held upright (2026)

This is research for two product decisions:

1. **The main screen must not scroll.** It has to fit on phones in portrait and on tablets in both portrait and
   landscape, with every button, shortcut and menu reachable. Secondary sheets and menus may scroll.
2. **Phones in landscape are not supported.** The app will lock to portrait where the browser allows it, and
   otherwise show a "turn your phone upright" screen.

No app code was changed. Checked **2026-11-09**. This builds on [mobile-layout.md](mobile-layout.md) (tablet screen
sizes, S1-S31), [mobile-aac-evidence.md](mobile-aac-evidence.md) (phone viewports, E1-E46),
[mobile-patterns-mobbin.md](mobile-patterns-mobbin.md) (phone patterns, and the proposed phone sketch) and the
"Layout" section of `docs/architecture/web.md`, and does not repeat them.

**Tags.** **Measured** = our probe page in Apple's iOS Simulator (iPadOS 26.3, Safari; simulators, not devices).
**Verified** = primary or official source read. **Secondary** = reseller, clinician or press. **Unverified** = our
inference or estimate.

## Summary: recommendations

1. **Pick the layout from the window, never from the device.** Lay out from `innerWidth` x `innerHeight` (or
   `100svh`). Use the device class only to decide whether to show the "turn upright" screen. On iPadOS 26 a Safari
   window can be **375 px wide** on a 13" iPad, so phone-width layouts happen on tablets too (Measured).
2. **Phone test: `Math.min(screen.width, screen.height) < 600`**, re-checked on `resize` (foldables). Show the upright
   screen only if this is a phone **and** `innerWidth > innerHeight`. Not `(orientation: portrait)` (a narrow iPad
   window matches it while the iPad is landscape, Measured), not `pointer: coarse` (iPads match), not the user agent
   (most iPads send a Mac one, Measured).
3. **No manifest `orientation`, and no reliance on `screen.orientation.lock()`.** Neither exists in Safari or on iOS
   (Verified, and Measured on iPadOS 26.3). The manifest has one value for every device, so `"portrait"` would also
   lock Android tablets where honoured. The spec limits `lock()` to fullscreen, and Chrome has proposed turning it off
   on Android tablets (Verified). The upright screen is the real mechanism; a lock is at most a bonus on Android phones.
4. **The upright decision conflicts with WCAG 2.2 SC 1.3.4 (AA).** F100 is exactly "showing a message asking to
   reorient device", F97 is locking, and the criterion's own example is a wheelchair-mounted device (Verified). Either
   record a known exception, or **soften the screen**: in phone landscape keep the current sentence, Speak, Show and
   Menu working with "Turn your phone upright to type". The draft must survive rotation.
5. **Design floors (Measured, Safari, toolbar shown):** tablet portrait **744 x 1047**, or **744 x 1005** with 2+ tabs
   open; tablet landscape **1133 x 658**, or **1133 x 616** with tabs (iPad mini). Bigger iPads give 50-330 px more.
   Pad the bottom by `env(safe-area-inset-bottom)`: **20 px on every iPad, even in a Safari tab** (0 on iPhone tabs).
6. **Tablet landscape: two columns, keypad and action bar pinned on the right.** Left, top to bottom: "They said"
   line, sentence, 3 suggestion rows, one-row proof strip. AAC apps put the message at the top and the keys below or
   beside it (Q1). Sketch below.
7. **Tablet portrait: one stack, keys at the bottom.** Header, "They said", sentence (2 lines), 3 suggestions, proof
   strip, keypad, action bar. Keys take the leftover height, 80-128 px. Sketch below.
8. **"They said" becomes a one-line quoted context bar** ("They said:" label, text cut off with an ellipsis) directly
   above the sentence, like a messenger's "Replying to" bar; tap opens a sheet to type or edit. On phones it takes
   the header's brand slot (Q2).
9. **Proof behind a compact indicator.** Tablets: one row of word chips (match / new / rejected) with a "+N" chip that
   opens the details sheet. Phones: a count badge on the sentence card ("2 new") opens the same sheet. "Add to my
   words" stays a chip that appears in the suggestion area only when relevant (Q2: Grammarly, Ditto, WRITER).
10. **Status in the header, rare things in Menu.** Switch scanning: a header chip ("Scanning 1.2 s") while on; speed
    and turn-on move to Menu, which is always in the scan cycle. Keyboard hint: Help, plus a one-time toast after the
    first physical key press. Footer: a last Menu group (About, How it works, Not a medical device). AAC apps keep one
    Settings/Menu button at an edge (Q1).
11. **Keyguard-friendly fixed geometry.** Nothing changes size with content; the keypad rectangle is identical across
    states; only text scrolls, inside its own box. Keyguards are cut for one orientation, grid and app version (Q1):
    consider a "keep this layout" option and point to Guided Access or the iPad rotation lock.
12. **Test the measured sizes** in `test/e2e/responsive.mjs`: 744x1047, 744x1005, 1133x658, 1133x616, 820x1094,
    1180x734, 834x1124, 1210x748, 1024x1280, 1366x938, 1032x1290, 1032x1248, 1376x946, 375x840 (iPad window), plus
    phone landscape sizes for the upright screen.

## 1. Tablet AAC layouts

| App | Message / Speak | Prediction / keys | Settings | Orientation, no-scroll, keyguard | Source |
|---|---|---|---|---|---|
| Proloquo4Text | Text pad in the centre; Play/Pause and Clear in positions the user can change | Word and sentence prediction in "Quick Blocks" left and right of the text pad in landscape; not on iPhone | Toolbar | AssistiveWare's pages disagree on portrait: blocks "above the keyboard" or "on the left side". No keyguard option found | [Verified](https://www.assistiveware.com/support/proloquo4text/basics/difference-in-using-proloquo4text-on-ipad-and-iphone), [Verified](https://www.assistiveware.com/support/proloquo4text/adjust-appearance/text-pad-and-quick-blocks) |
| Proloquo2Go | Message window at the top, resizable; when full it scrolls sideways inside itself | Grid; 23 grid sizes; button spacing "to adapt to keyguards" | Options at the far right of the bottom toolbar (iPad). Toolbar buttons can be hidden, because users "often accidentally hit" them | A Keyguard AT order must state orientation, rows x columns, message-window and toolbar sizes | [Verified](https://www.assistiveware.com/support/proloquo2go/alternative-access/simplify-toolbar), [Verified](https://www.assistiveware.com/blog/why-does-proloquo-have-a-fixed-grid-size), [Secondary](https://cdn.shopify.com/s/files/1/0753/1197/2628/files/How-to-select-keyguard-options-SNCS.pdf) |
| TD Snap (manual v1.41) | Top Bar (Back, Home, Dashboard, Search), then a Message Bar with Speak and the message window | Text page set is a fixed 7x10 grid with word prediction | Top Bar buttons can be disabled (since 1.29) | Page and toolbar **may scroll**, with arrow buttons that work with every access method. iPad orientation: not found | [Verified](https://download.mytobiidynavox.com/Snap/documents/TD_Snap_UsersManual_en-US.pdf), [Verified](https://us.tobiidynavox.com/blogs/support-articles/how-to-disable-top-bar-accessibility-in-td-snap%C2%AE) |
| Grid for iPad (Text Talker) | Writing area at the top of the grid, Speak on its right; optional tap-to-speak | predictions from a third-party keyboard engine and chat history on the same screen | Three dots at the top right; can be hidden | Touch "with a keyguard"; orientation: not found | [Verified (manual)](https://cdn.shopify.com/s/files/1/1192/0390/files/Grid-for-iPad-Manual-Digital-SR.pdf) |
| Predictable | Message window | Word-prediction strip plus favourites and history strips; "keyguard friendly" keyboard theme | At most 4 top-level buttons | Positions and orientation: not found | [Secondary (NHS)](https://assistivetech.barnsleyhospital.nhs.uk/wp-content/uploads/2021/04/Text-Based-App-Resource.pdf) |
| TouchChat HD | Speech Display Bar at the top (1 line in large type when used with a keyguard) | Separate pages per vocabulary | Menu | **In-app orientation setting**: the default "No Action" locks the current orientation; a preferred orientation can be set. Vocabularies ship in separate portrait and landscape versions. Keyguard inset setting | [Verified](https://documentation.prc-saltillo.com/docs/orientation-settings), [Verified](https://documentation.prc-saltillo.com/docs/keyguard-instructions) |
| LAMP WFL | Speech Display Bar at the top; Menu at the top right | Fixed 84-location grid; prediction on a separate spelling page | Menu can be passcode-locked, or hidden with Guided Access | A portrait mode exists; Keyguard Inset setting | [Verified](https://www.liberator.co.uk/media/wysiwyg/Documents/WFL_User_Guide.pdf) |
| Avaz | Message box with one-tap clear and auto-clear | Prediction bar (8 words before v6.6) | Menu > Settings | Positions and orientation: not found | [Verified](https://avazapp.freshdesk.com/support/solutions/articles/1000172657-how-does-prediction-work-in-the-keyboard-mode-) |

**Patterns across these apps**

- The message sits at the top, with Speak beside it or inside it, and the grid fills the rest.
- Prediction sits between the message and the keys, or in side columns in landscape (Proloquo4Text).
- No app was found that reflows one fixed grid when the device rotates. TouchChat ships separate portrait and
  landscape vocabularies.
- Every control is on a page or a fixed grid. Only text boxes scroll, and TD Snap adds arrow buttons wherever its
  pages scroll.
- Rarely used controls are few, sit at an edge, and can be hidden or locked.
- A keyguard needs the same orientation, grid, bar sizes and app version every time. Vendors warn that small version
  changes break the fit ([Secondary](https://prc-saltillo.com/blog/keyguard-touchguide-keyguide-whats-the-difference)).

## 2. Secondary information on a single screen

Mobbin (iOS phone and web only; sizes by eye, ±10%; again no Google/Apple Translate, iTranslate or SayHi screens):

- **The other person's words: a 1-2 line quoted bar right above the input, not in the header.**
  [Coffee Meets Bagel](https://mobbin.com/screens/f1b60785-6937-4f8f-9508-ade582f0cb7a?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) ("Replying to Alex" + quote,
  coloured rule, (x)); [Feeld](https://mobbin.com/screens/077c259a-8714-4128-af9d-5fa5849c192b?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) and
  [Telegram](https://mobbin.com/screens/f4cebd64-47d7-44d5-a960-90c90af9723d?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) (accent name, 1-line quote with
  ellipsis, about 40-48 px); [Discord](https://mobbin.com/screens/bb04986a-3d24-4b77-adfc-4593cf7fce4d?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) (24 px
  strip). [Grab](https://mobbin.com/screens/f303dcad-8e1e-442d-8e21-3217c6be3ad4?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) and
  [inDrive](https://mobbin.com/screens/d33849c4-5367-46cd-90ca-1c2e2d6f2be7?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) put the partner's last message right
  above the suggested replies, so the replies read as answers to it.
- **Status is one small line or one pill, never its own row.** [Airbnb web](https://mobbin.com/screens/5b4078b8-8c24-42ca-9395-d49f344e2d5d?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp)
  ("Translation on" under the name), [X](https://mobbin.com/screens/0e58d9ee-9e4c-4dfe-bc6f-a101d5529dc6?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp)
  ("Unencrypted"), Coffee Meets Bagel ("7 days left" pill next to ⋯).
  [Cal AI](https://mobbin.com/screens/5e215db9-7bd0-4fac-9eeb-a0400092b7c1?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) puts a context card of about 10% H
  above the input and keypad.
- **Details behind a small (i) or ? that opens a sheet with a visible close.**
  [Deliveroo](https://mobbin.com/screens/5093e2c2-6223-446e-9956-9bb1888e9e69?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) (sheet about 45% H),
  [Trainline](https://mobbin.com/screens/90579c95-5a59-45a4-8262-ca21ed462fbe?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) (Close + "Okay, got it"),
  [Public](https://mobbin.com/screens/93eeef7a-1110-439f-8d05-5d3bbe02747d?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) (ends with a small disclaimer: a model
  for "not a medical device").
- **Review behind a count; side panels on wide screens.** [Grammarly web](https://mobbin.com/screens/352b524f-4bb8-44a4-84a7-b58f5556cf1b?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp)
  (right panel about 28% W, "Review suggestions (2)"), [Ditto](https://mobbin.com/screens/1acf2606-62aa-4e11-805f-dd091dcc8d1d?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp)
  (struck-through text with ✗ / ✓: closest to our proof states), detail panels of 25-35% W with an (x) in
  [Airbnb](https://mobbin.com/screens/35c5c3c1-b857-4da4-b73a-f3029e48fab0?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) and
  [Linear](https://mobbin.com/screens/87265f9f-1dc4-4e94-a7b5-a8acf2192db3?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp).
  [Skype web](https://mobbin.com/screens/40534fad-d6ab-463d-bc6e-75918954d267?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp) shows mode changes as a short toast
  and legal links in a thin strip.

Official guidance (Verified):

- Apple HIG [Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers): "Avoid displaying
  popovers in compact views… use… a sheet instead"; one at a time. [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets):
  medium detent about half height, "Display only one sheet at a time", nonmodal sheets for supplementary items. It
  also says to support swipe-to-dismiss, so we still need a visible Close.
- Android [window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes):
  under 600 dp compact (99.96% of phones in portrait), 600-840 medium (93.73% of tablets in portrait), 840+ expanded
  (97.22% of tablets in landscape). They are "explicitly not… for isTablet-type logic" and change while the app runs.
- Material: side sheets are for tablet and desktop; bottom-sheet content can move to a side sheet when wider
  (Unverified: search snippets only).

## 3. "Turn your phone upright" and orientation locking

**Browser support** (Verified unless marked):

| Mechanism | iOS / iPadOS Safari (also Home Screen apps) | Chrome Android | Notes |
|---|---|---|---|
| `screen.orientation.lock()` | Not supported ([MDN BCD](https://github.com/mdn/browser-compat-data/blob/main/api/ScreenOrientation.json); [WebKit 257695](https://bugs.webkit.org/show_bug.cgi?id=257695)). Measured: the method does not exist on iPadOS 26.3, in a tab or installed | Supported since 38; Firefox Android since 144; desktop Chrome always throws | The [spec](https://w3c.github.io/screen-orientation/) says a UA "MUST restrict the use of lock() to simple fullscreen documents" and "SHOULD require installed web applications to be presented in the 'fullscreen' display mode". Rejects with `NotSupportedError` or `NotAllowedError` |
| Manifest `orientation` | Not supported ([BCD](https://github.com/mdn/browser-compat-data/blob/main/manifests/webapp/orientation.json)) | Chrome 39+ for installed apps | **One value for all devices**: there is no per-device-class setting. MDN: browsers "attempt to honor this preference when possible" ([MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/orientation)) |
| Chrome on tablets | n/a | [chromestatus 5144443101118464](https://chromestatus.com/feature/5144443101118464), "Restrict orientation lock to phone form-factors on Android": `lock()` would reject on tablets because they "don't reliably report the result". Status **Proposed**, no milestone (API read 2026-11-09); the [PSA](https://groups.google.com/a/chromium.org/g/blink-dev/c/Hjo6zse3tvg) estimated M136 | Shows that Chrome itself distinguishes phones from tablets |
| Android 16+ | n/a | Apps targeting API 36 have `screenOrientation` and `setRequestedOrientation()` **ignored on displays of sw600dp or more**. Opt-out ends at API 37 ([Android 16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16)) | Whether this applies to Chrome and WebAPKs: **Unverified** |

**So can a PWA lock phones but not tablets?** Not with the manifest, because it has a single value. With
`lock('portrait')`, Chrome Android could be called only after `requestFullscreen()` and only when our phone test
passes. On iOS nothing can lock the screen. The upright screen is therefore the only mechanism that works everywhere.

**Accessibility (Verified).** [Understanding 1.3.4](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html)
allows exceptions only where an orientation is "essential" (a bank check, a piano app, projector slides).
[F100](https://www.w3.org/WAI/WCAG22/Techniques/failures/F100) fails the CSS pattern that shows "Please rotate your
device!" and hides content in landscape. The orientation spec warns about devices "mounted in a fixed orientation
(e.g. on the arm of a wheelchair)" and says that when an orientation is essential, apps "must advise the user of the
orientation requirements". This also reverses `mobile-layout.md` recommendation 9 ("keep orientation free").

**Real examples.** Web-game portals handle orientation for their games:
[CrazyGames](https://docs.crazygames.com/requirements/technical/) asks players to rotate, so developers add no lock
logic; [Poki](https://sdk.poki.com/requirements) says "there is no need to include any specific messaging". Neither
publishes its wording or icon, and no official wording or icon guidance was found (Secondary).

**Proposed screen (Unverified, our design).** A decorative outline phone with a curved arrow (`aria-hidden`), an `h1`
"Turn your phone upright", and one line: "Ninth Life works with the phone held upright. Your sentence is kept."
24-28 px text at 4.5:1 or more, following the system text size. Render it as the page's main content and move focus
to the heading once (no looping live region). No timer, no animation under `prefers-reduced-motion`, nothing
focusable hidden behind it. **Softer variant** (recommended because of 1.3.4): keep the current sentence and large
Speak, Show and Menu buttons, so a person whose phone is mounted sideways can still speak and show what was typed.

## 4. Telling a phone from a tablet

| Signal | What we saw / what sources say | Verdict |
|---|---|---|
| `screen.width` / `screen.height` | On iOS the values **do not swap** on rotation: the iPad mini reports 744x1133 in landscape too (Measured). An iPad window 375 px wide still reports 1024x1366 (Measured) | **Use `min(screen.w, screen.h) < 600` for the device class.** It is the same 600 dp line Android uses for compact width and for Android 16's large-screen rule (Verified) |
| Window size (`innerWidth`) | Changes with iPad windows, Slide Over, Stage Manager and split screen | **Use it for the layout.** It is never a device class |
| `(orientation: portrait)` | True in a 375x840 iPad window while the iPad is in landscape (Measured) | Do not use it for the upright screen |
| `pointer: coarse`, `maxTouchPoints` | Every iPad simulator: coarse, `maxTouchPoints` 5 (Measured). An iPad with a trackpad adds a fine pointer (Unverified) | Cannot tell a phone from a tablet |
| User agent | iPad mini: `iPad; CPU OS 18_7`. iPad (A16), Air and Pro: `Macintosh; Intel Mac OS X 10_15_7`, `platform` "MacIntel" (Measured, iPadOS 26.3). The OS version is frozen at 18_7 (Measured). Chrome sends a desktop UA on "premium" Android tablets (10" or more, 8 GB) ([Verified](https://developer.chrome.com/blog/desktop-mode)) | Do not use it |
| UA Client Hints (`navigator.userAgentData.mobile`) | Missing in Safari (Measured: `uaData` false). Chromium only | Do not use it |
| `screen.orientation.angle` | iPad in upright portrait reports `portrait-primary`, angle **90**; landscape-primary is 0, so iPadOS treats landscape as natural (Measured; the spec allows this) | Do not use it |

**Pitfalls.**

- **Foldables** change device class when folded or unfolded. Re-run the check on `resize`. Chrome says its own
  foldable detection is "somewhat flaky" (PSA, Verified).
- **iPadOS 26 windows** can be any width from 375 up (Measured). A short landscape iPad window, under about 500 px
  tall, needs a compact fallback layout, never the upright screen.
- **Split View and Slide Over** were removed in iPadOS 26. Slide Over came back in 26.1, in windowed mode only
  ([MacRumors](https://www.macrumors.com/2025/11/03/apple-releases-ipados-26-1/),
  [9to5Mac](https://9to5mac.com/2025/11/17/slide-over-ipados-26-2-update-feature/), Secondary).

## 5. Visible tablet viewport sizes

**Method.** Probe page in Safari on iPadOS 26.3 simulators, CSS px. "Shown" = just loaded, toolbar visible; a
no-scroll page stays in this state and it equals `100svh`. "Collapsed" = after scrolling. Safari takes **86 px shown,
57 px collapsed** (status bar included) on every iPad in both orientations; a tab bar adds **42 px** with 2+ tabs open.
`safe-area-inset-bottom` was **20** in tabs and installed apps; installed on the iPad mini, insets are 32 top / 20
bottom.

| Device (screen) | Portrait: 1 tab shown / collapsed; 2+ tabs | Landscape: 1 tab shown / collapsed; 2+ tabs | Home Screen app, usable (minus insets) | Status |
|---|---|---|---|---|
| iPad mini A17 Pro (744 x 1133) | **744 x 1047** / 1076; **1005** | **1133 x 658** / 687; **616** | 744 x 1081; 1133 x 692 | Measured |
| iPad A16 (820 x 1180) | **820 x 1094** / 1123; ≈ 1052 | **1180 x 734** / 763; ≈ 692 | ≈ 820 x 1128; ≈ 1180 x 768 | Measured; 2-tab and app values estimated |
| iPad Air 11" M4 (820 x 1180) | **820 x 1094** / 1123 | same as iPad A16 (same screen) | as above | Portrait measured |
| iPad Pro 11" M5 (834 x 1210) | **834 x 1124** / 1153; ≈ 1082 | **1210 x 748** / 777; ≈ 706 | ≈ 834 x 1158; ≈ 1210 x 782 | Measured; estimates marked ≈ |
| iPad Air 13" M4 (1024 x 1366) | **1024 x 1280** / 1309; ≈ 1238 | **1366 x 938** / 967; ≈ 896 | ≈ 1024 x 1314; ≈ 1366 x 972 | Measured; estimates marked ≈ |
| iPad Pro 13" M5 (1032 x 1376) | **1032 x 1290** / 1319; **1248** | **1376 x 946** / 975; ≈ 904 | ≈ 1032 x 1324; ≈ 1376 x 980 | Measured; estimates marked ≈ |
| iPadOS 26 window on Air 13" (landscape) | narrowest: **375 x 840** (Safari moves its toolbar to the bottom); another: 971 x 938 | — | — | Measured |
| Android 10-11" (Pixel Tablet / Tab S9 class) | ≈ 800 x 1150-1190 | ≈ 1280 x 650-700 | — | Unverified. 800 x 1280 is the top tablet size (mobile-layout S16); Chrome's toolbar plus tab strip and the system bars are estimated at 90-130 px |
| Android 8-9" (Galaxy Tab A9: 800 x 1340 physical px) | CSS size unknown; ≈ 600 x 1000 if DPR is 1.33 | ≈ 1000 x 480-520 | — | Unverified. Under 600 CSS px wide it would count as a phone; measure it |

The installed-app estimates use the iPad mini's insets (32 px top, 20 px bottom). Those insets were measured on the
iPad mini only.

**Not measured:** iPadOS 18, real devices, Android (no emulator installed), Slide Over widths, Stage Manager, the
Safari "Compact" tab setting on iPad, and an installed app in windowed mode.

## Proposed layouts (Unverified, our arithmetic; sizes in CSS px)

The `web.md` rules still apply: targets of at least 56 px, keys 72-128 px, the sentence is the largest text (40
px), Speak is the only ember element, and nothing changes size with its content.

**Tablet landscape**, designed for 1133 x 616 (iPad mini with tabs). Gutters are 24 px, the column gap is 24 px, and
the bottom pad is 20 px of safe area.

```
y=0   ┌────────────────────────────────────────────────────────────────────────────────────┐
      │ Ninth Life   ● Ready   ◉ Scanning 1.2 s                                            │ header 48 (status chips only)
y=48  ├──────────────────────────────────────────┬─────────────────────────────────────────┤
      │ ▌They said: "Do you want tea or co…"  ✎  │ ┌───────────┐┌───────────┐┌───────────┐ │ context bar 48 (tap → sheet)
      │ ┌──────────────────────────────────────┐ │ │  1 .?!    ││  2 abc    ││  3 def    │ │ keys 160 x 96
      │ │ I would like some tea           (x)  │ │ ├───────────┤├───────────┤├───────────┤ │ 3 cols, gaps 10
      │ │ please                               │ │ │  4 ghi    ││  5 jkl    ││  6 mno    │ │ keypad 4x96 + 3x10 = 414
      │ └──────────────────────────────────────┘ │ ├───────────┤├───────────┤├───────────┤ │
      │  I would like some **toast** please      │ │  7 pqrs   ││  8 tuv    ││  9 wxyz   │ │ sentence card 112 (2 lines at 40)
      │  I would **look** some tea please        │ ├───────────┤├───────────┤├───────────┤ │ suggestions 3 x 56 + 2 x 8 = 184
      │  I **would** like some tea, please  More │ │  * Back   ││  0 ␣      ││  # Next   │ │
      │ [would✓][like✓][some✓][tea✓][please+][+1]│ └───────────┘└───────────┘└───────────┘ │ proof strip 48 (tap → sheet)
      │                                          │ ┌─────────┐┌──────────────┐┌─────────┐ │ action bar 72, gap 12:
      │                                          │ │ ⋯ Menu  ││   🔊 SPEAK   ││ ⤢ Show  │ │ Menu | Speak | Show
y=558 └──────────────────────────────────────────┴─────────────────────────────────────────┘ 38 spare + 20 safe = 616
        left 541 wide: 48+12+112+12+184+12+48 = 428            right 520 wide: 12+414+12+72 = 510
```

The spare height goes to the keys: about 105 px at 616 and about 116 at 658. A "Keypad on the left" setting mirrors the
columns. The left column has spare height, so a phrase row can be added later without moving the keys.

**Tablet portrait**, designed for 744 x 1005 (iPad mini with tabs). Gutters are 24 px and the content is 696 px wide.

```
y=0    ┌───────────────────────────────────────────────────────────────┐
       │ Ninth Life            ● Ready   ◉ Scanning 1.2 s               │ header 48
y=60   │ ▌They said: "Do you want tea or coffee?"                    ✎ │ context bar 48
y=120  │ ┌───────────────────────────────────────────────────────────┐ │
       │ │ I would like some tea please                         (x)  │ │ sentence card 112 (2 lines at 40)
       │ └───────────────────────────────────────────────────────────┘ │
y=244  │  I would like some **toast** please                           │
       │  I would **look** some tea please                             │ suggestions 3 x 56 + 2 x 8 = 184
       │  I **would** like some tea, please                     More › │
y=440  │ [would✓] [like✓] [some✓] [tea✓] [please +] [+1]               │ proof strip 48
y=500  │ ┌───────────────────┐┌───────────────────┐┌───────────────────┐│
       │ │      1 .?!        ││      2 abc        ││      3 def        ││ keys 225 x 86 (4 x 86 + 3 x 10 = 374)
       │ │      4 ghi        ││      5 jkl        ││      6 mno        ││ The keys take the leftover height:
       │ │      7 pqrs       ││      8 tuv        ││      9 wxyz       ││ 86 at 1005, ~96 at 1047,
       │ │      * Back       ││      0 ␣          ││      # Next       ││ ~108 at 1094
y=874  │ └───────────────────┘└───────────────────┘└───────────────────┘│
y=886  │ [ ⋯ Menu ]       [         🔊  SPEAK          ]     [ ⤢ Show ] │ action bar 72, on the key columns
y=958  └───────────────────────────────────────────────────────────────┘ + 20 safe area = 1005
         48+12+48+12+112+12+184+12+48+12+374+12+72+20 ≈ 978; about 27 px spare
```

**On phones, portrait only** (the `mobile-patterns-mobbin.md` sketch, plus these changes):

- "They said" takes the header's brand slot as one cut-off line, and tapping it opens the sheet.
- The proof becomes a count badge on the sentence card.
- The switch-scanning status becomes a header chip.
- The hint and footer move to Menu.
- No new rows are added, so the iPhone SE (549 px in Safari) still fits.

## Sources not listed inline

- Q1 vendor manuals: the links in the table in section 1. Our full notes list Proloquo2Go's
  [message window](https://www.assistiveware.com/support/proloquo2go/appearance/message-window) and
  [Options button](https://assistiveware.com/support/proloquo2go/basics/options-button) pages, and the
  [Grid for iPad edit-mode article](https://hub.thinksmartbox.com/knowledgebase/how-do-i-get-into-edit-mode-on-grid-for-ipad/).
  All Verified.
- Simulator measurements: Xcode iOS 26.3 runtime, with the iPad mini (A17 Pro), iPad (A16), iPad Air 11" and 13"
  (M4), and iPad Pro 11" and 13" (M5); run 2026-11-09; raw log kept outside the repo. Measured.
