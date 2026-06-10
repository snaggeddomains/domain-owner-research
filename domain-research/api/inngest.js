import { serve } from 'inngest/express';
import { inngest } from '../lib/inngest/client.js';
import { functions } from '../lib/inngest/functions.js';

// A single run step (the agent gather + synthesis) can take several minutes, so
// give this endpoint a long ceiling — deep research is thorough and we'd rather
// let it run than cut it short. 800s is the Vercel Pro + Fluid Compute ceiling.
// The agent loop self-limits well under this (AGENT_SOFT_DEADLINE_MS in the LLM
// adapters) so it always finalizes a report instead of being hard-killed; keep
// those budgets in sync if this number changes.
export const config = { maxDuration: 800 };

export default serve({ client: inngest, functions });
