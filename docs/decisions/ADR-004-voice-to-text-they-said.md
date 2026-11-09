# ADR-004: Voice to text for "They said" uses the browser's speech service

- Status: accepted
- Date: 2026-11-09
- Decided by: the user (product owner)
- Spec: `web-ui` Req 26

## Context
"They said" is the other person's last line. It helps model ranking (when that is on) and was typed
by hand. Typing what someone just said is slow, and the person using Ninth Life often cannot do it.
The owner asked for voice to text in the They said field.

The only speech recognition a web page can use is the browser's own (Web Speech API,
`SpeechRecognition` / `webkitSpeechRecognition`):

- **Chrome** (Android, desktop) sends the audio to Google's speech service by default. Newer Chrome
  can keep recognition on the device (`processLocally`, with a language pack checked by
  `SpeechRecognition.available()`); MDN still marks this experimental.
- **Safari** (iPhone, iPad, Mac) uses Apple's speech service and needs Siri turned on; a page cannot
  require on-device recognition. It is reported not to work in web apps added to the Home Screen.
- **Firefox** has no speech recognition.

Three options were put to the owner: on-device only (Listen only where Chrome can keep it local),
any browser service (Listen wherever the browser has recognition, with a notice), or no button (point
people at the keyboard's own microphone). The owner chose **any browser service**.

## Decision
1. The They said field gets a **Listen** button wherever the browser has speech recognition. It
   listens for one phrase (`continuous = false`, interim results shown as they come), in English
   (the browser's English variety, else `en-US`). Stop keeps what was heard; typing, Cancel, Escape
   and closing the sheet turn the microphone off.
2. **On the device when possible**: when `SpeechRecognition.available({ processLocally: true })`
   says the language is there, recognition runs locally; otherwise the browser's service is used.
3. **Told first, once**: the first Listen shows where the audio goes ("may be sent to the browser
   maker (Google in Chrome, Apple in Safari)… Ninth Life never receives or keeps the audio, and the
   text is not stored") with "Allow and listen" and "Not now". The choice is the `dictation` setting
   (off by default), shown in Settings as "Listen in They said" where the browser supports it.
4. Ninth Life never handles audio: no `getUserMedia`, no upload, nothing stored. The heard text is
   used exactly like a typed line.

## Consequences
- This is the first feature that can send something to a third party with model ranking off. The
  About page's privacy list says so; the notice and Settings say so before any audio is sent.
- The other person is the one being recorded: the notice asks the person using the app to allow it,
  and Listen is always pressed by someone, never automatic.
- Where recognition fails (Home Screen web app on iOS, blocked microphone, offline in Chrome) the
  status line says so in words and points to typing or the keyboard's microphone.
- Not covered by an end-to-end test: headless browsers have no microphone. `test/dictation.test.tsx`
  drives the UI with a fake recognizer; check on real devices before release.
