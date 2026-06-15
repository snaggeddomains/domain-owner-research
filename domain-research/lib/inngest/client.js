import { Inngest } from 'inngest';

// Reads INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY from env (set by the Inngest
// Vercel integration). Used to send events and to serve functions.
export const inngest = new Inngest({ id: 'domain-research' });

export const RUN_REQUESTED = 'domain-research/run.requested';
export const CHAT_REQUESTED = 'domain-research/chat.requested';
// Sent when a user cancels an in-progress run; runResearch is configured to
// cancelOn this event (matched by data.runId) so Inngest stops the pipeline at
// the next step boundary and no further paid steps run.
export const RUN_CANCELLED = 'domain-research/run.cancelled';
export const SALES_RESEARCH_REQUESTED = 'domain-research/sales-research.requested';
// Tier-2 category fan-out (Explore by category). Async so the per-category LLM +
// liveness work isn't bound by the 60s API function cap.
export const SALES_ANGLES_REQUESTED = 'domain-research/sales-angles.requested';
// Corporate Portfolios — reverse-WHOIS pull of a company's registered domains,
// filtered to "premium" names. Async because a large registrant paginates across
// many Whoxy pages (0.5s apart), well past the API function's 60s cap.
export const PORTFOLIO_REQUESTED = 'domain-research/portfolio.requested';
