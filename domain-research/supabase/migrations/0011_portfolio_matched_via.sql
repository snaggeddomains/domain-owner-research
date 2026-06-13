-- Migration 0011: provenance for Corporate Portfolios domains. Safe to re-run.
--
-- Records WHICH registrant key (the seed's WHOIS org/email/name, or the brand
-- fallback) linked each domain to the company — so a result is verifiable and
-- false positives (e.g. a domain that only matched a noisy brand term) are
-- obvious in the UI. Written best-effort by the app; this makes it durable.
alter table domain_research_portfolio_domains add column if not exists matched_via text;
