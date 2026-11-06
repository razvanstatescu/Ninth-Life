# SpeakBar

The sentence about to be spoken, its keys, and the Speak button.

The text uses the `utterance` style (40px semibold), the largest type in the app, so a conversation partner can read it over a shoulder too. The key sequence sits under it in `digits` (mono, `ink-muted`) so the person can check what they typed. Speak is the screen's one primary button.

Empty state: muted text that says what to do ("Press a key to start") and a disabled quiet Speak. After speaking, the sentence stays until the next key press, so it can be repeated. Long sentences wrap; never truncate what someone is about to say.
