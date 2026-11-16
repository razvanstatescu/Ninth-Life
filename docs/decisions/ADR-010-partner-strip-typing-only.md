# ADR-010: The partner strip is opt-in and shows only "Typing…" before Speak

- Status: accepted
- Date: 2026-11-16
- Decided by: the lead (decision 3 of `docs/plan/02-improvement-plan.md`, D-strip), to be confirmed by the product owner
- Spec: `web-ui` Requirement 33; code `packages/web/lib/partner.ts`, `packages/web/components/PartnerStrip.tsx`

## Context
While the person types, the other person sees and hears nothing, so they talk on, guess or leave. "It makes me very
anxious to keep the person waiting" (community research, `docs/research/improvement-plan/community.md`). Web-ui Req 28.3
says the app shows no typing status unless the person chose it.

## Options
1. Show the words live, as they are typed. Rejected: it invites the partner to guess and finish the sentence, which is
   dismissive, and shows words the person has not chosen to say.
2. A second screen on the partner's phone. Rejected: it needs a relay server and pairing, and does not work offline.
3. An opt-in band at the top of the screen, turned to face the person opposite, that shows "Typing…" while keys are
   pressed and the sentence only once it was spoken or shown. Chosen.

## Decision
- Settings > Partner strip: Off (default), "Turned to face the person opposite", "Upright, for someone beside you".
- The band reads only whether a sentence is in progress and the conversation's own turns (memory only, ADR-007). It
  never sees the sentence being typed. No controls, not a live region, no motion, no timeout.
- One-screen shells give the band its height: full (112px) from 740px tall, compact (64px, one line) from 640px; split
  752 / 688px; laptops always full. Below that it stays off on screen and Settings says why.

## Consequences
- A phone between two people needs about 740px of visible height for the full band.
- Every height rule of the shells has a shifted twin (`shiftQuery`, `.app--partner-*` in `styles/app.css`).
- The way back: set it Off; nothing else depends on it.
