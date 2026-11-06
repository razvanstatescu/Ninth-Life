# Requirements: access-modes

## Introduction
Some people cannot press a keypad but can operate one or two switches (a button, a head switch, a
sip-and-puff switch, or a key mapped as a switch). Ninth Life supports them with row/column
scanning over the communication grid: rows 0-3 hold the keypad (1-9, *, 0, #), row 4 the
sentences (skipped when there are none), row 5 the actions (Speak, Clear, Save phrase, Show) and
row 6 the header (Menu, or Phrases / Voice / Settings). Keypad rows come first because typing is what
a switch user does most: any key is then at most 4 + 3 = 7 highlight steps away, as the Keypad README
promises. With sentences in row 0 a key would take up to 5 + 3 = 8 steps, and the keypad rows would
move whenever the sentence list appeared or emptied (M1 review F3, 2026-11-06). Sheets (Settings,
Phrases, Menu) and show mode are scanned the same way, with their own rows (web-ui Req 16). The scanning logic is a pure
reducer in `@ninth/core` (`packages/core/src/scan.ts`); timers, input mapping and rendering live in
`packages/web`.

Contract: `docs/architecture/contracts.md` §1 (scan.ts). Clarifications: `docs/decisions/ADR-core-001-contract-clarifications.md` §5.

## Glossary
- **Highlight step**: one move of the highlight (a `tick` in auto scan, an `advance` in step scan).
- **Pass**: the highlight visiting every non-empty row (or every cell of the selected row) once.
- **R**: number of rows; **C**: number of cells in the longest row.

## Requirement 1: One-switch auto scan
**User story:** As a person who uses a single switch, I want the highlight to move by itself and one
press to pick, so that I can reach any key with one switch.

1.1 WHEN a tick arrives while scanning is idle, THE system SHALL highlight the first row that has cells.
1.2 WHILE row scanning is active, WHEN a tick arrives, THE system SHALL move the highlight to the
    next row that has cells, wrapping from the last to the first.
1.3 WHEN select is pressed during row scanning, THE system SHALL start cell scanning at cell 0 of
    the highlighted row.
1.4 WHEN select is pressed during cell scanning, THE system SHALL choose the highlighted cell and
    restart row scanning at the first row that has cells.
1.5 IF `loops` full passes complete without a select, THEN THE system SHALL pause, and WHILE paused
    THE system SHALL ignore ticks.
1.6 WHEN select is pressed while paused (or idle), THE system SHALL resume row scanning at the first
    row that has cells, without choosing anything.

## Requirement 2: Two-switch step scan
**User story:** As a person who uses two switches, I want one switch to move and the other to pick,
so that the scan goes at my pace.

2.1 WHEN advance is pressed, THE system SHALL move the highlight exactly as a tick would.
2.2 THE system SHALL NOT pause because of advance presses, AND WHEN advance is pressed while paused
    THE system SHALL resume row scanning.

## Requirement 3: Reachability and robustness
**User story:** As a switch user, I want a known upper bound on the effort to reach any key, and a
scanner that never gets stuck, so that I can rely on it all day.

3.1 WHILE row/column scanning is active, THE system SHALL make every cell reachable from idle within
    R + C highlight steps and exactly 2 selections, for any grid with R, C in 1..8.
3.2 IF the grid changes between events (e.g. fewer candidates), THEN THE system SHALL repair a
    highlighted row or cell that no longer exists before applying the event, and SHALL only ever
    choose a cell that exists; malformed settings (negative, fractional or NaN cell counts; loops
    below 1 or NaN) SHALL NOT break the scanner.
3.3 THE system SHALL skip rows that have no cells, AND IF no row has cells THEN THE system SHALL stay idle.
3.4 WHEN reset is sent, THE system SHALL return to the initial idle state.
3.5 THE reducer SHALL be pure: it SHALL NOT mutate its input state and SHALL return the same result
    for the same inputs.

## Requirement 4: Timing and input (implemented in packages/web)
**User story:** As a switch user, I want to set the scan speed and debounce, so that the scan fits my
movement (WCAG 2.2.1 adjustable timing).

4.1 THE system SHALL let the person set the scan interval (`scanMs`, default 1,200 ms, range 400 to
    5,000 ms) and the number of loops before pausing (`scanLoops`, default 3).
4.2 WHEN a switch press arrives within `acceptDelayMs` (default 150 ms) of the previous one, THE
    system SHALL ignore it.
4.3 THE system SHALL accept Space and Enter (common switch-interface mappings), click and
    whole-screen touch as switch input.
