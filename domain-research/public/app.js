const $ = (id) => document.getElementById(id);

const els = {
  login: $('login'),
  // Sidebar prefs block (was the account block; email + sign-out moved to topbar).
  navAccount: $('nav-account'),
  navNotifyToggle: $('nav-notify-toggle'),
  // Umbrella topbar — Admin link is admin-only; account block carries the
  // signed-in email. Log out is a plain <a href="/api/logout"> — no JS handler.
  topbarSnap: $('topbar-snap'),
  topbarAdmin: $('topbar-admin'),
  topbarReports: $('topbar-reports'),
  topbarAccount: $('topbar-account'),
  navAccountEmail: $('nav-account-email'),
  // Profile menu (avatar dropdown) — name, email-on-done toggle, change password.
  profileBtn: $('profile-btn'),
  profileMenu: $('profile-menu'),
  profileInitial: $('profile-initial'),
  profileInitialLg: $('profile-initial-lg'),
  profileNameDisplay: $('profile-name-display'),
  profileEmail: $('profile-email'),
  profileRole: $('profile-role'),
  profileFirst: $('profile-first'),
  profileLast: $('profile-last'),
  profileSave: $('profile-save'),
  profileNameEdit: $('profile-name-edit'),
  profileSaveStatus: $('profile-save-status'),
  profileNotifyEmail: $('profile-notify-email'),
  profileNotifyBell: $('profile-notify-bell'),
  profilePwCurrent: $('profile-pw-current'),
  profilePwNew: $('profile-pw-new'),
  profilePwConfirm: $('profile-pw-confirm'),
  profilePwSave: $('profile-pw-save'),
  profilePwStatus: $('profile-pw-status'),
  // Notifications bell
  notifBtn: $('notif-btn'),
  refreshBtn: $('refresh-btn'),
  backBtn: $('back-btn'),
  shareBtn: $('share-btn'),
  notifCount: $('notif-count'),
  notifMenu: $('notif-menu'),
  notifList: $('notif-list'),
  notifEmpty: $('notif-empty'),
  notifMarkAll: $('notif-mark-all'),
  loginForm: $('login-form'),
  email: $('email'),
  password: $('password'),
  loginError: $('login-error'),
  forgotLink: $('forgot-link'),
  forgotForm: $('forgot-form'),
  forgotEmail: $('forgot-email'),
  forgotError: $('forgot-error'),
  forgotSent: $('forgot-sent'),
  backToLogin: $('back-to-login'),
  resetForm: $('reset-form'),
  resetPassword: $('reset-password'),
  resetPasswordConfirm: $('reset-password-confirm'),
  resetError: $('reset-error'),
  app: $('app'),
  form: $('search'),
  domain: $('domain'),
  go: $('go'),
  deepToggle: $('deep-toggle'),
  status: $('status'),
  batchStatus: $('batch-status'),
  runControls: $('run-controls'),
  cancelRun: $('cancel-run'),
  marketStrip: $('market-strip'),
  companyVitals: $('company-vitals'),
  namebioStrip: $('namebio-strip'),
  apNamebio: $('ap-namebio'),
  report: $('report'),
  reportAddons: $('report-addons'),
  reportDomain: $('report-domain'),
  researchNew: $('research-new'),
  reportConfidence: $('report-confidence'),
  reportActions: $('report-actions'),
  reportMeta: $('report-meta'),
  exportPdf: $('export-pdf'),
  outreachBtn: $('outreach-btn'),
  outreachDrawer: $('outreach-drawer'),
  outreachBackdrop: $('outreach-backdrop'),
  outreachClose: $('outreach-close'),
  odDomain: $('od-domain'),
  odScenarioSel: $('od-scenario-sel'),
  odWhy: $('od-why'),
  odFitNote: $('od-fit-note'),
  odSubject: $('od-subject'),
  odBody: $('od-bodytext'),
  odCopySubject: $('od-copy-subject'),
  odCopyBody: $('od-copy-body'),
  odTplTitle: $('od-tpl-title'),
  odTplSave: $('od-tpl-save'),
  odTplStatus: $('od-tpl-status'),
  odStatus: $('od-status'),
  odRegen: $('od-regen'),
  odCopy: $('od-copy'),
  historyDrawer: $('history-drawer'),
  historyBackdrop: $('history-backdrop'),
  historyClose: $('history-close'),
  hdDomain: $('hd-domain'),
  hdBody: $('hd-body'),
  hdStatus: $('hd-status'),
  reportFeedback: $('report-feedback'),
  reportNotes: $('report-notes'),
  rnText: $('rn-text'),
  rnSave: $('rn-save'),
  rnStatus: $('rn-status'),
  rfYes: $('rf-yes'),
  rfNo: $('rf-no'),
  rfCorrection: $('rf-correction'),
  rfOwner: $('rf-owner'),
  rfContact: $('rf-contact'),
  rfNotes: $('rf-notes'),
  rfSubmit: $('rf-submit'),
  rfThanks: $('rf-thanks'),
  reportChat: $('report-chat'),
  chatThread: $('chat-thread'),
  chatForm: $('chat-form'),
  chatInput: $('chat-input'),
  chatSend: $('chat-send'),
  chatRegenSynth: $('chat-regen-synth'),
  chatRegenDeep: $('chat-regen-deep'),
  chatRegenStatus: $('chat-regen-status'),
  chatEmail: $('chat-email'),
  ceToggle: $('ce-toggle'),
  ceAttached: $('ce-attached'),
  cePanel: $('ce-panel'),
  ceQ: $('ce-q'),
  ceSearchBtn: $('ce-search-btn'),
  ceRefresh: $('ce-refresh'),
  ceResults: $('ce-results'),
  ceStatus: $('ce-status'),
  evidence: $('evidence'),
  trace: $('trace'),
  hero: $('hero'),
  navResearch: $('nav-research'),
  navAppraisal: $('nav-appraisal'),
  navNaming: $('nav-naming'),
  navAdmin: $('nav-admin'),
  showAll: $('show-all'),
  viewResearch: $('view-research'),
  viewProjects: $('view-projects'),
  viewAdmin: $('view-admin'),
  deepenTop: $('deepen-top'),
  deepenTopBtn: $('deepen-top-btn'),
  deepenBar: $('deepen-bar'),
  deepenBtn: $('deepen'),
  projectsSearch: $('projects-search'),
  projectsList: $('projects-list'),
  homeLink: $('home-link'),
  recent: $('recent'),
  recentList: $('recent-list'),
  navTrademark: $('nav-trademark'),
  navAppraisal: $('nav-appraisal'),
  navNaming: $('nav-naming'),
  namingInput: $('naming-input'),
  namingTitle: $('naming-title'),
  namingIndustry: $('naming-industry'),
  namingWebsite: $('naming-website'),
  namingMode: $('naming-mode'),
  namingVariations: $('naming-variations'),
  nmvTable: $('nmv-table'),
  nmvCount: $('nmv-count'),
  nmvNote: $('nmv-note'),
  nmvDownload: $('nmv-download'),
  namingGo: $('naming-go'),
  namingDraft: $('naming-draft'),
  namingNew: $('naming-new'),
  namingApply: $('naming-apply'),
  namingFiltersPanel: $('naming-filters-panel'),
  namingFiltersToggle: $('naming-filters-toggle'),
  namingPriceMin: $('nm-price-min'),
  namingPriceMax: $('nm-price-max'),
  namingLenMin: $('nm-len-min'),
  namingLenMax: $('nm-len-max'),
  namingSylMin: $('nm-syl-min'),
  namingSylMax: $('nm-syl-max'),
  namingWordsMin: $('nm-words-min'),
  namingWordsMax: $('nm-words-max'),
  namingStatus: $('naming-status'),
  namingError: $('naming-error'),
  namingFilters: $('naming-filters'),
  namingResults: $('naming-results'),
  namingBuyReadyCount: $('naming-buy-ready-count'),
  namingSort: $('naming-sort'),
  namingBuyReadyTable: $('naming-buy-ready-table'),
  namingStretchCount: $('naming-stretch-count'),
  namingStretchTable: $('naming-stretch-table'),
  namingExportSheet: $('naming-export-sheet'),
  namingExportCsv: $('naming-export-csv'),
  namingExportDownload: $('naming-export-download'),
  namingRecent: $('naming-recent'),
  namingRecentList: $('naming-recent-list'),
  namingShowAll: $('naming-show-all'),
  namingRecentFive: $('naming-recent-five'),
  namingRecentFiveList: $('naming-recent-five-list'),
  namingRecentFiveAll: $('naming-recent-five-all'),
  namingProjectsSearch: $('naming-projects-search'),
  namingProjectsList: $('naming-projects-list'),
  namingScopeToggle: $('naming-scope-toggle'),
  namingChat: $('naming-chat'),
  namingChatThread: $('naming-chat-thread'),
  namingChatForm: $('naming-chat-form'),
  namingChatInput: $('naming-chat-input'),
  namingChatSend: $('naming-chat-send'),
  namingChatError: $('naming-chat-error'),
  lessonList: $('lesson-list'),
  lessonListEmpty: $('lesson-list-empty'),
  lessonListError: $('lesson-list-error'),
  lessonModal: $('lesson-modal'),
  lessonModalTitle: $('lesson-modal-title'),
  lessonModalBody: $('lesson-modal-body'),
  lessonModalTags: $('lesson-modal-tags'),
  lessonModalError: $('lesson-modal-error'),
  lessonModalSubmit: $('lesson-modal-submit'),
  lessonModalCancel: $('lesson-modal-cancel'),
  lessonModalSub: $('lesson-modal-sub'),
  lessonModalHeading: $('lesson-modal-heading'),
  suggestStrategy: $('suggest-strategy'),
  suggestStrategyBtn: $('suggest-strategy-btn'),
  navToggle: $('nav-toggle'),
  nav: $('nav'),
  tmForm: $('tm-form'),
  tmQuery: $('tm-query'),
  tmStatus: $('tm-status'),
  tmResults: $('tm-results'),
  tmRecent: $('tm-recent'),
  apForm: $('ap-form'),
  apDomain: $('ap-domain'),
  apStatus: $('ap-status'),
  apResult: $('ap-result'),
  apAtom: $('ap-atom'),
  apRecent: $('ap-recent'),
  navDbscreen: $('nav-dbscreen'),
  navDbsearch: $('nav-dbsearch'),
  navNameserver: $('nav-nameserver'),
  navSales: $('nav-sales'),
  navPortfolio: $('nav-portfolio'),
  navBeeper: $('nav-beeper'),
  navWhois: $('nav-whois'),
  whoisForm: $('whois-form'), whoisDomain: $('whois-domain'), whoisStatus: $('whois-status'), whoisResult: $('whois-result'),
  navDiq: $('nav-diq'),
  diqForm: $('diq-form'), diqDomain: $('diq-domain'), diqStatus: $('diq-status'), diqResult: $('diq-result'),
  domainBar: $('domain-bar'), domainBarD: $('domain-bar-d'), domainBarChips: $('domain-bar-chips'), domainBarK: $('domain-bar-k'),
  cmdk: $('cmdk'), cmdkDomain: $('cmdk-domain'), cmdkList: $('cmdk-list'),
  beeperForm: $('beeper-form'),
  beeperDomain: $('beeper-domain'),
  beeperAdd: $('beeper-add'),
  beeperList: $('beeper-list'),
  beeperStatus: $('beeper-status'),
  srForm: $('sr-form'), srDomain: $('sr-domain'), srGo: $('sr-go'), srStatus: $('sr-status'),
  srResults: $('sr-results'), srSummary: $('sr-summary'), srShowAll: $('sr-show-all'), srSelectAll: $('sr-select-all'),
  srEnrich: $('sr-enrich'), srCsv: $('sr-csv'), srTable: $('sr-table'),
  srAngles: $('sr-angles'), srAnglegate: $('sr-anglegate'), srQualify: $('sr-qualify'),
  srPathfilter: $('sr-pathfilter'),
  srRecent: $('sr-recent'), srRecentList: $('sr-recent-list'), srRecentAll: $('sr-recent-all'),
  srProjectsSearch: $('sr-projects-search'), srProjectsList: $('sr-projects-list'),
  srEntry: $('sr-entry'), srReshead: $('sr-reshead'), srResheadSeed: $('sr-reshead-seed'), srNew: $('sr-new'),
  cpForm: $('cp-form'), cpQuery: $('cp-query'), cpGo: $('cp-go'), cpError: $('cp-error'),
  cpTlds: $('cp-tlds'), cpMin: $('cp-min'), cpMax: $('cp-max'), cpDict: $('cp-dict'), cpHyphens: $('cp-hyphens'),
  cpEntry: $('cp-entry'), cpReshead: $('cp-reshead'), cpResheadQ: $('cp-reshead-q'), cpNew: $('cp-new'),
  cpStatus: $('cp-status'), cpResults: $('cp-results'), cpSummary: $('cp-summary'), cpTable: $('cp-table'), cpCsv: $('cp-csv'),
  cpRecent: $('cp-recent'), cpRecentList: $('cp-recent-list'), cpRecentAll: $('cp-recent-all'),
  cpRunsSearch: $('cp-runs-search'), cpRunsList: $('cp-runs-list'),
  navPerson: $('nav-person'),
  prForm: $('pr-form'), prUrl: $('pr-url'), prName: $('pr-name'), prNew: $('pr-new'),
  prStatus: $('pr-status'), prResults: $('pr-results'), prReveal: $('pr-reveal'),
  prRecent: $('pr-recent'), prRecentList: $('pr-recent-list'), prRecentAll: $('pr-recent-all'),
  prRunsSearch: $('pr-runs-search'), prRunsList: $('pr-runs-list'),
  navResearchGroup: $('nav-research-group'), navSnapGroup: $('nav-snap-group'), navReportsGroup: $('nav-reports-group'),
  navSnapEval: $('nav-snap-eval'), navBulkEval: $('nav-bulk-eval'), navSnapOpps: $('nav-snap-opps'), navSnapNames: $('nav-snap-names'),
  navRepAnalytics: $('nav-rep-analytics'), navRepMarketplace: $('nav-rep-marketplace'), navRepChat: $('nav-rep-chat'), navRepCost: $('nav-rep-cost'),
  topbarResearch: $('topbar-research'),
  evForm: $('ev-form'), evDomain: $('ev-domain'), evPrice: $('ev-price'), evGo: $('ev-go'), evRefresh: $('ev-refresh'),
  evStatus: $('ev-status'), evResult: $('ev-result'), evRecent: $('ev-recent'),
  nsModeToggle: $('ns-modetoggle'), nsMatchToggle: $('ns-matchtoggle'),
  nsDomainForm: $('ns-domain-form'), nsDomain: $('ns-domain'),
  nsNsForm: $('ns-ns-form'), nsNs: $('ns-ns'), nsTld: $('ns-tld'),
  nsStatus: $('ns-status'), nsResult: $('ns-result'), nsRecent: $('ns-recent'),
  dsSearch: $('ds-search'), dsQ: $('ds-q'), dsGo: $('ds-go'), dsExact: $('ds-exact'),
  dsPriceMin: $('ds-price-min'), dsPriceMax: $('ds-price-max'),
  dsTlds: $('ds-tlds'),
  dsLenMin: $('ds-len-min'), dsLenMax: $('ds-len-max'),
  dsSingle: $('ds-single'), dsDict: $('ds-dict'),
  dsWordsMin: $('ds-words-min'), dsWordsMax: $('ds-words-max'),
  dsSyllMin: $('ds-syll-min'), dsSyllMax: $('ds-syll-max'),
  dsNonum: $('ds-nonum'), dsFuzzy: $('ds-fuzzy'),
  dsSource: $('ds-source'), dsOwner: $('ds-owner'), dsKeyword: $('ds-keyword'),
  dsApply: $('ds-apply'), dsReset: $('ds-reset'),
  dsDbToggle: $('ds-dbtoggle'), dsCount: $('ds-count'), dsExport: $('ds-export'),
  dsStatus: $('ds-status'), dsTbody: $('ds-tbody'),
  dsPager: $('ds-pager'), dsPrev: $('ds-prev'), dsNext: $('ds-next'), dsPageinfo: $('ds-pageinfo'),
  dsTable: $('ds-table'),
  dbForm: $('db-form'),
  dbDomain: $('db-domain'),
  dbGo: $('db-go'),
  dbStatus: $('db-status'),
  dbResult: $('db-result'),
};

// Tool history is server-backed (Supabase) so the "recent 5" and deeplinks
// persist across devices/sessions like research runs. localStorage is kept as
// a fast local cache + offline fallback (mobile Safari evicts it).
function loadRecents(kind) {
  try { return JSON.parse(localStorage.getItem(`recent_${kind}`) || '[]'); } catch { return []; }
}
function saveRecentLocal(kind, key, data) {
  const list = loadRecents(kind).filter((r) => r.key !== key);
  list.unshift({ key, data, ts: Date.now() });
  try { localStorage.setItem(`recent_${kind}`, JSON.stringify(list.slice(0, 5))); } catch {}
}
function saveRecent(kind, key, data) {
  saveRecentLocal(kind, key, data);
  serverSaveTool(kind, key, data);
}

// Scrub a user-typed domain before it's submitted: strip the bits that aren't
// part of the domain (scheme, leading www., wrapping quotes/whitespace, a port,
// trailing slashes/dots). THROW a clear error (so the form can prompt re-entry)
// when the input is ambiguous — a path/query/fragment or user@host means we
// can't tell WHICH domain is meant (e.g. https://www.afternic.com/domain/
// satiate.com → afternic.com or satiate.com?), and we must not silently guess.
// With { requireValid:false } a bare word passes through (Trademark reduces it to
// an SLD); otherwise the result must be a valid domain.
function cleanDomainInput(raw, { requireValid = true } = {}) {
  const shown = String(raw == null ? '' : raw).trim();
  const bad = () => new Error(
    `Couldn't read a domain from "${shown}". Enter just the domain — e.g. example.com (no https://, no www, no path).`,
  );
  let s = String(raw == null ? '' : raw)
    .normalize('NFKC')
    .replace(/[ ​-‏⁠﻿]/g, '') // nbsp + zero-width
    .trim()
    .replace(/^[<"'“”‘’\s]+|[>"'“”‘’\s]+$/g, '')        // wrapping quotes/brackets
    .trim();
  if (!s) throw new Error('Enter a domain — e.g. example.com');
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');        // scheme://
  if (s.includes('@')) throw bad();                     // user@host / email
  const cut = s.search(/[/?#]/);
  let host = cut === -1 ? s : s.slice(0, cut);
  const after = cut === -1 ? '' : s.slice(cut);
  // A bare trailing slash is fine; a real path / query / fragment is ambiguous.
  if (after && after.replace(/\/+$/, '') !== '') throw bad();
  host = host.replace(/^www\./i, '').replace(/:\d+$/, '').replace(/\.+$/, '').toLowerCase();
  if (!host || /[\s/]/.test(host)) throw bad();
  if (requireValid &&
      !/^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i.test(host)) throw bad();
  return host;
}
const TOOL_PATH = { tm: 'trademark', ap: 'appraisal', ev: 'evaluate' };
const TOOL_LABEL = { tm: 'trademark searches', ap: 'appraisals', ev: 'SNAP evaluations' };
// Per-tool history view state (collapsed recent-5 vs expanded searchable list).
const toolHistory = { tm: { all: [], expanded: false, q: '' }, ap: { all: [], expanded: false, q: '' }, ev: { all: [], expanded: false, q: '' } };

async function serverListTool(kind, limit = 5) {
  try {
    const res = await fetch(`/research/api/lookup?kind=${kind}&limit=${limit}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (!Array.isArray(d.lookups)) return null;
    return d.lookups.map((r) => ({ key: r.query, ts: r.updated_at ? Date.parse(r.updated_at) : Date.now() }));
  } catch { return null; }
}
async function serverGetTool(kind, query) {
  try {
    const res = await fetch(`/research/api/lookup?kind=${kind}&query=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.found) return null;
    // updated_at comes from Postgres as an ISO string; convert to ms so callers
    // can compare against Date.now() and feed agoLabel().
    const updatedAt = d.updated_at ? Date.parse(d.updated_at) || null : null;
    return { data: d.data, updatedAt };
  } catch { return null; }
}
function serverSaveTool(kind, key, data) {
  try {
    fetch('/research/api/lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, query: key, data }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

// Tool history shown at the BOTTOM of the tool page: recent 5 collapsed, with a
// "Show all … " link (when >5) that expands into a searchable full list. Server-
// backed, with localStorage as the offline fallback.
async function refreshToolRecent(el, kind) {
  if (!el) return;
  const server = await serverListTool(kind, 200);
  const list = server && server.length ? server : loadRecents(kind).map((r) => ({ key: r.key, ts: r.ts }));
  toolHistory[kind].all = list;
  renderToolHistory(el, kind);
}
function renderToolHistory(el, kind) {
  const st = toolHistory[kind];
  const all = st.all || [];
  if (!all.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const tool = TOOL_PATH[kind];
  const label = TOOL_LABEL[kind];
  const item = (r) =>
    `<li class="recent-run" data-key="${escapeHtml(r.key)}"><span class="recent-domain">${escapeHtml(r.key)}</span><span class="recent-when">${escapeHtml(r.ts ? new Date(r.ts).toLocaleString() : '')}</span></li>`;
  const wire = (root) =>
    root.querySelectorAll('.recent-run').forEach((li) => {
      li.addEventListener('click', () => { setToolUrl(tool, li.dataset.key); route(); });
    });

  if (!st.expanded) {
    el.innerHTML =
      `<div class="recent-title">Recent</div><ul class="recent-list">${all.slice(0, 5).map(item).join('')}</ul>` +
      (all.length > 5 ? `<a class="show-all" href="#">Show all past ${label} &rarr;</a>` : '');
    wire(el);
    const sa = el.querySelector('.show-all');
    if (sa) sa.addEventListener('click', (e) => { e.preventDefault(); st.expanded = true; renderToolHistory(el, kind); });
    return;
  }
  // Expanded: persistent search input + a list container we redraw on input
  // (so the input keeps focus while typing).
  el.innerHTML =
    `<div class="recent-title">All past ${label} (${all.length})</div>` +
    `<input class="tool-history-search" type="text" placeholder="Search…" autocomplete="off" />` +
    `<ul class="recent-list th-list"></ul>` +
    `<a class="show-all" href="#">Show less</a>`;
  const input = el.querySelector('.tool-history-search');
  const ul = el.querySelector('.th-list');
  const draw = () => {
    const q = (input.value || '').trim().toLowerCase();
    const filtered = q ? all.filter((r) => String(r.key).toLowerCase().includes(q)) : all;
    ul.innerHTML = filtered.length ? filtered.map(item).join('') : '<li class="muted">No matches.</li>';
    wire(ul);
  };
  input.value = st.q || '';
  input.addEventListener('input', () => { st.q = input.value; draw(); });
  el.querySelector('.show-all').addEventListener('click', (e) => { e.preventDefault(); st.expanded = false; st.q = ''; renderToolHistory(el, kind); });
  draw();
}

const POLL_MS = 2500;
let pollTimer = null;
let clockTimer = null;
let currentRunId = null;
// Session memory of the latest research run per domain, so switching back to
// Domain Owner (via the action bar / ⌘K) RESUMES the existing call — clock and
// all — instead of firing a duplicate run.
const domainRuns = new Map();
let canOutreach = false;
// On-demand phone enhance (FullEnrich, premium) is gated like the deep pass.
let canEnhance = false;

function clearTimers() {
  if (pollTimer) clearInterval(pollTimer);
  if (clockTimer) clearInterval(clockTimer);
  pollTimer = null;
  clockTimer = null;
}

function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  // Show hours once we cross 60 min so a stuck run reads "16:53:21", not "1013:37".
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// A deep/paid run is THOROUGH — chasing marketplace listings, WHOIS history and
// contacts across many Inngest steps legitimately takes 15-25+ minutes. So we do
// NOT cry "stalled" early: past SLOW_MS we just reassure ("still working") and
// keep polling; only past STALL_MS (a genuine ceiling well beyond any real run)
// do we assume the backend job died without writing a terminal status and stop.
const SLOW_MS = 12 * 60 * 1000;
const STALL_MS = 40 * 60 * 1000;

// Deeplink helpers — reports live at a clean, domain-led slug ending in the run
// id:  #/r/<domain>-<runId>   (e.g. inference.com-67edc1fd-…). The dotted domain
// reads as the real domain and powers the share link's preview title; the run id
// is what actually resolves the report (runIdFromHash regex-extracts it, so older
// dashed/dated slugs still work).
function buildSlug(run) {
  const d = String(run.domain || '').toLowerCase().replace(/[^a-z0-9.-]/g, '').replace(/^-+|-+$/g, '');
  return `${d}-${run.id}`;
}
function runIdFromHash() {
  const m = location.hash.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : null;
}
function applyHash(run) {
  if (!run || !run.id) return;
  const target = `#/r/${buildSlug(run)}`;
  if (location.hash !== target) history.replaceState(null, '', target);
}
function clearHash() {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

// The standalone tools are PATH-routed (research stays hash-routed at the
// SPA root). All paths carry the /research/ prefix because the app is
// nested at app.snagged.com/research/* — see vercel.json rewrites.
//   /research/trademark           /research/trademark/<query>
//   /research/appraisal           /research/appraisal/<domain>
//   /research/naming              (no slug — brief lives in the textarea)
// Tools that also answer at a top-level vanity path (umbrella rewrites them to
// the SPA): Domain DB Screen at /dbscreen, DB Search at /dbsearch.
const VANITY_TOOLS = ['dbscreen', 'dbsearch'];
function currentToolRoute() {
  let m = location.pathname.match(/^\/research\/(trademark|appraisal|naming|dbscreen|dbsearch|nameserver|sales|portfolio|person|evaluate|bulk-eval|beeper|whois|diq|admin)(?:\/(.+?))?\/?$/);
  if (!m) m = location.pathname.match(/^\/(dbscreen|dbsearch)(?:\/(.+?))?\/?$/);
  if (!m) return null;
  return { tool: m[1], slug: m[2] ? decodeURIComponent(m[2]) : '' };
}
function setToolUrl(tool, slug) {
  const base = VANITY_TOOLS.includes(tool) ? `/${tool}` : `/research/${tool}`;
  const path = slug ? `${base}/${encodeURIComponent(slug)}` : base;
  if (location.pathname !== path) history.pushState(null, '', path);
}

// Single entry point for "where are we" — used after auth and on back/forward.
// Each deep-linkable tool view → the module permission that unlocks it. A user
// who lacks it shouldn't see the view at all (the nav button is already hidden);
// hide it on direct-URL navigation too by routing them back to the entry view.
const TOOL_PERMISSION = {
  trademark: 'trademark',
  naming: 'naming',
  appraisal: 'appraisal',
  dbscreen: 'dbscreen',
  dbsearch: 'dbsearch',
  nameserver: 'nameserver',
  beeper: 'beeper',
  whois: 'whois',
  diq: 'domain_owner',
  portfolio: 'portfolio',
  person: 'person',
  evaluate: 'evaluate',
  'bulk-eval': 'bulk_eval',
};

// ── Cross-module domain context (action bar + ⌘K palette; workspace-ready) ──
// Single source of truth for the domain-centric tools. Each entry knows how to
// load ITSELF for a domain, so the action bar, the ⌘K palette, and (later) a
// Domain Workspace of stacked cards all drive off this one list — adding the
// workspace is then just "render these as cards" instead of "navigate".
function runOwnerFor(domain) {
  const d = (domain || '').trim().toLowerCase();
  setActiveDomain(d);
  // Already holding this domain's run (in-flight or loaded this session)? Re-open
  // it so we resume the SAME call — openProject re-anchors the elapsed clock to
  // the run's real start — rather than enqueuing a duplicate research run.
  const existing = (currentRunId && currentReportDomain && currentReportDomain.toLowerCase() === d)
    ? currentRunId
    : domainRuns.get(d);
  if (existing) { openProject(existing); return; }
  // No prior run this session → start a fresh free pre-flight.
  if (history.pushState) history.pushState(null, '', '/research');
  showEntry();                                   // Domain Owner is the home view
  if (els.deepToggle) els.deepToggle.checked = false; // free pre-flight, not paid deep
  if (els.domain) els.domain.value = d;
  if (els.form) { els.form.requestSubmit ? els.form.requestSubmit() : els.form.dispatchEvent(new Event('submit', { cancelable: true })); }
}
const DOMAIN_MODULES = [
  { tool: 'research',   label: 'Owner',      icon: '✉',  perm: 'domain_owner', run: (d) => runOwnerFor(d) },
  { tool: 'whois',      label: 'Whois',      icon: '🔎', perm: 'whois',        run: (d) => { setToolUrl('whois', d); route(); } },
  { tool: 'appraisal',  label: 'Appraise',   icon: '💲', perm: 'appraisal',    run: (d) => { setToolUrl('appraisal', d); route(); } },
  { tool: 'trademark',  label: 'Trademark',  icon: '™',  perm: 'trademark',    run: (d) => { setToolUrl('trademark', toSld(d)); route(); } },
  { tool: 'dbscreen',   label: 'DB Screen',  icon: '📋', perm: 'dbscreen',     run: (d) => { setToolUrl('dbscreen', d); route(); } },
  { tool: 'nameserver', label: 'Nameserver', icon: '🌐', perm: 'nameserver',   run: (d) => { setToolUrl('nameserver', d); route(); } },
  { tool: 'beeper',     label: 'Watch',      icon: '🔔', perm: 'beeper',        run: (d) => { setToolUrl('beeper', d); route(); } },
  // History opens a lightweight drawer (no route/view) that runs DomainIQ's
  // historical-WHOIS lookup on demand and distills the ownership lineage —
  // gated by domain_owner (the module DomainIQ bills to). Premium: each click
  // spends a DomainIQ credit.
  { tool: 'history',    label: 'History',    icon: '📜', perm: 'domain_owner',  run: (d) => openHistory(d) },
];
let activeDomain = '';
// Record the domain the user is currently working — drives the action bar + palette.
function setActiveDomain(d) {
  const v = (d || '').trim().toLowerCase();
  if (v) activeDomain = v;
  renderDomainBar();
}
// The domain tool currently in view (so we exclude it from the chips); null when
// the current view isn't a domain tool (e.g. Naming, DB Search, Portfolios).
function currentDomainTool() {
  const tr = currentToolRoute();
  if (tr) return DOMAIN_MODULES.some((m) => m.tool === tr.tool) ? tr.tool : null;
  const rv = document.getElementById('view-research');
  return (rv && !rv.hidden) ? 'research' : null;
}
function renderDomainBar() {
  const bar = els.domainBar; if (!bar) return;
  const here = currentDomainTool();
  // Render the FULL accessible set (stable positions so a chip never shifts under
  // a finger mid-tap) and mark the current tool as a non-clickable "you are here"
  // chip rather than removing it.
  const mods = activeDomain && here
    ? DOMAIN_MODULES.filter((m) => canModule(currentUser, m.perm))
    : [];
  if (!mods.length || (mods.length === 1 && mods[0].tool === here)) { bar.hidden = true; return; }
  if (els.domainBarD) els.domainBarD.textContent = activeDomain;
  els.domainBarChips.innerHTML = mods.map((m) => {
    const cur = m.tool === here;
    return `<button type="button" class="domain-chip${cur ? ' current' : ''}" data-tool="${m.tool}"${cur ? ' disabled aria-current="page"' : ''}>${m.icon} ${escapeHtml(m.label)}</button>`;
  }).join('');
  els.domainBarChips.querySelectorAll('.domain-chip:not(.current)').forEach((b) => b.addEventListener('click', () => {
    b.blur(); // drop focus so no highlight lingers after navigation
    const m = DOMAIN_MODULES.find((x) => x.tool === b.dataset.tool);
    if (m) m.run(activeDomain);
  }));
  bar.hidden = false;
}

// ── ⌘K / Ctrl-K quick-switch palette ──
let cmdkIdx = 0;
function cmdkMods() { return DOMAIN_MODULES.filter((m) => canModule(currentUser, m.perm)); }
function renderCmdkList() {
  const mods = cmdkMods();
  cmdkIdx = Math.max(0, Math.min(cmdkIdx, mods.length - 1));
  els.cmdkList.innerHTML = mods.map((m, i) => `<li class="cmdk-item${i === cmdkIdx ? ' active' : ''}" data-tool="${m.tool}">${m.icon} ${escapeHtml(m.label)}</li>`).join('');
  els.cmdkList.querySelectorAll('.cmdk-item').forEach((li) => li.addEventListener('click', () => runCmdk(li.dataset.tool)));
}
function openCmdk() {
  if (!els.cmdk) return;
  els.cmdkDomain.value = activeDomain || '';
  cmdkIdx = 0;
  renderCmdkList();
  els.cmdk.hidden = false;
  els.cmdkDomain.focus(); els.cmdkDomain.select();
}
function closeCmdk() { if (els.cmdk) els.cmdk.hidden = true; }
function runCmdk(tool) {
  let d;
  try { d = cleanDomainInput(els.cmdkDomain.value, { requireValid: false }); }
  catch { d = (els.cmdkDomain.value || '').trim(); }
  const m = DOMAIN_MODULES.find((x) => x.tool === tool);
  if (!m || !d) return;
  closeCmdk();
  m.run(d);
}
// Collapse a tool's hero+search into the compact "<seed> <label>" header once a
// result is showing (CSS .report-open); restore the entry when off.
function toolReport(viewId, seed, on) {
  const v = document.getElementById(viewId);
  if (!v) return;
  v.classList.toggle('report-open', !!on);
  if (on) { const s = v.querySelector('.tr-seed'); if (s) s.textContent = seed || ''; }
}

function route() {
  if (els.app.hidden) return;
  const tr = currentToolRoute();
  if (tr && TOOL_PERMISSION[tr.tool] && !canModule(currentUser, TOOL_PERMISSION[tr.tool])) {
    history.replaceState(null, '', '/research');
    showEntry();
    return;
  }
  if (tr && tr.tool === 'trademark') {
    showView('trademark');
    refreshToolRecent(els.tmRecent, 'tm');
    if (tr.slug) openToolSlug('tm', tr.slug);
    else { els.tmResults.innerHTML = ''; els.tmQuery.value = ''; setToolStatus(els.tmStatus, ''); }
    toolReport('view-trademark', tr.slug || '', !!tr.slug);
    return;
  }
  if (tr && tr.tool === 'naming') {
    if (tr.slug === 'all') {
      showView('naming-projects');
      loadNamingProjects('');
      if (els.namingProjectsSearch) els.namingProjectsSearch.value = '';
      return;
    }
    showView('naming');
    if (tr.slug) {
      openNamingRun(tr.slug);
    } else {
      resetNamingView();
      loadNamingRecent();
    }
    return;
  }
  if (tr && tr.tool === 'appraisal') {
    showView('appraisal');
    refreshToolRecent(els.apRecent, 'ap');
    if (tr.slug) openToolSlug('ap', tr.slug);
    else { els.apResult.hidden = true; els.apResult.innerHTML = ''; els.apDomain.value = ''; setToolStatus(els.apStatus, ''); if (els.apNamebio) { els.apNamebio.hidden = true; els.apNamebio.innerHTML = ''; els.apNamebio.dataset.domain = ''; } if (els.apAtom) { els.apAtom.hidden = true; els.apAtom.innerHTML = ''; els.apAtom.dataset.domain = ''; } }
    toolReport('view-appraisal', tr.slug || '', !!tr.slug);
    return;
  }
  if (tr && tr.tool === 'dbscreen') {
    showView('dbscreen');
    // Accept either /dbscreen/<domain> (path) or /dbscreen?domain=<domain> (query).
    const q = tr.slug || dbDomainFromQuery();
    if (q) {
      if (els.dbDomain) els.dbDomain.value = q;
      if (!tr.slug) setToolUrl('dbscreen', q); // normalize ?domain= to /dbscreen/<domain>
      runDbScreen(q);
    } else {
      if (els.dbDomain) els.dbDomain.value = '';
      if (els.dbResult) els.dbResult.hidden = true;
      setToolStatus(els.dbStatus, '');
    }
    toolReport('view-dbscreen', q || '', !!q);
    return;
  }
  if (tr && tr.tool === 'dbsearch') {
    showView('dbsearch');
    runDbSearch(tr.slug || '');
    return;
  }
  if (tr && tr.tool === 'nameserver') {
    showView('nameserver');
    if (tr.slug) { nsSetMode('domain'); if (els.nsDomain) els.nsDomain.value = tr.slug; runNsDomain(tr.slug); }
    else nsReset();
    toolReport('view-nameserver', tr.slug || '', !!tr.slug);
    return;
  }
  if (tr && tr.tool === 'beeper') {
    showView('beeper');
    if (tr.slug && els.beeperDomain) { els.beeperDomain.value = tr.slug; setActiveDomain(tr.slug); } // carry a domain in (no silent add)
    loadBeeper();
    return;
  }
  if (tr && tr.tool === 'whois') {
    showView('whois');
    if (tr.slug) { if (els.whoisDomain) els.whoisDomain.value = tr.slug; runWhois(tr.slug); }
    return;
  }
  if (tr && tr.tool === 'diq') {
    showView('diq');
    if (tr.slug) { if (els.diqDomain) els.diqDomain.value = tr.slug; runDiq(tr.slug); }
    return;
  }
  if (tr && tr.tool === 'sales') {
    if (tr.slug === 'all') {
      showView('sales-projects');
      loadSalesProjects('');
      if (els.srProjectsSearch) els.srProjectsSearch.value = '';
      return;
    }
    showView('sales');
    if (tr.slug) openSalesProject(tr.slug);
    else resetSalesView();
    return;
  }
  if (tr && tr.tool === 'portfolio') {
    if (tr.slug === 'all') {
      showView('portfolio-runs');
      loadPortfolioRuns('');
      if (els.cpRunsSearch) els.cpRunsSearch.value = '';
      return;
    }
    showView('portfolio');
    if (tr.slug) openPortfolioRun(tr.slug);
    else resetPortfolioView();
    return;
  }
  if (tr && tr.tool === 'person') {
    if (tr.slug === 'all') {
      showView('person-runs');
      loadPersonRuns('');
      if (els.prRunsSearch) els.prRunsSearch.value = '';
      return;
    }
    showView('person');
    if (tr.slug) openPersonRun(tr.slug);
    else resetPersonView();
    return;
  }
  if (tr && tr.tool === 'evaluate') {
    showView('evaluate');
    refreshToolRecent(els.evRecent, 'ev');
    if (tr.slug) {
      // If a run is already in flight, DON'T hijack the active run's search box or its
      // loading card — just peek at the clicked/deep-linked report (cache-first). Only a
      // navigation with no active run drives the box + the (cache-first) runEvaluate.
      if (evRunning) { evViewCached(tr.slug); }
      else { if (els.evDomain) els.evDomain.value = tr.slug; runEvaluate(tr.slug); }
    }
    else resetEvaluateView();
    return;
  }
  if (tr && tr.tool === 'bulk-eval') {
    showView('bulk-eval');
    return;
  }
  if (tr && tr.tool === 'admin') {
    // Lessons curation (the admin.lessons.approve module). HIDE it from users
    // who lack the permission — fall through to the entry view rather than
    // render the Lessons page and then show a "no access" notice on it.
    if (!canAdminLessons(currentUser)) { history.replaceState(null, '', '/research'); showEntry(); return; }
    showView('admin');
    return;
  }
  // Inbound-lead dossier deep-link (#/lead/<key>) — internal, gated server-side by
  // the `leads` permission; the enrichment is keyed on the lead's email.
  const lk = (location.hash.match(/^#\/lead\/([a-f0-9]{6,})$/i) || [])[1];
  if (lk) { showView('lead'); loadLead(lk); return; }
  const id = runIdFromHash();
  if (id) openProject(id);
  else showEntry();
}
function routeAfterAuth() {
  route();
}

// ── Domain DB Search ────────────────────────────────────────────────────────
// Looks a domain up in the Master Domain List + name Universe and shows every
// field we have. Permission-gated server-side (`dbsearch`).
// Pull a domain out of the URL query for the DB-search deep link:
//   /dbsearch?domain=bobby.com  (also ?d= / ?q=, or a bare ?bobby.com)
function dbDomainFromQuery() {
  const search = location.search || '';
  if (!search) return '';
  const params = new URLSearchParams(search);
  const named = params.get('domain') || params.get('d') || params.get('q');
  if (named) return named.trim().toLowerCase();
  const bare = decodeURIComponent(search.replace(/^\?/, '')).trim().toLowerCase();
  if (bare && !bare.includes('=') && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(bare)) return bare;
  return '';
}

const DBSEARCH_SKIP = new Set(['embedding']); // vector column — not human-readable
function dbFmtVal(v) {
  if (v == null || v === '') return '';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}
function dbHumanizeKey(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function dbRenderKv(obj, order) {
  const ordered = [...order, ...Object.keys(obj).filter((k) => !order.includes(k))];
  const seen = new Set();
  let rows = '';
  for (const k of ordered) {
    if (seen.has(k) || DBSEARCH_SKIP.has(k) || !(k in obj)) continue;
    seen.add(k);
    const val = dbFmtVal(obj[k]);
    if (val === '') continue;
    rows += `<div class="kv-row"><span class="kv-key">${escapeHtml(dbHumanizeKey(k))}</span><span class="kv-val">${escapeHtml(val)}</span></div>`;
  }
  return rows || '<p class="muted">No fields recorded.</p>';
}
function dbCard(title, subtitle, obj, order, err) {
  let pill, body;
  if (err) { pill = '<span class="pill pill-err">Error</span>'; body = `<p class="login-error">${escapeHtml(err)}</p>`; }
  else if (obj) { pill = '<span class="pill pill-found">Found</span>'; body = `<div class="kv-grid">${dbRenderKv(obj, order)}</div>`; }
  else { pill = '<span class="pill pill-miss">Not found</span>'; body = `<p class="muted">No record in ${escapeHtml(title)}.</p>`; }
  return `<div class="dbsearch-card"><div class="dbsearch-card-head"><h2>${escapeHtml(title)}</h2>${pill}</div>` +
    `${subtitle ? `<p class="muted dbsearch-card-sub">${escapeHtml(subtitle)}</p>` : ''}${body}</div>`;
}
function renderDbResult(data) {
  const masterOrder = ['domain', 'owner', 'price', 'source', 'category', 'tld', 'is_single_word', 'dictionary_word', 'number_of_words', 'syllables', 'sld_length', 'root_words', 'keywords', 'emotions', 'created_at', 'updated_at'];
  const uniOrder = ['domain', 'sld', 'tld', 'sources', 'best_price', 'best_price_source', 'source_tier', 'quality_score', 'deal_score', 'zipf_score', 'num_words', 'num_syllables', 'is_dictionary_word', 'sld_length', 'category', 'industries', 'keywords', 'emotions', 'first_seen', 'last_seen', 'updated_at'];
  const errs = data.errors || {};
  let html = `<div class="dbsearch-summary"><strong>${escapeHtml(data.domain)}</strong> — ${data.found ? 'found in our databases' : 'not found in either database'}</div>`;
  html += dbCard('Master Domain List', 'Our curated / owned domains', data.master, masterOrder, errs.master);
  html += dbCard('Name Universe', 'The broad market universe', data.universe, uniOrder, errs.universe);
  els.dbResult.innerHTML = html;
  els.dbResult.hidden = false;
}
async function runDbScreen(domain) {
  showView('dbscreen');
  setActiveDomain(domain);
  setToolStatus(els.dbStatus, 'Screening…');
  if (els.dbResult) els.dbResult.hidden = true;
  try {
    const res = await fetch(`/research/api/dbscreen?domain=${encodeURIComponent(domain)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setToolStatus(els.dbStatus, data.error || `Screen failed (${res.status})`, true); return; }
    setToolStatus(els.dbStatus, '');
    renderDbResult(data);
  } catch (e) {
    setToolStatus(els.dbStatus, String((e && e.message) || e), true);
  }
}

// ── DB Search (filterable browse over name_universe) ────────────────────────
const DS_LIMIT = 50;
const dsState = {
  page: 0, sort: 'domain', dir: 'asc', activeTlds: new Set(), db: 'both',
  category: new Set(), connotation: new Set(), industry: new Set(), emotion: new Set(), pos: new Set(), forms: new Set(),
};

// Controlled option lists (mirror tools/enrich.py). Industries/emotions are
// free-form and loaded from /api/dbsearch-facets at runtime.
const DS_CATEGORIES = [
  'Technology & Software', 'Internet & Web', 'AI & Data', 'Finance & Fintech',
  'Crypto & Web3', 'E-Commerce & Retail', 'Business & Professional',
  'Marketing & Advertising', 'Media & Publishing', 'Entertainment & Gaming',
  'Social & Community', 'Education & Learning', 'Health & Wellness',
  'Medical & Biotech', 'Food & Drink', 'Travel & Hospitality',
  'Real Estate & Property', 'Home & Living', 'Fashion & Beauty',
  'Sports & Fitness', 'Automotive & Transport', 'Energy & Environment',
  'Legal & Government', 'Nonprofit & Causes', 'Family & Parenting',
  'Arts & Design', 'Science & Research', 'Pets & Animals',
  'Dating & Relationships', 'Lifestyle', 'General & Other',
];
const DS_CONNOTATIONS = ['positive', 'somewhat positive', 'neutral', 'somewhat negative', 'negative'];
// Part-of-speech tags (universe-only enrichment, from WordNet). All-selected = no
// constraint (matches the Naming Exercise filter).
const DS_POS = ['noun', 'verb', 'adjective', 'adverb'];
// Word-form exclusions: selecting a form EXCLUDES those names (default None).
// Friendly labels in the UI → stable keys sent as exclude_forms.
const DS_FORMS = ['Plurals', 'Past tense', '-ing', '-ly'];
const DS_FORM_KEY = { 'Plurals': 'plural', 'Past tense': 'past', '-ing': 'ing', '-ly': 'ly' };

// A collapsible checkbox dropdown backed by a Set in dsState[key]. Selections
// apply on the existing "Apply filters" button (no live re-query).
function dsMultiSelect(key, prefix, withFilter, emptyLabel = 'Any') {
  const $id = (s) => document.getElementById(s);
  const list = $id(`ds-${prefix}-list`), count = $id(`ds-${prefix}-count`),
        label = $id(`ds-${prefix}-label`), filter = withFilter ? $id(`ds-${prefix}-filter`) : null;
  const set = dsState[key];
  let allOpts = [];
  const summary = () => {
    const n = set.size;
    count.textContent = n ? String(n) : '';
    label.textContent = n === 0 ? emptyLabel : (n === 1 ? [...set][0] : `${n} selected`);
  };
  const render = (opts) => {
    list.innerHTML = opts.length
      ? opts.map((o) => `<label class="dbs-multi-opt"><input type="checkbox" value="${escapeHtml(o)}"${set.has(o) ? ' checked' : ''}/> ${escapeHtml(o)}</label>`).join('')
      : '<div class="dbs-multi-empty">No options yet.</div>';
  };
  list.addEventListener('change', (e) => {
    const cb = e.target.closest('input[type="checkbox"]'); if (!cb) return;
    if (cb.checked) set.add(cb.value); else set.delete(cb.value);
    summary();
  });
  if (filter) filter.addEventListener('input', () => {
    const t = filter.value.trim().toLowerCase();
    render(t ? allOpts.filter((o) => o.toLowerCase().includes(t)) : allOpts);
  });
  return {
    setOptions(opts) { allOpts = opts || []; render(allOpts); summary(); },
    clear() { set.clear(); if (filter) filter.value = ''; render(allOpts); summary(); },
  };
}

const dsMulti = {};
async function dsEnsureFilters() {
  if (dsMulti._init) return;
  dsMulti._init = true;
  dsMulti.category = dsMultiSelect('category', 'category', false);
  dsMulti.connotation = dsMultiSelect('connotation', 'connotation', false);
  dsMulti.industry = dsMultiSelect('industry', 'industry', true);
  dsMulti.emotion = dsMultiSelect('emotion', 'emotion', true);
  dsMulti.pos = dsMultiSelect('pos', 'pos', false);
  dsMulti.forms = dsMultiSelect('forms', 'forms', false, 'None');
  dsMulti.category.setOptions(DS_CATEGORIES);
  dsMulti.connotation.setOptions(DS_CONNOTATIONS);
  dsMulti.pos.setOptions(DS_POS);
  dsMulti.forms.setOptions(DS_FORMS);
  try {
    const res = await fetch('/research/api/dbsearch-facets');
    if (res.ok) {
      const d = await res.json();
      if (Array.isArray(d.industries)) dsMulti.industry.setOptions(d.industries);
      if (Array.isArray(d.emotions)) dsMulti.emotion.setOptions(d.emotions);
    }
  } catch { /* leave industries/emotions empty if facets unavailable */ }
}

function dsBuildParams() {
  const v = (el) => (el && el.value != null ? String(el.value).trim() : '');
  const p = new URLSearchParams();
  if (v(els.dsQ)) p.set('q', v(els.dsQ));
  if (v(els.dsPriceMin)) p.set('price_min', v(els.dsPriceMin));
  if (v(els.dsPriceMax)) p.set('price_max', v(els.dsPriceMax));
  if (dsState.activeTlds.size) p.set('tld', [...dsState.activeTlds].join(','));
  if (v(els.dsLenMin)) p.set('len_min', v(els.dsLenMin));
  if (v(els.dsLenMax)) p.set('len_max', v(els.dsLenMax));
  if (v(els.dsSingle)) p.set('single_word', v(els.dsSingle));
  if (v(els.dsDict)) p.set('dict_word', v(els.dsDict));
  if (v(els.dsWordsMin)) p.set('words_min', v(els.dsWordsMin));
  if (v(els.dsWordsMax)) p.set('words_max', v(els.dsWordsMax));
  if (v(els.dsSyllMin)) p.set('syll_min', v(els.dsSyllMin));
  if (v(els.dsSyllMax)) p.set('syll_max', v(els.dsSyllMax));
  if (els.dsNonum && els.dsNonum.checked) p.set('no_numbers', '1');
  if (els.dsFuzzy && els.dsFuzzy.checked) p.set('fuzzy', '1');
  if (v(els.dsSource)) p.set('source', v(els.dsSource));
  if (dsState.category.size) p.set('category', [...dsState.category].join(','));
  if (dsState.industry.size) p.set('industry', [...dsState.industry].join(','));
  if (dsState.emotion.size) p.set('emotion', [...dsState.emotion].join(','));
  if (dsState.connotation.size) p.set('connotation', [...dsState.connotation].join(','));
  // All POS selected = "Any" (no constraint), like the Naming Exercise.
  if (dsState.pos.size && dsState.pos.size < DS_POS.length) p.set('part_of_speech', [...dsState.pos].join(','));
  if (dsState.forms.size) p.set('exclude_forms', [...dsState.forms].map((f) => DS_FORM_KEY[f]).filter(Boolean).join(','));
  if (v(els.dsOwner)) p.set('owner', v(els.dsOwner));
  if (v(els.dsKeyword)) p.set('keyword', v(els.dsKeyword));
  p.set('db', dsState.db);
  p.set('sort', dsState.sort);
  p.set('dir', dsState.dir);
  p.set('page', String(dsState.page));
  p.set('limit', String(DS_LIMIT));
  return p;
}

function dsPrice(v) {
  if (v == null || v === '') return '<span class="muted">—</span>';
  const n = Number(v);
  return Number.isFinite(n) ? '$' + n.toLocaleString() : escapeHtml(String(v));
}

// Marketplace listing URL for a row's source, so the Source pill deep-links to
// where the domain is actually listed. Returns null for non-marketplace sources
// (owned / snagged / curated CSVs) — the caller falls back to the live site.
function dsListingUrl(source, domain) {
  const s = String(source || '').toLowerCase();
  const d = encodeURIComponent(domain);
  const sld = encodeURIComponent(String(domain || '').split('.')[0]);
  if (s.includes('afternic')) return `https://www.afternic.com/domain/${domain}`;
  if (s.includes('sedo')) return `https://sedo.com/search/?keyword=${d}`;
  if (s.includes('atom') || s.includes('squadhelp')) return `https://www.atom.com/name/${sld}`;
  if (s.includes('godaddy')) return `https://www.godaddy.com/domainsearch/find?domainToCheck=${d}`;
  if (s.includes('namecheap')) return `https://www.namecheap.com/market/?term=${d}`;
  if (s.includes('dynadot')) return `https://www.dynadot.com/domain/search?domain=${d}`;
  if (s.includes('spaceship')) return `https://www.spaceship.com/domain-search/?query=${d}&tab=domains`;
  if (s.includes('dan')) return `https://dan.com/buy-domain/${domain}`;
  if (s.includes('hugedomains')) return `https://www.hugedomains.com/domain_profile.cfm?d=${d}`;
  if (s.includes('sav')) return `https://www.sav.com/${domain}`;
  if (s.includes('brandbucket')) return `https://www.brandbucket.com/search?search=${d}`;
  if (s.includes('efty')) return `https://${domain}`;
  return null; // owned / snagged / curated — no marketplace listing
}

function dsRenderRows(rows) {
  if (!rows.length) {
    els.dsTbody.innerHTML = '<tr><td colspan="4" class="muted" style="padding:18px">No domains match these filters.</td></tr>';
    return;
  }
  els.dsTbody.innerHTML = rows.map((r) => {
    const domain = r.domain || '';
    const src = (r.best_price_source || (Array.isArray(r.sources) && r.sources[0]) || '');
    const liveUrl = domain ? `https://${encodeURI(domain)}` : '';
    // Both the domain name AND the Source pill → the marketplace listing for this
    // domain (or the live site when the source isn't a known marketplace).
    const listingUrl = domain ? (dsListingUrl(src, domain) || liveUrl) : '';
    const domCell = domain
      ? `<a class="dbs-domain dbs-domain-link" href="${escapeHtml(listingUrl)}" target="_blank" rel="noopener" title="Open the listing for ${escapeHtml(domain)}">${escapeHtml(domain)}</a>`
      : '<span class="muted">—</span>';
    const srcCell = src
      ? `<a class="dbs-src dbs-src-link" href="${escapeHtml(listingUrl)}" target="_blank" rel="noopener" title="Open ${escapeHtml(src)} listing">${escapeHtml(src)} ↗</a>`
      : '<span class="muted">—</span>';
    return `<tr>` +
      `<td>${domCell}</td>` +
      `<td class="dbs-num">${dsPrice(r.best_price)}</td>` +
      `<td>${srcCell}</td>` +
      `<td>${r.owner ? escapeHtml(r.owner) : '<span class="muted">—</span>'}</td>` +
      `</tr>`;
  }).join('');
}

async function fetchDbSearch() {
  dsEnsureFilters(); // build the multi-select dropdowns + load facets (once)
  setToolStatus(els.dsStatus, 'Searching…');
  els.dsPager.hidden = true;
  try {
    const res = await fetch(`/research/api/dbsearch?${dsBuildParams().toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setToolStatus(els.dsStatus, data.error || `Search failed (${res.status})`, true); els.dsTbody.innerHTML = ''; return; }
    setToolStatus(els.dsStatus, '');
    dsRenderRows(data.rows || []);
    const start = dsState.page * DS_LIMIT;
    const shown = (data.rows || []).length;
    if (els.dsCount) {
      const approx = data.approx ? '~' : '';
      els.dsCount.textContent = data.count != null
        ? `${approx}${data.count.toLocaleString()} result${data.count === 1 ? '' : 's'}`
        : (shown ? `${shown}+ results` : '');
    }
    els.dsPageinfo.textContent = shown ? `${start + 1}–${start + shown}${data.count != null ? ` of ${data.count.toLocaleString()}` : ''}` : '0 results';
    els.dsPrev.disabled = dsState.page === 0;
    els.dsNext.disabled = !data.has_more;
    els.dsPager.hidden = false;
  } catch (e) {
    setToolStatus(els.dsStatus, String((e && e.message) || e), true);
  }
}

// Download the FULL matching set (all filters/sort/db applied) as CSV.
async function dsExportCsv() {
  const p = dsBuildParams();
  p.set('format', 'csv'); p.delete('page'); p.delete('limit');
  const btn = els.dsExport;
  const orig = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Preparing…'; }
  try {
    const res = await fetch(`/research/api/dbsearch?${p.toString()}`);
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Export failed (${res.status})`); }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `domain-search-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    setToolStatus(els.dsStatus, String((e && e.message) || e), true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = orig; }
  }
}

function runDbSearch(initialQ) {
  showView('dbsearch');
  if (initialQ && els.dsQ) els.dsQ.value = initialQ;
  dsState.page = 0;
  fetchDbSearch();
}

const escapeHtml = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Any in-progress status (convention: message ends with/contains "…") gets a
// spinning indicator, so it's always clear from the GUI that work is happening.
function spinHtml(text, isError) {
  const t = escapeHtml(String(text || ''));
  return (!isError && /…/.test(String(text || ''))) ? `<span class="sr-spin"></span> ${t}` : t;
}
function setStatus(text, isError = false) {
  if (!text) {
    els.status.hidden = true;
    return;
  }
  els.status.hidden = false;
  els.status.innerHTML = spinHtml(text, isError);
  els.status.classList.toggle('error', isError);
}

// Escape first, then apply a tiny, safe subset of Markdown.
function renderMarkdown(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = esc(md || '').split('\n');
  let html = '';
  let inList = false;
  const inline = (s) =>
    s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Bare URLs → clickable (skip ones already inside a markdown link's href/text).
      .replace(/(?<![">])(https?:\/\/[^\s<)]*[^\s<).,;:!?])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      // Scheme-less URLs the agent writes as plain text (e.g.
      // mediaoptions.com/brokered-domains/roundtable-com/) → clickable. The
      // lookbehind skips hosts already inside an <a> (after / " > ) or an email
      // (after @) or mid-word/after a dot; the 2+-letter-TLD requirement leaves
      // prose abbreviations ("Inc.", "U.S.") and decimals ("3.14") alone. Trailing
      // sentence punctuation is excluded from the link.
      .replace(/(?<![/">@\w.])((?:[a-z0-9][a-z0-9-]*\.)+[a-z]{2,}(?:\/[^\s<)]*)?)/g, (m) => {
        const t = m.match(/[.,;:!?]+$/);
        const url = t ? m.slice(0, -t[0].length) : m;
        return `<a href="https://${url}" target="_blank" rel="noopener">${url}</a>${t ? t[0] : ''}`;
      });

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    if (h) {
      if (inList) { html += '</ul>'; inList = false; }
      const level = h[1].length + 1;
      html += `<h${level}>${inline(h[2])}</h${level}>`;
    } else if (li) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(li[1])}</li>`;
    } else if (line === '') {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${inline(line)}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function renderTrace(trace, toolsAvailable, categories) {
  const called = trace || [];
  const available = toolsAvailable || [];
  const cats = categories || {};
  if (!called.length && !available.length) {
    els.evidence.hidden = true;
    return;
  }
  els.evidence.hidden = false;

  const byTool = {};
  for (const t of called) (byTool[t.tool] = byTool[t.tool] || []).push(t);
  const names = [...new Set([...available, ...Object.keys(byTool)])];

  const renderTool = (name) => {
    const calls = byTool[name] || [];
    if (!calls.length) {
      return `<li><span class="dot skip"></span>${escapeHtml(name)} <span class="muted">— not run</span></li>`;
    }
    return calls
      .map((t) => {
        const dot = t.ok ? 'ok' : 'bad';
        const arg = t.args && t.args.domain ? ` ${escapeHtml(t.args.domain)}` : '';
        if (!t.ok) {
          return `<li><span class="dot ${dot}"></span>${escapeHtml(name)}${arg} <span class="err">— ${escapeHtml(t.error || 'failed')}</span></li>`;
        }
        const detail = t.data
          ? `<details class="src-detail"><summary>what came back</summary><pre>${escapeHtml(t.data)}</pre></details>`
          : '';
        return `<li><span class="dot ${dot}"></span>${escapeHtml(name)}${arg}${detail}</li>`;
      })
      .join('');
  };

  // Group sources by category so the recap reads as labeled sections.
  const groups = new Map();
  for (const name of names) {
    const c = cats[name] || 'Other';
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(name);
  }

  els.trace.innerHTML = [...groups.entries()]
    .map(
      ([category, toolNames]) =>
        `<li class="trace-group"><div class="trace-group-title">${escapeHtml(category)}</div><ul class="trace-tools">${toolNames
          .map(renderTool)
          .join('')}</ul></li>`,
    )
    .join('');
}

// Interim heuristic (until the structured report rebuild): a free report that
// shows a Low confidence band, or only privacy-shielded data with no contact.
function looksLowConfidence(markdown) {
  const md = String(markdown || '').toLowerCase();
  const lowBand = /confidence[^\n]{0,40}\blow\b/.test(md) || /\blow\b[^\n]{0,25}confidence/.test(md);
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(md);
  const privacyShielded = /(redacted for privacy|domains by proxy|privacy protect|whoisguard|withheld for privacy|privacy service)/.test(md);
  return lowBand || (privacyShielded && !hasEmail);
}

function extractConfidence(md) {
  const m = String(md || '').match(/identity confidence:\s*(high|medium|low)/i);
  return m ? m[1].toLowerCase() : null;
}
function stripConfidenceLine(md) {
  return String(md || '')
    .replace(/^[^\n]*identity confidence:\s*(?:high|medium|low)[^\n]*\n?/im, '')
    .replace(/^\s+/, '');
}
function renderConfidence(band) {
  if (!band) {
    els.reportConfidence.hidden = true;
    return;
  }
  els.reportConfidence.hidden = false;
  els.reportConfidence.className = `confidence ${band}`;
  els.reportConfidence.textContent = `Identity confidence: ${band.charAt(0).toUpperCase()}${band.slice(1)}`;
}
let currentReportDomain = '';
function setReportTitle(domain) {
  if (domain) {
    currentReportDomain = domain;
    els.reportDomain.hidden = false;
    els.reportDomain.textContent = `Domain Ownership Report — ${domain}`;
    loadDomainNotes(domain);
  } else {
    els.reportDomain.hidden = true;
    els.reportDomain.textContent = '';
    if (els.reportNotes) els.reportNotes.hidden = true;
  }
}

// ── Per-domain user notes (persist across re-runs; ingested by the agent) ─────
// Keyed by DOMAIN, so they stay attached to the report through free/deep/refresh
// re-runs and are never overwritten by a regenerated report.
let notesDirty = false;
function setNotesStatus(msg) { if (els.rnStatus) els.rnStatus.textContent = msg || ''; }
function markNotesSaved(savedAt, by) {
  notesDirty = false;
  if (els.rnSave) { els.rnSave.disabled = true; els.rnSave.textContent = 'Saved'; }
  if (savedAt) {
    const who = by ? ` by ${by}` : '';
    setNotesStatus(`Last saved ${agoLabel(Date.parse(savedAt))}${who}`);
  }
}
async function loadDomainNotes(domain) {
  if (!els.reportNotes || !els.rnText || !domain) return;
  els.reportNotes.hidden = false;
  els.reportNotes.dataset.domain = domain;
  els.rnText.value = '';
  setNotesStatus('');
  notesDirty = false;
  if (els.rnSave) { els.rnSave.disabled = true; els.rnSave.textContent = 'Saved'; }
  try {
    const r = await fetch(`/research/api/notes?domain=${encodeURIComponent(domain)}`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (els.reportNotes.dataset.domain !== domain) return; // a newer report superseded this
    if (r.ok && j && j.ok) {
      els.rnText.value = j.notes || '';
      if (j.updated_at) markNotesSaved(j.updated_at, j.updated_by);
    }
  } catch { /* notes are optional — never block the report */ }
}
async function saveDomainNotes() {
  const domain = (els.reportNotes && els.reportNotes.dataset.domain) || currentReportDomain;
  if (!domain || !els.rnText) return;
  if (els.rnSave) { els.rnSave.disabled = true; els.rnSave.textContent = 'Saving…'; }
  try {
    const r = await fetch('/research/api/notes', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain, notes: els.rnText.value }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error((j && j.error) || `Failed (${r.status})`);
    markNotesSaved(j.updated_at || new Date().toISOString(), j.updated_by);
  } catch (e) {
    if (els.rnSave) { els.rnSave.disabled = false; els.rnSave.textContent = 'Save notes'; }
    setNotesStatus(String((e && e.message) || e));
  }
}
els.rnText?.addEventListener('input', () => {
  notesDirty = true;
  if (els.rnSave) { els.rnSave.disabled = false; els.rnSave.textContent = 'Save notes'; }
  setNotesStatus('Unsaved changes');
});
els.rnSave?.addEventListener('click', () => { if (notesDirty) void saveDomainNotes(); });
// "<Type> · <datetime> · Refresh" — shown on any DONE report. Type tells the
// user whether they're looking at the free pre-flight or a paid deep run;
// the datetime lets them gauge staleness (especially on historical reports);
// Refresh forces a fresh run at the same depth (server skips the cache).
// `deepIncomplete` = the user's deep pass errored/stalled and never produced a
// deep report, so what's on screen is only the free pre-flight. Say so loudly
// rather than letting a partial report masquerade as a finished deep one.
function setReportMeta(createdAt, phase, opts) {
  if (!els.reportMeta) return;
  if (!createdAt) {
    els.reportMeta.hidden = true;
    els.reportMeta.innerHTML = '';
    return;
  }
  const deepIncomplete = !!(opts && opts.deepIncomplete);
  const regenerated = !!(opts && opts.regenerated);
  const isRegenPhase = /^regenerate/.test(String(phase || ''));
  const typeLabel = phase === 'deep' ? 'Deep research' : phase === 'shallow' ? 'Free report' : isRegenPhase ? 'Regenerated report' : 'Report';
  const when = new Date(createdAt).toLocaleString();
  // Offer to re-run the deep pass when it's the one that didn't finish; otherwise
  // refresh matches whatever phase we have.
  const refreshDeep = (phase === 'deep' || deepIncomplete) ? 'true' : 'false';
  els.reportMeta.hidden = false;
  const warn = deepIncomplete
    ? `<span class="rm-incomplete">⚠ Deep research did not complete — showing the free pre-flight report only</span> · `
    : '';
  // Loud, unmistakable confirmation right after a regenerate completes.
  const regen = regenerated ? `<span class="rm-regen">✓ Just regenerated from chat</span> · ` : '';
  els.reportMeta.innerHTML =
    warn + regen +
    `<span class="rm-type">${escapeHtml(typeLabel)}</span> · ` +
    `<span class="rm-when">${escapeHtml(when)}</span> · ` +
    `<a href="#" class="report-refresh" data-deep="${refreshDeep}">${deepIncomplete ? 'Re-run deep' : 'Refresh'}</a>`;
}
function clearReportMeta() {
  setReportMeta(null);
}
// Reset + reveal the "was this right?" feedback control when a report renders.
function resetFeedback() {
  if (!els.reportFeedback) return;
  els.reportFeedback.hidden = false;
  const q = els.reportFeedback.querySelector('.rf-q');
  const row = els.reportFeedback.querySelector('.rf-row');
  if (q) q.hidden = false;
  if (row) row.hidden = false;
  if (els.rfCorrection) els.rfCorrection.hidden = true;
  if (els.rfThanks) els.rfThanks.hidden = true;
  ['rfOwner', 'rfContact', 'rfNotes'].forEach((k) => { if (els[k]) els[k].value = ''; });
}
async function submitFeedback(fields) {
  try {
    await fetch('/research/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain: currentReportDomain, run_id: currentRunId, ...fields }),
    });
  } catch { /* best-effort */ }
  if (els.rfCorrection) els.rfCorrection.hidden = true;
  const row = els.reportFeedback && els.reportFeedback.querySelector('.rf-row');
  if (row) row.hidden = true;
  const q = els.reportFeedback && els.reportFeedback.querySelector('.rf-q');
  if (q) q.hidden = true;
  if (els.rfThanks) els.rfThanks.hidden = false;
}

// ── Refine chat ─────────────────────────────────────────────────────────────
let chatBusy = false;
let chatLoadedFor = null;
function chatBubble(m) {
  const cls = m.role === 'assistant' ? 'bot' : 'me';
  const pending = m.role === 'assistant' && m.status === 'pending';
  const err = m.status === 'error';
  // Strip the [REGENERATE:mode] marker from stored assistant turns so
  // reloaded chats show the clean confirmation, not the protocol token.
  const raw = String(m.content || '');
  const cleanContent = m.role === 'assistant' ? detectRegenMarker(raw).cleaned || raw : raw;
  const body = pending ? 'Looking into it…' : renderMarkdown(cleanContent);
  const idAttr = m.id ? ` data-msg-id="${escapeHtml(m.id)}"` : '';
  // Save-as-lesson affordance on completed assistant turns only — pending
  // turns have no content yet, user turns aren't the corrective signal.
  const saveLink = (m.role === 'assistant' && !pending && !err && m.id)
    ? `<button type="button" class="chat-save-lesson" data-msg-id="${escapeHtml(m.id)}">Save as lesson</button>`
    : '';
  // Tag user messages with who sent them — a report (and its chat) can be shared,
  // so "was this me or a teammate?" should be answerable at a glance.
  const authorLabel = (m.role === 'user' && m.author)
    ? `<span class="chat-author">${escapeHtml(chatAuthorName(m.author))}</span>`
    : '';
  return `<div class="chat-msg ${cls}${pending ? ' pending' : ''}${err ? ' chat-err' : ''}"${idAttr}>${authorLabel}${body}${saveLink}</div>`;
}
// Short display name from a stored author (email → capitalized local part).
function chatAuthorName(a) {
  const s = String(a || '').trim();
  if (!s) return '';
  const local = s.includes('@') ? s.split('@')[0] : s;
  return local.charAt(0).toUpperCase() + local.slice(1);
}
function renderChatMessages(messages) {
  if (!els.chatThread) return;
  els.chatThread.innerHTML = (messages || []).map(chatBubble).join('');
  els.chatThread.scrollTop = els.chatThread.scrollHeight;
}
async function loadChat(runId) {
  if (!els.reportChat) return;
  renderChatMessages([]);
  if (!runId) return;
  try {
    const res = await fetch(`/research/api/chat?run_id=${encodeURIComponent(runId)}`);
    const data = await res.json();
    renderChatMessages(data.messages || []);
  } catch { /* empty thread */ }
  loadChatEmail(runId);
}

// ── Attach email threads to the chat (ingested as context by the agent) ──────
let ceWired = false;
function ceSetStatus(text, err = false) {
  if (!els.ceStatus) return;
  els.ceStatus.hidden = !text;
  els.ceStatus.textContent = text || '';
  els.ceStatus.classList.toggle('error', !!err);
}
function ceFmtDate(ms) {
  if (!ms) return '';
  const t = Number(ms);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
}
function renderCeAttached(threads) {
  if (!els.ceAttached) return;
  const items = threads || [];
  els.ceAttached.innerHTML = items.length
    ? items.map((t) => `<span class="ce-chip" title="${escapeHtml(t.subject || '')}">📧 ${escapeHtml((t.subject || '(no subject)').slice(0, 40))}`
        + `<button type="button" class="ce-chip-x" data-detach="${escapeHtml(t.id)}" aria-label="Detach">×</button></span>`).join('')
    : '<span class="muted ce-none">No emails attached</span>';
}
function renderCeResults(threads) {
  if (!els.ceResults) return;
  const items = threads || [];
  if (!items.length) { els.ceResults.innerHTML = '<div class="muted ce-none">No matching threads.</div>'; return; }
  els.ceResults.innerHTML = items.map((t) => {
    const meta = [t.fromName || t.from, ceFmtDate(t.date)].filter(Boolean).map(escapeHtml).join(' · ');
    const btn = t.attached
      ? '<span class="ce-added">✓ attached</span>'
      : `<button type="button" class="ce-add" data-mb="${escapeHtml(t.mailbox)}" data-tid="${escapeHtml(t.threadId)}" data-subj="${escapeHtml(t.subject || '')}" data-snip="${escapeHtml(t.snippet || '')}">Attach</button>`;
    return `<div class="ce-row"><div class="ce-row-main"><div class="ce-subj">${escapeHtml(t.subject || '(no subject)')}</div>`
      + `<div class="ce-meta muted">${meta}</div>`
      + (t.snippet ? `<div class="ce-snip muted">${escapeHtml(t.snippet.slice(0, 140))}</div>` : '')
      + `</div>${btn}</div>`;
  }).join('');
}
async function loadChatEmail(runId) {
  if (!els.chatEmail) return;
  els.chatEmail.hidden = false;
  if (els.cePanel) els.cePanel.hidden = true;
  if (els.ceResults) els.ceResults.innerHTML = '';
  ceSetStatus('');
  try {
    const res = await fetch(`/research/api/chat-email?run_id=${encodeURIComponent(runId)}&list=1`);
    if (res.status === 503) { els.chatEmail.hidden = true; return; } // not configured
    const data = await res.json().catch(() => ({}));
    renderCeAttached(data.threads || []);
  } catch { renderCeAttached([]); }
  if (!ceWired) wireChatEmail();
}
async function ceSuggest(manualQuery) {
  if (!currentRunId) return;
  ceSetStatus('Searching inboxes…');
  if (els.ceResults) els.ceResults.innerHTML = '';
  try {
    const qs = manualQuery ? `&q=${encodeURIComponent(manualQuery)}` : '&suggest=1';
    const res = await fetch(`/research/api/chat-email?run_id=${encodeURIComponent(currentRunId)}${qs}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Search failed (${res.status})`);
    ceSetStatus('');
    renderCeResults(data.threads || []);
  } catch (e) { ceSetStatus(String((e && e.message) || e), true); }
}
async function cePost(payload) {
  const res = await fetch('/research/api/chat-email', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ run_id: currentRunId, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
  return data;
}
function wireChatEmail() {
  ceWired = true;
  els.ceToggle?.addEventListener('click', () => {
    if (!els.cePanel) return;
    const open = els.cePanel.hidden;
    els.cePanel.hidden = !open;
    if (open && !els.ceResults.children.length) ceSuggest(); // auto-suggest by domain on first open
  });
  els.ceSearchBtn?.addEventListener('click', () => ceSuggest((els.ceQ.value || '').trim() || null));
  els.ceQ?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ceSuggest((els.ceQ.value || '').trim() || null); } });
  els.ceRefresh?.addEventListener('click', async () => {
    ceSetStatus('Re-pulling attached threads…');
    try { const d = await cePost({ action: 'refresh' }); renderCeAttached(d.threads || []); ceSetStatus(`Refreshed ${d.updated || 0} thread(s).`); }
    catch (e) { ceSetStatus(String((e && e.message) || e), true); }
  });
  els.ceResults?.addEventListener('click', async (e) => {
    const b = e.target.closest('.ce-add'); if (!b) return;
    b.disabled = true; b.textContent = 'Attaching…';
    try {
      const d = await cePost({ action: 'attach', mailbox: b.dataset.mb, thread_id: b.dataset.tid, subject: b.dataset.subj, snippet: b.dataset.snip });
      renderCeAttached(d.threads || []);
      b.outerHTML = '<span class="ce-added">✓ attached</span>';
    } catch (err) { b.disabled = false; b.textContent = 'Attach'; ceSetStatus(String((err && err.message) || err), true); }
  });
  els.ceAttached?.addEventListener('click', async (e) => {
    const x = e.target.closest('.ce-chip-x'); if (!x) return;
    try { const d = await cePost({ action: 'detach', id: x.getAttribute('data-detach') }); renderCeAttached(d.threads || []); }
    catch (err) { ceSetStatus(String((err && err.message) || err), true); }
  });
}
async function sendChat(message) {
  if (chatBusy || !message || !currentRunId) return;
  chatBusy = true;
  if (els.chatSend) els.chatSend.disabled = true;
  const thread = els.chatThread;
  const myName = chatAuthorName((currentUser && (currentUser.name || currentUser.email)) || '');
  const meLabel = myName ? `<span class="chat-author">${escapeHtml(myName)}</span>` : '';
  thread.insertAdjacentHTML('beforeend', `<div class="chat-msg me">${meLabel}${renderMarkdown(message)}</div>`);
  thread.insertAdjacentHTML('beforeend', `<div class="chat-msg bot pending">Researching… this can take up to a couple of minutes.</div>`);
  thread.scrollTop = thread.scrollHeight;
  const pending = thread.querySelector('.chat-msg.pending:last-child') || thread.querySelector('.chat-msg.pending');
  const finish = (html, isErr, msgId) => {
    if (pending) {
      pending.classList.remove('pending');
      if (isErr) pending.classList.add('chat-err');
      pending.innerHTML = renderMarkdown(html);
      if (!isErr && msgId) {
        pending.dataset.msgId = msgId;
        pending.insertAdjacentHTML('beforeend',
          `<button type="button" class="chat-save-lesson" data-msg-id="${escapeHtml(msgId)}">Save as lesson</button>`);
      }
    }
    chatBusy = false;
    if (els.chatSend) els.chatSend.disabled = false;
    thread.scrollTop = thread.scrollHeight;
  };

  let turnId;
  try {
    const res = await fetch('/research/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ run_id: currentRunId, domain: currentReportDomain, message }),
    });
    const raw = await res.text();
    let d = {};
    try { d = JSON.parse(raw); } catch { /* non-JSON */ }
    if (!res.ok || !d.turn_id) { finish(`⚠️ ${d.error || `Couldn't start the chat (${res.status}).`}`, true); return; }
    turnId = d.turn_id;
  } catch (e) {
    finish(`⚠️ ${e.message || e}`, true);
    return;
  }

  // Poll the async turn until it's done/error (it runs on Inngest, up to ~5 min).
  const started = Date.now();
  const poll = async () => {
    if (Date.now() - started > 5 * 60 * 1000) { finish('⚠️ Timed out — try a narrower question.', true); return; }
    try {
      const r = await fetch(`/research/api/chat?turn_id=${encodeURIComponent(turnId)}`);
      const d = await r.json();
      if (d.status === 'done') {
        // The agent emits [REGENERATE:synth] or [REGENERATE:deep] as the
        // first token when the user asked to re-run the report. Strip it
        // from the rendered reply and kick off the matching regen.
        const { cleaned, mode } = detectRegenMarker(d.content || '');
        finish(cleaned || d.content || '(no response)', false, turnId);
        if (mode) regenerateFromChat(mode);
        return;
      }
      if (d.status === 'error') { finish(d.content || '⚠️ Chat turn failed.', true); return; }
      if (pending) pending.textContent = `Researching… (${Math.round((Date.now() - started) / 1000)}s)`;
    } catch { /* keep polling */ }
    setTimeout(poll, 2500);
  };
  setTimeout(poll, 2500);
}

// The synthesis emits a fenced ```json block (verdict/contacts/timeline) first.
function parseReportData(md) {
  const m = String(md || '').match(/```json\s*([\s\S]*?)```/i);
  if (!m) return null;
  try { return JSON.parse(m[1].trim()); } catch { return null; }
}
function stripJsonBlock(md) {
  return String(md || '').replace(/```json\s*[\s\S]*?```/i, '').replace(/^\s+/, '');
}

// Clue-first summary card: bottom line + likely owner + contacts + recommended
// contact path + ownership timeline.
// A clue is "useful" (highlighted green) when it actually helps identify/reach
// the owner — a real name, working email/phone, broker or profile — but NOT
// privacy/proxy/redacted or generic registrar values.
const CLUE_NOISE_RE = /redact|privacy|priv(?:ate)?|proxy|whois\s?guard|data\s?protected|withheld|not\s?disclosed|undisclosed|gdpr|domains?\s?by\s?proxy|contact\s?privacy|perfect\s?privacy|identity\s?protect|statutory\s?masking|anonymi|abuse@|hostmaster@|postmaster@/i;
// Marketplace / for-sale listing URLs are sale channels, not owner-identifying
// contact info — never highlight them (and they're often false positives).
const SALE_LINK_RE = /afternic|dan\.com|\bsedo\b|atom\.com|godaddy|\befty\b|dynadot|flippa|hugedomains|buydomains|undeveloped|sav\.com|\/buy-domain\/|for[-\s]?sale|make[-\s]?offer|buy[-\s]?now/i;
// Note phrases that mark the VALUE as a privacy/proxy artifact (so a clean-
// looking value like a proxy's phone number is still excluded). Deliberately
// narrow so it does NOT trip on legitimate context like "pre-privacy registrant"
// or "not the current owner" — a historical owner is still a useful clue.
const NOTE_NOISE_RE = /\bproxy\b|whois\s?guard|\brelay\b|privacy (?:service|provider|protect|inc\.?|shield)|data\s?protected|\bmasking\b|redact/i;
// Highlight genuinely useful owner-identifying clues (a real name, working
// email/phone, the owner's own profile) — including a HISTORICAL/pre-privacy
// owner. Never highlight privacy/proxy/role values or marketplace links.
function isUsefulClue(c) {
  const v = String((c && c.value) || '');
  const type = String((c && c.type) || '').toLowerCase();
  if (!v) return false;
  if (CLUE_NOISE_RE.test(v) || NOTE_NOISE_RE.test(String(c.note || ''))) return false;
  if (SALE_LINK_RE.test(v)) return false;
  return ['name', 'email', 'phone', 'org', 'social'].includes(type);
}
function renderSummary(d) {
  const e = escapeHtml;
  // Canonicalize any LinkedIn reference (full URL, bare linkedin.com/…, or a bare
  // "in/jane-doe" handle) to the full profile URL with a trailing slash, e.g.
  // https://www.linkedin.com/in/jane-doe/ — or null if it isn't a LinkedIn ref.
  const liCanon = (value) => {
    const m = String(value == null ? '' : value).match(/(?:linkedin\.com\/)?((?:in|pub|company|school)\/[A-Za-z0-9_%-]+)/i);
    return m ? `https://www.linkedin.com/${m[1].replace(/\/+$/, '')}/` : null;
  };
  const linkify = (c) => {
    const v = String(c.value == null ? '' : c.value);
    if (c.type === 'email') return `<a href="mailto:${e(v)}">${e(v)}</a>`;
    if (c.type === 'social') {
      // Show LinkedIn as the full canonical profile URL (both link + visible text).
      const li = liCanon(v);
      if (li) return `<a href="${li}" target="_blank" rel="noopener">${li}</a>`;
      if (/^https?:\/\//.test(v)) return `<a href="${e(v)}" target="_blank" rel="noopener">${e(v)}</a>`;
      if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(v)) return `<a href="https://${e(v.replace(/^www\./i, ''))}" target="_blank" rel="noopener">${e(v)}</a>`;
    }
    if (/^https?:\/\//.test(v)) return `<a href="${e(v)}" target="_blank" rel="noopener">${e(v)}</a>`;
    return e(v);
  };
  // Pull LinkedIn refs out of a free-text note → canonical full URLs + the note
  // with those refs (and a leading "LinkedIn" label) removed, so the profile can
  // be promoted to its own row alongside Email / Phone instead of buried in prose.
  const extractLinkedIn = (note) => {
    let rest = String(note == null ? '' : note);
    const urls = [];
    const add = (raw) => { const u = liCanon(raw); if (u && !urls.includes(u)) urls.push(u); };
    rest = rest.replace(/[;,]?\s*\bLinkedIn\b[\s:]*(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/)?((?:in|pub|company|school)\/[A-Za-z0-9_%-]+)\/?/gi,
      (m, p) => { add(p); return ''; });
    rest = rest.replace(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/((?:in|pub|company|school)\/[A-Za-z0-9_%-]+)\/?/gi,
      (m, p) => { add(p); return ''; });
    rest = rest.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1')
      .replace(/([.,;:])[.,;:\s]*\1/g, '$1').replace(/\.{2,}/g, '.')
      .replace(/^[\s,;:.\-]+|[\s,;:\-]+$/g, '').trim();
    return { urls, rest };
  };
  // Escape text, then auto-link any URLs / LinkedIn profiles that appear INSIDE a
  // free-text note (e.g. "… LinkedIn in/sean-moriarty-186688" → a real link).
  // Placeholders shield already-linked URLs from the bare-handle pass.
  const linkifyNote = (text) => {
    let s = e(String(text == null ? '' : text));
    const slots = [];
    const stash = (html) => ` ${slots.push(html) - 1} `;
    s = s.replace(/\bhttps?:\/\/[^\s<>"']+/g, (m) => {
      const trail = (m.match(/[.,;:)]+$/) || [''])[0];
      const url = m.slice(0, m.length - trail.length);
      return stash(`<a href="${url}" target="_blank" rel="noopener">${url}</a>`) + trail;
    });
    s = s.replace(/\b(?:www\.)?linkedin\.com\/[A-Za-z0-9/_%.-]+/gi, (m) =>
      stash(`<a href="https://${m.replace(/^www\./i, '')}" target="_blank" rel="noopener">${m}</a>`));
    s = s.replace(/(^|[\s(,;])((?:in|pub|company|school)\/[A-Za-z0-9_-]{2,})/g, (full, pre, h) =>
      `${pre}${stash(`<a href="https://www.linkedin.com/${h}" target="_blank" rel="noopener">${h}</a>`)}`);
    return s.replace(/ (\d+) /g, (_, i) => slots[Number(i)]);
  };
  let html = '';
  if (d.summary) html += `<p class="verdict">${e(d.summary)}</p>`;
  if (d.likely_owner || d.owner_type) {
    const t = d.owner_type ? ` <span class="owner-type">${e(String(d.owner_type).replace(/_/g, ' '))}</span>` : '';
    const ownerClue = d.likely_owner && !CLUE_NOISE_RE.test(String(d.likely_owner));
    html += `<div class="owner">${d.likely_owner ? `<span class="owner-name${ownerClue ? ' clue' : ''}">${e(d.likely_owner)}</span>` : '<span class="muted">Owner not established</span>'}${t}</div>`;
  }
  // Marketplace / for-sale listing URLs aren't owner-identifying contacts — drop
  // them from Key contacts even on older saved reports (they belong in the
  // narrative / contact path).
  const contacts = (Array.isArray(d.contacts) ? d.contacts : []).filter((c) => !SALE_LINK_RE.test(String((c && c.value) || '')));
  if (contacts.length) {
    // For MOBILE phone numbers, offer one-tap WhatsApp / Telegram links (skip
    // office/switchboard/fax lines). "Mobile" is read from the contact's note.
    const msgLinks = (c) => {
      if (String(c.type || '').toLowerCase() !== 'phone') return '';
      const note = String(c.note || '');
      const isMobile = /\b(mobile|cell|cellular|personal|whatsapp|text|sms)\b/i.test(note) &&
        !/\b(fax|switchboard|office|landline|main line|reception|toll|hq|head ?office)\b/i.test(note);
      const digits = String(c.value || '').replace(/\D/g, '');
      if (!isMobile || digits.length < 10 || digits.length > 15) return '';
      return ` <span class="msg-links"><a href="https://wa.me/${digits}" target="_blank" rel="noopener">WhatsApp</a><a href="https://t.me/${digits}" target="_blank" rel="noopener">Telegram</a></span>`;
    };
    const contactLi = (c) => {
      // Label a LinkedIn social row "LinkedIn" rather than the generic "social".
      const label = (String(c.type || '').toLowerCase() === 'social' && liCanon(c.value)) ? 'LinkedIn' : (c.type || '');
      const val = isUsefulClue(c) ? `<span class="clue">${linkify(c)}</span>` : linkify(c);
      return `<li><span class="ctype">${e(label)}</span> ${val}${c.note ? ` <span class="muted">— ${linkifyNote(c.note)}</span>` : ''}${msgLinks(c)}</li>`;
    };
    const list = (arr) => `<ul class="contacts">${arr.map(contactLi).join('')}</ul>`;
    const isPrimary = (c) => String((c && c.tier) || '').toLowerCase() === 'primary';
    // On-demand "Get phone number" affordance: phones are the expensive part of
    // the FullEnrich waterfall, so they're not pulled automatically — this lets a
    // user spend a credit for ONE named person when they actually need it.
    const hasPhone = (rows) => rows.some((c) => String(c.type || '').toLowerCase() === 'phone' && c.value);
    const liUrlOf = (rows, seed) => rows.map((c) => liCanon(c.value)).find(Boolean) || (seed && seed[0]) || '';
    const enhanceBtn = (name, liUrl) =>
      `<div class="lc-enhance"><button type="button" class="enhance-phone" data-name="${e(String(name || ''))}" data-linkedin="${e(String(liUrl || ''))}">☎ Get phone number</button><span class="lc-enhance-note">premium · spends a credit</span></div>`;
    // Promote LinkedIn profiles out of row notes into their own social rows (full
    // URL, de-duped against any social row already present), and strip them from
    // those notes. seedUrls carries profiles pulled from a card/header note.
    const promoteLinkedIn = (rows, seedUrls) => {
      const have = new Set(rows.map((c) => liCanon(c.value)).filter(Boolean));
      const found = [];
      const out = rows.map((c) => {
        if (!c.note) return c;
        const { urls, rest } = extractLinkedIn(c.note);
        urls.forEach((u) => found.push(u));
        return rest === c.note ? c : { ...c, note: rest };
      });
      (seedUrls || []).concat(found).forEach((u) => {
        if (u && !have.has(u)) { have.add(u); out.push({ type: 'social', value: u }); }
      });
      return out;
    };
    // Consolidated contact card for the primary target: name as a heading, role
    // + org beneath, then the email/phone/profile rows — one easy-to-consume block.
    const card = (arr) => {
      const order = { name: 0, org: 1, email: 2, phone: 3, social: 4 };
      const sorted = arr.slice().sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
      const nameC = sorted.find((c) => c.type === 'name');
      const orgC = sorted.find((c) => c.type === 'org');
      const rest0 = sorted.filter((c) => c !== nameC && c !== orgC);
      // Pull LinkedIn out of the name/org notes so it shows as its own row.
      const seed = [];
      let nameNote = nameC && nameC.note;
      if (nameC && nameC.note) { const r = extractLinkedIn(nameC.note); seed.push(...r.urls); nameNote = r.rest; }
      let orgNote = orgC && orgC.note;
      if (orgC && orgC.note) { const r = extractLinkedIn(orgC.note); seed.push(...r.urls); orgNote = r.rest; }
      const rest = promoteLinkedIn(rest0, seed);
      const emails = arr.filter((c) => c.type === 'email' && c.value).map((c) => String(c.value).trim());
      let h = '<div class="contact-card">';
      if (nameC) {
        h += `<div class="cc-name">${isUsefulClue(nameC) ? `<span class="clue">${e(nameC.value)}</span>` : e(nameC.value)}</div>`;
        if (nameNote) h += `<div class="cc-role">${linkifyNote(nameNote)}</div>`;
      }
      if (orgC) h += `<div class="cc-org">${linkify(orgC)}${orgNote ? ` <span class="muted">— ${linkifyNote(orgNote)}</span>` : ''}</div>`;
      if (emails.length) h += `<div class="cc-actions"><button type="button" class="copy-emails" data-emails="${e(emails.join(', '))}">Copy ${emails.length === 1 ? 'email' : `all ${emails.length} emails`}</button></div>`;
      if (rest.length) h += list(rest);
      if (nameC && canEnhance && !hasPhone(rest)) h += enhanceBtn(nameC.value, liUrlOf(rest, seed));
      return h + '</div>';
    };
    // Group a contact array into per-entity blocks: a new block starts at each
    // name/org entry and the email/phone/social rows that follow attach to it —
    // mirroring how the agent lists a person, then their reachable channels.
    const groupLeads = (arr) => {
      const groups = [];
      let cur = null;
      for (const c of arr) {
        const t = String(c.type || '').toLowerCase();
        if (t === 'name' || t === 'org' || !cur) {
          cur = { header: (t === 'name' || t === 'org') ? c : null, rows: [] };
          groups.push(cur);
          if (cur.header) continue;
        }
        cur.rows.push(c);
      }
      return groups;
    };
    // One self-contained box per person/entity so distinct contacts are easy to
    // tell apart: a header (name or org, with its role/source note) + the rows.
    const leadCard = (g) => {
      let head = '';
      let seed = [];
      if (g.header) {
        const h = g.header;
        const { urls, rest } = extractLinkedIn(h.note);
        seed = urls;
        const title = isUsefulClue(h) ? `<span class="clue">${linkify(h)}</span>` : linkify(h);
        head = `<div class="lc-head"><span class="lc-kind">${e(String(h.type || ''))}</span>`
          + `<span class="lc-title">${title}</span></div>`
          + (rest ? `<div class="lc-note">${linkifyNote(rest)}</div>` : '');
      }
      const rows = promoteLinkedIn(g.rows, seed);
      const isPerson = g.header && String(g.header.type || '').toLowerCase() === 'name';
      const enh = (canEnhance && isPerson && !hasPhone(rows)) ? enhanceBtn(g.header.value, liUrlOf(rows, seed)) : '';
      return `<div class="lead-card">${head}${rows.length ? list(rows) : ''}${enh}</div>`;
    };
    const leadCards = (arr) => `<div class="lead-cards">${groupLeads(arr).map(leadCard).join('')}</div>`;
    // Render the primary tier as ONE CARD PER PERSON. The agent sometimes lumps two
    // people (e.g. the owner + their general counsel) into the primary tier as a flat
    // list; card() would then nest the second person's name as a plain row under the
    // first. Instead, give each `name` its own card and attribute each channel
    // (email / LinkedIn / phone) to the person it belongs to — matched by name tokens
    // against the value/URL/note, falling back to the primary (first) person. A single
    // org shows once, on the first person's card.
    const renderPrimary = (arr) => {
      const people = arr.filter((c) => String(c.type || '').toLowerCase() === 'name');
      if (people.length <= 1) return card(arr); // single person → existing consolidated card
      const org = arr.find((c) => String(c.type || '').toLowerCase() === 'org');
      const channels = arr.filter((c) => !['name', 'org'].includes(String(c.type || '').toLowerCase()));
      const tokensOf = (n) => (String(n || '').toLowerCase().match(/[a-z]+/g) || []).filter((t) => t.length >= 3);
      const ownerOf = (c) => {
        const hay = `${liCanon(c.value) || ''} ${String(c.value || '').toLowerCase()} ${String(c.note || '').toLowerCase()}`;
        let best = 0, bestScore = 0;
        people.forEach((p, i) => {
          const score = tokensOf(p.value).reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
          if (score > bestScore) { bestScore = score; best = i; }
        });
        return best; // fallback → first (primary) person when nothing matches
      };
      const buckets = people.map(() => []);
      channels.forEach((c) => { buckets[ownerOf(c)].push(c); });
      return people.map((p, i) => card([p, ...(i === 0 && org ? [org] : []), ...buckets[i]])).join('');
    };
    // Group into the primary target vs. other (secondary/tertiary/untagged)
    // leads when the report tags tiers; otherwise show grouped per-entity cards.
    if (contacts.some(isPrimary)) {
      const primary = contacts.filter(isPrimary);
      const other = contacts.filter((c) => !isPrimary(c));
      html += `<div class="sum-block"><h3>Primary target — how to reach the likely owner</h3>${renderPrimary(primary)}</div>`;
      if (other.length) html += `<div class="sum-block"><h3>Other &amp; historical leads</h3>${leadCards(other)}</div>`;
    } else {
      html += `<div class="sum-block"><h3>Key contacts</h3>${leadCards(contacts)}</div>`;
    }
  }
  const path = Array.isArray(d.contact_path) ? d.contact_path : [];
  if (path.length) {
    html += `<div class="sum-block"><h3>Recommended contact path</h3><ol class="cpath">${path.map((p) => `<li>${linkifyNote(p)}</li>`).join('')}</ol></div>`;
  }
  const tl = Array.isArray(d.timeline) ? d.timeline : [];
  if (tl.length) {
    html += `<div class="sum-block"><h3>Ownership timeline</h3><ul class="timeline">${tl
      .map((t) => `<li><span class="tl-date">${e(t.date || '')}</span><span class="tl-event">${e(t.event || '')}${t.detail ? ` — ${e(t.detail)}` : ''}</span></li>`)
      .join('')}</ul></div>`;
  }
  return html ? `<div class="summary-card">${html}</div>` : '';
}

// Merge on-demand enrichments (report.enhancements — phones/emails pulled later
// for a named person) into the parsed contacts so they render inside that
// person's card. Inserted right after the person's block, de-duped against rows
// already present. Mutates data.contacts in place.
function mergeEnhancements(data, enhancements) {
  if (!data || !Array.isArray(data.contacts) || !Array.isArray(enhancements)) return;
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const typeOf = (c) => String((c && c.type) || '').toLowerCase();
  for (const enh of enhancements) {
    if (!enh) continue;
    const nm = String(enh.name || '').trim().toLowerCase();
    const idx = nm ? data.contacts.findIndex((c) => typeOf(c) === 'name' && String(c.value || '').trim().toLowerCase() === nm) : -1;
    const tier = idx >= 0 ? data.contacts[idx].tier : 'primary';
    const rows = [];
    for (const p of (enh.phones || [])) {
      const pv = typeof p === 'string' ? p : (p && p.number);
      if (pv && !data.contacts.some((c) => typeOf(c) === 'phone' && digits(c.value) === digits(pv))) {
        rows.push({ type: 'phone', value: pv, note: 'mobile — FullEnrich (on-demand)', tier });
      }
    }
    for (const em of (enh.emails || [])) {
      const ev = typeof em === 'string' ? em : (em && em.email);
      if (ev && !data.contacts.some((c) => typeOf(c) === 'email' && String(c.value || '').toLowerCase() === ev.toLowerCase())) {
        rows.push({ type: 'email', value: ev, note: 'FullEnrich (on-demand)', tier });
      }
    }
    if (!rows.length) continue;
    if (idx >= 0) {
      let j = idx + 1;
      while (j < data.contacts.length && !['name', 'org'].includes(typeOf(data.contacts[j]))) j++;
      data.contacts.splice(j, 0, ...rows);
    } else {
      data.contacts.push({ type: 'name', value: enh.name, tier }, ...rows);
    }
  }
}

function renderReport(report) {
  const md = report && report.markdown ? report.markdown : '';
  const data = parseReportData(md);
  if (data && report && Array.isArray(report.enhancements)) mergeEnhancements(data, report.enhancements);
  const band = data && data.confidence ? String(data.confidence).toLowerCase() : extractConfidence(md);
  renderConfidence(band);
  els.reportActions.hidden = false;
  if (els.outreachBtn) els.outreachBtn.hidden = !(canOutreach && currentRunId);

  // Structured summary up top (when present), then the supporting narrative.
  const summaryHtml = data ? renderSummary(data) : '';
  const narrative = data ? stripJsonBlock(md) : stripConfidenceLine(md);
  els.report.hidden = false;
  els.report.innerHTML = summaryHtml + renderMarkdown(narrative);
  renderAddons(data);
  renderTrace(report && report.trace, report && report.toolsAvailable, report && report.categories);
  resetFeedback();
  if (els.reportChat && currentRunId) {
    els.reportChat.hidden = false;
    if (chatLoadedFor !== currentRunId) { chatLoadedFor = currentRunId; loadChat(currentRunId); }
  }

  // Offer the paid pass only after a free (shallow) one. Surface it at the very
  // top when the free report has no clear owner; otherwise keep it below.
  // Suppress both entirely when the signed-in user lacks the deep-reports
  // permission — they'd just hit a 403 if they clicked.
  const shallow = report && report.phase === 'shallow';
  const low = shallow && (band === 'low' || (!band && looksLowConfidence(md)));
  const canDeep = canPhase(currentUser, 'deep');
  els.deepenTop.hidden = !(low && canDeep);
  els.deepenBar.hidden = !(shallow && !low && canDeep);

  // Company vitals — how alive is this company (aliveness free; firmographics on deep).
  if (currentReportDomain) loadCompanyVitals(currentReportDomain, report && report.phase);
}

// ── Company vitals ───────────────────────────────────────────────────────────
// A dedicated "how alive are they" block: employees, revenue, VC funding raised
// (Apollo, ~1 credit) + aliveness (live site, last-updated, email) → a read on how
// pry-able the name is. Aliveness is free; on the DEEP pass firmographics auto-load,
// on a free report they're behind a one-click reveal. Cached per domain server-side.
const CV_VERDICT_COLOR = { very_hard: '#cf3030', hard: '#e07b2c', possible: '#0b8f3a', unclear: '#8a8a98' };
async function loadCompanyVitals(domain, phase, reveal = false) {
  const el = els.companyVitals;
  if (!el) return;
  const wantReveal = reveal || phase === 'deep'; // deep pass auto-reveals firmographics
  el.hidden = false;
  el.innerHTML = `<div class="cv-head"><span class="cv-title">🏢 Company vitals</span><span class="muted">loading…</span></div>`;
  el.dataset.domain = domain;
  try {
    const res = await fetch(`/research/api/company-vitals?domain=${encodeURIComponent(domain)}${wantReveal ? '&reveal=1' : ''}`);
    const data = await res.json();
    if (el.dataset.domain !== domain) return; // a newer report took over
    if (!res.ok) { el.hidden = true; return; }
    renderCompanyVitals(data);
  } catch {
    el.hidden = true;
  }
}
// Split a prose company description into sentence-level bullets (cap ~7).
function cvSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 7);
}
function cvStat(label, value, sub) {
  if (value == null || value === '') return '';
  return `<div class="cv-stat"><div class="cv-k">${label}</div><div class="cv-v">${value}${sub ? ` <span class="cv-sub">${sub}</span>` : ''}</div></div>`;
}
function renderCompanyVitals(d) {
  const el = els.companyVitals;
  const a = d.aliveness || {};
  const c = d.company || null;
  const v = d.verdict || {};
  const growthPct = (g) => (g && g.twelveMo != null ? `${g.twelveMo > 0 ? '+' : ''}${Math.round(g.twelveMo * 100)}%/yr` : '');
  // Aliveness chips
  const site = a.site || {};
  const siteChip = site.active === true ? `<span class="cv-chip cv-ok">✓ Live site${site.protected ? ' <span class="cv-sub">(bot-protected)</span>' : site.via === 'archive' ? ' <span class="cv-sub">(recently archived)</span>' : ''}</span>`
    : site.parked ? `<span class="cv-chip cv-no">⚠ Parked page</span>`
    : site.active === false ? `<span class="cv-chip cv-no">✗ No live site</span>`
    : ''; // null = couldn't check → show nothing (don't imply it's dead)
  const wb = a.wayback;
  const wbChip = wb ? `<span class="cv-chip ${wb.age_days < 180 ? 'cv-ok' : 'cv-warn'}">Last archived ${new Date(wb.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })} <span class="cv-sub">(${wb.age_days < 60 ? `${wb.age_days}d` : `${Math.round(wb.age_days / 30)}mo`} ago)</span></span>` : '';
  const mx = a.mx || {};
  const mxChip = mx.active === true ? `<span class="cv-chip cv-ok">✉ Email active${mx.provider ? ` · ${escapeHtml(mx.provider)}` : ''}</span>`
    : mx.active === false ? `<span class="cv-chip cv-no">✗ No email (MX)</span>` : '';

  const stats = c ? [
    cvStat('Employees', c.employees != null ? Number(c.employees).toLocaleString() : null, growthPct(c.headcountGrowth)),
    cvStat('Revenue', typeof c.revenue === 'string' ? escapeHtml(c.revenue) : (c.revenueAmount ? `$${Number(c.revenueAmount).toLocaleString()}` : null)),
    cvStat('VC raised', typeof c.funding === 'string' ? escapeHtml(c.funding) : (c.fundingAmount ? `$${Number(c.fundingAmount).toLocaleString()}` : null), c.fundingStage ? escapeHtml(c.fundingStage) : ''),
    cvStat('Last round', c.lastRound && c.lastRound.type ? escapeHtml(c.lastRound.type) : null, c.latestFundingDate ? new Date(c.latestFundingDate).getFullYear() : ''),
    cvStat('Founded', c.foundedYear || null),
    cvStat('Industry', c.industry ? escapeHtml(c.industry) : null),
    cvStat('HQ', c.location ? escapeHtml(c.location) : null),
  ].filter(Boolean).join('') : '';

  const revealBtn = !c
    ? `<button type="button" class="cv-reveal" data-cv-reveal="${escapeHtml(d.domain)}">Reveal company size (employees · revenue · VC) <span class="cv-sub">Apollo · ~1 credit</span></button>`
    : '';
  const verdictPill = v.label ? `<span class="cv-verdict" style="background:${CV_VERDICT_COLOR[v.band] || '#8a8a98'}">${escapeHtml(v.label)}</span>` : '';

  els.companyVitals.innerHTML =
    `<div class="cv-head"><span class="cv-title">🏢 Company vitals</span>${verdictPill}</div>`
    + `<div class="cv-chips">${siteChip}${wbChip}${mxChip}</div>`
    + (stats ? `<div class="cv-stats">${stats}</div>` : '')
    + (c && c.description ? `<ul class="cv-desc-list">${cvSentences(c.description).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : '')
    + (v.why ? `<div class="cv-why muted">${escapeHtml(v.why)}</div>` : '')
    + revealBtn;
  el.hidden = false;
}
document.getElementById('company-vitals')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cv-reveal]');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Revealing… (Apollo)';
  loadCompanyVitals(btn.dataset.cvReveal, null, true);
});

// ── Report add-ons — deeper dives that SUPPLEMENT the report ─────────────────
// One-click owner-focused deeper research (family, colleagues, related domains,
// still-alive), each fired through the async chat/research endpoint with a
// templated prompt and rendered as a CARD embedded in the report (not only in the
// chat). Reuses the whole agent + web-search machinery — no new endpoint.
const ADDON_DEFS = [
  {
    kind: 'family', label: '👥 Family', title: 'Family & relatives', needsOwner: true,
    prompt: (o, d) => `Focus specifically on ${o || `the likely owner of ${d}`}. Identify their immediate family — spouse/partner, children, parents, siblings — and any relatives connected to the domain or their businesses. For each person give the relationship and the public source. If you cannot verify family, say so plainly. Keep it concise.`,
  },
  {
    kind: 'colleagues', label: '🤝 Colleagues', title: 'Colleagues & associates', needsOwner: true,
    prompt: (o, d) => `Focus on ${o || `the likely owner of ${d}`}. Identify their co-founders, current and former business partners, and key colleagues/close professional associates at their companies. For each: name, role/company, and the source. If none can be verified, say so.`,
  },
  {
    kind: 'related_domains', label: '🔗 Related domains', title: 'Related domains', needsOwner: false,
    prompt: (o, d) => `Find other domains connected to ${o ? `${o} / ` : ''}${d} — via the same registrant, email, or a shared nameserver/DNS fingerprint (check ccTLD and brand-variant siblings). For each related domain: the connection evidence and any owner/contact it reveals. Prioritize a sibling with PUBLIC WHOIS that unmasks the owner.`,
  },
  {
    kind: 'alive', label: '🫀 Verify alive', title: 'Owner still alive?', needsOwner: true,
    prompt: (o, d) => `Verify whether ${o || `the likely owner of ${d}`} is still alive. Search obituaries, death notices, memorials and "in memoriam" pages matching THIS specific person (use their location/company/age to disambiguate — do not match a same-name stranger). If you find a credible death record, report the date and source link. If you find NO evidence of death, state clearly there is no indication they are deceased. Never assume.`,
  },
];

// The best owner name to focus a dive on: the JSON likely_owner, else the primary-tier
// named contact.
function reportOwnerName(data) {
  if (!data) return '';
  if (data.likely_owner && String(data.likely_owner).trim()) return String(data.likely_owner).trim();
  const named = (Array.isArray(data.contacts) ? data.contacts : [])
    .find((c) => (c.type === 'name' || c.type === 'org') && c.tier === 'primary' && c.value);
  return named ? String(named.value).trim() : '';
}

let addonBusy = false;

function renderAddons(data) {
  const el = els.reportAddons;
  if (!el) return;
  if (!currentRunId) { el.hidden = true; el.innerHTML = ''; return; }
  bindAddons();
  const owner = reportOwnerName(data);
  el.dataset.owner = owner;
  const btns = ADDON_DEFS.map((a) => {
    const off = a.needsOwner && !owner;
    return `<button type="button" class="addon-btn" data-addon="${a.kind}"${off ? ' disabled title="No named owner yet — run a deeper report first"' : ''}>${a.label}</button>`;
  }).join('');
  const ownerLine = owner
    ? `<span class="addon-owner">on <strong>${escapeHtml(owner)}</strong></span>`
    : '<span class="addon-owner addon-owner--none">no owner named yet</span>';
  el.innerHTML =
    `<div class="addon-head"><span class="addon-title">🔎 Deeper dives</span> ${ownerLine}</div>`
    + `<div class="addon-bar">${btns}</div>`
    + '<div class="addon-cards" id="addon-cards"></div>';
  el.hidden = false;
}

// One delegated click handler for the whole add-ons block.
function bindAddons() {
  const el = els.reportAddons;
  if (!el || el.dataset.bound) return;
  el.dataset.bound = '1';
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.addon-btn');
    if (!btn || btn.disabled) return;
    runAddon(btn.dataset.addon);
  });
}

// Re-enable the add-on buttons per their owner requirement (used after a dive ends).
function resetAddonButtons(owner) {
  els.reportAddons.querySelectorAll('.addon-btn').forEach((b) => {
    const d = ADDON_DEFS.find((a) => a.kind === b.dataset.addon);
    b.disabled = !!(d && d.needsOwner && !owner);
  });
}

async function runAddon(kind) {
  const def = ADDON_DEFS.find((a) => a.kind === kind);
  if (!def || addonBusy || !currentRunId) return;
  const owner = (els.reportAddons && els.reportAddons.dataset.owner) || '';
  const domain = currentReportDomain || '';
  const message = def.prompt(owner, domain);
  const cards = document.getElementById('addon-cards');
  if (!cards) return;
  addonBusy = true;
  els.reportAddons.querySelectorAll('.addon-btn').forEach((b) => { b.disabled = true; });

  const cardId = `addon-${kind}-${Date.now()}`;
  cards.insertAdjacentHTML('afterbegin',
    `<div class="addon-card" id="${cardId}"><div class="addon-card-head">${escapeHtml(def.title)}<span class="addon-card-status">researching…</span></div><div class="addon-card-body addon-loading">Researching… this can take a minute.</div></div>`);
  const card = document.getElementById(cardId);
  const setBody = (html, isErr) => {
    const body = card.querySelector('.addon-card-body');
    const status = card.querySelector('.addon-card-status');
    body.classList.remove('addon-loading');
    if (isErr) card.classList.add('addon-err');
    body.innerHTML = renderMarkdown(html);
    if (status) status.remove();
  };
  const done = () => { addonBusy = false; resetAddonButtons(owner); };

  let turnId;
  try {
    const res = await fetch('/research/api/chat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ run_id: currentRunId, domain, message }),
    });
    const raw = await res.text();
    let d = {}; try { d = JSON.parse(raw); } catch { /* non-JSON */ }
    if (!res.ok || !d.turn_id) { setBody(`⚠️ ${d.error || `Couldn't start (${res.status}).`}`, true); done(); return; }
    turnId = d.turn_id;
  } catch (e) { setBody(`⚠️ ${e.message || e}`, true); done(); return; }

  const started = Date.now();
  const poll = async () => {
    if (Date.now() - started > 5 * 60 * 1000) { setBody('⚠️ Timed out — try again.', true); done(); return; }
    try {
      const r = await fetch(`/research/api/chat?turn_id=${encodeURIComponent(turnId)}`);
      const d = await r.json();
      if (d.status === 'done') {
        const { cleaned } = detectRegenMarker(d.content || '');
        setBody(cleaned || d.content || '(no response)', false);
        // The dive is also persisted as a chat turn — drop the cache so the chat
        // panel reloads it next time the report is opened.
        if (chatLoadedFor === currentRunId) chatLoadedFor = null;
        done(); return;
      }
      if (d.status === 'error') { setBody(d.content || '⚠️ Failed.', true); done(); return; }
      const st = card.querySelector('.addon-card-status');
      if (st) st.textContent = `researching… (${Math.round((Date.now() - started) / 1000)}s)`;
    } catch { /* keep polling */ }
    setTimeout(poll, 2500);
  };
  setTimeout(poll, 2500);
}

// ── Auth ────────────────────────────────────────────────────────────────────
// Toggle between the three login panels (sign in / forgot / reset). Only one
// is shown at a time. `null` hides all three (used when actually signed in).
function showLoginPanel(which) {
  if (els.loginForm) els.loginForm.hidden = which !== 'login';
  if (els.forgotForm) els.forgotForm.hidden = which !== 'forgot';
  if (els.resetForm) els.resetForm.hidden = which !== 'reset';
}

function resetTokenFromUrl() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get('reset') || '';
  } catch { return ''; }
}

function clearResetTokenFromUrl() {
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete('reset');
    history.replaceState(null, '', u.pathname + (u.search ? `?${u.searchParams.toString()}` : '') + u.hash);
  } catch { /* ignore */ }
}

async function checkAuth() {
  // If the URL carries a reset token, prefer the reset-password panel over
  // anything else — the user arrived here from their inbox.
  if (resetTokenFromUrl()) {
    els.login.hidden = false;
    els.app.hidden = true;
    showLoginPanel('reset');
    return;
  }
  try {
    const res = await fetch('/research/api/me');
    const data = await res.json();
    const locked = data.gateEnabled && !data.authed;
    els.login.hidden = !locked;
    els.app.hidden = locked;
    if (locked) showLoginPanel('login');
    // Populate the topbar account block (email + Log out) and the sidebar
    // prefs block (Lessons button + notify toggle) when signed in. Gate the
    // module nav buttons by what the user is permitted to use.
    const u = data.user;
    if (!locked && u && u.email) {
      currentUser = u;
      if (els.navAccountEmail) els.navAccountEmail.textContent = u.email;
      if (els.topbarAccount) els.topbarAccount.hidden = false;
      // Show the Admin link to anyone who can ENTER the admin area: the owner
      // (is_admin), the umbrella `admin` grant, OR any single granular admin tab
      // (admin.imports, admin.sources, …). Mirrors permissions.ts#canEnterAdmin —
      // checking only is_admin||admin hid the chrome from granular admins (e.g. a
      // user with just admin.imports couldn't reach the dashboard from here).
      // SNAP — top-level workspace; the header link lands on SNAP Eval, so show it
      // to anyone who can use SNAP Eval (or, as owner/admin, everything).
      if (els.topbarSnap) els.topbarSnap.hidden = !(u.is_admin || (u.permissions && u.permissions.evaluate));
      if (els.topbarAdmin) els.topbarAdmin.hidden = !canEnterAdmin(u);
      // Reports section now also hosts Corporate Portfolios (a research-app page),
      // so a portfolio-only user should see Reports in the header too.
      if (els.topbarReports) els.topbarReports.hidden = !(canEnterReports(u) || u.is_admin || (u.permissions && u.permissions.portfolio));
      if (els.navAccount) els.navAccount.hidden = false;
      renderProfile(u);
      startNotifPolling();
      gateNavByPermissions(u);
      gateReportPhaseUI(u);
      maybeAutoRunFromUrl();
    } else {
      if (els.topbarAccount) els.topbarAccount.hidden = true;
      if (els.topbarAdmin) els.topbarAdmin.hidden = true;
      if (els.topbarReports) els.topbarReports.hidden = true;
      if (els.navAccount) els.navAccount.hidden = true;
    }
  } catch {
    els.login.hidden = true;
    els.app.hidden = false;
    if (els.topbarAccount) els.topbarAccount.hidden = true;
    if (els.topbarAdmin) els.topbarAdmin.hidden = true;
    if (els.topbarReports) els.topbarReports.hidden = true;
    if (els.navAccount) els.navAccount.hidden = true;
  }
}

// Free-report deep link: arriving at /research?example.com (or
// ?domain=example.com / ?d=example.com) auto-fills the search box and kicks off
// a FREE pre-flight report on load. Strips the query afterward so a refresh
// doesn't re-run. Called from checkAuth once the user is signed in.
// Set when a free report is auto-started from the URL, so the boot sequence
// knows NOT to run the default router afterward (which would showEntry() and
// clobber the just-shown "Researching…" view before the run hash is set).
let autoRanFromUrl = false;
function maybeAutoRunFromUrl() {
  const search = location.search || "";
  if (!search) return;
  // Only auto-run a free report on the Domain Owner home — not when a ?domain=
  // belongs to a tool route like /dbsearch?domain=… (that's handled in route()).
  if (currentToolRoute()) return;
  let domain = "";
  const params = new URLSearchParams(search);
  const named = params.get("domain") || params.get("d") || params.get("q");
  if (named) {
    domain = named.trim().toLowerCase();
  } else {
    // Bare form: ?example.com  (the whole query string is the domain).
    const bare = decodeURIComponent(search.replace(/^\?/, "")).trim().toLowerCase();
    if (bare && !bare.includes("=") && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(bare)) domain = bare;
  }
  if (!domain) return;
  // Drop the query so a manual refresh doesn't re-trigger the run.
  history.replaceState(null, "", location.pathname);
  if (!els.domain || !els.form) return;
  if (typeof showEntry === "function") showEntry();   // ensure the Domain Owner view
  if (els.deepToggle) els.deepToggle.checked = false;  // free pre-flight, not deep
  els.domain.value = domain;
  autoRanFromUrl = true;
  if (els.form.requestSubmit) els.form.requestSubmit();
  else els.form.dispatchEvent(new Event("submit", { cancelable: true }));
}

// Sign-out lives on the umbrella now — the topbar's "Log out" is a plain
// <a href="/api/logout"> that clears the shared .snagged.com cookie via a
// full-page navigation. No local handler.

// Mirrors lib/auth.js#userCanReportPhase — phase keys default to true when
// absent so existing user rows keep working; only explicit false denies.
let currentUser = null;
// Mirror of lib/auth.js#userCan for the lessons-curation module. The umbrella
// stores this flat as `admin.lessons.approve` (no `research.` prefix); accept
// the namespaced spelling too. Used to HIDE the Lessons/admin view entirely
// from users without the permission, rather than show it then deny.
function canAdminLessons(user) {
  // Approving/rejecting lessons is SUPER ADMIN only — matches the API
  // (requireAdmin = is_admin). Submitting a tip is separate (domain_owner).
  return Boolean(user && user.is_admin);
}
// Mirror of permissions.ts#canEnterAdmin: the owner, the umbrella `admin` grant,
// or ANY single granular admin tab can open the admin dashboard.
const ADMIN_TAB_PERMS = [
  'admin.sources', 'admin.config', 'admin.schedule',
  'admin.users.manage', 'admin.imports', 'admin.lessons.approve',
];
function canEnterAdmin(user) {
  if (!user) return false;
  if (user.is_admin) return true;
  const perms = user.permissions || {};
  if (perms.admin === true) return true;
  return ADMIN_TAB_PERMS.some((k) => perms[k] === true);
}
// Mirror of permissions.ts#canEnterReports: Reports is its own top-level module,
// independent of the admin umbrella. The owner, the `reports` grant, or either
// granular report can open it.
const REPORTS_PERMS = ['reports', 'reports.analytics', 'reports.cost'];
function canEnterReports(user) {
  if (!user) return false;
  if (user.is_admin) return true;
  const perms = user.permissions || {};
  return REPORTS_PERMS.some((k) => perms[k] === true);
}
// Generic module gate matching gateNavByPermissions' `can()` — used to HIDE a
// deep-linked tool view from a user without the permission (fall through to the
// entry view) instead of rendering it and surfacing a server 403 inside it.
function canModule(user, key) {
  if (!user) return false;
  if (user.is_admin) return true;
  const perms = user.permissions || {};
  return Boolean(perms[key]) || perms['research.' + key] === true;
}
function canPhase(user, phase) {
  if (!user) return false;
  if (user.is_admin) return true;
  const perms = user.permissions || {};
  if (!perms.domain_owner) return false;
  const key = phase === 'deep' ? 'report_deep' : 'report_shallow';
  return perms[key] === undefined ? true : Boolean(perms[key]);
}

// Hide affordances the user can't use: the "Go straight to deep research"
// upfront toggle, and (after a free run) the "Go deeper" buttons.
function gateReportPhaseUI(user) {
  const canDeep = canPhase(user, 'deep');
  const canShallow = canPhase(user, 'shallow');
  canEnhance = canDeep; // premium phone enhance rides the deep-pass permission
  // Hide the deep-toggle row entirely when deep isn't allowed.
  const deepToggleLabel = els.deepToggle && els.deepToggle.closest('label');
  if (deepToggleLabel) deepToggleLabel.hidden = !canDeep;
  if (els.deepToggle && !canDeep) els.deepToggle.checked = false;
  // The deepen buttons get hidden by user permission AT showReport time too,
  // but pre-set the disabled state so any in-flight render is consistent.
  if (els.deepenTopBtn) els.deepenTopBtn.disabled = !canDeep;
  if (els.deepenBtn) els.deepenBtn.disabled = !canDeep;
  // The fast "From chat" regenerate rides base domain_owner access (any user with
  // a report can regenerate); only the paid "Deep re-research" needs deep.
  if (els.chatRegenDeep) els.chatRegenDeep.hidden = !canDeep;
  // If the user has neither phase, lock the search submit + message it.
  if (els.go) els.go.disabled = !canShallow && !canDeep;
  if (els.domain && !canShallow && !canDeep) {
    els.domain.placeholder = 'No report access — ask an admin';
  }
}

// Hide nav buttons for modules the current user can't access; admins see
// everything plus the Admin button.
function gateNavByPermissions(user) {
  const perms = (user && user.permissions) || {};
  const can = (k) => Boolean(user && user.is_admin) || Boolean(perms[k]);
  if (els.navResearch) els.navResearch.hidden = !can('domain_owner');
  if (els.navTrademark) els.navTrademark.hidden = !can('trademark');
  if (els.navAppraisal) els.navAppraisal.hidden = !can('appraisal');
  if (els.navNaming) els.navNaming.hidden = !can('naming');
  if (els.navDbscreen) els.navDbscreen.hidden = !can('dbscreen');
  if (els.navDbsearch) els.navDbsearch.hidden = !can('dbsearch');
  if (els.navNameserver) els.navNameserver.hidden = !can('nameserver');
  if (els.navBeeper) els.navBeeper.hidden = !can('beeper');
  if (els.navWhois) els.navWhois.hidden = !can('whois');
  if (els.navDiq) els.navDiq.hidden = !can('domain_owner');
  if (els.navSales) els.navSales.hidden = !can('sales');
  // SNAP sub-nav: SNAP Eval needs `evaluate`; SNAP Opportunities (admin app) needs
  // reports access. Hidden buttons just don't render inside the SNAP group.
  if (els.navSnapEval) els.navSnapEval.hidden = !can('evaluate');
  if (els.navBulkEval) els.navBulkEval.hidden = !can('bulk_eval');
  if (els.navSnapOpps) els.navSnapOpps.hidden = !(Boolean(user && user.is_admin) || canEnterReports(user));
  if (els.navSnapNames) els.navSnapNames.hidden = !(Boolean(user && user.is_admin) || canEnterReports(user) || Boolean(perms.snap_names) || perms['reports.snap_names'] === true);
  // Reports sub-nav: Corporate Portfolios (a research-app page) needs `portfolio`;
  // the analytics tabs (admin app, full nav) need Reports access.
  if (els.navPortfolio) els.navPortfolio.hidden = !can('portfolio');
  if (els.navPerson) els.navPerson.hidden = !can('person');
  const repAccess = canEnterReports(user);
  for (const el of [els.navRepAnalytics, els.navRepMarketplace, els.navRepChat, els.navRepCost]) {
    if (el) el.hidden = !repAccess;
  }
  // "Suggest a Strategy" — anyone with Domain Owner Research access can submit a
  // playbook strategy (a super admin approves it). Lives on the Domain Owner page
  // + bottom of every report (inside #view-research), so it's scoped to that tool.
  if (els.suggestStrategy) els.suggestStrategy.hidden = !can('domain_owner');
  // Owner outreach is a report-page feature (not a nav module); cache whether
  // this user may use it so renderReport can show/hide the launcher button.
  canOutreach = can('outreach');
  if (els.outreachBtn && (!canOutreach || !currentRunId)) els.outreachBtn.hidden = true;
  // Lessons lives in the umbrella Admin module now; its tab stays hidden here
  // (the element is kept only so the /research/admin deep link still routes).
  if (els.navAdmin) els.navAdmin.hidden = true;
}

els.navAdmin?.addEventListener('click', () => {
  if (!canAdminLessons(currentUser)) { showEntry(); closeNav(); return; }
  history.pushState(null, '', '/research/admin'); showView('admin'); closeNav();
});

els.suggestStrategyBtn?.addEventListener('click', () => openTipModal());

// ── Profile menu (avatar dropdown) ──────────────────────────────────────────
// Avatar shows the first letter of the first name (or email). The dropdown
// carries name fields, the email-on-done toggle, and a change-password form.
function profileInitialOf(u) {
  const src = (u && (u.first_name || u.email)) || '?';
  return String(src).trim().charAt(0).toUpperCase() || '?';
}
function renderProfile(u) {
  if (!u) return;
  const initial = profileInitialOf(u);
  if (els.profileInitial) els.profileInitial.textContent = initial;
  if (els.profileInitialLg) els.profileInitialLg.textContent = initial;
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  if (els.profileNameDisplay) els.profileNameDisplay.textContent = name || u.email;
  if (els.profileEmail) els.profileEmail.textContent = u.email;
  if (els.profileRole) els.profileRole.textContent = u.is_admin ? 'Admin' : 'Member';
  if (els.profileFirst) els.profileFirst.value = u.first_name || '';
  if (els.profileLast) els.profileLast.value = u.last_name || '';
  if (els.profileNotifyEmail) els.profileNotifyEmail.checked = Boolean(u.email_notify_on_done);
  if (els.profileNotifyBell) els.profileNotifyBell.checked = u.notify_in_app !== false;
  if (els.profileBtn) els.profileBtn.title = u.email;
  // Once a full name is set, lock the fields (grayed) + show a small "Edit"
  // link instead of the Save button. Incomplete → stay editable.
  setNameEditing(!(u.first_name && u.last_name));
}
function setNameEditing(editing) {
  if (els.profileFirst) els.profileFirst.disabled = !editing;
  if (els.profileLast) els.profileLast.disabled = !editing;
  if (els.profileSave) els.profileSave.hidden = !editing;
  if (els.profileNameEdit) els.profileNameEdit.hidden = editing;
}
function setProfileMenu(open) {
  if (!els.profileMenu || !els.profileBtn) return;
  els.profileMenu.hidden = !open;
  els.profileBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function flashStatus(el, msg, ok = true) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  el.classList.toggle('is-err', !ok);
  setTimeout(() => { el.hidden = true; }, 2600);
}
async function patchMe(body) {
  const res = await fetch('/research/api/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Update failed.');
  return data.user;
}
els.profileBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = els.profileMenu.hidden;
  if (typeof setNotifMenu === 'function') setNotifMenu(false);
  setProfileMenu(open);
});
els.profileMenu?.addEventListener('click', (e) => e.stopPropagation());
document.addEventListener('click', () => { setProfileMenu(false); if (typeof setNotifMenu === 'function') setNotifMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setProfileMenu(false); if (typeof setNotifMenu === 'function') setNotifMenu(false); } });

els.profileSave?.addEventListener('click', async () => {
  els.profileSave.disabled = true;
  try {
    const u = await patchMe({ first_name: els.profileFirst.value, last_name: els.profileLast.value });
    currentUser = u; renderProfile(u);
    flashStatus(els.profileSaveStatus, 'Saved');
  } catch (err) {
    flashStatus(els.profileSaveStatus, err.message || 'Failed', false);
  } finally { els.profileSave.disabled = false; }
});

els.profileNameEdit?.addEventListener('click', (e) => {
  e.preventDefault();
  setNameEditing(true);
  els.profileFirst?.focus();
});

els.profileNotifyEmail?.addEventListener('change', async (e) => {
  const want = e.target.checked;
  try { currentUser = await patchMe({ email_notify_on_done: want }); }
  catch { e.target.checked = !want; }
});
els.profileNotifyBell?.addEventListener('change', async (e) => {
  const want = e.target.checked;
  try { currentUser = await patchMe({ notify_in_app: want }); }
  catch { e.target.checked = !want; }
});

els.profilePwSave?.addEventListener('click', async () => {
  const cur = els.profilePwCurrent.value, nw = els.profilePwNew.value, cf = els.profilePwConfirm.value;
  if (nw.length < 8) { flashStatus(els.profilePwStatus, 'At least 8 characters', false); return; }
  if (nw !== cf) { flashStatus(els.profilePwStatus, 'Passwords don’t match', false); return; }
  els.profilePwSave.disabled = true;
  try {
    await patchMe({ current_password: cur, new_password: nw });
    els.profilePwCurrent.value = els.profilePwNew.value = els.profilePwConfirm.value = '';
    flashStatus(els.profilePwStatus, 'Password updated');
  } catch (err) {
    flashStatus(els.profilePwStatus, err.message || 'Failed', false);
  } finally { els.profilePwSave.disabled = false; }
});

// ── Notifications bell ──────────────────────────────────────────────────────
// Polls the unread count + recent items; clicking an item deep-links in-app
// (report hash route) and marks it read. The bell is the in-platform mirror of
// the report-done email — see lib/inngest/functions.js#createReportNotification.
let notifPollTimer = null;
function relTime(ts) {
  const d = ts ? Date.parse(ts) : NaN;
  if (!Number.isFinite(d)) return '';
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}
function setNotifMenu(open) {
  if (!els.notifMenu || !els.notifBtn) return;
  els.notifMenu.hidden = !open;
  els.notifBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function renderNotifCount(unread) {
  if (!els.notifCount) return;
  if (unread > 0) { els.notifCount.textContent = unread > 99 ? '99+' : String(unread); els.notifCount.hidden = false; }
  else els.notifCount.hidden = true;
}
function renderNotifList(items) {
  if (!els.notifList) return;
  if (els.notifEmpty) els.notifEmpty.hidden = items.length > 0;
  els.notifList.innerHTML = items.map((n) => {
    const unread = !n.read_at;
    return `<li><button class="notif-item${unread ? ' unread' : ''}" type="button" data-id="${escapeHtml(n.id)}" data-link="${escapeHtml(n.link || '')}">`
      + `<div class="notif-item-title">${escapeHtml(n.title || '')}</div>`
      + (n.body ? `<div class="notif-item-body">${escapeHtml(n.body)}</div>` : '')
      + `<div class="notif-item-when">${escapeHtml(relTime(n.created_at))}</div>`
      + `</button></li>`;
  }).join('');
}
async function loadNotifications() {
  if (!els.notifBtn) return;
  try {
    const res = await fetch('/research/api/me?notifications=1');
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    renderNotifCount(Number(data.unread) || 0);
    renderNotifList(Array.isArray(data.items) ? data.items : []);
  } catch { /* transient — keep last state */ }
}
function startNotifPolling() {
  if (notifPollTimer) return;
  loadNotifications();
  notifPollTimer = setInterval(loadNotifications, 30000);
}
// True when the given view isn't the one on screen — used to only ding the bell
// for a client-completed tool (appraisal/trademark) when you've navigated away.
function viewHidden(name) {
  const v = VIEWS[name] && document.getElementById(VIEWS[name].view);
  return !v || v.hidden;
}
// Create a notification for the current user (client-completed tools), then
// refresh the bell count. Fire-and-forget; failures are non-fatal.
function pushNotification({ kind, title, body, link }) {
  if (currentUser && currentUser.notify_in_app === false) return; // bell disabled
  fetch('/research/api/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ create_notification: { kind, title, body, link } }),
  }).then((r) => r.json()).then((d) => {
    if (d && d.unread !== undefined) renderNotifCount(Number(d.unread) || 0);
  }).catch(() => {});
}
// Navigate an in-app notification link. Report links are hash routes (#/r/<slug>)
// → put them on the Domain Owner path and route() opens the report (no reload).
function openNotifLink(link) {
  if (!link) return;
  if (link.startsWith('#')) { history.pushState(null, '', '/research' + link); route(); }
  else { history.pushState(null, '', link); route(); }
}
async function markNotificationsRead(ids) {
  try {
    const res = await fetch('/research/api/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mark_notifications_read: ids || true }),
    });
    const data = await res.json().catch(() => ({}));
    if (data && data.unread !== undefined) renderNotifCount(Number(data.unread) || 0);
  } catch { /* non-fatal */ }
}
// Force-reload the app to the latest deployed version. The HTML shell is served
// no-cache (vercel.json), so a reload revalidates and pulls the newest app.js /
// styles.css — useful in the installed PWA where there's no browser refresh.
els.refreshBtn?.addEventListener('click', () => {
  els.refreshBtn.classList.add('spinning');
  location.reload();
});
// In-app back navigation (PWA has no browser back button).
els.backBtn?.addEventListener('click', () => history.back());
// Share — copy the current report's URL to the clipboard with a brief confirmation.
els.shareBtn?.addEventListener('click', async () => {
  const b = els.shareBtn;
  // Public, path-based share URL (/research/r/<slug>) so the link previews with a
  // proper "Domain Owner Report — <domain>" card (crawlers can't read the #hash).
  // Keep it SHORT/clean: <domain>-<8-hex of the run id>; the share route resolves
  // that back to the full report (scoped by the domain). Falls back to the full
  // slug if the hash shape is unexpected.
  const m = location.hash.match(/^#\/r\/(.+)$/);
  let shareUrl = window.location.href;
  if (m) {
    const slug = m[1];
    const u = slug.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (u) {
      const dom = slug.slice(0, u.index).replace(/-+$/, '');     // domain before the id
      const short = u[0].replace(/-/g, '').slice(0, 8);          // first 8 hex of the id
      shareUrl = `${location.origin}/research/r/${dom}-${short}`;
    } else {
      shareUrl = `${location.origin}/research/r/${slug}`;
    }
  }
  const flash = () => {
    b.classList.add('copied');
    const prev = b.getAttribute('title');
    b.setAttribute('title', 'Link copied!');
    setTimeout(() => { b.classList.remove('copied'); b.setAttribute('title', prev || 'Share'); }, 1600);
  };
  // On mobile (iPhone/Android) the native share sheet is the expected behavior and
  // works inside in-app webviews where clipboard/prompt are often no-ops — which is
  // why "nothing happened" on iOS. Try it first, then fall back to clipboard, then
  // to a prompt the user can copy from.
  if (navigator.share) {
    try { await navigator.share({ title: document.title || 'Domain Owner Report', url: shareUrl }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; /* user dismissed — done */ }
  }
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no clipboard');
    await navigator.clipboard.writeText(shareUrl);
    flash();
  } catch {
    // Clipboard blocked / unavailable — fall back to a prompt the user can copy from.
    try { window.prompt('Copy this link to share the report:', shareUrl); }
    catch { flash(); /* even prompt blocked — at least show the copied affordance */ }
  }
});

// "+ New report" on any collapsed tool header → back to that tool's entry.
document.addEventListener('click', (e) => {
  const b = e.target.closest('.tool-new-report');
  if (!b || !b.dataset.tool) return;
  e.preventDefault();
  setToolUrl(b.dataset.tool, '');
  route();
});

els.notifBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = els.notifMenu.hidden;
  setProfileMenu(false);
  setNotifMenu(open);
  if (open) loadNotifications();
});
els.notifMenu?.addEventListener('click', (e) => {
  e.stopPropagation();
  const item = e.target.closest('.notif-item');
  if (!item) return;
  if (item.classList.contains('unread') && item.dataset.id) {
    item.classList.remove('unread');
    markNotificationsRead([item.dataset.id]);
  }
  setNotifMenu(false);
  openNotifLink(item.dataset.link);
});
els.notifMarkAll?.addEventListener('click', (e) => {
  e.stopPropagation();
  els.notifList?.querySelectorAll('.notif-item.unread').forEach((el) => el.classList.remove('unread'));
  markNotificationsRead(null); // null = all
});

// (The "Email me when reports finish" toggle moved into the profile menu;
// its handler lives with the other profile handlers above.)

els.loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.loginError.hidden = true;
  try {
    const res = await fetch('/research/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: els.email && els.email.value, password: els.password.value }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      els.loginError.textContent = data.error || 'Incorrect password';
      els.loginError.hidden = false;
      return;
    }
    els.password.value = '';
    await checkAuth();
    routeAfterAuth();
  } catch (err) {
    els.loginError.textContent = String(err.message || err);
    els.loginError.hidden = false;
  }
});

// "Forgot password?" → swap to the email-prompt panel.
els.forgotLink?.addEventListener('click', (e) => {
  e.preventDefault();
  if (els.loginError) els.loginError.hidden = true;
  if (els.forgotError) els.forgotError.hidden = true;
  if (els.forgotSent) els.forgotSent.hidden = true;
  if (els.forgotEmail && els.email) els.forgotEmail.value = els.email.value || '';
  showLoginPanel('forgot');
  els.forgotEmail?.focus();
});

els.backToLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  showLoginPanel('login');
});

// Forgot-password submit → request a reset link.
els.forgotForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (els.forgotError) els.forgotError.hidden = true;
  if (els.forgotSent) els.forgotSent.hidden = true;
  const email = (els.forgotEmail && els.forgotEmail.value || '').trim();
  if (!email) return;
  try {
    const res = await fetch('/research/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'reset-request', email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      els.forgotError.textContent = data.error || `Request failed (${res.status})`;
      els.forgotError.hidden = false;
      return;
    }
    // Server returns ok regardless of whether the address exists, to avoid
    // leaking which emails are on file. Always show the same confirmation.
    if (els.forgotSent) els.forgotSent.hidden = false;
  } catch (err) {
    els.forgotError.textContent = String(err.message || err);
    els.forgotError.hidden = false;
  }
});

// Reset-confirm submit (user arrived via emailed link with ?reset=<token>).
els.resetForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (els.resetError) els.resetError.hidden = true;
  const token = resetTokenFromUrl();
  const pw = (els.resetPassword && els.resetPassword.value) || '';
  const pwConfirm = (els.resetPasswordConfirm && els.resetPasswordConfirm.value) || '';
  if (!token) {
    els.resetError.textContent = 'Reset link missing or expired — request a new one.';
    els.resetError.hidden = false;
    return;
  }
  if (pw.length < 8) {
    els.resetError.textContent = 'Password must be at least 8 characters.';
    els.resetError.hidden = false;
    return;
  }
  if (pw !== pwConfirm) {
    els.resetError.textContent = 'Passwords do not match.';
    els.resetError.hidden = false;
    return;
  }
  try {
    const res = await fetch('/research/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'reset-confirm', token, password: pw }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      els.resetError.textContent = data.error || `Reset failed (${res.status})`;
      els.resetError.hidden = false;
      return;
    }
    // Password saved + user signed in. Clean the token off the URL and
    // re-check auth so the app appears.
    els.resetPassword.value = '';
    els.resetPasswordConfirm.value = '';
    clearResetTokenFromUrl();
    await checkAuth();
    if (typeof routeAfterAuth === 'function') routeAfterAuth();
  } catch (err) {
    els.resetError.textContent = String(err.message || err);
    els.resetError.hidden = false;
  }
});

// ── Research (async: enqueue → poll) ────────────────────────────────────────
async function enqueue({ domain, deep, force }) {
  const res = await fetch('/research/api/research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain, deep: !!deep, force: !!force }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  // data may include { existing: true, created_at } when the server returns
  // a cached run instead of enqueueing a fresh one.
  return data;
}

async function pollRun(runId) {
  const res = await fetch(`/research/api/research?id=${encodeURIComponent(runId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Poll failed (${res.status})`);
  return data;
}

// Regenerate the current report using the refine-chat history as
// authoritative corrections. mode='synth' re-runs critique() against the
// existing trace + corrections (fast, no fresh tool calls). mode='deep'
// runs the whole gather+critique pipeline again with the chat seeded as
// context (slow, paid sources). Server-side handler in api/research.js.
async function regenerateFromChat(mode) {
  if (!currentRunId) return;
  if (regenInFlight) return;
  regenInFlight = true;
  setRegenStatus(mode === 'deep' ? 'Kicking off deep re-research…' : 'Regenerating from chat…');
  setRegenButtonsDisabled(true);
  try {
    const res = await fetch('/research/api/research', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: currentRunId, regenerate_from_chat: mode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Regenerate failed (${res.status})`);
    setRegenStatus('');
    // Hand off to the existing polling loop — it owns the live clock,
    // stage updates, and the final renderReport() / setReportMeta() call.
    startPolling(currentRunId, mode === 'deep' ? 'Regenerating (deep)' : 'Regenerating', { regenerated: true });
  } catch (e) {
    setRegenStatus(`⚠️ ${e.message || e}`, true);
  } finally {
    regenInFlight = false;
    // Re-enable after a short delay so the status message stays readable.
    setTimeout(() => setRegenButtonsDisabled(false), 1500);
  }
}

let regenInFlight = false;
// "Skip to deep" should still show the FREE pre-flight report first (fast), then
// auto-chain into the deep pass. Bound to a specific run id so it can only deepen
// THAT run (never a different report the user happens to open later).
let autoDeepenForRunId = null;
function setRegenStatus(text, isErr = false) {
  if (!els.chatRegenStatus) return;
  if (!text) { els.chatRegenStatus.hidden = true; els.chatRegenStatus.textContent = ''; return; }
  els.chatRegenStatus.textContent = text;
  els.chatRegenStatus.classList.toggle('chat-regen-err', !!isErr);
  els.chatRegenStatus.hidden = false;
}
function setRegenButtonsDisabled(d) {
  if (els.chatRegenSynth) els.chatRegenSynth.disabled = d;
  if (els.chatRegenDeep) els.chatRegenDeep.disabled = d;
}

// Chat replies may begin with a regeneration marker — the agent's signal
// that the user asked to re-run the report. We strip the marker from the
// rendered text and kick off the regen automatically. Returns the cleaned
// reply text so the chat bubble shows the friendly confirmation only.
function detectRegenMarker(text) {
  const m = String(text || '').match(/^\s*\[REGENERATE:(synth|deep)\]\s*/i);
  if (!m) return { cleaned: text, mode: null };
  return { cleaned: text.slice(m[0].length), mode: m[1].toLowerCase() };
}

function startPolling(runId, label, opts = {}) {
  const regenerated = !!opts.regenerated;
  currentRunId = runId;
  els.go.disabled = true;
  if (els.runControls) els.runControls.hidden = false;
  clearTimers();

  // Live elapsed clock, ticking once a second; the poll updates the stage label.
  // startedAt is mutable so we can re-anchor it to the run's actual created_at
  // once the first poll returns it — otherwise reopening a long-running report
  // would restart the timer at 0:00 every time the page loads.
  let startedAt = Date.now();
  let stage = '';
  const tick = () => {
    const elapsed = Date.now() - startedAt;
    const base = `${label}…${stage ? ` (${stage})` : ''} · ${fmtElapsed(elapsed)}`;
    // Reassure on long-but-healthy deep runs instead of letting the user think
    // it hung — deep research routinely takes 20+ min and is still progressing.
    const note = elapsed > SLOW_MS ? ' — deep research is thorough; this can take 20+ minutes. Still working…' : '';
    setStatus(base + note);
  };
  tick();
  clockTimer = setInterval(tick, 1000);

  pollTimer = setInterval(async () => {
    try {
      const r = await pollRun(runId);
      applyHash({ id: runId, domain: r.domain, created_at: r.created_at });
      if (r.created_at) {
        const realStart = Date.parse(r.created_at);
        if (Number.isFinite(realStart) && realStart < startedAt) startedAt = realStart;
      }
      if (r.status === 'done') {
        clearTimers();
        setStatus('');
        if (els.runControls) els.runControls.hidden = true;
        if (r.domain) setReportTitle(r.domain);
        renderReport(r.report);
        setReportMeta(r.created_at, r.report && r.report.phase, regenerated ? { regenerated: true } : undefined);
        if (regenerated && els.report) els.report.scrollIntoView({ behavior: 'smooth', block: 'start' });
        els.go.disabled = false;
        // The report-done notification is created server-side at this exact
        // moment (same step as the email) — refresh the bell now instead of
        // waiting up to a full poll interval.
        if (typeof loadNotifications === 'function') loadNotifications();
        // "Skip to deep": the FREE pass for THIS run just finished and is on screen
        // — now automatically chain into the deep pass (fast report first, then the
        // paid enrichment replaces it).
        if (autoDeepenForRunId === runId && r.report && r.report.phase !== 'deep') {
          autoDeepenForRunId = null;
          deepen();
        }
      } else if (r.status === 'error') {
        clearTimers();
        if (els.runControls) els.runControls.hidden = true;
        els.go.disabled = false;
        // If a free pre-flight report was already saved, keep it on screen and
        // mark deep as incomplete (instead of just an error line that hides it).
        if (r.report) {
          if (r.domain) setReportTitle(r.domain);
          renderReport(r.report);
          setReportMeta(r.created_at, r.report.phase, { deepIncomplete: r.report.phase !== 'deep' });
          setStatus('Deep research did not complete — showing the free pre-flight report. Re-run deep to try again.', true);
        } else {
          setStatus(r.error || 'The run failed.', true);
        }
      } else if (r.status === 'cancelled') {
        clearTimers();
        setStatus('Cancelled — this run was stopped to save credits. Re-run it any time.');
        if (els.runControls) els.runControls.hidden = true;
        els.go.disabled = false;
      } else if (Date.now() - startedAt > STALL_MS) {
        // Going far longer than any real run — treat as stalled. Stop the
        // spinner/clock and surface it; leave any already-rendered report in
        // place. A refresh re-checks in case it did finish in the background.
        clearTimers();
        if (els.runControls) els.runControls.hidden = true;
        els.go.disabled = false;
        setStatus(`This run has been going ${fmtElapsed(Date.now() - startedAt)} — well beyond even a thorough deep pass, so it likely stalled. Refresh to check whether it finished, or re-run it.`, true);
      } else {
        stage = r.stage || r.status; // rendered by the clock tick
      }
    } catch (err) {
      clearTimers();
      setStatus(err.message || String(err), true);
      if (els.runControls) els.runControls.hidden = true;
      els.go.disabled = false;
    }
  }, POLL_MS);
}

// ── Marketplace "for sale" quick-strip ──────────────────────────────────────
// Fires the instant a research starts (parallel to the free LLM pass) to answer
// the first question a researcher asks: "is this for sale, and where?" Each
// channel is checked individually and its pill flips from "checking" to a green
// ✓ link (listed) or a red ✗ (not found) the moment it resolves — so the fast
// free channels report before the slower rendered ones. Misses STAY visible. A
// row of quick-open links covers sources we can't check server-side (DomainScout
// needs a login).
//
// Results are cached server-side (kind 'mk') and only re-checked once a week, so
// re-opening the same report 5× a day doesn't re-spend Scrape.do credits. A
// "refresh" link forces a fresh check on demand.
const MARKET_NAMES = {
  afternic: 'Afternic', sedo: 'Sedo', atom: 'Atom', godaddy: 'GoDaddy', dynadot: 'Dynadot', spaceship: 'Spaceship',
};
const MARKET_CHANNELS = ['afternic', 'sedo', 'atom', 'godaddy', 'dynadot', 'spaceship'];
const MARKET_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Bump when the for-sale detection logic changes, so cached results from an
// older (buggier) version are ignored and re-checked instead of shown stale.
// v6: primary source is now the DomainScout API (authoritative, many
// marketplaces) — the page-scraping channels are a fallback when no key is set.
const MARKET_V = 6;

// DomainScout marketplace → host, for a real favicon logo. Unknown names render
// without a logo (text pill only). Logos are pulled from Google's favicon CDN.
const MARKET_HOSTS = {
  afternic: 'afternic.com', sedo: 'sedo.com', godaddy: 'godaddy.com', namecheap: 'namecheap.com',
  sav: 'sav.com', spaceship: 'spaceship.com', atom: 'atom.com', squadhelp: 'atom.com',
  dan: 'dan.com', efty: 'efty.com', hugedomains: 'hugedomains.com', dynadot: 'dynadot.com',
  flippa: 'flippa.com', epik: 'epik.com', name: 'name.com', uniregistry: 'uniregistry.com',
  bido: 'bido.com', sedomls: 'sedo.com', porkbun: 'porkbun.com',
  dropcatch: 'dropcatch.com', parkio: 'park.io', gname: 'gname.com', domaineasy: 'domaineasy.com',
};
function marketSlug(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function marketLogo(name) {
  const host = MARKET_HOSTS[marketSlug(name)];
  if (!host) return '';
  return `<img class="ms-logo" src="https://www.google.com/s2/favicons?domain=${host}&sz=64" alt="" loading="lazy" width="16" height="16">`;
}
function marketMoney(price, currency) {
  if (!price) return '';
  const cur = String(currency || 'USD').toUpperCase();
  if (cur === 'USD') return ' $' + Number(price).toLocaleString();
  return ` ${Number(price).toLocaleString()} ${escapeHtml(cur)}`;
}
// One DomainScout marketplace pill. Listed → green, logo, price, deep-link.
// Not-listed → muted text pill with the logo.
function dsPill(m) {
  const name = escapeHtml(m.name || '');
  const logo = marketLogo(m.name);
  if (m.listed) {
    const href = m.url ? escapeHtml(m.url) : '';
    const price = marketMoney(m.price, m.currency);
    if (href) return `<a class="ms-item listed" href="${href}" target="_blank" rel="noopener">${logo}✓ ${name}${price} ↗</a>`;
    return `<span class="ms-item listed">${logo}✓ ${name}${price}</span>`;
  }
  return `<span class="ms-item miss">${logo}✗ ${name}</span>`;
}

function quickLinks(domain, tracked) {
  const d = encodeURIComponent(domain);
  const links = [
    ['Live site', `https://${domain}`],
    ['Wayback', `https://web.archive.org/web/2024*/${domain}`],
    ['GoDaddy', `https://www.godaddy.com/domainsearch/find?domainToCheck=${d}`],
    ['Dynadot', `https://www.dynadot.com/domain/search?domain=${d}`],
    ['Spaceship', `https://www.spaceship.com/domain-search/?query=${d}&tab=domains`],
  ];
  const main = links
    .map(([n, u]) => `<a class="ms-link" href="${u}" target="_blank" rel="noopener">${escapeHtml(n)} ↗</a>`)
    .join('');
  // The server now auto-tracks every researched domain in DomainScout. When that
  // track is confirmed, the link gets a green "✓ Tracked" badge; otherwise it's
  // a plain quick-open to the DomainScout dashboard for the domain.
  const label = tracked ? '✓ Tracking on DomainScout' : 'DomainScout';
  const cls = tracked ? 'ms-link ms-ds tracked' : 'ms-link ms-ds';
  const ttl = tracked ? ' title="This domain is tracked on DomainScout"' : '';
  const ds =
    `<a class="${cls}" data-ds-domain="${escapeHtml(domain)}"${ttl} ` +
    `href="${dsUrl(domain)}" target="_blank" rel="noopener">${label} ↗</a>`;
  return main + ds;
}

// DomainScout dashboard with the domain in the hash — the userscript/bookmarklet
// reads #snagged=<domain> and submits it to the "Track any domains" form.
function dsUrl(domain) {
  return `https://www.domainscout.io/dashboard#snagged=${encodeURIComponent(domain)}`;
}

// Opt-in: open the DomainScout dashboard for a domain in a new tab (not a named
// window — that spawned a separate popup-style window instead of a normal tab).
function openDomainScout(domain) {
  if (!domain) return;
  window.open(dsUrl(domain), '_blank', 'noopener');
}

function agoLabel(ts) {
  if (!ts) return '';
  const s = Math.max(0, Date.now() - ts);
  const d = Math.floor(s / 86400000);
  if (d >= 1) return `${d}d ago`;
  const h = Math.floor(s / 3600000);
  if (h >= 1) return `${h}h ago`;
  const m = Math.floor(s / 60000);
  return m >= 1 ? `${m}m ago` : 'just now';
}

function metaHtml(ts) {
  return `<span class="ms-meta">checked ${escapeHtml(agoLabel(ts))} · <a href="#" class="ms-refresh">refresh</a></span>`;
}

function channelPill(c) {
  const name = escapeHtml(MARKET_NAMES[c.channel] || c.channel);
  if (c.pending) return `<span class="ms-item pending" data-ch="${c.channel}">… ${name}</span>`;
  if (c.unverified)
    return `<a class="ms-item unverified" data-ch="${c.channel}" title="Listing in progress — ownership not yet verified" href="${escapeHtml(c.url || '#')}" target="_blank" rel="noopener">◐ ${name} ↗</a>`;
  if (c.listed) {
    const title = c.via === 'afternic' ? ' title="Listed on Afternic — GoDaddy&#39;s aftermarket, so buyable via GoDaddy"' : '';
    return `<a class="ms-item listed" data-ch="${c.channel}"${title} href="${escapeHtml(c.url || '#')}" target="_blank" rel="noopener">✓ ${name} ↗</a>`;
  }
  return `<span class="ms-item miss" data-ch="${c.channel}">✗ ${name}</span>`;
}

// GoDaddy's aftermarket inventory IS Afternic (same company), and GoDaddy's own
// search page is the least reliable to scrape (heavy bot wall, and it loses the
// race when several Scrape.do renders fire in parallel). So when Afternic is
// listed, the domain is buyable via GoDaddy too — mark GoDaddy listed even if
// its own scrape missed. Applied at render time; the raw scrape is what's cached.
function mirrorGoDaddyFromAfternic(channels) {
  const af = channels.find((c) => c.channel === 'afternic');
  const gd = channels.find((c) => c.channel === 'godaddy');
  if (af && af.listed && gd && !gd.listed) {
    return channels.map((c) => (c.channel === 'godaddy' ? { ...c, listed: true, via: 'afternic' } : c));
  }
  return channels;
}

async function getMarketCache(domain) {
  try {
    const res = await fetch(`/research/api/lookup?kind=mk&query=${encodeURIComponent(domain)}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.found) return null;
    return { data: d.data, ts: d.updated_at ? Date.parse(d.updated_at) : 0 };
  } catch {
    return null;
  }
}

function marketPaint(domain, pills, metaInner, tracked) {
  els.marketStrip.innerHTML =
    `<div class="ms-row"><span class="ms-label">For sale:</span>${pills}${metaInner}</div>` +
    `<div class="ms-row ms-quick"><span class="ms-label">Open:</span>${quickLinks(domain, tracked)}</div>`;
}

// Render a complete result at once — misses stay as red ✗.
function renderMarketStrip(domain, channels, ts) {
  const norm = mirrorGoDaddyFromAfternic(channels);
  const byCh = new Map(norm.map((c) => [c.channel, c]));
  const ordered = MARKET_CHANNELS.filter((ch) => byCh.has(ch)).map((ch) => byCh.get(ch));
  for (const c of norm) if (!MARKET_CHANNELS.includes(c.channel)) ordered.push(c);
  marketPaint(domain, ordered.map(channelPill).join(''), ts ? metaHtml(ts) : '');
}

// Render the DomainScout result. Listed marketplaces lead (the actual signal);
// the not-listed ones collapse behind a "+N not listed ▸" toggle so the strip
// stays tidy whether 2 or 12 marketplaces come back. While DomainScout is still
// scanning a freshly-tracked domain (no marketplaces yet), show a spinner.
// opts: { tracked, scanning, settled }
function renderMarketStripDS(domain, marketplaces, ts, opts = {}) {
  const all = Array.isArray(marketplaces) ? marketplaces : [];
  const listed = all.filter((m) => m.listed).sort((a, b) => (b.price || 0) - (a.price || 0));
  const notListed = all.filter((m) => !m.listed).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  let pills;
  if (listed.length) {
    pills = listed.map(dsPill).join('');
    if (notListed.length) {
      pills += `<button type="button" class="ms-more" aria-expanded="false">+${notListed.length} not listed ▸</button>` +
        `<span class="ms-notlisted" hidden>${notListed.map(dsPill).join('')}</span>`;
    }
  } else if (all.length) {
    // Nothing listed — a single muted summary that expands to show which were checked.
    pills = `<button type="button" class="ms-more ms-none" aria-expanded="false">✗ Not listed (${all.length} checked) ▸</button>` +
      `<span class="ms-notlisted" hidden>${all.map(dsPill).join('')}</span>`;
  } else if (opts.settled) {
    pills = `<span class="ms-item miss ms-none">✗ No marketplace listings found</span>`;
  } else {
    // Scan still pending — animated "scanning" state (DomainScout checks the
    // marketplaces asynchronously after a domain is added; usually seconds).
    pills = `<span class="ms-scanning"><span class="ms-spinner" aria-hidden="true"></span> Scanning marketplaces on DomainScout…</span>`;
  }
  const meta = ts ? metaHtml(ts) : (opts.scanning ? '<span class="ms-meta ms-checking">scanning…</span>' : '');
  marketPaint(domain, pills, meta, opts.tracked !== false);
}

// Auto-poll: DomainScout fills a domain's marketplaces array INCREMENTALLY after
// it's tracked (empty → a few → all ~10, over seconds). So we can't finalize on
// the first non-empty result — we'd cache a partial set ("2 checked"). Instead we
// re-render as the set grows and only finalize + cache once the count holds steady
// across consecutive polls (or we hit the cap). Bounded so a never-scanned domain
// settles rather than spinning forever.
let dsPollTimer = null;
const DS_POLL_EVERY_MS = 4000;
const DS_POLL_MAX = 20;       // ~80s of polling
const DS_STABLE_HITS = 2;     // count unchanged across this many polls ⇒ done
function stopDsPoll() {
  if (dsPollTimer) { clearTimeout(dsPollTimer); dsPollTimer = null; }
}
async function dsFetchOnce(domain) {
  const res = await fetch(`/research/api/lookup?source=domainscout_lookup&domain=${encodeURIComponent(domain)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.data) return null;
  return {
    marketplaces: Array.isArray(data.data.marketplaces) ? data.data.marketplaces : [],
    tracked: data.data.tracked !== false,
  };
}
function dsFinalize(domain, mk, tracked) {
  serverSaveTool('mk', domain, { v: MARKET_V, domain, source: 'domainscout', any_listed: mk.some((m) => m.listed), marketplaces: mk });
  renderMarketStripDS(domain, mk, Date.now(), { tracked });
}
function scheduleDsPoll(domain, attempt, prevCount, stableHits) {
  stopDsPoll();
  if (attempt > DS_POLL_MAX) {
    // Stop waiting — finalize with whatever we have (one last read).
    dsPollTimer = setTimeout(async () => {
      if (els.marketStrip.hidden || els.marketStrip.dataset.domain !== domain) return;
      let r = null;
      try { r = await dsFetchOnce(domain); } catch { /* ignore */ }
      if (els.marketStrip.hidden || els.marketStrip.dataset.domain !== domain) return;
      const mk = (r && r.marketplaces) || [];
      if (mk.length) dsFinalize(domain, mk, true);
      else renderMarketStripDS(domain, [], Date.now(), { tracked: true, settled: true });
    }, 0);
    return;
  }
  dsPollTimer = setTimeout(async () => {
    if (els.marketStrip.hidden || els.marketStrip.dataset.domain !== domain) return;
    let r = null;
    try { r = await dsFetchOnce(domain); } catch { /* keep polling */ }
    if (els.marketStrip.hidden || els.marketStrip.dataset.domain !== domain) return;
    const mk = (r && r.marketplaces) || [];
    const cur = mk.length;
    // Render the latest (growing) set as it fills; keep the "scanning" meta until
    // we're confident it's complete.
    if (cur) renderMarketStripDS(domain, mk, null, { tracked: true, scanning: true });
    const stable = cur > 0 && cur === prevCount ? stableHits + 1 : 0;
    if (cur > 0 && stable >= DS_STABLE_HITS) {
      dsFinalize(domain, mk, true);
      return;
    }
    scheduleDsPoll(domain, attempt + 1, cur, stable);
  }, DS_POLL_EVERY_MS);
}

// Primary path: the DomainScout API returns the authoritative for-sale state
// across every marketplace it monitors. Returns false (→ scraping fallback) when
// the key isn't configured or the call fails. The marketplace set fills in over a
// few seconds, so we render the first read immediately then poll to completion
// (only the stable, complete result is cached).
async function loadDomainScoutStrip(domain) {
  stopDsPoll();
  let r;
  try { r = await dsFetchOnce(domain); } catch { return false; }
  if (!r) return false;
  if (els.marketStrip.hidden || els.marketStrip.dataset.domain !== domain) return true;
  // First read — render what we have (spinner if still empty), then poll until the
  // marketplace count stops growing. Never finalize/cache on this partial read.
  renderMarketStripDS(domain, r.marketplaces, null, { tracked: r.tracked, scanning: true });
  scheduleDsPoll(domain, 1, r.marketplaces.length, 0);
  return true;
}

// Live check: one request per channel, each pill updated in place as it lands.
async function streamMarketStrip(domain) {
  const state = MARKET_CHANNELS.map((ch) => ({ channel: ch, pending: true }));
  marketPaint(domain, state.map(channelPill).join(''), '<span class="ms-meta ms-checking">checking…</span>');
  await Promise.all(
    MARKET_CHANNELS.map(async (ch, i) => {
      let result;
      try {
        const res = await fetch(
          `/research/api/lookup?source=marketplace_check&domain=${encodeURIComponent(domain)}&channel=${ch}`,
        );
        const data = await res.json();
        result = ((data.data && data.data.channels) || [])[0] || { channel: ch, listed: false };
      } catch {
        result = { channel: ch, listed: false };
      }
      state[i] = result;
      if (els.marketStrip.hidden || els.marketStrip.dataset.domain !== domain) return;
      const pill = els.marketStrip.querySelector(`.ms-item[data-ch="${ch}"]`);
      if (pill) pill.outerHTML = channelPill(result);
    }),
  );
  if (els.marketStrip.hidden || els.marketStrip.dataset.domain !== domain) return;
  const channels = state.map((c) => ({
    channel: c.channel,
    url: c.url,
    listed: !!c.listed,
    unverified: !!c.unverified,
    for_sale_signals: c.for_sale_signals,
    prices: c.prices,
  }));
  serverSaveTool('mk', domain, { v: MARKET_V, domain, any_listed: channels.some((c) => c.listed), channels });
  // Final consistent render: applies the GoDaddy←Afternic mirror and sets the
  // "checked just now · refresh" meta, replacing the live "checking…" pills.
  renderMarketStrip(domain, channels, Date.now());
}

// ── NameBio previous-sales call-out ─────────────────────────────────────────
// Shown in the Domain Owner report + the Appraisal result when NameBio has sale
// records for the exact domain. Cache-first (kind 'nb') so re-opening a report
// doesn't re-spend a NameBio credit; only the first view of a domain costs one.
async function loadNameBio(domain, el) {
  if (!el || !domain) return;
  el.hidden = true; el.innerHTML = ''; el.dataset.domain = domain;
  let data = null;
  try {
    const c = await fetch(`/research/api/lookup?kind=nb&query=${encodeURIComponent(domain)}`);
    const cj = await c.json().catch(() => ({}));
    if (cj && cj.found && cj.data) data = cj.data;
  } catch { /* cache miss / offline */ }
  if (!data) {
    try {
      const r = await fetch(`/research/api/lookup?source=namebio_sales&domain=${encodeURIComponent(domain)}`);
      const rj = await r.json().catch(() => ({}));
      if (rj && rj.ok && rj.data) {
        data = rj.data;
        fetch('/research/api/lookup', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind: 'nb', query: domain, data }),
        }).catch(() => {});
      }
    } catch { /* leave empty */ }
  }
  if (el.dataset.domain !== domain) return; // a newer domain superseded this one
  renderNameBio(el, data);
}
function renderNameBio(el, data) {
  const sales = data && Array.isArray(data.sales) ? data.sales : [];
  if (!sales.length) { el.hidden = true; el.innerHTML = ''; return; }
  const fmt = (n) => '$' + Number(n).toLocaleString();
  // Each recorded sale links out to the domain's NameBio page (where the
  // transaction is listed). NameBio's per-domain page is namebio.com/<domain>.
  const dom = el.dataset.domain || '';
  const nbUrl = dom ? `https://namebio.com/${encodeURIComponent(dom)}` : 'https://namebio.com/';
  const rows = sales.slice(0, 10).map((s) =>
    `<li><a class="nb-row" href="${nbUrl}" target="_blank" rel="noreferrer noopener" title="View this sale on NameBio">`
    + `<span class="nb-price">${fmt(s.price)}</span>`
    + `<span class="nb-date">${escapeHtml(s.date || '')}</span>`
    + `<span class="nb-venue">${escapeHtml(s.venue || '')}</span>`
    + `<span class="nb-ext" aria-hidden="true">↗</span></a></li>`).join('');
  el.innerHTML = `<div class="nb-head"><span class="nb-badge">NameBio</span> Previous sales (${sales.length})</div>`
    + `<ul class="nb-list">${rows}</ul>`;
  el.hidden = false;
}

async function runMarketStrip(domain, { force = false } = {}) {
  if (!els.marketStrip || !domain) return;
  stopDsPoll(); // cancel any in-flight poll from a previous domain
  els.marketStrip.hidden = false;
  els.marketStrip.dataset.domain = domain;
  loadNameBio(domain, els.namebioStrip); // NameBio sales history (cached)
  // Cheap first paint so the quick-open links are usable instantly.
  marketPaint(domain, '<span class="ms-checking">Checking marketplaces…</span>', '');
  try {
    if (!force) {
      const cached = await getMarketCache(domain);
      // Only trust a cache from the current detection version and within TTL.
      if (cached && cached.data && cached.data.v === MARKET_V && Date.now() - cached.ts < MARKET_TTL_MS) {
        if (els.marketStrip.hidden || els.marketStrip.dataset.domain !== domain) return;
        if (cached.data.source === 'domainscout') renderMarketStripDS(domain, cached.data.marketplaces || [], cached.ts, { tracked: true });
        else renderMarketStrip(domain, cached.data.channels || [], cached.ts);
        return;
      }
    }
    // Prefer the DomainScout API (authoritative, many marketplaces); fall back to
    // the page-scraping channels when no DomainScout key is configured.
    const ok = await loadDomainScoutStrip(domain);
    if (!ok) await streamMarketStrip(domain);
  } catch {
    // Network/parse failure — leave the quick-open links in place.
  }
}

// Switch the research view into "showing a result": hide the entry hero and
// reveal the standalone report area headed by the domain name.
function enterResultMode(domain) {
  showView('research');
  els.hero.hidden = true;
  setReportTitle(domain);
  clearReportMeta();
  els.reportConfidence.hidden = true;
  els.reportActions.hidden = true;
  els.report.hidden = true;
  if (els.reportFeedback) els.reportFeedback.hidden = true;
  if (els.reportNotes) els.reportNotes.hidden = true;
  if (els.reportChat) { els.reportChat.hidden = true; chatLoadedFor = null; }
  els.evidence.hidden = true;
  els.deepenTop.hidden = true;
  els.deepenBar.hidden = true;
  // Clear any Deeper-dives block left over from the previously-viewed report —
  // it renders from the prior run's owner and would otherwise persist (stale)
  // through the whole "gathering" stage of a fresh run.
  // (Keep dataset.bound — the click listener is delegated on the container and
  // survives innerHTML changes; re-binding would double-fire it.)
  if (els.reportAddons) { els.reportAddons.hidden = true; els.reportAddons.innerHTML = ''; delete els.reportAddons.dataset.owner; }
  // Same for the Company vitals card — it's loaded per report domain, so a fresh
  // run must clear the previous company's block (else last report's vitals sit
  // stale through the whole "gathering" stage of the new run).
  if (els.companyVitals) { els.companyVitals.hidden = true; els.companyVitals.innerHTML = ''; delete els.companyVitals.dataset.domain; }
  stopDsPoll();
  if (els.marketStrip) els.marketStrip.hidden = true;
  if (els.runControls) els.runControls.hidden = true;
}

async function run({ domain, deep, force }) {
  enterResultMode(domain);
  // First action: check the marketplaces in parallel with the free LLM pass.
  runMarketStrip(domain);
  // "Skip to deep" still runs the FREE pre-flight FIRST (fast result), then
  // auto-deepens — as long as the user can run the free pass. Only a user without
  // free access goes straight to deep.
  const freeFirst = !!deep && canPhase(currentUser, 'shallow');
  const effectiveDeep = !!deep && !freeFirst;
  autoDeepenForRunId = null; // set once we have the run id (below)
  setStatus(effectiveDeep
    ? `Researching ${domain} (deep, paid sources)… this can take a few minutes.`
    : freeFirst
      ? `Researching ${domain} — free pre-flight first, then deep…`
      : `Researching ${domain}… this can take a few minutes.`);
  try {
    const data = await enqueue({ domain, deep: effectiveDeep, force });
    // Server returned a cached completed run — open it directly instead of
    // re-running. Shows "Researched X ago · Refresh" so the user can re-run
    // on demand if the cached data is stale.
    if (data.existing) {
      const r = await pollRun(data.run_id);
      applyHash({ id: data.run_id, domain: r.domain, created_at: r.created_at });
      setStatus('');
      if (r.domain) setReportTitle(r.domain);
      // Set currentRunId BEFORE renderReport — it gates the report-chat (and the
      // outreach launcher) on currentRunId, so rendering first would hide the chat.
      currentRunId = data.run_id;
      domainRuns.set(domain.toLowerCase(), data.run_id);
      renderReport(r.report);
      // A reused run can be an errored deep pass that still saved a free
      // pre-flight — mark it incomplete (and offer re-deepen) instead of letting
      // the partial report look complete, mirroring openProject().
      const deepIncomplete = r.status === 'error' && r.report && r.report.phase !== 'deep';
      setReportMeta(r.created_at, r.report && r.report.phase, deepIncomplete ? { deepIncomplete: true } : undefined);
      els.go.disabled = false;
      // Asked for deep but got a cached free report → deepen it now.
      if (freeFirst && r.report && r.report.phase !== 'deep') deepen();
      return;
    }
    const runId = data.run_id;
    domainRuns.set(domain.toLowerCase(), runId);
    applyHash({ id: runId, domain, created_at: new Date().toISOString() });
    if (freeFirst) autoDeepenForRunId = runId; // deepen this run once its free report lands
    startPolling(runId, effectiveDeep ? `Researching ${domain} (deep)` : `Researching ${domain}`);
  } catch (err) {
    autoDeepenForRunId = null;
    setStatus(err.message || String(err), true);
    els.go.disabled = false;
  }
}

async function deepen() {
  if (!currentRunId) return;
  // Keep the free pre-flight report on screen and reviewable while the paid pass
  // runs — just lock the deepen buttons so it can't be triggered twice.
  els.deepenTop.hidden = true;
  els.deepenBar.hidden = true;
  setStatus('Going deeper (paid sources)… this can take a few minutes. The free findings stay below.');
  try {
    const res = await fetch('/research/api/research', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: currentRunId, deepen: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    startPolling(currentRunId, 'Going deeper');
  } catch (err) {
    setStatus(err.message || String(err), true);
  }
}

// Stop watching the current run. A typo'd pre-flight goes back to the search box;
// if a free report is already on screen (e.g. a deep pass is running), keep it.
function cancelRun() {
  const hadReport = els.report && !els.report.hidden;
  const runId = currentRunId;
  clearTimers();
  els.go.disabled = false;
  if (els.runControls) els.runControls.hidden = true;
  // Tell the server to actually STOP the run (Inngest cancelOn) so we stop
  // spending credits — not just stop watching it client-side.
  if (runId && !hadReport) {
    fetch('/research/api/research', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: runId, cancel: true }),
    }).catch(() => {});
  }
  if (hadReport) {
    setStatus('Stopped watching — the free pre-flight result is shown below.');
    els.deepenBar.hidden = false;
  } else {
    showEntry();
  }
}

// ── Projects (Past Research) ────────────────────────────────────────────────
async function loadProjects(q = '') {
  els.projectsList.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const res = await fetch(`/research/api/research?list=1&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    const runs = data.runs || [];
    if (!runs.length) {
      els.projectsList.innerHTML = '<li class="muted">No completed runs yet.</li>';
      return;
    }

    // Group runs by domain, preserving recency (API returns newest-first).
    const groups = [];
    const byDomain = new Map();
    for (const r of runs) {
      const key = r.domain || '(unknown)';
      if (!byDomain.has(key)) {
        const g = { domain: key, runs: [] };
        byDomain.set(key, g);
        groups.push(g);
      }
      byDomain.get(key).runs.push(r);
    }

    els.projectsList.innerHTML = groups
      .map((g) => {
        const items = g.runs
          .map((r) => {
            const when = r.created_at ? new Date(r.created_at).toLocaleString() : '';
            const active = r.status === 'running';
            const meta = active ? `researching… (${r.stage || 'running'})` : when;
            return `<li class="project-run${active ? ' active' : ''}" data-id="${escapeHtml(r.id)}">${escapeHtml(meta)}</li>`;
          })
          .join('');
        const count = g.runs.length > 1 ? `<span class="project-count">${g.runs.length} runs</span>` : '';
        return `<li class="project-group">
            <div class="project-group-title">${escapeHtml(g.domain)}${count}</div>
            <ul class="project-runs">${items}</ul>
          </li>`;
      })
      .join('');
  } catch (err) {
    els.projectsList.innerHTML = `<li class="err">${escapeHtml(err.message || String(err))}</li>`;
  }
}

async function openProject(id) {
  enterResultMode('');
  setStatus('Loading…');
  try {
    const r = await pollRun(id);
    currentRunId = id;
    if (r.domain) domainRuns.set(r.domain.toLowerCase(), id);
    applyHash({ id, domain: r.domain, created_at: r.created_at });
    setReportTitle(r.domain);
    if (r.domain) runMarketStrip(r.domain);
    if (r.status === 'done') {
      setStatus('');
      renderReport(r.report);
      setReportMeta(r.created_at, r.report && r.report.phase);
    } else if (r.status === 'error') {
      // A deep pass that errored often still has the free pre-flight report
      // saved — keep it on screen, but mark clearly that deep never finished
      // (don't let a partial report look like a complete one).
      if (r.report) {
        renderReport(r.report);
        setReportMeta(r.created_at, r.report.phase, { deepIncomplete: r.report.phase !== 'deep' });
        setStatus('');
      } else {
        setStatus(r.error || 'This run failed.', true);
      }
    } else {
      // Still "running" server-side. If a report was already saved AND the run is
      // older than the stall threshold, it's an orphaned run (e.g. a deep pass that
      // died without finalizing the status) — show its saved report CALMLY as
      // deep-incomplete rather than resuming a doomed poll that immediately blasts
      // the alarming "likely stalled" banner over a perfectly good report.
      const ageMs = r.created_at ? Date.now() - Date.parse(r.created_at) : 0;
      if (r.report && ageMs > STALL_MS) {
        if (r.domain) setReportTitle(r.domain);
        renderReport(r.report);
        els.deepenTop.hidden = true;
        els.deepenBar.hidden = true;
        if (els.reportFeedback) els.reportFeedback.hidden = true;
  if (els.reportNotes) els.reportNotes.hidden = true;
        setReportMeta(r.created_at, r.report && r.report.phase, { deepIncomplete: r.report.phase !== 'deep' });
        setStatus('');
        if (els.runControls) els.runControls.hidden = true;
        els.go.disabled = false;
        return;
      }
      // Genuinely in-flight (recent). Keep any saved free report on screen and
      // resume polling — the elapsed clock re-anchors to the run's real start.
      if (r.report) {
        renderReport(r.report);
        els.deepenTop.hidden = true;
        els.deepenBar.hidden = true; // a pass is already running
        if (els.reportFeedback) els.reportFeedback.hidden = true;
  if (els.reportNotes) els.reportNotes.hidden = true; // it'll be replaced by the deep report
      }
      startPolling(id, `Researching ${r.domain || ''}`);
    }
  } catch (err) {
    setStatus(err.message || String(err), true);
  }
}

const VIEWS = {
  research: { view: 'view-research', nav: 'nav-research' },
  projects: { view: 'view-projects', nav: 'nav-projects' },
  trademark: { view: 'view-trademark', nav: 'nav-trademark' },
  appraisal: { view: 'view-appraisal', nav: 'nav-appraisal' },
  naming: { view: 'view-naming', nav: 'nav-naming' },
  'naming-projects': { view: 'view-naming-projects', nav: 'nav-naming' },
  dbscreen: { view: 'view-dbscreen', nav: 'nav-dbscreen' },
  dbsearch: { view: 'view-dbsearch', nav: 'nav-dbsearch' },
  nameserver: { view: 'view-nameserver', nav: 'nav-nameserver' },
  beeper: { view: 'view-beeper', nav: 'nav-beeper' },
  whois: { view: 'view-whois', nav: 'nav-whois' },
  diq: { view: 'view-diq', nav: 'nav-diq' },
  sales: { view: 'view-sales', nav: 'nav-sales' },
  'sales-projects': { view: 'view-sales-projects', nav: 'nav-sales' },
  portfolio: { view: 'view-portfolio', nav: 'nav-portfolio' },
  'portfolio-runs': { view: 'view-portfolio-runs', nav: 'nav-portfolio' },
  person: { view: 'view-person', nav: 'nav-person' },
  'person-runs': { view: 'view-person-runs', nav: 'nav-person' },
  evaluate: { view: 'view-evaluate', nav: 'nav-snap-eval' },
  'bulk-eval': { view: 'view-bulk-eval', nav: 'nav-bulk-eval' },
  admin: { view: 'view-admin', nav: 'nav-admin' },
  lead: { view: 'view-lead', nav: 'nav-lead' }, // deep-link only (no nav tab)
};

// ── Section registry (research SPA) ─────────────────────────────────────────
// Top-level sections and their sub-nav group + top-header link. A view belongs to
// a section via VIEW_SECTION (default 'research'). showView swaps the visible
// sub-nav group + highlights the section in the top header. To add a section: add
// a SECTION_NAV entry + its #nav-*-group span + topbar link; to move a tool to a
// different section: add it to VIEW_SECTION and the matching group span.
const SECTION_NAV = {
  research: { group: 'nav-research-group', topbar: 'topbar-research' },
  snap: { group: 'nav-snap-group', topbar: 'topbar-snap' },
  reports: { group: 'nav-reports-group', topbar: 'topbar-reports' },
};
const VIEW_SECTION = { evaluate: 'snap', 'bulk-eval': 'snap', portfolio: 'reports', 'portfolio-runs': 'reports' };
const sectionForView = (name) => VIEW_SECTION[name] || 'research';

function showView(name) {
  for (const [k, v] of Object.entries(VIEWS)) {
    const view = document.getElementById(v.view);
    if (view) view.hidden = k !== name;
    const nav = document.getElementById(v.nav);
    if (nav) nav.classList.toggle('active', k === name);
  }
  if (name === 'projects') loadProjects(els.projectsSearch.value.trim());
  if (name === 'admin') loadLessons();
  // Section switch: each view belongs to a section (default Research). Swap the
  // visible sub-nav group + light up that section in the top header.
  const sec = sectionForView(name);
  for (const [k, cfg] of Object.entries(SECTION_NAV)) {
    const g = document.getElementById(cfg.group);
    if (g) g.hidden = k !== sec;
    const tb = document.getElementById(cfg.topbar);
    if (tb) tb.classList.toggle('active', k === sec);
  }
  // All modules use the full content width on desktop (matching the Naming
  // Exercise) so the space isn't wasted by a narrow centered column.
  const wrap = document.querySelector('.content > .wrap');
  if (wrap) wrap.classList.add('wrap--wide');
  renderDomainBar(); // refresh the cross-module action bar for the new view
}

// ── Inbound-lead dossier ────────────────────────────────────────────────────
// A deep-linked, gated FACT SHEET for a contact-form inquiry — built to scan at a
// glance: who the person is (LinkedIn / X reach), then the company facts (raised /
// when / investors / employees / stage / founded / HQ) as big headline stats, then
// a bulleted company summary. No scoring, no routing — just the facts. Keyed on the
// lead's email; enriches async, so it shows a pending state + polls.
let leadPollTimer = null;
function stopLeadPoll() { if (leadPollTimer) { clearTimeout(leadPollTimer); leadPollTimer = null; } }
async function loadLead(key, { started = Date.now() } = {}) {
  const el = document.getElementById('lead-body');
  if (!el) return;
  stopLeadPoll();
  if (!el.dataset.key) el.innerHTML = '<div class="lead-loading">Loading…</div>';
  el.dataset.key = key;
  try {
    const res = await fetch(`/research/api/lead-enrich?key=${encodeURIComponent(key)}`);
    if (res.status === 403) { el.innerHTML = '<div class="lead-loading">You don’t have access to leads.</div>'; return; }
    if (res.status === 404) { el.innerHTML = '<div class="lead-loading">No lead found for this link yet.</div>'; return; }
    const data = await res.json();
    if (el.dataset.key !== key) return; // navigated away
    const lead = data.lead;
    if (!lead) { el.innerHTML = '<div class="lead-loading">No lead found.</div>'; return; }
    if ((lead.status === 'pending' || lead.status === 'running') && Date.now() - started < 4 * 60 * 1000) {
      renderLeadPending(el, lead);
      leadPollTimer = setTimeout(() => loadLead(key, { started }), 4000);
      return;
    }
    renderLead(el, lead, data.report_run || null);
  } catch {
    el.innerHTML = '<div class="lead-loading">Couldn’t load this lead. Refresh in a moment.</div>';
  }
}
function renderLeadPending(el, lead) {
  const name = escapeHtml(lead.name || lead.email || 'this lead');
  el.innerHTML =
    `<div class="lead-head"><h1 class="lead-name">${name}</h1>`
    + (lead.email ? `<div class="lead-sub">${escapeHtml(lead.email)}</div>` : '') + `</div>`
    + `<div class="lead-pending"><span class="lead-spin">◌</span> Pulling person + company details… this takes a minute. The page refreshes itself.</div>`;
}
// One big headline stat (label over a large value). Skips itself when empty.
function leadBig(label, value) {
  if (value == null || value === '') return '';
  return `<div class="lead-big"><div class="lead-big-k">${escapeHtml(label)}</div><div class="lead-big-v">${value}</div></div>`;
}
// Split a company blurb into short sentence bullets (cap ~8).
function leadBullets(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim()).filter((s) => s.length > 3).slice(0, 8);
}
function renderLead(el, lead, reportRun) {
  const r = lead.result || {};
  const p = r.person || null;
  const c = r.company || null;
  const num = (n) => (n == null ? null : Number(n).toLocaleString());
  // If we've already run a Domain Owner report for the inquired domain, deep-link it.
  const reportHref = (reportRun && reportRun.id)
    ? `#/r/${buildSlug({ domain: reportRun.domain || lead.domain_of_interest, id: reportRun.id })}` : null;
  // Money: always prefix a currency symbol. Apollo's printed values often come back
  // bare ("4.8M", "61.1M"); a plain integer gets thousands separators.
  const money = (v) => {
    if (v == null || v === '') return null;
    const s = String(v).trim();
    if (/^[$€£¥]/.test(s)) return escapeHtml(s);
    if (/^\d+$/.test(s)) return '$' + Number(s).toLocaleString();
    if (/^\d/.test(s)) return '$' + escapeHtml(s);
    return escapeHtml(s);
  };
  // Date: an ISO/`YYYY-MM-DD` value → "Sep 2022"; anything else passes through.
  const fmtDate = (v) => {
    if (!v) return null;
    const s = String(v);
    if (/^\d{4}-\d{2}/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' });
    }
    return escapeHtml(s);
  };

  // ── Person line — LinkedIn + X reach (followers / connections), plainly stated.
  const social = (p && Array.isArray(p.social)) ? p.social : [];
  const countFor = (k) => { const s = social.find((x) => x.key === k); return s && s.followers ? Number(s.followers) : null; };
  const li = countFor('linkedin');
  const tw = countFor('twitter');
  const liUrl = (social.find((x) => x.key === 'linkedin') || {}).url || r.linkedin_url || lead.linkedin_url || null;
  const twUrl = (social.find((x) => x.key === 'twitter') || {}).url || null;
  const prof = (p && p.professional) || {};
  const bg = r.background || {};
  const employer = prof.employer || (r.company && r.company.company) || null;
  const personBig =
    (liUrl || li != null
      ? leadBig('LinkedIn', (liUrl ? `<a href="${escapeHtml(liUrl)}" target="_blank" rel="noopener">${li != null ? num(li) : 'Profile ↗'}</a>` : num(li)) + (li != null ? ' <span class="lead-unit">connections</span>' : ''))
      : '')
    + (tw != null || twUrl
      ? leadBig('X / Twitter', (twUrl ? `<a href="${escapeHtml(twUrl)}" target="_blank" rel="noopener">${tw != null ? num(tw) : 'Profile ↗'}</a>` : num(tw)) + (tw != null ? ' <span class="lead-unit">followers</span>' : ''))
      : '')
    + (prof.title ? leadBig('Role', escapeHtml(prof.title)) : '')
    + (employer ? leadBig('Employer', escapeHtml(employer)) : '');

  // ── Who they are — overview + work history + highlights (fresh Google pass).
  const overview = bg.overview || (p && p.narrative && p.narrative.summary) || null;
  const standing = bg.standing || null;
  const work = Array.isArray(bg.work_history) ? bg.work_history.filter((w) => w && (w.role || w.org)) : [];
  const highlights = (Array.isArray(bg.highlights) && bg.highlights.length ? bg.highlights
    : (p && p.narrative && Array.isArray(p.narrative.notable) ? p.narrative.notable : [])).filter(Boolean);
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent([lead.name, employer].filter(Boolean).join(' '))}`;
  const workHtml = work.length
    ? `<div class="lead-sub-h">Work history</div><ul class="lead-about">${work.map((w) => {
        const role = [w.role, w.org].filter(Boolean).join(' · ');
        return `<li>${escapeHtml(role)}${w.period ? ` <span class="lead-unit">${escapeHtml(String(w.period))}</span>` : ''}</li>`;
      }).join('')}</ul>`
    : '';
  const hlHtml = highlights.length
    ? `<div class="lead-sub-h">Highlights</div><ul class="lead-about">${highlights.slice(0, 6).map((h) => `<li>${escapeHtml(String(h))}</li>`).join('')}</ul>`
    : '';
  const personSection =
    (personBig ? `<div class="lead-bigrow lead-bigrow--person">${personBig}</div>` : '')
    + (overview ? `<div class="lead-overview">${escapeHtml(overview)}</div>` : '')
    + workHtml + hlHtml
    + `<div class="lead-links"><a href="${escapeHtml(googleUrl)}" target="_blank" rel="noopener">Google them ↗</a>`
    + (liUrl ? ` <a href="${escapeHtml(liUrl)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : '') + `</div>`;

  // ── Company headline facts.
  let companyName = (c && c.company) || lead.company_domain || null;
  let round = (c && c.lastRound) || null;
  const raisedWhen = (c && (c.latestFundingDate || (round && round.date))) || null;
  // Apollo sometimes echoes the company name back as "investors" — drop that noise.
  const investors = (round && round.investors && String(round.investors).toLowerCase() !== String(companyName || '').toLowerCase())
    ? String(round.investors) : null;
  const raisedMv = money(c && c.funding);
  const companyBig = c
    ? leadBig('Raised', raisedMv ? `<strong>${raisedMv}</strong>` : null)
      + leadBig('When', fmtDate(raisedWhen))
      + leadBig('Stage', c.fundingStage ? escapeHtml(c.fundingStage) : null)
      + leadBig('Investors', investors ? escapeHtml(investors) : null)
      + leadBig('Employees', c.employees ? num(c.employees) : null)
      + leadBig('Founded', c.foundedYear || null)
      + leadBig('Revenue', money(c.revenue))
      + leadBig('HQ', c.location ? escapeHtml(c.location) : null)
    : '';
  const bullets = leadBullets(c && c.description);

  // ── The inquiry (secondary) + jump back to the email.
  const gmailSearch = lead.email ? `https://mail.google.com/mail/u/0/#search/${encodeURIComponent('from:' + lead.email)}` : null;
  const wantsVal = lead.domain_of_interest
    ? (reportHref ? `<a href="${reportHref}"><strong>${escapeHtml(lead.domain_of_interest)}</strong></a>` : `<strong>${escapeHtml(lead.domain_of_interest)}</strong>`)
    : null;
  const inquiry =
    `<div class="lead-inquiry-row">`
    + (wantsVal ? `<span><span class="lead-inq-k">Wants</span> ${wantsVal}</span>` : '')
    + (lead.budget ? `<span><span class="lead-inq-k">Budget</span> ${escapeHtml(lead.budget)}</span>` : '')
    + ((r.location || lead.location) ? `<span><span class="lead-inq-k">Location</span> ${escapeHtml(r.location || lead.location)}</span>` : '')
    + `</span>`
    + (r.message || lead.message ? `<div class="lead-quote">“${escapeHtml(r.message || lead.message)}”</div>` : '')
    + `<div class="lead-links">`
    + (liUrl ? `<a href="${escapeHtml(liUrl)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : '')
    + (gmailSearch ? `<a href="${escapeHtml(gmailSearch)}" target="_blank" rel="noopener">Open the email ↗</a>` : '')
    + `</div>`;

  const name = escapeHtml(lead.name || lead.email || 'Lead');
  el.innerHTML =
    `<div class="lead-head"><h1 class="lead-name">${name}</h1>`
    + (standing ? `<div class="lead-standing">${escapeHtml(standing)}</div>` : '')
    + (lead.email ? `<div class="lead-sub">${escapeHtml(lead.email)}${lead.domain_of_interest ? ` · inquiring about <strong>${escapeHtml(lead.domain_of_interest)}</strong>` : ''}</div>` : '')
    + `</div>`
    // Deep-link to an existing Domain Owner report for the inquired domain.
    + (reportHref ? `<a class="lead-report-link" href="${reportHref}">📄 Ownership report on file for ${escapeHtml(lead.domain_of_interest || 'this domain')} — open ↗</a>` : '')
    // Who they are — reach + overview + work history + highlights.
    + personSection
    // Company facts headline.
    + (c || companyName
      ? `<div class="lead-section-h">🏢 ${escapeHtml(companyName || 'Company')}</div>`
        + (companyBig ? `<div class="lead-bigrow">${companyBig}</div>` : '')
        + (bullets.length ? `<ul class="lead-about">${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
          : (lead.company_domain ? `<div class="lead-quote muted">No company details found for ${escapeHtml(lead.company_domain)}.</div>` : ''))
      : (lead.company_domain ? '' : `<div class="lead-quote muted">Personal email — no company to profile.</div>`))
    // The inquiry (secondary).
    + `<div class="lead-section-h">📨 The inquiry</div>`
    + inquiry
    + (lead.status === 'failed' ? `<div class="lead-loading">Some enrichment hit an error${lead.error ? `: ${escapeHtml(String(lead.error).slice(0, 160))}` : ''}. The details above are still accurate.</div>` : '');
}

// ── Beeper — RDAP drop watcher ──────────────────────────────────────────────
async function loadBeeper() {
  if (!els.beeperList) return;
  els.beeperList.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const res = await fetch('/research/api/beeper');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load watches');
    renderBeeper(data.watches || []);
  } catch (e) {
    els.beeperList.innerHTML = `<li class="muted">${escapeHtml(e.message || String(e))}</li>`;
  }
}
function beeperStateLabel(w) {
  if (w.status === 'dropped') return '🎯 AVAILABLE — dropped!';
  if (w.status === 'pending_drop') return '⏳ not-found — confirming drop…';
  if (w.status === 'held_registered') return '⏳ in delete pipeline — WHOIS still shows it registered (holding for the real drop)';
  if (w.status === 'resolved') return 'renewed / registered — watch stopped';
  if (w.status === 'expired') return 'auto-stopped (max watch window)';
  const s = Array.isArray(w.last_status) ? w.last_status : [];
  if (s.length) return s.join(', ');
  if (w.last_checked) return 'registered';
  return 'checking…';
}
// Which display group a watch belongs to: finished (terminal), live (minute /
// hourly cadence — on the cusp), or scheduled (long-term tapered toward expiry).
function beeperBucket(w) {
  if (w.status === 'dropped' || w.status === 'resolved' || w.status === 'expired') return 'done';
  const tier = (w.cadence && w.cadence.tier) || 'scheduled';
  return (tier === 'live' || tier === 'hourly') ? 'live' : 'scheduled';
}
// "daily · exp in 92d" — the current poll cadence + how far the expiration is.
function beeperCadenceChip(w) {
  const c = w.cadence;
  if (!c) return '';
  const bits = [c.label];
  if (c.days_to_expiry != null) {
    const d = c.days_to_expiry;
    bits.push(d < 0 ? `exp ${Math.abs(Math.round(d))}d ago` : d < 1 ? 'exp today' : `exp in ${Math.round(d)}d`);
  }
  const live = c.tier === 'live';
  return ` <span class="beeper-cadence${live ? ' beeper-cadence-live' : ''}" title="Polling cadence">${escapeHtml(bits.join(' · '))}</span>`;
}
function beeperRowHtml(w) {
  const dropped = w.status === 'dropped'; // confirmed only (pending_drop isn't green yet)
  const when = w.last_checked ? `last checked: ${new Date(w.last_checked).toLocaleString()}` : 'not checked yet';
  const who = w.submitted_by ? ` <span class="beeper-who" title="Added by ${escapeHtml(w.submitted_by)}">${escapeHtml(w.submitted_by)}</span>` : '';
  const terminal = w.status === 'dropped' || w.status === 'resolved' || w.status === 'expired';
  const cadence = terminal ? '' : beeperCadenceChip(w);
  return `<li class="beeper-row${dropped ? ' beeper-dropped' : ''}">`
    + `<div><strong>${escapeHtml(w.domain)}</strong>${who}${cadence} — <span class="beeper-state">${escapeHtml(beeperStateLabel(w))}</span><div class="muted beeper-meta">${escapeHtml(when)}</div></div>`
    + `<button type="button" class="beeper-stop" data-id="${escapeHtml(w.id)}">Stop</button>`
    + `</li>`;
}
function renderBeeper(watches) {
  if (!watches.length) { els.beeperList.innerHTML = '<li class="muted">No domains watched yet — add one above.</li>'; return; }
  const groups = { live: [], scheduled: [], done: [] };
  for (const w of watches) groups[beeperBucket(w)].push(w);
  const section = (title, hint, rows) => rows.length
    ? `<li class="beeper-group"><span class="beeper-group-title">${title}</span> <span class="muted">${hint}</span></li>` + rows.map(beeperRowHtml).join('')
    : '';
  els.beeperList.innerHTML =
      section('🎯 Drop watch — live', 'on the cusp — checked every minute / hourly', groups.live)
    + section('🕒 Long-term', 'far from expiry — checked occasionally, tightening as the date nears', groups.scheduled)
    + section('✓ Finished', 'dropped / renewed / stopped', groups.done);
  els.beeperList.querySelectorAll('.beeper-stop').forEach((b) => b.addEventListener('click', () => stopBeeperWatch(b.getAttribute('data-id'))));
}
async function addBeeperWatch() {
  const domain = (els.beeperDomain.value || '').trim();
  if (!domain) return;
  setToolStatus(els.beeperStatus, `Adding ${domain}…`);
  try {
    const res = await fetch('/research/api/beeper', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ domain }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    els.beeperDomain.value = '';
    const s = data.status;
    setToolStatus(els.beeperStatus, s && s.ok ? `Now watching — current status: ${s.available ? 'AVAILABLE' : (s.statuses.join(', ') || 'registered')}` : 'Now watching.');
    loadBeeper();
  } catch (e) {
    setToolStatus(els.beeperStatus, e.message || String(e), true);
  }
}
async function stopBeeperWatch(id) {
  if (!id) return;
  try {
    await fetch('/research/api/beeper', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'stop', id }) });
    loadBeeper();
  } catch { /* ignore */ }
}

// ── Whois — basic free domain lookup (RDAP + WHOIS) ─────────────────────────
async function runWhois(domain) {
  if (!els.whoisResult) return;
  const d = (domain || '').trim();
  if (!d) return;
  setActiveDomain(d);
  setToolStatus(els.whoisStatus, `Looking up ${escapeHtml(d)}…`);
  els.whoisResult.hidden = true;
  try {
    const res = await fetch(`/research/api/whois?domain=${encodeURIComponent(d)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Lookup failed (${res.status})`);
    setToolStatus(els.whoisStatus, '');
    renderWhois(data);
  } catch (e) {
    setToolStatus(els.whoisStatus, String((e && e.message) || e), true);
  }
}
function whoisDate(s) {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? escapeHtml(String(s)) : new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function whoisRow(label, val) {
  return val ? `<div class="wi-row"><span class="wi-k">${label}</span><span class="wi-v">${val}</span></div>` : '';
}
function whoisContact(title, c) {
  if (!c) return '';
  const rows = [['Name', c.name], ['Org', c.organization], ['Email', c.email], ['Phone', c.phone], ['Country', c.country], ['Region', c.region]]
    .filter((x) => x[1])
    .map((x) => `<div class="wi-row"><span class="wi-k">${x[0]}</span><span class="wi-v">${escapeHtml(String(x[1]))}</span></div>`).join('');
  return rows ? `<div class="wi-card"><h4>${title}</h4>${rows}</div>` : '';
}
// A shareable EXTERNAL whois link (whois.com) — free, public, no login — so a
// lookup can be handed to someone who doesn't have access to this app.
function whoisShareUrl(domain) {
  return `https://www.whois.com/whois/${encodeURIComponent(String(domain || '').trim().toLowerCase())}`;
}
function whoisShareHtml(domain) {
  const url = whoisShareUrl(domain);
  return `<div class="wi-share-row">`
    + `<button type="button" class="wi-share" data-share-url="${escapeHtml(url)}" title="Copy a public whois.com link to share">🔗 Copy share link</button>`
    + `<a class="wi-share-open" href="${escapeHtml(url)}" target="_blank" rel="noopener">open ↗</a>`
    + `</div>`;
}
function renderWhois(w) {
  if (w.available) {
    els.whoisResult.innerHTML = `<div class="wi-card wi-avail"><strong>${escapeHtml(w.domain)}</strong> appears <strong>AVAILABLE</strong> — no current registration record (RDAP returned not-found).${whoisShareHtml(w.domain)}</div>`;
    els.whoisResult.hidden = false;
    return;
  }
  const r = w.registrar || {};
  const reg = r.name
    ? escapeHtml(r.name) + (r.ianaId ? ` <span class="muted">(IANA ${escapeHtml(String(r.ianaId))})</span>` : '') + (r.url ? ` · <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">site</a>` : '') + (r.inferred ? ` <span class="muted">· via nameservers${r.inferredKind && r.inferredKind !== 'registrar' ? ` (${escapeHtml(r.inferredKind)})` : ''}</span>` : '')
    : null;
  const statuses = (w.statuses || []).length ? w.statuses.map((s) => `<span class="wi-tag">${escapeHtml(s)}</span>`).join(' ') : null;
  const ns = (w.nameservers || []).length ? w.nameservers.map((n) => `<div>${escapeHtml(n)}</div>`).join('') : null;
  const ab = w.abuse && (w.abuse.email || w.abuse.phone) ? [w.abuse.email, w.abuse.phone].filter(Boolean).map((x) => escapeHtml(String(x))).join(' · ') : null;
  // MX / email-in-use flag — active MX = the domain is set up to receive mail (a good
  // "the owner actually uses this address" signal); none = probably not using email here.
  const mx = w.mx || {};
  const mxHosts = (mx.records || []).slice(0, 3).map((x) => escapeHtml(x.host)).join('<br>') + ((mx.records || []).length > 3 ? `<br><span class="muted">+${mx.records.length - 3} more</span>` : '');
  const mxHtml = mx.active === true
    ? `<span style="color:#0b8f3a;font-weight:600">✓ active</span>${mx.provider ? ` <span class="muted">· ${escapeHtml(mx.provider)}</span>` : ''}${mxHosts ? `<div class="muted" style="margin-top:3px;font-size:12px;line-height:1.5">${mxHosts}</div>` : ''}`
    : mx.active === false
      ? `<span style="color:#b1442c;font-weight:600">✗ none</span> <span class="muted">— no mail server; likely not using email at this domain</span>`
      : `<span class="muted">? unknown (couldn't resolve MX)</span>`;
  const core = `<div class="wi-card"><h4>${escapeHtml(w.domain)}</h4>`
    + whoisShareHtml(w.domain)
    + whoisRow('Registrar', reg)
    + whoisRow('Registered', whoisDate(w.dates && w.dates.registered))
    + whoisRow('Expires', whoisDate(w.dates && w.dates.expires))
    + whoisRow('Updated', whoisDate(w.dates && w.dates.updated))
    + whoisRow('Status', statuses)
    + whoisRow('Nameservers', ns)
    + whoisRow('Email (MX)', mxHtml)
    + whoisRow('DNSSEC', w.dnssec == null ? null : (w.dnssec ? 'signed' : 'unsigned'))
    + whoisRow('Abuse', ab)
    + `</div>`;
  const c = w.contacts || {};
  const cards = whoisContact('Registrant', c.registrant) + whoisContact('Admin', c.admin) + whoisContact('Tech', c.tech);
  const note = (w.privacy && !cards) ? `<div class="wi-note">Registrant contact is privacy/proxy-protected or withheld (GDPR).</div>` : '';
  const src = `<div class="wi-src muted">Source: ${[w.sources && w.sources.rdap ? 'RDAP' : null, w.sources && w.sources.whois ? `WHOIS (${escapeHtml(w.sources.whois)})` : null].filter(Boolean).join(' + ') || '—'}</div>`;
  els.whoisResult.innerHTML = core + cards + note + src;
  els.whoisResult.hidden = false;
}

// ── Standalone tools (Trademark, Appraisal) ─────────────────────────────────
function setToolStatus(el, text, err = false) {
  if (!text) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = spinHtml(text, err);
  el.classList.toggle('error', err);
}
const pick = (o, keys) => {
  for (const k of keys) if (o && o[k] != null && o[k] !== '') return o[k];
  return '';
};

// Resolve a value (object/array/scalar) to a display string.
function resolve(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(resolve).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    for (const k of ['label', 'status', 'name', 'text', 'value', 'code', 'type', 'description', 'title']) {
      if (v[k] != null && typeof v[k] !== 'object') return String(v[k]);
    }
  }
  return '';
}
const pickr = (o, keys) => { for (const k of keys) { const r = resolve(o && o[k]); if (r) return r; } return ''; };
function statusBucket(s) {
  const t = String(s || '').toLowerCase();
  if (/abandon|dead|cancel|expired|withdrawn/.test(t)) return 'abandoned';
  if (/regist|\blive\b|active/.test(t)) return 'active';
  if (/pend|filed|review|allow|examin|published/.test(t)) return 'pending';
  return '';
}
// Domain → SLD for trademark queries (percent.ai → percent).
function toSld(input) {
  const s = String(input || '').trim().toLowerCase();
  if (/^[a-z0-9-]+(\.[a-z0-9.-]+)+$/.test(s)) return s.replace(/^www\./, '').split('.')[0];
  return s;
}

// ── Trademark tool ──
const tmPick = (key, cached) => {
  els.tmQuery.value = key;
  const items = Array.isArray(cached) ? cached : (cached && cached.items) || [];
  showTrademarks(key, items, !!(cached && cached.isAi));
};
// Open a tool deeplink/recent. Resolve order: local cache → server history →
// run. Trademark confirms before a fresh (paid) run; appraisal runs (the
// server tries a cached appraisal first, which is cheaper).
async function openToolSlug(kind, slug) {
  const hit = loadRecents(kind).find((r) => r.key === slug);
  if (hit) {
    if (kind === 'tm') tmPick(hit.key, hit.data);
    else apPick(hit.key, hit.data, hit.ts);
    return;
  }
  const statusEl = kind === 'tm' ? els.tmStatus : els.apStatus;
  setToolStatus(statusEl, 'Loading…');
  const saved = await serverGetTool(kind, slug);
  setToolStatus(statusEl, '');
  if (saved) {
    saveRecentLocal(kind, slug, saved.data);
    if (kind === 'tm') tmPick(slug, saved.data);
    else apPick(slug, saved.data, saved.updatedAt);
    return;
  }
  if (kind === 'tm') {
    els.tmQuery.value = slug;
    if (!confirm(`No saved trademark search for “${slug}”. Run a new USPTO search now? This uses paid credits.`)) return;
    runTrademark(slug);
  } else {
    els.apDomain.value = slug;
    runAppraisal(slug);
  }
}
// Signa status is an object: { primary: "active"|"dead"|…, stage: "registered"|…, challenges: [] }
function tmStatusInfo(s) {
  const primary = String((s && s.primary) || (typeof s === 'string' ? s : '')).toLowerCase();
  const stage = String((s && s.stage) || '').toLowerCase();
  const active = /active|live|registered/.test(primary);
  let bucket = '';
  if (/dead|abandon|cancel|expired|withdrawn/.test(primary) || /dead|abandon|cancel|expired/.test(stage)) bucket = 'abandoned';
  else if (stage === 'registered' && active) bucket = 'active';
  else if (active || /pend|applic|publish|allow|filed|exam/.test(stage)) bucket = 'pending';
  const label = [primary, stage].filter(Boolean).join(' · ') || 'unknown';
  return { active, stage, bucket, label, challenges: (s && s.challenges) || [] };
}
const tmClasses = (o) => (Array.isArray(o.classifications) ? o.classifications.map((c) => c.nice_class).filter((n) => n != null) : []);
const tmGoods = (o) => (Array.isArray(o.classifications) ? o.classifications.map((c) => c.goods_services_text || '').join(' ') : '');
const TECH_RE = /software|security|computer|internet|\bdata\b|platform|\bsaas\b|\bai\b|artificial intelligence|technolog|\bapp\b|\bapi\b|downloadable|mobile application|cloud|cybersecurity/i;
const isTechMark = (o) => tmClasses(o).some((n) => n === 9 || n === 42) || TECH_RE.test(tmGoods(o));
// Green / Yellow / Red screening read (per spec).
function tmScore(q, items) {
  const Q = String(q || '').toUpperCase();
  const reasons = [];
  let activeExact = 0, activeExactTech = 0, activeTech = 0;
  for (const o of items) {
    // Use the same active definition as the "Active only" filter (isActiveMark
    // → bucket !== 'abandoned'). Just checking tmStatusInfo(s).active lets a
    // mark slip in when primary says "registered" but stage shows it was later
    // cancelled/abandoned — bucket sees that, .active doesn't.
    if (!isActiveMark(o)) continue;
    const exact = String(o.mark_text || '').toUpperCase() === Q;
    const tech = isTechMark(o);
    if (exact) {
      activeExact++;
      if (tech) {
        activeExactTech++;
        const cls = tmClasses(o);
        reasons.push(`Active exact "${o.mark_text}"${cls.length ? ` in Class ${cls.join('/')}` : ''}${o.owner_name ? ` — ${o.owner_name}` : ''} (software/tech lane).`);
      }
    } else if (tech) {
      activeTech++;
    }
  }
  let bucket = 'green';
  if (activeExactTech > 0 || activeExact >= 2) bucket = 'red';
  else if (activeExact > 0 || activeTech > 0) bucket = 'yellow';
  if (bucket === 'red' && activeExactTech === 0 && activeExact >= 2) reasons.push(`${activeExact} active exact marks on this term.`);
  if (bucket === 'yellow' && activeExact > 0) reasons.push('Active exact mark(s) present, but not clearly in the core software/AI lane.');
  if (bucket === 'yellow' && activeExact === 0 && activeTech > 0) reasons.push('Active tech-lane marks with related relevance.');
  if (bucket === 'green') reasons.push('No active exact or tech-lane blocker in the first-pass screen.');
  return { bucket, reasons };
}
// Link a USPTO mark to its TSDR status page (serial first, then registration #).
function usptoLink(o) {
  const office = String(o.office_code || o.office || o.jurisdiction_code || '').toLowerCase();
  if (office && !/us|uspto/.test(office)) return '';
  const serial = String(o.application_number || o.serial_number || o.serial || '').replace(/\D/g, '');
  const regno = String(o.registration_number || o.registration || '').replace(/\D/g, '');
  if (serial) return `https://tsdr.uspto.gov/#caseNumber=${serial}&caseType=SERIAL_NO&searchType=statusSearch`;
  if (regno) return `https://tsdr.uspto.gov/#caseNumber=${regno}&caseType=US_REGISTRATION_NO&searchType=statusSearch`;
  return '';
}
// Repair mojibake (UTF-8 bytes mis-decoded as Latin-1, e.g. "IndÃºstria" ->
// "Indústria") that some USPTO/Signa records carry. Only touches strings with
// the tell-tale Ã/Â + continuation-byte pattern, so clean text is left alone.
function fixText(s) {
  s = String(s == null ? '' : s);
  if (!/[ÃÂ][-¿]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(Array.from(s, (c) => c.charCodeAt(0) & 0xff));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return s;
  }
}
// Word mark (protects the text) vs design/figurative (protects the logo/
// drawing). Maps Signa mark_feature_type / USPTO mark-drawing-type codes.
function markType(o) {
  const raw = String(o.mark_feature_type || o.mark_drawing_type || o.drawing_type || o.mark_type || o.feature_type || '')
    .toLowerCase()
    .trim();
  if (!raw) return null;
  if (/3d|three.?dimensional/.test(raw)) return { label: '3D mark', kind: 'other' };
  if (/sound/.test(raw)) return { label: 'Sound mark', kind: 'other' };
  if (/colou?r/.test(raw)) return { label: 'Color mark', kind: 'other' };
  if (/combin|design.?plus.?word|word.?and.?design|^3$/.test(raw)) return { label: 'Word + design', kind: 'combined' };
  if (/figurativ|design|image|logo|device|illustrat|drawing|styli|^[25]$/.test(raw)) return { label: 'Design mark', kind: 'design' };
  if (/word|standard.?char|typed|typeset|text|^[14]$/.test(raw)) return { label: 'Word mark', kind: 'word' };
  return { label: raw.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), kind: 'other' };
}
// Sort order for the list: active first, pending next, abandoned/inactive last.
const STATUS_RANK = { active: 0, pending: 1, abandoned: 2 };
function statusRank(o) {
  const b = tmStatusInfo(o.status).bucket;
  return b in STATUS_RANK ? STATUS_RANK[b] : 3;
}
function renderTrademarks(items) {
  return items
    .slice()
    .sort((a, b) => statusRank(a) - statusRank(b))
    .map((o) => {
      const mark = escapeHtml(fixText(o.mark_text || pickr(o, ['mark', 'markText', 'text', 'name']) || '(mark)'));
      const owner = escapeHtml(fixText(o.owner_name || pickr(o, ['owner', 'applicant', 'ownerName'])));
      const si = tmStatusInfo(o.status);
      const classes = tmClasses(o);
      const mt = markType(o);
      const badge = `<span class="tm-badge ${si.bucket}">${escapeHtml(si.label)}</span>`;
      const typeChip = mt ? `<span class="tm-type ${mt.kind}">${escapeHtml(mt.label)}</span>` : '';
      const ch = (si.challenges || []).length ? `<span class="tm-chip">${escapeHtml(si.challenges.join(', ').replace(/_/g, ' '))}</span>` : '';
      const fields = [
        classes.length && ['Class', escapeHtml(classes.join(', '))],
        o.filing_date && ['Filed', escapeHtml(o.filing_date)],
        o.registration_date && ['Registered', escapeHtml(o.registration_date)],
        o.registration_number && ['Reg. no', escapeHtml(o.registration_number)],
      ]
        .filter(Boolean)
        .map(([k, v]) => `<div class="tm-field"><dt>${k}</dt><dd>${v}</dd></div>`)
        .join('');
      const link = usptoLink(o);
      const linkHtml = link ? `<a class="tm-link" href="${escapeHtml(link)}" target="_blank" rel="noopener">USPTO listing ↗</a>` : '';
      const raw = escapeHtml(JSON.stringify(o, null, 2).slice(0, 1800));
      return (
        `<li class="tool-item tm-item">` +
        `<div class="tm-head"><span class="tool-title">${mark}</span>${badge}${typeChip}${ch}</div>` +
        (owner ? `<div class="tm-owner">${owner}</div>` : '') +
        (fields ? `<dl class="tm-fields">${fields}</dl>` : '') +
        (linkHtml ? `<div class="tm-actions">${linkHtml}</div>` : '') +
        `<details class="src-detail"><summary>raw</summary><pre>${raw}</pre></details>` +
        `</li>`
      );
    })
    .join('');
}
// "Active" = a live mark (registered or pending); "inactive" = abandoned /
// cancelled / dead / expired.
const isActiveMark = (o) => tmStatusInfo(o.status).bucket !== 'abandoned';
let tmActiveOnly = false;
let tmLast = null; // { q, items, isAi } — kept so the filter can re-render

function showTrademarks(q, items, isAi) {
  setToolUrl('trademark', q);
  tmLast = { q, items: items || [], isAi };
  renderTmResults();
}
function renderTmResults() {
  if (!tmLast) return;
  const { q, items, isAi } = tmLast;
  if (!items.length) {
    setToolStatus(els.tmStatus, `No trademarks found for "${q}".`);
    els.tmResults.innerHTML = '';
    return;
  }
  setToolStatus(els.tmStatus, '');
  const score = tmScore(q, items); // verdict is over ALL marks, not the filtered view
  const aiNote = isAi ? ' <span class="muted">(.ai → Classes 9 &amp; 42 weighted)</span>' : '';
  const banner =
    `<div class="tm-verdict ${score.bucket}"><div class="tm-verdict-head"><span class="tm-bucket">${score.bucket.toUpperCase()}</span> screening read for "${escapeHtml(q)}"${aiNote}</div>` +
    `<ul>${score.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` +
    `<div class="tm-caveat">First-pass screening only — not legal clearance.</div></div>`;

  const activeCount = items.filter(isActiveMark).length;
  const inactiveCount = items.length - activeCount;
  const filterBar =
    `<div class="tm-filter-bar"><button type="button" id="tm-active-toggle" class="tm-toggle${tmActiveOnly ? ' on' : ''}" aria-pressed="${tmActiveOnly}">${tmActiveOnly ? '✓ Active only' : 'Active only'}</button>` +
    `<span class="tm-filter-count">${activeCount} active · ${inactiveCount} inactive</span></div>`;

  const shown = tmActiveOnly ? items.filter(isActiveMark) : items;
  const list = shown.length ? renderTrademarks(shown) : '<li class="muted">No active marks — toggle off to see inactive ones.</li>';
  els.tmResults.innerHTML = banner + filterBar + list;
  const btn = document.getElementById('tm-active-toggle');
  if (btn) btn.addEventListener('click', () => { tmActiveOnly = !tmActiveOnly; renderTmResults(); });
}
async function runTrademark(input) {
  if (/\.[a-z]{2,}$/i.test(String(input || '').trim())) setActiveDomain(String(input).trim());
  const isAi = /\.ai$/i.test(String(input || '').trim());
  const q = toSld(input);
  els.tmResults.innerHTML = '';
  setToolStatus(els.tmStatus, `Searching trademarks for "${q}"…`);
  try {
    const res = await fetch(`/research/api/lookup?source=trademark_search&query=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || `Failed (${res.status})`);
    const items = (data.data && data.data.trademarks) || [];
    showTrademarks(q, items, isAi);
    saveRecent('tm', q, { items, isAi });
    refreshToolRecent(els.tmRecent, 'tm');
    // If you navigated away while the USPTO search ran, ding the bell.
    if (viewHidden('trademark')) {
      pushNotification({
        kind: 'trademark',
        title: `Trademark search ready — ${q}`,
        link: `/research/trademark/${encodeURIComponent(q)}`,
      });
    }
  } catch (e) {
    setToolStatus(els.tmStatus, e.message || String(e), true);
  }
}

// ── Appraisal tool ──
const apPick = (key, cached, updatedAt) => { setToolUrl('appraisal', key); els.apDomain.value = key; setToolStatus(els.apStatus, ''); renderAppraisal(key, cached, { updatedAt }); };
function fmtMoney(v) {
  if (v == null || v === '') return '';
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return isFinite(n) && n > 0 ? `$${n.toLocaleString()}` : String(v);
}
// Unwrap the valuation whether it's sync/cached (a.valuation) or a completed
// async job (a.results[0].valuation). Returns the object itself if already flat.
// Find the valuation object by its SIGNATURE (factors / value / range / notes),
// digging through a completed async-job envelope ({success, job_id, status, …})
// whose nesting field has drifted — mirrors findValuation() in lib/sources/appraise.js.
function looksLikeValuation(o) {
  return o && typeof o === 'object' && !Array.isArray(o) &&
    (o.factors != null || o.value_range != null || o.valueRange != null || o.range != null ||
      o.estimated_value != null || o.estimatedValue != null || o.value != null ||
      o.brandScore != null || o.brandability != null || o.appraisedValue != null ||
      o.fair_market_value != null || o.fairMarketValue != null ||
      (o.notes != null && o.domain != null));
}
function findValuation(o, depth) {
  depth = depth || 0;
  if (!o || typeof o !== 'object') return null;
  if (Array.isArray(o)) {
    for (const it of o) { const f = findValuation(it, depth + 1); if (f) return f; }
    return null;
  }
  if (looksLikeValuation(o)) return o;
  if (depth >= 4) return null;
  const wrap = ['valuation', 'appraisal', 'result', 'results', 'data', 'output', 'report', 'job', 'jobs'];
  for (const k of wrap) { if (o[k] != null) { const f = findValuation(o[k], depth + 1); if (f) return f; } }
  for (const v of Object.values(o)) { if (v && typeof v === 'object') { const f = findValuation(v, depth + 1); if (f) return f; } }
  return null;
}
function digAppraisal(o) {
  if (!o || typeof o !== 'object') return o;
  return findValuation(o) || (o.valuation || (Array.isArray(o.results) && o.results[0] && (o.results[0].valuation || o.results[0])) || o.appraisal || o.result || o);
}
function appraisalRange(a) {
  if (!a || typeof a !== 'object') return '';
  const r = a.value_range || a.range || a.valueRange || a.priceRange || a.estimatedValue || a.estimated_value;
  if (r && typeof r === 'object') {
    const lo = r.low ?? r.min ?? r.from ?? r.low_value;
    const hi = r.high ?? r.max ?? r.to ?? r.high_value;
    if (lo != null || hi != null) return [fmtMoney(lo), fmtMoney(hi)].filter(Boolean).join(' – ');
  }
  if (typeof r === 'string') return r.replace(/\d{4,}/g, (n) => Number(n).toLocaleString());
  const lo = a.low_value ?? a.low ?? a.min_value ?? a.value_low ?? a.minValue ?? a.min ?? a.valueLow ?? a.priceLow;
  const hi = a.high_value ?? a.high ?? a.max_value ?? a.value_high ?? a.maxValue ?? a.max ?? a.valueHigh ?? a.priceHigh;
  if (lo != null || hi != null) return [fmtMoney(lo), fmtMoney(hi)].filter(Boolean).join(' – ');
  const v = pickr(a, ['estimated_value', 'estimatedValue', 'value', 'valuation', 'price', 'fair_market_value', 'fairMarketValue', 'marketValue', 'appraisedValue', 'appraised_value', 'estimate']);
  return v ? fmtMoney(v) : '';
}
// Atom.com second-opinion valuation, shown alongside the Appraise.net result.
// Cache-first (kind 'at') because Atom has a hard ~10/day cap — a re-view must
// never re-spend. The key not being configured hides the panel entirely; a
// daily-limit / error shows a quiet note rather than breaking the page.
async function loadAtomAppraisal(domain, el) {
  if (!el || !domain) return;
  el.hidden = true; el.innerHTML = ''; el.dataset.domain = domain;
  let data = null;
  try {
    const c = await fetch(`/research/api/lookup?kind=at&query=${encodeURIComponent(domain)}`);
    const cj = await c.json().catch(() => ({}));
    if (cj && cj.found && cj.data) data = cj.data;
  } catch { /* cache miss */ }
  if (!data) {
    try {
      const r = await fetch(`/research/api/lookup?source=atom_appraise&domain=${encodeURIComponent(domain)}`);
      const rj = await r.json().catch(() => ({}));
      // Cache a definitive result — a real value OR a stable "unavailable for this
      // TLD" answer — so a re-view never re-spends a quota slot. (Transient
      // auth/limit errors come back ok:false and are NOT cached.)
      if (rj && rj.ok && rj.data && (rj.data.value != null || rj.data.unavailable)) {
        data = rj.data;
        fetch('/research/api/lookup', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind: 'at', query: domain, data }),
        }).catch(() => {});
      } else if (rj && rj.ok === false) {
        const err = String(rj.error || '');
        // Key not set on the server → no second opinion at all, stay hidden.
        if (/not configured/i.test(err)) { el.hidden = true; return; }
        if (el.dataset.domain === domain) renderAtomError(el, err); // limit / other → quiet note
        return;
      }
    } catch { /* leave hidden */ }
  }
  if (el.dataset.domain !== domain) return; // a newer domain superseded this one
  renderAtomAppraisal(el, data);
}
function renderAtomError(el, err) {
  el.innerHTML =
    `<div class="ap-atom-head"><span class="ap-atom-badge">Atom</span> Second opinion</div>` +
    `<div class="ap-atom-err muted">${escapeHtml(err || 'unavailable')}</div>`;
  el.hidden = false;
}
function renderAtomAppraisal(el, data) {
  if (!data) { el.hidden = true; el.innerHTML = ''; return; }
  if (data.value == null) {
    // Definitive "no valuation" (e.g. unsupported TLD) — show the reason quietly.
    if (data.unavailable && data.note) { renderAtomError(el, data.note); return; }
    el.hidden = true; el.innerHTML = ''; return;
  }
  const val = '$' + Number(data.value).toLocaleString();
  const score = (data.score != null) ? `<span class="ap-atom-score">${escapeHtml(String(data.score))}/10</span>` : '';
  const pos = Array.isArray(data.positive_signals) ? data.positive_signals : [];
  const neg = Array.isArray(data.negative_signals) ? data.negative_signals : [];
  const sig = [
    ...pos.map((s) => `<li class="pos">+ ${escapeHtml(resolve(s) || s)}</li>`),
    ...neg.map((s) => `<li class="neg">− ${escapeHtml(resolve(s) || s)}</li>`),
  ].join('');
  const tm = (data.tm_conflicts != null && Number(data.tm_conflicts) > 0)
    ? ` <span class="ap-atom-tm" title="Trademark conflicts (USPTO)">⚠ ${escapeHtml(String(data.tm_conflicts))} TM</span>` : '';
  const u = data.usage || {};
  const quota = (u.remaining != null && u.daily_limit != null)
    ? `<span class="ap-atom-quota">${escapeHtml(String(u.remaining))}/${escapeHtml(String(u.daily_limit))} left today</span>` : '';
  el.innerHTML =
    `<div class="ap-atom-head"><span class="ap-atom-badge">Atom</span> Second opinion ${quota}</div>` +
    `<div class="ap-atom-val">${val} ${score}${tm}</div>` +
    (sig ? `<ul class="ap-atom-sig">${sig}</ul>` : '');
  el.hidden = false;
}

function renderAppraisal(domain, a, meta) {
  const range = appraisalRange(a);
  const conf = pickr(a, ['confidence', 'confidence_level', 'confidenceLabel', 'confidenceScore', 'confidence_score']);
  const type = pickr(a, ['type', 'semanticType', 'semantic_type', 'domain_type', 'appraisal_type', 'category']);
  const cert = pickr(a, ['certificate_url', 'certificateUrl', 'certificate', 'url', 'cert_url']);
  const title = pickr(a, ['title', 'listingTitle', 'listing_title']);
  const rows = [
    range && `<div class="ap-value">${escapeHtml(range)}</div>`,
    conf && `<div class="ap-field"><span>Confidence</span> ${escapeHtml(conf)}</div>`,
    type && `<div class="ap-field"><span>Type</span> ${escapeHtml(type)}</div>`,
    title && `<div class="ap-field"><span>Title</span> ${escapeHtml(title)}</div>`,
    cert && `<div class="ap-field"><span>Certificate</span> <a href="${escapeHtml(cert)}" target="_blank" rel="noopener">view</a></div>`,
  ]
    .filter(Boolean)
    .join('');
  const block = (arr, label) =>
    Array.isArray(arr) && arr.length
      ? `<div class="ap-block"><h3>${label}</h3><ul>${arr.map((x) => `<li>${escapeHtml(resolve(x) || x)}</li>`).join('')}</ul></div>`
      : '';
  const analysis = pickr(a, ['marketAnalysis', 'market_analysis', 'analysis', 'notes', 'summary']);
  const cats = Array.isArray(a.applicableCategories) ? a.applicableCategories : (Array.isArray(a.categories) ? a.categories : []);
  const catStr = cats.map((c) => escapeHtml(resolve(c) || c)).filter(Boolean).join(', ');
  // Dictionary definition — attached server-side by api/lookup.js when the
  // SLD is a known English word with a backfilled entry in english_words.
  // Lets a buyer corroborate the appraisal's word-meaning claims (the
  // "premium action verb" angle) against the actual dictionary sense.
  const def = a && typeof a.definition === 'object' && a.definition ? a.definition : null;
  const defBlock = (() => {
    if (!def || !Array.isArray(def.senses) || !def.senses.length) return '';
    const phonetic = def.phonetic ? ` <span class="ap-phonetic">${escapeHtml(def.phonetic)}</span>` : '';
    // Consolidated part-of-speech set (every form the word can take) — surfaces
    // the "ambiguous word, multiple POS" angle at a glance, e.g. venture → noun·verb.
    const allPos = [...new Set(def.senses.map((s) => s && s.pos).filter(Boolean))];
    const posSet = allPos.length
      ? ` <span class="ap-pos-set">${allPos.map((p) => `<span class="ap-pos">${escapeHtml(p)}</span>`).join('')}</span>` : '';
    const senses = def.senses
      .map((s) => {
        const pos = s && s.pos ? `<span class="ap-pos">${escapeHtml(s.pos)}</span>` : '';
        const defs = Array.isArray(s && s.defs) ? s.defs : [];
        if (!defs.length) return '';
        const list = defs.map((d) => `<li>${escapeHtml(String(d || ''))}</li>`).join('');
        return `<div class="ap-sense">${pos}<ol>${list}</ol></div>`;
      })
      .filter(Boolean)
      .join('');
    if (!senses) return '';
    return `<div class="ap-block ap-definition"><h3>Definition${phonetic}${posSet}</h3>${senses}</div>`;
  })();
  const raw = escapeHtml(JSON.stringify(a, null, 2).slice(0, 4000));
  // "Last appraised <ago> · Refresh" line — lets the user see freshness and
  // re-run a paid appraisal when the cached one is stale.
  const updatedAt = meta && meta.updatedAt;
  // Provider badge (parallel to the Atom "second opinion" pill) + freshness/refresh.
  const freshness = updatedAt
    ? ` Appraised ${escapeHtml(agoLabel(updatedAt))} · <button type="button" class="ap-refresh" data-refresh="${escapeHtml(domain)}">Refresh</button>`
    : '';
  const metaRow = `<div class="ap-meta"><span class="ap-badge ap-badge-primary">Appraise.net</span>${freshness}</div>`;
  els.apResult.hidden = false;
  els.apResult.innerHTML =
    `<div class="tool-title">${escapeHtml(domain)}</div>` +
    metaRow +
    (rows || '<div class="muted">No value fields recognized — see the raw appraisal below.</div>') +
    defBlock +
    (analysis ? `<div class="ap-block"><h3>Market analysis</h3><p>${escapeHtml(analysis)}</p></div>` : '') +
    block(a.strengths || a.pros, 'Why it scored well') +
    block(a.weaknesses || a.cons || a.knocks, 'Main knocks') +
    (catStr ? `<div class="ap-field"><span>Categories</span> ${catStr}</div>` : '') +
    `<details class="src-detail"><summary>full appraisal</summary><pre>${raw}</pre></details>`;
  loadNameBio(domain, els.apNamebio); // NameBio previous-sales call-out (cached)
  loadAtomAppraisal(domain, els.apAtom); // Atom second-opinion valuation (cached; ~10/day cap)
  // Wire the Refresh button (re-renders happen each time, so re-bind every render).
  const refreshBtn = els.apResult.querySelector('button.ap-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      const d = refreshBtn.getAttribute('data-refresh') || domain;
      runAppraisal(d, { force: true });
    });
  }
}
function finishAppraisal(domain, a, def) {
  // The dictionary definition rides on the response's TOP level (data.definition),
  // but digAppraisal() returns a nested valuation object — so carry it across
  // here, before render + caching, so it survives and re-opens from Recent show it.
  if (def && a && typeof a === 'object' && !a.definition) a = { ...a, definition: def };
  const wasAway = viewHidden('appraisal'); // capture before setToolUrl/render
  setToolUrl('appraisal', domain);
  setToolStatus(els.apStatus, '');
  renderAppraisal(domain, a, { updatedAt: Date.now() });
  saveRecent('ap', domain, a);
  refreshToolRecent(els.apRecent, 'ap');
  // Ding the bell only if you'd navigated away while it ran in the background.
  if (wasAway) {
    pushNotification({
      kind: 'appraisal',
      title: `Appraisal ready — ${domain}`,
      link: `/research/appraisal/${encodeURIComponent(domain)}`,
    });
  }
}
async function pollAppraisal(domain, jobId) {
  const started = Date.now();
  for (let i = 0; i < 40; i++) {
    setToolStatus(els.apStatus, `Appraising ${domain}… (${Math.round((Date.now() - started) / 1000)}s)`);
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await fetch(`/research/api/lookup?source=appraise_lookup&job_id=${encodeURIComponent(jobId)}&domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (data && data.ok === false) { setToolStatus(els.apStatus, data.error || 'Appraisal service error.', true); return; }
      const st = (data && data.data) || {};
      const statusStr = String(st.status || st.state || '');
      const v = digAppraisal(st);
      const ready = (v && typeof v === 'object' && v !== st) || appraisalRange(v) || /complete|done|success|finished/i.test(statusStr);
      if (ready && v && typeof v === 'object') {
        finishAppraisal(domain, v, st.definition);
        return;
      }
      if (/fail|error|cancel/i.test(statusStr)) { setToolStatus(els.apStatus, `Appraisal ${statusStr}.`, true); return; }
    } catch (e) { /* keep polling */ }
  }
  setToolStatus(els.apStatus, 'Still processing — try again shortly.', true);
}
async function runAppraisal(domainInput, opts) {
  const domain = String(domainInput || '').trim();
  if (domain) setActiveDomain(domain);
  const force = !!(opts && opts.force);
  els.apResult.hidden = true;
  els.apResult.innerHTML = '';
  // Clear the prior domain's NameBio panel so it doesn't linger while the new
  // appraisal runs (renderAppraisal reloads it for the new domain).
  if (els.apNamebio) { els.apNamebio.hidden = true; els.apNamebio.innerHTML = ''; els.apNamebio.dataset.domain = ''; }
  if (els.apAtom) { els.apAtom.hidden = true; els.apAtom.innerHTML = ''; els.apAtom.dataset.domain = ''; }
  setToolStatus(els.apStatus, force ? `Re-appraising ${domain}…` : `Appraising ${domain}…`);
  try {
    const qs = `source=appraise_lookup&domain=${encodeURIComponent(domain)}${force ? '&force=1' : ''}`;
    const res = await fetch(`/research/api/lookup?${qs}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || `Failed (${res.status})`);
    const d = data.data || {};
    // A real valuation is always an OBJECT. Appraise.net occasionally returns an
    // error as a 200-with-string (e.g. their DB "Too many connections"); guard so
    // that never renders as an empty "No value fields recognized" appraisal.
    const okVal = (v) => v && typeof v === 'object';
    if (d.appraisal != null) {
      const v = digAppraisal(d.appraisal);
      if (okVal(v)) finishAppraisal(domain, v, d.definition);
      else throw new Error('The appraisal service is temporarily unavailable — please try again shortly.');
    } else if (d.job_id) {
      await pollAppraisal(domain, d.job_id);
    } else {
      const v = digAppraisal(d);
      if (okVal(v)) finishAppraisal(domain, v, d.definition);
      else throw new Error('The appraisal service is temporarily unavailable — please try again shortly.');
    }
  } catch (e) {
    const aborted = e && (e.name === 'AbortError' || /abort/i.test(String((e && e.message) || e)));
    setToolStatus(
      els.apStatus,
      aborted
        ? 'The request was interrupted (this can happen on mobile / when the tab loses focus) — tap Appraise to try again. A just-run appraisal is cached, so the retry is quick.'
        : (e.message || String(e)),
      true,
    );
  }
}

// Last few runs, shown under the search bar on the homepage.
async function loadRecent() {
  if (!els.recent) return;
  try {
    const res = await fetch('/research/api/research?list=1');
    const data = await res.json();
    if (!res.ok) throw new Error('failed');
    const runs = (data.runs || []).slice(0, 5);
    if (!runs.length) { els.recent.hidden = true; return; }
    els.recentList.innerHTML = runs
      .map((r) => {
        const when = r.created_at ? new Date(r.created_at).toLocaleString() : '';
        const active = r.status === 'running' || r.status === 'queued';
        return `<li class="recent-run" data-id="${escapeHtml(r.id)}"><span class="recent-domain">${escapeHtml(r.domain || '(unknown)')}</span><span class="recent-when">${active ? 'researching…' : escapeHtml(when)}</span></li>`;
      })
      .join('');
    els.recent.hidden = false;
  } catch {
    els.recent.hidden = true;
  }
}

// Reset the research view to the entry hero (the "New" nav button / logo).
function showEntry() {
  clearTimers();
  if (location.pathname !== '/research' && location.pathname !== '/research/') history.pushState(null, '', '/research/');
  clearHash();
  showView('research');
  els.hero.hidden = false;
  setReportTitle(null);
  els.reportConfidence.hidden = true;
  els.reportActions.hidden = true;
  els.status.hidden = true;
  if (els.runControls) els.runControls.hidden = true;
  els.report.hidden = true;
  if (els.reportFeedback) els.reportFeedback.hidden = true;
  if (els.reportNotes) els.reportNotes.hidden = true;
  if (els.reportChat) { els.reportChat.hidden = true; chatLoadedFor = null; }
  els.deepenTop.hidden = true;
  els.deepenBar.hidden = true;
  if (els.marketStrip) els.marketStrip.hidden = true;
  // Company vitals + Deeper dives render per report — clear them too, or they'd
  // sit stale under the Recent list when you come back to the entry hero.
  if (els.companyVitals) { els.companyVitals.hidden = true; els.companyVitals.innerHTML = ''; delete els.companyVitals.dataset.domain; }
  if (els.reportAddons) { els.reportAddons.hidden = true; els.reportAddons.innerHTML = ''; delete els.reportAddons.dataset.owner; }
  els.evidence.hidden = true;
  currentRunId = null;
  els.domain.value = '';
  setBatchStatus('');
  autoResizeDomain();
  // Re-enable the search submit. A run sets els.go.disabled = true and relies on
  // the polling completion handler to re-enable it — but coming back to the entry
  // (back button or "+ New report") clears that timer, so the button would stay
  // greyed out forever. Re-apply the permission gate (keeps it disabled only when
  // the user genuinely lacks shallow+deep access).
  if (currentUser) gateReportPhaseUI(currentUser);
  else if (els.go) els.go.disabled = false;
  loadRecent();
}

// ── Playbook lessons ────────────────────────────────────────────────────────
// Refine-chat refinements get distilled into reusable rules. Any signed-in
// user can submit a lesson; admins approve before it joins the agent's
// system prompt on the next research run.
let lessonModalContext = null; // { runId, messageId } during save flow

async function openLessonModal(messageId) {
  if (!currentRunId || !messageId) return;
  lessonModalContext = { runId: currentRunId, messageId };
  resetLessonModal();
  if (els.lessonModalHeading) els.lessonModalHeading.textContent = 'Save as playbook strategy';
  if (els.lessonModalSub) els.lessonModalSub.textContent = 'Distilling the rule from this exchange. Edit before submitting — a super admin reviews and approves before it goes live.';
  showLessonModal(true);
  setLessonModalBusy(true, 'Distilling the rule…');
  try {
    const res = await fetch('/research/api/lessons', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'distill', run_id: currentRunId, message_id: messageId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Distill failed (${res.status})`);
    const draft = data.draft || {};
    if (draft.empty) {
      // The distiller saw no generalizable rule. Let the user write one
      // from scratch rather than dead-ending them.
      setLessonModalError('Couldn\'t auto-distill a generalizable rule from this exchange — feel free to write one yourself.');
    }
    if (els.lessonModalTitle) els.lessonModalTitle.value = draft.title || '';
    if (els.lessonModalBody) els.lessonModalBody.value = draft.body || '';
    if (els.lessonModalTags) els.lessonModalTags.value = (Array.isArray(draft.tags) ? draft.tags : []).join(', ');
  } catch (e) {
    setLessonModalError(String(e.message || e));
  } finally {
    setLessonModalBusy(false);
  }
}

// Standalone "Suggest a tip" — open a blank lesson form (no chat distill).
function openTipModal() {
  // Anchor the strategy to the current report when one is open (so the curator
  // sees what prompted it), else a free-standing submission.
  lessonModalContext = { runId: currentRunId || null, messageId: null };
  resetLessonModal();
  if (els.lessonModalHeading) els.lessonModalHeading.textContent = 'Suggest a Strategy';
  if (els.lessonModalSub) els.lessonModalSub.textContent = 'Share a research tactic for the playbook. A super admin reviews and approves before it goes live.';
  showLessonModal(true);
}

function resetLessonModal() {
  if (els.lessonModalTitle) els.lessonModalTitle.value = '';
  if (els.lessonModalBody) els.lessonModalBody.value = '';
  if (els.lessonModalTags) els.lessonModalTags.value = '';
  if (els.lessonModalError) { els.lessonModalError.hidden = true; els.lessonModalError.textContent = ''; }
}

function showLessonModal(open) {
  if (!els.lessonModal) return;
  els.lessonModal.hidden = !open;
  document.body.classList.toggle('modal-open', !!open);
  if (open && els.lessonModalTitle) setTimeout(() => els.lessonModalTitle.focus(), 50);
}

function setLessonModalBusy(busy, msg) {
  if (els.lessonModalSubmit) els.lessonModalSubmit.disabled = !!busy;
  if (busy && msg) setLessonModalError(msg);
}

function setLessonModalError(text) {
  if (!els.lessonModalError) return;
  if (!text) { els.lessonModalError.hidden = true; els.lessonModalError.textContent = ''; return; }
  els.lessonModalError.textContent = text;
  els.lessonModalError.hidden = false;
}

async function submitLessonModal() {
  const ctx = lessonModalContext || {};
  const title = (els.lessonModalTitle?.value || '').trim();
  const body = (els.lessonModalBody?.value || '').trim();
  const tagsRaw = (els.lessonModalTags?.value || '').trim();
  if (!title || !body) { setLessonModalError('Title and body are both required.'); return; }
  const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
  setLessonModalBusy(true);
  try {
    const res = await fetch('/research/api/lessons', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        title, body, tags,
        source_run_id: ctx.runId || null,
        source_chat_message_id: ctx.messageId || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
    showLessonModal(false);
    lessonModalContext = null;
  } catch (e) {
    setLessonModalError(String(e.message || e));
  } finally {
    setLessonModalBusy(false);
  }
}

// Lessons: list/curate playbook lessons. This is the only thing the research
// "Lessons" view does now — user/permission administration lives solely in the
// umbrella Admin module (app.snagged.com/admin → Users).
async function loadLessons() {
  if (!els.lessonList) return;
  if (els.lessonListError) els.lessonListError.hidden = true;
  try {
    const res = await fetch('/research/api/lessons?status=all');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Failed to load lessons (${res.status})`);
    renderLessons(data.lessons || []);
  } catch (e) {
    if (els.lessonListError) { els.lessonListError.textContent = String(e.message || e); els.lessonListError.hidden = false; }
  }
}

function renderLessons(lessons) {
  if (!els.lessonList) return;
  if (!lessons.length) {
    els.lessonList.hidden = true;
    if (els.lessonListEmpty) els.lessonListEmpty.hidden = false;
    return;
  }
  if (els.lessonListEmpty) els.lessonListEmpty.hidden = true;
  // Pending first, then approved, then disabled — what the admin most needs
  // to act on comes to the top.
  const order = { pending: 0, approved: 1, disabled: 2 };
  const sorted = [...lessons].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  els.lessonList.innerHTML = sorted.map(renderLessonRow).join('');
  els.lessonList.hidden = false;
}

function renderLessonRow(l) {
  const tags = Array.isArray(l.tags) && l.tags.length
    ? l.tags.map((t) => `<span class="lesson-tag">${escapeHtml(t)}</span>`).join('')
    : '<span class="lesson-tag lesson-tag-empty">no tags</span>';
  return (
    `<div class="lesson-row lesson-status-${escapeHtml(l.status)}" data-id="${escapeHtml(l.id)}">` +
      `<div class="lesson-row-head">` +
        `<span class="lesson-status-pill lesson-status-${escapeHtml(l.status)}">${escapeHtml(l.status)}</span>` +
        `<strong class="lesson-row-title">${escapeHtml(l.title)}</strong>` +
        `<span class="lesson-row-meta">applied ${Number(l.applied_count || 0)}× · ${new Date(l.created_at).toLocaleDateString()}</span>` +
      `</div>` +
      `<textarea class="lesson-row-body" data-field="body" rows="3">${escapeHtml(l.body)}</textarea>` +
      `<input class="lesson-row-tags" data-field="tags" type="text" value="${escapeHtml((l.tags || []).join(', '))}" placeholder="comma-separated tags" />` +
      `<div class="lesson-row-actions">` +
        (l.status !== 'approved' ? `<button type="button" data-action="approve">Approve</button>` : '') +
        (l.status !== 'disabled' ? `<button type="button" data-action="disable">Disable</button>` : '') +
        (l.status === 'disabled' ? `<button type="button" data-action="approve">Re-approve</button>` : '') +
        `<button type="button" data-action="save">Save edits</button>` +
        `<button type="button" data-action="delete" class="lesson-row-delete">Delete</button>` +
      `</div>` +
      `<p class="lesson-row-error" hidden></p>` +
    `</div>`
  );
}

async function patchLesson(id, patch, rowEl) {
  const errEl = rowEl && rowEl.querySelector('.lesson-row-error');
  if (errEl) errEl.hidden = true;
  try {
    const res = await fetch('/research/api/lessons', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Update failed (${res.status})`);
    return data.lesson;
  } catch (e) {
    if (errEl) { errEl.textContent = String(e.message || e); errEl.hidden = false; }
    return null;
  }
}

// ── Naming Exercise ─────────────────────────────────────────────────────────
// Brief → Haiku parse → name_universe query → 9-column results split into
// Buy-ready vs Stretch buckets. Implementation spec §1-5.
let namingLastResults = null; // cached for CSV/Sheet export of the current view

// Filters panel multi-selects on the naming screen (reuse the .dbs-multi
// collapsible-checkbox pattern). Each is backed by a Set that persists as
// "memory" across searches — runNaming() reads them but never clears them.
//
// initNamingMulti(prefix, set, options, opts) wires one dropdown to its Set.
//   options : [{ value, label }] (or bare strings) — the checkbox rows.
//   opts.allLabel  : summary text when 0 OR all options are selected (the
//                    "unconstrained" state, e.g. "Any" for connotation).
//   opts.noneLabel : summary text when nothing is selected (e.g. "None" for
//                    word-form exclusions, where empty = exclude nothing).
function initNamingMulti(prefix, set, options, opts = {}) {
  const list = document.getElementById(`nm-${prefix}-list`);
  const label = document.getElementById(`nm-${prefix}-label`);
  const count = document.getElementById(`nm-${prefix}-count`);
  if (!list || list._init) return;
  list._init = true;
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const labelOf = (v) => (norm.find((o) => o.value === v) || { label: v }).label;
  const summary = () => {
    const all = opts.allLabel != null && (set.size === 0 || set.size >= norm.length);
    if (all) { count.textContent = ''; label.textContent = opts.allLabel; return; }
    if (set.size === 0) { count.textContent = ''; label.textContent = opts.noneLabel || 'Any'; return; }
    count.textContent = String(set.size);
    label.textContent = [...set].map(labelOf).join(', ');
  };
  list.innerHTML = norm.map((o) =>
    `<label class="dbs-multi-opt"><input type="checkbox" value="${escapeHtml(o.value)}"${set.has(o.value) ? ' checked' : ''}/>`
    + `<span class="dbs-multi-optlabel">${escapeHtml(o.label)}</span>`
    + `<button type="button" class="dbs-multi-only" data-value="${escapeHtml(o.value)}" tabindex="-1" title="Select only ${escapeHtml(o.label)}">only</button></label>`).join('');
  list.addEventListener('change', (e) => {
    const cb = e.target.closest('input[type="checkbox"]'); if (!cb) return;
    if (cb.checked) set.add(cb.value); else set.delete(cb.value);
    summary();
  });
  // "only" shortcut: select just this one value (clears the rest). preventDefault
  // stops the surrounding <label> from also toggling its checkbox on the click.
  list.addEventListener('click', (e) => {
    const only = e.target.closest('.dbs-multi-only'); if (!only) return;
    e.preventDefault();
    e.stopPropagation();
    setValues([only.dataset.value]);
  });
  summary();
  // Programmatically set the selection (used to sync TLDs to the parsed brief).
  function setValues(values) {
    const vals = new Set(values || []);
    set.clear();
    list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      const on = vals.has(cb.value);
      cb.checked = on;
      if (on) set.add(cb.value);
    });
    summary();
  }
  return { setValues };
}

// Connotation: default all 5 (= "Any", no constraint). A selected subset is
// sent and becomes a results criterion (off-tone enriched rows drop; unenriched
// rows pass). Keeps the nm-con-* ids and namingConSet state.
const namingConSet = new Set(DS_CONNOTATIONS);
// Word-form exclusions: default NONE selected (exclude nothing). Selecting a
// form EXCLUDES those names. Stable keys sent as exclude:[...].
const namingExcludeSet = new Set();
const NM_EXCLUDE_OPTS = [
  { value: 'plural', label: 'Plurals' },
  { value: 'past', label: 'Past tense' },
  { value: 'ing', label: '-ing' },
  { value: 'ly', label: '-ly' },
];
// Part of speech: default ALL (= "Any", no constraint). A narrowed subset is sent
// and keeps names that CAN be one of the chosen parts of speech (WordNet multi-tags
// e.g. venture = noun+verb). Universe-only enrichment; populated by the POS backfill.
const NM_POS_OPTS = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
];
const namingPosSet = new Set(NM_POS_OPTS.map((o) => o.value));
// TLDs: default ALL checked. We only send a tlds override when the user narrows
// to a proper subset; otherwise the brief decides (a brief-specified TLD wins;
// a silent brief = all TLDs). After each search we sync the dropdown to the
// brief's effective TLDs so it reflects what was actually used.
const NM_TLD_OPTS = ['com', 'net', 'org', 'io', 'ai', 'co', 'app', 'dev', 'xyz']
  .map((t) => ({ value: t, label: '.' + t }));
const namingTldSet = new Set(NM_TLD_OPTS.map((o) => o.value));
let namingTldCtl = null;
function initNamingFilters() {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  initNamingMulti('con', namingConSet, DS_CONNOTATIONS.map((c) => ({ value: c, label: cap(c) })), { allLabel: 'Any' });
  initNamingMulti('pos', namingPosSet, NM_POS_OPTS, { allLabel: 'Any' });
  initNamingMulti('exc', namingExcludeSet, NM_EXCLUDE_OPTS, { noneLabel: 'None' });
  namingTldCtl = initNamingMulti('tld', namingTldSet, NM_TLD_OPTS, { allLabel: 'All' });
}
initNamingFilters();

// Parse a price input → finite number or null (empty / invalid = no bound).
function numOrNull(v) {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Current Filters-panel state as a payload. Sent with BOTH search and the
// refine-chat so a chat refinement respects exactly what's in the panel right
// now (especially TLD) instead of stale saved run filters.
function namingFilterPayload() {
  return {
    connotation: [...namingConSet],
    // Only send a POS override when narrowed to a proper subset; all/none = "Any".
    part_of_speech: (namingPosSet.size === 0 || namingPosSet.size >= NM_POS_OPTS.length) ? null : [...namingPosSet],
    exclude: [...namingExcludeSet],
    // TLD override only when narrowed to a proper subset; all/none = no override.
    tlds: (namingTldSet.size === 0 || namingTldSet.size >= NM_TLD_OPTS.length) ? null : [...namingTldSet],
    price_min: numOrNull(els.namingPriceMin && els.namingPriceMin.value),
    price_max: numOrNull(els.namingPriceMax && els.namingPriceMax.value),
    len_min: numOrNull(els.namingLenMin && els.namingLenMin.value),
    len_max: numOrNull(els.namingLenMax && els.namingLenMax.value),
    syllables_min: numOrNull(els.namingSylMin && els.namingSylMin.value),
    syllables_max: numOrNull(els.namingSylMax && els.namingSylMax.value),
    words_min: numOrNull(els.namingWordsMin && els.namingWordsMin.value),
    words_max: numOrNull(els.namingWordsMax && els.namingWordsMax.value),
  };
}

// Naming has two modes: 'theme' (parse a brief → search the marketplace corpus by
// theme — the default) and 'variations' (take a LOCKED word and enumerate its
// prefix/suffix/TLD variants with live for-sale/availability). The mode toggle
// swaps the input hint + which results section renders.
let namingMode = 'theme';
let variationsLast = null;
// Click-to-filter state for the criteria chips. `kind` holds a whole TYPE
// ('prefix'/'suffix'/'extension'); `affix` holds "prefix:get" / "suffix:hq" keys
// (a row's kind+affix); `tld` holds bare extensions ("com"). Empty = show all.
// Across facets it's AND; within a facet it's OR.
const variationsFilter = { kind: new Set(), affix: new Set(), tld: new Set() };
function resetVariationsFilter() { variationsFilter.kind.clear(); variationsFilter.affix.clear(); variationsFilter.tld.clear(); }
// A row's type: prefix / suffix / extension (the enumerator's 'tld' kind).
function rowKind(r) { return r.kind === 'tld' ? 'extension' : r.kind; }
function rowMatchesFilter(r) {
  const kf = variationsFilter.kind; const af = variationsFilter.affix; const tf = variationsFilter.tld;
  if (kf.size && !kf.has(rowKind(r))) return false;
  if (af.size) { if (r.kind === 'tld' || !af.has(`${r.kind}:${r.affix}`)) return false; }
  if (tf.size) { const dot = r.domain.lastIndexOf('.'); const tld = dot >= 0 ? r.domain.slice(dot + 1).toLowerCase() : ''; if (!tf.has(tld)) return false; }
  return true;
}

function setNamingMode(mode) {
  namingMode = mode === 'variations' ? 'variations' : 'theme';
  if (els.namingMode) {
    els.namingMode.querySelectorAll('.naming-mode-btn').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.mode === namingMode);
    });
  }
  const variations = namingMode === 'variations';
  if (els.namingInput) {
    els.namingInput.rows = variations ? 2 : 9;
    els.namingInput.placeholder = variations
      ? 'Enter the locked brand word — e.g. "sentinel". I\'ll build prefix / suffix / .[tld] variations and check each for sale + availability.'
      : 'Paste a brief — e.g. "Tech startup, B2B SaaS, premium feel. One-word .com, easy to spell, under $5,000. Keywords: cloud, data, ops."';
  }
  if (els.namingGo) els.namingGo.textContent = variations ? 'Build Variations' : 'Find Names';
  if (els.namingDraft) els.namingDraft.hidden = variations; // theme-only (Beast Mode takes a single word)
  if (els.namingIndustry) els.namingIndustry.hidden = !variations; // Beast-Mode-only
  if (els.namingWebsite) els.namingWebsite.hidden = !variations; // Beast-Mode-only
  // Only one results section shows at a time; the theme filters (panel + parsed-
  // filter chips) are theme-only and must be hidden in variations mode.
  if (variations) {
    if (els.namingResults) els.namingResults.hidden = true;
    if (els.namingFiltersPanel) els.namingFiltersPanel.hidden = true;
    if (els.namingFilters) els.namingFilters.hidden = true;
    if (els.namingChat) els.namingChat.hidden = true;
  } else if (els.namingVariations) {
    els.namingVariations.hidden = true;
  }
}

async function runNaming() {
  if (namingMode === 'variations') return runVariations();
  const brief = (els.namingInput?.value || '').trim();
  if (!brief) return;
  if (els.namingError) { els.namingError.hidden = true; els.namingError.textContent = ''; }
  if (els.namingGo) els.namingGo.disabled = true;
  setNamingStatus('Parsing the brief and searching the universe…');
  try {
    const res = await fetch('/research/api/naming', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'search',
        brief,
        // run_id present → update this project in place; absent → new project.
        run_id: currentNamingRunId || null,
        title: (els.namingTitle && els.namingTitle.value.trim()) || null,
        ...namingFilterPayload(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Search failed (${res.status})`);
    namingLastResults = data;
    renderNamingResults(data);
    // Reflect the brief's effective TLDs in the dropdown (empty = all checked).
    if (namingTldCtl && data.filters) {
      const t = (Array.isArray(data.filters.tlds) ? data.filters.tlds : [])
        .map((x) => String(x).replace(/^\./, '').toLowerCase());
      namingTldCtl.setValues(t.length ? t : NM_TLD_OPTS.map((o) => o.value));
    }
    if (els.namingFiltersPanel) els.namingFiltersPanel.hidden = false; // filters appear after a run
    setNamingStatus('');
    // Deep-link to the saved run so refresh / share works, and refresh the
    // Recent strip below the form. Skip the URL update if the save failed.
    if (data.run_id) {
      currentNamingRunId = data.run_id;
      const path = `/research/naming/${encodeURIComponent(data.run_id)}`;
      if (location.pathname !== path) history.replaceState(null, '', path);
      // Empty thread on a fresh run — just unhide the chat panel.
      if (els.namingChatThread) els.namingChatThread.innerHTML = '';
      if (els.namingChat) els.namingChat.hidden = false;
    }
    loadNamingRecent();
  } catch (e) {
    setNamingStatus('');
    if (els.namingError) { els.namingError.textContent = String(e.message || e); els.namingError.hidden = false; }
  } finally {
    if (els.namingGo) els.namingGo.disabled = false;
  }
}

async function runVariations() {
  const seed = (els.namingInput?.value || '').trim();
  if (!seed) return;
  if (els.namingError) { els.namingError.hidden = true; els.namingError.textContent = ''; }
  if (els.namingGo) els.namingGo.disabled = true;
  setNamingStatus('Enumerating variations and checking each for sale + availability…');
  try {
    const res = await fetch('/research/api/naming', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'variations', seed, exclude_tlds: [],
        industry: (els.namingIndustry && els.namingIndustry.value.trim()) || null,
        website: (els.namingWebsite && els.namingWebsite.value.trim()) || null,
        run_id: currentNamingRunId || null,
        title: (els.namingTitle && els.namingTitle.value.trim()) || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    variationsLast = data;
    resetVariationsFilter();
    renderVariations(data);
    setNamingStatus('');
    // Persist + deep-link the run so it lands in Recent and can be reopened.
    if (data.run_id) {
      currentNamingRunId = data.run_id;
      const path = `/research/naming/${encodeURIComponent(data.run_id)}`;
      if (location.pathname !== path) history.replaceState(null, '', path);
      loadNamingRecent();
    }
  } catch (e) {
    setNamingStatus('');
    if (els.namingError) { els.namingError.textContent = String(e.message || e); els.namingError.hidden = false; }
  } finally {
    if (els.namingGo) els.namingGo.disabled = false;
  }
}

// Display the SLD camel-cased at the morpheme boundary so the affix reads at a
// glance — GetSentinel.com, MySentinel.com, SentinelIO.com. Short acronym affixes
// (io/ai/os/hq/api…) go all-caps. Shared by the on-screen table AND the CSV export
// (the CSV must match what's shown). The link href keeps the real lowercase domain.
const VAR_ACRO = new Set(['io', 'ai', 'os', 'hq', 'api', 'ux', 'hr', 'pr', 'crm', 'seo', 'ceo']);
function prettyVarDomain(r, seed) {
  const capw = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const affixCase = (a) => (VAR_ACRO.has(a) ? String(a).toUpperCase() : capw(a));
  const dot = r.domain.lastIndexOf('.');
  const tld = dot >= 0 ? r.domain.slice(dot) : '';
  const s = capw(String(seed || ''));
  if (r.kind === 'prefix') return `${affixCase(r.affix)}${s}${tld}`;
  if (r.kind === 'suffix') return `${s}${affixCase(r.affix)}${tld}`;
  return `${s}${tld}`;
}

const CUR_SYMBOL = { USD: '$', EUR: '€', GBP: '£' };
function fmtVarPrice(p, cur, opts = {}) {
  const n = Number(p);
  if (!(n > 0)) return '';
  const code = (cur || 'USD').toUpperCase();
  const sym = CUR_SYMBOL[code] || '';
  const money = (v) => (sym ? `${sym}${Math.round(v).toLocaleString()}` : `${Math.round(v).toLocaleString()} ${code}`);
  // Buy-Now-Plus range (Sedo): an offer floor up to a fixed buy-now ceiling.
  const min = Number(opts.priceMin);
  const body = (opts.range && min > 0 && min < n) ? `${money(min)}–${money(n)}` : money(n);
  return (!sym && !opts.range) ? `${Math.round(n).toLocaleString()} ${code}` : body;
}

const NMV_CAT = {
  for_sale: { cls: 'nmv-forsale', label: 'For sale' },
  available: { cls: 'nmv-avail', label: 'Available' },
  active: { cls: 'nmv-active', label: 'Active site' },
  parked: { cls: 'nmv-parked', label: 'Parked' },
  registered: { cls: 'nmv-taken', label: 'Registered' },
  unknown: { cls: 'nmv-unknown', label: 'Unknown' },
};
const NMV_ORDER = { for_sale: 0, available: 1, parked: 2, active: 3, registered: 4, unknown: 5 };
// Map a raw corpus feed id → a clean marketplace label (mirrors sweep.js cleanMktLabel).
function nmvMktLabel(src) {
  const s = String(src || '').toLowerCase();
  if (/afternic/.test(s)) return 'Afternic';
  if (/sedo/.test(s)) return 'Sedo';
  if (/brandbucket/.test(s)) return 'BrandBucket';
  if (/atom|squadhelp/.test(s)) return 'Atom';
  if (/namecheap/.test(s)) return 'Namecheap';
  if (/\bdan\b/.test(s)) return 'Dan';
  if (/efty/.test(s)) return 'Efty';
  return 'our corpus';
}
// Client-side corpus promotion — mirrors the server rule so that ANY row we have
// listed with a price in our corpus reads as "For sale", regardless of source
// (afternic/brandbucket/sedo_dump/…). Runs over the loaded rows so it also corrects
// SAVED runs persisted before the server fix existed, and any row the server's
// best-effort corpus lookup missed. Only registered/parked flip (never available =
// free, never active = real live site), and only with an actual price.
function nmvPromoteCorpus(rows) {
  for (const r of rows || []) {
    const inf = r.internal;
    if (!inf || !(inf.in_universe || inf.in_master)) continue;
    const ip = Number(inf.universe_price || inf.master_price) || 0;
    const src = inf.universe_source || inf.master_source || 'our corpus';
    if (r.for_sale && !(r.price > 0) && ip > 0) {
      r.price = ip; r.currency = r.currency || 'USD'; r.price_internal = true;
      r.marketplace = r.marketplace || nmvMktLabel(src);
    } else if (!r.for_sale && ip > 0 && (r.category === 'registered' || r.category === 'parked')) {
      r.for_sale = true; r.for_sale_source = r.for_sale_source || 'corpus'; r.category = 'for_sale';
      r.price = ip; r.currency = r.currency || 'USD'; r.price_internal = true;
      r.marketplace = r.marketplace || nmvMktLabel(src);
      if (!r.link) {
        if (/afternic/i.test(src)) r.link = `https://www.afternic.com/domain/${r.domain}`;
        else if (/sedo/i.test(src)) r.link = `https://sedo.com/search/details/?domain=${r.domain}`;
      }
    }
  }
  // Re-rank to match the server (rankKey): category → price → .com-first → domain.
  const rank = (r) => {
    const priced = (Number.isFinite(r.price) && r.price > 0) ? r.price : (r.min_offer > 0 ? r.min_offer : Infinity);
    return [NMV_ORDER[r.category] ?? 5, priced, r.domain.endsWith('.com') ? 0 : 1];
  };
  rows.sort((a, b) => {
    const ka = rank(a); const kb = rank(b);
    return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]) || a.domain.localeCompare(b.domain);
  });
  return rows;
}

function renderVariations(data) {
  if (els.namingResults) els.namingResults.hidden = true;
  if (els.namingFilters) els.namingFilters.hidden = true;
  if (els.namingFiltersPanel) els.namingFiltersPanel.hidden = true;
  if (els.namingChat) els.namingChat.hidden = true;
  const rows = (data && Array.isArray(data.results)) ? data.results : [];
  nmvPromoteCorpus(rows);
  const filtered = rows.filter(rowMatchesFilter);
  const anyFilter = variationsFilter.affix.size || variationsFilter.tld.size;
  const n = (cat) => rows.filter((r) => r.category === cat).length;
  if (els.nmvCount) els.nmvCount.textContent = anyFilter ? `${filtered.length} / ${rows.length}` : `${rows.length}`;
  if (els.nmvNote) {
    const bits = [`${n('for_sale')} for sale`, `${n('available')} available`, `${n('active')} active`, `${n('parked') + n('registered')} held`];
    if (!data.domainscout) bits.push('prices need DomainScout');
    const summary = `Built around “${escapeHtml(data.seed || '')}”${data.industry ? ` for <strong>${escapeHtml(data.industry)}</strong>` : ''}. ${bits.join(' · ')}.`;
    const c = data.criteria || {};
    // Clickable chips — click one to narrow the table to it (extension → only that
    // TLD; prefix/suffix → only that affix). Toggle off to clear. Within a facet =
    // OR, across facets (affix × extension) = AND. `key` = the filter identity.
    const chip = (val, facet, key, pre = '') => {
      const on = variationsFilter[facet].has(key);
      return `<button type="button" class="nmv-crit${on ? ' nmv-crit-on' : ''}" data-vf="${facet}" data-key="${escapeHtml(key)}">${escapeHtml(pre)}${escapeHtml(val)}</button>`;
    };
    const affixChips = (arr, kind) => (Array.isArray(arr) ? arr : []).map((x) => chip(x, 'affix', `${kind}:${x}`)).join('');
    const tldChips = (arr) => (Array.isArray(arr) ? arr : []).map((x) => chip(x, 'tld', String(x).toLowerCase(), '.')).join('');
    const staticChips = (arr, pre = '') => (Array.isArray(arr) ? arr : []).map((x) => `<span class="nmv-crit nmv-crit-static">${escapeHtml(pre)}${escapeHtml(x)}</span>`).join('');
    const clearBtn = anyFilter ? ` <button type="button" class="nmv-crit-clear" data-vf="clear">✕ clear filter</button>` : '';
    // Type facet — filter to a whole kind (prefix / suffix / extension) in one click.
    const kindChipEl = (val, label) => {
      const on = variationsFilter.kind.has(val);
      return `<button type="button" class="nmv-crit nmv-crit-kind${on ? ' nmv-crit-on' : ''}" data-vf="kind" data-key="${val}">${escapeHtml(label)}</button>`;
    };
    const kindRow = (c.prefixes || c.suffixes || c.tlds)
      ? `<div class="nmv-critrow"><span class="nmv-critlbl">Type</span> ${kindChipEl('prefix', 'Prefix')}${kindChipEl('suffix', 'Suffix')}${kindChipEl('extension', 'Extension')}</div>`
      : '';
    const critHtml = c && (c.prefixes || c.suffixes || c.tlds) ? (
      `<div class="nmv-criteria">`
      + kindRow
      + (c.prefixes && c.prefixes.length ? `<div class="nmv-critrow"><span class="nmv-critlbl">Prefixes</span> ${affixChips(c.prefixes, 'prefix')}</div>` : '')
      + (c.suffixes && c.suffixes.length ? `<div class="nmv-critrow"><span class="nmv-critlbl">Suffixes</span> ${affixChips(c.suffixes, 'suffix')}</div>` : '')
      + (c.tlds && c.tlds.length ? `<div class="nmv-critrow"><span class="nmv-critlbl">Extensions</span> ${tldChips(c.tlds)}</div>` : '')
      + (c.exclude_tlds && c.exclude_tlds.length ? `<div class="nmv-critrow nmv-critexcl">Excluded: ${staticChips(c.exclude_tlds, '.')}</div>` : '')
      + `<div class="nmv-critnote">Click a chip to filter${c.word_aware ? '. Prefix/suffix set tuned to this word; seam-doubled options kept but flagged' : ''}.${clearBtn}</div>`
      + `</div>`
    ) : '';
    els.nmvNote.innerHTML = `<span class="nmv-summary">${summary}</span>${critHtml}`;
  }
  const kindChip = (r) => {
    const label = { prefix: 'Prefix', suffix: 'Suffix', tld: 'Extension' }[r.kind] || r.kind;
    const affix = r.kind !== 'tld' ? ` · ${escapeHtml(r.affix)}` : '';
    return `<span class="nmv-kindchip nmv-k-${escapeHtml(r.kind)}">${label}${affix}</span>`;
  };
  const seed = String(data.seed || '');
  const prettyDomain = (r) => prettyVarDomain(r, seed);
  // Status is a single clean label — the marketplace + price live in their own columns.
  const catPill = (r) => {
    const c = NMV_CAT[r.category] || NMV_CAT.registered;
    // Premium/reserved-risk available names get an asterisk (the Comments column explains).
    const star = r.premium_risk ? '<span class="nmv-star" title="May be premium or registry-reserved — verify at the registrar">*</span>' : '';
    return `<span class="nmv-pill ${c.cls}">${c.label}${star}</span>`;
  };
  const cell = (r) => {
    const price = fmtVarPrice(r.price, r.currency, { priceMin: r.price_min, range: r.price_range });
    // Firm buy-now vs a minimum-offer floor vs offer-only-no-number — kept distinct so
    // a "$69,500 minimum offer" (Spaceship) never reads as a price you can just pay.
    let priceCell;
    if (price) priceCell = `<span class="nmv-price">${price}</span>${r.price_internal ? '<span class="nmv-pricetag">our corpus</span>' : ''}`;
    else if (r.min_offer > 0) priceCell = `<span class="nmv-price">${fmtVarPrice(r.min_offer, r.currency)}</span><span class="nmv-pricetag">min offer</span>`;
    else if (r.make_offer) priceCell = '<span class="nmv-makeoffer">Make offer</span>';
    else priceCell = '<span class="nmv-dash">—</span>';
    // GoDaddy registration-search link for a name that's available to hand-register.
    const registerUrl = `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(r.domain)}`;
    // Listing = where to buy/register it. For-sale → marketplace link; available →
    // "Register ↗" (GoDaddy); otherwise "—". Its OWN column, separate from price.
    let listing = '<span class="nmv-dash">—</span>';
    if (r.link) listing = `<a class="nmv-mkt" href="${escapeHtml(r.link)}" target="_blank" rel="noopener">${escapeHtml(r.marketplace || 'view')} ↗</a>`;
    else if (r.marketplace) listing = `<span class="nmv-mkt">${escapeHtml(r.marketplace)}</span>`;
    else if (r.category === 'available') listing = `<a class="nmv-mkt" href="${escapeHtml(registerUrl)}" target="_blank" rel="noopener">Register ↗</a>`;
    // The name links to its own live page — EXCEPT an available name (which won't
    // resolve), which points to the GoDaddy registration search. (href/CSV keep the
    // real lowercase domain.)
    const nameHref = r.category === 'available' ? registerUrl : `https://${r.domain}`;
    const dom = `<a href="${escapeHtml(nameHref)}" target="_blank" rel="noopener">${escapeHtml(prettyDomain(r))}</a>`;
    // Internal-corpus badge — a name we already own / track / have owner intel on.
    const inf = r.internal;
    let ours = '';
    if (inf && (inf.in_universe || inf.in_master)) {
      const bits = [];
      bits.push(inf.owner ? `🏷 ${escapeHtml(inf.owner)}` : '📇 In our corpus');
      const oursPrice = inf.universe_price || inf.master_price;
      if (oursPrice > 0 && !r.price_internal) bits.push(`our price $${Number(oursPrice).toLocaleString()}`);
      const src = inf.universe_source || inf.master_source;
      if (src && !inf.owner) bits.push(escapeHtml(src));
      ours = `<div class="nmv-ours">${bits.join(' · ')}</div>`;
    }
    const comments = [];
    if (r.friction) comments.push(`⚠ ${r.friction}`);
    if (r.premium_risk) {
      comments.push(r.premium_price > 0
        ? `⚠ registry PREMIUM — ~$${Number(r.premium_price).toLocaleString()}/yr (Porkbun)`
        : '⚠ may be premium / registry-reserved — verify at registrar');
    }
    const comment = comments.map((c) => `<span class="nmv-comment">${escapeHtml(c)}</span>`).join(' ');
    return `<tr><td class="nmv-dom">${dom}${ours}</td><td>${catPill(r)}</td><td class="nmv-pricecell">${priceCell}</td><td>${listing}</td><td class="nmv-kind">${kindChip(r)}</td><td class="nmv-comments">${comment}</td></tr>`;
  };
  const body = filtered.length
    ? filtered.map(cell).join('')
    : `<tr><td colspan="6" class="nmv-empty">No variations match this filter — click the highlighted chip again to clear.</td></tr>`;
  const html = `<table class="nmv-table"><thead><tr><th>Domain</th><th>Status</th><th>Price</th><th>Listing</th><th>Type</th><th class="nmv-comments-h">Comments</th></tr></thead><tbody>${body}</tbody></table>`;
  if (els.nmvTable) els.nmvTable.innerHTML = html;
  if (els.namingVariations) els.namingVariations.hidden = false;
}

function variationsToCsv(data) {
  // Export what's shown — respect an active chip filter (falls through to all rows
  // when nothing is selected, since rowMatchesFilter returns true for every row).
  const rows = ((data && Array.isArray(data.results)) ? data.results : []).filter(rowMatchesFilter);
  const seed = String((data && data.seed) || '');
  const head = ['Domain', 'Category', 'For sale', 'Source', 'Price', 'Price type', 'Currency', 'Marketplace', 'In our corpus', 'Owner', 'Our price', 'Site', 'Friction', 'Evidence', 'Type', 'Affix', 'Link'];
  const esc = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [head.join(',')];
  for (const r of rows) {
    // Price lives in its own column — strip the redundant "· $/€/£ X" (or "offers from") tail from evidence.
    const evidence = String(r.evidence || '').replace(/\s*·\s*(?:offers from\s*)?[$€£][\d,]+(?:–[$€£][\d,]+)?\s*$/i, '');
    // Distinguish a firm buy-now from a minimum-offer floor from an offer-only listing.
    let priceOut = ''; let priceType = '';
    if (r.price > 0) { priceOut = (r.price_range && r.price_min > 0 ? `${r.price_min}-${r.price}` : String(r.price)); priceType = 'buy now'; }
    else if (r.min_offer > 0) { priceOut = String(r.min_offer); priceType = 'min offer'; }
    else if (r.make_offer) { priceType = 'make offer'; }
    const cur = (r.price > 0 || r.min_offer > 0) ? (r.currency || 'USD') : '';
    const inf = r.internal || null;
    const inCorpus = inf && (inf.in_universe || inf.in_master) ? (inf.in_universe && inf.in_master ? 'universe+master' : inf.in_universe ? 'universe' : 'master') : '';
    const ourPrice = inf ? (inf.universe_price || inf.master_price || '') : '';
    lines.push([prettyVarDomain(r, seed), r.category, r.for_sale ? 'yes' : 'no', r.for_sale_source || '', priceOut, priceType, cur, r.marketplace || '', inCorpus, (inf && inf.owner) || '', ourPrice, r.site || '', r.friction || '', evidence, r.kind, r.affix, r.link || ''].map(esc).join(','));
  }
  return lines.join('\n');
}

function downloadVariationsCsv() {
  if (!variationsLast) return;
  const csv = variationsToCsv(variationsLast);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${variationsLast.seed || 'variations'}-variations.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setNamingStatus(text, isError = false) {
  if (!els.namingStatus) return;
  if (!text) { els.namingStatus.hidden = true; els.namingStatus.textContent = ''; return; }
  els.namingStatus.innerHTML = spinHtml(text, isError);
  els.namingStatus.hidden = false;
}

// How the results are ordered. "fit" = the server's best-fit ranking (relevance to
// the brief, then quality) — the default, so the strongest matches lead instead of
// looking randomly ordered. The others re-sort client-side over the loaded rows.
let namingSortMode = 'fit';
function namingFitScore(r) {
  // Mirror the server's intent: on-theme relevance dominates, quality breaks ties,
  // a real (priced) listing edges out a TBD, and a shorter/cleaner SLD nudges up.
  const rel = Number(r.relevance) || 0;
  const q = Number(r.quality_score) || 0;
  const priced = r.best_price != null ? 1 : 0;
  const lenPenalty = Math.min(Number(r.sld_length || (r.sld ? String(r.sld).length : 12)), 24) / 100;
  return rel * 100 + q + priced * 0.5 - lenPenalty;
}
function sortNamingRows(rows, mode) {
  const arr = Array.isArray(rows) ? rows.slice() : [];
  const price = (r) => (r.best_price == null ? null : Number(r.best_price));
  const cmp = {
    fit: (a, b) => namingFitScore(b) - namingFitScore(a),
    price_asc: (a, b) => (price(a) == null) - (price(b) == null) || (price(a) ?? 0) - (price(b) ?? 0),
    price_desc: (a, b) => (price(a) == null) - (price(b) == null) || (price(b) ?? 0) - (price(a) ?? 0),
    short: (a, b) => (Number(a.sld_length || (a.sld || '').length) - Number(b.sld_length || (b.sld || '').length)) || namingFitScore(b) - namingFitScore(a),
    quality: (a, b) => (Number(b.quality_score) || 0) - (Number(a.quality_score) || 0) || namingFitScore(b) - namingFitScore(a),
  }[mode] || cmpFitFallback;
  return arr.sort(cmp);
  function cmpFitFallback(a, b) { return namingFitScore(b) - namingFitScore(a); }
}

function renderNamingResults(data) {
  // Collapse the hero+brief into the compact header once names are showing.
  toolReport('view-naming', String((els.namingTitle && els.namingTitle.value) || 'project').slice(0, 60), true);
  renderNamingFilters(data.filters);
  namingLiveStatuses = {}; // fresh result set — clear the accumulated verify verdicts
  if (els.namingSort) els.namingSort.value = namingSortMode;
  const buy = sortNamingRows(Array.isArray(data.buyReady) ? data.buyReady : [], namingSortMode);
  const stretch = sortNamingRows(Array.isArray(data.stretch) ? data.stretch : [], namingSortMode);
  if (els.namingBuyReadyCount) els.namingBuyReadyCount.textContent = `(${buy.length} ${buy.length === 1 ? 'match' : 'matches'})`;
  if (els.namingStretchCount) els.namingStretchCount.textContent = `(${stretch.length} ${stretch.length === 1 ? 'match' : 'matches'})`;
  // When both buckets are empty, point at the filters most likely to be
  // over-tight so the user can iterate instead of staring at a dead end.
  if (!buy.length && !stretch.length) {
    if (els.namingBuyReadyTable) els.namingBuyReadyTable.innerHTML = renderNamingNoMatchHint(data.filters);
    if (els.namingStretchTable) els.namingStretchTable.innerHTML = '';
    if (els.namingStretchCount) els.namingStretchCount.textContent = '';
  } else {
    if (els.namingBuyReadyTable) els.namingBuyReadyTable.innerHTML = renderNamingTable(buy, 'Buy-ready');
    if (els.namingStretchTable) els.namingStretchTable.innerHTML = renderNamingTable(stretch, 'Stretch');
  }
  if (els.namingResults) els.namingResults.hidden = false;
  verifyNamingResults(buy, stretch); // live "is it actually for sale?" pass (Sedo/Snagged)
}

// Sedo + direct-Snagged listings go stale — a domain listed months ago may now
// resolve to an active company site (not really gettable). Live-classify those
// rows and flag/hide the confident "in use" ones. Marketplace deep-links
// (Afternic/Atom/BrandBucket) are trusted and skipped. Verified in batches of
// 12 (server cap) so no single request is slow; results badge in progressively.
function namingNeedsVerify(r) {
  const lbl = String(r.source_label || '');
  const srcs = Array.isArray(r.sources) ? r.sources : [];
  return /sedo|snagged/i.test(lbl) || srcs.some((s) => /^(sedo|snagged)/i.test(String(s)));
}
async function verifyNamingResults(buy, stretch) {
  const seen = new Set();
  const domains = [];
  for (const r of [...(buy || []), ...(stretch || [])]) {
    if (!r || !r.domain || seen.has(r.domain)) continue;
    if (!namingNeedsVerify(r)) continue;
    seen.add(r.domain);
    domains.push(r.domain);
    if (domains.length >= 48) break; // bound the live-fetch work
  }
  if (!domains.length) return;
  const myRun = currentNamingRunId; // bail if the user starts a new search mid-verify
  for (let i = 0; i < domains.length; i += 12) {
    const chunk = domains.slice(i, i + 12);
    try {
      const res = await fetch('/research/api/naming', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'verify', domains: chunk }),
      });
      const data = await res.json().catch(() => ({}));
      if (currentNamingRunId !== myRun) return;
      applyLiveStatuses(data.statuses || {});
    } catch { /* leave those rows unflagged */ }
  }
  updateInUseControl();
}
// Accumulated live "in use" verdicts for the current result set, so a client-side
// re-sort (which re-renders the cards) can re-apply them without another fetch.
let namingLiveStatuses = {};
function applyLiveStatuses(statuses) {
  Object.assign(namingLiveStatuses, statuses);
  for (const [domain, status] of Object.entries(statuses)) {
    if (status !== 'in_use') continue;
    document.querySelectorAll(`.naming-card[data-domain="${(window.CSS && CSS.escape) ? CSS.escape(domain) : domain}"]`).forEach((card) => {
      if (card.querySelector('.naming-card-inuse')) return;
      card.classList.add('is-inuse');
      if (namingHideInUse) card.classList.add('is-hidden');
      const meta = card.querySelector('.naming-card-meta');
      if (meta) meta.insertAdjacentHTML('afterbegin', '<span class="naming-card-inuse" title="The domain resolves to an active site — likely not actually for sale">In use</span>');
    });
  }
}
let namingHideInUse = true;
function updateInUseControl() {
  const n = document.querySelectorAll('.naming-card.is-inuse').length;
  let bar = document.getElementById('naming-inuse-bar');
  if (!n) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'naming-inuse-bar';
    bar.className = 'naming-inuse-bar';
    const results = document.getElementById('naming-results');
    if (results) results.insertBefore(bar, results.firstChild);
  }
  bar.innerHTML = `<span>${n} result${n === 1 ? '' : 's'} look in-use (live site, likely not for sale).</span>`
    + `<button type="button" id="naming-inuse-toggle">${namingHideInUse ? 'Show them' : 'Hide them'}</button>`;
  const btn = document.getElementById('naming-inuse-toggle');
  if (btn) btn.onclick = () => {
    namingHideInUse = !namingHideInUse;
    document.querySelectorAll('.naming-card.is-inuse').forEach((c) => c.classList.toggle('is-hidden', namingHideInUse));
    updateInUseControl();
  };
}

function renderNamingNoMatchHint(f) {
  const tight = [];
  if (f && f.num_words != null) tight.push(`<code>${f.num_words}-word only</code> — try removing the word-count constraint`);
  if (f && f.min_quality_score != null && f.min_quality_score >= 3.0) tight.push(`<code>quality ≥ ${f.min_quality_score}</code> — try lowering or removing the quality floor`);
  if (f && f.dictionary_word_only) tight.push(`<code>dictionary words only</code> — many strong names are coined or compound`);
  if (f && f.sld_length_max != null && f.sld_length_max <= 6) tight.push(`<code>length ≤ ${f.sld_length_max}</code> — short names get scarce fast`);
  const hint = tight.length
    ? `<ul class="naming-empty-hints">${tight.map((t) => `<li>${t}</li>`).join('')}</ul>`
    : '<p>Try broadening the brief — fewer hard constraints, wider price range, or different keywords.</p>';
  return (
    `<div class="naming-empty-block">` +
      `<p><strong>No matches across either bucket for this brief.</strong> The most common over-tight filters in the parsed result above:</p>` +
      hint +
      `<p class="naming-empty-foot">Edit the brief and click <strong>Find Names</strong> again — the parser re-runs from scratch each click.</p>` +
    `</div>`
  );
}

function renderNamingFilters(f) {
  if (!els.namingFilters || !f) return;
  const parts = [];
  parts.push(`tlds <strong>${escapeHtml((f.tlds || []).join(', ') || '—')}</strong>`);
  const lenMin = f.sld_length_min, lenMax = f.sld_length_max;
  if (lenMin != null || lenMax != null) {
    parts.push(`length <strong>${lenMin != null ? lenMin : '?'}–${lenMax != null ? lenMax : '?'}</strong>`);
  }
  if (f.num_words != null) parts.push(`${f.num_words} word${f.num_words === 1 ? '' : 's'}`);
  if (f.dictionary_word_only) parts.push('dictionary words only');
  if (f.min_price != null && f.max_price != null) {
    parts.push(`<strong>$${Number(f.min_price).toLocaleString()}–$${Number(f.max_price).toLocaleString()}</strong>`);
  } else if (f.max_price != null) {
    parts.push(`under <strong>$${Number(f.max_price).toLocaleString()}</strong>`);
  } else if (f.min_price != null) {
    parts.push(`over <strong>$${Number(f.min_price).toLocaleString()}</strong>`);
  }
  if (f.min_quality_score != null) parts.push(`quality ≥ <strong>${f.min_quality_score}</strong>`);
  if (Array.isArray(f.semantic_keywords) && f.semantic_keywords.length) {
    parts.push(`keywords <strong>${escapeHtml(f.semantic_keywords.join(' / '))}</strong>`);
  }
  if (!f.include_stretch) parts.push('no stretch');
  els.namingFilters.innerHTML = `<span class="naming-filters-label">Parsed filters:</span> ${parts.join(' · ')}`;
  els.namingFilters.hidden = false;
}

// Scannable row-card list (2026-06 redesign). Domain + price are the visual
// anchors; source is a muted line under the domain (every row is "For sale",
// so the old Status column is dropped). Matched-keyword chips stay as a muted
// secondary "why it surfaced" row. "Visit" is an arrow button that opens the
// marketplace PURCHASE url in a new tab. Same shape for Buy-ready and Stretch.
function renderNamingTable(rows /* , bucketLabel */) {
  if (!rows.length) {
    return `<p class="naming-empty">No matches for this brief.</p>`;
  }
  const cards = rows.map((r) => {
    // Monthly-lease listings (e.g. venture.com): the price is per-MONTH, not a buy,
    // so label it "/mo" and badge it so the number isn't read as a purchase price.
    const lease = !!r.is_lease;
    const price = r.best_price == null
      ? 'TBD'
      : (lease ? `$${Number(r.best_price).toLocaleString()}/mo` : `$${Number(r.best_price).toLocaleString()}`);
    const priceClass = r.best_price == null ? 'naming-card-price is-tbd' : (lease ? 'naming-card-price is-lease' : 'naming-card-price');
    const leaseBadge = lease
      ? `<span class="naming-card-lease" title="Monthly lease (via venture.com) — price shown is per month, not a purchase">Lease&nbsp;· monthly</span>`
      : '';
    const source = r.source_label ? escapeHtml(r.source_label) : '—';
    const matched = Array.isArray(r.matched_keywords) ? r.matched_keywords : [];
    const chips = matched.length
      ? `<div class="naming-card-kw">${matched.map((k) => `<span class="naming-kw-chip">${escapeHtml(k)}</span>`).join('')}</div>`
      : '';
    const visit = r.landing_url
      ? `<a class="naming-card-visit" href="${escapeHtml(r.landing_url)}" target="_blank" rel="noopener noreferrer" title="Open purchase page">Visit <span aria-hidden="true">&rarr;</span></a>`
      : `<span class="naming-card-visit is-disabled" aria-hidden="true">—</span>`;
    // The domain itself also links to the buy page so the name is clickable.
    const domain = r.landing_url
      ? `<a class="naming-card-domain" href="${escapeHtml(r.landing_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.domain)}</a>`
      : `<span class="naming-card-domain">${escapeHtml(r.domain)}</span>`;
    // Corpus badge: M = Master Domain List, U = name_universe. Lets you see at a
    // glance that both corpora feed the results.
    const origin = r.origin === 'M' ? 'M' : 'U';
    const originBadge = `<span class="naming-card-origin origin-${origin.toLowerCase()}" title="${origin === 'M' ? 'Master Domain List' : 'Name universe'}">${origin}</span>`;
    return (
      `<div class="naming-card" data-domain="${escapeHtml(r.domain)}">` +
        `<div class="naming-card-main">` +
          `<div class="naming-card-id">` +
            domain +
            `<div class="naming-card-meta">` +
              originBadge +
              (lease
                ? leaseBadge
                : `<span class="naming-card-forsale">For sale</span>`) +
              `<span class="naming-card-source">${source}</span>` +
            `</div>` +
            chips +
          `</div>` +
          `<div class="naming-card-buy">` +
            `<div class="${priceClass}">${escapeHtml(price)}</div>` +
            visit +
          `</div>` +
        `</div>` +
      `</div>`
    );
  }).join('');
  return `<div class="naming-cards">${cards}</div>`;
}

function statusToClass(status) {
  switch (status) {
    case 'For Sale': return 'status-for-sale';
    case 'In Use': return 'status-in-use';
    case 'Big Owner': return 'status-big-owner';
    case "Doesn't Resolve": return 'status-no-resolve';
    default: return 'status-for-sale';
  }
}

function namingResultsToCsv(data) {
  // Match the on-screen order (respects the current sort selection).
  const rows = [...sortNamingRows(data.buyReady || [], namingSortMode), ...sortNamingRows(data.stretch || [], namingSortMode)];
  // CSV matches the on-screen table: Domain, Price, Source, Status,
  // Relevance (matched keywords joined), Link. Bucket is included as an
  // extra column so a downstream sheet/script can still split if needed.
  const header = ['Domain', 'Price', 'Source', 'Status', 'Relevance', 'Bucket', 'Link'];
  const csvCell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    const bucket = r.bucket || (r.best_price != null ? 'Buy-ready' : 'Stretch');
    const relevance = Array.isArray(r.matched_keywords) ? r.matched_keywords.join(' / ') : '';
    lines.push([
      r.domain,
      r.best_price == null ? 'TBD' : r.best_price,
      r.source_label || '',
      r.status || '',
      relevance,
      bucket,
      r.landing_url || '',
    ].map(csvCell).join(','));
  }
  return lines.join('\n');
}

async function copyNamingCsv() {
  if (!namingLastResults) return;
  const csv = namingResultsToCsv(namingLastResults);
  try {
    await navigator.clipboard.writeText(csv);
    setNamingStatus('CSV copied to clipboard.');
    setTimeout(() => setNamingStatus(''), 2000);
  } catch {
    downloadNamingCsv(); // no clipboard API — fall back to a file download
  }
}

// Download the current results as a .csv file — the simple, no-Google export.
// Filename uses the project title when set (slugified), else a dated default.
function downloadNamingCsv() {
  if (!namingLastResults) return;
  const csv = namingResultsToCsv(namingLastResults);
  const title = (els.namingTitle && els.namingTitle.value.trim()) || '';
  const slug = (title || 'naming-exercise')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'naming-exercise';
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setNamingStatus('CSV downloaded.');
  setTimeout(() => setNamingStatus(''), 2000);
}

async function exportNamingSheet() {
  if (!namingLastResults) return;
  const brief = (els.namingInput?.value || '').trim();
  if (els.namingError) { els.namingError.hidden = true; els.namingError.textContent = ''; }
  setNamingStatus('Exporting to Google Sheets…');
  try {
    const res = await fetch('/research/api/naming', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'export', brief, title: (els.namingTitle && els.namingTitle.value.trim()) || null, results: namingLastResults }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Export failed (${res.status})`);
    if (data.url) {
      window.open(data.url, '_blank', 'noopener,noreferrer');
      if (data.warning && els.namingError) { els.namingError.textContent = data.warning; els.namingError.hidden = false; }
      setNamingStatus('Sheet opened in new tab.');
      setTimeout(() => setNamingStatus(''), 2500);
    } else {
      setNamingStatus('');
    }
  } catch (e) {
    setNamingStatus('');
    if (els.namingError) { els.namingError.textContent = String(e.message || e); els.namingError.hidden = false; }
  }
}

// Reset /naming back to the entry state (textarea + Recent visible; result
// sections hidden). Used when leaving a past-run view back to a fresh brief.
function resetNamingView() {
  toolReport('view-naming', '', false);   // restore the hero+brief entry
  if (els.namingInput) els.namingInput.value = '';
  if (els.namingTitle) els.namingTitle.value = '';
  if (els.namingFiltersPanel) els.namingFiltersPanel.hidden = true; // filters hide until a run
  loadNamingRecent(); // back on the entry → re-show the last-5 block under the brief
  if (els.namingFilters) { els.namingFilters.hidden = true; els.namingFilters.innerHTML = ''; }
  if (els.namingResults) els.namingResults.hidden = true;
  if (els.namingBuyReadyTable) els.namingBuyReadyTable.innerHTML = '';
  if (els.namingStretchTable) els.namingStretchTable.innerHTML = '';
  if (els.namingBuyReadyCount) els.namingBuyReadyCount.textContent = '';
  if (els.namingStretchCount) els.namingStretchCount.textContent = '';
  if (els.namingError) { els.namingError.hidden = true; els.namingError.textContent = ''; }
  if (els.namingChat) els.namingChat.hidden = true;
  if (els.namingChatThread) els.namingChatThread.innerHTML = '';
  if (els.namingChatError) els.namingChatError.hidden = true;
  // Clear the variations grid too, and reset back to the default (theme) mode so a
  // fresh visit to /research/naming isn't sitting on the last run's output.
  if (els.namingVariations) els.namingVariations.hidden = true;
  if (els.nmvTable) els.nmvTable.innerHTML = '';
  if (els.nmvCount) els.nmvCount.textContent = '';
  if (els.nmvNote) els.nmvNote.innerHTML = '';
  variationsLast = null;
  resetVariationsFilter();
  setNamingMode('theme');
  namingLastResults = null;
  currentNamingRunId = null;
}

// Recent naming exercises — top 5 below the brief form. Mirrors the main
// research view's Recent block, but ALWAYS visible (with an explicit empty
// or error state) so the user can tell whether they've got past runs to
// revisit, vs the block silently failing to render.
// Recent naming runs are now just a single link to the full, searchable list
// (keeps the brief form uncluttered). We only show the link when runs exist.
async function loadNamingRecent() {
  if (!els.namingRecent && !els.namingRecentFive) return;
  try {
    const res = await fetch('/research/api/naming?list=1');
    const data = await res.json().catch(() => ({}));
    const runs = res.ok && Array.isArray(data.runs) ? data.runs : [];
    const has = runs.length > 0;
    if (els.namingRecent) els.namingRecent.hidden = !has;       // footer link
    if (els.namingRecentFive) {                                  // last-5 under the brief
      els.namingRecentFive.hidden = !has;
      if (els.namingRecentFiveList) {
        els.namingRecentFiveList.innerHTML = runs.slice(0, 5).map((r) => {
          const when = r.created_at ? new Date(r.created_at).toLocaleString() : '';
          const snippet = String(r.brief || '').replace(/\s+/g, ' ').slice(0, 80);
          const label = r.title ? r.title : (snippet || '(empty brief)');
          return `<li class="recent-run" data-id="${escapeHtml(r.id)}">`
            + `<span class="recent-domain">${escapeHtml(label)}</span>`
            + `<span class="recent-when">${escapeHtml(when)}</span></li>`;
        }).join('');
      }
    }
  } catch {
    if (els.namingRecent) els.namingRecent.hidden = true;
  }
}

// Past Naming Runs view — searchable list, mirrors loadProjects().
let namingScope = 'all'; // 'all' | 'starred'
async function loadNamingProjects(q = '') {
  if (!els.namingProjectsList) return;
  els.namingProjectsList.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const starredParam = namingScope === 'starred' ? '&starred=1' : '';
    const res = await fetch(`/research/api/naming?list=1&q=${encodeURIComponent(q)}${starredParam}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    const runs = data.runs || [];
    if (!runs.length) {
      els.namingProjectsList.innerHTML = `<li class="muted">${namingScope === 'starred' ? 'No starred runs yet — tap ☆ on a run to favorite it.' : 'No naming runs yet.'}</li>`;
      return;
    }
    els.namingProjectsList.innerHTML = runs.map((r) => {
      const when = r.created_at ? new Date(r.created_at).toLocaleString() : '';
      const snippet = String(r.brief || '').replace(/\s+/g, ' ').slice(0, 160);
      const label = r.title ? r.title : (snippet || '(empty brief)');
      const on = !!r.starred;
      return `<li class="recent-run" data-id="${escapeHtml(r.id)}">` +
        `<button class="naming-star${on ? ' on' : ''}" type="button" data-id="${escapeHtml(r.id)}" data-starred="${on ? '1' : '0'}" title="${on ? 'Unstar' : 'Star'}" aria-label="${on ? 'Unstar' : 'Star'}">${on ? '★' : '☆'}</button>` +
        `<span class="recent-domain">${escapeHtml(label)}</span>` +
        `<span class="recent-when">${escapeHtml(when)}</span>` +
        `<button class="naming-rename" type="button" data-id="${escapeHtml(r.id)}" data-title="${escapeHtml(r.title || '')}" title="Rename">✎ Rename</button>` +
        `</li>`;
    }).join('');
  } catch (e) {
    els.namingProjectsList.innerHTML = `<li class="muted">${escapeHtml(String(e.message || e))}</li>`;
  }
}

// Load a saved naming run by id — fills the brief textarea and renders the
// stored buy-ready/stretch tables so the user can revisit prior work and
// edit + re-run. If the run has chat history with refined results, the
// LATEST refinement is what we render (the run record's original snapshot
// stays untouched and is recoverable by clearing the chat).
async function openNamingRun(id) {
  if (!id) return;
  setNamingStatus('Loading saved run…');
  try {
    const res = await fetch(`/research/api/naming?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Couldn't load (${res.status})`);
    const r = data.run;
    currentNamingRunId = r.id;
    if (els.namingInput) els.namingInput.value = String(r.brief || '');
    if (els.namingTitle) els.namingTitle.value = String(r.title || '');
    // Collapse the hero+brief into the compact header (labelled by the project title).
    toolReport('view-naming', String(r.title || r.brief || 'project').slice(0, 60), true);
    // A saved VARIATIONS run — re-render the variations grid (not the theme buckets).
    if (r.filters && r.filters.mode === 'variations') {
      setNamingMode('variations');
      if (els.namingIndustry) els.namingIndustry.value = String((r.filters && r.filters.industry) || '');
      if (els.namingWebsite) els.namingWebsite.value = String((r.filters && r.filters.website) || '');
      const vdata = { seed: (r.filters.seed || r.brief || ''), industry: (r.filters && r.filters.industry) || null, website: (r.filters && r.filters.website) || null, criteria: r.filters.criteria || null, results: Array.isArray(r.buy_ready) ? r.buy_ready : [], domainscout: true };
      variationsLast = vdata;
      resetVariationsFilter();
      renderVariations(vdata);
      setNamingStatus('');
      return;
    }
    setNamingMode('theme');
    const buy = Array.isArray(r.buy_ready) ? r.buy_ready : [];
    const stretch = Array.isArray(r.stretch) ? r.stretch : [];
    namingLastResults = { run_id: r.id, filters: r.filters, buyReady: buy, stretch };
    renderNamingResults({ filters: r.filters, buyReady: buy, stretch });
    if (els.namingFiltersPanel) els.namingFiltersPanel.hidden = false; // opened run → filters visible
    setNamingStatus('');
    // Pull chat history and replay the latest refinement (if any).
    await loadNamingChat(r.id);
  } catch (e) {
    setNamingStatus('');
    if (els.namingError) { els.namingError.textContent = String(e.message || e); els.namingError.hidden = false; }
  }
}

// ── Naming chat (per-run refinement) ────────────────────────────────────────
let currentNamingRunId = null;
let namingChatBusy = false;

async function loadNamingChat(runId) {
  if (!els.namingChat || !els.namingChatThread) return;
  els.namingChatThread.innerHTML = '';
  els.namingChat.hidden = false;
  if (!runId) return;
  try {
    const res = await fetch(`/research/api/naming?chat_run=${encodeURIComponent(runId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    const messages = data.messages || [];
    els.namingChatThread.innerHTML = messages.map(namingChatBubble).join('');
    // If the latest assistant turn shipped a result snapshot, render it so
    // the visible tables match where the conversation left off.
    const latest = [...messages].reverse().find((m) => m.role === 'assistant' && m.result_snapshot);
    if (latest && latest.result_snapshot) {
      const buy = latest.result_snapshot.buyReady || latest.result_snapshot.buy_ready || [];
      const stretch = latest.result_snapshot.stretch || [];
      const filters = latest.refined_filters || namingLastResults?.filters;
      namingLastResults = { run_id: runId, filters, buyReady: buy, stretch };
      renderNamingResults({ filters, buyReady: buy, stretch });
    }
    els.namingChatThread.scrollTop = els.namingChatThread.scrollHeight;
  } catch (e) {
    if (els.namingChatError) { els.namingChatError.textContent = String(e.message || e); els.namingChatError.hidden = false; }
  }
}

function namingChatBubble(m) {
  const cls = m.role === 'assistant' ? 'bot' : 'me';
  const err = m.status === 'error';
  const pending = m.status === 'pending';
  const body = pending ? 'Thinking…' : renderMarkdown(String(m.content || ''));
  return `<div class="chat-msg ${cls}${err ? ' chat-err' : ''}${pending ? ' pending' : ''}">${body}</div>`;
}

async function sendNamingChat(message) {
  if (namingChatBusy || !message || !currentNamingRunId) return;
  namingChatBusy = true;
  if (els.namingChatSend) els.namingChatSend.disabled = true;
  if (els.namingChatError) els.namingChatError.hidden = true;
  const thread = els.namingChatThread;
  thread.insertAdjacentHTML('beforeend', `<div class="chat-msg me">${renderMarkdown(message)}</div>`);
  thread.insertAdjacentHTML('beforeend', `<div class="chat-msg bot pending">Thinking…</div>`);
  thread.scrollTop = thread.scrollHeight;
  const pending = thread.querySelector('.chat-msg.pending:last-child');
  try {
    const res = await fetch('/research/api/naming', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'chat', run_id: currentNamingRunId, message, ...namingFilterPayload() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Chat failed (${res.status})`);
    if (pending) {
      pending.classList.remove('pending');
      pending.innerHTML = renderMarkdown(String((data.assistant_message && data.assistant_message.content) || '(no reply)'));
    }
    // Refine intent → swap the live tables with the new snapshot. The
    // saved chat message holds the snapshot too, so a reload replays it.
    if (data.refined) {
      const buy = data.refined.buyReady || [];
      const stretch = data.refined.stretch || [];
      namingLastResults = { run_id: currentNamingRunId, filters: data.refined.filters, buyReady: buy, stretch };
      renderNamingResults({ filters: data.refined.filters, buyReady: buy, stretch });
    }
    thread.scrollTop = thread.scrollHeight;
  } catch (e) {
    if (pending) {
      pending.classList.remove('pending');
      pending.classList.add('chat-err');
      pending.textContent = `⚠️ ${e.message || e}`;
    }
  } finally {
    namingChatBusy = false;
    if (els.namingChatSend) els.namingChatSend.disabled = false;
    if (els.namingChatInput) { els.namingChatInput.value = ''; els.namingChatInput.focus(); }
  }
}

// ── Wiring ──────────────────────────────────────────────────────────────────
// The user's chosen phase, gated by permissions. The checkbox is the explicit
// ask; otherwise default to shallow. A user with ONLY deep (free reports disabled)
// is forced to deep so the server doesn't 403 them.
function chosenDeep() {
  let deep = !!(els.deepToggle && els.deepToggle.checked);
  if (!deep && !canPhase(currentUser, 'shallow') && canPhase(currentUser, 'deep')) deep = true;
  return deep;
}

// Split the domain box into candidate names. Shift+Enter lets the user stack
// several (one per line); commas/spaces/semicolons also separate.
function parseDomainList(raw) {
  return String(raw || '')
    .split(/[\n,;]+|\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const BATCH_MAX = 25;

function setBatchStatus(text, isError = false) {
  if (!els.batchStatus) return;
  if (!text) {
    els.batchStatus.hidden = true; els.batchStatus.textContent = '';
    batchItems = null; stopBatchPoll();
    return;
  }
  els.batchStatus.hidden = false;
  els.batchStatus.textContent = text;
  els.batchStatus.classList.toggle('error', isError);
}

// Per-name batch state — one entry per submitted name with its own state
// (running / ready / failed) so a batch where some names were already researched
// (server reuses the cached run → `existing:true`) still shows EVERY name, not
// just whichever one had no cache. Clicking a row opens that report.
let batchItems = null; let batchDeep = false; let batchBad = []; let batchSkipped = 0;
function renderBatchList() {
  if (!els.batchStatus || !batchItems) return;
  const running = batchItems.filter((it) => it.state === 'running').length;
  const ready = batchItems.filter((it) => it.state === 'ready').length;
  const failed = batchItems.filter((it) => it.state === 'failed').length;
  const head = running
    ? `Researching ${running} name${running === 1 ? '' : 's'}${batchDeep ? ' (deep)' : ''}${ready ? ` · ${ready} already done` : ''}…`
    : `${batchItems.length} name${batchItems.length === 1 ? '' : 's'} ready${failed ? ` · ${failed} couldn’t start` : ''}.`;
  const rows = batchItems.map((it) => {
    const label = it.state === 'running' ? 'researching…'
      : it.state === 'ready' ? 'report ready ↗'
      : 'couldn’t start';
    const attr = it.run_id && it.state !== 'failed' ? ` data-id="${escapeHtml(it.run_id)}"` : '';
    return `<li class="batch-row batch-${it.state}"${attr}><span class="batch-dom">${escapeHtml(it.domain)}</span><span class="batch-state">${label}</span></li>`;
  }).join('');
  const extra = [];
  if (batchBad.length) extra.push(`Skipped ${batchBad.length} unrecognized.`);
  if (batchSkipped) extra.push(`Only the first ${BATCH_MAX} were started.`);
  els.batchStatus.hidden = false;
  els.batchStatus.classList.toggle('error', failed > 0 && ready === 0 && running === 0);
  els.batchStatus.innerHTML =
    `<div class="batch-head">${escapeHtml(head)}</div>` +
    `<ul class="batch-list">${rows}</ul>` +
    (extra.length ? `<div class="batch-note muted">${escapeHtml(extra.join(' '))}</div>` : '');
}
let batchPollTimer = null; let batchPollUntil = 0;
function startBatchPoll() {
  if (!batchItems || !batchItems.some((it) => it.state === 'running' && it.run_id)) return;
  batchPollUntil = Date.now() + 6 * 60 * 1000;
  if (batchPollTimer) return;
  batchPollTimer = setInterval(async () => {
    if (Date.now() > batchPollUntil || els.hero.hidden || !batchItems) { stopBatchPoll(); return; }
    const pending = batchItems.filter((it) => it.state === 'running' && it.run_id);
    if (!pending.length) { stopBatchPoll(); return; }
    await Promise.all(pending.map(async (it) => {
      try {
        const r = await pollRun(it.run_id);
        // Free-first auto-deepen keeps status 'running' through the deep pass; a
        // saved report (or a terminal status) = ready to open.
        if (r.status === 'done' || r.status === 'error' || (r.report && r.status !== 'running')) {
          it.state = (r.status === 'error' && !r.report) ? 'failed' : 'ready';
        }
      } catch { /* keep polling */ }
    }));
    renderBatchList();
    if (!batchItems.some((it) => it.state === 'running')) stopBatchPoll();
  }, 5000);
}
function stopBatchPoll() { if (batchPollTimer) { clearInterval(batchPollTimer); batchPollTimer = null; } }

// Fire a research run for EACH name in parallel (all created at once, server-side
// Inngest jobs), then keep the user on the entry view watching Recent fill in —
// instead of running them one at a time.
async function runBatch(domains, deep) {
  const seen = new Set();
  const clean = [];
  const bad = [];
  for (const raw of domains) {
    try {
      const d = cleanDomainInput(raw);
      const key = d.toLowerCase();
      if (!seen.has(key)) { seen.add(key); clean.push(d); }
    } catch { bad.push(raw); }
  }
  if (!clean.length) { setBatchStatus(`Couldn't read any valid domains${bad.length ? `: ${bad.slice(0, 3).join(', ')}` : ''}.`, true); return; }
  const capped = clean.slice(0, BATCH_MAX);
  const skipped = clean.length - capped.length;
  if (els.go) els.go.disabled = true;
  setBatchStatus(`Starting ${capped.length} research run${capped.length === 1 ? '' : 's'}${deep ? ' (deep)' : ''}…`);
  const results = await Promise.allSettled(capped.map((domain) => enqueue({ domain, deep })));
  // Build one entry PER submitted name. A name we already researched comes back
  // `existing:true` (reused cached run, no re-spend) → 'ready'; a fresh name is
  // now 'running'; a rejected enqueue → 'failed'. Index-aligned with `capped`.
  batchItems = capped.map((domain, i) => {
    const r = results[i];
    if (r.status !== 'fulfilled') return { domain, run_id: null, state: 'failed' };
    const v = r.value || {};
    return { domain, run_id: v.run_id || null, state: v.existing ? 'ready' : 'running' };
  });
  batchDeep = deep; batchBad = bad; batchSkipped = skipped;
  renderBatchList();
  els.domain.value = '';
  autoResizeDomain();
  if (els.go) els.go.disabled = false;
  loadRecent();
  startBatchPoll();
  startRecentPoll();
}

// While a batch is running, refresh Recent so completed runs flip from
// "researching…" to a timestamp without a manual reload. Bounded so it can't
// poll forever; cleared when leaving the entry view.
let recentPollTimer = null;
let recentPollUntil = 0;
function startRecentPoll() {
  recentPollUntil = Date.now() + 6 * 60 * 1000; // up to ~6 min
  if (recentPollTimer) return;
  recentPollTimer = setInterval(() => {
    if (Date.now() > recentPollUntil || els.hero.hidden) { stopRecentPoll(); return; }
    loadRecent();
  }, 6000);
}
function stopRecentPoll() {
  if (recentPollTimer) { clearInterval(recentPollTimer); recentPollTimer = null; }
}

// Grow the domain textarea with its content (single line → multi as names stack).
function autoResizeDomain() {
  const el = els.domain;
  if (!el || el.tagName !== 'TEXTAREA') return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 220) + 'px';
}

els.form?.addEventListener('submit', (e) => {
  e.preventDefault();
  setBatchStatus('');
  const list = parseDomainList(els.domain.value);
  if (!list.length) return;
  const deep = chosenDeep();
  // More than one name → fan out in parallel and stay on the entry view.
  if (list.length > 1) { runBatch(list, deep); return; }
  // Single name → the normal in-place research flow.
  let domain;
  try { domain = cleanDomainInput(list[0]); }
  catch (err) { setStatus(String(err.message || err)); return; }
  els.domain.value = domain;
  autoResizeDomain();
  setActiveDomain(domain);
  run({ domain, deep });
});

// Enter submits; Shift+Enter inserts a newline (stack several names). Auto-grow
// the box as lines are added.
els.domain?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (typeof els.form.requestSubmit === 'function') els.form.requestSubmit();
    else els.form.dispatchEvent(new Event('submit', { cancelable: true }));
  }
});
els.domain?.addEventListener('input', autoResizeDomain);

els.deepenBtn?.addEventListener('click', deepen);
els.deepenTopBtn?.addEventListener('click', deepen);
els.cancelRun?.addEventListener('click', cancelRun);
els.exportPdf?.addEventListener('click', () => {
  // Name the saved PDF after the domain (the print dialog uses document.title as
  // the default filename), then restore the title once printing is done.
  const d = (currentReportDomain || '').trim();
  const prevTitle = document.title;
  if (d) document.title = `Domain Ownership Report — ${d}`;
  const restore = () => { document.title = prevTitle; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  // Let the title change settle before opening the print dialog.
  setTimeout(() => window.print(), 60);
});

// ── Owner outreach drawer ────────────────────────────────────────────────────
// Slide-over that drafts a first-touch email to the likely owner. The scenario
// is auto-classified server-side from the report's signals; the dropdown lets
// you force a different template. Copy-to-clipboard only — nothing is sent.
let outreachLoaded = false; // whether the current open has fetched a draft yet

function setOutreachStatus(msg, kind) {
  if (!els.odStatus) return;
  if (!msg) { els.odStatus.hidden = true; els.odStatus.textContent = ''; return; }
  els.odStatus.hidden = false;
  els.odStatus.textContent = msg;
  els.odStatus.className = 'od-status' + (kind ? ` od-status-${kind}` : '');
}

// ── DomainIQ historical-WHOIS drawer (the "History" quick action) ──
// Runs domainiq_lookup on demand via /api/lookup and distills the ownership
// lineage into a key-signals summary + a dated era timeline. Premium: each open
// spends a DomainIQ credit, so results are cached per-domain for the session.
const historyCache = {};
let historySeq = 0;

// A registrant value that is just a privacy/registrar/marketplace layer is NOT
// an identified owner — used to decide which eras carry a "meaningful" name.
const GENERIC_OWNER_RE = /\b(privacy|whoisguard|withheld for privacy|domains? by proxy|redacted|data protected|perfect privacy|contact privacy|private registration|namecheap|godaddy|dynadot|spaceship|porkbun|namebright|turncommerce|network solutions|tucows|opensrs|name\.com|enom|namesilo|ionos|register\.com|markmonitor|csc corporate|safenames|com laude|brandsight|afternic|sedo|atom|squadhelp|dan\.com|uniregistry|brandbucket|hugedomains|efty|epik|not disclosed|see privacyguardian|statutory masking)\b/i;

function hdGeneric(v) { return !v || GENERIC_OWNER_RE.test(String(v)); }

function setHistoryStatus(msg, kind = '') {
  if (!els.hdStatus) return;
  if (!msg) { els.hdStatus.hidden = true; els.hdStatus.textContent = ''; return; }
  els.hdStatus.hidden = false;
  els.hdStatus.textContent = msg;
  els.hdStatus.className = 'hd-status' + (kind ? ` hd-status-${kind}` : '');
}

function openHistory(domain) {
  const d = (domain || '').trim().toLowerCase();
  if (!els.historyDrawer || !d) return;
  setActiveDomain(d);
  els.historyDrawer.hidden = false;
  document.body.classList.add('drawer-open');
  if (els.hdDomain) els.hdDomain.textContent = d;
  loadHistory(d);
}

function closeHistory() {
  if (!els.historyDrawer) return;
  els.historyDrawer.hidden = true;
  document.body.classList.remove('drawer-open');
}

async function loadHistory(domain, opts = {}) {
  const seq = ++historySeq;
  if (!opts.force && historyCache[domain]) { renderHistory(historyCache[domain]); return; }
  if (els.hdBody) els.hdBody.innerHTML = '';
  setHistoryStatus('Pulling historical WHOIS from DomainIQ…', 'busy');
  try {
    const res = await fetch(`/research/api/lookup?source=domainiq_lookup&domain=${encodeURIComponent(domain)}`);
    const json = await res.json().catch(() => ({}));
    if (seq !== historySeq) return; // a newer open superseded this one
    if (!res.ok || json.ok === false) {
      throw new Error((json && (json.error || (json.data && json.data.error))) || `Lookup failed (${res.status})`);
    }
    const data = json.data || json;
    historyCache[domain] = data;
    setHistoryStatus('');
    renderHistory(data);
  } catch (e) {
    if (seq !== historySeq) return;
    setHistoryStatus((e && e.message) || 'Lookup failed.', 'err');
  }
}

// Build the distilled ownership-history HTML (key named-owner signals + the
// dated era timeline) from a domainiq_lookup result. Shared by the History
// drawer and the standalone DomainIQ view.
function historyHtml(data) {
  const eras = Array.isArray(data && data.eras) ? data.eras : [];
  if (!eras.length) {
    return `<p class="hd-empty">No historical WHOIS records found for this domain via DomainIQ.</p>`;
  }

  // Distill the "meaningful" owners: distinct named registrants (org/name) that
  // are NOT just a privacy/registrar layer, newest era first, with their contact.
  const seen = new Set();
  const signals = [];
  for (const e of [...eras].reverse()) {
    const name = (e.registrant_name || '').trim();
    const org = (e.registrant_org || '').trim();
    const label = !hdGeneric(name) ? name : (!hdGeneric(org) ? org : '');
    if (!label) continue;
    const k = label.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    const email = !hdGeneric(e.registrant_email) ? (e.registrant_email || '').trim() : '';
    const phone = (e.registrant_phone || '').trim();
    signals.push({ label, org: org && org.toLowerCase() !== label.toLowerCase() ? org : '', email, phone, first: e.first_seen, last: e.last_seen });
  }

  const range = (a, b) => (a && b && a !== b) ? `${escapeHtml(a)} → ${escapeHtml(b)}` : escapeHtml(a || b || '');
  const contactBits = (s) => [
    s.org ? `<span class="hd-sub">${escapeHtml(s.org)}</span>` : '',
    s.email ? `<a href="mailto:${escapeHtml(s.email)}" class="hd-link">${escapeHtml(s.email)}</a>` : '',
    s.phone ? `<span class="hd-phone">${escapeHtml(s.phone)}</span>` : '',
  ].filter(Boolean).join(' · ');

  const summaryHtml = signals.length
    ? `<div class="hd-section">
         <div class="hd-h">Key ownership signals</div>
         <p class="hd-note">Named registrants found in the WHOIS history (privacy/registrar layers excluded). The most recent named owner is usually the best lead.</p>
         <ul class="hd-signals">
           ${signals.map((s) => `<li class="hd-signal">
             <div class="hd-signal-name">${escapeHtml(s.label)}</div>
             <div class="hd-signal-meta">${contactBits(s) || '<span class="hd-muted">no contact in record</span>'}</div>
             <div class="hd-signal-dates">${range(s.first, s.last)}</div>
           </li>`).join('')}
         </ul>
       </div>`
    : `<div class="hd-section">
         <div class="hd-h">Key ownership signals</div>
         <p class="hd-note hd-muted">Every historical record is privacy- or registrar-shielded — no named owner is exposed in the WHOIS history. Run a full Owner report to triangulate the holder another way.</p>
       </div>`;

  const timelineHtml = `<div class="hd-section">
      <div class="hd-h">Ownership timeline <span class="hd-count">${eras.length} era${eras.length === 1 ? '' : 's'} · ${escapeHtml(String(data.total_snapshots || eras.length))} snapshots</span></div>
      <ol class="hd-timeline">
        ${[...eras].reverse().map((e) => {
          const who = [e.registrant_name, e.registrant_org].map((x) => (x || '').trim()).filter(Boolean).join(' — ') || '<span class="hd-muted">no registrant in record</span>';
          const meta = [
            e.registrant_email ? `<a href="mailto:${escapeHtml(e.registrant_email)}" class="hd-link">${escapeHtml(e.registrant_email)}</a>` : '',
            e.registrant_phone ? escapeHtml(e.registrant_phone) : '',
            e.registrar ? `Registrar: ${escapeHtml(e.registrar)}` : '',
          ].filter(Boolean).join(' · ');
          const ns = Array.isArray(e.nameservers) && e.nameservers.length ? `<div class="hd-ns">NS: ${e.nameservers.map((n) => escapeHtml(n)).join(', ')}</div>` : '';
          return `<li class="hd-era">
            <div class="hd-era-dates">${range(e.first_seen, e.last_seen)}</div>
            <div class="hd-era-who">${who}</div>
            ${meta ? `<div class="hd-era-meta">${meta}</div>` : ''}
            ${ns}
          </li>`;
        }).join('')}
      </ol>
    </div>`;

  return summaryHtml + timelineHtml;
}

function renderHistory(data) {
  if (els.hdBody) els.hdBody.innerHTML = historyHtml(data);
}

// ── DomainIQ standalone view (top-level menu) — same lookup as the History
// quick action, rendered into its own page instead of the drawer. ──
let diqSeq = 0;
async function runDiq(domain) {
  if (!els.diqResult) return;
  const d = (domain || '').trim().toLowerCase();
  if (!d) return;
  setActiveDomain(d);
  const seq = ++diqSeq;
  setToolStatus(els.diqStatus, `Pulling historical WHOIS for ${escapeHtml(d)} from DomainIQ…`);
  els.diqResult.hidden = true;
  // Reuse the History drawer's per-domain session cache so re-looking-up a
  // domain you already pulled doesn't re-spend a DomainIQ credit.
  if (historyCache[d]) {
    setToolStatus(els.diqStatus, '');
    els.diqResult.innerHTML = historyHtml(historyCache[d]);
    els.diqResult.hidden = false;
    return;
  }
  try {
    const res = await fetch(`/research/api/lookup?source=domainiq_lookup&domain=${encodeURIComponent(d)}`);
    const json = await res.json().catch(() => ({}));
    if (seq !== diqSeq) return;
    if (!res.ok || json.ok === false) {
      throw new Error((json && (json.error || (json.data && json.data.error))) || `Lookup failed (${res.status})`);
    }
    const data = json.data || json;
    historyCache[d] = data;
    setToolStatus(els.diqStatus, '');
    els.diqResult.innerHTML = historyHtml(data);
    els.diqResult.hidden = false;
  } catch (e) {
    if (seq !== diqSeq) return;
    setToolStatus(els.diqStatus, String((e && e.message) || e), true);
  }
}


function openOutreach() {
  if (!els.outreachDrawer || !currentRunId) return;
  els.outreachDrawer.hidden = false;
  document.body.classList.add('drawer-open');
  if (els.odDomain) els.odDomain.textContent = currentReportDomain || '';
  if (els.odTplTitle) els.odTplTitle.value = '';
  if (els.odTplStatus) { els.odTplStatus.hidden = true; els.odTplStatus.textContent = ''; }
  outreachLoaded = false;
  loadOutreach(null);
}

function closeOutreach() {
  if (!els.outreachDrawer) return;
  els.outreachDrawer.hidden = true;
  document.body.classList.remove('drawer-open');
}

// Cache of finished (LLM-sharpened) drafts, keyed by run + selection, so
// reopening or toggling back is instant.
const outreachCache = {};
let outreachSeq = 0;

async function fetchOutreach(scenarioId, mode) {
  const payload = { run_id: currentRunId };
  if (scenarioId) payload.scenario_id = scenarioId;
  if (mode === 'skeleton') payload.mode = 'skeleton';
  const res = await fetch('/research/api/outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.error || `Couldn't draft (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

// Two-phase load: render a deterministic template-fill instantly (skeleton),
// then swap in the LLM-sharpened draft. Cached full drafts skip both.
async function loadOutreach(scenarioId, opts = {}) {
  if (!currentRunId) return;
  const key = currentRunId + '::' + (scenarioId || 'auto');
  const seq = ++outreachSeq;

  if (!opts.force && outreachCache[key]) {
    renderOutreach(outreachCache[key]);
    outreachLoaded = true;
    setOutreachStatus('', '');
    return;
  }

  if (els.odCopy) els.odCopy.disabled = true;
  setOutreachStatus('Sharpening with AI…', 'busy');

  // Instant skeleton (deterministic, no LLM) — only applied if the full draft
  // hasn't already arrived and this is still the active load.
  let fullArrived = false;
  fetchOutreach(scenarioId, 'skeleton')
    .then((sk) => { if (seq === outreachSeq && !fullArrived) { renderOutreach(sk); outreachLoaded = true; } })
    .catch(() => {});

  try {
    const data = await fetchOutreach(scenarioId, 'full');
    if (seq !== outreachSeq) return; // superseded by a newer load
    fullArrived = true;
    renderOutreach(data);
    outreachCache[key] = data;
    outreachLoaded = true;
    setOutreachStatus(data.fallback ? 'Drafted from the template (LLM unavailable) — edit freely.' : '', data.fallback ? 'warn' : '');
  } catch (e) {
    if (seq === outreachSeq) setOutreachStatus(e.message || "Couldn't reach the drafting service.", 'err');
  } finally {
    if (seq === outreachSeq && els.odCopy) els.odCopy.disabled = false;
  }
}

function renderOutreach(data) {
  // (Re)build the scenario dropdown when the set of ids changes (e.g. a newly
  // saved custom template appears).
  if (els.odScenarioSel && Array.isArray(data.scenarios)) {
    const sig = data.scenarios.map((s) => s.id).join('|');
    if (els.odScenarioSel.dataset.ids !== sig) {
      els.odScenarioSel.innerHTML = '';
      let group = null;
      for (const s of data.scenarios) {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name + (s.custom ? ' (saved)' : '');
        els.odScenarioSel.appendChild(opt);
      }
      els.odScenarioSel.dataset.ids = sig;
    }
    if (data.scenario && data.scenario.id) els.odScenarioSel.value = data.scenario.id;
  }
  if (els.odWhy) {
    const e = escapeHtml;
    const lines = [];
    if (data.situation) lines.push(`<div class="od-why-situation">${e(data.situation)}</div>`);
    const why = (data.scenario && Array.isArray(data.scenario.why)) ? data.scenario.why : [];
    const meta = [];
    if (why.length) meta.push(`Why: ${why.map(e).join(' · ')}`);
    if (Array.isArray(data.hooks) && data.hooks.length) meta.push(`Personalized with: ${data.hooks.map(e).join(' · ')}`);
    if (meta.length) lines.push(`<div class="od-why-meta">${meta.join('<br>')}</div>`);
    els.odWhy.innerHTML = lines.join('');
  }
  // Nudge toward saving a template when the draft was bespoke / a weak fit.
  // (Skip during the instant skeleton — wait for the real LLM verdict.)
  if (els.odFitNote) {
    const bespoke = data.approach === 'bespoke' || data.approach === 'new_template';
    if (!data.skeleton && (data.fit === 'weak' || bespoke)) {
      els.odFitNote.hidden = false;
      els.odFitNote.textContent = bespoke
        ? 'No template was a strong fit — this was written for this report. If it’s a pattern you’ll see again, save it as a new template (name suggested below).'
        : 'Only a loose template match — drafted from the nearest one. Consider saving this as a new template (name suggested below).';
    } else {
      els.odFitNote.hidden = true;
      els.odFitNote.textContent = '';
    }
  }
  // Prefill the save-as-template name from the model's suggestion, unless the
  // user has already typed one.
  if (els.odTplTitle && data.suggested_title && !els.odTplTitle.value.trim()) {
    els.odTplTitle.value = data.suggested_title;
  }
  if (els.odSubject) els.odSubject.value = data.subject || '';
  if (els.odBody) els.odBody.value = data.body || '';
}

// Flash a copy-icon button to confirm the copy.
function flashCopy(btn) {
  if (!btn) return;
  btn.classList.add('copied');
  const t = btn.getAttribute('title');
  btn.setAttribute('title', 'Copied!');
  setTimeout(() => { btn.classList.remove('copied'); if (t) btn.setAttribute('title', t); }, 1400);
}
function copyText(text, btn) {
  if (!text || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => flashCopy(btn)).catch(() => {});
}

async function saveOutreachTemplate() {
  if (!currentRunId || !els.odTplTitle) return;
  const title = els.odTplTitle.value.trim();
  if (!title) { if (els.odTplStatus) { els.odTplStatus.hidden = false; els.odTplStatus.textContent = 'Give the template a name first.'; els.odTplStatus.className = 'od-status od-status-err'; } return; }
  if (els.odTplStatus) { els.odTplStatus.hidden = false; els.odTplStatus.textContent = 'Saving…'; els.odTplStatus.className = 'od-status od-status-busy'; }
  if (els.odTplSave) els.odTplSave.disabled = true;
  try {
    const res = await fetch('/research/api/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        run_id: currentRunId,
        action: 'save_template',
        title,
        subject: els.odSubject ? els.odSubject.value : '',
        body: els.odBody ? els.odBody.value : '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (els.odTplStatus) { els.odTplStatus.textContent = data.error || `Couldn't save (${res.status})`; els.odTplStatus.className = 'od-status od-status-err'; }
      return;
    }
    if (els.odTplStatus) { els.odTplStatus.textContent = 'Saved — added to your templates.'; els.odTplStatus.className = 'od-status'; }
    if (els.odFitNote) els.odFitNote.hidden = true;
    // Reload so the new template shows in the dropdown and is selected.
    if (data.template && data.template.id) loadOutreach(data.template.id);
  } catch (e) {
    if (els.odTplStatus) { els.odTplStatus.textContent = "Couldn't reach the server."; els.odTplStatus.className = 'od-status od-status-err'; }
  } finally {
    if (els.odTplSave) els.odTplSave.disabled = false;
  }
}

els.outreachBtn?.addEventListener('click', openOutreach);
els.outreachClose?.addEventListener('click', closeOutreach);
els.outreachBackdrop?.addEventListener('click', closeOutreach);
els.historyClose?.addEventListener('click', closeHistory);
els.historyBackdrop?.addEventListener('click', closeHistory);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (els.historyDrawer && !els.historyDrawer.hidden) { closeHistory(); return; }
  if (els.outreachDrawer && !els.outreachDrawer.hidden) closeOutreach();
});
els.odScenarioSel?.addEventListener('change', () => { if (outreachLoaded) loadOutreach(els.odScenarioSel.value); });
els.odRegen?.addEventListener('click', () => {
  const sel = els.odScenarioSel ? els.odScenarioSel.value : null;
  loadOutreach(sel === '__bespoke__' ? '__bespoke__' : sel, { force: true });
});
els.odCopySubject?.addEventListener('click', () => copyText(els.odSubject ? els.odSubject.value : '', els.odCopySubject));
els.odCopyBody?.addEventListener('click', () => copyText(els.odBody ? els.odBody.value : '', els.odCopyBody));
els.odTplSave?.addEventListener('click', saveOutreachTemplate);
els.odCopy?.addEventListener('click', () => {
  const subject = els.odSubject ? els.odSubject.value : '';
  const body = els.odBody ? els.odBody.value : '';
  const text = (subject ? `Subject: ${subject}\n\n` : '') + body;
  if (!text.trim() || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => {
    const orig = els.odCopy.textContent;
    els.odCopy.textContent = 'Copied!';
    els.odCopy.classList.add('copied');
    setTimeout(() => { els.odCopy.textContent = orig; els.odCopy.classList.remove('copied'); }, 1500);
  }).catch(() => {});
});

// One-click copy of all the primary target's email addresses (delegated, so it
// survives report re-renders).
els.report?.addEventListener('click', (ev) => {
  const btn = ev.target.closest('.copy-emails');
  if (!btn) return;
  const emails = btn.dataset.emails || '';
  if (!emails || !navigator.clipboard) return;
  navigator.clipboard.writeText(emails).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
  }).catch(() => {});
});

// On-demand phone enhance (delegated). Spends one premium FullEnrich credit to
// pull a phone for ONE named person; the result is persisted onto the run, so we
// re-fetch + re-render to show it (and a reload won't re-spend).
els.report?.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('.enhance-phone');
  if (!btn || !currentRunId) return;
  const name = btn.dataset.name || '';
  const linkedin_url = btn.dataset.linkedin || '';
  if (btn.disabled) return;
  const orig = btn.textContent;
  // The "premium · spends a credit" note doubles as our PERSISTENT status line —
  // the outcome stays visible instead of flashing for 2.5s, so the user always
  // knows whether the lookup found a phone, came up empty, or errored.
  const note = (btn.closest('.lc-enhance') || btn.parentElement)?.querySelector('.lc-enhance-note');
  const setNote = (txt, cls) => { if (note) { note.textContent = txt; note.className = `lc-enhance-note${cls ? ` lc-enhance-note-${cls}` : ''}`; } };
  btn.disabled = true;
  btn.textContent = 'Looking up phone… (~30s)';
  setNote('Checking FullEnrich…', '');
  try {
    const res = await fetch('/research/api/research', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: currentRunId, enhance_contact: { name, linkedin_url } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    const phones = Array.isArray(data.phones) ? data.phones : [];
    if (phones.length) {
      // A phone came back — re-render so it shows in the contact card (persisted
      // onto the run, so a reload won't re-spend the credit).
      const r = await pollRun(currentRunId);
      renderReport(r.report);
    } else {
      // Lookup completed but FullEnrich had no phone for this person. Leave the
      // button DISABLED — retrying the same person would just burn another credit
      // for the same empty result. Persistent note explains the outcome.
      const emailNote = (Array.isArray(data.emails) && data.emails.length) ? ' (an email is shown above)' : '';
      btn.textContent = 'No phone on file';
      btn.disabled = true;
      setNote(`No phone number found for this person${emailNote}.`, 'miss');
    }
  } catch (err) {
    // The lookup didn't complete (network/timeout) — re-enable so a retry is
    // possible (this path didn't return a result to spend a credit on).
    btn.textContent = orig;
    btn.disabled = false;
    setNote(`⚠️ Lookup failed: ${err.message || 'error'}. Click to try again.`, 'err');
  }
});

// Market strip (delegated): "refresh" forces a fresh check; clicking DomainScout
// copies the bare domain so the bookmarklet can read it from the clipboard.
els.marketStrip?.addEventListener('click', (ev) => {
  const refresh = ev.target.closest('.ms-refresh');
  if (refresh) {
    ev.preventDefault();
    const d = els.marketStrip.dataset.domain;
    if (d) runMarketStrip(d, { force: true });
    return;
  }
  const more = ev.target.closest('.ms-more');
  if (more) {
    ev.preventDefault();
    const box = more.nextElementSibling;
    if (box && box.classList.contains('ms-notlisted')) {
      const open = box.hidden;
      box.hidden = !open;
      more.setAttribute('aria-expanded', open ? 'true' : 'false');
      more.innerHTML = more.innerHTML.replace(open ? '▸' : '▾', open ? '▾' : '▸');
    }
    return;
  }
  const ds = ev.target.closest('a.ms-ds');
  if (ds && ds.dataset.dsDomain && navigator.clipboard) {
    navigator.clipboard.writeText(ds.dataset.dsDomain).catch(() => {});
  }
});

els.rfYes?.addEventListener('click', () => submitFeedback({ was_correct: true }));
els.rfNo?.addEventListener('click', () => { if (els.rfCorrection) els.rfCorrection.hidden = false; });
els.chatForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = els.chatInput ? els.chatInput.value.trim() : '';
  if (!msg) return;
  els.chatInput.value = '';
  sendChat(msg);
});
els.chatRegenSynth?.addEventListener('click', () => regenerateFromChat('synth'));
els.chatRegenDeep?.addEventListener('click', () => {
  if (!confirm('Re-run the full deep research pipeline using the chat as context? Takes ~3-5 minutes and uses paid sources.')) return;
  regenerateFromChat('deep');
});
els.rfSubmit?.addEventListener('click', () => submitFeedback({
  was_correct: false,
  correct_owner: els.rfOwner ? els.rfOwner.value.trim() : '',
  correct_contact: els.rfContact ? els.rfContact.value.trim() : '',
  notes: els.rfNotes ? els.rfNotes.value.trim() : '',
}));

// Mobile hamburger
function closeNav() { els.nav?.classList.remove('open'); els.navToggle?.setAttribute('aria-expanded', 'false'); }
els.navToggle?.addEventListener('click', () => {
  const open = els.nav.classList.toggle('open');
  els.navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});
els.nav?.addEventListener('click', (e) => { if (e.target.closest('.nav-btn')) closeNav(); });

// The nav tabs are real <a href> links. Let the browser handle new-tab gestures
// (⌘/ctrl/shift/alt-click, or any non-left button) natively; only hijack a plain
// left-click for in-page SPA nav.
const newTabClick = (e) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
els.navResearch?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); showEntry(); });
els.researchNew?.addEventListener('click', () => showEntry());
els.homeLink?.addEventListener('click', (e) => { e.preventDefault(); closeNav(); showEntry(); });
els.navTrademark?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('trademark', ''); route(); });
els.navAppraisal?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('appraisal', ''); route(); });
els.navSnapEval?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('evaluate', ''); route(); });
els.navBulkEval?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('bulk-eval', ''); route(); });

// ── Bulk Eval — rank a list/CSV of domains by investability ─────────────────
let beLast = null; // last results (for CSV)
function beParseInput(text) {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    // Split on comma / tab / whitespace; first token = domain, a following numeric = price.
    const parts = t.split(/[,\t]+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    const domain = (parts[0] || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain || !domain.includes('.')) continue;
    let price = null;
    for (const p of parts.slice(1)) {
      const n = Number(String(p).replace(/[$,]/g, ''));
      if (Number.isFinite(n) && n > 0) { price = n; break; }
    }
    out.push({ domain, price });
  }
  return out;
}
async function beRun() {
  const names = beParseInput(document.getElementById('be-input')?.value);
  const status = document.getElementById('be-status');
  const results = document.getElementById('be-results');
  const csvBtn = document.getElementById('be-csv');
  if (!names.length) { if (status) status.textContent = 'Paste at least one domain.'; return; }
  if (status) status.textContent = `Evaluating ${names.length} name${names.length > 1 ? 's' : ''}…`;
  if (results) results.innerHTML = '';
  if (csvBtn) csvBtn.hidden = true;
  try {
    const res = await fetch('/research/api/bulk-eval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    beLast = data;
    if (status) status.textContent = `${data.count} evaluated${data.has_prices ? ' · ranked by ROI' : ' · ranked by estimated resale'}${data.capped ? ' · capped at 500' : ''}`;
    beState.sortKey = null;
    beRender();
    if (csvBtn) csvBtn.hidden = !(data.results && data.results.length);
  } catch (e) {
    if (status) status.textContent = '';
    if (results) results.innerHTML = `<div class="sr-status">${escapeHtml(e.message || String(e))}</div>`;
  }
}
// Filter + sort state for the Bulk Eval table (client-side over beLast).
const beState = { q: '', grades: new Set(['A', 'B', 'C', 'D', 'F']), types: new Set(['word', 'brandable', 'junk']), sortKey: null, sortDir: 1 };
const beUsd = (n) => (n == null ? '—' : `$${Math.round(n).toLocaleString()}`);
const beConfRank = (r) => (r.speculative ? 3 : ({ high: 0, medium: 1, 'low-medium': 1.5, low: 2 }[r.confidence] ?? 2));
function beSortVal(r, key) {
  switch (key) {
    case 'domain': return r.domain;
    case 'asking': return r.price ?? -1;
    case 'resale': return r.resale?.mid ?? -1;
    case 'upside': return r.upside ?? -Infinity;
    case 'roi': return r.roi ?? -Infinity;
    case 'verdict': return r.band ? r.band.ratio : Infinity; // lower ratio = better buy
    case 'quality': return r.quality?.score ?? -1;
    case 'confidence': return beConfRank(r);
    default: return r.rank;
  }
}
function beSetSort(key) {
  if (beState.sortKey === key) beState.sortDir = -beState.sortDir;
  else { beState.sortKey = key; beState.sortDir = (key === 'domain' || key === 'verdict' || key === 'confidence') ? 1 : -1; }
  beRender();
}
function beRender(focusSearch) {
  const el = document.getElementById('be-results');
  if (!el) return;
  if (!beLast || !beLast.results) { el.innerHTML = ''; return; }
  const all = beLast.results.filter((r) => !r.error);
  let rows = all.filter((r) => {
    if (beState.q && !r.domain.toLowerCase().includes(beState.q)) return false;
    if (r.quality && !beState.grades.has(r.quality.grade)) return false;
    const dc = r.quality?.dictionary_class;
    if (dc && !beState.types.has(dc)) return false;
    return true;
  });
  if (beState.sortKey) {
    rows.sort((a, b) => { const va = beSortVal(a, beState.sortKey); const vb = beSortVal(b, beState.sortKey); if (va < vb) return -1 * beState.sortDir; if (va > vb) return 1 * beState.sortDir; return a.rank - b.rank; });
  }
  const arrow = (k) => (beState.sortKey === k ? (beState.sortDir === 1 ? ' ▲' : ' ▼') : '');
  const H = (k, label, cls) => `<th class="${cls || ''}" data-be-sort="${k}">${label}${arrow(k)}</th>`;
  const gChip = (g) => `<button type="button" class="be-chip${beState.grades.has(g) ? ' on' : ''}" data-be-grade="${g}">${g}</button>`;
  const tChip = (t, label) => `<button type="button" class="be-chip${beState.types.has(t) ? ' on' : ''}" data-be-type="${t}">${label}</button>`;
  const filterBar = `<div class="be-filter">
    <input id="be-filter-q" class="be-fq" placeholder="Filter domains…" value="${escapeHtml(beState.q)}" autocomplete="off" />
    <span class="be-fl">Grade</span>${['A', 'B', 'C', 'D', 'F'].map(gChip).join('')}
    <span class="be-fl">Type</span>${tChip('word', 'Word')}${tChip('brandable', 'Brandable')}${tChip('junk', 'Junk')}
    <button type="button" class="be-chip be-star" data-be-premium="1">⭐ Premium only</button>
    <button type="button" class="be-chip" data-be-clear="1">Clear</button>
  </div>`;
  const body = rows.map((r) => {
    const band = r.band ? `<span class="be-band" style="background:${escapeHtml(r.band.color)}22;color:${escapeHtml(r.band.color)}">${escapeHtml(r.band.label)}</span>` : '<span class="muted">—</span>';
    const roi = r.roi == null ? '<span class="muted">—</span>' : `<strong style="color:${r.roi >= 4 ? '#0b8f3a' : r.roi >= 1 ? '#caa024' : '#cf3030'}">${Math.round(r.roi * 100)}%</strong>`;
    const grade = `<span class="be-grade be-grade-${(r.quality?.grade || '').toLowerCase()}">${escapeHtml(r.quality?.grade || '?')}</span>`;
    const spec = r.speculative;
    const resaleCell = spec ? `<span class="muted" title="Speculative — no comparable sales. A conservative wholesale estimate; run the full SNAP Eval for a real read.">~${beUsd(r.resale?.mid)}</span>` : `<strong>${beUsd(r.resale?.mid)}</strong>`;
    const conf = spec ? '<span style="color:#a3502f">speculative · no comps</span>' : `${escapeHtml(r.confidence || '')}${r.comps ? ` · ${r.comps} comp${r.comps > 1 ? 's' : ''}` : ''}`;
    return `<tr>
      <td><a href="/research/evaluate/${encodeURIComponent(r.domain)}" title="Full SNAP Eval">${escapeHtml(r.domain)}</a></td>
      <td class="be-num">${beUsd(r.price)}</td>
      <td class="be-num">${resaleCell}</td>
      <td class="be-num">${r.upside == null ? '<span class="muted">—</span>' : beUsd(r.upside)}</td>
      <td class="be-num">${roi}</td>
      <td>${band}</td>
      <td>${grade}</td>
      <td class="muted">${conf}</td>
    </tr>`;
  }).join('');
  const specN = all.filter((r) => r.speculative).length;
  const note = specN ? `<p class="be-note muted">⚠ ${specN} of ${all.length} are <strong>speculative</strong> — coined names with no comparable sales get a conservative <em>wholesale</em> estimate (marked ~). Click a name for the full SNAP Eval for a real read. Tip: <strong>⭐ Premium only</strong> = grade A, real/brandable words.</p>` : '';
  el.innerHTML = `${note}${filterBar}<div class="be-count muted">${rows.length} of ${all.length} shown</div><div class="be-table-wrap"><table class="be-table">
    <thead><tr>${H('domain', 'Domain')}${H('asking', 'Asking', 'be-num')}${H('resale', 'Est. resale', 'be-num')}${H('upside', 'Upside', 'be-num')}${H('roi', 'ROI', 'be-num')}${H('verdict', 'Verdict')}${H('quality', 'Quality')}${H('confidence', 'Confidence')}</tr></thead>
    <tbody>${body}</tbody></table></div>`;
  if (focusSearch) { const q = document.getElementById('be-filter-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
}
document.getElementById('be-results')?.addEventListener('click', (e) => {
  const t = e.target.closest('[data-be-sort],[data-be-grade],[data-be-type],[data-be-premium],[data-be-clear]');
  if (!t) return;
  if (t.dataset.beSort) beSetSort(t.dataset.beSort);
  else if (t.dataset.beGrade) { const g = t.dataset.beGrade; beState.grades.has(g) ? beState.grades.delete(g) : beState.grades.add(g); beRender(); }
  else if (t.dataset.beType) { const ty = t.dataset.beType; beState.types.has(ty) ? beState.types.delete(ty) : beState.types.add(ty); beRender(); }
  else if (t.dataset.bePremium) { beState.grades = new Set(['A', 'B']); beState.types = new Set(['word', 'brandable']); beRender(); }
  else if (t.dataset.beClear) { beState.q = ''; beState.grades = new Set(['A', 'B', 'C', 'D', 'F']); beState.types = new Set(['word', 'brandable', 'junk']); beState.sortKey = null; beRender(); }
});
document.getElementById('be-results')?.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'be-filter-q') { beState.q = e.target.value.trim().toLowerCase(); beRender(true); }
});
function beCsv() {
  if (!beLast || !beLast.results) return;
  const cols = ['rank', 'domain', 'asking_price', 'est_resale', 'basis', 'speculative', 'upside', 'roi_pct', 'verdict', 'quality_grade', 'quality_score', 'confidence', 'comps'];
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [cols.join(',')];
  for (const r of beLast.results) {
    lines.push([r.rank, r.domain, r.price ?? '', r.resale?.mid ?? '', r.basis ?? '', r.speculative ? 'yes' : '', r.upside ?? '', r.roi == null ? '' : Math.round(r.roi * 100), r.band?.label ?? '', r.quality?.grade ?? '', r.quality?.score ?? '', r.confidence ?? (r.error || ''), r.comps ?? ''].map(esc).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bulk-eval.csv';
  a.click();
}
async function beLoadSheet() {
  const url = document.getElementById('be-sheet')?.value.trim();
  const status = document.getElementById('be-status');
  if (!url) { if (status) status.textContent = 'Paste a Google Sheets link first.'; return; }
  if (status) status.textContent = 'Reading sheet…';
  try {
    const res = await fetch('/research/api/bulk-eval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sheet_url: url }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const ta = document.getElementById('be-input');
    if (ta) ta.value = (data.names || []).map((n) => (n.price ? `${n.domain}, ${n.price}` : n.domain)).join('\n');
    if (status) status.textContent = `Loaded ${data.count} name${data.count > 1 ? 's' : ''} from the sheet${data.priced ? ' (with prices)' : ''}. Review, then Evaluate.`;
  } catch (e) {
    if (status) status.textContent = e.message || String(e);
  }
}
document.getElementById('be-load-sheet')?.addEventListener('click', beLoadSheet);
document.getElementById('be-run')?.addEventListener('click', beRun);
document.getElementById('be-csv')?.addEventListener('click', beCsv);
document.getElementById('be-file')?.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => { const ta = document.getElementById('be-input'); if (ta) ta.value = String(reader.result || ''); };
  reader.readAsText(f);
});
// nav-snap-opps is a cross-app link (/reports/opportunities, the admin app) — no
// handler, so it does a normal full navigation.
els.navDbscreen?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('dbscreen', ''); route(); });
els.navDbsearch?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('dbsearch', ''); route(); });
els.dbForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!(els.dbDomain.value || '').trim()) return;
  let d;
  try { d = cleanDomainInput(els.dbDomain.value); }
  catch (err) { setToolStatus(els.dbStatus, String(err.message || err), true); return; }
  els.dbDomain.value = d;
  setToolUrl('dbscreen', d);
  runDbScreen(d);
});

// ── Nameserver Search ───────────────────────────────────────────────────────
// Domain → its NS; NS set → domains (AND/OR); domain → siblings on the same
// pairing; + an LLM "which siblings are related" pass. Server: /api/nameserver.
const nsState = { mode: 'domain', match: 'all', tld: '', nsRaw: '', facets: null, pairDomain: '', pairTld: '', pairFacets: null, listKind: '', listHasMore: false };

function nsSetMode(mode) {
  nsState.mode = mode === 'ns' ? 'ns' : 'domain';
  if (els.nsModeToggle) for (const b of els.nsModeToggle.querySelectorAll('button')) b.classList.toggle('active', b.dataset.mode === nsState.mode);
  if (els.nsDomainForm) els.nsDomainForm.hidden = nsState.mode !== 'domain';
  if (els.nsNsForm) els.nsNsForm.hidden = nsState.mode !== 'ns';
}
function nsReset() {
  nsSetMode('domain');
  if (els.nsDomain) els.nsDomain.value = '';
  if (els.nsNs) els.nsNs.value = '';
  if (els.nsResult) { els.nsResult.hidden = true; els.nsResult.innerHTML = ''; }
  nsState.tld = ''; nsState.nsRaw = ''; nsState.facets = null;
  nsState.pairDomain = ''; nsState.pairTld = ''; nsState.pairFacets = null;
  setToolStatus(els.nsStatus, '');
  nsRenderRecent();
}

// Recent domain lookups (client-side, so you can revisit without retyping).
const NS_RECENT_KEY = 'ns:recent';
function nsRecentList() {
  try { return JSON.parse(localStorage.getItem(NS_RECENT_KEY) || '[]').filter(Boolean); } catch { return []; }
}
function nsRecentAdd(domain) {
  const d = String(domain || '').trim().toLowerCase();
  if (!d) return;
  const list = [d, ...nsRecentList().filter((x) => x !== d)].slice(0, 8);
  try { localStorage.setItem(NS_RECENT_KEY, JSON.stringify(list)); } catch { /* ignore quota */ }
  nsRenderRecent();
}
function nsRenderRecent() {
  if (!els.nsRecent) return;
  const list = nsRecentList();
  if (!list.length) { els.nsRecent.hidden = true; els.nsRecent.innerHTML = ''; return; }
  els.nsRecent.hidden = false;
  els.nsRecent.innerHTML = '<span class="ns-recent-label">Recent:</span> ' +
    list.map((d) => `<button type="button" class="ns-recent-chip" data-recent="${escapeHtml(d)}">${escapeHtml(d)}</button>`).join('') +
    '<button type="button" class="ns-recent-clear" data-recent-clear="1">clear</button>';
}
function nsRowsHtml(rows) {
  if (!rows || !rows.length) return '<p class="muted">No domains.</p>';
  return '<ul class="ns-list">' + rows.map((r) => {
    const d = typeof r === 'string' ? r : r.domain;
    const nsCount = (r && r.nameservers && r.nameservers.length) ? ` <span class="muted">(${r.nameservers.length} NS)</span>` : '';
    return `<li><a href="/dbscreen/${encodeURIComponent(d)}" class="ns-dlink" data-domain="${escapeHtml(d)}">${escapeHtml(d)}</a>${nsCount}</li>`;
  }).join('') + '</ul>';
}

// A selectable result block: checkbox list + a toolbar (select-all, optional CSV
// export, and "run free owner lookup on selected"). `items` = [{domain, metaHtml,
// checked}]. `csvRows` (if given) enables the Export-CSV button for that list.
function nsSelectableBlock(headHtml, items, { csvRows = null, seed = '', singleCol = false } = {}) {
  nsState.csvRows = csvRows;
  if (seed) nsState.seed = seed;
  const lis = items.map((it) =>
    `<li><input type="checkbox" class="ns-cb" value="${escapeHtml(it.domain)}"${it.checked ? ' checked' : ''}> ` +
    `<a href="/dbscreen/${encodeURIComponent(it.domain)}" class="ns-dlink" data-domain="${escapeHtml(it.domain)}">${escapeHtml(it.domain)}</a>` +
    `${it.metaHtml || ''}</li>`).join('');
  const csvBtn = csvRows ? '<button type="button" class="ns-btn ns-btn-sm" data-act="export-csv">⬇ Export CSV</button>' : '';
  return headHtml +
    '<div class="ns-toolbar">' +
      '<label class="ns-selall-l"><input type="checkbox" class="ns-selall" checked> Select all</label>' +
      csvBtn +
      '<button type="button" class="ns-btn ns-btn-sm ns-btn-ai" data-act="owner-lookup">🔎 Run free owner lookup on selected</button>' +
    '</div>' +
    // Output panel sits ABOVE the list so the running status + results show right
    // under the button — no scrolling past a long sibling list.
    '<div id="ns-owner-out"></div>' +
    `<ul class="ns-list ns-picklist${singleCol ? ' ns-onecol' : ''}">${lis}</ul>`;
}

// Build + download a CSV client-side (no server round-trip).
function nsDownloadCsv(filename, header, rows) {
  const esc = (v) => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const body = [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function nsExportPairingCsv() {
  let rows = nsState.csvRows || [];
  const tldF = (nsState.listKind === 'pairing' ? nsState.pairTld : nsState.tld) || '';
  // The on-screen list is only the first page. If there's more, pull the FULL
  // match for the current view (respecting the active TLD filter) before exporting.
  if (nsState.listHasMore) {
    const params = nsState.listKind === 'pairing'
      ? `mode=pairing&domain=${encodeURIComponent(nsState.pairDomain)}${tldF ? `&tld=${encodeURIComponent(tldF)}` : ''}&full=1`
      : `mode=ns&ns=${encodeURIComponent(nsState.nsRaw)}&match=${nsState.match}${tldF ? `&tld=${encodeURIComponent(tldF)}` : ''}&full=1`;
    setToolStatus(els.nsStatus, 'Building full CSV…');
    try {
      const data = await nsFetch(params);
      if (Array.isArray(data.rows) && data.rows.length) rows = data.rows;
      setToolStatus(els.nsStatus, '');
    } catch (e) {
      setToolStatus(els.nsStatus, 'Couldn’t fetch the full list — exporting the loaded page only.', true);
    }
  }
  if (!rows.length) return;
  nsDownloadCsv(`pairing-${nsState.seed || 'domains'}${tldF ? `-${tldF}` : ''}.csv`, ['domain', 'tld', 'nameservers'],
    rows.map((r) => [r.domain, r.tld || '', (r.nameservers || []).join(' ')]));
}
function nsExportOwnerCsv() {
  const rows = nsState.ownerResults || [];
  if (!rows.length) return;
  nsDownloadCsv(`owner-sweep-${nsState.seed || 'domains'}.csv`,
    ['domain', 'internal_owner', 'registrant_name', 'organization', 'email', 'phone', 'registrar', 'cluster_siblings', 'site_title', 'listed_for_sale'],
    rows.map((r) => {
      const reg = r.registrant || {};
      return [r.domain, r.internalOwner || '', reg.name || '', reg.organization || '', reg.email || '', reg.phone || '',
        reg.registrar || '', (r.cluster || []).length, (r.site && r.site.title) || '', (r.listed && r.listed.any) ? 'yes' : 'no'];
    }));
}

// Free SWEEP over the selected domains: all free endpoints aggregated per
// domain (internal owner, registrant, registration cluster, live site,
// marketplace, DNS) + a per-domain drill-down into the full report.
async function nsRunOwnerLookup(domains) {
  const out = document.getElementById('ns-owner-out');
  if (!out) return;
  const list = domains.slice(0, 6);
  const warn = domains.length > 6 ? `<p class="muted">Sweeping the first 6 of ${domains.length} selected (free-sweep cap).</p>` : '';
  out.innerHTML = warn + '<div class="ns-running">⏳ Sweeping all free endpoints (registrant, registration cluster, live site, marketplace, our DBs)…</div>';
  // The panel sits right under the button now; keep it in view on click.
  out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  try {
    const ctx = nsState.contextRunId ? `&run_id=${encodeURIComponent(nsState.contextRunId)}` : '';
    const data = await nsFetch(`mode=sweep&domains=${encodeURIComponent(list.join(','))}${ctx}`);
    nsState.ownerResults = data.results || [];
    out.innerHTML = warn + nsSweepCards(data.results || []);
  } catch (e) {
    out.innerHTML = `<p class="status error">${escapeHtml(String((e && e.message) || e))}</p>`;
  }
}
function nsSweepRow(label, html) {
  return html ? `<div class="ns-srow"><span class="ns-slabel">${label}</span><span class="ns-sval">${html}</span></div>` : '';
}

// ── Background deep research on selected siblings (consolidate → the core) ────
// When the free sweep hits privacy walls, run the FULL deep report on the
// privacy-walled siblings ASYNCHRONOUSLY (no navigation), then harvest the
// contacts each finds back into one consolidated panel for the core. A bell
// notification also fires server-side per run, so you can leave and come back.
async function nsRunDeepBackground(domains) {
  const out = document.getElementById('ns-deep-out');
  if (!out) return;
  const list = [...new Set(domains || [])].slice(0, 4);
  if (!list.length) return;
  if (!window.confirm(`Run PAID deep research on ${list.length} sibling${list.length === 1 ? '' : 's'} in the background?\n\n${list.join('\n')}\n\nEach is a full deep report (spends credits). A bell fires as each finishes, and any contacts found are pulled in here.`)) return;
  out.innerHTML = `<div class="ns-running">⏳ Starting deep research on ${list.length} sibling${list.length === 1 ? '' : 's'}…</div>`;
  const items = [];
  for (const domain of list) {
    try { const data = await enqueue({ domain, deep: true }); items.push({ domain, runId: data.run_id, status: 'running' }); }
    catch (e) { items.push({ domain, error: String((e && e.message) || e) }); }
  }
  nsState.deepItems = items;
  nsDeepRender();
  for (const it of items) if (it.runId) nsDeepPoll(it);
}
function nsDeepPoll(it) {
  const timer = setInterval(async () => {
    try {
      const r = await pollRun(it.runId);
      if (r.status === 'done') { clearInterval(timer); it.status = 'done'; it.report = r.report; nsDeepHarvest(it); nsDeepRender(); if (typeof loadNotifications === 'function') loadNotifications(); }
      else if (r.status === 'error' || r.status === 'cancelled') { clearInterval(timer); it.status = r.status; nsDeepRender(); }
    } catch { /* transient — keep polling */ }
  }, 5000);
}
function nsDeepHarvest(it) {
  const data = parseReportData(it.report && it.report.markdown) || {};
  it.likely_owner = data.likely_owner || null;
  it.contacts = (Array.isArray(data.contacts) ? data.contacts : [])
    .filter((c) => c && c.value && ['name', 'email', 'phone', 'org', 'social'].includes(String(c.type).toLowerCase()) && !NS_CONTACT_NOISE.test(String(c.value).toLowerCase()));
}
function nsDeepRender() {
  const out = document.getElementById('ns-deep-out');
  if (!out) return;
  const items = nsState.deepItems || [];
  const li = items.map((it) => {
    if (it.error) return `<li>${escapeHtml(it.domain)} — <span class="status error">failed: ${escapeHtml(it.error)}</span></li>`;
    if (it.status === 'done') {
      const cs = (it.contacts || []).slice(0, 8).map((c) => `<span class="ns-deep-c">${escapeHtml(c.type)}: ${escapeHtml(c.value)}</span>`).join(' · ');
      return `<li>✓ <a href="/dbscreen/${encodeURIComponent(it.domain)}" class="ns-dlink" data-domain="${escapeHtml(it.domain)}">${escapeHtml(it.domain)}</a>` +
        `${it.likely_owner ? ` — <strong>${escapeHtml(it.likely_owner)}</strong>` : ''}` +
        `${cs ? `<br>${cs}` : ' <span class="muted">— no new contact found</span>'}</li>`;
    }
    return `<li>${escapeHtml(it.domain)} — <span class="muted">researching… (a bell will fire when done)</span></li>`;
  }).join('');
  const allDone = items.length && items.every((it) => it.status === 'done' || it.error || it.status === 'error' || it.status === 'cancelled');
  const head = allDone ? '✅ Deep research complete — contacts consolidated below' : '⏳ Deep research running in the background…';
  out.innerHTML = `<div class="ns-deep-panel"><h4>${head}</h4><ul class="ns-list ns-onecol ns-deep-list">${li}</ul>` +
    '<p class="muted ns-note">A bell notification fires for each as it finishes — you can leave this page and come back.</p></div>';
}
// A sweep result is a "lead" when it exposes a REAL owner contact (not a
// privacy/role/registrar value) — a usable handle for an otherwise-murky seed.
const NS_CONTACT_NOISE = /redact|privacy|priv(?:ate)?|proxy|whois\s?guard|withheld|not\s?disclosed|undisclosed|gdpr|data\s?protected|domains?\s?by\s?proxy|perfect\s?privacy|identity\s?protect|registrant|abuse@|hostmaster@|postmaster@|admin@|noc@/i;
function nsLead(r) {
  if (!r) return false;
  if (r.internalOwner) return true;
  const reg = r.registrant || {};
  const cleanName = (reg.name || reg.organization) && !NS_CONTACT_NOISE.test(`${reg.name || ''} ${reg.organization || ''}`);
  const cleanEmail = reg.email && !NS_CONTACT_NOISE.test(reg.email);
  const siteEmail = r.site && Array.isArray(r.site.emails) && r.site.emails.some((e) => !NS_CONTACT_NOISE.test(e));
  return !!(cleanName || cleanEmail || siteEmail || reg.phone);
}
function nsSweepCard(r) {
  const reg = r.registrant || {};
  const who = reg.name || reg.organization
    ? escapeHtml([reg.name, reg.organization].filter(Boolean).join(' · '))
    : reg.privacy ? '<span class="muted">privacy-protected</span>' : '<span class="muted">—</span>';
  const cluster = (r.cluster || []).filter((c) => c.registrant || c.shares_ns);
  const clusterHtml = (r.cluster && r.cluster.length)
    ? `${r.cluster.length} likely-same-owner sibling${r.cluster.length === 1 ? '' : 's'}` +
      (cluster.length ? ': ' + cluster.slice(0, 6).map((c) =>
        `<a href="/dbscreen/${encodeURIComponent(c.domain)}" class="ns-dlink" data-domain="${escapeHtml(c.domain)}">${escapeHtml(c.domain)}</a>` +
        (c.registrant ? ` <span class="muted">(${escapeHtml(c.registrant)})</span>` : '')).join(', ') : '')
    : '';
  const site = r.site;
  const siteHtml = site
    ? [site.title ? escapeHtml(site.title) : '', site.copyright ? escapeHtml(site.copyright) : '',
       (site.emails || []).length ? (site.emails.map((e) => escapeHtml(e)).join(', ')) : '',
       site.parked ? '<span class="ns-conf ns-conf-low">parked / for sale</span>' : '']
      .filter(Boolean).join(' · ')
    : '';
  const socials = site && site.socials && site.socials.length
    ? site.socials.slice(0, 6).map((s) => `<a href="${escapeHtml(s)}" target="_blank" rel="noopener">${escapeHtml(s.replace(/^https?:\/\/(www\.)?/, ''))}</a>`).join(' · ')
    : '';
  const listed = r.listed && r.listed.any
    ? `Listed for sale${r.listed.channels.length ? ': ' + r.listed.channels.map((c) => c.url ? `<a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.channel)}</a>` : escapeHtml(c.channel)).join(', ') : ''}`
    : '';
  const dnsHtml = r.dns && (r.dns.mx.length || r.dns.a.length)
    ? [r.dns.mx.length ? `MX: ${r.dns.mx.map((m) => escapeHtml(m)).join(', ')}` : '', r.dns.a.length ? `IP: ${r.dns.a.map((a) => escapeHtml(a)).join(', ')}` : ''].filter(Boolean).join(' · ')
    : '';
  const drill = canModule(currentUser, 'domain_owner')
    ? `<div class="ns-drill">` +
      `<button type="button" class="ns-btn ns-btn-sm" data-act="report" data-domain="${escapeHtml(r.domain)}">📄 Free report →</button>` +
      `<button type="button" class="ns-btn ns-btn-sm ns-btn-ai" data-act="deep" data-domain="${escapeHtml(r.domain)}">🔬 Deep research →</button>` +
      `</div>` : '';
  const matchLabel = (m) => m.kind === 'email' ? `email ${m.detail}` : m.kind === 'email_domain' ? `email ${m.detail}` : `name “${m.detail}”`;
  const matchBadge = (r.matches && r.matches.length)
    ? `<div class="ns-match">🎯 Confirmed same owner — shares ${r.matches.map((m) => escapeHtml(matchLabel(m))).join(', ')} with the linked report</div>`
    : '';
  return `<div class="ns-sweepcard${r.matches && r.matches.length ? ' ns-sweepcard-hit' : ''}">` +
    `<h4><a href="/dbscreen/${encodeURIComponent(r.domain)}" class="ns-dlink" data-domain="${escapeHtml(r.domain)}">${escapeHtml(r.domain)}</a></h4>` +
    matchBadge +
    ((!(r.matches && r.matches.length) && nsLead(r)) ? `<div class="ns-lead">🔑 Has public owner contact — a usable lead for the seed</div>` : '') +
    (r.internalOwner ? `<div class="ns-srow"><span class="ns-slabel">In our DB</span><span class="ns-sval"><strong class="ns-known">${escapeHtml(r.internalOwner)}</strong></span></div>` : '') +
    nsSweepRow('Registrant', who) +
    nsSweepRow('Contact', [reg.email ? escapeHtml(reg.email) : '', reg.phone ? escapeHtml(reg.phone) : ''].filter(Boolean).join(' · ')) +
    nsSweepRow('Registrar', reg.registrar ? escapeHtml(reg.registrar) : '') +
    nsSweepRow('Cluster', clusterHtml) +
    nsSweepRow('Live site', siteHtml) +
    nsSweepRow('Social', socials) +
    nsSweepRow('Marketplace', listed) +
    nsSweepRow('DNS', dnsHtml) +
    drill +
    `</div>`;
}
// Roll every real contact found across the swept domains into one deduped set,
// keyed by value, tracking which sibling(s) it came from — the consolidated
// "owner contact for the core" answer.
function nsConsolidate(results) {
  const emails = new Map(); const names = new Map(); const phones = new Map();
  const pick = (m, val, src) => {
    const v = String(val == null ? '' : val).trim();
    if (!v || NS_CONTACT_NOISE.test(v.toLowerCase())) return;
    const k = v.toLowerCase();
    if (!m.has(k)) m.set(k, { val: v, srcs: new Set() });
    m.get(k).srcs.add(src);
  };
  for (const r of results) {
    const reg = r.registrant || {};
    pick(emails, reg.email, r.domain);
    for (const e of (r.site && r.site.emails) || []) pick(emails, e, r.domain);
    pick(names, reg.name, r.domain);
    pick(names, reg.organization, r.domain);
    if (r.internalOwner) pick(names, r.internalOwner, r.domain);
    pick(phones, reg.phone, r.domain);
  }
  return { emails: [...emails.values()], names: [...names.values()], phones: [...phones.values()] };
}
function nsDossier(results) {
  const c = nsConsolidate(results);
  if (!(c.emails.length + c.names.length + c.phones.length)) return '';
  const seed = nsState.seed || 'the core domain';
  const src = (s) => `<span class="ns-src">(${[...s].map((d) => escapeHtml(d)).join(', ')})</span>`;
  const row = (label, items) => items.length
    ? `<div class="ns-doss-row"><span class="ns-doss-label">${label}</span><span class="ns-doss-val">${items.map((i) => `${escapeHtml(i.val)} ${src(i.srcs)}`).join('<br>')}</span></div>`
    : '';
  const leadCount = new Set(results.filter(nsLead).map((r) => r.domain)).size;
  return '<div class="ns-dossier">' +
    `<div class="ns-doss-head">📇 Owner contact for <strong>${escapeHtml(seed)}</strong> — triangulated from ${leadCount} related domain${leadCount === 1 ? '' : 's'}</div>` +
    row('Emails', c.emails) + row('Names / orgs', c.names) + row('Phones', c.phones) +
    '</div>';
}
function nsSweepCards(results) {
  if (!results.length) return '<p class="muted">No results.</p>';
  // Triangulation hint: surface when registrants line up across the swept set.
  const keyOf = (r) => String((r.registrant && (r.registrant.organization || r.registrant.email || r.registrant.name)) || r.internalOwner || '').trim().toLowerCase();
  const counts = {};
  for (const r of results) { const k = keyOf(r); if (k) counts[k] = (counts[k] || 0) + 1; }
  const shared = Object.entries(counts).filter(([, c]) => c > 1);
  const confirmed = results.filter((r) => r.matches && r.matches.length).length;
  const confirmHint = confirmed ? `<p class="ns-summary ns-confirm">🎯 ${confirmed} domain${confirmed === 1 ? '' : 's'} confirmed against the linked report — shares a contact/person with it.</p>` : '';
  // Murky-seed play: the core is privacy-shielded, but a clearly-related sibling
  // may expose a real contact — that's the lead. Surface those, and flag when the
  // seed itself is a dead end so the sibling contacts are the way in.
  const seedDom = (nsState.seed || '').toLowerCase();
  const seedRes = results.find((r) => r.domain === seedDom);
  const seedShielded = seedRes && !nsLead(seedRes);
  const siblingLeads = results.filter((r) => r.domain !== seedDom && nsLead(r) && !(r.matches && r.matches.length));
  const leadHint = siblingLeads.length
    ? `<p class="ns-summary ns-lead-hint">🔑 ${siblingLeads.length} related sibling${siblingLeads.length === 1 ? '' : 's'} expose owner contact info${seedShielded ? ` — and the seed <strong>${escapeHtml(seedDom)}</strong> is privacy-shielded, so these are your way in` : ''}: ${siblingLeads.map((r) => `<a href="/dbscreen/${encodeURIComponent(r.domain)}" class="ns-dlink" data-domain="${escapeHtml(r.domain)}">${escapeHtml(r.domain)}</a>`).join(', ')}.</p>`
    : '';
  const hint = shared.length ? `<p class="ns-summary">Same-registrant signal: ${shared.map(([k]) => escapeHtml(k)).join(', ')} appears on multiple domains.</p>` : '';
  // Leads are the deliverable (a reachable contact for the murky core), so put
  // them at the top — both the rollup and the cards themselves.
  const ordered = results.slice().sort((a, b) => (nsLead(b) ? 1 : 0) - (nsLead(a) ? 1 : 0));
  // Privacy-walled siblings the free pass couldn't crack — offer to run the
  // deeper LLM research on them in the BACKGROUND and consolidate back here.
  const needsDeep = results.filter((r) => r.domain !== seedDom && !nsLead(r)).map((r) => r.domain);
  nsState.needsDeep = needsDeep;
  const deepCta = (needsDeep.length && canModule(currentUser, 'domain_owner'))
    ? `<div class="ns-deep-cta">` +
      `<p class="muted ns-note">${needsDeep.length} sibling${needsDeep.length === 1 ? '' : 's'} are privacy-walled — the free pass can't reach them. Run the deeper research on up to 4 in the background (finds owners the free pass can't; spends credits).</p>` +
      `<button type="button" class="ns-btn ns-btn-sm ns-btn-ai" data-act="deep-bg">🔬 Deep research on ${Math.min(needsDeep.length, 4)} in the background</button>` +
      `<div id="ns-deep-out"></div></div>`
    : '';
  // Lead with the consolidated dossier (the answer for the core), then the
  // shielded-seed framing, then the per-domain detail cards.
  return nsDossier(results) + leadHint + confirmHint + hint + ordered.map(nsSweepCard).join('') +
    '<button type="button" class="ns-btn ns-btn-sm" data-act="export-owner-csv">⬇ Export sweep CSV</button>' + deepCta;
}
// Drill from a swept domain into the full Domain Owner research (free or deep).
function nsDrill(domain, deep) {
  if (!canModule(currentUser, 'domain_owner')) return;
  history.pushState(null, '', '/research');
  showView('research');
  run({ domain, deep, force: false });
}

const NS_NOT_LOADED = 'The nameserver index isn’t loaded yet — zone files are still being imported. Check back once the load completes.';
async function nsFetch(params) {
  const res = await fetch(`/research/api/nameserver?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  if (data.notLoaded) throw new Error(NS_NOT_LOADED);
  return data;
}

async function runNsDomain(domain) {
  showView('nameserver');
  setActiveDomain(domain);
  setToolStatus(els.nsStatus, 'Looking up…');
  if (els.nsResult) els.nsResult.hidden = true;
  try {
    const data = await nsFetch(`mode=domain&domain=${encodeURIComponent(domain)}`);
    setToolStatus(els.nsStatus, '');
    if (data.found) nsRecentAdd(data.domain || domain);
    if (!data.found) {
      // Use the queried `domain` (the arg) — a zone-DB error can return found:false with
      // no domain field, which previously rendered a blank, misleading "not found".
      const who = escapeHtml(data.domain || domain);
      const msg = data.notLoaded
        ? `The nameserver index is temporarily unavailable — couldn’t resolve nameservers for <strong>${who}</strong> right now. Try again in a moment.`
        : `Couldn’t find nameservers for <strong>${who}</strong> — not in our index and no live DNS/WHOIS record.`;
      els.nsResult.innerHTML = `<div class="ns-card"><p>${msg}</p></div>`;
    } else {
      const nsList = (data.nameservers || []).map((n) => `<code>${escapeHtml(n)}</code>`).join(' ');
      const liveNote = data.source === 'zone'
        ? `<p class="muted ns-livenote">⚠ Live DNS didn’t respond — showing our index snapshot, which may be out of date.</p>`
        : '';
      els.nsResult.innerHTML =
        `<div class="ns-card">` +
        `<h2>${escapeHtml(data.domain)}</h2>` +
        `<p class="ns-nsrow">Nameservers: ${nsList || '<span class="muted">none</span>'}</p>` +
        liveNote +
        `<div class="ns-ctx" id="ns-ctx">` +
          `<span class="ns-ctx-label">✨ relatedness context:</span> ` +
          `<span id="ns-ctx-state" class="muted">none linked</span> ` +
          `<button type="button" class="ns-ctx-btn" data-act="ctx-toggle">Link a report</button>` +
          `<button type="button" class="ns-ctx-btn" data-act="ctx-clear" hidden>Clear</button>` +
          `<div class="ns-ctx-pick" id="ns-ctx-pick" hidden>` +
            `<input id="ns-ctx-search" class="ns-ctx-search" type="text" autocomplete="off" placeholder="search a recent report by domain…">` +
            `<div id="ns-ctx-sug" class="ns-ctx-sug"></div>` +
          `</div>` +
        `</div>` +
        `<div class="ns-actions">` +
          `<button type="button" class="ns-btn" data-act="pairing" data-domain="${escapeHtml(data.domain)}">Find domains with the same pairing →</button>` +
          `<button type="button" class="ns-btn ns-btn-ai" data-act="relate" data-domain="${escapeHtml(data.domain)}">✨ Find likely-related siblings</button>` +
        `</div>` +
        `<div class="ns-sub" id="ns-sub"></div>` +
        `</div>`;
      // Auto-suggest the seed's own most-recent report as the context.
      nsCtxAuto(data.domain);
    }
    els.nsResult.hidden = false;
  } catch (e) {
    setToolStatus(els.nsStatus, String((e && e.message) || e), true);
  }
}

// ── Relatedness context (link a Domain Owner report) ────────────────────────
function nsCtxFmt(run) {
  const when = run.created_at ? new Date(run.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  return `${run.domain}${when ? ` · ${when}` : ''}`;
}
function nsCtxSet(run) {
  nsState.contextRunId = run.id;
  nsState.contextLabel = nsCtxFmt(run);
  const st = document.getElementById('ns-ctx-state');
  if (st) st.innerHTML = `<span class="ns-ctx-linked">✓ ${escapeHtml(nsState.contextLabel)}</span>`;
  const clr = document.querySelector('#ns-ctx [data-act="ctx-clear"]');
  if (clr) clr.hidden = false;
  const pick = document.getElementById('ns-ctx-pick');
  if (pick) pick.hidden = true;
}
function nsCtxClear() {
  nsState.contextRunId = null;
  nsState.contextLabel = null;
  const st = document.getElementById('ns-ctx-state');
  if (st) st.innerHTML = '<span class="muted">none linked</span>';
  const clr = document.querySelector('#ns-ctx [data-act="ctx-clear"]');
  if (clr) clr.hidden = true;
}
async function nsCtxAuto(seed) {
  nsState.contextRunId = null; nsState.contextLabel = null;
  try {
    const data = await nsFetch(`mode=reports&q=${encodeURIComponent(seed)}`);
    const runs = data.runs || [];
    const exact = runs.find((r) => r.domain === seed) || runs[0];
    if (exact) nsCtxSet(exact);
  } catch { /* no reports — fine */ }
}
async function nsCtxSearch(term) {
  const sug = document.getElementById('ns-ctx-sug');
  if (!sug) return;
  if (!term || term.length < 2) { sug.innerHTML = ''; return; }
  try {
    const data = await nsFetch(`mode=reports&q=${encodeURIComponent(term)}`);
    const runs = data.runs || [];
    sug.innerHTML = runs.length
      ? runs.map((r) => `<button type="button" class="ns-ctx-opt" data-runid="${escapeHtml(r.id)}" data-domain="${escapeHtml(r.domain)}" data-when="${escapeHtml(r.created_at || '')}">${escapeHtml(nsCtxFmt(r))}</button>`).join('')
      : '<span class="muted ns-ctx-empty">No matching reports.</span>';
  } catch (e) {
    sug.innerHTML = `<span class="muted ns-ctx-empty">${escapeHtml(String((e && e.message) || e))}</span>`;
  }
}

async function runNsPairing(domain, opts = {}) {
  const fromChip = !!opts.fromChip;
  // Fresh pairing run resets the TLD filter + facets; a facet-chip click reuses them.
  if (!fromChip) { nsState.pairDomain = domain; nsState.pairTld = ''; nsState.pairFacets = null; }
  const sub = document.getElementById('ns-sub');
  if (sub && !fromChip) sub.innerHTML = '<div class="ns-running">⏳ Finding siblings on the same nameserver set…</div>';
  try {
    const tld = nsState.pairTld || '';
    const data = await nsFetch(`mode=pairing&domain=${encodeURIComponent(domain)}${tld ? `&tld=${encodeURIComponent(tld)}` : ''}`);
    if (!sub) return;
    if (data.generic) {
      sub.innerHTML = `<p class="ns-pairnote muted">⚠ ${escapeHtml(data.genericNote || 'Generic/parking nameservers — shared by huge numbers of unrelated domains, so this pairing is not an ownership signal.')} Skipping the lookup.</p>`;
      return;
    }
    if (Array.isArray(data.tlds)) nsState.pairFacets = data.tlds; // returned on the All (unfiltered) query only
    nsState.listKind = 'pairing'; nsState.listHasMore = !!data.hasMore;
    const more = data.hasMore ? ' <span class="muted">(first page — many matches; likely a shared host)</span>' : '';
    const bar = nsTldBarHtml(nsState.pairFacets, tld, 'pairing');
    const scope = tld ? ` <span class="muted">· .${escapeHtml(tld)} only</span>` : '';
    const head = `${bar}<h3>${data.count}${data.hasMore ? '+' : ''} other domain${data.count === 1 ? '' : 's'} on this exact pairing${scope}${more}</h3>`;
    if (!data.rows.length) { sub.innerHTML = head + '<p class="muted">None.</p>'; return; }
    const items = data.rows.map((r) => ({
      domain: r.domain,
      metaHtml: (r.nameservers && r.nameservers.length) ? ` <span class="muted">(${r.nameservers.length} NS)</span>` : '',
      checked: false,
    }));
    sub.innerHTML = nsSelectableBlock(head, items, { csvRows: data.rows, seed: domain, singleCol: true });
  } catch (e) {
    if (sub) sub.innerHTML = `<p class="status error">${escapeHtml(String((e && e.message) || e))}</p>`;
  }
}

async function runNsRelate(domain) {
  const sub = document.getElementById('ns-sub');
  if (sub) sub.innerHTML = `<div class="ns-running">⏳ Analyzing the pairing for likely-related siblings${nsState.contextRunId ? ' (using the linked report for context)' : ''}…</div>`;
  try {
    const ctx = nsState.contextRunId ? `&run_id=${encodeURIComponent(nsState.contextRunId)}` : '';
    const data = await nsFetch(`mode=relate&domain=${encodeURIComponent(domain)}${ctx}`);
    if (!sub) return;
    if (data.generic) {
      sub.innerHTML = `<p class="ns-pairnote muted">⚠ ${escapeHtml(data.genericNote || 'Generic/parking nameservers — not an ownership signal.')} Nothing to analyze.</p>`;
      return;
    }
    // Banner: pairing type (account-unique vs shared) + the owner context applied.
    const pairNote = data.accountUnique
      ? `<p class="ns-pairnote ns-pairnote-cf">🔗 Cloudflare account-unique pair — every domain here is almost certainly the <strong>same owner</strong>.</p>`
      : data.pair === 'shared' ? `<p class="ns-pairnote muted">Shared-host nameservers — relatedness judged by owner/theme, not co-location alone.</p>` : '';
    const ctxNote = data.contextUsed
      ? `<p class="ns-pairnote ns-pairnote-ctx">📄 Using context from the <strong>${escapeHtml(data.contextUsed.domain)}</strong> report${data.contextUsed.owner ? ` — owner: ${escapeHtml(data.contextUsed.owner)}${data.contextUsed.ownerType ? ` (${escapeHtml(String(data.contextUsed.ownerType).replace(/_/g, ' '))})` : ''}` : ''}.</p>`
      : '';
    if (!data.related || !data.related.length) {
      sub.innerHTML = `<h3>Likely-related siblings</h3>${pairNote}${ctxNote}<p class="muted">${escapeHtml(data.summary || 'No clearly-related siblings found.')}</p>`;
      return;
    }
    const head =
      `<h3>Likely-related siblings <span class="muted">(of ${data.siblingCount} on the pairing)</span></h3>` +
      pairNote + ctxNote +
      `${data.summary ? `<p class="ns-summary">${escapeHtml(data.summary)}</p>` : ''}` +
      `<p class="muted ns-note">Pick the candidates and run a free owner lookup to triangulate a shared owner.</p>`;
    // Seed first (so triangulation compares against it), then siblings; pre-check
    // the seed + high/medium-confidence ones.
    const items = [{ domain: data.domain, metaHtml: ' <span class="muted">— seed</span>', checked: true }].concat(
      data.related.map((r) => ({
        domain: r.domain,
        metaHtml: ` <span class="ns-conf ns-conf-${escapeHtml(r.confidence)}">${escapeHtml(r.confidence)}</span>${r.relation ? ` <span class="muted">— ${escapeHtml(r.relation)}</span>` : ''}`,
        checked: r.confidence === 'high' || r.confidence === 'medium',
      })));
    sub.innerHTML = nsSelectableBlock(head, items, { csvRows: null, seed: data.domain, singleCol: true });
  } catch (e) {
    if (sub) sub.innerHTML = `<p class="status error">${escapeHtml(String((e && e.message) || e))}</p>`;
  }
}

async function runNsList(opts = {}) {
  showView('nameserver');
  const fromChip = !!opts.fromChip;
  // Fresh search reads the inputs and resets the TLD filter + facets; a facet-chip
  // click reuses the stored nameserver/facets and only swaps the active TLD.
  if (!fromChip) {
    const raw = (els.nsNs && els.nsNs.value || '').trim();
    if (!raw) return;
    nsState.nsRaw = raw;
    nsState.tld = (els.nsTld && els.nsTld.value || '').trim().toLowerCase().replace(/^\./, '');
    nsState.facets = null;
  }
  const raw = nsState.nsRaw;
  if (!raw) return;
  setToolStatus(els.nsStatus, 'Searching…');
  if (!fromChip && els.nsResult) els.nsResult.hidden = true;
  try {
    const tld = nsState.tld || '';
    const params = `mode=ns&ns=${encodeURIComponent(raw)}&match=${nsState.match}${tld ? `&tld=${encodeURIComponent(tld)}` : ''}`;
    const data = await nsFetch(params);
    if (Array.isArray(data.tlds)) nsState.facets = data.tlds; // facets come back only on the All (unfiltered) query
    nsState.listKind = 'ns'; nsState.listHasMore = !!data.hasMore;
    setToolStatus(els.nsStatus, '');
    const more = data.hasMore ? ' <span class="muted">(showing first page)</span>' : '';
    const head = `Domains using ${nsState.match === 'all' ? 'ALL' : 'ANY'} of: ${(data.nameservers || []).map((n) => `<code>${escapeHtml(n)}</code>`).join(' ')}`;
    const bar = nsTldBarHtml(nsState.facets, tld, 'ns');
    const scope = tld ? ` <span class="muted">· .${escapeHtml(tld)} only</span>` : '';
    els.nsResult.innerHTML = `<div class="ns-card"><p class="ns-nsrow">${head}</p>${bar}<h3>${data.count} domain${data.count === 1 ? '' : 's'}${scope}${more}</h3>${nsRowsHtml(data.rows)}</div>`;
    els.nsResult.hidden = false;
  } catch (e) {
    setToolStatus(els.nsStatus, String((e && e.message) || e), true);
  }
}

// Clickable TLD facet bar above the NS results: "All (N) · .com (x) · .vc (y) …".
// Clicking a chip narrows the result to that TLD server-side (partition-pruned),
// so small-TLD matches that .com would crowd off the first page are reachable in
// one click. Hidden when the match spans only a single TLD.
function nsTldBarHtml(facets, activeTld, scope = 'ns') {
  if (!Array.isArray(facets) || facets.length < 2) return '';
  const total = facets.reduce((s, f) => s + (f.count || 0), 0);
  const chip = (tld, label, n, active) =>
    `<button type="button" class="ns-tld-chip${active ? ' active' : ''}" data-ns-scope="${scope}" data-ns-tld="${escapeHtml(tld)}">${escapeHtml(label)} <span class="ns-tld-n">${(n || 0).toLocaleString()}</span></button>`;
  const chips = [chip('', 'All', total, !activeTld)]
    .concat(facets.map((f) => chip(f.tld, `.${f.tld}`, f.count, activeTld === f.tld)));
  return `<div class="ns-tldbar" title="Filter these domains to one TLD">${chips.join('')}</div>`;
}

els.navNameserver?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('nameserver', ''); route(); });
els.navSales?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('sales', ''); route(); });
els.navBeeper?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('beeper', ''); route(); });
els.beeperForm?.addEventListener('submit', (e) => { e.preventDefault(); addBeeperWatch(); });
els.navWhois?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('whois', ''); showView('whois'); });
els.whoisForm?.addEventListener('submit', (e) => { e.preventDefault(); const d = (els.whoisDomain.value || '').trim(); if (d) { setToolUrl('whois', d); runWhois(d); } });
els.navDiq?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('diq', ''); showView('diq'); });
els.diqForm?.addEventListener('submit', (e) => { e.preventDefault(); const d = (els.diqDomain.value || '').trim(); if (d) { setToolUrl('diq', d); runDiq(d); } });
// Copy the public whois.com share link (delegated — the card is re-rendered each lookup).
els.whoisResult?.addEventListener('click', (e) => { const b = e.target.closest('.wi-share'); if (b) copyText(b.getAttribute('data-share-url'), b); });

// Cross-module action bar + ⌘K quick-switch.
els.domainBarK?.addEventListener('click', openCmdk);
els.cmdk?.addEventListener('click', (e) => { if (e.target === els.cmdk) closeCmdk(); });
els.cmdkDomain?.addEventListener('keydown', (e) => {
  const mods = cmdkMods();
  if (e.key === 'ArrowDown') { e.preventDefault(); cmdkIdx = Math.min(mods.length - 1, cmdkIdx + 1); renderCmdkList(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); cmdkIdx = Math.max(0, cmdkIdx - 1); renderCmdkList(); }
  else if (e.key === 'Enter') { e.preventDefault(); if (mods[cmdkIdx]) runCmdk(mods[cmdkIdx].tool); }
});
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    if (els.app && els.app.hidden) return; // not logged in / app not ready
    e.preventDefault();
    (els.cmdk && !els.cmdk.hidden) ? closeCmdk() : openCmdk();
  } else if (e.key === 'Escape' && els.cmdk && !els.cmdk.hidden) {
    closeCmdk();
  }
});

// ── Sales Research ───────────────────────────────────────────────────────────
let salesProjectId = null;
let salesPollTimer = null;
let salesCandidates = [];          // cached for render + CSV
let salesSeed = '';
const salesCollapsed = new Set();  // candidate ids whose contacts are collapsed
const salesSelected = new Set();   // checked candidate ids — persist across path-filter tabs
let salesAngles = [];              // angle objects from the last gate render
let salesPathFilter = 'all';       // view filter: 'all' | 'upgrade' | 'product' | 'keyword'

// Pull a human string out of an API error payload. Vercel's function-timeout
// envelope is `{error:{code,message}}`, so a naive `data.error` stringifies to
// "[object Object]". Handle string, {message}, and the timeout case explicitly.
function apiErrText(data, res) {
  const e = data && data.error;
  if (typeof e === 'string' && e) return e;
  if (e && typeof e === 'object') {
    if (e.message) return String(e.message);
    if (e.code === 'FUNCTION_INVOCATION_TIMEOUT') return 'Timed out — try fewer categories or a smaller per-category count.';
    try { return JSON.stringify(e); } catch { /* fall through */ }
  }
  if (res && res.status === 504) return 'Timed out — try fewer categories or a smaller per-category count.';
  return `Failed (${res ? res.status : '?'})`;
}

function setSalesStatus(msg, isErr = false) {
  if (!els.srStatus) return;
  els.srStatus.hidden = !msg;
  els.srStatus.innerHTML = msg ? spinHtml(msg, isErr) : '';
  els.srStatus.classList.toggle('sr-status-err', !!isErr);
}
function clearSalesPoll() { if (salesPollTimer) { clearInterval(salesPollTimer); salesPollTimer = null; } }

// Toggle the entry (hero + form + recent) vs. the compact results header. Once a
// run is open we collapse the hero/form into a one-line "<seed> buyers" header
// and reclaim the space for results.
function setSalesMode(mode, seed) {
  const results = mode === 'results';
  if (els.srEntry) els.srEntry.hidden = results;
  if (els.srReshead) els.srReshead.hidden = !results;
  if (results && seed != null && els.srResheadSeed) els.srResheadSeed.textContent = seed;
}

function resetSalesView() {
  clearSalesPoll();
  hideAngleGate();
  salesProjectId = null; salesCandidates = []; salesSeed = ''; salesPathFilter = 'all';
  salesSelected.clear();
  if (els.srDomain) els.srDomain.value = '';
  if (els.srResults) els.srResults.hidden = true;
  if (els.srTable) els.srTable.innerHTML = '';
  setSalesStatus('');
  setSalesMode('entry');
  loadSalesRecent();   // re-show the last-5 block under the form
}

// Recent runs (last 5) under the form + the "View all" link.
async function loadSalesRecent() {
  if (!els.srRecent) return;
  try {
    const res = await fetch('/research/api/sales?list=1&limit=30');
    const data = await res.json().catch(() => ({}));
    const projects = res.ok && Array.isArray(data.projects) ? data.projects : [];
    // Collapse to one entry per domain (latest run), with a run count; up to 5.
    const counts = new Map();
    for (const p of projects) counts.set(p.seed_domain, (counts.get(p.seed_domain) || 0) + 1);
    const seen = new Set();
    const top = [];
    for (const p of projects) {
      if (seen.has(p.seed_domain)) continue;
      seen.add(p.seed_domain);
      top.push(p);
      if (top.length >= 5) break;
    }
    els.srRecent.hidden = top.length === 0;
    if (els.srRecentList) els.srRecentList.innerHTML = top.map((p) => salesProjectRow(p, counts.get(p.seed_domain))).join('');
  } catch { els.srRecent.hidden = true; }
}

// Past Sales Research runs — searchable, grouped by seed domain (re-runs of the
// same domain nest under one master, mirroring the Domain Owner report).
let salesProjectsTimer = null;
async function loadSalesProjects(q = '') {
  if (!els.srProjectsList) return;
  els.srProjectsList.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const res = await fetch(`/research/api/sales?list=1&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    const projects = data.projects || [];
    if (!projects.length) { els.srProjectsList.innerHTML = '<li class="muted">No sales research runs yet.</li>'; return; }
    // Group by seed domain (preserves the API's created-desc order).
    const groups = [];
    const byDomain = new Map();
    for (const p of projects) {
      const key = p.seed_domain || '(unknown)';
      if (!byDomain.has(key)) { const g = { domain: key, runs: [] }; byDomain.set(key, g); groups.push(g); }
      byDomain.get(key).runs.push(p);
    }
    els.srProjectsList.innerHTML = groups.map((g) => {
      const items = g.runs.map((p) => {
        const when = p.created_at ? new Date(p.created_at).toLocaleString() : '';
        const running = p.status && p.status !== 'done';
        const meta = running ? `${escapeHtml(p.status)}…` : when;
        return `<li class="project-run${running ? ' active' : ''}" data-id="${escapeHtml(p.id)}">${escapeHtml(meta)}</li>`;
      }).join('');
      const count = g.runs.length > 1 ? `<span class="project-count">${g.runs.length} runs</span>` : '';
      return `<li class="project-group">
        <div class="project-group-title">${escapeHtml(g.domain)}${count}</div>
        <ul class="project-runs">${items}</ul>
      </li>`;
    }).join('');
  } catch (e) {
    els.srProjectsList.innerHTML = `<li class="muted">${escapeHtml(String(e.message || e))}</li>`;
  }
}

function salesProjectRow(p, runCount = 1) {
  const when = p.created_at ? new Date(p.created_at).toLocaleString() : '';
  const st = p.status === 'done' ? '' : ` · ${escapeHtml(p.status || '')}`;
  const runs = runCount > 1 ? `<span class="project-count">${runCount} runs</span>` : '';
  return `<li class="recent-run" data-id="${escapeHtml(p.id)}">`
    + `<span class="recent-domain">${escapeHtml(p.seed_domain || '')}${runs}${st}</span>`
    + `<span class="recent-when">${escapeHtml(when)}</span></li>`;
}

// Create a run, retrying transient platform hiccups (a cold-start /
// FUNCTION_INVOCATION_FAILED 5xx returns non-JSON, which we parse defensively).
async function salesCreate(domain, tries = 3) {
  let last;
  for (let a = 0; a < tries; a++) {
    const res = await fetch('/research/api/sales', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'create', domain }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    last = new Error(data.error || `Failed (${res.status})`);
    if (res.status >= 500 && a < tries - 1) { await new Promise((r) => setTimeout(r, 1500 * (a + 1))); continue; }
    throw last;
  }
  throw last;
}

els.srForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!(els.srDomain.value || '').trim()) return;
  let domain;
  try { domain = cleanDomainInput(els.srDomain.value); }
  catch (err) { setSalesStatus(String(err.message || err), true); return; }
  els.srDomain.value = domain;
  els.srGo.disabled = true;
  setSalesStatus('Starting discovery…');
  if (els.srResults) els.srResults.hidden = true;
  setSalesMode('results', domain);   // collapse the hero/form right away
  try {
    const data = await salesCreate(domain);
    setToolUrl('sales', data.project_id);
    openSalesProject(data.project_id);
  } catch (err) {
    setSalesStatus(String(err.message || err), true);
    els.srGo.disabled = false;
  }
});

function hideAngleGate() {
  if (!els.srAnglegate) return;
  els.srAnglegate.hidden = true;
  els.srAnglegate.innerHTML = '';
  delete els.srAnglegate.dataset.seed;
  salesAngles = [];
  setAnglesBtnMode(false);
}

// The top "Explore by category" button doubles as "Research selected categories"
// once the gate is open, so you can kick off the research from the top toolbar
// without scrolling down to the gate's footer button.
function setAnglesBtnMode(researching) {
  if (!els.srAngles) return;
  els.srAngles.dataset.mode = researching ? 'research' : 'explore';
  els.srAngles.textContent = researching
    ? '🔬 Research selected categories'
    : '✨ Explore by category';
}

// Dispatch the chosen buyer categories for the free company fan-out. Shared by
// the top toolbar button (research mode) and the gate's footer button.
async function researchSelectedAngles() {
  if (!els.srAnglegate) return;
  const keys = new Set([...els.srAnglegate.querySelectorAll('.sr-ag-cb:checked')].map((c) => c.dataset.key));
  const chosen = salesAngles.filter((a) => keys.has(a.key));
  if (!chosen.length || !salesProjectId) return;
  const limit = Number(document.getElementById('sr-ag-lim')?.value) || 15;
  const note = els.srAnglegate.querySelector('.sr-ag-note');
  const footBtn = document.getElementById('sr-ag-go');
  const n = chosen.length;
  const catWord = n === 1 ? 'category' : 'categories';
  if (footBtn) footBtn.disabled = true;
  if (els.srAngles) els.srAngles.disabled = true;
  if (note) note.innerHTML = `<span class="sr-spin"></span> Finding companies across ${n} ${catWord}…`;
  try {
    const res = await fetch('/research/api/sales', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'research_angles', project_id: salesProjectId, angles: chosen, limit }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(apiErrText(data, res));
    // Runs async in the background now (was timing out the request on mobile).
    els.srAnglegate.hidden = true;
    setAnglesBtnMode(false);
    const before = salesCandidates.length;
    setSalesStatus(`Researching ${n} ${catWord}… this runs in the background — you can keep working.`);
    pollAnglesUntilDone(n, catWord, before);
  } catch (err) {
    if (note) note.innerHTML = `<span class="sr-status-err">${escapeHtml(String(err.message || err))}</span>`;
  } finally {
    if (footBtn) footBtn.disabled = false;
    if (els.srAngles) els.srAngles.disabled = false;
  }
}

function openSalesProject(id) {
  clearSalesPoll();
  hideAngleGate();               // drop any stale angle gate from the previous run
  salesProjectId = id;
  salesSeed = '';                // cleared until the poll returns the real seed
  els.srGo.disabled = true;
  setSalesMode('results', '');   // collapse entry; seed filled in once the poll returns it
  setSalesStatus('Discovering candidates and qualifying ability-to-pay…');
  let pollErrors = 0;
  const poll = async () => {
    try {
      const res = await fetch(`/research/api/sales?id=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The run keeps going server-side, so a transient platform 5xx
        // (FUNCTION_INVOCATION_FAILED / cold start) shouldn't kill the poll —
        // keep retrying; surface an error only if it persists.
        if (res.status >= 500 && ++pollErrors < 8) { setSalesStatus('Reconnecting…'); return; }
        throw new Error(data.error || `Poll failed (${res.status})`);
      }
      pollErrors = 0;
      if (data.project && data.project.seed_domain && els.srResheadSeed) els.srResheadSeed.textContent = data.project.seed_domain;
      const st = data.project.status;
      if (st === 'done') {
        clearSalesPoll();
        els.srGo.disabled = false;
        renderSalesResults(data);
      } else if (st === 'failed') {
        clearSalesPoll();
        els.srGo.disabled = false;
        setSalesStatus(data.project.error || 'Run failed', true);
      } else {
        setSalesStatus(`Working… (${data.project.stage || st})`);
      }
    } catch (err) {
      // Network blip → keep trying a few rounds before giving up.
      if (++pollErrors < 8) { setSalesStatus('Reconnecting…'); return; }
      clearSalesPoll();
      els.srGo.disabled = false;
      setSalesStatus(String(err.message || err), true);
    }
  };
  poll();
  salesPollTimer = setInterval(poll, 2500);
}

// A candidate's "path": upgrades (the seed name itself, a variant TLD/affix) vs
// keyword/category (companies surfaced by Explore-by-category). Anything without
// an explicit category counts as an upgrade (the original discovery path).
function isProductAngle(c) { return c.angle === 'product_named' || c.angle === 'product_named_exact'; }
// A candidate's domain SLD is an affix-variant of the seed (hoss → hosstools,
// gethoss) — i.e. structurally an "upgrade" target even if it was discovered via
// the product/keyword angle. So an exact product-name match like hosstools.com
// (Hoss Tools, product "Hoss") is ALSO an upgrade prospect, not just a product hit.
function isUpgradeShape(c) {
  const s = (String(salesSeed).split('.')[0] || '').toLowerCase();
  const sld = (String(c.domain || '').split('.')[0] || '').toLowerCase();
  if (!s || !sld || sld === s) return false;
  return sld.startsWith(s) || sld.endsWith(s);
}

// Path membership is a SET — a candidate can live under more than one tab (e.g.
// product-name match that's also an affix-upgrade shows under both Product and
// Upgrades). The 'all' tab still renders each card once (single section below).
function salesPaths(c) {
  const set = new Set();
  if (isProductAngle(c)) set.add('product');
  if (c.category === 'keyword' && !isProductAngle(c)) set.add('keyword');
  if (c.category === 'upgrade' || isUpgradeShape(c)) set.add('upgrade');
  if (!set.size) set.add('upgrade');
  return set;
}

function salesVisible() {
  const showAll = els.srShowAll && els.srShowAll.checked;
  return salesCandidates.filter((c) =>
    (showAll || c.status === 'active') &&
    (salesPathFilter === 'all' || salesPaths(c).has(salesPathFilter)));
}

function renderSalesResults(data) {
  salesSeed = data.project.seed_domain || '';
  salesCandidates = data.candidates || [];
  setSalesStatus('');
  setSalesMode('results', salesSeed);
  if (els.srResults) els.srResults.hidden = false;
  renderSalesTable();
}

function renderSalesTable() {
  updatePathFilter();
  const rows = salesVisible();
  // ★ Recommended (LLM high-fit, not yet qualified) float to the very top; then
  // everything else by score (qualified ability-to-pay) then size.
  const isRec = (c) => !c.firmographics && c.category === 'keyword' && Number(c.score) >= 2;
  rows.sort((a, b) => (isRec(b) - isRec(a))
    || ((Number(b.score) || 0) - (Number(a.score) || 0))
    || ((b.employee_count || 0) - (a.employee_count || 0)));
  const active = salesCandidates.filter((c) => c.status === 'active').length;
  const strong = salesCandidates.filter((c) => c.tier === 'strong').length;
  if (els.srSummary) {
    els.srSummary.innerHTML =
      `<span class="sr-sum-n">${salesCandidates.length}</span> companies`
      + `<span class="sr-sum-dot">·</span><span class="sr-sum-n">${active}</span> active`
      + `<span class="sr-sum-dot">·</span><span class="sr-sum-strong">${strong} strong-fit</span>`;
  }
  if (!rows.length) { els.srTable.innerHTML = '<p class="muted">No candidates to show.</p>'; updateSalesEnrichBtn(); return; }
  const tierBadge = (t) => `<span class="sr-tier sr-tier-${t || 'unknown'}">${escapeHtml(t || '—')}</span>`;
  const statusBadge = (s) => `<span class="sr-st sr-st-${s || 'unknown'}">${escapeHtml(s || '—')}</span>`;
  // Structured ability-to-pay metrics — same labelled cells, same order on every
  // card, so values line up down the list and compare at a glance.
  const monthsAgo = (d) => { if (!d) return null; const t = new Date(d); return isNaN(t) ? null : Math.round((Date.now() - t) / (1000 * 60 * 60 * 24 * 30.44)); };
  const relRaise = (d) => { const m = monthsAgo(d); if (m == null) return ''; if (m < 1) return 'this month'; if (m < 12) return `~${m}mo ago`; const y = m / 12; return `~${y % 1 ? y.toFixed(1) : y.toFixed(0)}y ago`; };
  const growthPct = (g) => (g == null || !isFinite(g)) ? '' : `${g >= 0 ? '+' : ''}${Math.round(g * 100)}%`;
  const M = (k, v, cls = '') => `<div class="sr-m"><div class="sr-m-k">${k}</div><div class="sr-m-v${cls ? ' ' + cls : ''}">${escapeHtml(String(v))}</div></div>`;
  // Build the metric list, dropping blanks. A card with 0 stats shows nothing; 1–2
  // collapse to a one-line summary; 3+ get the labelled grid (only the cells we
  // actually have — no rows of dashes).
  // Currency → leading $ (idempotent); counts → thousands separators.
  const money = (v) => { const s = String(v ?? '').trim(); return s ? (/^\$/.test(s) ? s : '$' + s) : ''; };
  const commas = (v) => (v == null || v === '' || isNaN(Number(v))) ? '' : Number(v).toLocaleString();
  const metricsGrid = (c) => {
    const f = c.firmographics || {};
    const emp = f.employees != null ? f.employees : c.employee_count;
    const g = f.headcountGrowth && f.headcountGrowth.twelveMo;
    const raised = money(f.funding || c.funding || '');
    const rev = money(f.revenue || '');
    const empC = commas(emp);
    const growth = growthPct(g);
    const cells = [
      { k: 'Raised', v: raised, cls: raised ? 'sr-m-raise' : '', inline: raised ? `raised ${raised}` : '' },
      { k: 'Stage', v: f.fundingStage || '', inline: f.fundingStage || '' },
      { k: 'Last raise', v: relRaise(f.latestFundingDate), inline: relRaise(f.latestFundingDate) ? `last raise ${relRaise(f.latestFundingDate)}` : '' },
      { k: 'Revenue', v: rev, inline: rev ? `${rev} revenue` : '' },
      { k: 'Employees', v: empC, inline: empC ? `${empC} employees` : '' },
      { k: 'Growth 12mo', v: growth, cls: (g != null && g > 0) ? 'sr-m-pos' : '', inline: growth ? `${growth} growth` : '' },
      { k: 'Founded', v: f.foundedYear || '', inline: f.foundedYear ? `founded ${f.foundedYear}` : '' },
    ].filter((m) => m.v !== '' && m.v != null);
    if (!cells.length) return '';                                   // industry already shows in the header
    if (cells.length <= 2) {                                        // thin data → one tidy line, no dash grid
      return `<div class="sr-inline">${escapeHtml(cells.map((m) => m.inline).join(' · '))}</div>`;
    }
    return `<div class="sr-metrics">${cells.map((m) => M(m.k, m.v, m.cls)).join('')}</div>`;
  };
  // Location · industry — shown compactly under the name in the header (no longer
  // its own full-width row below the metrics).
  const metaLine = (c) => {
    const f = c.firmographics || {};
    const s = [c.location || f.location || '', f.industry || ''].filter(Boolean).join(' · ');
    return s ? `<div class="sr-card-meta">${escapeHtml(s)}</div>` : '';
  };
  // One contact = one block. Email / phone / LinkedIn ALWAYS show as their own
  // row (dimmed dash when missing) so you can compare who-has-what across the row.
  const cRow = (ico, present, html) => `<div class="sr-c-row${present ? '' : ' sr-c-row-missing'}"><span class="sr-c-ico">${ico}</span>${present ? html : '<span class="sr-c-dash">—</span>'}</div>`;
  const contactCard = (p) => {
    const tel = String(p.phone || '').replace(/[^+\d]/g, '');
    return `<div class="sr-contact-card">
      <div class="sr-c-name">${escapeHtml(p.name || '—')}</div>
      ${p.title ? `<div class="sr-c-title">${escapeHtml(p.title)}</div>` : ''}
      <div class="sr-c-rows">
        ${cRow('✉', !!p.email, `<a class="sr-c-link" href="mailto:${escapeHtml(p.email || '')}">${escapeHtml(p.email || '')}</a>`)}
        ${cRow('☎', !!p.phone, `<a class="sr-c-link" href="tel:${escapeHtml(tel)}">${escapeHtml(p.phone || '')}</a>`)}
        ${cRow('in', !!p.linkedin, `<a class="sr-c-link" href="${escapeHtml(p.linkedin || '')}" target="_blank" rel="noopener">LinkedIn ↗</a>`)}
      </div>
    </div>`;
  };
  const contactsBlock = (c) => {
    if (c.enrich_status === 'pending') return '<div class="sr-contacts-note sr-enriching"><span class="sr-spin"></span> Enriching contacts…</div>';
    if (c.enrich_status === 'failed') return '<div class="sr-contacts-note sr-status-err">Contact enrichment failed</div>';
    const list = c.contacts || [];
    if (c.enrich_status === 'done' && !list.length) return '<div class="sr-contacts-note muted">No contacts found</div>';
    if (!list.length) return '';
    const collapsed = salesCollapsed.has(c.id);
    return `<div class="sr-contacts${collapsed ? ' collapsed' : ''}">
      <div class="sr-contacts-head">
        <span class="sr-contacts-title">Contacts <span class="sr-contacts-n">${list.length}</span></span>
        <button type="button" class="sr-contacts-toggle" data-id="${escapeHtml(c.id)}" aria-label="${collapsed ? 'Expand' : 'Collapse'} contacts">${collapsed ? '▸ Show' : '▾ Hide'}</button>
      </div>
      ${collapsed ? '' : `<div class="sr-contacts-grid">${list.map(contactCard).join('')}</div>`}
    </div>`;
  };
  const cardHtml = (c) => {
    const coLi = (c.firmographics && c.firmographics.linkedin) || '';
    // The exact-match "product named X" angle gets its own callout; other angles
    // show the plain angle tag.
    const angleBadge = c.angle === 'product_named_exact'
      ? '<span class="sr-exact-badge" title="This company has a product named EXACTLY this — a very qualified prospect">✓ exact product-name match</span>'
      : c.angle === 'product_named'
      ? '<span class="sr-product-badge" title="Found because this company has a product/service with a similar name">🏷 product with similar name</span>'
      : (c.category === 'keyword' && c.angle
        ? `<span class="sr-angle-badge">${escapeHtml(String(c.angle).replace(/_/g, ' '))}</span>` : '');
    const unq = !c.firmographics;   // keyword/angle company not yet Apollo-qualified
    const recommend = unq && c.category === 'keyword' && Number(c.score) >= 2
      ? '<span class="sr-rec-badge">★ recommended</span>' : '';
    // Off-target (relevance gate) + low-confidence (wrong-looking firmographic match).
    const offBadge = c.firmographics && c.firmographics.atp_relevant === false
      ? `<span class="sr-off-badge" title="${escapeHtml(c.firmographics.atp_relevant_reason || 'not a fit for this domain')}">⚠ off-target</span>` : '';
    const lowConfBadge = c.firmographics && c.firmographics.atp_lowconf
      ? `<span class="sr-lowconf-badge" title="${escapeHtml(c.firmographics.atp_lowconf_reason || 'unverified match')}">⚠ unverified match</span>` : '';
    // The free LLM "why this company would want it" (for unqualified picks).
    const whyLine = unq && c.match_reason ? `<div class="sr-why-llm">${escapeHtml(c.match_reason)}</div>` : '';
    const qualifying = c._qualifying
      ? '<div class="sr-contacts-note sr-enriching"><span class="sr-spin"></span> Qualifying (ability-to-pay)…</div>'
      : (unq ? `${whyLine}<div class="sr-unq muted">Not yet qualified — tick + “Qualify selected” to score ability-to-pay &amp; pull contacts.</div>` : '');
    return `
    <div class="sr-card sr-card-${escapeHtml(c.tier || 'unknown')}${unq ? ' sr-card-unq' : ''}" data-id="${escapeHtml(c.id)}">
      <div class="sr-card-head">
        <label class="sr-card-check"><input type="checkbox" class="sr-cb" data-id="${escapeHtml(c.id)}"${salesSelected.has(c.id) ? ' checked' : ''}></label>
        <div class="sr-card-id">
          <div class="sr-card-name">${escapeHtml(c.company || '—')}${recommend}${angleBadge}${lowConfBadge}${offBadge}</div>
          <div class="sr-card-links">
            <a class="sr-card-domain" href="https://${escapeHtml(c.domain)}" target="_blank" rel="noopener">${escapeHtml(c.domain)}</a>
            ${coLi ? `<a class="sr-card-li" href="${escapeHtml(coLi)}" target="_blank" rel="noopener" title="Company LinkedIn" aria-label="Company LinkedIn">in</a>` : ''}
          </div>
          ${metaLine(c)}
        </div>
        <div class="sr-card-badges">${statusBadge(c.status)}${tierBadge(c.tier)}</div>
      </div>
      ${c.firmographics ? metricsGrid(c) : ''}
      ${qualifying}
      ${contactsBlock(c)}
    </div>`;
  };
  // Group into priority sections; stack-rank each by relevance (score) then size.
  // Recommended = the highly-relevant, worth-pursuing buyers: ALL upgrades
  // (already use the name — cheap + relevant) PLUS the best-fit keyword picks
  // (score ≥ 2). Keyword expansions = the rest of the angle companies (tougher
  // sell). Others = for-sale / inactive.
  const byScore = (a, b) => ((Number(b.score) || 0) - (Number(a.score) || 0)) || ((b.employee_count || 0) - (a.employee_count || 0));
  const sections = [
    { label: 'Recommended — upgrades & best-fit buyers', rows: [] },
    { label: 'Product-name matches — companies with a product of this name', rows: [] },
    { label: 'Keyword expansions — adjacent industries', rows: [] },
    { label: 'Others', rows: [] },
  ];
  const offTarget = (c) => (c.firmographics && c.firmographics.atp_relevant === false) || Number(c.score) < 0;
  // When a specific path tab is active, show one flat sorted list — a card can
  // belong to several tabs (e.g. an affix-upgrade product match), so the multi-
  // section headers (which are keyed off the primary angle) would otherwise file
  // it under a mismatched header on the filtered tab.
  if (salesPathFilter !== 'all') {
    const flat = rows.slice().sort(byScore);
    els.srTable.innerHTML = `<div class="sr-section"><div class="sr-cards">${flat.map(cardHtml).join('')}</div></div>`;
    els.srTable.querySelectorAll('.sr-cb').forEach((cb) => cb.addEventListener('change', () => {
      if (cb.checked) salesSelected.add(cb.dataset.id); else salesSelected.delete(cb.dataset.id);
      updateSalesEnrichBtn();
    }));
    updateSalesEnrichBtn();
    return;
  }
  for (const c of rows) {
    if (c.status && c.status !== 'active') sections[3].rows.push(c);                 // for-sale / inactive
    else if (offTarget(c)) sections[3].rows.push(c);                                 // relevance-gated → Others
    else if (isProductAngle(c)) sections[1].rows.push(c);                            // product-name matches, grouped
    else if (c.category === 'upgrade' || Number(c.score) >= 2) sections[0].rows.push(c);  // upgrades + best-fit keyword
    else if (c.category === 'keyword') sections[2].rows.push(c);                     // remaining angle companies
    else sections[3].rows.push(c);
  }
  els.srTable.innerHTML = sections.filter((s) => s.rows.length).map((s) => {
    s.rows.sort(byScore);
    return `<div class="sr-section"><div class="sr-section-head">${escapeHtml(s.label)} <span class="sr-section-n">${s.rows.length}</span></div>`
      + `<div class="sr-cards">${s.rows.map(cardHtml).join('')}</div></div>`;
  }).join('');
  els.srTable.querySelectorAll('.sr-cb').forEach((cb) => cb.addEventListener('change', () => {
    if (cb.checked) salesSelected.add(cb.dataset.id); else salesSelected.delete(cb.dataset.id);
    updateSalesEnrichBtn();
  }));
  updateSalesEnrichBtn();
}

// Selection persists across path-filter tabs (set-backed, not DOM-backed), so you
// can tick rows on Upgrades, switch to Product/Keyword, tick more, then act on the
// whole set. Drop ids that no longer exist (e.g. after a refresh).
function selectedCandidateIds() {
  return [...salesSelected].filter((id) => salesCandidates.some((c) => c.id === id));
}
function updateSalesEnrichBtn() {
  const ids = selectedCandidateIds();
  if (els.srEnrich) els.srEnrich.disabled = ids.length === 0;
  // CSV exports the checked rows → disabled when nothing is checked.
  if (els.srCsv) els.srCsv.disabled = ids.length === 0;
  // Qualify is enabled when any SELECTED company is still unqualified (no firmographics).
  const anyUnqualified = ids.some((id) => { const c = salesCandidates.find((x) => x.id === id); return c && !c.firmographics; });
  if (els.srQualify) els.srQualify.disabled = !anyUnqualified;
  // Keep the Select-all box in sync (checked when all VISIBLE rows are ticked).
  if (els.srSelectAll) {
    const visIds = [...els.srTable.querySelectorAll('.sr-cb')].map((cb) => cb.dataset.id);
    const visSel = visIds.filter((id) => salesSelected.has(id));
    els.srSelectAll.checked = visIds.length > 0 && visSel.length === visIds.length;
    els.srSelectAll.indeterminate = visSel.length > 0 && visSel.length < visIds.length;
  }
}

// Select all / none of the currently-visible cards (other tabs' picks are untouched).
els.srSelectAll?.addEventListener('change', () => {
  const on = els.srSelectAll.checked;
  els.srTable.querySelectorAll('.sr-cb').forEach((cb) => {
    cb.checked = on;
    if (on) salesSelected.add(cb.dataset.id); else salesSelected.delete(cb.dataset.id);
  });
  updateSalesEnrichBtn();
});

// Manual Apollo qualify of the selected unqualified companies (the paid gate).
const QUALIFY_CHUNK = 10;   // bound each request well under the 60s API cap
els.srQualify?.addEventListener('click', async () => {
  const ids = selectedCandidateIds().filter((id) => { const c = salesCandidates.find((x) => x.id === id); return c && !c.firmographics; });
  if (!ids.length) return;
  els.srQualify.disabled = true;
  const orig = els.srQualify.textContent;
  // Optimistically mark them pending-ish in the UI.
  for (const id of ids) { const c = salesCandidates.find((x) => x.id === id); if (c) c._qualifying = true; }
  renderSalesTable();
  // Qualify in chunks so a large selection can't blow the API's 60s cap; refresh
  // after each chunk so results stream in and a mid-batch failure keeps prior work.
  let done = 0;
  try {
    for (let i = 0; i < ids.length; i += QUALIFY_CHUNK) {
      const batch = ids.slice(i, i + QUALIFY_CHUNK);
      els.srQualify.textContent = ids.length > QUALIFY_CHUNK ? `Qualifying ${done + 1}–${done + batch.length} of ${ids.length}…` : `Qualifying ${batch.length}…`;
      try {
        await fetch('/research/api/sales', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'qualify', ids: batch }),
        });
      } catch { /* leave this batch as-is; keep going */ }
      done += batch.length;
      await refreshSalesProject();   // pull filled-in firmographics + re-rank as we go
      // Keep the spinner on companies whose chunk hasn't run yet.
      const pending = new Set(ids.slice(done));
      if (pending.size) {
        for (const c of salesCandidates) if (pending.has(c.id)) c._qualifying = true;
        renderSalesTable();
      }
    }
  } finally {
    els.srQualify.textContent = orig;
  }
});

els.srShowAll?.addEventListener('change', renderSalesTable);

els.srPathfilter?.addEventListener('click', (e) => {
  const btn = e.target.closest('.sr-pf-btn');
  if (!btn || btn.disabled) return;
  salesPathFilter = btn.dataset.path || 'all';
  renderSalesTable();
});

// Reflect the active path filter + per-path counts on the toggle; auto-revert to
// "All" if the active filter would show nothing for this run.
function updatePathFilter() {
  if (!els.srPathfilter) return;
  const pool = salesCandidates.filter((c) => (els.srShowAll && els.srShowAll.checked) || c.status === 'active');
  const counts = { all: pool.length, upgrade: 0, product: 0, keyword: 0 };
  for (const c of pool) for (const p of salesPaths(c)) counts[p]++;
  if (salesPathFilter !== 'all' && !counts[salesPathFilter]) salesPathFilter = 'all';
  const LABELS = { all: 'All', upgrade: 'Upgrades', product: 'Product', keyword: 'Keyword' };
  els.srPathfilter.querySelectorAll('.sr-pf-btn').forEach((b) => {
    const p = b.dataset.path;
    const n = counts[p] || 0;
    b.classList.toggle('active', p === salesPathFilter);
    b.disabled = p !== 'all' && n === 0;
    const base = LABELS[p] || p;
    b.innerHTML = p === 'all' ? base : `${base}<span class="sr-pf-n">${n}</span>`;
  });
}

els.srEnrich?.addEventListener('click', async () => {
  const ids = selectedCandidateIds();
  if (!ids.length || !salesProjectId) return;
  els.srEnrich.disabled = true;
  // Persist selection, then enrich each selected company sequentially (RocketReach).
  try {
    await fetch('/research/api/sales', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'select', project_id: salesProjectId, ids, selected: true }),
    });
  } catch { /* non-fatal */ }
  for (const id of ids) {
    const cand = salesCandidates.find((c) => c.id === id);
    if (cand) { cand.enrich_status = 'pending'; renderSalesTable(); }
    try {
      const res = await fetch('/research/api/sales', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'enrich', candidate_id: id }),
      });
      const data = await res.json();
      if (cand) { cand.enrich_status = res.ok ? 'done' : 'failed'; cand.contacts = data.contacts || []; }
    } catch { if (cand) cand.enrich_status = 'failed'; }
    renderSalesTable();
  }
});

els.srCsv?.addEventListener('click', () => {
  // Export the checked rows only (Select all ticks them all).
  const ids = new Set(selectedCandidateIds());
  const picked = salesCandidates.filter((c) => ids.has(c.id));
  if (!picked.length) return;
  const cell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const header = ['Company', 'Domain', 'Status', 'Ability to pay', 'Employees', 'Funding', 'Location', 'Why', 'Contact name', 'Title', 'Email', 'Phone', 'LinkedIn'];
  let csv = header.map(cell).join(',') + '\n';
  for (const c of picked) {
    const base = [c.company, c.domain, c.status, c.tier, c.employee_count, c.funding, c.location, c.match_reason];
    const contacts = c.contacts && c.contacts.length ? c.contacts : [null];
    for (const p of contacts) {
      csv += [...base, p && p.name, p && p.title, p && p.email, p && p.phone, p && p.linkedin].map(cell).join(',') + '\n';
    }
  }
  const slug = (salesSeed || 'sales').replace(/\W+/g, '-').slice(0, 40);
  const stamp = new Date().toISOString().split('T')[0];
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${slug}-buyers-${stamp}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// ── Keyword/angle gate ───────────────────────────────────────────────────────
// "Explore by industry" → enumerate buyer angles (free preview + verified
// headline player) → pick angles (checkboxes) → research the chosen ones.
els.srAngles?.addEventListener('click', async () => {
  if (!salesSeed || !els.srAnglegate) return;
  // Gate already open → the button is in "research" mode; dispatch the picks.
  if (els.srAngles.dataset.mode === 'research') { researchSelectedAngles(); return; }
  els.srAnglegate.hidden = false;
  els.srAnglegate.dataset.seed = salesSeed;
  els.srAnglegate.innerHTML = '<div class="sr-ag-loading sr-enriching"><span class="sr-spin"></span> Mapping buyer categories and verifying the top player in each…</div>';
  els.srAngles.disabled = true;
  try {
    const res = await fetch('/research/api/sales', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'angles', domain: salesSeed }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(apiErrText(data, res));
    renderAngleGate(data.angles || []);
  } catch (err) {
    els.srAnglegate.innerHTML = `<div class="sr-ag-loading sr-status-err">${escapeHtml(String(err.message || err))}</div>`;
  } finally { els.srAngles.disabled = false; }
});

function renderAngleGate(angles) {
  salesAngles = angles || [];
  if (!angles.length) { els.srAnglegate.innerHTML = '<div class="sr-ag-loading muted">No distinct categories found for this seed.</div>'; return; }
  const order = { high: 0, medium: 1, low: 2 };
  const sorted = angles.slice().sort((a, b) => (order[a.buyer_potential] ?? 1) - (order[b.buyer_potential] ?? 1));
  const potClass = { high: 'sr-pot-high', medium: 'sr-pot-medium', low: 'sr-pot-low' };
  const fmt = (v) => (v == null || v === '' ? '' : String(v));
  const money = (s) => { const x = fmt(s); return x ? (/^\$/.test(x) ? x : '$' + x) : ''; };
  const num = (n) => (n == null || n === '' || isNaN(Number(n)) ? '' : Number(n).toLocaleString());
  const rows = sorted.map((a) => {
    const v = a.verified;
    const bits = v && v.matched
      ? [money(v.revenue) && `${money(v.revenue)} rev`, num(v.employees) && `${num(v.employees)} staff`].filter(Boolean).join(' · ')
      : '';
    const whale = v && v.matched
      ? `<div class="sr-ag-whale"><span class="sr-ag-whale-lbl">Top player</span> <strong>${escapeHtml(v.name)}</strong> <span class="sr-tier sr-tier-${v.tier}">${escapeHtml(v.tier)}</span>${bits ? ` <span class="sr-ag-whale-meta">${escapeHtml(bits)}</span>` : ''}</div>`
      : (v ? `<div class="sr-ag-whale muted">top player ${escapeHtml(v.name)} — no match</div>` : '');
    const players = a.players.slice(0, 6).map((p) => p.domain
      ? `<a class="sr-ag-co sr-ag-co-link" href="https://${escapeHtml(p.domain)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a>`
      : `<span class="sr-ag-co">${escapeHtml(p.name)}</span>`).join('')
      + (a.players.length > 6 ? `<span class="sr-ag-co sr-ag-more">+${a.players.length - 6} more</span>` : '');
    return `<label class="sr-ag-row" data-key="${escapeHtml(a.key)}">
      <input type="checkbox" class="sr-ag-cb" data-key="${escapeHtml(a.key)}"${a.buyer_potential === 'high' ? ' checked' : ''}>
      <div class="sr-ag-main">
        <div class="sr-ag-l1">
          <span class="sr-pot ${potClass[a.buyer_potential] || ''}">${escapeHtml(a.buyer_potential)}</span>
          <span class="sr-ag-label">${escapeHtml(a.label)}</span>
          ${whale}
        </div>
        <div class="sr-ag-l2">${escapeHtml(a.concept)}</div>
        <div class="sr-ag-players">${players}</div>
      </div>
    </label>`;
  }).join('');
  els.srAnglegate.innerHTML = `
    <div class="sr-ag-title">Buyer categories for <strong>${escapeHtml(salesSeed)}</strong> — tick the ones worth researching</div>
    <div class="sr-ag-list">${rows}</div>
    <div class="sr-ag-foot">
      <button id="sr-ag-go" type="button" class="sr-btn sr-ag-go">Research selected categories</button>
      <label class="sr-ag-limit">companies / category
        <select id="sr-ag-lim"><option value="15" selected>15</option><option value="30">30</option><option value="50">50</option></select>
      </label>
      <span class="sr-ag-note muted">Free — finds the companies (no Apollo). You then tick which to <strong>Qualify</strong> (the paid step).</span>
    </div>`;
  document.getElementById('sr-ag-go')?.addEventListener('click', researchSelectedAngles);
  // Gate is now open with categories → flip the top toolbar button to act as
  // "Research selected categories" so it can be triggered from the top.
  setAnglesBtnMode(true);
}

// Poll the project after dispatching a category fan-out (async Inngest) and render
// the appended companies when it lands.
let salesAnglePollTimer = null;
function pollAnglesUntilDone(n, catWord, beforeCount) {
  if (salesAnglePollTimer) clearInterval(salesAnglePollTimer);
  const pid = salesProjectId;
  let tries = 0;
  salesAnglePollTimer = setInterval(async () => {
    if (pid !== salesProjectId) { clearInterval(salesAnglePollTimer); return; }   // user moved on
    tries += 1;
    try {
      const res = await fetch(`/research/api/sales?id=${encodeURIComponent(pid)}`);
      const data = await res.json();
      if (!res.ok) return;
      const st = data.project && data.project.status;
      if (st === 'done') {
        clearInterval(salesAnglePollTimer);
        renderSalesResults(data);
        const added = (data.candidates || []).length - beforeCount;
        setSalesStatus(`Added ${added > 0 ? added : 0} companies from ${n} ${catWord}. Tick the ones to qualify, then “Qualify selected”.`);
        setTimeout(() => setSalesStatus(''), 8000);
      } else if (st === 'failed') {
        clearInterval(salesAnglePollTimer);
        setSalesStatus(data.project.error || 'Category research failed', true);
      }
    } catch { /* transient — keep polling */ }
    if (tries > 120) { clearInterval(salesAnglePollTimer); setSalesStatus('Still working… refresh in a moment to see results.'); }
  }, 3000);
}

// Re-pull the current project's candidates and re-render (after angle research / qualify).
async function refreshSalesProject() {
  if (!salesProjectId) return;
  const res = await fetch(`/research/api/sales?id=${encodeURIComponent(salesProjectId)}`);
  const data = await res.json();
  if (res.ok) renderSalesResults(data);
}

// Recent list / projects list — open a run on click; "view all" → projects page.
function openSalesRunFromList(li) {
  if (!li || !li.dataset.id) return;
  history.pushState(null, '', `/research/sales/${encodeURIComponent(li.dataset.id)}`);
  showView('sales');
  openSalesProject(li.dataset.id);
}
els.srRecentList?.addEventListener('click', (e) => openSalesRunFromList(e.target.closest('.recent-run')));
els.srProjectsList?.addEventListener('click', (e) => openSalesRunFromList(e.target.closest('.project-run')));
els.srRecentAll?.addEventListener('click', (e) => {
  if (newTabClick(e)) return;
  e.preventDefault();
  history.pushState(null, '', '/research/sales/all');
  showView('sales-projects');
  loadSalesProjects('');
});
// "New report" — back to the entry (hero + form) to start a fresh run.
els.srNew?.addEventListener('click', () => {
  history.pushState(null, '', '/research/sales');
  resetSalesView();
});
// Collapse / expand a card's contacts (delegated; persists across re-renders).
els.srTable?.addEventListener('click', (e) => {
  const tog = e.target.closest('.sr-contacts-toggle');
  if (!tog) return;
  const id = tog.dataset.id;
  if (salesCollapsed.has(id)) salesCollapsed.delete(id); else salesCollapsed.add(id);
  renderSalesTable();
});
els.srProjectsSearch?.addEventListener('input', () => {
  clearTimeout(salesProjectsTimer);
  salesProjectsTimer = setTimeout(() => loadSalesProjects(els.srProjectsSearch.value.trim()), 200);
});

// ── Corporate Portfolios ────────────────────────────────────────────────────
// Reverse-WHOIS a company (or registrant email) → premium domains. Create kicks
// off an async Inngest pull; we poll the run until done, then render the table.
let cpRunId = null;
let cpPollTimer = null;
let cpRunsTimer = null;
function clearCpPoll() { if (cpPollTimer) { clearInterval(cpPollTimer); cpPollTimer = null; } }
function setCpStatus(msg, isErr = false) {
  if (!els.cpStatus) return;
  els.cpStatus.hidden = !msg;
  els.cpStatus.textContent = msg || '';
  els.cpStatus.classList.toggle('error', !!isErr);
}
function setCpMode(mode, q = '') {
  const view = document.getElementById('view-portfolio');
  if (view) view.classList.toggle('report-open', mode === 'results');
  if (els.cpEntry) els.cpEntry.hidden = mode === 'results';
  if (els.cpReshead) els.cpReshead.hidden = mode !== 'results';
  if (mode === 'results' && els.cpResheadQ) els.cpResheadQ.textContent = q || '';
}
function resetPortfolioView() {
  clearCpPoll();
  cpRunId = null;
  if (els.cpQuery) els.cpQuery.value = '';
  if (els.cpError) els.cpError.hidden = true;
  if (els.cpResults) els.cpResults.hidden = true;
  if (els.cpTable) els.cpTable.innerHTML = '';
  if (els.cpCsv) els.cpCsv.disabled = true;
  setCpStatus('');
  setCpMode('entry');
  loadPortfolioRecent();
}

// Read the premium-filter knobs into the API's filter shape (or undefined for
// the defaults, so the server applies DEFAULT_FILTER).
function cpReadFilter() {
  const tlds = String(els.cpTlds?.value || '').split(',').map((t) => t.trim().replace(/^\./, '')).filter(Boolean);
  return {
    tlds,
    minShort: Number(els.cpMin?.value) || 2,
    maxShort: Number(els.cpMax?.value) || 4,
    requireDictionary: !!(els.cpDict && els.cpDict.checked),
    allowHyphens: !!(els.cpHyphens && els.cpHyphens.checked),
  };
}

function cpRecentRow(r) {
  const when = r.created_at ? new Date(r.created_at).toLocaleString() : '';
  const st = r.status === 'done' ? (r.premium_count != null ? ` · ${r.premium_count} premium` : '') : ` · ${escapeHtml(r.status || '')}`;
  return `<li class="recent-run" data-id="${escapeHtml(r.id)}">`
    + `<span class="recent-domain">${escapeHtml(r.query || '')}${st}</span>`
    + `<span class="recent-when">${escapeHtml(when)}</span></li>`;
}
async function loadPortfolioRecent() {
  if (!els.cpRecent) return;
  try {
    const res = await fetch('/research/api/portfolio?list=1&limit=5');
    const data = await res.json().catch(() => ({}));
    const runs = res.ok && Array.isArray(data.runs) ? data.runs : [];
    els.cpRecent.hidden = runs.length === 0;
    if (els.cpRecentList) els.cpRecentList.innerHTML = runs.slice(0, 5).map(cpRecentRow).join('');
  } catch { els.cpRecent.hidden = true; }
}
async function loadPortfolioRuns(q = '') {
  if (!els.cpRunsList) return;
  els.cpRunsList.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const res = await fetch(`/research/api/portfolio?list=1&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    const runs = data.runs || [];
    if (!runs.length) { els.cpRunsList.innerHTML = '<li class="muted">No portfolio pulls yet.</li>'; return; }
    els.cpRunsList.innerHTML = runs.map((r) => {
      const when = r.created_at ? new Date(r.created_at).toLocaleString() : '';
      const running = r.status && r.status !== 'done';
      const cnt = r.premium_count != null ? ` · ${r.premium_count} premium` : '';
      const meta = running ? `${escapeHtml(r.status)}…` : `${escapeHtml(when)}${cnt}`;
      return `<li class="project-group"><div class="project-group-title">${escapeHtml(r.query || '(unknown)')}</div>`
        + `<ul class="project-runs"><li class="project-run${running ? ' active' : ''}" data-id="${escapeHtml(r.id)}">${meta}</li></ul></li>`;
    }).join('');
  } catch (e) {
    els.cpRunsList.innerHTML = `<li class="muted">${escapeHtml(String(e.message || e))}</li>`;
  }
}

async function portfolioCreate(query, filter, tries = 3) {
  // One seed field — the server classifies it (domain → derive registrant from
  // WHOIS · company name · registrant email) and derives the reverse-WHOIS keys.
  const body = { action: 'create', filter, seed: query };
  let last;
  for (let a = 0; a < tries; a++) {
    const res = await fetch('/research/api/portfolio', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    last = new Error(data.error || `Failed (${res.status})`);
    if (res.status >= 500 && a < tries - 1) { await new Promise((r) => setTimeout(r, 1500 * (a + 1))); continue; }
    throw last;
  }
  throw last;
}

function openPortfolioRun(id) {
  clearCpPoll();
  cpRunId = id;
  if (els.cpGo) els.cpGo.disabled = true;
  setCpMode('results', '');
  setCpStatus('Pulling the portfolio from reverse-WHOIS…');
  if (els.cpResults) els.cpResults.hidden = true;
  let pollErrors = 0;
  const poll = async () => {
    try {
      const res = await fetch(`/research/api/portfolio?id=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status >= 500 && ++pollErrors < 8) { setCpStatus('Reconnecting…'); return; }
        throw new Error(data.error || `Poll failed (${res.status})`);
      }
      pollErrors = 0;
      const run = data.run || {};
      if (run.query && els.cpResheadQ) els.cpResheadQ.textContent = run.query;
      if (run.status === 'done') {
        clearCpPoll();
        if (els.cpGo) els.cpGo.disabled = false;
        renderPortfolio(data);
      } else if (run.status === 'failed') {
        clearCpPoll();
        if (els.cpGo) els.cpGo.disabled = false;
        setCpStatus(run.error || 'Pull failed', true);
      } else {
        setCpStatus(`Working… (${run.stage || run.status})`);
      }
    } catch (err) {
      if (++pollErrors < 8) { setCpStatus('Reconnecting…'); return; }
      clearCpPoll();
      if (els.cpGo) els.cpGo.disabled = false;
      setCpStatus(String(err.message || err), true);
    }
  };
  poll();
  cpPollTimer = setInterval(poll, 2500);
}

let cpDomains = [];     // last run's full domain list (premium + the rest)
let cpPremiumOnly = false;

function cpRenderTable() {
  const all = cpDomains;
  const list = cpPremiumOnly ? all.filter((d) => d.premium_reason) : all;
  if (!all.length) {
    els.cpTable.innerHTML = '<p class="muted">No domains found for this company/registrant. If you searched a name, try the parent <strong>domain</strong> (e.g. meta.com) so I can read its WHOIS — or a registrant email. Big corporates often register behind MarkMonitor/CSC privacy, which thins reverse-WHOIS coverage.</p>';
    return;
  }
  if (!list.length) { els.cpTable.innerHTML = '<p class="muted">No premium names in this portfolio — untick “Premium only” to see all owned domains.</p>'; return; }
  const rows = list.map((d) => `<tr>`
    + `<td class="cp-dom">${escapeHtml(d.domain)}${d.premium_reason ? ' <span class="cp-badge">★ premium</span>' : ''}</td>`
    + `<td class="cp-len">${d.sld_length ?? ''}</td>`
    + `<td class="cp-reason">${escapeHtml(d.premium_reason || '')}</td>`
    + `<td class="cp-via">${escapeHtml(d.matched_via || '')}</td>`
    + `<td>${escapeHtml(d.created || '')}</td>`
    + `<td>${escapeHtml(d.registrar || '')}</td></tr>`).join('');
  els.cpTable.innerHTML = `<table class="cp-table"><thead><tr>`
    + `<th>Domain</th><th>Len</th><th>Premium</th><th>Matched on</th><th>Registered</th><th>Registrar</th>`
    + `</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderPortfolio(data) {
  const run = data.run || {};
  cpDomains = data.domains || [];
  setCpStatus('');
  setCpMode('results', run.query || '');
  if (els.cpResults) els.cpResults.hidden = false;
  if (els.cpCsv) els.cpCsv.disabled = cpDomains.length === 0;
  els.cpCsv && (els.cpCsv.dataset.runId = run.id || '');
  const owned = Number(run.total_results || cpDomains.length || 0);
  const premium = Number(run.premium_count != null ? run.premium_count : cpDomains.filter((d) => d.premium_reason).length);
  if (els.cpSummary) {
    const pv = (run.filter && run.filter.providers) || null;
    const prov = pv
      ? ` · <span class="cp-prov">Whoxy ${Number(pv.whoxy || 0).toLocaleString()} · WhoisXML ${Number(pv.whoisxml || 0).toLocaleString()} · DomainIQ ${Number(pv.domainiq || 0).toLocaleString()}</span>`
      : '';
    els.cpSummary.innerHTML = `<strong>${owned.toLocaleString()}</strong> owned · `
      + `<strong>${premium.toLocaleString()}</strong> premium`
      + (run.credits_used ? ` · ${run.credits_used} Whoxy pages` : '')
      + prov
      + ` <label class="cp-toggle"><input type="checkbox" id="cp-premonly"${cpPremiumOnly ? ' checked' : ''}/> Premium only</label>`;
    const t = document.getElementById('cp-premonly');
    if (t) t.addEventListener('change', () => { cpPremiumOnly = t.checked; cpRenderTable(); });
  }
  cpRenderTable();
}

els.cpForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = String(els.cpQuery?.value || '').trim();
  if (!query) return;
  if (els.cpError) els.cpError.hidden = true;
  if (els.cpGo) els.cpGo.disabled = true;
  setCpMode('results', query);
  setCpStatus('Starting the portfolio pull…');
  if (els.cpResults) els.cpResults.hidden = true;
  try {
    const data = await portfolioCreate(query, cpReadFilter());
    setToolUrl('portfolio', data.run_id);
    openPortfolioRun(data.run_id);
  } catch (err) {
    setCpStatus(String(err.message || err), true);
    if (els.cpGo) els.cpGo.disabled = false;
  }
});
els.cpCsv?.addEventListener('click', () => {
  const id = els.cpCsv.dataset.runId;
  if (id) window.location.href = `/research/api/portfolio?id=${encodeURIComponent(id)}&format=csv`;
});
function openPortfolioFromList(li) {
  if (!li || !li.dataset.id) return;
  history.pushState(null, '', `/research/portfolio/${encodeURIComponent(li.dataset.id)}`);
  showView('portfolio');
  openPortfolioRun(li.dataset.id);
}
els.cpRecentList?.addEventListener('click', (e) => openPortfolioFromList(e.target.closest('.recent-run')));
els.cpRunsList?.addEventListener('click', (e) => openPortfolioFromList(e.target.closest('.project-run')));
els.cpRecentAll?.addEventListener('click', (e) => {
  if (newTabClick(e)) return;
  e.preventDefault();
  history.pushState(null, '', '/research/portfolio/all');
  showView('portfolio-runs');
  loadPortfolioRuns('');
});
els.cpNew?.addEventListener('click', () => {
  history.pushState(null, '', '/research/portfolio');
  resetPortfolioView();
});
els.cpRunsSearch?.addEventListener('input', () => {
  clearTimeout(cpRunsTimer);
  cpRunsTimer = setTimeout(() => loadPortfolioRuns(els.cpRunsSearch.value.trim()), 200);
});

// ── Person deep-dive ────────────────────────────────────────────────────────
let prRunId = null;
let prPollTimer = null;
let prRunsTimer = null;
let prLastRun = null;
function clearPrPoll() { if (prPollTimer) { clearInterval(prPollTimer); prPollTimer = null; } }
function setPrStatus(text, isErr = false) {
  if (!els.prStatus) return;
  els.prStatus.textContent = text || '';
  els.prStatus.hidden = !text;
  els.prStatus.classList.toggle('error', !!isErr);
}
function resetPersonView() {
  clearPrPoll();
  prRunId = null; prLastRun = null;
  if (els.prUrl) els.prUrl.value = '';
  if (els.prName) els.prName.value = '';
  if (els.prResults) { els.prResults.hidden = true; els.prResults.innerHTML = ''; }
  setPrStatus('');
  loadPersonRecent();
}
const PR_VIP = {
  vip: { cls: 'pr-vip-vip', label: 'VIP' },
  high_profile: { cls: 'pr-vip-high', label: 'High-profile' },
  notable: { cls: 'pr-vip-notable', label: 'Notable' },
  low: { cls: 'pr-vip-low', label: 'Low profile' },
};
const PR_PLAT = { linkedin: 'LinkedIn', twitter: 'X / Twitter', facebook: 'Facebook', instagram: 'Instagram', quora: 'Quora', youtube: 'YouTube', tiktok: 'TikTok', github: 'GitHub', crunchbase: 'Crunchbase', wikipedia: 'Wikipedia', other: 'Profile' };

// A readable label from a profile URL slug — mirrors the server's nameFromProfileUrl
// so an older run whose name never resolved (bot-walled profile) still reads as a
// name in the list instead of a raw URL. Falls back to a cleaned handle, then the URL.
function prNameFromUrl(url) {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    let seg = (u.pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop() || '').split('?')[0];
    seg = seg.replace(/-?\d{4,}$/, '').replace(/-+$/, '');
    const parts = seg.split(/[-_.]+/).filter((p) => /[a-z]/i.test(p) && !/^\d+$/.test(p) && p.length <= 20);
    if (parts.length >= 2) {
      const nm = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      if (nm.length >= 3 && nm.length <= 60) return nm;
    }
    return seg ? `${u.host.replace(/^www\./, '')}/${seg}` : (u.host.replace(/^www\./, '') || url);
  } catch { return url; }
}
function prLabel(r) { return r.subject_name || prNameFromUrl(r.input_url || '') || r.input_url || '(unknown)'; }
function prRecentRow(r) {
  const when = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
  const vip = r.vip_band ? ` · ${(PR_VIP[r.vip_band] || {}).label || r.vip_band}` : '';
  const st = r.status === 'done' ? vip : ` · ${escapeHtml(r.status || '')}`;
  const label = prLabel(r);
  return `<li class="recent-run" data-id="${escapeHtml(r.id)}">`
    + `<span class="recent-domain">${escapeHtml(label)}${st}</span>`
    + `<span class="recent-when">${escapeHtml(when)}</span></li>`;
}
async function loadPersonRecent() {
  if (!els.prRecent) return;
  try {
    const res = await fetch('/research/api/person?list=1&limit=5');
    const data = await res.json().catch(() => ({}));
    const runs = res.ok && Array.isArray(data.runs) ? data.runs : [];
    els.prRecent.hidden = runs.length === 0;
    if (els.prRecentList) els.prRecentList.innerHTML = runs.slice(0, 5).map(prRecentRow).join('');
  } catch { els.prRecent.hidden = true; }
}
async function loadPersonRuns(q = '') {
  if (!els.prRunsList) return;
  els.prRunsList.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const res = await fetch(`/research/api/person?list=1&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    const runs = data.runs || [];
    if (!runs.length) { els.prRunsList.innerHTML = '<li class="muted">No people looked up yet.</li>'; return; }
    els.prRunsList.innerHTML = runs.map((r) => {
      const when = r.created_at ? new Date(r.created_at).toLocaleString() : '';
      const running = r.status && r.status !== 'done';
      const vip = r.vip_band ? ` · ${(PR_VIP[r.vip_band] || {}).label || r.vip_band}` : '';
      const meta = running ? `${escapeHtml(r.status)}…` : `${escapeHtml(when)}${vip}`;
      return `<li class="project-group"><div class="project-group-title">${escapeHtml(prLabel(r))}</div>`
        + `<ul class="project-runs"><li class="project-run${running ? ' active' : ''}" data-id="${escapeHtml(r.id)}">${meta}</li></ul></li>`;
    }).join('');
  } catch (e) {
    els.prRunsList.innerHTML = `<li class="muted">${escapeHtml(String(e.message || e))}</li>`;
  }
}
async function personCreate(url, name, tries = 3) {
  const body = { action: 'create', url, name: name || undefined };
  let last;
  for (let a = 0; a < tries; a++) {
    const res = await fetch('/research/api/person', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    last = new Error(data.error || `Failed (${res.status})`);
    if (res.status >= 500 && a < tries - 1) { await new Promise((r) => setTimeout(r, 1500 * (a + 1))); continue; }
    throw last;
  }
  throw last;
}
function openPersonRun(id) {
  clearPrPoll();
  prRunId = id;
  if (els.prResults) els.prResults.hidden = true;
  setPrStatus('Identifying the person and triangulating their footprint…');
  let pollErrors = 0;
  const poll = async () => {
    try {
      const res = await fetch(`/research/api/person?id=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status >= 500 && ++pollErrors < 8) { setPrStatus('Reconnecting…'); return; }
        throw new Error(data.error || `Poll failed (${res.status})`);
      }
      pollErrors = 0;
      const run = data.run || {};
      if (run.status === 'done') { clearPrPoll(); renderPerson(run); }
      else if (run.status === 'failed') { clearPrPoll(); setPrStatus(run.error || 'Deep dive failed', true); }
      else setPrStatus(`Working… (${run.stage || run.status})`);
    } catch (err) {
      if (++pollErrors < 8) { setPrStatus('Reconnecting…'); return; }
      clearPrPoll(); setPrStatus(String(err.message || err), true);
    }
  };
  poll();
  prPollTimer = setInterval(poll, 2500);
}
function prSocialRow(s) {
  const label = PR_PLAT[s.key] || s.label || s.key;
  const foll = s.followers ? ` · <strong>${prFmtCount(s.followers)}</strong> followers` : '';
  return `<li class="pr-social"><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(label)} ↗</a>${foll}</li>`;
}
function prFmtCount(n) {
  if (!(n > 0)) return '';
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return String(n);
}
function prContactsHtml(contacts) {
  if (!contacts) return '';
  if (!contacts.found) return '<p class="muted">No emails or phone numbers found for this person.</p>';
  const em = (contacts.emails || []).map((e) => `<li>✉ <a href="mailto:${escapeHtml(e.value)}">${escapeHtml(e.value)}</a>${e.label ? ` <span class="pr-tag">${escapeHtml(e.label)}</span>` : ''}<span class="pr-src">${escapeHtml(e.source || '')}</span></li>`).join('');
  const ph = (contacts.phones || []).map((p) => `<li>📞 ${escapeHtml(p.value)}<span class="pr-src">${escapeHtml(p.source || '')}</span></li>`).join('');
  return `<ul class="pr-contacts">${em}${ph}</ul>`;
}
function renderPerson(run) {
  prLastRun = run;
  setPrStatus('');
  const d = run.result || {};
  const subj = d.subject || {};
  const nar = d.narrative || {};
  const vip = d.vip || {};
  const vipMeta = PR_VIP[vip.band] || PR_VIP.low;
  const name = subj.name || run.subject_name || 'Unknown person';
  const role = nar.current_role || [subj.title, subj.company && `@ ${subj.company}`].filter(Boolean).join(' ');
  const notable = (nar.notable || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('');
  const social = (d.social || []).map(prSocialRow).join('');
  const sig = (vip.signals || []).map((s) => `<span class="pr-sig">${escapeHtml(s)}</span>`).join('');
  const revealed = run.revealed && run.contacts;
  const html = `
    <div class="pr-card">
      <div class="pr-head">
        <div>
          <div class="pr-name">${escapeHtml(name)}</div>
          ${role ? `<div class="pr-role">${escapeHtml(role)}</div>` : ''}
          ${subj.location ? `<div class="pr-loc">${escapeHtml(subj.location)}</div>` : ''}
        </div>
        <span class="pr-vip ${vipMeta.cls}">${vipMeta.label}</span>
      </div>
      ${nar.summary ? `<p class="pr-summary">${escapeHtml(nar.summary)}</p>` : ''}
      ${sig ? `<div class="pr-sigs">${sig}</div>` : ''}
      <div class="pr-grid">
        <section class="pr-sec">
          <h3>Cross-platform presence <span class="pr-count">${(d.social || []).length}</span></h3>
          ${social ? `<ul class="pr-socials">${social}</ul>` : '<p class="muted">No other profiles located.</p>'}
          ${nar.prominence ? `<p class="pr-prom">${escapeHtml(nar.prominence)}</p>` : ''}
        </section>
        <section class="pr-sec">
          <h3>Contact info</h3>
          ${revealed ? prContactsHtml(run.contacts)
    : `<p class="muted">Email lookup — RocketReach (1 credit), FullEnrich fallback. No extra phone-number credits.</p>
               <button type="button" id="pr-reveal-btn" class="pr-reveal-btn">🔓 Reveal email</button>`}
          ${nar.reach_recommendation ? `<p class="pr-reach"><strong>Best way to reach:</strong> ${escapeHtml(nar.reach_recommendation)}</p>` : ''}
        </section>
      </div>
      ${notable ? `<section class="pr-sec"><h3>Notable</h3><ul class="pr-notable">${notable}</ul></section>` : ''}
      <div class="pr-foot"><a href="${escapeHtml(subj.input_url || run.input_url || '#')}" target="_blank" rel="noopener">Source profile ↗</a></div>
    </div>`;
  if (els.prResults) { els.prResults.innerHTML = html; els.prResults.hidden = false; }
  const btn = document.getElementById('pr-reveal-btn');
  if (btn) btn.addEventListener('click', () => revealPersonContacts(run.id, btn));
}
async function revealPersonContacts(id, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Looking up contacts…'; }
  try {
    const res = await fetch('/research/api/person', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'reveal', run_id: id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    if (prLastRun) { prLastRun.revealed = true; prLastRun.contacts = data.contacts; renderPerson(prLastRun); }
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '🔓 Reveal email'; }
    setPrStatus(String(err.message || err), true);
  }
}
els.prForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = String(els.prUrl?.value || '').trim();
  if (!url) return;
  setPrStatus('Starting the deep dive…');
  if (els.prResults) els.prResults.hidden = true;
  try {
    const data = await personCreate(url, String(els.prName?.value || '').trim());
    setToolUrl('person', data.run_id);
    openPersonRun(data.run_id);
  } catch (err) { setPrStatus(String(err.message || err), true); }
});
function openPersonFromList(li) {
  if (!li || !li.dataset.id) return;
  history.pushState(null, '', `/research/person/${encodeURIComponent(li.dataset.id)}`);
  showView('person');
  openPersonRun(li.dataset.id);
}
els.prRecentList?.addEventListener('click', (e) => openPersonFromList(e.target.closest('.recent-run')));
els.prRunsList?.addEventListener('click', (e) => openPersonFromList(e.target.closest('.project-run')));
els.prRecentAll?.addEventListener('click', (e) => {
  if (newTabClick(e)) return;
  e.preventDefault();
  history.pushState(null, '', '/research/person/all');
  showView('person-runs');
  loadPersonRuns('');
});
els.prNew?.addEventListener('click', () => { history.pushState(null, '', '/research/person'); resetPersonView(); });
els.prRunsSearch?.addEventListener('input', () => {
  clearTimeout(prRunsTimer);
  prRunsTimer = setTimeout(() => loadPersonRuns(els.prRunsSearch.value.trim()), 200);
});
els.navPerson?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('person', ''); showView('person'); resetPersonView(); });

els.nsRecent?.addEventListener('click', (e) => {
  if (e.target.dataset && e.target.dataset.recentClear) { try { localStorage.removeItem(NS_RECENT_KEY); } catch {} nsRenderRecent(); return; }
  const chip = e.target.closest('button[data-recent]');
  if (chip) { const d = chip.dataset.recent; if (els.nsDomain) els.nsDomain.value = d; setToolUrl('nameserver', d); runNsDomain(d); }
});
els.nsModeToggle?.addEventListener('click', (e) => { const b = e.target.closest('button[data-mode]'); if (b) nsSetMode(b.dataset.mode); });
els.nsMatchToggle?.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-match]'); if (!b) return;
  nsState.match = b.dataset.match === 'any' ? 'any' : 'all';
  for (const x of els.nsMatchToggle.querySelectorAll('button')) x.classList.toggle('active', x === b);
});
// Click a TLD facet chip → narrow the results to that TLD (server-side). Works in
// both surfaces: the NS-search list and the domain→same-pairing siblings (the chip
// carries data-ns-scope to route the re-run).
document.addEventListener('click', (e) => {
  const c = e.target.closest('.ns-tld-chip'); if (!c) return;
  const tld = c.dataset.nsTld || '';
  if (c.dataset.nsScope === 'pairing') { nsState.pairTld = tld; runNsPairing(nsState.pairDomain, { fromChip: true }); }
  else { nsState.tld = tld; runNsList({ fromChip: true }); }
});
els.nsDomainForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!(els.nsDomain.value || '').trim()) return;
  let d;
  try { d = cleanDomainInput(els.nsDomain.value); }
  catch (err) { setToolStatus(els.nsStatus, String(err.message || err), true); return; }
  els.nsDomain.value = d;
  setToolUrl('nameserver', d);
  runNsDomain(d);
});
els.nsNsForm?.addEventListener('submit', (e) => { e.preventDefault(); runNsList(); });
els.nsResult?.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('ns-selall')) {
    const on = e.target.checked;
    els.nsResult.querySelectorAll('.ns-cb').forEach((cb) => { cb.checked = on; });
    return;
  }
  const opt = e.target.closest('button.ns-ctx-opt');
  if (opt) {
    nsCtxSet({ id: opt.dataset.runid, domain: opt.dataset.domain, created_at: opt.dataset.when });
    return;
  }
  const btn = e.target.closest('button[data-act]');
  if (btn) {
    const act = btn.dataset.act;
    if (act === 'pairing') runNsPairing(btn.dataset.domain);
    else if (act === 'relate') runNsRelate(btn.dataset.domain);
    else if (act === 'export-csv') nsExportPairingCsv();
    else if (act === 'export-owner-csv') nsExportOwnerCsv();
    else if (act === 'deep-bg') nsRunDeepBackground(nsState.needsDeep || []);
    else if (act === 'report') nsDrill(btn.dataset.domain, false);
    else if (act === 'deep') nsDrill(btn.dataset.domain, true);
    else if (act === 'ctx-toggle') {
      const pick = document.getElementById('ns-ctx-pick');
      if (pick) { pick.hidden = !pick.hidden; if (!pick.hidden) { const s = document.getElementById('ns-ctx-search'); if (s) s.focus(); } }
    } else if (act === 'ctx-clear') nsCtxClear();
    else if (act === 'owner-lookup') {
      const sel = [...els.nsResult.querySelectorAll('.ns-cb:checked')].map((c) => c.value);
      if (sel.length) nsRunOwnerLookup(sel);
    }
    return;
  }
  const dl = e.target.closest('a.ns-dlink');
  if (dl) { e.preventDefault(); setToolUrl('dbscreen', dl.dataset.domain); route(); }
});
// Context report type-ahead (debounced).
let nsCtxTimer = null;
els.nsResult?.addEventListener('input', (e) => {
  if (!e.target || e.target.id !== 'ns-ctx-search') return;
  const term = e.target.value.trim();
  clearTimeout(nsCtxTimer);
  nsCtxTimer = setTimeout(() => nsCtxSearch(term), 250);
});

// DB Search interactions
els.dsSearch?.addEventListener('submit', (e) => { e.preventDefault(); dsState.page = 0; fetchDbSearch(); });
// "Exact word": pin the SLD length to the number of letters in the query so only
// the exact word matches (antigen → len 7 → only antigen.* survives the q filter).
els.dsExact?.addEventListener('click', () => {
  const raw = (els.dsQ && els.dsQ.value ? String(els.dsQ.value) : '').trim().toLowerCase();
  // Use the SLD only (drop any TLD the user typed), and count letters/digits.
  const sld = raw.split('.')[0].replace(/[^a-z0-9]/g, '');
  if (!sld) { setToolStatus(els.dsStatus, 'Type a word first, then click “Exact word”.', true); return; }
  const n = String(sld.length);
  if (els.dsLenMin) els.dsLenMin.value = n;
  if (els.dsLenMax) els.dsLenMax.value = n;
  dsState.page = 0; fetchDbSearch();
});
els.dsApply?.addEventListener('click', () => { dsState.page = 0; fetchDbSearch(); });
els.dsExport?.addEventListener('click', dsExportCsv);
els.dsReset?.addEventListener('click', () => {
  [els.dsQ, els.dsPriceMin, els.dsPriceMax, els.dsLenMin, els.dsLenMax, els.dsWordsMin, els.dsWordsMax,
   els.dsSyllMin, els.dsSyllMax, els.dsSource, els.dsOwner, els.dsKeyword].forEach((el) => { if (el) el.value = ''; });
  if (els.dsSingle) els.dsSingle.value = '';
  if (els.dsDict) els.dsDict.value = '';
  if (els.dsNonum) els.dsNonum.checked = false;
  if (els.dsFuzzy) els.dsFuzzy.checked = false;
  ['category', 'connotation', 'industry', 'emotion', 'pos', 'forms'].forEach((k) => dsMulti[k] && dsMulti[k].clear());
  dsState.activeTlds.clear();
  if (els.dsTlds) els.dsTlds.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
  dsState.db = 'both';
  if (els.dsDbToggle) els.dsDbToggle.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.db === 'both'));
  dsState.page = 0; fetchDbSearch();
});
els.dsDbToggle?.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-db]'); if (!b) return;
  dsState.db = b.dataset.db;
  els.dsDbToggle.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
  dsState.page = 0; fetchDbSearch();
});
els.dsTlds?.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tld]'); if (!b) return;
  const t = b.dataset.tld;
  if (dsState.activeTlds.has(t)) { dsState.activeTlds.delete(t); b.classList.remove('active'); }
  else { dsState.activeTlds.add(t); b.classList.add('active'); }
});
els.dsPrev?.addEventListener('click', () => { if (dsState.page > 0) { dsState.page -= 1; fetchDbSearch(); } });
els.dsNext?.addEventListener('click', () => { dsState.page += 1; fetchDbSearch(); });
els.dsTable?.querySelectorAll('th.dbs-sort').forEach((th) => {
  th.addEventListener('click', () => {
    const col = th.dataset.sort;
    if (dsState.sort === col) dsState.dir = dsState.dir === 'asc' ? 'desc' : 'asc';
    else { dsState.sort = col; dsState.dir = 'asc'; }
    els.dsTable.querySelectorAll('th.dbs-sort').forEach((h) => h.classList.remove('sorted-asc', 'sorted-desc'));
    th.classList.add(dsState.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    dsState.page = 0; fetchDbSearch();
  });
});
els.navNaming?.addEventListener('click', (e) => {
  if (newTabClick(e)) return; // let ⌘/ctrl/middle-click open a new tab
  e.preventDefault();
  if (location.pathname !== '/research/naming') history.pushState(null, '', '/research/naming');
  showView('naming');
  resetNamingView();
  loadNamingRecent();
  closeNav();
});

// Click a Recent row → open that past naming run (deep-link path).
els.namingRecentList?.addEventListener('click', (e) => {
  const li = e.target.closest('.recent-run');
  if (!li) return;
  const id = li.dataset.id;
  if (!id) return;
  history.pushState(null, '', `/research/naming/${encodeURIComponent(id)}`);
  showView('naming');
  openNamingRun(id);
});

// "Show all past naming runs →" link.
els.namingShowAll?.addEventListener('click', (e) => {
  e.preventDefault();
  history.pushState(null, '', '/research/naming/all');
  showView('naming-projects');
  loadNamingProjects('');
});

// Last-5 list under the brief: open a run on click; "View all" → full list.
els.namingRecentFiveList?.addEventListener('click', (e) => {
  const li = e.target.closest('.recent-run');
  if (!li || !li.dataset.id) return;
  history.pushState(null, '', `/research/naming/${encodeURIComponent(li.dataset.id)}`);
  showView('naming');
  openNamingRun(li.dataset.id);
});
els.namingRecentFiveAll?.addEventListener('click', (e) => {
  e.preventDefault();
  history.pushState(null, '', '/research/naming/all');
  showView('naming-projects');
  loadNamingProjects('');
});

// Past Naming Runs list — open on click; inline star + rename.
els.namingProjectsList?.addEventListener('click', async (e) => {
  const starBtn = e.target.closest('.naming-star');
  if (starBtn) {
    e.stopPropagation();
    const id = starBtn.dataset.id;
    const starred = starBtn.dataset.starred !== '1'; // toggle
    // optimistic UI
    starBtn.textContent = starred ? '★' : '☆';
    starBtn.dataset.starred = starred ? '1' : '0';
    starBtn.classList.toggle('on', starred);
    try {
      const res = await fetch('/research/api/naming', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'star', id, starred }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Star failed (${res.status})`);
      // In the Starred view, unstarring should drop the row.
      if (namingScope === 'starred' && !starred) {
        loadNamingProjects(els.namingProjectsSearch ? els.namingProjectsSearch.value : '');
      }
    } catch (err) {
      // revert optimistic change
      starBtn.textContent = starred ? '☆' : '★';
      starBtn.dataset.starred = starred ? '0' : '1';
      starBtn.classList.toggle('on', !starred);
      alert(String(err.message || err));
    }
    return;
  }
  const renameBtn = e.target.closest('.naming-rename');
  if (renameBtn) {
    e.stopPropagation();
    const id = renameBtn.dataset.id;
    const current = renameBtn.dataset.title || '';
    const next = window.prompt('Project name (leave blank to clear):', current);
    if (next === null) return; // cancelled
    try {
      const res = await fetch('/research/api/naming', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'rename', id, title: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Rename failed (${res.status})`);
      loadNamingProjects(els.namingProjectsSearch ? els.namingProjectsSearch.value : '');
    } catch (err) {
      alert(String(err.message || err));
    }
    return;
  }
  const li = e.target.closest('.recent-run');
  if (!li) return;
  const id = li.dataset.id;
  if (!id) return;
  history.pushState(null, '', `/research/naming/${encodeURIComponent(id)}`);
  showView('naming');
  openNamingRun(id);
});

// All vs ★ Starred scope toggle on the Past Naming Runs view.
els.namingScopeToggle?.addEventListener('click', (e) => {
  const btn = e.target.closest('.naming-scope-btn');
  if (!btn) return;
  namingScope = btn.dataset.scope === 'starred' ? 'starred' : 'all';
  els.namingScopeToggle.querySelectorAll('.naming-scope-btn').forEach((b) => b.classList.toggle('active', b === btn));
  loadNamingProjects(els.namingProjectsSearch ? els.namingProjectsSearch.value.trim() : '');
});

// Debounced search box on the Past Naming Runs view.
let namingProjectsTimer = null;
els.namingProjectsSearch?.addEventListener('input', () => {
  clearTimeout(namingProjectsTimer);
  namingProjectsTimer = setTimeout(() => loadNamingProjects(els.namingProjectsSearch.value.trim()), 200);
});

// Naming chat form: submit on click or ⌘/Ctrl+Enter.
els.namingChatForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = (els.namingChatInput?.value || '').trim();
  if (msg) sendNamingChat(msg);
});
els.namingChatInput?.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    const msg = els.namingChatInput.value.trim();
    if (msg) sendNamingChat(msg);
  }
});
// Refresh link in the report meta — forces a fresh research (skips the cache).
els.reportMeta?.addEventListener('click', (e) => {
  const link = e.target.closest('.report-refresh');
  if (!link) return;
  e.preventDefault();
  const domain = currentReportDomain;
  if (!domain) return;
  const deep = link.dataset.deep === 'true';
  run({ domain, deep, force: true });
});
els.tmForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!els.tmQuery.value.trim()) return;
  let q;
  // Lenient: a bare brand word is valid for a trademark search, but a pasted URL
  // with a path is still ambiguous → error.
  try { q = cleanDomainInput(els.tmQuery.value, { requireValid: false }); }
  catch (err) { setToolStatus(els.tmStatus, String(err.message || err), true); return; }
  if (q) runTrademark(q);
});
els.apForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!els.apDomain.value.trim()) return;
  let v;
  try { v = cleanDomainInput(els.apDomain.value); }
  catch (err) { setToolStatus(els.apStatus, String(err.message || err), true); return; }
  els.apDomain.value = v;
  runAppraisal(v);
});
els.namingGo?.addEventListener('click', runNaming);
els.namingApply?.addEventListener('click', runNaming);
// ✨ Draft brief — turn whatever's in the box (rough notes, a pasted doc, a few
// reference names you like) into a polished theme brief, in place.
els.namingDraft?.addEventListener('click', async () => {
  const context = (els.namingInput?.value || '').trim();
  if (!context) { setNamingStatus('Add a few notes (or paste a brief / names you like) first.', true); return; }
  const btn = els.namingDraft;
  const prev = btn.textContent;
  btn.disabled = true; btn.textContent = '✨ Drafting…';
  setNamingStatus('Drafting a brief from your notes…');
  try {
    const res = await fetch('/research/api/naming', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'draft_brief', context }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.brief) throw new Error(data.error || `Failed (${res.status})`);
    if (els.namingInput) { els.namingInput.value = data.brief; els.namingInput.focus(); }
    setNamingStatus('Brief drafted — review/tweak, then Find Names.');
  } catch (e) {
    setNamingStatus(String(e.message || e), true);
  } finally {
    btn.disabled = false; btn.textContent = prev;
  }
});
// Mode toggle: theme search vs build-around-a-word variations.
els.namingMode?.addEventListener('click', (e) => {
  const btn = e.target.closest('.naming-mode-btn');
  if (btn) setNamingMode(btn.dataset.mode);
});
els.nmvDownload?.addEventListener('click', downloadVariationsCsv);
// Click-to-filter on the criteria chips (event-delegated on the note container).
els.nmvNote?.addEventListener('click', (e) => {
  const el = e.target.closest('[data-vf]');
  if (!el || !variationsLast) return;
  const facet = el.dataset.vf;
  if (facet === 'clear') { resetVariationsFilter(); renderVariations(variationsLast); return; }
  const key = el.dataset.key;
  if (!key || !variationsFilter[facet]) return;
  const set = variationsFilter[facet];
  if (set.has(key)) set.delete(key); else set.add(key);
  renderVariations(variationsLast);
});

// Collapse/expand the whole Filters block — the grid + Apply row + the parsed-
// filters chips — leaving just the "▾ Filters" handle, to keep results clean.
els.namingFiltersToggle?.addEventListener('click', () => {
  const collapsed = !(els.namingFiltersPanel && els.namingFiltersPanel.classList.contains('is-collapsed'));
  if (els.namingFiltersPanel) els.namingFiltersPanel.classList.toggle('is-collapsed', collapsed);
  if (els.namingFilters) els.namingFilters.classList.toggle('nf-collapsed', collapsed);
  els.namingFiltersToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
});
// Start a fresh project: clears the brief/title/results so the next Find Names
// inserts a new run instead of updating the current one.
els.namingNew?.addEventListener('click', () => {
  resetNamingView();
  if (location.pathname !== '/research/naming') history.replaceState(null, '', '/research/naming');
  if (els.namingTitle) els.namingTitle.focus();
});
// Live-format price inputs as "$1,234,567"; Enter applies.
function formatPriceField(el) {
  const digits = String(el.value).replace(/[^0-9]/g, '');
  el.value = digits ? '$' + Number(digits).toLocaleString('en-US') : '';
}
[els.namingPriceMin, els.namingPriceMax].forEach((el) => {
  if (!el) return;
  el.addEventListener('input', () => formatPriceField(el));
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runNaming(); } });
});
els.namingInput?.addEventListener('keydown', (e) => {
  // ⌘/Ctrl + Enter submits the brief — same affordance as the Refine chat.
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runNaming(); }
});
els.namingExportCsv?.addEventListener('click', copyNamingCsv);
els.namingExportDownload?.addEventListener('click', downloadNamingCsv);
els.namingExportSheet?.addEventListener('click', exportNamingSheet);
// Re-sort the loaded results in place (no re-fetch, no re-running the live verify).
els.namingSort?.addEventListener('change', () => {
  namingSortMode = els.namingSort.value || 'fit';
  if (!namingLastResults) return;
  const buy = sortNamingRows(namingLastResults.buyReady || [], namingSortMode);
  const stretch = sortNamingRows(namingLastResults.stretch || [], namingSortMode);
  if (els.namingBuyReadyTable && buy.length) els.namingBuyReadyTable.innerHTML = renderNamingTable(buy, 'Buy-ready');
  if (els.namingStretchTable) els.namingStretchTable.innerHTML = renderNamingTable(stretch, 'Stretch');
  // Re-apply any "in use" flags the verify pass already found to the re-rendered cards.
  if (typeof namingLiveStatuses === 'object' && namingLiveStatuses) applyLiveStatuses(namingLiveStatuses);
});

// Save-as-lesson click delegation on the refine-chat thread.
els.chatThread?.addEventListener('click', (e) => {
  const btn = e.target.closest('.chat-save-lesson');
  if (!btn) return;
  openLessonModal(btn.dataset.msgId);
});
els.lessonModalSubmit?.addEventListener('click', submitLessonModal);
els.lessonModalCancel?.addEventListener('click', () => { showLessonModal(false); lessonModalContext = null; });
els.lessonModal?.addEventListener('click', (e) => {
  // Click on the backdrop (not the inner card) closes the modal.
  if (e.target === els.lessonModal) { showLessonModal(false); lessonModalContext = null; }
});

// Admin lesson-list actions: approve, disable, save edits, delete.
els.lessonList?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const row = btn.closest('.lesson-row');
  const id = row && row.dataset.id;
  if (!id) return;
  const action = btn.dataset.action;
  if (action === 'approve') { await patchLesson(id, { status: 'approved' }, row); loadLessons(); return; }
  if (action === 'disable') { await patchLesson(id, { status: 'disabled' }, row); loadLessons(); return; }
  if (action === 'save') {
    const bodyEl = row.querySelector('textarea[data-field="body"]');
    const tagsEl = row.querySelector('input[data-field="tags"]');
    const body = bodyEl ? bodyEl.value.trim() : '';
    const tags = tagsEl ? tagsEl.value.split(',').map((t) => t.trim()).filter(Boolean) : [];
    if (!body) return;
    await patchLesson(id, { body, tags }, row);
    return;
  }
  if (action === 'delete') {
    if (!confirm('Delete this lesson permanently?')) return;
    try {
      const res = await fetch(`/research/api/lessons?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed (${res.status})`);
      }
      loadLessons();
    } catch (err) {
      const errEl = row.querySelector('.lesson-row-error');
      if (errEl) { errEl.textContent = String(err.message || err); errEl.hidden = false; }
    }
  }
});
// "Show all past research" (under the recent-5) opens the full Past Research list.
els.showAll?.addEventListener('click', (e) => { e.preventDefault(); showView('projects'); });

let searchTimer = null;
els.projectsSearch?.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadProjects(els.projectsSearch.value.trim()), 300);
});

els.projectsList?.addEventListener('click', (e) => {
  const li = e.target.closest('[data-id]');
  if (li && li.dataset.id) openProject(li.dataset.id);
});

els.recentList?.addEventListener('click', (e) => {
  const li = e.target.closest('[data-id]');
  if (li && li.dataset.id) openProject(li.dataset.id);
});
// A batch-list row (one per submitted name) opens that name's report.
els.batchStatus?.addEventListener('click', (e) => {
  const li = e.target.closest('[data-id]');
  if (li && li.dataset.id) openProject(li.dataset.id);
});

// ── SNAP Eval — acquisition/resale scorecard for a single domain ────────────
// Cache-first by domain (kind 'ev'): the heavy run happens once; changing the
// price just re-overlays the band (the server computes price_overlay instantly).
let evRunning = false;
const evM = (n) => (n == null || !isFinite(Number(n)) || Number(n) <= 0) ? '—' : '$' + Math.round(Number(n)).toLocaleString();
function setEvStatus(msg, isErr = false) {
  if (!els.evStatus) return;
  els.evStatus.hidden = !msg;
  els.evStatus.textContent = msg || '';
  els.evStatus.classList.toggle('error', !!isErr);
}
function resetEvaluateView() {
  if (els.evResult) { els.evResult.hidden = true; els.evResult.innerHTML = ''; }
  setEvStatus('');
  if (els.evDomain) els.evDomain.value = '';
  if (els.evPrice) els.evPrice.value = '';
  // Move the recent list back above the (now empty) result/status on the entry view.
  if (els.evRecent && els.evStatus && els.evStatus.parentNode) els.evStatus.before(els.evRecent);
}
function evParsePrice(v) {
  const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, ''));
  return isFinite(n) && n > 0 ? n : null;
}

// View a previously-run report cache-first, WITHOUT starting a paid run, touching the
// search box, or disturbing an in-flight eval's loading card. Used when the user clicks a
// recent report while another evaluation is still running.
async function evViewCached(domain) {
  const d = (domain || '').trim().toLowerCase();
  if (!d) return;
  try {
    const res = await fetch(`/research/api/evaluate?domain=${encodeURIComponent(d)}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.evaluation) renderEvaluate(data);
  } catch { /* leave whatever's on screen as-is */ }
}

async function runEvaluate(domain, { price = null, refresh = false } = {}) {
  const d = (domain || '').trim().toLowerCase();
  if (!d) return;
  if (evRunning) return;
  evRunning = true;
  if (els.evGo) els.evGo.disabled = true;
  // Unmissable feedback FIRST (before anything that could throw), so a click always
  // produces a visible response — a loading card that stays put for the ~30–60s run.
  setEvStatus('');
  if (els.evResult) {
    els.evResult.hidden = false;
    els.evResult.innerHTML = `<div class="ev-loading"><div class="ev-spinner"></div>`
      + `<div><strong>${refresh ? 'Re-evaluating' : 'Evaluating'} ${escapeHtml(d)}…</strong>`
      + `<div class="muted">Pulling comparable sales, appraisals, the buyer pool & web — this can take ~30–60 seconds (it'll auto-retry if the connection drops).</div></div></div>`;
    // Keep the running eval ON TOP — push the recent list below it so it's browsable
    // while this one runs (mirrors where the finished report sits).
    if (els.evRecent && els.evResult.parentNode) els.evResult.after(els.evRecent);
  }
  try { setActiveDomain(d); } catch { /* domain bar is decorative */ }
  if (els.evDomain) els.evDomain.value = d;
  try {
    // A long (~40–60s) eval can either REJECT (mobile/wifi drop, deploy swap →
    // "Load failed") or silently HANG at the edge without ever returning. Guard both
    // with an AbortController timeout so the spinner can't spin forever. The server
    // usually FINISHED + cached anyway, so on a drop/timeout we retry ONCE cache-first
    // (no refresh) — which returns the just-computed result fast.
    const doFetch = (useRefresh) => {
      const params = new URLSearchParams({ domain: d });
      if (price) params.set('price', String(price));
      if (useRefresh) params.set('refresh', '1');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 70000);
      return fetch(`/research/api/evaluate?${params.toString()}`, { signal: ctrl.signal })
        .finally(() => clearTimeout(timer));
    };
    let res;
    try {
      res = await doFetch(refresh);
    } catch (netErr) {
      await new Promise((r) => setTimeout(r, 2500));
      res = await doFetch(false);
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(res.ok ? 'Unexpected response from the server.' : `Server error (HTTP ${res.status}). ${text.slice(0, 140)}`); }
    if (!res.ok) throw new Error(data.error || `Evaluation failed (HTTP ${res.status})`);
    renderEvaluate(data);
    refreshToolRecent(els.evRecent, 'ev');
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    if (els.evResult) {
      els.evResult.hidden = false;
      els.evResult.innerHTML = `<div class="ev-error"><strong>Couldn't evaluate ${escapeHtml(d)}.</strong><div class="muted">${escapeHtml(msg)}</div>`
        + `<button type="button" id="ev-retry" class="sr-btn">Try again</button></div>`;
      const rb = document.getElementById('ev-retry');
      if (rb) rb.addEventListener('click', () => runEvaluate(d, { price: evParsePrice(els.evPrice && els.evPrice.value), refresh: true }));
    } else {
      setEvStatus(msg, true);
    }
  } finally {
    evRunning = false;
    if (els.evGo) els.evGo.disabled = false;
  }
}

// ── render ──────────────────────────────────────────────────────────────────
function evBar(label, val) {
  const pct = Math.max(0, Math.min(100, Number(val) || 0));
  const col = pct >= 75 ? '#0b8f3a' : pct >= 55 ? '#5bbf3a' : pct >= 40 ? '#caa024' : '#e07b2c';
  return `<div class="ev-bar"><span class="ev-bar-l">${escapeHtml(label)}</span>`
    + `<span class="ev-bar-track"><span class="ev-bar-fill" style="width:${pct}%;background:${col}"></span></span>`
    + `<span class="ev-bar-v">${Math.round(pct)}</span></div>`;
}

// Round to ~2 significant figures so derived prices read like real numbers.
function evSig2(n) {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / mag) * mag;
}

// High-level resale recap as a GRID: 5 resale scenarios (conservative → high), each
// with the 8–10× max bid you'd pay for it. The model's mid is starred as the
// most-realistic, but the user sees every scenario and decides.
function evResaleGrid(fv) {
  const lo = Number(fv.low) || 0;
  const mid = Number(fv.mid) || 0;
  const hi = Number(fv.high) || 0;
  if (!(mid > 0)) return '';
  const cols = [
    { label: 'Conservative', v: evSig2(lo) },
    { label: 'Low–mid', v: evSig2((lo + mid) / 2) },
    { label: 'Mid', v: evSig2(mid), rec: true },
    { label: 'Mid–high', v: evSig2((mid + hi) / 2) },
    { label: 'High', v: evSig2(hi) },
  ];
  // Max bid for an 8–10× flip = resale ÷ 10 (10×) … resale ÷ 8 (8×).
  const bid = (R) => `${evM(evSig2(R * 0.10))} – ${evM(evSig2(R * 0.125))}`;
  const rc = (c) => (c.rec ? ' class="ev-gt-rec"' : '');
  // Two layouts share the same data: a wide TABLE (desktop) and a stacked CARD grid
  // (mobile — a 5-column table can't fit a phone). CSS shows exactly one by width.
  const cards = cols.map((c) => `<div class="ev-gtc${c.rec ? ' ev-gtc-rec' : ''}">`
    + `<div class="ev-gtc-label">${c.rec ? '★ ' : ''}${c.label}</div>`
    + `<div class="ev-gtc-resale">${evM(c.v)}</div>`
    + `<div class="ev-gtc-bid"><span class="muted">max bid</span> ${bid(c.v)}</div></div>`).join('');
  return `<div class="ev-resalegrid">
    <div class="ev-grid-title">Resale value scenarios <span class="muted">— pay at/under the max bid for an 8–10× flip</span></div>
    <table class="ev-gridtable">
      <thead><tr><th></th>${cols.map((c) => `<th${rc(c)}>${c.rec ? '★ ' : ''}${c.label}</th>`).join('')}</tr></thead>
      <tbody>
        <tr class="ev-gt-resale"><th>Resale value</th>${cols.map((c) => `<td${rc(c)}>${evM(c.v)}</td>`).join('')}</tr>
        <tr class="ev-gt-bid"><th>Max bid (8–10×)</th>${cols.map((c) => `<td${rc(c)}>${bid(c.v)}</td>`).join('')}</tr>
      </tbody>
    </table>
    <div class="ev-gtcards">${cards}</div>
    <div class="muted ev-grid-foot">★ = our most realistic resale estimate. Pay at or under a column's max bid to leave 8–10× resale margin.</div>
  </div>`;
}

function evVerdictHeader(data) {
  const ev = data.evaluation || {};
  const v = ev.verdict || {};
  const val = ev.valuation || {};
  const fv = val.fair_value || {};
  const ov = data.price_overlay; // {price, band:{key,label,color}, ratio}
  const conf = v.confidence || val.confidence || 'low';
  let pill = '';
  if (ov && ov.band) {
    pill = `<div class="ev-bigpill" style="background:${ov.band.color}">`
      + `<span class="ev-bigpill-band">${escapeHtml(ov.band.label)}</span>`
      + `<span class="ev-bigpill-sub">${evM(ov.price)} = ${ov.ratio}× fair resale value</span></div>`;
  } else {
    pill = `<div class="ev-bigpill ev-bigpill-neutral"><span class="ev-bigpill-band">Fair value read</span>`
      + `<span class="ev-bigpill-sub">enter a price above to grade it</span></div>`;
  }
  const adj = v.adjust && v.adjust !== 1 && v.adjust_reason
    ? `<div class="ev-adjust">Adjusted ${v.adjust > 1 ? '↑' : '↓'} ${Math.round((v.adjust - 1) * 100)}% — ${escapeHtml(v.adjust_reason)}</div>` : '';
  return `<div class="ev-verdict">
    <div class="ev-verdict-main">
      <div class="ev-verdict-head">
        <h2 class="ev-domain">${escapeHtml(ev.domain || '')}</h2>
        <span class="ev-conf ev-conf-${escapeHtml(conf)}">${escapeHtml(conf)} confidence</span>
      </div>
      ${v.headline ? `<p class="ev-headline">${escapeHtml(v.headline)}</p>` : ''}
      ${v.rationale ? `<p class="ev-rationale">${escapeHtml(v.rationale)}</p>` : ''}
      ${adj}
      <div class="ev-keymetrics">
        <div class="ev-km"><span class="ev-km-l">Recommended max bid</span><span class="ev-km-v">${evM(val.recommended_max_bid)}</span></div>
        <div class="ev-km"><span class="ev-km-l">Quality grade</span><span class="ev-km-v">${escapeHtml((ev.signals && ev.signals.quality && ev.signals.quality.grade) || '—')} <span class="muted">(${(ev.signals && ev.signals.quality && ev.signals.quality.score) || '—'}/100)</span></span></div>
        ${ev.signals && ev.signals.renewal && ev.signals.renewal.cost ? (() => {
          const r = ev.signals.renewal;
          const tag = r.premium ? ' <span class="ev-prem">premium</span>' : (r.premium_possible ? ' <span class="muted" title="This TLD often has registry-premium names that renew higher — verify a premium name">· std*</span>' : '');
          return `<div class="ev-km"><span class="ev-km-l">Annual renewal</span><span class="ev-km-v">${evM(r.cost)}<span class="muted">/yr</span>${tag}</span></div>`;
        })() : ''}
      </div>
    </div>
    <div class="ev-verdict-pill">${pill}</div>
    ${evResaleGrid(fv)}
  </div>`;
}

// The five-band price ladder. Equal-width segments, colored, each showing its $
// ceiling, with the entered price's band highlighted.
function evBandLadder(data) {
  const ev = data.evaluation || {};
  const bands = (ev.valuation && ev.valuation.bands) || [];
  if (!bands.length) return '';
  const activeKey = data.price_overlay && data.price_overlay.band && data.price_overlay.band.key;
  const seg = bands.map((b, i) => {
    const prev = i === 0 ? 0 : bands[i - 1].max;
    const range = b.max === null || b.max === undefined || !isFinite(b.max)
      ? `&gt; ${evM(prev)}`
      : `${evM(prev)}–${evM(b.max)}`;
    const on = b.key === activeKey;
    return `<div class="ev-seg${on ? ' ev-seg-on' : ''}" style="--c:${b.color}">
      <div class="ev-seg-bar"></div>
      <div class="ev-seg-label">${escapeHtml(b.label)}</div>
      <div class="ev-seg-range">${range}</div>
      ${on ? `<div class="ev-seg-marker">▲ ${evM(data.price_overlay.price)}</div>` : ''}
    </div>`;
  }).join('');
  return `<div class="ev-card"><h3 class="ev-h3">Price bands <span class="muted">— what we'd call each price</span></h3><div class="ev-ladder">${seg}</div></div>`;
}

function evReasons(data) {
  const v = (data.evaluation || {}).verdict || {};
  const fr = v.reasons_for || [];
  const ag = v.reasons_against || [];
  if (!fr.length && !ag.length) return '';
  const col = (title, cls, mark, items) => items.length
    ? `<div class="ev-reasons-col"><h4 class="ev-reasons-h ${cls}">${title}</h4><ul class="ev-reasons-list">${items.map((x) => `<li><span class="ev-mark ${cls}">${mark}</span>${escapeHtml(x)}</li>`).join('')}</ul></div>` : '';
  return `<div class="ev-card ev-reasons">${col('Reasons to buy', 'ev-pos', '✓', fr)}${col('Risks / against', 'ev-neg', '⚠', ag)}</div>`;
}

function evQuality(data) {
  const q = (data.evaluation && data.evaluation.signals && data.evaluation.signals.quality) || null;
  if (!q) return '';
  const c = q.components || {};
  const b = (data.evaluation.signals && data.evaluation.signals.brandability) || null;
  const synergy = (q.synergy && q.synergy.notes && q.synergy.notes.length) ? `<p class="muted ev-synergy">${q.synergy.notes.map(escapeHtml).join(' ')}</p>` : '';
  const brandLine = b ? `<p class="ev-brand"><strong>Brandability: ${escapeHtml(b.tier)}</strong> <span class="muted">— ${escapeHtml(b.commonness || '')} word${b.zipf != null ? ` (zipf ${b.zipf})` : ''}; a common, evocative word brands better than an obscure one.</span></p>` : '';
  const con = (data.evaluation.signals && data.evaluation.signals.connotation) || null;
  const conNeg = con && (con.tone === 'negative' || con.tone === 'somewhat negative');
  const conLine = con && (con.breadth || conNeg) ? `<p class="ev-brand"><strong>Connotation / fit: ${escapeHtml(con.breadth || 'broad')}${conNeg ? ` · ${escapeHtml(con.tone)}` : ''}</strong>${con.mult && con.mult !== 1 ? ` <span class="ev-prem">×${con.mult}</span>` : ''} <span class="muted">— ${con.best_fits && con.best_fits.length ? `best for ${con.best_fits.map(escapeHtml).join(', ')}. ` : ''}${escapeHtml(con.note || '')}${con.breadth === 'narrow' ? ' Narrow buyer pool → modest resale haircut.' : (conNeg ? ' Unfavorable associations heavily disfavored.' : '')}</span></p>` : '';
  const nq = (data.evaluation.verdict && data.evaluation.verdict.name_quality_read) ? `<p class="ev-nameread">${escapeHtml(data.evaluation.verdict.name_quality_read)}</p>` : '';
  const summaryBrand = b ? ` · brandability ${escapeHtml(b.tier)}` : '';
  return `<details class="ev-card ev-collapse"><summary class="ev-h3">Name quality <span class="muted">— grade ${escapeHtml(q.grade)} · ${escapeHtml(q.dictionary_class)} · ${q.length} chars · .${escapeHtml(q.tld.tld)}${summaryBrand}</span></summary>
    <div class="ev-collapse-body">
    <div class="ev-bars">
      ${evBar('Length', c.length)}
      ${evBar('Dictionary', c.dictionary)}
      ${evBar('One word', c.wordCount)}
      ${evBar('Pronounceable', c.pronounce)}
      ${evBar('Clean (no -/#)', c.cleanliness)}
      ${b && b.score != null ? evBar('Brandability', b.score) : ''}
    </div>${brandLine}${conLine}${synergy}${nq}</div></details>`;
}

function evComps(data) {
  const s = (data.evaluation && data.evaluation.signals) || {};
  const comps = s.comps || {};
  const nb = comps.namebio;
  const nbc = comps.namebio_comps;
  const trk = comps.tracker;
  const dh = comps.deal_history;
  const val = (data.evaluation && data.evaluation.valuation) || {};
  const anchors = val.anchors || [];

  // Range across the ACTUAL sold comps (txns + NameBio + exact sale + offers).
  const sold = [];
  (nb && nb.sales || []).forEach((x) => x.price > 0 && sold.push(x.price));
  (trk && trk.deals || []).forEach((x) => x.price > 0 && sold.push(x.price));
  (nbc && nbc.comps || []).forEach((x) => x.price > 0 && sold.push(x.price));
  (dh && dh.offers || []).forEach((x) => x.amountNum > 0 && sold.push(x.amountNum));
  const rangeLine = sold.length
    ? `<p class="ev-comprange">Comparable <strong>sold</strong> prices range <strong>${evM(Math.min(...sold))} – ${evM(Math.max(...sold))}</strong> across ${sold.length} comp${sold.length > 1 ? 's' : ''}.</p>`
    : '';

  let body = '';
  // NameBio exact sales
  if (nb && nb.sales && nb.sales.length) {
    body += `<div class="ev-comp-block"><h4 class="ev-comp-h">NameBio — recorded sales of this exact domain</h4>`
      + `<table class="ev-table"><thead><tr><th>Price</th><th>Date</th><th>Venue</th></tr></thead><tbody>`
      + nb.sales.slice(0, 8).map((x) => `<tr><td>${evM(x.price)}</td><td>${escapeHtml(x.date || '—')}</td><td>${escapeHtml(x.venue || '—')}</td></tr>`).join('')
      + `</tbody></table></div>`;
  }
  // Snagged transaction comps — the Master Txns List (real prices similar names sold at)
  if (trk && trk.deals && trk.deals.length) {
    body += `<div class="ev-comp-block"><h4 class="ev-comp-h">Snagged transactions — comparable names we've sold/acquired <span class="muted">(Master Txns List)</span></h4>`
      + `<table class="ev-table"><thead><tr><th>Domain</th><th>Price</th><th>Date</th></tr></thead><tbody>`
      + trk.deals.slice(0, 8).map((x) => `<tr><td>${escapeHtml(x.domain)}</td><td>${evM(x.price)}</td><td class="muted">${escapeHtml(x.date || '—')}</td></tr>`).join('')
      + `</tbody></table></div>`;
  }
  // NameBio comparable sales (similar names that actually sold)
  if (nbc && nbc.comps && nbc.comps.length) {
    body += `<div class="ev-comp-block"><h4 class="ev-comp-h">NameBio — comparable sales <span class="muted">(${nbc.comps.length} similar names that sold)</span></h4>`
      + `<table class="ev-table"><thead><tr><th>Domain</th><th>Price</th><th>Date</th><th>Venue</th></tr></thead><tbody>`
      + nbc.comps.slice(0, 8).map((x) => `<tr><td>${escapeHtml(x.domain || '—')}</td><td>${evM(x.price)}</td><td>${escapeHtml(x.date || '—')}</td><td>${escapeHtml(x.venue || '—')}</td></tr>`).join('')
      + `</tbody></table></div>`;
  } else if (nbc && nbc.note) {
    // Comps engine returned an error (e.g. plan doesn't include it) — show why.
    body += `<div class="ev-comp-block muted">NameBio comparable sales unavailable — ${escapeHtml(nbc.note)}</div>`;
  }
  // Snagged deal history (strongest)
  if (dh && dh.offers && dh.offers.length) {
    body += `<div class="ev-comp-block"><h4 class="ev-comp-h">Snagged deal history — real money on this domain ${dh.sale ? `<span class="ev-tag">${escapeHtml(dh.sale.label || dh.sale.stage)}</span>` : ''}</h4>`
      + `<table class="ev-table"><thead><tr><th>Amount</th><th>Type</th><th>Channel</th><th>Date</th></tr></thead><tbody>`
      + dh.offers.slice(0, 8).map((o) => `<tr><td>${evM(o.amountNum)}</td><td>${escapeHtml(o.kind)}</td><td>${escapeHtml(o.channel || 'email/CRM')}</td><td>${escapeHtml(o.date || '—')}</td></tr>`).join('')
      + `</tbody></table></div>`;
  } else if (dh) {
    body += `<div class="ev-comp-block muted">Snagged has represented this domain (inbound ${dh.inbound || 0}) but no logged offers.</div>`;
  }
  if (!body) body = `<p class="muted">No comparable sales or deal history found for this name.</p>`;

  // Value anchors (the model's math) + the multipliers applied on top (synergy, TM).
  const multRows = []
    .concat(val.synergy_mult && val.synergy_mult !== 1
      ? [`<tr><td>SLD↔TLD synergy</td><td>×${val.synergy_mult}</td><td>—</td><td class="muted">${val.synergy_mult > 1 ? 'tight fit amplifies value' : 'loose fit discounts value'}</td></tr>`] : [])
    .concat(val.brandability && val.brandability.mult && val.brandability.mult !== 1
      ? [`<tr><td>Brandability</td><td>×${val.brandability.mult}</td><td>—</td><td class="muted">${escapeHtml(val.brandability.commonness || '')} word${val.brandability.zipf != null ? ` (zipf ${val.brandability.zipf})` : ''} — ${val.brandability.mult > 1 ? 'common/evocative, brands well' : 'obscure, brands weaker'}</td></tr>`] : [])
    .concat(val.trademark
      ? [`<tr><td>⚠ trademark</td><td>×${val.trademark.mult}</td><td>—</td><td class="muted">${escapeHtml(val.trademark.note)}</td></tr>`] : [])
    .concat(val.connotation && val.connotation.mult && val.connotation.mult !== 1
      ? [`<tr><td>Connotation / fit</td><td>×${val.connotation.mult}</td><td>—</td><td class="muted">${escapeHtml(val.connotation.breadth || '')}${val.connotation.tone && val.connotation.tone !== 'neutral' ? ` · ${escapeHtml(val.connotation.tone)}` : ''} — ${val.connotation.mult < 1 ? (val.connotation.breadth === 'narrow' ? 'narrow buyer pool' : 'unfavorable/limited fit') : 'broad, positive fit'}${val.connotation.best_fits && val.connotation.best_fits.length ? ` (best for ${val.connotation.best_fits.map(escapeHtml).join(', ')})` : ''}</td></tr>`] : []);
  const anchorRows = anchors.length
    ? `<details class="ev-anchors"><summary>How the fair value was built (${anchors.length} anchors${multRows.length ? ' + adjustments' : ''})</summary><table class="ev-table"><thead><tr><th>Source</th><th>Mid</th><th>Weight</th><th>Note</th></tr></thead><tbody>`
      + anchors.map((a) => `<tr><td>${escapeHtml(a.source)}</td><td>${evM(a.mid)}</td><td>${a.weight}</td><td class="muted">${escapeHtml(a.note || '')}</td></tr>`).join('')
      + multRows.join('')
      + `</tbody></table></details>`
    : '';

  return `<div class="ev-card"><h3 class="ev-h3">Comparable sales <span class="muted">— names that actually sold</span></h3>${rangeLine}${body}${anchorRows}</div>`;
}

// Appraise.net is an ASYNC job (a fresh name takes 10–60s) — too slow to block the
// eval on. So after the report renders we load it here in the BACKGROUND, polling
// the same api/lookup endpoint the Appraisal tool uses (which also caches the result
// per domain, so the next eval shows it instantly), then fill the card in place.
async function evLoadAppraise(domain) {
  const host = document.getElementById('ev-appr-appraise');
  if (!host || !domain) return;
  const setCard = (inner, sub) => {
    host.innerHTML = `<div class="ev-appr-src">Appraise.net</div>${inner}${sub ? `<div class="muted ev-appr-sub">${sub}</div>` : ''}`;
  };
  const show = (v) => {
    const rng = appraisalRange(v);
    if (rng) { setCard(`<div class="ev-appr-val" style="font-size:1.1rem">${escapeHtml(rng)}</div>`, 'Appraise.net AI estimate'); return true; }
    return false;
  };
  try {
    let res = await fetch(`/research/api/lookup?source=appraise_lookup&domain=${encodeURIComponent(domain)}`);
    let data = await res.json();
    if (!data || !data.ok) { setCard(`<div class="ev-appr-na">no estimate</div>`, 'Appraise.net unavailable'); return; }
    let d = data.data || {};
    if (d.appraisal != null && show(digAppraisal(d.appraisal))) return;
    let jobId = d.job_id;
    for (let i = 0; i < 25 && jobId; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      res = await fetch(`/research/api/lookup?source=appraise_lookup&job_id=${encodeURIComponent(jobId)}&domain=${encodeURIComponent(domain)}`);
      data = await res.json();
      if (data && data.ok === false) break;
      const st = (data && data.data) || {};
      const got = digAppraisal(st);
      if (((got && typeof got === 'object' && got !== st) || appraisalRange(got)) && show(got)) return;
      if (/fail|error|cancel/i.test(String(st.status || st.state || ''))) break;
      jobId = st.job_id || jobId;
    }
    if (!show(digAppraisal(d))) setCard(`<div class="ev-appr-na">no estimate</div>`, 'still computing — re-run shortly');
  } catch (e) { /* leave the card as-is */ }
}

// Prominent appraisals card (Appraise.net + Atom) — always shown so it's clear we
// pulled them; "no estimate" when a provider has nothing for this name.
function evAppraisals(data) {
  const ap = (data.evaluation && data.evaluation.signals && data.evaluation.signals.appraisals) || {};
  const a = ap.appraise;
  const atom = ap.atom;
  const card = (src, valHtml, sub, id) => `<div class="ev-appr-card"${id ? ` id="${id}"` : ''}><div class="ev-appr-src">${src}</div>${valHtml}${sub ? `<div class="muted ev-appr-sub">${sub}</div>` : ''}</div>`;
  const naSub = (note) => note ? escapeHtml(String(note).slice(0, 90)) : 'no value for this name';
  const apCard = a && a.mid > 0
    ? card('Appraise.net', `<div class="ev-appr-val">${evM(a.mid)}</div>`, a.low && a.high ? `range ${evM(a.low)}–${evM(a.high)}` : '', 'ev-appr-appraise')
    // Appraise.net is async + slow — the eval doesn't block on it. We load it in the
    // background after render (evLoadAppraise) and fill this card in place.
    : card('Appraise.net', `<div class="ev-appr-na">computing…</div>`, 'fetching Appraise.net estimate', 'ev-appr-appraise');
  const atomCard = atom && atom.value > 0
    ? card('Atom', `<div class="ev-appr-val">${evM(atom.value)}</div>`, `${atom.score != null ? `score ${atom.score}/10` : ''}${atom.tm_conflicts ? ` · ${atom.tm_conflicts} TM conflict(s)` : ''}`)
    : card('Atom', `<div class="ev-appr-na">no estimate</div>`, naSub(ap.atom_note));
  return `<div class="ev-card"><h3 class="ev-h3">Appraisals <span class="muted">— AI estimates (discounted to realizable in the value)</span></h3>`
    + `<div class="ev-appr-grid">${apCard}${atomCard}</div></div>`;
}

// The same WORD across other major extensions — active company / for sale / unused.
// Drives resale scarcity (a live .com locks up the word; a cheap-for-sale spread
// makes it a commodity).
function evTldLandscape(data) {
  const b = (data.evaluation && data.evaluation.buyers) || {};
  const land = b.tld_landscape || [];
  const sc = b.scarcity || {};
  if (!land.length) return '';
  const label = (st) => st === 'active' ? 'active company' : st === 'for_sale' ? 'for sale' : 'unused';
  const chips = land.map((t) => `<div class="ev-tld ev-tld-${escapeHtml(t.status)}"><span class="ev-tld-name">.${escapeHtml(t.tld)}</span><span class="ev-tld-status">${escapeHtml(label(t.status))}${t.company ? ` · ${escapeHtml(t.company)}` : ''}</span></div>`).join('');
  let read = '';
  if (sc.com_active) read = `The .com is an active company — the word is locked up on the premium extension, so this is a realistic way into the name (supports value).`;
  else if (sc.for_sale >= 3) read = `The word is for sale across several extensions — it reads more like a commodity, which caps resale value.`;
  else if (sc.active >= 2) read = `Multiple extensions are live companies — the term is in real commercial use (mild positive for demand).`;
  return `<div class="ev-card"><h3 class="ev-h3">The word across extensions <span class="muted">— resale scarcity</span></h3>`
    + `${read ? `<p class="ev-rationale">${escapeHtml(read)}</p>` : ''}<div class="ev-tldgrid">${chips}</div></div>`;
}

function evBuyers(data) {
  const b = (data.evaluation && data.evaluation.buyers) || {};
  const v = (data.evaluation && data.evaluation.verdict) || {};
  const angles = b.angles || [];
  const active = b.active_users || [];
  if (!angles.length && !active.length && !v.buyer_summary) return '';
  // A specific, bulleted read of WHO buys this — each angle = an industry / company
  // type, with example companies and (when verified) a real fundable headliner.
  const items = angles.map((a) => {
    const pot = a.buyer_potential || 'medium';
    const players = (a.players || []).map((p) => p.name).filter(Boolean).slice(0, 6);
    const ver = a.verified
      ? `<div class="ev-buyer-ver">✓ e.g. <strong>${escapeHtml(a.verified.name)}</strong>${a.verified.tier ? ` <span class="ev-tier ev-tier-${escapeHtml(a.verified.tier)}">${escapeHtml(a.verified.tier)} ability-to-pay</span>` : ''}${a.verified.funding ? ` · ${escapeHtml(a.verified.funding)}` : ''}</div>`
      : '';
    return `<li class="ev-buyer ev-pot-${escapeHtml(pot)}">
      <div class="ev-buyer-top">${a.product ? '🎯 ' : ''}<strong>${escapeHtml(a.label)}</strong> <span class="ev-pot-badge ev-pot-badge-${escapeHtml(pot)}">${escapeHtml(pot)} fit</span></div>
      ${a.concept ? `<div class="muted ev-buyer-concept">${escapeHtml(a.concept)}</div>` : ''}
      ${players.length ? `<div class="ev-buyer-players">${players.map((p) => `<span class="ev-chip">${escapeHtml(p)}</span>`).join('')}</div>` : ''}
      ${ver}
    </li>`;
  }).join('');
  const activeBlock = active.length
    ? `<div class="ev-active"><span class="ev-active-l">Already using the term:</span> ${active.slice(0, 10).map((u) => `<a href="https://${escapeHtml(u.domain)}" target="_blank" rel="noopener" class="ev-chip">${escapeHtml(u.domain)}</a>`).join('')}</div>` : '';
  return `<div class="ev-card"><h3 class="ev-h3">Who would buy it — companies &amp; industries that fit${b.fundable_buyer_count ? ` <span class="muted">· ${b.fundable_buyer_count} fundable verified</span>` : ''}</h3>
    ${v.buyer_summary ? `<p class="ev-rationale">${escapeHtml(v.buyer_summary)}</p>` : ''}
    ${items ? `<ul class="ev-buyers-list">${items}</ul>` : ''}
    ${activeBlock}</div>`;
}

function evContext(data) {
  const s = (data.evaluation && data.evaluation.signals) || {};
  const cu = s.current_use || {};
  const fs = s.for_sale || {};
  const reg = s.registration || {};
  const parked = cu.parking && cu.parking.likely_parked;
  const use = !cu.reachable ? 'No reachable website'
    : (parked ? `Parked / for-sale page${cu.parking.platforms && cu.parking.platforms.length ? ` (${escapeHtml(cu.parking.platforms.join(', '))})` : ''}`
      : `Live site — "${escapeHtml((cu.title || '').slice(0, 90))}"`);
  const forSale = fs.listed ? `Listed${fs.price ? ` at <strong>${evM(fs.price)}</strong>` : ''}${fs.platform ? ` on ${escapeHtml(fs.platform)}` : ''}` : 'Not listed on tracked marketplaces';
  // Appraisals now have their own block in the comps card — keep this card to the
  // domain's live state (use, listing, age).
  const rows = [
    ['Current use', use],
    ['For sale now', forSale],
    ['Registered', reg.created ? `${escapeHtml(reg.created)}${reg.age_years != null ? ` (~${reg.age_years}y)` : ''}${reg.registrar ? ` · ${escapeHtml(reg.registrar)}` : ''}` : 'unknown'],
  ];
  return `<details class="ev-card ev-collapse"><summary class="ev-h3">The domain today</summary><div class="ev-collapse-body"><table class="ev-kv">`
    + rows.map((r) => `<tr><td class="ev-kv-k">${escapeHtml(r[0])}</td><td class="ev-kv-v">${r[1]}</td></tr>`).join('')
    + `</table></div></details>`;
}

function evEvidence(data) {
  const s = (data.evaluation && data.evaluation.signals) || {};
  const np = s.namepros || [];
  const web = (s.web && s.web.term_search) || [];
  const emails = s.email_sweep || [];
  if (!np.length && !web.length && !emails.length) return '';
  const linkList = (items) => items.map((r) => `<li><a href="${escapeHtml(r.link)}" target="_blank" rel="noopener">${escapeHtml(r.title || r.link)}</a>${r.snippet ? `<span class="muted"> — ${escapeHtml(r.snippet.slice(0, 120))}</span>` : ''}</li>`).join('');
  let body = '';
  if (emails.length) body += `<div class="ev-ev-block"><h4 class="ev-comp-h">📬 Prior emails about this domain (${emails.length})</h4><ul class="ev-evlist">${emails.map((t) => `<li><strong>${escapeHtml(t.subject || '(no subject)')}</strong>${t.snippet ? `<span class="muted"> — ${escapeHtml(t.snippet.slice(0, 120))}</span>` : ''}</li>`).join('')}</ul></div>`;
  if (np.length) body += `<div class="ev-ev-block"><h4 class="ev-comp-h">NamePros (investor forum)</h4><ul class="ev-evlist">${linkList(np)}</ul></div>`;
  if (web.length) body += `<div class="ev-ev-block"><h4 class="ev-comp-h">Web — who's using "${escapeHtml(s.sld || '')}"</h4><ul class="ev-evlist">${linkList(web)}</ul></div>`;
  return `<details class="ev-card ev-evidence"><summary class="ev-h3">Evidence & chatter <span class="muted">— forum / web / inbox</span></summary>${body}</details>`;
}

function renderEvaluate(data) {
  if (!els.evResult) return;
  const ev = data.evaluation || {};
  // Always offer a re-run (fresh), whether the result was cached or fresh — a fresh
  // pass re-pulls every comp/appraisal (spends credits) and overwrites the cache.
  const stamp = data.cached
    ? `cached ${data.updated_at ? new Date(data.updated_at).toLocaleString() : ''}`
    : `fresh · ${ev.generated_at ? new Date(ev.generated_at).toLocaleString() : ''}`;
  const meta = `<span class="ev-meta">${stamp}</span>`
    + `<button type="button" id="ev-refresh-link" class="ev-rerun" title="Re-pull comps, appraisals & buyers (spends credits)">↻ Re-run fresh</button>`;
  els.evResult.innerHTML = `<div class="ev-report">
    ${evVerdictHeader(data)}
    <div class="ev-toolbar">${meta}</div>
    ${evReasons(data)}
    ${evAppraisals(data)}
    ${evComps(data)}
    ${evBandLadder(data)}
    ${evTldLandscape(data)}
    ${evBuyers(data)}
    ${evQuality(data)}
    ${evContext(data)}
    ${evEvidence(data)}
  </div>`;
  els.evResult.hidden = false;
  // Once a report is open, send the recent-searches list to the very bottom (below
  // the report), mirroring the other modules. resetEvaluateView() moves it back up.
  if (els.evRecent && els.evResult.parentNode) els.evResult.after(els.evRecent);
  const rl = document.getElementById('ev-refresh-link');
  if (rl) rl.addEventListener('click', (e) => { e.preventDefault(); runEvaluate(ev.domain, { price: evParsePrice(els.evPrice && els.evPrice.value), refresh: true }); });
  // Appraise.net loads async (decoupled) — only when the eval didn't already get it.
  const apr = ev.signals && ev.signals.appraisals && ev.signals.appraisals.appraise;
  if (ev.domain && !(apr && apr.mid > 0)) evLoadAppraise(ev.domain);
}

els.evForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = (els.evDomain.value || '').trim();
  const price = evParsePrice(els.evPrice && els.evPrice.value);
  if (!d) return;
  setToolUrl('evaluate', d);
  runEvaluate(d, { price });
});
// Re-grade instantly when the price changes on an already-loaded report (the
// server re-overlays the band from cache — no re-spend).
els.evPrice?.addEventListener('change', () => {
  const d = (els.evDomain && els.evDomain.value || '').trim();
  if (d && els.evResult && !els.evResult.hidden) runEvaluate(d, { price: evParsePrice(els.evPrice.value) });
});

// Deeplinks: open a report when the URL carries one, both on load and on
// in-app navigation (back button / pasted link).
// One router for both events — route() handles every hash shape (#/r/<slug>,
// #/lead/<key>) plus the path-routed tools and the entry fallback. (A prior
// hashchange-only handler didn't know about #/lead/ and fell through to
// showEntry(), so hitting Back from a report landed on the Research entry instead
// of the lead it came from.)
window.addEventListener('hashchange', route);
window.addEventListener('popstate', route);

(async () => {
  await checkAuth();
  // If a free report was auto-started from the URL (?domain=…), the research
  // view + "Researching…" timer are already up — don't run the default router,
  // which would showEntry() and hide it (the run hash isn't set yet).
  if (!autoRanFromUrl) routeAfterAuth();
})();
