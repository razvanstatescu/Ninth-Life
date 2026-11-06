# Keypad

The 12-key pad on the moon-colored bubble: the app's main control and the icon brought to life.

Layout is fixed so motor memory holds: 1 punctuation, 2 to 9 letters, `*` Back, 0 Space, `#` Next word. Keys are `nl-key`; rows are `nl-keypad__row`; the panel is `nl-keypad` (`panel` fill, `radius-panel`, `lift`).

**Switch scanning.** In row and column scanning, the active row gets `is-scanning` (an ember ring plus a plum outer ring, visible in both themes), then the active key inside it gets `is-lit`. Any key is reachable in at most 4 + 3 = 7 highlight steps and two switch presses. Scan speed comes from settings (400 to 5,000 ms, default 1,200 ms); motion is a highlight jump, never a slide.

The consumer provides the key handlers and the scan timer. Never reorder keys, never hide the digit, never add a tenth letter key.
