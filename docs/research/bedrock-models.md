# Bedrock models, prices and IAM for the decoder

Checked: 2026-11-06. Owner: decoder and infrastructure. Status markers: **Verified** (official
AWS or Anthropic page, read on the date above), **Derived** (computed from verified facts),
**Unverified** (third-party or not found).

## Summary

| Model | EU inference profile (from eu-central-1) | Foundation model ID | EU price in / out per 1M tokens | Cache min tokens | Status |
|---|---|---|---|---|---|
| Claude Haiku 4.5 | `eu.anthropic.claude-haiku-4-5-20251001-v1:0` | `anthropic.claude-haiku-4-5-20251001-v1:0` | $1.10 / $5.50 | 4,096 | ID verified; price derived |
| Claude Haiku 5.5 | `eu.anthropic.claude-haiku-5-5` | `anthropic.claude-haiku-5-5` | $0.11 / $0.55 (prompts up to 100K) | 512 | ID verified; price derived |
| Amazon Nova Micro | `eu.amazon.nova-micro-v1:0` | `amazon.nova-micro-v1:0` | about $0.046 / $0.184 | 1,024 | ID verified; price unverified |

Plan check: the plan's profile ID for Haiku 4.5 is correct. Haiku 5.5 exists on Bedrock with an EU
profile callable from eu-central-1. Nova Micro has an EU profile from eu-central-1 (no in-Region
access in Frankfurt).

## 1. Profile IDs and routing (Verified)

From each model card's "Programmatic access" and "Geo inference details" sections:

- **Haiku 4.5**: geo IDs `us.`, `eu.`, `au.`, `jp.`, `in.` plus `global.anthropic.claude-haiku-4-5-20251001-v1:0`.
  The bare model ID is not supported for on-demand throughput on `bedrock-runtime`.
  From eu-central-1 the EU profile routes to eu-central-1, eu-north-1, eu-south-1, eu-south-2,
  eu-west-1, eu-west-3. Launch Oct 16, 2025; lifecycle Active; "EOL no sooner than Oct 16, 2026";
  legacy period at least 6 months. Explicit prompt caching: min 4,096 tokens per checkpoint, max 4
  checkpoints, TTL 5 min or 1 h.
  <https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html>
  (also mirrored at <https://docs.aws.eu/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html>)
- **Haiku 5.5**: launched Oct 7, 2026; EOL no sooner than Oct 7, 2027. Geo IDs `us.`, `ca.`, `eu.`,
  `au.`, `jp.` plus `global.anthropic.claude-haiku-5-5`. EU routing from eu-central-1: same six
  Regions as Haiku 4.5. APIs on `bedrock-runtime`: Messages, Converse, Invoke. Explicit prompt
  caching min 512 tokens, max 4 checkpoints. Structured outputs supported. Reasoning: adaptive
  thinking on by default, can be turned off; effort low to max, default medium; "effort capped at
  high when thinking is disabled". Thinking blocks are bound to the AWS account. Tiered pricing
  above 100K-token prompts.
  <https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-5-5.html>
- **Nova Micro**: geo IDs `us.amazon.nova-micro-v1:0`, `eu.amazon.nova-micro-v1:0`; no global
  profile. eu-central-1 supports Geo only (not In-Region). From eu-central-1 the EU profile routes
  to eu-central-1, eu-north-1, eu-west-1, eu-west-3. Caching min 1K tokens. No structured outputs.
  Lifecycle Active, "EOL no sooner than Dec 05, 2025".
  <https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-micro.html>

AWS says geography profiles' destination lists "will never change", but advises calling
`GetInferenceProfile` from the source Region to confirm routing before relying on it for data
residency. <https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html>

## 2. Prices

- **Anthropic list prices (Verified)**: Haiku 4.5 $1 in / $5 out / $1.25 5-min cache write / $0.10
  cache hit per MTok. Haiku 5.5 (prompts up to 100K) $0.10 / $0.50 / $0.125 / $0.01; above 100K
  $0.50 / $2.50. Anthropic: "Starting with Claude Sonnet 4.5, Haiku 4.5, and Opus 4.5 ... Bedrock
  offers two endpoint types: global endpoints ... and regional endpoints ... Regional and
  multi-region endpoints include a 10 percent premium over global endpoints." Scope: Haiku 4.5 and
  all future models. <https://platform.claude.com/docs/en/about-claude/pricing>
- **AWS (Verified, qualitative)**: geographic cross-Region inference is "Standard pricing", global
  is "Approximately 10% savings"; "There's no additional routing cost ... The price is calculated
  based on the Region from which you call an inference profile."
  <https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html>
- **EU profile prices (Derived)**: Haiku 4.5 $1.10 / $5.50; Haiku 5.5 $0.11 / $0.55. These match
  the plan. The AWS pricing page (<https://aws.amazon.com/bedrock/pricing/>) renders its tables with
  script; the fetch on 2026-11-06 returned no numbers, so the exact EU figures are not read from AWS.
  Confirm in the console or Cost Explorer after the first calls (tasks.md 11.3).
- **Nova Micro (Unverified)**: $0.046 / $0.184 per MTok in Frankfurt per cloudprice.net and
  futureagi.com (the latter "last verified June 2, 2026"); base US price $0.035 / $0.14.
  <https://cloudprice.net/models/aws/nova-micro>, <https://futureagi.com/llm-cost-calculator/bedrock/eu-amazon-nova-micro-v1-0>
- **Billing (Verified)**: "This model is a third-party model offered and billed through AWS
  Marketplace. Charges appear on your AWS bill and in AWS Cost Explorer under the model provider
  (not under Amazon Bedrock)." (Haiku 5.5 card; Haiku 4.5 card says the same.) Consequence: the
  budget must not filter on the Amazon Bedrock service.

## 3. IAM for geographic cross-Region inference (Verified)

AWS: to invoke a geographic profile, allow (1) the profile, (2) the foundation model in the source
Region, (3) the foundation model in every destination Region. Example statements use
`arn:aws:bedrock:<source>:<ACCOUNT_ID>:inference-profile/<profile-id>` and
`arn:aws:bedrock:<region>::foundation-model/<model-id>` with condition
`"StringEquals": {"bedrock:InferenceProfileArn": "<profile ARN>"}` on the foundation-model
statement. <https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html>

Our stack grants exactly that for each configured model (default: Haiku 4.5 and Haiku 5.5, the
plan's "two profile ARNs only"), built from `packages/decoder/src/models.ts` `iamArns()`.

## 4. Converse vs InvokeModel

- Both work for Haiku 4.5 and 5.5 on `bedrock-runtime` (Verified, model cards).
- Structured outputs: InvokeModel uses `output_config.format`, Converse uses
  `outputConfig.textFormat`. "For new schemas, Amazon Bedrock compiles the grammar, which can take up
  to approximately 90 seconds"; compiled grammars are cached 24 h. Every object needs
  `additionalProperties: false`; array `minItems` only 0 or 1.
  <https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html> (Verified)
- The installed `@aws-sdk/client-bedrock-runtime` 3.712.0 has no `cachePoint` in its Converse types
  (checked in `node_modules`, 2026-11-06).
- **Decision: InvokeModel** with the native Anthropic body (`anthropic_version:
  "bedrock-2023-05-31"`), so `cache_control`, `thinking` and per-model sampling rules are sent as
  Anthropic documents them; Nova uses its `messages-v1` body. **No structured outputs**: a cold
  grammar compile (up to 90 s) cannot fit a 1.2 s deadline, and the validator is the safety layer.

## 5. Prompt caching

- Minimum cacheable prefix: Haiku 4.5 4,096 tokens; Haiku 5.5 512 (AWS cards above; the Anthropic
  prompt-caching reference agrees). Below the minimum, a checkpoint silently does nothing.
- Our system prompt (rules plus 7 examples) is about 840 tokens (3,356 characters, measured
  2026-11-06), so **it cannot cache on Haiku 4.5** and does cache on Haiku 5.5. The plan's "cached
  system prompt" only holds for Haiku 5.5. We send `cache_control` only on Haiku 5.5.
- Cache economics (Anthropic): write 1.25x input (5 min), read 0.1x input. At hackathon traffic
  (a few decodes per minute at most) many requests will arrive after the 5-minute TTL lapses; at
  Haiku 5.5 prices the difference is under $0.0001 per decode either way.

## 6. Haiku 5.5 request rules (from Anthropic's model docs, via the claude-api skill reference)

- Non-default `temperature`, `top_p`, `top_k` return 400 (on API version 2023-06-01 temperature
  must be 1). **The plan's temperature 0.3 does not apply to Haiku 5.5**; we omit it.
- Thinking is on by default and counts toward `max_tokens`; with `max_tokens` 120 it could consume
  the whole budget. We send `thinking: {type: "disabled"}` (allowed at effort low, medium, high;
  default effort is medium). **Unverified on Bedrock until a live call** (tasks.md 13).
- Assistant prefill returns 400 (we do not use prefill).
- Refusals arrive as `stop_reason: "refusal"`; we treat them as a failed call (ghost fallback).
- New tokenizer: about 30% more tokens for the same text.

## 7. Account setup notes (partly unverified)

- Claude models on Bedrock are Marketplace products; first use in an account may require the
  Anthropic use-case form / model access step in the console. Do it once from an admin session so
  the Lambda role needs no `aws-marketplace:*` permissions. (Unverified detail; follow the console.)
- New accounts can have a Lambda concurrency quota of 10, and reserved concurrency must leave at
  least 10 unreserved, so `reservedConcurrentExecutions: 5` can fail to deploy until the quota is
  raised. (AWS general knowledge; check Service Quotas.)

## 8. Budgets and SNS (Verified)

- `AWS::Budgets::Budget` `TimeUnit`: DAILY | MONTHLY | QUARTERLY | ANNUALLY | CUSTOM.
  <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-budgets-budget-budgetdata.html>
  We use ANNUALLY with a start date of 2026-11-01, so the $40 is cumulative across the whole
  judging window (through Jan 29, 2027). How AWS aligns the period to a custom start date was not
  confirmed (Unverified); check the budget in the console after deploy.
- The SNS topic policy must allow `budgets.amazonaws.com` to publish, scoped with
  `aws:SourceAccount` and `aws:SourceArn`; topic and budget must be in the same account.
  <https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html>
- Budgets data refreshes several times a day, not in real time, so the $40 action can lag; the
  DynamoDB daily dollar cap ($8) is the fast guard. (General AWS behavior; Unverified exact lag.)
- `AWS::Budgets::BudgetsAction` can apply IAM/SCP policies or stop EC2/RDS, but cannot invoke a
  Lambda, hence notification -> SNS -> Lambda.

## 9. CDK 2.170 constructs (Verified in `node_modules/aws-cdk-lib`)

- `aws-cdk-lib/aws-apigatewayv2`: `HttpApi` (`createDefaultStage`, `corsPreflight`), `HttpStage`
  with `throttle: { rateLimit, burstLimit }` (maps to `DefaultRouteSettings`).
- `aws-cdk-lib/aws-apigatewayv2-integrations`: `HttpLambdaIntegration`.
- `aws-cdk-lib/aws-lambda`: `Runtime.NODEJS_22_X`, `Architecture.ARM_64`, `LoggingFormat.JSON`.
- `aws-cdk-lib/aws-budgets`: `CfnBudget` with `notificationsWithSubscribers` (subscriber type SNS).
- `aws-cdk-lib/aws-sns-subscriptions`: `LambdaSubscription`.

## Corrections to the source plan

1. §4.3 example codes are wrong: "need" is `6333` (not `6253`), "water" is `92837` (not `9283737`),
   and "need"/"mead" do not share a code (`6333` vs `6323`).
2. §4.5 "cached system prompt": does not cache on Haiku 4.5 (4,096-token minimum vs ~840 tokens).
3. §4.5 "temperature 0.3": rejected by Haiku 5.5; only for Haiku 4.5 and Nova Micro.
4. §4.5 "6 few-shot examples from AACText train": replaced by 7 invented examples (no dataset text
   in the prompt, per the brief).
5. §4.7 Budgets "action": AWS Budgets actions cannot call Lambda; we use a notification to SNS.
6. Haiku 4.5's "EOL no sooner than Oct 16, 2026" date has passed; it can enter legacy during
   judging (still callable for at least 6 months after). Haiku 5.5 is the safer long-run default.
