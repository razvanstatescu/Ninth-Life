# User feedback sessions: protocol

How we run short feedback sessions with speech-language professionals and with people who use AAC, before
the Nov 26 freeze. Source: plan §7 (`docs/plan/00-source-plan.md`). Last updated 2026-11-06.

> **This is not a clinical study.** It is informal usability feedback on a hackathon prototype. Nothing from these
> sessions is evidence that Ninth Life works for anyone's communication, and we never report it that way. We report
> what people tried, what was hard, and what we changed.

> Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended
> to diagnose, treat or replace a clinical AAC assessment.

Related: [consent](consent.md), [outreach templates](outreach.md), [session notes template](session-notes-template.md).

## Goal

Two remote sessions of 30 minutes by Nov 26, 2026: at least one with a speech-language professional (SLP), and,
if someone offers, one with a person who uses AAC and their support person. If no AAC user takes part in time, we
say so plainly in the write-up ("not tested with people who use AAC") and present the SLP feedback only.

What we want to learn:

1. Can a first-time person type and speak a short sentence without help?
2. Is the proof panel understandable ("every spoken word matches the keys on screen")?
3. Is one-switch scanning usable at an adjustable speed, and is the speed control reachable by switch?
4. What would stop someone from trying it again?

## Who and how

| Session | Participant | Present | Setting |
|---|---|---|---|
| A (first) | A speech-language professional | 1 facilitator, 1 note-taker | Video call; the participant opens the app in their own browser |
| B (optional) | A person who uses AAC | Their support person, **with their usual AAC system ready**; 1 facilitator, 1 note-taker | Video call or in person, at the participant's choice |

- Always the SLP walkthrough first, so obvious problems are fixed before anyone else spends their time.
- Adults only (18+). No one under guardianship takes part without the guardian's consent and their own assent.
- The participant uses their own device and their own access method (keyboard, touch, switch). We do not ship or
  lend hardware.
- **The person's usual AAC system stays within reach the whole time** and is how they talk to us, answer questions
  and say stop. Ninth Life is the thing being tried, never the only way to talk.
- No diagnosis, health or therapy questions. We do not ask why someone uses AAC.
- Sessions are in English or Romanian, as the participant prefers. The app is in English.
- No payment. We say thank you and send what we changed.

## Before the session

- [ ] Consent form sent at least 2 days before, in the participant's language ([consent.md](consent.md)); signed copy or
      a recorded "yes" in writing (email) received before we start.
- [ ] Ask the participant (or support person) how they prefer to communicate during the call and how they will say
      "stop" or "break" (a word, a gesture, a message in the chat, a symbol on their own system).
- [ ] Send the app URL `[APP_URL]` and ask them to open it once while online (so it works offline later).
- [ ] Check the build: the deployed version, the date, and the commit go in the session notes.
- [ ] Check speech on their browser if possible (Test voice in Settings). If no voice is available, show mode is the
      fallback; that is fine and worth noting.
- [ ] Model ranking **off** unless the participant agrees, after hearing that it sends the typed digits, candidate
      words and the "They said" line to Anthropic's Claude API.
- [ ] Prepare the session notes from [session-notes-template.md](session-notes-template.md) with a participant code
      (P01, P02 ...). Never write the person's name in the notes.

## Safety and stop rule

Stop the task, or the whole session, at once when any of these happens. No reason needed, no pressure to continue:

1. The participant or the support person says, signs, types or shows "stop", "break", "no", or anything like it, on
   any system.
2. Signs of fatigue, frustration or discomfort: repeated sighs, slowing down sharply, looking away for long, rubbing
   eyes, a support person's concern. Ask with a yes/no question ("Shall we stop?") and accept the answer.
3. 30 minutes are up. We never run over without a fresh "yes", and never past 40 minutes.
4. A task takes more than 3 minutes: stop the task, say "that is our problem, not yours", move on.
5. Any technical failure that makes the participant wait for more than 2 minutes.

Other rules:

- Offer a break at minute 15.
- Never correct the person's typing or take over their device. Hints only when asked.
- Switch scanning starts at the slowest setting (the participant may speed it up) and never uses flashing;
  the app does not pulse or blink by design.
- If a participant becomes upset or unwell, end the call kindly, leave the support person in charge, and do not
  follow up about it unless they contact us.
- If the participant asks for advice about their own AAC or therapy, say we are not clinicians and suggest their
  own SLP.

## Tasks

Use the same order every time. Facilitator reads each prompt aloud and pastes it in the chat.

| # | Task | Prompt (read aloud) | Success means |
|---|---|---|---|
| T1 | Scripted phrase 1 | "Please type and speak: I need water" | The app speaks "I need water" (or shows it in show mode) |
| T2 | Scripted phrase 2 | "Please type and speak: Can you open the window" | Spoken or shown, every word matching |
| T3 | Scripted phrase 3 | "Please type and speak: Thank you for coming" | Spoken or shown |
| T4 | Free phrase 1 | "Type anything you would like to say to me" | Spoken or shown as the person meant it (they confirm) |
| T5 | Free phrase 2 | "Type something you might say at home" (the person may skip) | As T4 |
| T6 | Switch scanning | "Turn on one switch in Settings, then speak any phrase from Phrases using only the Space bar or your switch. Change the speed if you like." | A phrase spoken or shown using only the switch |
| T7 (SLP only) | Proof panel | "Type 4 0 6333 0 92837 and tell me what the chips under the sentence mean to you" | Explains it in their own words; we note the words used |

If the app is offline at the participant's end, that is a fine condition to note, not a failure.

## Measures

The app records nothing (no analytics, no logs). The note-taker records by observation only:

| Measure | How | Per task |
|---|---|---|
| Task success | Done without help / done with a hint / not done / skipped | yes |
| Time | From the first key press to Speak, read off a stopwatch; rounded to 5 s | T1-T6 |
| Key presses | Counted by the note-taker from the screen share, if shared; else "not counted" | T1-T3 |
| Corrections | Number of Back (`*`) presses seen, and whether `#` (next word) was used | T1-T5 |
| Hints | What we said, verbatim | yes |
| Observations | What happened, with no judgement words | yes |

The 5-question rating at the end, each on a 1 to 5 scale (1 = not at all, 5 = very much). This is our own short
question set, **not** a validated instrument; we report the answers as they are, never as a score.

1. It was easy to type a sentence.
2. I understood which words would be spoken.
3. The speech (or the big text) was clear enough for someone with me.
4. Switch scanning was usable at a speed that suited me. (Skip if T6 was skipped.)
5. I would try this again.

Plus two open questions: "What was the hardest part?" and "What one thing should we change first?"

For a participant who uses AAC, ask the rating questions one at a time, as yes/no or a pointed number if that
is easier, with their usual system. Their way of answering is the right way.

## 30-minute script

| Time | Step | Say (or paste) |
|---|---|---|
| 0:00 | Welcome | "Thank you for your time. I'm [first name], and [first name] is taking notes. We are testing a free prototype, not you. You can stop at any time, for any reason. How would you like to tell us to stop or take a break?" |
| 0:02 | Consent check | "You agreed to [the items they ticked]. We are not recording video or audio [or: we are recording audio only, as you agreed]. Is that still OK?" Wait for a clear yes. |
| 0:04 | What it is | "Ninth Life is a web page where you press keys 2 to 9, one press per letter, and it speaks the sentence you meant. It is a general-purpose text entry and text-to-speech tool, not a medical device. Please keep [your usual system] ready the whole time." |
| 0:06 | Tour, 1 minute | "The keys are here. 0 is space. Speak is here. Settings has the voice and switch options. That's all." No more explanation. |
| 0:07 | T1-T3 | Read each scripted phrase. Note success, time, presses, corrections, hints. |
| 0:15 | Break offer | "Would you like a short break?" |
| 0:16 | T4-T5 | Free phrases. Ask "Is that what you meant?" after each. |
| 0:21 | T6 | Switch scanning. Start at the slowest speed. |
| 0:25 | T7 (SLP) | Proof panel question. For an AAC user, skip to the rating. |
| 0:26 | Rating | The 5 questions, then the 2 open questions. |
| 0:29 | Close | "Thank you. We will send you a short summary of what we change. If you said yes to quotes, we will send any quote for your approval before we use it. You can withdraw any time by replying to our email." |
| 0:30 | End | Stop the stopwatch, save the notes. |

## After the session

- Within 24 hours: clean up the notes, remove anything that could identify the person (no names, places, employers,
  phrases they typed that are personal), and store them in the team's **private** notes folder, not this repo.
- Open issues for problems seen, citing the participant code and task (for example "P01 T6: could not find the
  scan speed").
- Add one row to the public log below: code, date, role, tasks done, the main findings. No quotes unless approved.
- Send the participant a thank-you and, later, the list of changes.
- Delete contact details within 30 days after judging ends (Jan 29, 2027) unless the person asked to stay in touch.

## How we report it

Allowed: "We ran N feedback sessions with [roles]. They found X hard; we changed Y." "Not tested with people who use
AAC" when that is true.

Never: efficacy, speed or accuracy claims from these sessions; "validated", "tested with patients", "clinically";
percentages from 2 people; quotes without written approval; anything that hints at a participant's identity or
health.

## Public validation log

The README and Devpost text may only say the app was tried with AAC users if a row below says so.

| Code | Date | Role | Tasks done | Main findings | Changes made | Quote approved |
|---|---|---|---|---|---|---|
| | | | | | | |
