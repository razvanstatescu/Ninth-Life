import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

// Kill switch. In Lambda it is the SSM parameter /ninthlife/llm_enabled ("true" or "false"),
// flipped to "false" by the Budgets -> SNS -> kill-switch Lambda. In Next.js it is an env var.

export interface Flags {
  llmEnabled(): Promise<boolean>;
}

export const FLAG_PARAMETER = '/ninthlife/llm_enabled';

export class StaticFlags implements Flags {
  constructor(private value: boolean) {}
  set(v: boolean) {
    this.value = v;
  }
  async llmEnabled() {
    return this.value;
  }
}

/** Reads `LLM_ENABLED` ("true" enables; anything else, or unset, disables). */
export class EnvFlags implements Flags {
  constructor(private readonly env: Record<string, string | undefined> = process.env) {}
  async llmEnabled() {
    return this.env.LLM_ENABLED === 'true';
  }
}

export interface SsmSender {
  send(cmd: GetParameterCommand): Promise<{ Parameter?: { Value?: string } }>;
}

/**
 * SSM-backed flag with a short cache, so a flip takes effect within `ttlMs` without an SSM call
 * on every decode. Fails closed: any read error means "disabled" (for `errorTtlMs`).
 */
export class SsmFlags implements Flags {
  private cached: { value: boolean; until: number } | null = null;
  private readonly client: SsmSender;
  constructor(
    private readonly name: string = FLAG_PARAMETER,
    private readonly opts: { ttlMs?: number; errorTtlMs?: number; now?: () => number; client?: SsmSender } = {},
  ) {
    this.client = opts.client ?? new SSMClient({ maxAttempts: 2 });
  }

  async llmEnabled(): Promise<boolean> {
    const now = (this.opts.now ?? Date.now)();
    if (this.cached && this.cached.until > now) return this.cached.value;
    try {
      const out = await this.client.send(new GetParameterCommand({ Name: this.name }));
      const value = out.Parameter?.Value?.trim().toLowerCase() === 'true';
      this.cached = { value, until: now + (this.opts.ttlMs ?? 30_000) };
      return value;
    } catch {
      this.cached = { value: false, until: now + (this.opts.errorTtlMs ?? 5_000) };
      return false;
    }
  }
}
