# Third cut: "Hello again", v3 (2:18)

Written 2026-11-19. Builds on the second cut (`07-revision-v2.md`); where they differ, this file wins.

## 1. The owner's request

Devpost's video checklist asks two things the second cut answered weakly:
- Does the video show the project working?
- Does it show how Kiro was used?

The owner asked for:
- **More of the real app** in the middle, where the features are shown. Keep the hypermotion style: morphs and moving
  pieces, and keep it engaging.
- **A longer Kiro chapter, with voice and sound.** It shows the features used and how they helped, including the
  GitHub Action that runs the Kiro CLI. No editor footage.
- **At most 20 s longer.**

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| T1 | **2:18, exactly 20 s longer.** Two segments are new: the real-app reel (s12b, 5 bars, 10 s) after ghost mode, and the Kiro chapter (s14), now 7 bars (14 s) instead of 2 | The approved lines need about 9 s and 12.3 s of speech |
| T2 | **The six new narrator lines were approved by the owner:** n18b-d for the reel and n19b-d for Kiro (`scripts/audio/prompts/narration.json`) | They answer the problem's "The conversation moves on." and name each Kiro feature |
| T3 | **"Kiro's CLI *can* review pull requests"** | The `kiro-review` workflow is set up but has never run on GitHub: no runs, because it needs `KIRO_API_KEY` and a labelled PR. The owner chose to show the setup. No review text is shown, only the comment's real header and footer lines |
| T4 | **D15 still holds.** The chapter says "Made for Kiroween 2026" and never "Built with Kiro" | |
| T5 | **The reel's voice and speech recogniser are stand-ins.** The capture uses the app's e2e speech stub and a fake recogniser, so Listen shows real states | Headless Chrome has neither. No voice is claimed, and nothing in the reel speaks |
| T6 | **No ember in the reel.** The captured states have none, and presses are moon rings and a drawn pointer | One ember thing |
| T7 | **No capture shows the sentences list** | Its fifth line is a brand word ("neff") |

## 3. Bars

| Scene | Bars | Time | Content |
|---|---|---|---|
| s01-s12 | Act 1, 1-32 | 0:00-1:32 | unchanged (s10-s12 use the refreshed `phone-water` / `phone-offline` captures) |
| **s12b** | 33-37 | 1:32-1:42 | the real-app reel |
| s13 | 38-39 | 1:42-1:46 | access, unchanged (`shift: 5`) |
| **s14** | 40-46 | 1:46-2:00 | the Kiro chapter |
| s15 | 47-50 | 2:00-2:08 | same keys, "I have something to say" (`shift: 10`) |
| s16 | 51-55 | 2:08-2:18 | the lockup and the closing card (`shift: 10`) |

**Scenes written for the 1:58 cut keep their bar numbers.** `SCENES[id].shift` in `timeline.ts` moves them, and
`atIn()` adds it. `NARRATION_AT`, `VOICE_AT`, `QUIET_ZONES`, `MUSIC.mutes` and the caption cues in `make-srt.ts` use
the new bar numbers.

## 4. The real-app reel (s12b)

**Captures.** All from the live app, `node scripts/capture/capture.mjs convo show-water`:
- `convo-you`, `-listening`, `-heard`, `-their`, `-yes`, `-thread`: the laptop at 4x, with the blocks' boxes;
- `show-water-upright`, `show-water-flipped`: the phone at 3x.

**Shots.** Following n18b-d:
- **The strip.** A macro on the real strip, "You: I need water". In the narrator's pause the rest of the screen flies
  in from depth and seats around it (lift and re-seat).
- **Listen.** The pointer clicks Listen: the panel opens and the blocks below move down. Their words type into the
  field, then Done.
- **One press.** "Do you want it cold?" shows with the quick replies and the reply types. "Yes." is pressed on "one".
- **The whole conversation** slides in, newest first.
- **Show and Flip.** Show is pressed on "I need water", then a whip and a match cut on those words to the phone's Show
  screen. Flip turns the message 180 degrees: a real crop, landing on the real flipped capture. The phone lays back and
  moves away "to face them".

**Recipes.** From the research report of 2026-11-19:
- cut a capture into its own blocks;
- swap only the boxes that change (the app changes state in one step);
- tween only the blocks that move;
- give each change a visible cause (the pointer).

## 5. The Kiro chapter (s14)

**Title.** "Made for Kiroween 2026" on the lift, then the header.

**Stations.** Four, with the camera trucking right in the narrator's pauses:
1. **Spec.** web-ui 1.3 (0 commits the current word), then its task, ticked on "specs".
2. **Steering.** product.md 45 and privacy.md 28.
3. **Hooks.** A saved file pulses to `core-pbt-on-save` and `trademark-guard` (PostFileSave), which light on "run".
   Their results land on "checks": `Tests 141 passed` and `tm-lint: clean`, as run on 2026-11-19.
4. **CLI.** The workflow's own steps light in turn, with the active one in ember. Then the `kiro-cli chat --v3
   --no-interactive --agent pr-reviewer` line, the read-only agent, and the comment it posts.

**Rail.** A row along the bottom names every Kiro feature in `.kiro/`: Specs, Steering, Hooks, Agents, MCP, Powers
and CLI.

**Checks.** Every quoted line is checked by `npx tsx src/components/close/verify-kiro.ts`: 17 lines, from `.kiro/` and
`.github/workflows/kiro-review.yml`.

**When the workflow first runs,** its real comment can replace the card's header-only view.

## 6. Sound

**Music.** `act2-v3*` is v2's own bars rearranged to 55 by `scripts/audio/music_extend.py`, with no new generation.
Bar map:
- 1-32 → 1-32
- 33-37 → 19-23 (the solution groove, its breath and lift)
- 38-39 → 33-34
- 40-46 → 35, 36, 33, 34, 35, 35, 36 (the lift, the access groove, the lift)
- 47-55 → 37-45

Each splice gets a 30 ms crossfade before its bar line, and none has a click (checked against the track's own
sample-to-sample steps).

**Narration.** eleven_v4 ignores `voice_settings.speed`. Two lines were read too fast, so their sent text carries
pauses: the `say` field, while `text` keeps the approved words for checks and captions.
- n18d-show-flip is a fallback at 3.15 words a second;
- n19d-cli is a fallback at 1.97 words a second ("CLI" is spelled out);
- n18b, n18c, n19b and n19c pass.

`check-narration.ts` now measures gaps speech to speech.

**Effects.** Only the existing ones: ticks, whooshes in the pauses, flip, thump and sub-hit.

## 7. Second pass (the owner's review, 2026-11-19)

The owner said the real-app part was "still a bit rushed", and the Kiro part "a bit messy, text getting out of boxes".

### The real-app reel (s12b)

Three shots, one per narrator line, with a hold after every change.

**Shot 1.** The strip macro drifts in for about 0.9 s. The blocks then fly in over 0.6 s, 4 frames apart, while the
camera pulls out over 1 s.

**Shot 2.** One framing for the whole conversation, with no camera moves:
- Listen, then the panel opens;
- their words type in over 0.75 s;
- a hold, then Done: their line, the quick replies and the reply types;
- "Yes." on "one", then a hold.

**Shot 3.** A cut on bar 36 to the phone, with "I need water" typed:
- Show grows out of its own button, then a hold on the big text;
- Flip, then the phone lays back.

**Cut from the first pass:**
- the Whole conversation sheet and the push into it;
- the Show press on the thread;
- the whip and the match cut.

### The Kiro chapter (s14)

**Cards.** A new `QuoteCard` sizes itself to its content, with even padding and lines that never wrap. Every quoted
line fits one line at 34-40 px:
- **Short real lines replace the long ones:** web-ui 1.3 for the spec, product.md 45 for steering.
- **Two long lines show only the part that matters,** with the cuts marked "…": task 5 (which implements Req 1.2-1.6)
  and the kiro-cli line. `verify-kiro.ts` checks that each shown piece is in the line, in order.

**Screen.** At most two cards at a time. A station leaves, stepping back and fading, before the next one's first
element lands. The CLI station shows its three steps on one line each, and below them one card at a time: the CLI
line, then the read-only agent, then the comment.

### From the second research report (2026-11-19)

This pass follows its main rules:
- about 4 main events in 10 s, roughly one per clause;
- change scale by cutting, not zooming;
- no UI change within 30 frames of a cut;
- one card in focus per station;
- cards sized to the font (Atkinson Mono is 0.632 em per character);
- nothing outside 96 px side margins.

Four changes come from the report:
- **The reel's presses.** The control lights softly about 10 frames before each press.
- **The reel's Flip.** A 4-degree counter-turn over 7 frames, then 180 degrees over 0.65 s.
- **The Kiro chapter's focus.** The earlier card darkens when the next one lands.
- **The hooks station.** Re-laid inside the title-safe width.

Sources: launch-film timing measured by AgentsORG (github.com/AgentsORG/design-engineering, docs/research/launch-films);
Netflix timed-text and title-safe guidelines; the Remotion layout-utils and Code Hike template docs.

## 8. Open

- Real phones and tablets are still untested (product.md).
- If the owner runs `kiro-review` once, swap the comment card for the real review and say "reviews".
