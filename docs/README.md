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
- Other ADRs: `decisions/ADR-*.md`

## Research
- [Assumptions register](research/assumptions-register.md)
- [Bedrock models and prices](research/bedrock-models.md)
- [Competitive landscape refresh](research/competitive-landscape.md)

## Kiro
- [How we use Kiro](kiro/README.md): every file under `.kiro/`, daily workflow, credits, evidence checklist
- [Kiro log](KIRO_LOG.md): dated evidence for the write-up
- Specs: `../.kiro/specs/{core-encoder,access-modes,web-ui,decoder-service,eval-harness}/`

## Conventions
- The intended purpose sentence goes everywhere that describes the product: "Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment."
- New decisions get an ADR. New facts with a source go in `research/`. Pages say when they were last checked.
