# Design: access-modes

## Architecture
```
 packages/web (owner: web UI)                      packages/core/src/scan.ts (owner: core)
 ┌──────────────────────────────┐   ScanEvent      ┌─────────────────────────────────┐
 │ timer: every scanMs → tick   │ ───────────────► │ scanReducer(cfg, state, event)  │
 │ switch A → select / advance  │                  │   → { state, chosen? }          │
 │ switch B → select            │ ◄─────────────── │ initialScan(cfg)                │
 │ debounce acceptDelayMs       │   state, chosen  └─────────────────────────────────┘
 │ render highlight; act on     │
 │ chosen {row, cell}           │   cfg = { rows: cells per row, loops: scanLoops }
 └──────────────────────────────┘
```
The reducer has no timers and no I/O, so it is testable with property tests and replayable. The UI
rebuilds `cfg.rows` whenever the grid changes (e.g. the number of candidates in row 0), and the
reducer repairs the state on the next event.

## Data shapes
```ts
interface ScanConfig { rows: number[]; loops: number }      // rows[i] = cells in row i
type ScanPhase = 'idle' | 'rows' | 'cells' | 'paused';
interface ScanState { phase: ScanPhase; row: number; cell: number;
  loopsLeft: number;  // passes left in this phase, including the current one
  steps: number }     // highlight steps since the last choice / reset / resume
type ScanEvent = { type: 'tick' } | { type: 'select' } | { type: 'advance' } | { type: 'reset' };
interface ScanResult { state: ScanState; chosen?: { row: number; cell: number } }
```

## State machine

`first` = first row with cells. `L` = `max(1, floor(loops))` (NaN → 1, Infinity → never pause).

| Phase | `tick` | `advance` | `select` |
|---|---|---|---|
| idle | → rows, row = first, steps + 1 | same as tick | → rows, row = first, steps = 0 (chooses nothing) |
| rows | next non-empty row; on wrap: loopsLeft − 1, and if it reaches 0 → paused | next non-empty row; no pass counting | → cells, cell = 0, loopsLeft = L |
| cells | next cell; on wrap: loopsLeft − 1, and if it reaches 0 → paused | next cell; no pass counting | **choose (row, cell)**; → rows, row = first, steps = 0, loopsLeft = L |
| paused | ignored | → rows, row = first (resume) | → rows, row = first, steps = 0 (chooses nothing) |
| any | `reset` → initial state | | |

Before any event: if no row has cells, the state returns to (or stays) idle. If the lit row has no
cells any more, row scanning restarts at `first`; if the lit cell no longer exists, it moves to 0.

**Why the bound holds.** From idle, the first tick lights `first` (row 0 when it has cells). Row r
is lit after at most r + 1 steps (fewer when empty rows are skipped), select opens it at cell 0,
cell c is lit after c more steps, select chooses it: at most r + 1 + c <= R + C − 1 steps and
exactly 2 selects. No wrap is needed, so the bound holds for any `loops >= 1`.

**Pass counting.** Each non-empty row is lit exactly L times before the pause (the first tick from
idle starts pass 1). Inside a row, cell 0 is lit when the row is selected, and each cell is lit
exactly L times before the pause.

## Correctness properties

| # | Property | Validates | Test (`packages/core/test/scan.test.ts`) |
|---|---|---|---|
| S1 | For every R, C in 1..8 and every cell (r, c), auto and step scan: chosen = (r, c), exactly 2 selects, steps = r + 1 + c <= R + C | Req 3.1 | "Req 3.1 reachability ... (exhaustive)" |
| S2 | For random ragged grids (0..8 cells per row, some rows empty) and any existing target: chosen = target, 2 selects, steps <= R + C | Req 3.1, 3.3 | "Req 3.1 reachability holds for ragged grids ..." |
| S3 | Ticks from idle: every non-empty row lit exactly `loops` times, then paused, and further ticks change nothing | Req 1.5 | "Req 1.5 pause after loops ..." |
| S4 | Ticks inside a row: every cell lit exactly `loops` times, then paused | Req 1.5 | "Req 1.5 pause after loops inside a row ..." |
| S5 | Any number of advances never pauses; advance resumes a paused scan | Req 2.1, 2.2 | "Req 2.1 + 2.2 ..." |
| S6 | Any event sequence, with the grid replaced at random between events: chosen cells always exist, the lit row always has cells, the input state is never mutated | Req 3.2, 3.3, 3.5 | "Req 3.2 + 3.3 any event sequence ..." |
| S7 | Malformed configs (negative, fractional, NaN, huge cell counts; loops −2..5, NaN, 2.5, Infinity): chosen cells are integers that exist, phase is valid, loopsLeft is never NaN | Req 3.2 | "Req 3.2 messy configs ..." |

Example tests cover Req 1.1-1.4 (walk-through), 1.6 (resume without choosing), 3.3 (all-empty grid,
skipping empty rows) and 3.4 (reset).

## Notes for the web UI
- Send `tick` from a timer only while the phase is `rows` or `cells` (or `idle` if auto-start is
  wanted); stop the timer when the phase is `paused` and show a "paused, press to resume" hint.
- `chosen.row`/`chosen.cell` index into the same `rows` array you passed in `cfg`.
- Mean scan steps per selection on the 4 x 3 keypad block: (4 + 1)/2 + (3 + 1)/2 = 4.5.
