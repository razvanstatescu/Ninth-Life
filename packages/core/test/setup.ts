import fc from 'fast-check';
import { runs } from './arbitraries';

// Properties without their own numRuns get 100 runs, scaled by FC_SCALE for long bug hunts.
// FC_SEED=<n> replays a run exactly.
const seed = Number((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.FC_SEED);
fc.configureGlobal({ numRuns: runs(100), ...(Number.isFinite(seed) ? { seed } : {}) });
