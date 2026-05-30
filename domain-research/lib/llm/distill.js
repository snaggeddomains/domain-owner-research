import Anthropic from '@anthropic-ai/sdk';

// One Haiku call to distill a refine-chat exchange into a reusable playbook
// rule. The output is a DRAFT — the admin reviews/edits before it goes live.
// Cost is negligible (~$0.001 per distill) so we can let users save freely.
const SYSTEM = `You are extracting a reusable "playbook lesson" from a refine-chat exchange about a domain-research report. The user has corrected, refined, or added context to a prior report. Your job: distill the GENERALIZABLE rule embedded in their correction so a future research run on a DIFFERENT domain can use it.

Output ONLY a JSON object — no prose, no code fences:

{
  "title": "short, imperative, <= 100 chars. Phrased as a rule. Example: 'Search live-site author credits when the lander is a personal/hobby project.'",
  "body": "the full rule as it would appear in the agent's system prompt. 1-4 sentences. State the trigger condition, the action to take, and why it matters. Reference specific signals (privacy shields, registrar-flip eras, marketplace listings, live-site footprints) when applicable. Do NOT reference the original domain by name — abstract the lesson.",
  "tags": ["1-3 short kebab-case tags drawn from this set when possible: live-site-credits, registrar-flip, privacy-shield, ma-acquisition, personal-project, marketplace-only, registration-cluster, whois-fingerprint, trademark-mismatch, broker-channel, ccTLD, ownership-pivot, contact-discovery. Add a new tag only if none of the above fits."]
}

If the exchange contains NO generalizable rule (it's a one-off fact about a specific domain, a thank-you, a tangent), return: {"title":"","body":"","tags":[]} and the caller will skip saving.`;

export async function distillLesson({ domain, reportSnippet, userMessage, assistantMessage, env }) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_DISTILL_MODEL || env.ANTHROPIC_NAMING_MODEL || 'claude-haiku-4-5-20251001';

  const userPrompt =
    `Domain under research: ${domain || '(unknown)'}\n\n` +
    `Relevant report excerpt:\n${String(reportSnippet || '').slice(0, 2000)}\n\n` +
    `User's correction or refinement:\n${String(userMessage || '').slice(0, 2000)}\n\n` +
    `Assistant's response with the new finding:\n${String(assistantMessage || '').slice(0, 4000)}\n\n` +
    `Distill the generalizable lesson. Return JSON only.`;

  const response = await client.messages.create({
    model,
    max_tokens: 800,
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Distill returned non-JSON: ${text.slice(0, 200)}`);
  }
  const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';
  const tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === 'string') : [];
  return { title, body, tags, empty: !title || !body };
}
