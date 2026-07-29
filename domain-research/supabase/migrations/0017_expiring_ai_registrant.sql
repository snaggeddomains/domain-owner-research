-- Expiring .ai — registrant contact captured off the SAME per-name RDAP scan.
-- We already do an individual RDAP lookup on every .ai; this stores the registrant's
-- public email/phone/name when the RDAP record exposes a real (non-privacy) contact,
-- and a boolean flag for whether it's behind a WHOIS-privacy proxy.
--   registrant_private = true  → masked/redacted (Domains By Proxy, Withheld for Privacy, …)
--   registrant_private = false → a real mailbox showed through (list email/phone)
-- Run on the RESEARCH project. App degrades gracefully until this lands (the scan
-- strip-and-retries the new columns; the report just omits the Registrant column).
alter table domain_research_expiring_ai add column if not exists registrant_email   text;
alter table domain_research_expiring_ai add column if not exists registrant_phone   text;
alter table domain_research_expiring_ai add column if not exists registrant_name    text;
alter table domain_research_expiring_ai add column if not exists registrant_private boolean;
