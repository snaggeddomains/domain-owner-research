import { serve } from 'inngest/express';
import { inngest } from '../lib/inngest/client.js';
import { functions } from '../lib/inngest/functions.js';

// A single run step (the agent gather + synthesis) can take a few minutes, so
// give this endpoint a long ceiling. Requires a Vercel plan that permits it.
export const config = { maxDuration: 300 };

export default serve({ client: inngest, functions });
