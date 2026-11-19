# Devpost image gallery

Nine 3:2 images (3000x2000 JPG, each under 1 MB; Devpost allows 5 MB and 15 images), uploaded in this order.
Every screen is the real app or website at https://night.statescu.net, captured in the Night theme with model
ranking off (the default). Nothing is drawn or generated.

| File | Kind | Caption |
|---|---|---|
| `01-cover.jpg` | marketing | Type on 9 keys, hear your sentence: the old phone keypad, back as a way to talk. |
| `02-every-device.jpg` | marketing | Phone, tablet and laptop: the whole app fits on one screen, with nothing to scroll. |
| `03-proof-check.jpg` | marketing | The proof check: every word is turned back into keys, and a word that does not match is dropped, never spoken. |
| `04-conversation.jpg` | product | Answering what they just said: their line on top, your sentence, the reply types and the sentences for your keys. |
| `05-show-and-flip.jpg` | marketing | No voice? Show puts your sentence in big text, and Flip turns it to face the other person. |
| `06-switch-scanning.jpg` | product | One-switch scanning: rows, then keys, from 0.4 to 5 seconds a step, with no time limits. |
| `07-spell-a-name.jpg` | marketing | Spell a name once: choose the letter for each key, then add it to My words. |
| `08-offline-privacy.jpg` | marketing | Offline unless you choose: typing, the dictionary and the proof check run in your browser. |
| `09-measured.jpg` | marketing | Measured, not promised: results from a simulated typist on 866 test sentences, not from studies with people. |

## Regenerate

From `packages/web`, with Playwright installed (the e2e setup):

```sh
BASE_URL=https://night.statescu.net node ../../docs/submission/assets/gallery/capture.mjs   # raw/*.png from the live site
node ../../docs/submission/assets/gallery/compose.mjs                                     # NN-name.png slides
cd ../../docs/submission/assets/gallery
for f in 0*.png; do sips -s format jpeg -s formatOptions 90 "$f" --out "${f%.png}.jpg" && rm "$f"; done
cp ../devpost-thumbnail.jpg 01-cover.jpg
```

`capture.mjs` takes optional names to redo one shot (`laptop-convo`, `laptop-show`, `laptop-scan`, `laptop-spell`,
`phone`, `tablet`, `laptop`, `site`); `compose.mjs` takes slide names. The cover is the Devpost thumbnail
(`../devpost-thumbnail.mjs`).
