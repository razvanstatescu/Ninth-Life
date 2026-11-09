# Ninth Life knowledge base

Start here. Every page below is kept in the repo, so the knowledge base is versioned with the code.

## Plan
- [Implementation plan (living)](plan/01-implementation-plan.md): milestones, owners, what changed, open decisions
- [Source research plan](plan/00-source-plan.md): the original build-ready plan, with sources (frozen)
- [Assumptions register](research/assumptions-register.md): every plan assumption, verified or corrected, with evidence

## Product and design
- [Design system guide](design-system/README.md): where the design system lives, tokens, components, voice
- [Brand book](../design/system/README.md): the design system's own README (source of truth)
- [Brand canvas artboards](../design/artboards/): app, website, video and social mockups

## Architecture
- [Shared contracts](architecture/contracts.md): `@ninth/core` API, data file shapes, decode API, settings
- [Core engine](architecture/core.md): encoder, validator, lexicon, LM, beam, scanning, PBT findings
- [Web app](architecture/web.md): Next.js routes, components, speech, offline
- [Decoder service](architecture/decoder.md): request flow, prompt, quotas, kill switch, cost
- [Data and evaluation](architecture/data-and-eval.md): lexicon build, datasets, licenses, eval method

## Decisions
- [ADR-000: Next.js web app, framework-agnostic decoder](decisions/ADR-000-nextjs.md)
- [ADR-001: Anthropic API from the Vercel route, no AWS](decisions/ADR-001-anthropic-api-no-aws.md)
- [ADR-002: MiniMax as a second model provider (interim)](decisions/ADR-002-minimax-provider.md)
- [ADR-003: One screen on phones and tablets; phones portrait only](decisions/ADR-003-one-screen-portrait-phones.md)
- [ADR-004: Voice to text for "They said" uses the browser's speech service](decisions/ADR-004-voice-to-text-they-said.md)
- [ADR-core-001: core contract clarifications](decisions/ADR-core-001-contract-clarifications.md)
- [ADR-data-001: keep the 60k lexicon](decisions/ADR-data-001-lexicon-size.md)
- [ADR-data-004: drop identity slurs from the lexicon, still typeable on purpose](decisions/ADR-data-004-slur-filter.md)
- Other ADRs: `decisions/ADR-*.md`

## Research
- [Assumptions register](research/assumptions-register.md)
- [Anthropic models and prices](research/anthropic-models.md)
- [MiniMax models, prices and data terms](research/minimax-models.md)
- [Phones and tablets: layout research](research/mobile-layout.md): viewports, platform pitfalls, AAC layout guidance
- [Phone patterns from real apps (Mobbin)](research/mobile-patterns-mobbin.md): dial pads, primary actions, suggestions, the phone layout sketch
- [Phone AAC evidence](research/mobile-aac-evidence.md): visible viewport heights measured in Safari, thumb reach, motor-impaired touch, AAC apps
- [One screen on phones and tablets](research/one-screen-tablets.md): measured iPad viewports, phone vs tablet detection, orientation lock support, tablet layouts
- [Competitive landscape refresh](research/competitive-landscape.md)
- [Web Speech API: voices, bugs and privacy](research/web-speech.md): voices per browser and OS, offline voices, ro-RO and es-ES, known bugs, what `lib/speech.ts` does about them

## User feedback
- [Session protocol](validation/protocol.md): tasks, measures, 30-minute script, safety and stop rule, public validation log (not a clinical study)
- [Consent form](validation/consent.md): plain language, English and Romanian
- [Outreach templates](validation/outreach.md): SLP departments, AAC clinics, associations, research groups (English and Romanian)
- [Session notes template](validation/session-notes-template.md)

## Submission
- [Checklist](submission/CHECKLIST.md): every rules requirement and bonus, owners, status, dates, open questions
- [Kiro write-up skeleton](submission/KIRO_WRITEUP.md): one section per rules prompt; TODOs need real Kiro evidence
- [Devpost text draft](submission/DEVPOST.md): numbers from RESULTS.md only, marked as simulated-user measurements
- [Video script](submission/VIDEO_SCRIPT.md): under 2:55, shot list, voice-over, on-screen text

## Kiro
- [How we use Kiro](kiro/README.md): every file under `.kiro/`, daily workflow, credits, evidence checklist
- [Kiro log](KIRO_LOG.md): dated evidence for the write-up
- Specs: `../.kiro/specs/{core-encoder,access-modes,web-ui,decoder-service,eval-harness}/`

## Conventions
- The intended purpose sentence goes everywhere that describes the product: "Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment."
- New decisions get an ADR. New facts with a source go in `research/`. Pages say when they were last checked.
