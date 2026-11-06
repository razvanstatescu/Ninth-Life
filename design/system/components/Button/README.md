# Button

Buttons start an action in one tap, with a verb that says exactly what happens.

- **Primary (`nl-btn--primary`)**: ember fill, on-ember text. One per screen, and in the app it is almost always **Speak**. Use `nl-btn--xl` (80px tall) for Speak.
- **Secondary (`nl-btn--secondary`)**: line-strong border on the ground. Clear, Cancel, Back.
- **Quiet (`nl-btn--quiet`)**: surface-sunken fill. Save phrase, Settings, Voice.
- **Danger (`nl-btn--danger`)**: danger border and text, always with the x icon. Clear history, Delete phrase. Ask to confirm.

Rules: minimum height `target-min` (56px), label 18px bold, an icon only beside a word (never icon-only without `aria-label`). Focus ring is `focus-width` in `focus` with a 3px offset. The consumer provides a real `<button>` or `<a href>`.
