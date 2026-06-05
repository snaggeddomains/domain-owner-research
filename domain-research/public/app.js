const $ = (id) => document.getElementById(id);

const els = {
  login: $('login'),
  // Sidebar prefs block (was the account block; email + sign-out moved to topbar).
  navAccount: $('nav-account'),
  navNotifyToggle: $('nav-notify-toggle'),
  // Umbrella topbar — Admin link is admin-only; account block carries the
  // signed-in email. Log out is a plain <a href="/api/logout"> — no JS handler.
  topbarAdmin: $('topbar-admin'),
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
  runControls: $('run-controls'),
  cancelRun: $('cancel-run'),
  marketStrip: $('market-strip'),
  namebioStrip: $('namebio-strip'),
  apNamebio: $('ap-namebio'),
  report: $('report'),
  reportDomain: $('report-domain'),
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
  reportFeedback: $('report-feedback'),
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
  namingGo: $('naming-go'),
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
  apRecent: $('ap-recent'),
  navDbscreen: $('nav-dbscreen'),
  navDbsearch: $('nav-dbsearch'),
  navNameserver: $('nav-nameserver'),
  navSales: $('nav-sales'),
  srForm: $('sr-form'), srDomain: $('sr-domain'), srGo: $('sr-go'), srStatus: $('sr-status'),
  srResults: $('sr-results'), srSummary: $('sr-summary'), srShowAll: $('sr-show-all'),
  srEnrich: $('sr-enrich'), srCsv: $('sr-csv'), srTable: $('sr-table'),
  srRecent: $('sr-recent'), srRecentList: $('sr-recent-list'), srRecentAll: $('sr-recent-all'),
  srProjectsSearch: $('sr-projects-search'), srProjectsList: $('sr-projects-list'),
  srEntry: $('sr-entry'), srReshead: $('sr-reshead'), srResheadSeed: $('sr-reshead-seed'), srNew: $('sr-new'),
  nsModeToggle: $('ns-modetoggle'), nsMatchToggle: $('ns-matchtoggle'),
  nsDomainForm: $('ns-domain-form'), nsDomain: $('ns-domain'),
  nsNsForm: $('ns-ns-form'), nsNs: $('ns-ns'), nsTld: $('ns-tld'),
  nsStatus: $('ns-status'), nsResult: $('ns-result'), nsRecent: $('ns-recent'),
  dsSearch: $('ds-search'), dsQ: $('ds-q'), dsGo: $('ds-go'),
  dsPriceMin: $('ds-price-min'), dsPriceMax: $('ds-price-max'),
  dsTlds: $('ds-tlds'),
  dsLenMin: $('ds-len-min'), dsLenMax: $('ds-len-max'),
  dsSingle: $('ds-single'), dsDict: $('ds-dict'),
  dsWordsMin: $('ds-words-min'), dsWordsMax: $('ds-words-max'),
  dsNonum: $('ds-nonum'), dsFuzzy: $('ds-fuzzy'),
  dsSource: $('ds-source'), dsOwner: $('ds-owner'), dsKeyword: $('ds-keyword'),
  dsApply: $('ds-apply'), dsReset: $('ds-reset'),
  dsDbToggle: $('ds-dbtoggle'), dsCount: $('ds-count'),
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
const TOOL_PATH = { tm: 'trademark', ap: 'appraisal' };
const TOOL_LABEL = { tm: 'trademark searches', ap: 'appraisals' };
// Per-tool history view state (collapsed recent-5 vs expanded searchable list).
const toolHistory = { tm: { all: [], expanded: false, q: '' }, ap: { all: [], expanded: false, q: '' } };

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

// Deeplink helpers — reports live at a readable slug ending in the run id:
//   #/r/<sld>-<tld>-<DD>-<MM>-<YYYY>-<runId>
function buildSlug(run) {
  const d = String(run.domain || '').toLowerCase().replace(/[^a-z0-9.-]/g, '');
  const parts = d.split('.').filter(Boolean);
  const tld = parts.length > 1 ? parts.pop() : '';
  const sld = (parts.join('-') || d).replace(/[^a-z0-9-]/g, '');
  const t = run.created_at ? new Date(run.created_at) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${pad(t.getUTCDate())}-${pad(t.getUTCMonth() + 1)}-${t.getUTCFullYear()}`;
  return `${[sld, tld, date].filter(Boolean).join('-')}-${run.id}`;
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
  let m = location.pathname.match(/^\/research\/(trademark|appraisal|naming|dbscreen|dbsearch|nameserver|sales|admin)(?:\/(.+?))?\/?$/);
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
};
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
    else { els.apResult.hidden = true; els.apResult.innerHTML = ''; els.apDomain.value = ''; setToolStatus(els.apStatus, ''); }
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
  if (tr && tr.tool === 'admin') {
    // Lessons curation (the admin.lessons.approve module). HIDE it from users
    // who lack the permission — fall through to the entry view rather than
    // render the Lessons page and then show a "no access" notice on it.
    if (!canAdminLessons(currentUser)) { history.replaceState(null, '', '/research'); showEntry(); return; }
    showView('admin');
    return;
  }
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
  category: new Set(), connotation: new Set(), industry: new Set(), emotion: new Set(),
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

// A collapsible checkbox dropdown backed by a Set in dsState[key]. Selections
// apply on the existing "Apply filters" button (no live re-query).
function dsMultiSelect(key, prefix, withFilter) {
  const $id = (s) => document.getElementById(s);
  const list = $id(`ds-${prefix}-list`), count = $id(`ds-${prefix}-count`),
        label = $id(`ds-${prefix}-label`), filter = withFilter ? $id(`ds-${prefix}-filter`) : null;
  const set = dsState[key];
  let allOpts = [];
  const summary = () => {
    const n = set.size;
    count.textContent = n ? String(n) : '';
    label.textContent = n === 0 ? 'Any' : (n === 1 ? [...set][0] : `${n} selected`);
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
  dsMulti.category.setOptions(DS_CATEGORIES);
  dsMulti.connotation.setOptions(DS_CONNOTATIONS);
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
  if (els.dsNonum && els.dsNonum.checked) p.set('no_numbers', '1');
  if (els.dsFuzzy && els.dsFuzzy.checked) p.set('fuzzy', '1');
  if (v(els.dsSource)) p.set('source', v(els.dsSource));
  if (dsState.category.size) p.set('category', [...dsState.category].join(','));
  if (dsState.industry.size) p.set('industry', [...dsState.industry].join(','));
  if (dsState.emotion.size) p.set('emotion', [...dsState.emotion].join(','));
  if (dsState.connotation.size) p.set('connotation', [...dsState.connotation].join(','));
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

function dsRenderRows(rows) {
  if (!rows.length) {
    els.dsTbody.innerHTML = '<tr><td colspan="4" class="muted" style="padding:18px">No domains match these filters.</td></tr>';
    return;
  }
  els.dsTbody.innerHTML = rows.map((r) => {
    const src = (r.best_price_source || (Array.isArray(r.sources) && r.sources[0]) || '');
    return `<tr>` +
      `<td class="dbs-domain">${escapeHtml(r.domain || '')}</td>` +
      `<td class="dbs-num">${dsPrice(r.best_price)}</td>` +
      `<td>${src ? `<span class="dbs-src">${escapeHtml(src)}</span>` : '<span class="muted">—</span>'}</td>` +
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

function setStatus(text, isError = false) {
  if (!text) {
    els.status.hidden = true;
    return;
  }
  els.status.hidden = false;
  els.status.textContent = text;
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
      .replace(/(?<![">])(https?:\/\/[^\s<)]*[^\s<).,;:!?])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

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
  } else {
    els.reportDomain.hidden = true;
    els.reportDomain.textContent = '';
  }
}
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
  const typeLabel = phase === 'deep' ? 'Deep research' : phase === 'shallow' ? 'Free report' : 'Report';
  const when = new Date(createdAt).toLocaleString();
  // Offer to re-run the deep pass when it's the one that didn't finish; otherwise
  // refresh matches whatever phase we have.
  const refreshDeep = (phase === 'deep' || deepIncomplete) ? 'true' : 'false';
  els.reportMeta.hidden = false;
  const warn = deepIncomplete
    ? `<span class="rm-incomplete">⚠ Deep research did not complete — showing the free pre-flight report only</span> · `
    : '';
  els.reportMeta.innerHTML =
    warn +
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
  return `<div class="chat-msg ${cls}${pending ? ' pending' : ''}${err ? ' chat-err' : ''}"${idAttr}>${body}${saveLink}</div>`;
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
}
async function sendChat(message) {
  if (chatBusy || !message || !currentRunId) return;
  chatBusy = true;
  if (els.chatSend) els.chatSend.disabled = true;
  const thread = els.chatThread;
  thread.insertAdjacentHTML('beforeend', `<div class="chat-msg me">${renderMarkdown(message)}</div>`);
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
    // Group into the primary target vs. other (secondary/tertiary/untagged)
    // leads when the report tags tiers; otherwise show grouped per-entity cards.
    if (contacts.some(isPrimary)) {
      const primary = contacts.filter(isPrimary);
      const other = contacts.filter((c) => !isPrimary(c));
      html += `<div class="sum-block"><h3>Primary target — how to reach the likely owner</h3>${card(primary)}</div>`;
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
      if (els.topbarAdmin) els.topbarAdmin.hidden = !canEnterAdmin(u);
      if (els.navAccount) els.navAccount.hidden = false;
      renderProfile(u);
      startNotifPolling();
      gateNavByPermissions(u);
      gateReportPhaseUI(u);
      maybeAutoRunFromUrl();
    } else {
      if (els.topbarAccount) els.topbarAccount.hidden = true;
      if (els.topbarAdmin) els.topbarAdmin.hidden = true;
      if (els.navAccount) els.navAccount.hidden = true;
    }
  } catch {
    els.login.hidden = true;
    els.app.hidden = false;
    if (els.topbarAccount) els.topbarAccount.hidden = true;
    if (els.topbarAdmin) els.topbarAdmin.hidden = true;
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
  if (!user) return false;
  if (user.is_admin) return true;
  const perms = user.permissions || {};
  // The umbrella `admin` grant is full access (all tabs), so it covers lessons too.
  if (perms.admin === true) return true;
  return perms['admin.lessons.approve'] === true || perms['research.admin.lessons.approve'] === true;
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
  if (els.navSales) els.navSales.hidden = !can('sales');
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
    startPolling(currentRunId, mode === 'deep' ? 'Regenerating (deep)' : 'Regenerating');
  } catch (e) {
    setRegenStatus(`⚠️ ${e.message || e}`, true);
  } finally {
    regenInFlight = false;
    // Re-enable after a short delay so the status message stays readable.
    setTimeout(() => setRegenButtonsDisabled(false), 1500);
  }
}

let regenInFlight = false;
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

function startPolling(runId, label) {
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
        setReportMeta(r.created_at, r.report && r.report.phase);
        els.go.disabled = false;
        // The report-done notification is created server-side at this exact
        // moment (same step as the email) — refresh the bell now instead of
        // waiting up to a full poll interval.
        if (typeof loadNotifications === 'function') loadNotifications();
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
const MARKET_V = 5;

function quickLinks(domain) {
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
  // DomainScout carries the domain in the hash AND copies it to the clipboard on
  // click, so the "Add to DomainScout" bookmarklet can pick it up and submit it
  // into your (logged-in) watchlist — the server can't, it has no session there.
  const ds =
    `<a class="ms-link ms-ds" data-ds-domain="${escapeHtml(domain)}" ` +
    `href="${dsUrl(domain)}" target="domainscout">DomainScout ↗</a>`;
  return main + ds;
}

// DomainScout dashboard with the domain in the hash — the userscript/bookmarklet
// reads #snagged=<domain> and submits it to the "Track any domains" form.
function dsUrl(domain) {
  return `https://www.domainscout.io/dashboard#snagged=${encodeURIComponent(domain)}`;
}

// Opt-in: open (or reuse) the DomainScout tab for a domain. The named target
// means repeat opens reuse one tab rather than spawning many.
function openDomainScout(domain) {
  if (!domain) return;
  window.open(dsUrl(domain), 'domainscout');
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

function marketPaint(domain, pills, metaInner) {
  els.marketStrip.innerHTML =
    `<div class="ms-row"><span class="ms-label">For sale:</span>${pills}${metaInner}</div>` +
    `<div class="ms-row ms-quick"><span class="ms-label">Open:</span>${quickLinks(domain)}</div>`;
}

// Render a complete result at once — misses stay as red ✗.
function renderMarketStrip(domain, channels, ts) {
  const norm = mirrorGoDaddyFromAfternic(channels);
  const byCh = new Map(norm.map((c) => [c.channel, c]));
  const ordered = MARKET_CHANNELS.filter((ch) => byCh.has(ch)).map((ch) => byCh.get(ch));
  for (const c of norm) if (!MARKET_CHANNELS.includes(c.channel)) ordered.push(c);
  marketPaint(domain, ordered.map(channelPill).join(''), ts ? metaHtml(ts) : '');
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
  const rows = sales.slice(0, 10).map((s) =>
    `<li><span class="nb-price">${fmt(s.price)}</span>`
    + `<span class="nb-date">${escapeHtml(s.date || '')}</span>`
    + `<span class="nb-venue">${escapeHtml(s.venue || '')}</span></li>`).join('');
  el.innerHTML = `<div class="nb-head"><span class="nb-badge">NameBio</span> Previous sales (${sales.length})</div>`
    + `<ul class="nb-list">${rows}</ul>`;
  el.hidden = false;
}

async function runMarketStrip(domain, { force = false } = {}) {
  if (!els.marketStrip || !domain) return;
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
        renderMarketStrip(domain, cached.data.channels || [], cached.ts);
        return;
      }
    }
    await streamMarketStrip(domain);
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
  if (els.reportChat) { els.reportChat.hidden = true; chatLoadedFor = null; }
  els.evidence.hidden = true;
  els.deepenTop.hidden = true;
  els.deepenBar.hidden = true;
  if (els.marketStrip) els.marketStrip.hidden = true;
  if (els.runControls) els.runControls.hidden = true;
}

async function run({ domain, deep, force }) {
  enterResultMode(domain);
  // First action: check the marketplaces in parallel with the free LLM pass.
  runMarketStrip(domain);
  setStatus(deep
    ? `Researching ${domain} (deep, paid sources)… this can take a few minutes.`
    : `Researching ${domain}… this can take a few minutes.`);
  try {
    const data = await enqueue({ domain, deep, force });
    // Server returned a cached completed run — open it directly instead of
    // re-running. Shows "Researched X ago · Refresh" so the user can re-run
    // on demand if the cached data is stale.
    if (data.existing) {
      const r = await pollRun(data.run_id);
      applyHash({ id: data.run_id, domain: r.domain, created_at: r.created_at });
      setStatus('');
      if (r.domain) setReportTitle(r.domain);
      renderReport(r.report);
      setReportMeta(r.created_at, r.report && r.report.phase);
      currentRunId = data.run_id;
      els.go.disabled = false;
      return;
    }
    const runId = data.run_id;
    applyHash({ id: runId, domain, created_at: new Date().toISOString() });
    startPolling(runId, deep ? `Researching ${domain} (deep)` : `Researching ${domain}`);
  } catch (err) {
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
      // Still running. If a free (shallow) report was already saved (e.g. a deep
      // pass is now in progress), keep it on screen instead of a blank page.
      if (r.report) {
        renderReport(r.report);
        els.deepenTop.hidden = true;
        els.deepenBar.hidden = true; // a pass is already running
        if (els.reportFeedback) els.reportFeedback.hidden = true; // it'll be replaced by the deep report
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
  sales: { view: 'view-sales', nav: 'nav-sales' },
  'sales-projects': { view: 'view-sales-projects', nav: 'nav-sales' },
  admin: { view: 'view-admin', nav: 'nav-admin' },
};
function showView(name) {
  for (const [k, v] of Object.entries(VIEWS)) {
    const view = document.getElementById(v.view);
    if (view) view.hidden = k !== name;
    const nav = document.getElementById(v.nav);
    if (nav) nav.classList.toggle('active', k === name);
  }
  if (name === 'projects') loadProjects(els.projectsSearch.value.trim());
  if (name === 'admin') loadLessons();
  // All modules use the full content width on desktop (matching the Naming
  // Exercise) so the space isn't wasted by a narrow centered column.
  const wrap = document.querySelector('.content > .wrap');
  if (wrap) wrap.classList.add('wrap--wide');
}

// ── Standalone tools (Trademark, Appraisal) ─────────────────────────────────
function setToolStatus(el, text, err = false) {
  if (!text) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = text;
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
function digAppraisal(o) {
  if (!o || typeof o !== 'object') return o;
  if (o.valuation) return o.valuation;
  if (Array.isArray(o.results) && o.results[0]) return o.results[0].valuation || o.results[0];
  return o.appraisal || o.result || o;
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
  const lo = a.low_value ?? a.low ?? a.min_value ?? a.valueLow ?? a.priceLow;
  const hi = a.high_value ?? a.high ?? a.max_value ?? a.valueHigh ?? a.priceHigh;
  if (lo != null || hi != null) return [fmtMoney(lo), fmtMoney(hi)].filter(Boolean).join(' – ');
  const v = pickr(a, ['estimated_value', 'estimatedValue', 'value', 'valuation', 'price', 'fair_market_value', 'fairMarketValue', 'marketValue', 'appraisedValue', 'estimate']);
  return v ? fmtMoney(v) : '';
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
    return `<div class="ap-block ap-definition"><h3>Definition${phonetic}</h3>${senses}</div>`;
  })();
  const raw = escapeHtml(JSON.stringify(a, null, 2).slice(0, 4000));
  // "Last appraised <ago> · Refresh" line — lets the user see freshness and
  // re-run a paid appraisal when the cached one is stale.
  const updatedAt = meta && meta.updatedAt;
  const metaRow = updatedAt
    ? `<div class="ap-meta">Appraised ${escapeHtml(agoLabel(updatedAt))} · <button type="button" class="ap-refresh" data-refresh="${escapeHtml(domain)}">Refresh</button></div>`
    : '';
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
      const st = (data && data.data) || {};
      const statusStr = String(st.status || st.state || '');
      const v = digAppraisal(st);
      const ready = (v && v !== st) || appraisalRange(v) || /complete|done|success|finished/i.test(statusStr);
      if (ready) {
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
  const force = !!(opts && opts.force);
  els.apResult.hidden = true;
  els.apResult.innerHTML = '';
  setToolStatus(els.apStatus, force ? `Re-appraising ${domain}…` : `Appraising ${domain}…`);
  try {
    const qs = `source=appraise_lookup&domain=${encodeURIComponent(domain)}${force ? '&force=1' : ''}`;
    const res = await fetch(`/research/api/lookup?${qs}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || `Failed (${res.status})`);
    const d = data.data || {};
    if (d.appraisal) finishAppraisal(domain, digAppraisal(d.appraisal), d.definition);
    else if (d.job_id) await pollAppraisal(domain, d.job_id);
    else finishAppraisal(domain, digAppraisal(d), d.definition);
  } catch (e) {
    setToolStatus(els.apStatus, e.message || String(e), true);
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
        const active = r.status === 'running';
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
  if (els.reportChat) { els.reportChat.hidden = true; chatLoadedFor = null; }
  els.deepenTop.hidden = true;
  els.deepenBar.hidden = true;
  if (els.marketStrip) els.marketStrip.hidden = true;
  els.evidence.hidden = true;
  currentRunId = null;
  els.domain.value = '';
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
  if (!lessonModalContext) return;
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
        source_run_id: lessonModalContext.runId,
        source_chat_message_id: lessonModalContext.messageId,
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

async function runNaming() {
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

function setNamingStatus(text) {
  if (!els.namingStatus) return;
  if (!text) { els.namingStatus.hidden = true; els.namingStatus.textContent = ''; return; }
  els.namingStatus.textContent = text;
  els.namingStatus.hidden = false;
}

function renderNamingResults(data) {
  renderNamingFilters(data.filters);
  const buy = Array.isArray(data.buyReady) ? data.buyReady : [];
  const stretch = Array.isArray(data.stretch) ? data.stretch : [];
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
function applyLiveStatuses(statuses) {
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
    const price = r.best_price == null ? 'TBD' : `$${Number(r.best_price).toLocaleString()}`;
    const priceClass = r.best_price == null ? 'naming-card-price is-tbd' : 'naming-card-price';
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
              `<span class="naming-card-forsale">For sale</span>` +
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
  const rows = [...(data.buyReady || []), ...(data.stretch || [])];
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
els.form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const domain = els.domain.value.trim();
  if (!domain) return;
  // Choose phase against the user's permissions. The checkbox is the user's
  // explicit ask; otherwise default to shallow. When the user has ONLY deep
  // (admin disabled free reports), force deep so the server doesn't 403 them.
  let deep = !!(els.deepToggle && els.deepToggle.checked);
  if (!deep && !canPhase(currentUser, 'shallow') && canPhase(currentUser, 'deep')) deep = true;
  run({ domain, deep });
});

els.deepenBtn?.addEventListener('click', deepen);
els.deepenTopBtn?.addEventListener('click', deepen);
els.cancelRun?.addEventListener('click', cancelRun);
els.exportPdf?.addEventListener('click', () => window.print());

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
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && els.outreachDrawer && !els.outreachDrawer.hidden) closeOutreach();
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
els.homeLink?.addEventListener('click', (e) => { e.preventDefault(); closeNav(); showEntry(); });
els.navTrademark?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('trademark', ''); route(); });
els.navAppraisal?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('appraisal', ''); route(); });
els.navDbscreen?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('dbscreen', ''); route(); });
els.navDbsearch?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('dbsearch', ''); route(); });
els.dbForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = (els.dbDomain.value || '').trim();
  if (!d) return;
  setToolUrl('dbscreen', d);
  runDbScreen(d);
});

// ── Nameserver Search ───────────────────────────────────────────────────────
// Domain → its NS; NS set → domains (AND/OR); domain → siblings on the same
// pairing; + an LLM "which siblings are related" pass. Server: /api/nameserver.
const nsState = { mode: 'domain', match: 'all' };

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
function nsExportPairingCsv() {
  const rows = nsState.csvRows || [];
  if (!rows.length) return;
  nsDownloadCsv(`pairing-${nsState.seed || 'domains'}.csv`, ['domain', 'tld', 'nameservers'],
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
  setToolStatus(els.nsStatus, 'Looking up…');
  if (els.nsResult) els.nsResult.hidden = true;
  try {
    const data = await nsFetch(`mode=domain&domain=${encodeURIComponent(domain)}`);
    setToolStatus(els.nsStatus, '');
    if (data.found) nsRecentAdd(data.domain);
    if (!data.found) {
      els.nsResult.innerHTML = `<div class="ns-card"><p>Couldn’t find nameservers for <strong>${escapeHtml(data.domain)}</strong> — not in our index and no live DNS/WHOIS record.</p></div>`;
    } else {
      const nsList = (data.nameservers || []).map((n) => `<code>${escapeHtml(n)}</code>`).join(' ');
      const liveNote = data.source === 'live'
        ? `<p class="muted ns-livenote">Not in our zone index — nameservers resolved live; pairing matches against the TLDs we’ve loaded.</p>`
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

async function runNsPairing(domain) {
  const sub = document.getElementById('ns-sub');
  if (sub) sub.innerHTML = '<div class="ns-running">⏳ Finding siblings on the same nameserver set…</div>';
  try {
    const data = await nsFetch(`mode=pairing&domain=${encodeURIComponent(domain)}`);
    if (!sub) return;
    if (data.generic) {
      sub.innerHTML = `<p class="ns-pairnote muted">⚠ ${escapeHtml(data.genericNote || 'Generic/parking nameservers — shared by huge numbers of unrelated domains, so this pairing is not an ownership signal.')} Skipping the lookup.</p>`;
      return;
    }
    const more = data.hasMore ? ' <span class="muted">(first page — many matches; likely a shared host)</span>' : '';
    const head = `<h3>${data.count}${data.hasMore ? '+' : ''} other domain${data.count === 1 ? '' : 's'} on this exact pairing${more}</h3>`;
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

async function runNsList() {
  showView('nameserver');
  const raw = (els.nsNs && els.nsNs.value || '').trim();
  if (!raw) return;
  setToolStatus(els.nsStatus, 'Searching…');
  if (els.nsResult) els.nsResult.hidden = true;
  try {
    const tld = (els.nsTld && els.nsTld.value || '').trim();
    const params = `mode=ns&ns=${encodeURIComponent(raw)}&match=${nsState.match}${tld ? `&tld=${encodeURIComponent(tld)}` : ''}`;
    const data = await nsFetch(params);
    setToolStatus(els.nsStatus, '');
    const more = data.hasMore ? ' <span class="muted">(showing first page)</span>' : '';
    const head = `Domains using ${nsState.match === 'all' ? 'ALL' : 'ANY'} of: ${(data.nameservers || []).map((n) => `<code>${escapeHtml(n)}</code>`).join(' ')}`;
    els.nsResult.innerHTML = `<div class="ns-card"><p class="ns-nsrow">${head}</p><h3>${data.count} domain${data.count === 1 ? '' : 's'}${more}</h3>${nsRowsHtml(data.rows)}</div>`;
    els.nsResult.hidden = false;
  } catch (e) {
    setToolStatus(els.nsStatus, String((e && e.message) || e), true);
  }
}

els.navNameserver?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('nameserver', ''); route(); });
els.navSales?.addEventListener('click', (e) => { if (newTabClick(e)) return; e.preventDefault(); setToolUrl('sales', ''); route(); });

// ── Sales Research ───────────────────────────────────────────────────────────
let salesProjectId = null;
let salesPollTimer = null;
let salesCandidates = [];          // cached for render + CSV
let salesSeed = '';
const salesCollapsed = new Set();  // candidate ids whose contacts are collapsed

function setSalesStatus(msg, isErr = false) {
  if (!els.srStatus) return;
  els.srStatus.hidden = !msg;
  els.srStatus.textContent = msg || '';
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
  salesProjectId = null; salesCandidates = []; salesSeed = '';
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

els.srForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const domain = (els.srDomain.value || '').trim().toLowerCase();
  if (!domain) return;
  els.srGo.disabled = true;
  setSalesStatus('Starting discovery…');
  if (els.srResults) els.srResults.hidden = true;
  setSalesMode('results', domain);   // collapse the hero/form right away
  try {
    const res = await fetch('/research/api/sales', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'create', domain }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    setToolUrl('sales', data.project_id);
    openSalesProject(data.project_id);
  } catch (err) {
    setSalesStatus(String(err.message || err), true);
    els.srGo.disabled = false;
  }
});

function openSalesProject(id) {
  clearSalesPoll();
  salesProjectId = id;
  els.srGo.disabled = true;
  setSalesMode('results', '');   // collapse entry; seed filled in once the poll returns it
  setSalesStatus('Discovering candidates and qualifying ability-to-pay…');
  const poll = async () => {
    try {
      const res = await fetch(`/research/api/sales?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Poll failed (${res.status})`);
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
      clearSalesPoll();
      els.srGo.disabled = false;
      setSalesStatus(String(err.message || err), true);
    }
  };
  poll();
  salesPollTimer = setInterval(poll, 2500);
}

function salesVisible() {
  const showAll = els.srShowAll && els.srShowAll.checked;
  return salesCandidates.filter((c) => showAll || c.status === 'active');
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
  const rows = salesVisible();
  const active = salesCandidates.filter((c) => c.status === 'active').length;
  const strong = salesCandidates.filter((c) => c.tier === 'strong').length;
  if (els.srSummary) {
    els.srSummary.innerHTML = `${salesCandidates.length} companies · ${active} active · <strong class="sr-sum-strong">${strong} strong-fit</strong>`;
  }
  if (!rows.length) { els.srTable.innerHTML = '<p class="muted">No candidates to show.</p>'; updateSalesEnrichBtn(); return; }
  const tierBadge = (t) => `<span class="sr-tier sr-tier-${t || 'unknown'}">${escapeHtml(t || '—')}</span>`;
  const statusBadge = (s) => `<span class="sr-st sr-st-${s || 'unknown'}">${escapeHtml(s || '—')}</span>`;
  // Structured ability-to-pay metrics — same labelled cells, same order on every
  // card, so values line up down the list and compare at a glance.
  const monthsAgo = (d) => { if (!d) return null; const t = new Date(d); return isNaN(t) ? null : Math.round((Date.now() - t) / (1000 * 60 * 60 * 24 * 30.44)); };
  const relRaise = (d) => { const m = monthsAgo(d); if (m == null) return ''; if (m < 1) return 'this month'; if (m < 12) return `~${m}mo ago`; const y = m / 12; return `~${y % 1 ? y.toFixed(1) : y.toFixed(0)}y ago`; };
  const growthPct = (g) => (g == null || !isFinite(g)) ? '' : `${g >= 0 ? '+' : ''}${Math.round(g * 100)}%`;
  const M = (k, v, cls = '') => { const blank = v == null || v === ''; return `<div class="sr-m"><div class="sr-m-k">${k}</div><div class="sr-m-v${blank ? ' sr-m-dim' : (cls ? ' ' + cls : '')}">${blank ? '—' : escapeHtml(String(v))}</div></div>`; };
  const metricsGrid = (c) => {
    const f = c.firmographics || {};
    const emp = f.employees != null ? f.employees : c.employee_count;
    const ma = monthsAgo(f.latestFundingDate);
    const cash = (ma != null && ma <= 24 && (f.fundingAmount || f.funding)) ? 'Likely' : '';
    const g = f.headcountGrowth && f.headcountGrowth.twelveMo;
    return `<div class="sr-metrics">
      ${M('Raised', f.funding || c.funding || '', (f.funding || c.funding) ? 'sr-m-raise' : '')}
      ${M('Stage', f.fundingStage || '')}
      ${M('Last raise', relRaise(f.latestFundingDate))}
      ${M('Rounds', f.fundingRounds != null ? f.fundingRounds : '')}
      ${M('Cash on hand', cash, cash ? 'sr-m-pos' : '')}
      ${M('Revenue', f.revenue || '')}
      ${M('Employees', emp != null ? emp : '')}
      ${M('Growth 12mo', growthPct(g), (g != null && g > 0) ? 'sr-m-pos' : '')}
      ${M('Founded', f.foundedYear || '')}
    </div>`;
  };
  const subLine = (c) => {
    const f = c.firmographics || {};
    const s = [c.location || f.location || '', f.industry || ''].filter(Boolean).join(' · ');
    return s ? `<div class="sr-card-sub">${escapeHtml(s)}</div>` : '';
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
    if (c.enrich_status === 'pending') return '<div class="sr-contacts-note muted">Enriching contacts…</div>';
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
  const body = rows.map((c) => {
    const coLi = (c.firmographics && c.firmographics.linkedin) || '';
    return `
    <div class="sr-card sr-card-${escapeHtml(c.tier || 'unknown')}" data-id="${escapeHtml(c.id)}">
      <div class="sr-card-head">
        <label class="sr-card-check"><input type="checkbox" class="sr-cb" data-id="${escapeHtml(c.id)}"></label>
        <div class="sr-card-id">
          <div class="sr-card-name">${escapeHtml(c.company || '—')}</div>
          <div class="sr-card-links">
            <a class="sr-card-domain" href="https://${escapeHtml(c.domain)}" target="_blank" rel="noopener">${escapeHtml(c.domain)}</a>
            ${coLi ? `<a class="sr-card-li" href="${escapeHtml(coLi)}" target="_blank" rel="noopener" title="Company LinkedIn" aria-label="Company LinkedIn">in</a>` : ''}
          </div>
        </div>
        <div class="sr-card-badges">${statusBadge(c.status)}${tierBadge(c.tier)}</div>
      </div>
      ${metricsGrid(c)}
      ${subLine(c)}
      ${contactsBlock(c)}
    </div>`;
  }).join('');
  els.srTable.innerHTML = `<div class="sr-cards">${body}</div>`;
  els.srTable.querySelectorAll('.sr-cb').forEach((cb) => cb.addEventListener('change', updateSalesEnrichBtn));
  updateSalesEnrichBtn();
}

function selectedCandidateIds() {
  return [...els.srTable.querySelectorAll('.sr-cb:checked')].map((cb) => cb.dataset.id);
}
function updateSalesEnrichBtn() {
  if (els.srEnrich) els.srEnrich.disabled = selectedCandidateIds().length === 0;
}

els.srShowAll?.addEventListener('change', renderSalesTable);

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
  if (!salesCandidates.length) return;
  const cell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const header = ['Company', 'Domain', 'Status', 'Ability to pay', 'Employees', 'Funding', 'Location', 'Why', 'Contact name', 'Title', 'Email', 'Phone', 'LinkedIn'];
  let csv = header.map(cell).join(',') + '\n';
  for (const c of salesVisible()) {
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
els.nsDomainForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = (els.nsDomain.value || '').trim();
  if (!d) return;
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
els.dsApply?.addEventListener('click', () => { dsState.page = 0; fetchDbSearch(); });
els.dsReset?.addEventListener('click', () => {
  [els.dsQ, els.dsPriceMin, els.dsPriceMax, els.dsLenMin, els.dsLenMax, els.dsWordsMin, els.dsWordsMax,
   els.dsSource, els.dsOwner, els.dsKeyword].forEach((el) => { if (el) el.value = ''; });
  if (els.dsSingle) els.dsSingle.value = '';
  if (els.dsDict) els.dsDict.value = '';
  if (els.dsNonum) els.dsNonum.checked = false;
  if (els.dsFuzzy) els.dsFuzzy.checked = false;
  ['category', 'connotation', 'industry', 'emotion'].forEach((k) => dsMulti[k] && dsMulti[k].clear());
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
els.tmForm?.addEventListener('submit', (e) => { e.preventDefault(); const q = els.tmQuery.value.trim(); if (q) runTrademark(q); });
els.apForm?.addEventListener('submit', (e) => { e.preventDefault(); const v = els.apDomain.value.trim(); if (v) runAppraisal(v); });
els.namingGo?.addEventListener('click', runNaming);
els.namingApply?.addEventListener('click', runNaming);

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

// Deeplinks: open a report when the URL carries one, both on load and on
// in-app navigation (back button / pasted link).
window.addEventListener('hashchange', () => {
  if (currentToolRoute()) return; // tools are path-routed, not hash-routed
  const id = runIdFromHash();
  if (id) openProject(id);
  else showEntry();
});
window.addEventListener('popstate', route);

(async () => {
  await checkAuth();
  // If a free report was auto-started from the URL (?domain=…), the research
  // view + "Researching…" timer are already up — don't run the default router,
  // which would showEntry() and hide it (the run hash isn't set yet).
  if (!autoRanFromUrl) routeAfterAuth();
})();
