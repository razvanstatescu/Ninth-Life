# SpeakBar

The sentence about to be spoken, its keys, and the Speak button.

The text uses the `utterance` style (40px semibold), the largest type in the app, so a conversation partner can read it over a shoulder too. The key sequence sits under it in `digits` (mono, `ink-muted`) so the person can check what they typed. Speak is the screen's one primary button.

Empty state: muted text that says what to do ("Press a key to start"), set as a 22px heading rather than the 40px utterance (it is a hint, not something to say), and a disabled **secondary** (outlined) Speak: a quiet button has the SpeakBar's own surface-sunken fill, so its shape vanished and its label looked off-centre (changed 2026-11-09). After speaking, the sentence stays until the next key press, so it can be repeated. Long sentences wrap; never truncate what someone is about to say.
