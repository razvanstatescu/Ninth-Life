# Submission checklist

Every rules requirement and bonus, with an owner and a status. Rules facts are from
`docs/research/assumptions-register.md` (rows R-01 to R-10, verified against https://kiroween.devpost.com/rules on
2026-11-06). The rules page returned 403 to an automated fetch on 2026-11-06 (second check), so **re-read the live rules
page once by hand before submitting** and tick here.

Last updated 2026-11-06. Owners are roles (plan §6): **Lead** (A: core, decoder, Kiro config), **Web** (B: web UI,
access, design, video), **Data** (C: data, eval, Crew app, docs, outreach), **Sub** (speech, validation and submission
owner). Status: **done**, **in progress**, **todo**, **open** (needs a decision or an answer).

## Key dates (Pacific Time)

| Date | What | Status |
|---|---|---|
| Oct 30, 2026 9:00 am | Submission period opened | — |
| Nov 26, 2026 | Internal feature freeze (M4); user sessions done; RESULTS.md re-run soon after | todo |
| **Dec 1, 2026 12:00 pm** | **Last moment to request hackathon Kiro credits** (Credit Request Form in the rules; Kiro user ID or AWS account ID; allow 48 business hours) | todo for all 3 (request now; nothing in the repo shows it was done) |
| Dec 3, 2026 | Our submit day (24 h buffer) | todo |
| **Dec 4, 2026 2:00 pm** | **Submission deadline** (also the last day to redeem credits) | — |
| Dec 16, 2026 1:00 pm to Jan 29, 2027 1:00 pm | Judging: the app must stay free and working the whole time | — |
| Dec 31, 2026 11:59 pm | Redeemed credits expire | — |
| ~Feb 3, 2027 9:00 am | Winners announced | — |

## Eligibility and project

| # | Requirement | Owner | Status | Evidence / next step |
|---|---|---|---|---|
| E1 | Team of at most 3, each of the age of majority, in an eligible country (Romania is not excluded) (R-08) | Lead | todo | Each member confirms age and country on Devpost |
| E2 | Every member registered on the hackathon page and joined the Devpost team | all | todo | Screenshot of the team page |
| E3 | New project built in the submission period; disclose anything pre-existing (R-01) | Lead | done | [`PRIOR_WORK.md`](../../PRIOR_WORK.md): repo created 2026-11-06, no earlier code |
| E4 | Built with Kiro; "insufficient use of Kiro will result in disqualification" (R-02) | Lead | **todo, high risk** | [`docs/KIRO_LOG.md`](../KIRO_LOG.md) has **0 Kiro rows** so far (row 1 is a non-Kiro setup session). Start logged Kiro sessions now, 3 rows a person a day |
| E5 | No financial or preferential support from the sponsor | Lead | todo | Confirm in writing among the team; Anthropic API paid from our own account (ADR-001) |
| E6 | Third-party integrations used under their terms (R-02, plan §9) | Data | in progress | Anthropic API terms; dataset licenses in [`data/NOTICE.md`](../../data/NOTICE.md); fonts OFL |
| E7 | Materials in English | Sub | in progress | Devpost text, write-up, video in English. Outreach in Romanian is internal, not a submission material |

## Repository

| # | Requirement | Owner | Status | Evidence / next step |
|---|---|---|---|---|
| G1 | Public GitHub repository URL in the submission | Lead | todo | Repo visibility not confirmed from here; make it public before Dec 3 |
| G2 | Open source license file **detectable and visible at the top of the repo page (About section)** (R-07) | Lead | in progress | MIT [`LICENSE`](../../LICENSE) at the root; data under CC BY-SA 4.0 in `data/LICENSE`. Check GitHub shows "MIT license" in About once public |
| G3 | **`/.kiro` at the repo root and not in `.gitignore`** (rules: ignoring it "could disqualify") (R-06) | Lead | done, keep checking | 34 tracked files under `.kiro/`; `.gitignore` has a "never ignore .kiro" note; CI runs `node scripts/check-kiro-not-ignored.mjs --require-tracked` ([`ci.yml`](../../.github/workflows/ci.yml)) |
| G4 | README explains what it is, how to run it, the intended purpose | Sub | done (update at ship) | [`README.md`](../../README.md) |
| G5 | Every number in public text traced to `packages/eval/RESULTS.md` | Sub | in progress | [DEVPOST.md](DEVPOST.md) table copied from RESULTS.md on 2026-11-06; re-copy after the final eval |
| G6 | No banned trademark words anywhere | all | done (CI) | `node scripts/tm-lint.mjs` in CI and the `trademark-guard` hook |
| G7 | Tag `v1.0.0` | Lead | todo | Dec 2 |

## App availability and testing

| # | Requirement | Owner | Status | Evidence / next step |
|---|---|---|---|---|
| A1 | A working app URL; judges can test it without a login | Web | todo | M2 (Nov 14): deployed PWA on Vercel. No accounts by design |
| A2 | Free and working until judging ends (Jan 29, 2027 1:00 pm PT) (R-01) | Lead | in progress | Ghost mode is static and cannot be turned off by cost; model ranking has the `LLM_ENABLED` kill switch and the Anthropic Console spend limit (ADR-001). Kill-switch drill before Nov 26 |
| A3 | Judges may judge from text and video only, so the video shows every feature (plan §9 "testing clause") | Web | todo | [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md) covers ghost mode, model ranking with proof, switch scanning, phone and laptop |
| A4 | Intended-purpose sentence verbatim in app (About, first run), README, site footer, Devpost text and the video's closing card (`product.md`) | Sub | in progress | README, About and footer done (web-ui Req 14.3); Devpost draft has it; video closing card scripted |

## Video

| # | Requirement | Owner | Status | Evidence / next step |
|---|---|---|---|---|
| V1 | Under 3 minutes (judges need not watch past 3:00) (R-05) | Web | todo | Script targets 2:50, hard stop 2:55 |
| V2 | **Public** on YouTube (not unlisted, not private); URL in Devpost | Web | todo | Check it plays while signed out |
| V3 | Shows the working app on its device | Web | todo | Laptop browser and phone browser shots in the script |
| V4 | No third-party trademarks, copyrighted music or other material without permission (R-05) | Sub | todo | Rules in [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md): no logos, no recognizable phone, no voice names, original audio; second-person logo review of the final cut |

## Submission text

| # | Requirement | Owner | Status | Evidence / next step |
|---|---|---|---|---|
| T1 | Category selected: **Resurrection** | Sub | todo | Devpost form |
| T2 | Text description | Sub | in progress | Draft: [DEVPOST.md](DEVPOST.md) |
| T3 | Kiro write-up answering the prompts in order: surfaces, custom agents, hooks, spec vs vibe, steering, MCP, PBT, powers (R-09) | Sub, Lead | in progress (skeleton) | [KIRO_WRITEUP.md](KIRO_WRITEUP.md): every TODO needs real Kiro evidence |
| T4 | User-feedback statement is true | Sub | todo | From the public log in [`docs/validation/protocol.md`](../validation/protocol.md); else "not tested with people who use AAC" |

## Bonus prizes (R-03)

| # | Bonus | Requirement | Owner | Status |
|---|---|---|---|---|
| B1 | Best Kiro Crew App ($1,000) | A Crew app, new in the period, in a **separate public repo** under the **same GitHub account**, with a feature write-up; judged by the Kiro team among the top 50 eligible submissions | Data | todo; drop at Cut 2 (Nov 26) if broken |
| B2 | Blog (2,000 credits, 100 awards) | A post on a third-party platform that states it was written for Kiroween 2026 | Data | todo |
| B3 | Social Blitz (3-month Pro+, 5 awards) | Post during the submission period that **starts with `#KiroweenHackathon26`**, human-written | Data | todo |
| B4 | Best Demo ($1,000) | Automatic: top Presentation score within the top 10% overall | Web | — (no entry needed) |
| B5 | Best Ghost of Kiroween Past ($2,000) | At least one team member registered for **Kiroween 2025** | all | **open (D4)** |
| B6 | Best Student | Every team member is a student | all | open: ask |
| B7 | Best Startup ($10,000) | A real startup profile | Lead | not planned |
| — | A project wins at most one Overall or one Category prize, plus any bonuses | | | — |

Check the Devpost form for any opt-in fields per bonus (blog URL, social post URL, Crew repo URL) and fill them all.

## Kiro credits

| # | Item | Owner | Status |
|---|---|---|---|
| K1 | Each of the 3 members requests 4,000 credits by **Dec 1, 2026 12:00 pm PT** (form in the rules; Kiro user ID or AWS account ID; 48 business hours) | each member | todo |
| K2 | Redeem by Dec 4; redeemed credits expire Dec 31, 2026 | each member | todo |
| K3 | Confirm whether hackathon credits on the CI key owner's account also pay for API-key (headless CI) usage (`docs/kiro/README.md`) | Lead | open |

## Open questions

| # | Question | Default if nobody decides | Owner |
|---|---|---|---|
| Q1 (D4) | Did any team member register for Kiroween 2025? (decides bonus B5) | Ask each member today; claim only with proof of registration | all |
| Q2 (D6) | Turk dialogues license: the web page says CC BY 4.0, the download readme says CC BY-ND 3.0 | Ask the dataset author (template in [`docs/validation/outreach.md`](../validation/outreach.md) §4); if ND, rebuild bigrams with `--no-turk` (dev perplexity 101 to 111) and re-run the eval before quoting numbers | Data |
| Q3 (L-04) | Does a free hackathon release count as "making available on the market" under the EU MDR? | Avoid medical claims either way (`product.md`); not legal advice | Lead |
| Q4 | Is the repo public and does GitHub detect the MIT license? | Make public and check before Dec 3 | Lead |
| Q5 | Opening history line of the video ("In 1998 ...") has no source | Use the source-free line in the script | Web |
| Q6 | Default voice when only an online voice speaks the language (see `docs/research/web-speech.md` §6 item 9) | Current code: use it (labelled online) | Sub, product |

## Final dry run (Dec 2)

- [ ] Every row above is done or explicitly dropped with a reason
- [ ] App URL opens on a phone and a laptop, offline after one visit, speaks or shows
- [ ] Video public, under 2:55, watched signed out
- [ ] Devpost text pasted, numbers re-copied from RESULTS.md, links work
- [ ] Kiro write-up has no TODO left (or says plainly what was not done)
- [ ] `/.kiro` tracked; `node scripts/check-kiro-not-ignored.mjs --require-tracked` passes
- [ ] `node scripts/tm-lint.mjs` passes
- [ ] Bonus fields filled (Crew repo, blog URL, social post URL)
