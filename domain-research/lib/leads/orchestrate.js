// Inbound-lead enrichment — the "who is this person, should I personally reply"
// engine behind an inbound domain inquiry. Reuses the existing stack, no new vendor:
//   1. PERSON  — runPersonDeepDive on the LinkedIn URL (falls back to a name+company
//                search when there's no LinkedIn) → prominence / VIP band / reach.
//   2. COMPANY — firmographicsApollo on the sender's email domain → funding / size /
//                revenue (skipped for free-mail senders — the domain isn't a company).
//   3. TRIAGE  — combine both + the form's own intent into a routing verdict.
// Everything is best-effort + fail-open: a blocked profile or a no-key Apollo never
// aborts — the dossier just carries whatever resolved.
import { runPersonDeepDive } from '../person/orchestrate.js';
import { firmographicsApollo } from '../sales/enrich/firmographics.js';
import { triageLead, emailDomain, isFreeEmail } from './triage.js';

export async function runLeadEnrich({ form = {}, env = process.env } = {}) {
  const name = [form.first_name, form.last_name].filter(Boolean).join(' ').trim() || form.name || null;
  const emailDom = emailDomain(form.email);
  const freeMail = isFreeEmail(form.email);
  const companyDomain = freeMail ? null : emailDom;

  // Person + company run in parallel — independent lookups.
  const [personRes, companyRes] = await Promise.allSettled([
    (form.linkedin_url || name)
      ? runPersonDeepDive({
          url: form.linkedin_url || null,
          name,
          company: companyDomain,
          env,
        })
      : Promise.resolve(null),
    companyDomain
      ? firmographicsApollo(companyDomain, env).catch(() => null)
      : Promise.resolve(null),
  ]);

  const person = personRes.status === 'fulfilled' ? personRes.value : null;
  const company = companyRes.status === 'fulfilled' ? companyRes.value : null;

  const triage = triageLead({ person, company, form });

  return {
    name,
    email: form.email || null,
    email_domain: emailDom,
    free_mail: freeMail,
    company_domain: companyDomain,
    domain_of_interest: form.domain_of_interest || null,
    intent: form.intent || null,
    budget: form.budget || null,
    message: form.message || null,
    location: form.location || null,
    linkedin_url: form.linkedin_url || (person && person.professional && person.professional.linkedin_url) || null,
    triage,
    person,
    company,
    enriched_at: new Date().toISOString(),
  };
}

export default { runLeadEnrich };
