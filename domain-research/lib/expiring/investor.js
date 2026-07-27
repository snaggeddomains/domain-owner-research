// "Likely owned by an investor?" — a binary signal for the Expiring .ai report.
//
// Rob's rule: an investor tell is a FOR-SALE landing page — the name is listed on a
// marketplace (Afternic / Sedo / Dan / Atom / HugeDomains / …). The cheapest reliable
// proxy for a lapsing name is its NAMESERVERS: a dedicated marketplace/parking host in
// the NS set means it's on that marketplace's for-sale lander. Crucially this is NARROW
// — it does NOT flag registrar-DEFAULT DNS (Namecheap's registrar-servers, GoDaddy's
// domaincontrol, Spaceship, Porkbun, Dynadot, NameSilo), because those are just where a
// lapsed name sits and say nothing about ownership. Registrar-lander for-sale listings
// (spaceship/porkbun/etc.) can't be told from NS alone — we show the actual NS so a
// human can judge those.
//
// (Mirrors the MARKETPLACE_NS map in lib/variations/sweep.js, kept self-contained here
// to avoid importing that module's heavy fetch stack into the scan.)

const MARKETPLACE_NS = [
  { suffix: 'dan.com', name: 'Dan' },
  { suffix: 'undeveloped.com', name: 'Dan' },
  { suffix: 'atom.com', name: 'Atom' },
  { suffix: 'afternic.com', name: 'Afternic' },
  { suffix: 'above.com', name: 'Afternic' },
  { suffix: 'sedoparking.com', name: 'Sedo' },
  { suffix: 'sedo.com', name: 'Sedo' },
  { suffix: 'hugedomains.com', name: 'HugeDomains' },
  { suffix: 'sav.com', name: 'Sav' },
  { suffix: 'efty.com', name: 'Efty' },
  { suffix: 'bodis.com', name: 'Bodis (parked)' },
  { suffix: 'parkingcrew.net', name: 'ParkingCrew (parked)' },
  { suffix: 'fabulous.com', name: 'Fabulous (parked)' },
  { suffix: 'voodoo.com', name: 'Voodoo (parked)' },
];

// nameservers[] → { investor: bool, marketplace: string|null }. investor=true means the
// name is on a marketplace/parking host = a for-sale lander = likely an investor.
export function investorSignal(nameservers) {
  const ns = (nameservers || []).map((n) => String(n || '').toLowerCase().replace(/\.+$/, ''));
  for (const m of MARKETPLACE_NS) {
    if (ns.some((n) => n === m.suffix || n.endsWith('.' + m.suffix))) {
      return { investor: true, marketplace: m.name };
    }
  }
  return { investor: false, marketplace: null };
}
