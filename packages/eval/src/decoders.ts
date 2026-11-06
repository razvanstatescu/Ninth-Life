/**
 * Baseline decoders (plan section 3.4; spec eval-harness Req 3.1 - 3.5).
 *
 *   B0 dict           frequency order only: beam over the lattice with the unigram model
 *                     (top-1 = most frequent word per code, the classic 9-key behaviour).
 *   B1 ghost          @ninth/core decodeGhost with the bigram model (shipping offline mode).
 *   B2 LLM raw        LLM proposals, no validator (measures how often an LLM breaks the keys).
 *   B3 LLM+val        LLM proposals filtered by validate().
 *   B4 lattice+val    LLM constrained to the lattice + ghost beams, then validate() (shipping design).
 *
 * B2-B4 take an `LlmProposer`, which the decoder package supplies (packages/decoder wraps its
 * LlmClient + buildPrompt + parseReply). Without one they are reported as "not run".
 */
import {
  bigramModel,
  decodeGhost,
  lattice,
  unigramModel,
  validate,
  type BigramFile,
  type Lexicon,
  type Mode,
} from '@ninth/core';
import type { DecodeInput, DecodeOutput, Decoder } from './types';

export function dictDecoder(lex: Lexicon): Decoder {
  const lm = unigramModel(lex);
  return {
    id: 'B0',
    label: 'B0 dict',
    deterministic: true,
    validated: true,
    decode: ({ codes, k, mode }) => ({ candidates: decodeGhost(codes, { lexicon: lex, lm, k, mode }).map((c) => c.words) }),
  };
}

export function ghostDecoder(lex: Lexicon, bigrams: BigramFile): Decoder {
  const lm = bigramModel(bigrams, lex);
  return {
    id: 'B1',
    label: 'B1 ghost',
    deterministic: true,
    validated: true,
    decode: ({ codes, k, mode }) => ({ candidates: decodeGhost(codes, { lexicon: lex, lm, k, mode }).map((c) => c.words) }),
  };
}

/** What an LLM-backed configuration needs from the decoder package. */
export interface LlmProposeRequest {
  codes: string[];
  mode: Mode;
  k: number;
  partner?: string;
  /** Present for the lattice-constrained config (B4): top words per slot. */
  lattice?: string[][];
  /** Present for B4: top ghost-mode beams, best first. */
  beams?: string[][];
}
export interface LlmProposer {
  /** Model name for the report, e.g. "haiku-4.5". */
  readonly model: string;
  propose(req: LlmProposeRequest): Promise<{ candidates: string[][]; usd?: number }>;
}

export type LlmConfig = 'B2' | 'B3' | 'B4';

const LLM_LABEL: Record<LlmConfig, string> = { B2: 'B2 LLM raw', B3: 'B3 LLM+val', B4: 'B4 lattice+val' };

export function llmDecoder(id: LlmConfig, proposer: LlmProposer, lex: Lexicon, bigrams: BigramFile): Decoder {
  const ghost = ghostDecoder(lex, bigrams);
  return {
    id,
    label: LLM_LABEL[id],
    deterministic: false,
    validated: id !== 'B2',
    async decode(input: DecodeInput): Promise<DecodeOutput> {
      const req: LlmProposeRequest = { codes: input.codes, mode: input.mode, k: input.k, partner: input.partner };
      if (id === 'B4') {
        req.lattice = lattice(input.codes, lex, 12, input.mode);
        req.beams = (ghost.decode({ ...input, k: 10 }) as DecodeOutput).candidates;
      }
      const { candidates: raw, usd } = await proposer.propose(req);
      const norm = raw.map((c) => c.map((w) => w.toLowerCase()));
      const candidates = id === 'B2' ? norm : norm.filter((c) => validate(c, input.codes, input.mode));
      return { candidates, raw: norm, usd };
    },
  };
}

export const LLM_CONFIGS: readonly LlmConfig[] = ['B2', 'B3', 'B4'];
