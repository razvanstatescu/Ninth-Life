# ADR-007: The conversation thread is memory only; sending what you said is a second opt-in

- Status: accepted, to be confirmed by the product owner
- Date: 2026-11-11
- Decided by: the team lead for features A-C (written with Claude Code)
- Spec: `web-ui` Req 27 (and 12.1, 12.2, 13.2, 25.3); code `packages/web/lib/conversation.ts`
- Related: ADR-003 (one screen), ADR-004 (Listen), ADR-005 (short phones)

## Context
The app kept one "They said" line and forgot everything the person said. People asked to say a line again, show it
again, or see what was just said. A thread of turns (they said, you said) does that, but it is a record of a private
conversation. privacy.md says what people say is never stored, and Req 13.2 says They said is never stored. Research
on AAC logging ("I, Robot?", 2025) found that a visible log made a user hold back, and Lingraphica clears its history
on leaving. Model ranking could also use the person's recent lines, which today's opt-in copy does not cover.

## Options
1. sessionStorage. Rejected: it survives a reload and is written to disk, which breaks Req 13.2 and privacy.md.
2. IndexedDB with a "keep history" switch. Rejected for v1: a stored log needs its own consent, deletion and export
   story, and the product does not need it to work.
3. A timed auto-clear (for example after 30 minutes). Rejected: accessibility rule 9, nothing times out. Left as an
   open question for the product owner.
4. Memory only (a module store), cleared by reload, leaving or closing the page, or Clear conversation (with a
   confirm). Chosen.
5. Send recent lines to the model whenever ranking is on. Rejected: people turned ranking on agreeing to "keys and the
   last thing they said"; sending more needs a new yes.

## Decision
- The thread lives in a module-level store read with `useSyncExternalStore` (server snapshot: empty). No storage API
  is imported by `lib/conversation.ts`. At most 50 turns; their lines at most 280 characters, yours at most 500.
- "You said" turns come from what the person chose to say or show: Speak, a phrase, a quick reply, Say again, Show.
  Test voice is not a turn. The same line again within 60 s is one turn. "They said" turns come from Done in the They
  said field; Change edits only the newest one.
- Where it shows is measured so the keys never move (`threadRows`): Menu only under 620px, the header button on phones,
  a fixed 2-turn strip on split and 1150px-tall stacks, a 3-turn panel on laptops.
- A new setting, "Include what you said" (`llmRecent`, default off, shown only while model ranking is on), sends the
  last 3 "you said" lines from before the current sentence as `context.recent`. Off: `recent` is `[]`.

## Consequences
- The thread is gone after a reload, and after the About or Welcome link (they load a new page). The sheet says so.
- Share and Copy hand the text to the app the person picks; the About page says so.
- The decode cache key includes `recent`; the request stays under 4 KB (the client drops the oldest recent line).
- B (quick replies) and C (reply types) build on `useConversation`, `sayAndRecord`, `awaitingReply` and
  `decodeContext`, not their own state.
- The way back: drop `llmRecent` and the `recent` argument; the thread itself has no stored data to migrate.
