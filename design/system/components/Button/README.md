# Button

Buttons start an action in one tap, with a verb that says exactly what happens.

- **Primary (`nl-btn--primary`)**: ember fill, on-ember text. One per screen, and in the app it is almost always **Speak**. Use `nl-btn--xl` (80px tall) for Speak.
- **Secondary (`nl-btn--secondary`)**: line-strong border on the ground. Clear, Cancel, Back.
- **Quiet (`nl-btn--quiet`)**: surface-sunken fill. Save phrase, Settings, Voice.
- **Danger (`nl-btn--danger`)**: danger border and text, always with the x icon. Clear history, Delete phrase. Ask to confirm.

Rules: minimum height `target-min` (56px), label 18px bold, an icon only beside a word (never icon-only without `aria-label`). Focus ring is `focus-width` in `focus` with a 3px offset. The consumer provides a real `<button>` or `<a href>`.

**Toggle (`aria-pressed`)**: a segment that stays pressed, in a `role="group"` where at most one is pressed (the app's reply types, web-ui Req 29). The group is a segmented control: one `surface-sunken` track (with its label at the start where it has no title), the segments bare on it, so it never reads as a row of things to say. Pressed: lifted to `surface`, a 2px `ink` border and a 2px inset `ink` ring (4px together), and a check icon (above the word on a narrow track). Never ember, so Speak stays the one ember thing; never color alone. Pressing the pressed one releases it.
