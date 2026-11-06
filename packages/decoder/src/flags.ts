// Kill switch. In production it is the Vercel environment variable LLM_ENABLED: change it in the
// project settings and redeploy (about a minute). Anything but the exact string "true" disables the
// model, so the default (unset) is off.

export interface Flags {
  llmEnabled(): Promise<boolean>;
}

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
