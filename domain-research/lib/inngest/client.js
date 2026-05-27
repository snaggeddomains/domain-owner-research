import { Inngest } from 'inngest';

// Reads INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY from env (set by the Inngest
// Vercel integration). Used to send events and to serve functions.
export const inngest = new Inngest({ id: 'domain-research' });

export const RUN_REQUESTED = 'domain-research/run.requested';
export const CHAT_REQUESTED = 'domain-research/chat.requested';
