# Tasks: access-modes

## Core reducer (owner: core, `packages/core/src/scan.ts`)
- [x] 1. `initialScan`, `scanReducer` phases idle / rows / cells / paused (Req 1.1, 1.2, 1.3, 1.4)
  - [x] 1.1 Example walk-through of auto scan (Req 1.1–1.4)
- [x] 2. Pass counting and pause after `loops`; select resumes without choosing (Req 1.5, 1.6)
  - [x] 2.1 Property: each row lit exactly `loops` times, then ticks ignored (Req 1.5) — S3
  - [x] 2.2 Property: each cell lit exactly `loops` times, then paused (Req 1.5) — S4
  - [x] 2.3 Example: select while paused (Req 1.6)
- [x] 3. Step scan via `advance`, never pauses, resumes a paused scan (Req 2.1, 2.2) — S5
- [x] 4. Reachability bound R + C steps and 2 selects (Req 3.1)
  - [x] 4.1 Exhaustive check, R, C in 1..8, auto and step scan — S1
  - [x] 4.2 Property on ragged grids with empty rows — S2
- [x] 5. Repair state when the grid changes; skip empty rows; tolerate malformed settings (Req 3.2, 3.3) — S6, S7
- [x] 6. `reset` (Req 3.4) and purity (Req 3.5) — S6

## Web UI (owner: web UI, `packages/web`)
- [ ] 7. Timer that sends `tick` every `scanMs` while scanning; stops when paused (Req 4.1, 1.5)
- [ ] 8. Settings for `scanMs` (400–5,000 ms), `scanLoops`, `acceptDelayMs` (Req 4.1, 4.2)
- [ ] 9. Switch input: Space / Enter / click / whole-screen touch mapped to `select` (1-switch) or `advance` + `select` (2-switch), with debounce (Req 4.2, 4.3)
- [ ] 10. Build `cfg.rows` from the live grid (candidates row, keypad rows, actions row) and act on `chosen` (Req 3.2)
- [ ] 11. Playwright + axe check of scanning with reduced motion and visible focus (Req 4.1)
