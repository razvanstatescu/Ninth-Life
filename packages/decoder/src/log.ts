// Metrics-only logging. The type below is the whole vocabulary: numbers, booleans and fixed enums.
// There is deliberately no field that can hold request text, words, codes, IPs or error messages.
// (Requirement DS-6: request bodies are never logged.)

export type DecodeOutcome =
  | 'ok'
  | 'degraded_timeout'
  | 'degraded_error'
  | 'degraded_parse'
  | 'bad_request'
  | 'too_large'
  | 'rate_limited'
  | 'llm_disabled'
  | 'daily_cap'
  | 'quota_error';

export interface DecodeMetrics {
  event: 'decode';
  outcome: DecodeOutcome;
  status: number;
  ms: number;
  llmMs?: number;
  slots?: number;
  returned?: number;
  rejected?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  usdMicros?: number;
  model?: string;
  /** Error class name only (e.g. "TimeoutError"), never the message. */
  errorName?: string;
}

export type MetricsLogger = (m: DecodeMetrics) => void;

const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/** Keep only a class-like error name; anything else becomes "Error". */
export function safeErrorName(e: unknown): string {
  const n = (e as { name?: unknown } | null)?.name;
  return typeof n === 'string' && SAFE_NAME.test(n) ? n : 'Error';
}

export const consoleMetrics: MetricsLogger = (m) => {
  // One JSON line per decode, for CloudWatch Logs Insights / metric filters.
  console.log(JSON.stringify(m));
};

export const silentMetrics: MetricsLogger = () => {};
