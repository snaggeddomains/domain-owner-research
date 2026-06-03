// Owner-outreach template registry — seeded verbatim from Rob's real first-touch
// outreach (see "Domain Owner Initial Outreach" playbook). Each scenario keys off
// signals the research module already produces (owner_type, confidence,
// marketplace_check, livesite_inspect, registration_cluster). The drafting LLM
// uses the matched scenario's templates as the STYLE ANCHOR — it free-writes in
// Rob's voice but must stay within these patterns and the report's facts.
//
// IDs are stable (used by the API + UI dropdown). Order here is the classifier's
// priority order (most transactional / most specific first).

export const SUBJECT = '[DOMAIN] Domain Inquiry';

// The recurring spine across every scenario — handed to the LLM so a free-write
// still lands on Rob's structure.
export const STYLE_GUIDE = `Rob's first-touch outreach spine, in order:
1. identity first: "this is Rob from Snagged.com's domain brokerage team" (or, for a corporate/portfolio owner, "My name is Rob Schutz, and I run Snagged")
2. reason second: "I'm looking into a few domain names for a client as part of a rebranding exercise"
3. target framing third: "[DOMAIN] is on the list"
4. direct ask fourth: "If you still own the domain, would you be open to selling it?" (use "discussing a potential sale" for a likely-but-unconfirmed or corporate owner)
5. friction removal last: bring something concrete / a formal offer / email forwarding for continuity / point me in the right direction / transact direct to save fees
Keep it short and warm. Sign off "-Rob". One paragraph or two. No pricing, no promises beyond the templates.`;

export const SCENARIOS = [
  {
    id: 'listed_for_sale',
    num: 4,
    name: 'Listed for sale / domain investor',
    bestFit: 'Name is on Afternic, GoDaddy, Dan, Atom, Sedo, etc., or the owner is a domain investor. Direct, transactional, fee-aware.',
    adjustment: 'Become more transactional and fee-aware. Mention the platform and the option to transact directly to save commission/fees. Ask for their ask.',
    subject: SUBJECT,
    closest: `Hey [First Name] - this is Rob from Snagged.com.

I'm looking into a few domain names for a client as part of a rebranding exercise, and [DOMAIN] is one of the names on the list. I see the name is for sale on [PLATFORM], but I wanted to see if we could transact directly and save you some money on commission/fees.

LMK your ask if we go direct and will push to see if we can get something done. Thank you!

-Rob`,
    cleaned: `Hey [First Name],

This is Rob from Snagged.com.

I'm looking into [DOMAIN] for a client, and I saw it listed on [PLATFORM]. Wanted to see if you'd be open to a direct conversation in case that saves everyone some friction and fees.

If so, send over your ask and I'll see if I can get something moving.

Thanks,

-Rob`,
  },
  {
    id: 'privacy_proxy',
    num: 3,
    name: 'Privacy-protected / proxy / unknown owner',
    bestFit: 'WHOIS privacy or proxy email, thin ownership confidence, unknown owner. Shortest possible opener.',
    adjustment: 'Compress hard. Address "Hi there". No personalization beyond the domain. An ultra-light one-liner is on-brand here.',
    subject: SUBJECT,
    closest: `Hi there — this is Rob from Snagged.com's domain brokerage team.

I'm looking into a few domain names for a client as part of a rebranding exercise, and [DOMAIN] is on the list. If you still own the domain, would you be open to selling it? Would be great to see if this is a good potential option for this client.

Thanks so much, and I appreciate the consideration. Hope to speak soon,

-Rob`,
    ultraLight: `Hi there — any willingness to entertain offers on [DOMAIN]? Would love to discuss!

-Rob`,
    cleaned: `Hi there,

This is Rob from Snagged.com.

I'm looking into [DOMAIN] for a client and wanted to see if you'd be open to discussing a sale if you still own it.

Would love to connect if so.

-Rob`,
  },
  {
    id: 'corporate_redirect',
    num: 5,
    name: 'Corporate owner / redirect to parent / acquirer',
    bestFit: 'Corporate ownership; domain redirects to a parent site; looks inherited through acquisition or brand consolidation. May need routing to the right stakeholders.',
    adjustment: 'Open with "My name is Rob Schutz, and I run Snagged". Address multiple stakeholders by name. Mention how they likely got the name (acquisition), that it currently redirects, and ask to be routed to the right person.',
    subject: SUBJECT,
    closest: `Hi [Names] -- I hope this note finds you well. My name is Rob Schutz, and I run Snagged, a digital broker service out of New York. I've been asked to contact you as the owners of [DOMAIN]. I have a client interested in acquiring the domain name who's willing to make a serious offer to secure it.

I believe you came into possession of the domain when [PARENT COMPANY] acquired [LEGACY BRAND / COMPANY]. I noticed the domain currently redirects to the main [PARENT SITE] site, so I wanted to reach out to see if there might be any interest in selling it if the right offer came together.

Please let me know if there are other folks I should be speaking with for this opportunity or if a live conversation makes sense as a next step.

All the best,

-Rob`,
    cleaned: `Hi [Names],

My name is Rob Schutz, and I run Snagged.

I'm reaching out because [DOMAIN] appears to be owned by [COMPANY] and currently redirects to [PARENT SITE]. I'm working with a serious client interested in acquiring the domain if the right offer came together.

If this is something your team would consider, I'd be glad to connect. And if someone else handles these decisions internally, I'd appreciate being pointed in the right direction.

Best,

-Rob`,
  },
  {
    id: 'continuity_large',
    num: 7,
    name: 'Active site, larger company — continuity matters',
    bestFit: 'Major company or heavier operating use, where domain continuity is likely the first objection. Address continuity in the first touch.',
    adjustment: 'Acknowledge active use, then proactively remove the continuity objection: formal offer for consideration, email forwarding so there is no interruption.',
    subject: SUBJECT,
    closest: `Hi [First Name] — this is Rob from Snagged.com's domain brokerage team.

I'm looking into a few domain names for a client as part of a rebranding exercise, and [DOMAIN] is on the list. I know you're actively using the domain, but I'd love to see if you're open to a potential acquisition.

Happy to bring you a formal offer for your consideration, and we could enable email forwarding so there would be no interruption in continuity.

Thanks so much, and I appreciate the consideration. Hope to speak soon,

-Rob`,
    cleaned: `Hi [First Name],

This is Rob from Snagged.com's domain brokerage team.

I'm looking into [DOMAIN] for a client as part of a rebranding exercise. I know it's actively used, so continuity may be a concern, but if there's any openness to a conversation, I'd be happy to bring you a formal offer and work around the operational details as needed.

Best,

-Rob`,
  },
  {
    id: 'active_small',
    num: 6,
    name: 'Active site, smaller company / startup',
    bestFit: 'Active site and likely active email; smaller operating company. Acknowledge live use without overcomplicating the opener.',
    adjustment: 'Acknowledge the site/email are still in use in sentence one or two, then ask about willingness to discuss serious offers on the domain itself. Offer to bring something concrete.',
    subject: SUBJECT,
    closest: `Hi [First Name] — this is Rob from Snagged.com's domain brokerage team.

I'm looking into a few domain names for a client as part of a rebranding exercise, and [DOMAIN] is on the list. I can see you're still using the site and email, but figured I'd reach out to see if there was a willingness to discuss offers on the domain name itself.

Let me know your thoughts, and hope to hear from you soon!

-Rob`,
    cleaned: `Hi [First Name],

This is Rob from Snagged.com's domain brokerage team.

I'm looking into [DOMAIN] for a client as part of a rebranding exercise. I can see the site and email are still active, but wanted to ask whether you'd be open to discussing serious offers on the domain itself.

If so, I'd be happy to bring you something concrete.

Best,

-Rob`,
  },
  {
    id: 'research_informed',
    num: 2,
    name: 'Research-informed — likely owner, not fully certain',
    bestFit: 'You have a likely owner or strong ownership clue and want to show why you picked this contact. Domain may tie back to a prior company, group, or transaction.',
    adjustment: 'Add ONE breadcrumb sentence showing why you reached out (e.g. "the domain may trace back to your time with [COMPANY]"). Offer to be pointed in the right direction if you have the wrong person.',
    subject: SUBJECT,
    closest: `Hi [First Name] — this is Rob from Snagged.com's domain brokerage team.

I'm looking into a few domain names for a client as part of a re-branding exercise, and [DOMAIN] is on the list. I believe the domain may trace back to your time with [COMPANY / PROJECT], so I figured it was worth reaching out directly.

If you still own [DOMAIN], would you be open to discussing a potential sale?

Thanks so much, and I appreciate the consideration.

Best,

-Rob`,
    cleaned: `Hi [First Name],

This is Rob from Snagged.com's domain brokerage team.

I'm looking into [DOMAIN] for a client as part of a rebranding exercise. Based on my research, it looked like you might still own it, or at least know where it sits.

If so, would you be open to discussing a potential sale? And if not, I'd appreciate being pointed in the right direction.

Best,

-Rob`,
  },
  {
    id: 'passive_individual',
    num: 1,
    name: 'Individual owner, domain not actively in use',
    bestFit: 'Named individual owner; parked, quiet, legacy, or lightly used domain; no obvious large operating business attached. The default.',
    adjustment: 'Straight yes/no ask. No need to acknowledge active use. Keep it warm and brief.',
    subject: SUBJECT,
    closest: `Hi [First Name] — this is Rob from Snagged.com's domain brokerage team.

I'm looking into a few domain names for a client as part of a rebranding exercise, and [DOMAIN] is on the list. If you still own the domain, would you be open to selling it? Would be great to see if this is a good potential option for this client.

Thanks so much, and I appreciate the consideration. Hope to speak soon,

-Rob`,
    cleaned: `Hi [First Name],

This is Rob from Snagged.com's domain brokerage team.

I'm looking into a few domain names for a client as part of a rebranding exercise, and [DOMAIN] is on the list. If you still own it, would you be open to discussing a sale?

Would be great to see if it could be a fit for this client.

Thanks so much,

-Rob`,
  },
];

export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

// Normalize a built-in scenario to the shared template shape the drafter wants
// ({ id, name, bestFit, adjustment, anchors:[...], subject }).
export function builtinToTemplate(s) {
  return {
    id: s.id,
    name: s.name,
    bestFit: s.bestFit,
    adjustment: s.adjustment,
    subject: s.subject,
    anchors: [s.closest, s.cleaned, s.ultraLight].filter(Boolean),
    builtin: true,
  };
}

// Normalize a saved custom row (from domain_research_outreach_templates).
export function customToTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    bestFit: row.best_fit || null,
    adjustment: null,
    subject: row.subject || SUBJECT,
    anchors: [row.body].filter(Boolean),
    builtin: false,
  };
}
