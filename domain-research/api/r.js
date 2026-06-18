// Public share / Open Graph endpoint for a Domain Owner report.
//
// The report itself lives behind a login at a SPA HASH route
// (app.snagged.com/research#/r/<slug>). Link-preview crawlers (Slack, iMessage,
// Twitter, …) never send or read the URL hash and can't pass the login, so a
// shared report link previewed as the generic app card. This PUBLIC, path-based
// route — /research/r/<slug> — renders proper OG/Twitter meta (title
// "Domain Owner Report — <domain>") so the preview is meaningful, then redirects
// a real visitor straight into the gated SPA report.
//
// It exposes ONLY the domain name, which is already in the shared URL — never any
// report content. No auth, no DB: the domain is parsed from the slug.

const UUID_RE = /-?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Recover the human domain from a report slug. New slugs keep the dotted domain
// (`inference.com-<uuid>`); legacy slugs dashed it and carried a date
// (`inference-com-09-06-2026-<uuid>`). Handle both.
function domainFromSlug(slug) {
  let s = String(slug || "").trim().toLowerCase();
  s = s.replace(UUID_RE, "");              // drop the trailing run id
  s = s.replace(/-\d{2}-\d{2}-\d{4}$/, ""); // drop a legacy -DD-MM-YYYY date
  s = s.replace(/[-/.]+$/, "");             // trailing separators
  // Legacy slugs had no dot (sld-tld) — restore the final dash to a dot.
  if (s && !s.includes(".")) {
    const i = s.lastIndexOf("-");
    if (i > 0) s = s.slice(0, i) + "." + s.slice(i + 1);
  }
  return s;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export default function handler(req, res) {
  const slug = String((req.query && req.query.slug) || "").trim();
  const domain = domainFromSlug(slug);
  const title = domain ? `Domain Owner Report — ${domain}` : "Domain Owner Report";
  const description = domain
    ? `Ownership & contact research for ${domain} — who likely owns it, its history, and how to reach them. Prepared by Snagged.`
    : "AI-assisted domain ownership research by Snagged.";

  const base = "https://app.snagged.com/research";
  const shareUrl = `${base}/r/${slug}`;
  const target = slug ? `${base}#/r/${slug}` : base; // gated SPA report route
  const image = `${base}/og-image.png`;

  const T = esc(title), D = esc(description), U = esc(shareUrl), I = esc(image), G = esc(target);
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${T}</title>
<meta name="description" content="${D}" />
<link rel="canonical" href="${U}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Snagged Research" />
<meta property="og:url" content="${U}" />
<meta property="og:title" content="${T}" />
<meta property="og:description" content="${D}" />
<meta property="og:image" content="${I}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${T}" />
<meta name="twitter:description" content="${D}" />
<meta name="twitter:image" content="${I}" />
<meta name="theme-color" content="#254254" />
<meta http-equiv="refresh" content="0;url=${G}" />
<script>location.replace(${JSON.stringify(target)});</script>
<style>html,body{height:100%}body{margin:0;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#254254;color:#f7f1e3}a{color:#e07a5f}</style>
</head><body>
<p>Opening ${T}… &nbsp;<a href="${G}">Continue&nbsp;&rarr;</a></p>
</body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Short cache so crawlers can re-fetch but we don't hammer the function.
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  res.status(200).send(html);
}
