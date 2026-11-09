# Mobile AAC evidence (phones first)

Goes deeper than `docs/research/mobile-layout.md` and does not repeat it. Covers: the real visible viewport, thumb
reach and touch accuracy, touch input with motor impairments, text-based AAC apps on phones, what users and SLPs say,
PWA platform features, and placeholder text. Research only; no app code changed. Checked **2026-11-09**.

Tags: **Measured** = we measured it ourselves in Apple's iOS Simulator (Xcode runtimes iOS 26.3 and 27.0, Safari) with a
probe page that logs `innerHeight`, `visualViewport.height`, `100svh/lvh/dvh` and `env(safe-area-inset-*)`. These are
not real devices. **Verified** = primary or official source (paper, W3C, Apple, Google, WebKit, MDN/caniuse, an App
Store listing for that app's own claims). **Secondary** = vendor blog, clinician resource, review summary.
**Unverified** = our inference or estimate, or something we could not confirm. Sources are E1-E40 at the end.

## 1. Real visible viewport on phones

The probe page used `width=device-width, viewport-fit=cover` and `apple-mobile-web-app-status-bar-style:
black-translucent`, like `packages/web/app/layout.tsx`. All values are CSS px, portrait. "Shown" means the toolbar is
expanded (page load, or after scrolling up). "Collapsed" means after scrolling down. Safari 26 on iOS 26 has three tab
layouts: **Compact (the default)**, Bottom and Top (Settings > Apps > Safari > Tabs). Compact is the default; we
confirmed this on a fresh simulator. (E1 Measured, E2 Secondary)

| Device (screen) | Safari Compact, shown / collapsed | Safari Bottom, shown / collapsed | Safari Top, shown / collapsed | Home-screen app (standalone) | Status |
|---|---|---|---|---|---|
| iPhone SE 2nd/3rd gen (375 x 667) | **549** / 589 | **495** / 589 | not measured | 667 tall; safe area top 20, bottom 0, so **647** usable | Measured, iOS 26.3 |
| iPhone 16e (390 x 844) | **699** / 739 | not measured (≈ 629 est.) | not measured | not measured (≈ 763 usable est.) | Measured / est. Unverified |
| iPhone 15, 16 (393 x 852) | ≈ 695 / 735 (est.) | ≈ 635 (est.) | not measured | ≈ 759 usable (top 59, bottom 34, E3) | Unverified estimate |
| iPhone 16 Pro, 17 (402 x 874) | **714** / 754 | **654** / 754 | **660** / 768 | 874 tall; safe area top 62, bottom 34, so **778** usable | Measured, iOS 26.3 |
| iPhone 17 on iOS 27.0 | **714** / 754 | not measured | not measured | not measured | Measured, iOS 27.0 |
| iPhone 16/17 Pro Max (440 x 956) | **796** / 836 | not measured (≈ 736 est.) | not measured | ≈ 860 usable (est., insets 62/34) | Measured / est. Unverified |
| Android 360 x 800 (Galaxy A-class) | Chrome: ≈ 668 shown / ≈ 724 hidden (est.) | n/a | n/a | not measured | Unverified estimate |
| Android 412 x 915 (Pixel 8 class) | Chrome: ≈ 783 shown / ≈ 839 hidden (est.) | n/a | n/a | not measured | Unverified estimate |

How the iOS numbers fit together (Measured, consistent on all 4 iPhones): the page starts below the status bar. The
Compact bar takes **98 px when shown and 58 px when collapsed** on every model, including the SE. The Bottom bar takes
152-158 px when shown and the same 58 px when collapsed. So visible height = screen − top safe area − bar. The
estimates in the table use this rule with Apple's insets (E3). iPhone 16e and Pro Max Bottom/standalone values are
estimates from this rule. We could not measure **iOS 18**: only the iOS 26.3 and 27.0 simulators are installed. The
iOS 26 bars differ from the iOS 18 ones, so do not reuse these numbers for iOS 18.

Other findings from the measurements:

- **`100svh` is the toolbar-shown height in a Safari tab** (549 on SE, 714 on iPhone 17), and it never changes while
  scrolling. `dvh` and `innerHeight` jump by 40 px (Compact) or 94-100 px (Bottom). Sizing keys from `svh` is right
  (Measured; agrees with E4).
- **Standalone is not "sv = lv".** In the installed app, `100lvh = 100dvh = innerHeight =` the full screen (874), but
  `100svh` is 812 on iPhone 17 and 647 on SE, which is the screen minus the top safe area only. The bottom inset (34)
  is still inside `svh`. `mobile-layout.md` says "in standalone mode sv/dv/lv are equal"; that is wrong for iOS 26.3
  (Measured).
- **`env(safe-area-inset-*)` is 0 in a Safari tab** in portrait with Compact or Bottom, even with `viewport-fit=cover`.
  With the Top layout, `safe-area-inset-bottom` becomes 34 once the bar collapses, and `100lvh` is the full screen
  (874) (Measured). This matches WebKit bug reports cited in `mobile-layout.md` (S24).
- **Landscape standalone** on iPhone 17: 874 x 402, `safe-area-inset-bottom` 20 (Measured; side insets not logged).
- **The user agent says "OS 18_7" on iOS 26.3 and 27.0.** Safari freezes the version in the UA, so iOS version
  sniffing cannot work (Measured).
- **Android.** No Android emulator is installed, so nothing was measured. The only real data point found: on a Pixel 3
  (393 x 786 CSS), Chrome reported `100svh` 654 and `100lvh` 710 (E5 Verified, bug report). The estimates above
  subtract the same 132 / 76 px. Chrome's toolbar is 56 dp (E6 Verified, Chromium code review). Since **Chrome 135**,
  the viewport can extend into the gesture-navigation area when the toolbar retracts, and a dynamic bottom "chin"
  appears; with `viewport-fit=cover` the page extends to the bottom edge and `env(safe-area-inset-bottom)` changes as
  the chin moves (E7 Verified). Status bar height varies with the camera cutout, so 360 x 800 and 412 x 915 phones can
  lose more than the Pixel 3 did (Unverified).

**What fits (our arithmetic, Unverified on device).** Four rows of 96 px keys with 8 px gaps need 408 px. On an SE in
Safari that leaves 141 px (Compact) or 87 px (Bottom) for the header, sentence and candidates. Four rows of 72 px keys
need 312 px and leave 237 / 183 px. Installed on the SE, the app gets 647 px, 98-152 px more than in Safari.

## 2. Thumb reach and touch accuracy

- **How people hold phones.** Hoober watched 1,333 people in public, 780 of them touching the screen: one hand 49%,
  cradled (one hand holds, other touches) 36%, two hands 15%. One-handed users used the right thumb 67% of the time.
  People changed grip "sometimes every few seconds" (E8, Secondary, observational, 2013). The often-quoted "75% use a
  thumb" counts thumbs across all grips, not one-handed use.
- **The thumb-zone heat map is not a finding.** Hoober later said his reach drawings were coarse and should be
  ignored, and that people touch the **center** of the screen more often, faster and more accurately than the corners
  or edges (E8 comment, E9).
- **Accuracy by position.** Hoober's compiled data: accuracy "varies from 7 mm at the center of the screen to 12 mm at
  the corners". He cites Henze et al. (2011, millions of touches, edges much worse), Park et al. (2008, the **bottom**
  of the screen hard to tap accurately) and Ng et al. (CHI 2014, one hand while carrying a bag, far-corner accuracy
  "over 30mm"). He recommends targets of about 10 mm, 20 mm for walking or sensitive contexts, and placing **key
  actions in the middle half to two-thirds** of the screen, secondary actions along the top and bottom edges, tertiary
  actions in corner menus (E9, Secondary; the cited papers were not opened).
- **Reachability on large phones.** iOS has Reachability (Settings > Accessibility > Touch; swipe down on the bottom
  edge), which slides the top of the screen down (E10 Verified). Android one-handed modes exist but are vendor- and
  version-specific; no official Google page was found (Unverified).
- **System gestures at the edges.** Android's back gesture zones are about 20 dp wide on the left and right by
  default. Native apps can opt out for small areas; the home gesture at the bottom cannot be opted out (E11 Verified,
  dated Android 10). Web pages cannot opt out at all, so a sideways slip that starts at the edge of a key near the
  screen edge can trigger Back (Unverified for Chrome).

## 3. Touch input with motor impairments

- **Target size.** Findlater et al. (CHI 2017; 16 people with upper-body motor impairments, including cerebral palsy,
  MS, spinal cord injury, tremor, stroke) recommend touchscreen targets "at least 18mm"; even at 18 mm the error rate
  was 7% (E12 Verified). Nicolau et al. (UAIS 2014; 15 tetraplegic users) found tapping errors converge at 12 mm, and
  that **edge targets helped** motor-impaired users' tapping precision (E13 Verified, abstract). Earlier work by the
  same group recommended 12 mm (E13).
- **Spurious touches.** In Findlater's study, 5.7% of tapping trials by motor-impaired participants had at least one
  extra touch (21.3% of dragging trials). Five of 16 never made one; one participant made one in 71% of trials. People
  without impairments made almost none. For users with many spurious touches "the ability to disable multitouch input
  may be useful" (E12 Verified).
- **Touch-down vs lift-off.** Mott et al. (CHI 2016; 10 participants, tabletop screen) saw people touch with several
  fingers, knuckles or the side of the hand (2.3 concurrent touches on average), hit the screen with the palm before
  the intended touch, and slide on the screen for support. Average touch-down and lift-off points were about 97 mm
  from the target. Both "land-on" and "lift-off" were poor; their template-matching method was 3x closer (E14
  Verified). This was a large tabletop, not a phone.
- **Real-life phone use.** Montague, Nicolau and Hanson (ASSETS 2014; 9 people, 4 weeks at home, phone Sudoku):
  the default tap recognizer got 82.9% right; **39.9% of the rejected gestures were real taps on the right target**
  that broke the timing or movement limits, and 14.1% of accepted taps hit the wrong target. Performance varied
  between people and between sessions of the same person (E15 Verified).
- **Tremor.** "Swabbing" (sliding toward a target instead of tapping) lowered errors for older adults with tremor;
  oscillation drops while sliding (E16 Verified, abstract). In older adults' phone typing, hand tremor correlated
  strongly with errors and omissions were the most common error (E13 Verified, abstract).
- **OS settings people may already use.** iOS Touch Accommodations: Hold Duration, Ignore Repeat (several touches
  count as one) and Tap Assistance (use the initial or the final touch location) (E17 Verified). These change how the
  OS delivers touches to Safari too (Unverified for web content).
- **Keyguards.** Covered in `mobile-layout.md` (S20-S22). Predictable ships a "keyguard friendly" keyboard theme (E25
  Secondary).

## 4. Text-based AAC apps on phones

No source gave exact phone layouts, and we did not see the apps running. "Not confirmed" means we looked and found
nothing.

| App | Phones? | Layout (as described) | Notable features | Source |
|---|---|---|---|---|
| Proloquo4Text (AssistiveWare, $119.99) | iPhone, iPad, Watch | "Laid out on a single screen to reduce the effort of typing". Text pad in a middle column, phrase "Quick Blocks" left and right that can be hidden; Speak is a Play button at the bottom centre of the text pad that turns into Pause. Option for enlarged function buttons. iPhone arrangement not confirmed | Word and sentence prediction, history (tap to repeat), "Conversations" to park a message and answer an interruption, abbreviation expansion, speak by sentence or paragraph, fullscreen view with **flip** for someone opposite, phrases on Apple Watch | E18 Verified, E19 Secondary, E25 Secondary |
| Speech Assistant AAC (ASoft; Android free + upgrade, iOS $24.99) | iPhone, iPad, Android | Text box with Speak, phrase category buttons; adjustable button, text box and text size; optional custom keyboard | Full screen "with a very large font", **rotate text** to the person opposite, history, phrase autocomplete, speak each word or letter while typing, pause/resume by tapping Speak, alert bell, works during phone and FaceTime calls; Bluetooth-keyboard shortcuts for Speak, Clear, Show | E20 Verified, E25 Secondary |
| Predictable (Therapy Box) | iPhone, iPad | QWERTY, ABC, high-frequency, 10-hit layouts; keyguard-friendly theme; max 4 top-level buttons (floor hold, phrases, bell, share...) | Learning prediction, phrase bank, abbreviation expansion, switch scanning, head tracking, auditory preview | E21 Verified, E25 Secondary |
| Spoken (freemium) | iPhone, iPad, Android, Mac | Not described | Learning next-word prediction, saved phrases, "full-screen with large type" for noisy places, handwriting/drawing input, one-tap Attention button (flash + sound); speaking is free | E22 Verified, E23 Secondary (vendor) |
| Avaz | iPhone (iPad-first), Android | Keyboard mode with a message box; quick bar | Word/phrase prediction, speak sentences from the quick bar, share message, one-tap clear and an **auto-clear** setting | E24 Verified/Secondary |
| Grid Player (Smartbox) | iPhone, iPad | "Simple keyboard" grid with 5 prediction cells; "Text Talker Phrasebook" | Now legacy software | E25 Secondary |
| ClaroCom | iPhone, iPad | Layout differs on iPad and iPhone; many prediction options above the keyboard | Flip display (Pro), fillable phrases | E25 Secondary |
| CoughDrop | Phones and tablets | Not confirmed | A clinician blog reports it became "increasingly glitchy" | E26 Secondary |
| TD Talk (Tobii Dynavox) | **iPad only** (iPadOS 16+) | Partner Window on the back of a TD Pilot shows the typed text | Not a phone app | E27 Verified |
| Apple Live Speech | iPhone, iPad, Mac, Watch | Opened by triple-clicking the side button; type, then tap Send | Favorite Phrases, Personal Voice, speaks into phone and FaceTime calls | E28 Verified |
| Google Project Relate | Android, beta | Listen, Repeat, Assistant, Type | Status in 2026 not confirmed | E29 Verified (old) |

Common pattern: every text app has saved phrases plus history, and most have a **large-text show mode with flip or
rotate** for the listener. Shake-to-speak: no app we checked documents it.

## 5. What AAC users and SLPs say

Reddit could not be fetched or searched (blocked for our tools), so this section relies on studies and clinician
sources. Complaints about Speak placement, accidental speaking or clearing by mistake: **not found** in any source.

- **Interview study, 12 autistic adults who use AAC** (Martin and Nagalakshmi, arXiv 2024): speed was the top concern
  (11 of 12), because buttons were hard to find (6) or input was slow (5). Phone screens are too small for many
  traditional layouts (3), and showing text on a phone means handing it over (2). Speech output was not loud enough
  (4) and 6 said they **show the text instead** where speech cannot be heard. Glare and small screens make showing
  text hard (1-2). TTS voice quality (10) and cost (10) were big themes. Recommendations include Bluetooth keyboard
  support, louder playback or external speakers, simpler display when overwhelmed, and history without verbatim
  logging (E30 Verified, preprint).
- **Focus group, 5 autistic adults** (arXiv 2025): saved phrases help prepare, but conversations move on; some carry
  AAC but are afraid to use it in public; capacitive screens fail in rain (E31 Verified, preprint, small).
- **Conversation partners.** AssistiveWare: typing and TTS are slower than speech, so partners should pause and wait
  (E32 Secondary). Interrupting or finishing the user's sentence is "intensely dismissive" (E33 Secondary). Proloquo4Text
  users praise the Conversations feature and the flip/full-screen mode (E19 Secondary, user quotes).
- **Speed.** AssistiveWare: text-based AAC is often faster than typing inside a symbol app, prediction speeds it up,
  but conditions that affect speech often affect hand use and slow typing (E34 Secondary). Proloquo4Text and
  Predictable add abbreviation expansion (E19, E25).
- **Volume.** AssistiveWare and a clinician guide suggest Bluetooth speakers in noisy places (E19, E35 Secondary).
- **Sudden movements** can trigger iPad multitasking gestures; AssistiveWare suggests turning them off or Guided
  Access (E19 Secondary).

## 6. PWA platform features

| Feature | Support | Use for Ninth Life | Source |
|---|---|---|---|
| Screen Wake Lock (`navigator.wakeLock`) | Safari iOS 16.4+; **home-screen apps only from iOS 18.4** (bug 254545 fixed); Chrome Android, Samsung 14+, Firefox Android | Keep the screen on while composing and while the partner reads. Re-request on `visibilitychange` | E36 Verified |
| Vibration (`navigator.vibrate`) | Chrome Android, Samsung; **not** Firefox Android, **not** iOS Safari | Optional key-press haptic on Android only | E37 Verified |
| iOS haptic via `<input type=checkbox switch>` | Safari 18 added haptics for the switch control; libraries trigger it by clicking a hidden switch | Non-standard hack; a WebKit bug asks to require user activation. Do not rely on it | E38 Verified (release notes) |
| `speechSynthesis.speak()` | iOS always needs a user gesture to start speaking; Chrome 71+ needs prior user activation | Speak must be a direct tap; never auto-speak on load or on a timer | E39 Verified |
| Silent switch | Web Audio defaults to the "ambient" session and is muted by the ringer switch; `navigator.audioSession.type = "playback"` (Safari only, draft spec) avoids it. Whether the switch mutes `speechSynthesis` is **not confirmed** | Test Speak with the switch on; consider the AudioSession API if audio elements are used | E40 Verified (MDN, WebKit bugs); TTS part Unverified |
| `navigator.share` | Safari and Chrome Android support it; not Baseline (desktop Firefox) | "Send sentence" to messaging apps; feature-detect | E41 Verified (MDN) |
| Orientation lock | `screen.orientation.lock` not supported on iOS Safari; Chrome Android 38+ | A "show to partner" mode cannot force landscape on iPhone; flip with CSS instead | E42 Verified (caniuse) |
| Install | iOS 26 makes any site added to the Home Screen open as a web app by default ("Open as Web App" toggle seen in our run) | Recommend installing for daily use: more height, no moving toolbar | E1 Measured, E2 Secondary |
| Text size, dark mode, reduced motion | Covered in `mobile-layout.md` (S26-S29) | Not re-checked here | — |

## 7. Placeholder text in an empty sentence area

- WCAG 1.4.3 "applies to text in the page, including placeholder text": 4.5:1 for normal text (E43 Verified, WCAG 2.2
  Understanding). The W3C answered in 2014 that placeholder text needs sufficient contrast (E44 Verified).
- The common light-grey default often fails; but a placeholder dark enough to pass can be mistaken for real input
  (E45 Secondary, Deque).
- NN/g: placeholders used as labels hurt usability and accessibility; keep labels outside the field and use
  placeholders only for supplementary hints (E46 Secondary; snippet only, article not opened).
- No source gives a size rule for placeholder vs content (Unverified). Our rule "the sentence about to be spoken is
  the largest text" implies the hint should be smaller than real sentence text and styled differently.

## Implications for Ninth Life's phone layout

Prioritized. Each item says what it rests on.

1. **Design phone portrait for 495-549 px of visible height, not 667.** That is the SE in Safari with the Bottom and
   the default Compact bar shown (Measured). Replace the full-screen sizes in `responsive.mjs` phone checks with the
   measured visible sizes: 375x549, 375x495, 390x699, 402x714, 402x654, 440x796, plus standalone 375x647 and 402x778.
   Add Android estimates 360x668 and 412x783 until a device confirms them (E5 Unverified). Keys from `100svh` stay
   right in a tab.
2. **Cap the keypad's share of the height and shrink keys before anything else breaks.** At 96 px keys, only
   87-141 px remain on an SE in Safari (§1 arithmetic). Let keys drop to 72 px at these heights, and keep the
   sentence's reserved height fixed so keys never move (`mobile-layout.md` §AAC).
3. **Push installing the app for daily users, and handle standalone heights correctly.** Standalone gives 98-158 px
   more and removes the moving toolbar (Measured). In standalone, `100svh` excludes only the top inset, so the bottom
   34 px home-indicator inset must still be subtracted (or padded) under the keypad (Measured).
4. **Keep the keypad and Speak in the lower-middle band, off the very bottom edge and out of corners.** Accuracy is
   about 7 mm at the center and 12 mm at the corners, and the bottom edge is hard to hit (E9). The iOS home gesture
   and Android back zones (about 20 dp per side, E11) sit at the edges. Keep at least the bottom safe area plus 8-16
   px below the last key row, and the 16 px side gutter (inference from E9, E11).
5. **Put Speak right above the keypad, full width (or across the keypad's width), not in a bottom corner.** This
   keeps it adjacent to the keys (Mobbin M2 in `mobile-layout.md`) and in the band Hoober recommends for key actions
   (E9). Make it the largest target on screen, ≥ 18 mm tall where space allows (about 109 px on iPhone; E12).
6. **Make tap recognition forgiving and under our control.** 39.9% of rejected gestures were real taps that broke
   timing or movement limits (E15). Handle keys and Speak with Pointer Events: accept a press that lands and lifts
   anywhere inside the same key, even after a long hold or a small slide, and never attach long-press or swipe
   actions to keys (E15; method Unverified).
7. **Filter spurious touches.** Ignore a second pointer while one is down on the keypad (`isPrimary`), and offer two
   settings modelled on iOS: "use first / last touch position" and "ignore repeats within N ms" (E12, E14, E17).
   Default to accepting the key under the **first** contact for Speak, so a hand sliding off does not speak something
   else (inference).
8. **Make Speak safe to hit by accident and Clear safe to undo.** No source documented accidental-speak complaints,
   but repeated speech is low-harm while a lost sentence is not. Keep the sentence after speaking (in history), give
   Clear an Undo, and save the draft to `localStorage` so a Back gesture or reload does not lose it (E18, E20, E24
   show history and auto-clear are standard; persistence is our inference).
9. **Add a "Show" mode: full-screen sentence in very large text, with a Flip (180°) button.** Every major text AAC app
   has one (E18-E22, E25), users show text when speech is too quiet (6 of 12, E30), and iOS cannot lock landscape
   (E42). Make it a visible button, not shake or a gesture; it can be the ember action of that screen.
10. **Request a Screen Wake Lock while the communication screen is open**, and re-request after `visibilitychange`.
    Works in installed iOS apps from iOS 18.4 and on Android (E36).
11. **Speak only from a direct tap, and test volume paths.** iOS requires a gesture for `speechSynthesis` (E39). Test
    with the silent switch on and with a Bluetooth speaker; add a Help line that suggests a speaker in loud places
    (E30, E19, E40).
12. **Keep phrases and history one tap from the keypad screen**, outside the keypad rectangle. All text AAC apps and
    Apple Live Speech offer saved phrases; Conversations-style "park this message" is valued (E18, E19, E28, E30).
13. **Empty sentence hint: a visible label outside the area plus a hint at ≥ 4.5:1 contrast**, smaller than real
    sentence text (still ≥ 16 px) and styled differently so it is not read as content (E43-E46).
14. **Optional haptics on Android only.** Use `navigator.vibrate` behind a setting; never as the only feedback, and do
    not use the iOS switch hack (E37, E38).
15. **Measure on real devices before trusting any of this**, especially Android Chrome (Chrome 135 edge-to-edge
    changes the bottom area, E7) and iOS 18 (not measured). Our probe page logs every value needed.

## Sources

| # | Source | Status |
|---|---|---|
| E1 | Our probe page in the iOS Simulator: iPhone SE ("Review SE"), 16e, 17, 17 Pro Max on iOS 26.3; iPhone 17 on iOS 27.0; Safari tab layouts Compact/Bottom/Top; Home Screen web app (2026-11-09) | Measured (simulator) |
| E2 | [MacRumors, Safari in iOS 26](https://www.macrumors.com/guide/ios-26-safari-features/); [iDownloadBlog, three tab bar designs](https://www.idownloadblog.com/2025/06/12/ios-26-safari-tab-bar-designs/) | Secondary |
| E3 | [Use Your Loaf, iPhone 15 screen sizes](https://useyourloaf.com/blog/iphone-15-screen-sizes/), [iPhone 16 screen sizes](https://useyourloaf.com/blog/iphone-16-screen-sizes/): top inset 59, bottom 34 | Secondary (developer, simulator-based) |
| E4 | [web.dev, viewport units](https://web.dev/blog/viewport-units) | Verified |
| E5 | [Mozilla bug 1910518](https://bugzilla.mozilla.org/show_bug.cgi?id=1910518): Pixel 3 Chrome svh 654.18 / lvh 710.18 | Verified (bug report data) |
| E6 | [Chromium code review 2884563002](https://codereview.chromium.org/2884563002/): toolbar 56 dp | Verified |
| E7 | [Chrome for Developers, edge-to-edge migration guide](https://developer.chrome.com/docs/css-ui/edge-to-edge) | Verified |
| E8 | [Hoober, How Do Users Really Hold Mobile Devices? (UXmatters 2013)](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php) | Secondary |
| E9 | [Hoober, Design for Fingers, Touch, and People, Part 3 (UXmatters 2017)](https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php) | Secondary (compiles primary studies) |
| E10 | [Apple, Reachability on iPhone](https://support.apple.com/en-us/guide/iphone/reachability-iph145eba8e9/15.0/ios/15.0) | Verified |
| E11 | [Android Developers, gesture conflicts](https://medium.com/androiddevelopers/gesture-navigation-handling-gesture-conflicts-8ee9c2665c69); [Ensure compatibility with gesture navigation](https://developer.android.com/guide/navigation/gesturenav) | Verified (Android 10 era) |
| E12 | [Findlater et al., CHI 2017](https://makeabilitylab.cs.washington.edu/media/publications/Findlater_ComparingTouchscreenAndMouseInputPerformanceByPeopleWithAndWithoutUpperBodyMotorImpairments_CHI2017.pdf) (full text read) | Verified |
| E13 | [Nicolau, motor-impaired touchscreen project page](https://web.tecnico.ulisboa.pt/hugo.nicolau/project/touchmotor.html): UAIS 2014, ASSETS 2012 abstracts | Verified (abstracts) |
| E14 | [Mott, Vatavu, Kane, Wobbrock, Smart Touch, CHI 2016](https://faculty.washington.edu/wobbrock/pubs/chi-16.01.pdf) (full text read) | Verified |
| E15 | [Montague, Nicolau, Hanson, ASSETS 2014](http://web.tecnico.ulisboa.pt/hugo.nicolau/publications/2014/Montague-ASSETS-2014.pdf) (full text read) | Verified |
| E16 | [Wacharamanotham et al., Swabbing, CHI 2011](https://hci.rwth-aachen.de/swabbing) | Verified (abstract) |
| E17 | [Apple, Use Touch Accommodations](https://support.apple.com/HT205269) | Verified |
| E18 | [App Store, Proloquo4Text](https://apps.apple.com/us/app/proloquo4text-aac/id751646884) | Verified (vendor listing) |
| E19 | [AssistiveWare, Making the most of Proloquo4Text](https://www.assistiveware.com/blog/making-the-most-of-proloquo4text) | Secondary |
| E20 | [App Store, Speech Assistant AAC](https://apps.apple.com/us/app/speech-assistant-aac/id1139762358); [AppFollow Android listing](https://apps.appfollow.io/android/speech-assistant-aac/nl.asoft.speechassistant?country=dk) | Verified / Secondary |
| E21 | [App Store, Predictable](https://apps.apple.com/gb/app/predictable/id404445007) | Verified (search snippet of listing) |
| E22 | [App Store, Spoken](https://apps.apple.com/us/app/spoken-aac/id1034487817) | Verified (vendor listing) |
| E23 | [Spoken, 5 most useful features](https://spokenaac.com/blog/spoken_5_most_useful_features/) | Secondary (vendor) |
| E24 | [App Store, Avaz AAC](https://apps.apple.com/us/app/id909574843); [Avaz cheat sheet](https://avazapp.com/wp-content/uploads/2025/03/Cheat-Sheet-8.5-x-11.pdf) | Verified / Secondary (search snippets) |
| E25 | [Barnsley Assistive Technology Team, text-based AAC app evaluations, V2 2025-03-04](https://assistivetech.barnsleyhospital.nhs.uk/wp-content/uploads/2021/04/Text-Based-App-Resource.pdf) (full text read) | Secondary (NHS SLPs) |
| E26 | [NWACS blog, Get to know CoughDrop](https://stafford-casey.squarespace.com/blog/2021/5/get-to-know-coughdrop) | Secondary (search snippet) |
| E27 | [App Store, TD Talk](https://apps.apple.com/us/app/td-talk/id1509210085); [Tobii Dynavox, TD Talk](https://tobiidynavox.com/products/td-talk) | Verified (search snippets) |
| E28 | [Apple, Use Live Speech](https://support.apple.com/105018) | Verified |
| E29 | [Google Research, Project Relate](https://sites.research.google/relate/); [help](https://sites.research.google/relate/help/) | Verified (status not current) |
| E30 | [Martin and Nagalakshmi, Aging Up AAC, arXiv 2404.17730](https://arxiv.org/html/2404.17730v3) | Verified (preprint, n=12) |
| E31 | [AAC in social communication, autistic adults, arXiv 2507.00202](https://arxiv.org/html/2507.00202v2) | Verified (preprint, n=5) |
| E32 | [AssistiveWare, 7 ways to include AAC users in conversation](https://assistiveware.com/learn-aac/7-ways-to-include-aac-users-in-conversation) | Secondary (search snippet) |
| E33 | [Autism NZ, AAC guide](https://autismnz.org.nz/wp-content/uploads/2025/03/Augmentative-and-alternative-communication.pdf) | Secondary (search snippet) |
| E34 | [AssistiveWare, Should I try text-based AAC?](https://www.assistiveware.com/learn-aac/should-i-try-text-based-aac) | Secondary |
| E35 | [SpeechPathology.com transcript, iPad for AAC](https://www.speechpathology.com/files/event/08900/08954/transcript-7-9-19-contspanipadforaac-whatyouneedtoknow.pdf) | Secondary (search snippet) |
| E36 | [caniuse, Screen Wake Lock](https://caniuse.com/wake-lock); [WebKit bug 254545](https://bugs.webkit.org/show_bug.cgi?id=254545); [Safari 18.4 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes) | Verified |
| E37 | [caniuse, Vibration API](https://caniuse.com/vibration) | Verified |
| E38 | [Safari 18 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-18-release-notes); [WebKit bug 285120](https://bugs.webkit.org/show_bug.cgi?id=285120) | Verified |
| E39 | [WebKit bug 223473](https://bugs.webkit.org/show_bug.cgi?id=223473); [Chrome 71 deprecations and removals](https://developer.chrome.com/blog/chrome-71-deps-rems/) | Verified |
| E40 | [MDN, AudioSession.type](https://developer.mozilla.org/docs/Web/API/AudioSession/type); [WebKit bug 237322](https://bugs.webkit.org/show_bug.cgi?id=237322) | Verified (TTS behaviour Unverified) |
| E41 | [MDN, Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API) | Verified |
| E42 | [caniuse, ScreenOrientation.lock](https://caniuse.com/mdn-api_screenorientation_lock); [WebKit bug 257695](https://bugs.webkit.org/show_bug.cgi?id=257695) | Verified |
| E43 | [W3C, Understanding 1.4.3 Contrast (Minimum), WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Verified |
| E44 | [W3C public comment LC-2944 reply](https://lists.w3.org/Archives/Public/public-comments-wcag20/2014Aug/0006.html) | Verified (search snippet) |
| E45 | [Deque, The problem with placeholders](https://www.deque.com/blog/accessible-forms-the-problem-with-placeholders/) | Secondary (search snippet) |
| E46 | [NN/g, Placeholders in form fields are harmful](https://www.nngroup.com/articles/form-design-placeholders/) | Secondary (search snippet) |

Not confirmed: iOS 18 visible heights; any real-device or Android measurement; Safari Top-layout values on other
iPhones; exact phone layouts of the AAC apps; Reddit / community complaints about Speak placement or accidental
speaking; whether the ringer switch mutes `speechSynthesis`; whether Chrome cancels a `click` when a finger slides
within a `touch-action: none` element.
