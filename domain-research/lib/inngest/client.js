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
// Person deep-dive — from a social-profile URL, identify the person, triangulate
// their cross-platform presence + prominence (VIP), and gather free professional
// context. Async because the profile fetch + multi-platform search + LLM synthesis
// runs past the 60s API cap. The paid contact reveal is a separate sync action.
export const PERSON_REQUESTED = 'domain-research/person.requested';
// Inbound-lead enrichment — from a contact-form submission, run the person deep-dive
// + company firmographics + triage into a routing verdict. Async because the person
// deep-dive + Apollo lookup run past the 60s API cap; kicked fire-and-forget by the
// internal lead-enrich endpoint (Zapier) so the dossier is warm by review time.
export const LEAD_REQUESTED = 'domain-research/lead.requested';
