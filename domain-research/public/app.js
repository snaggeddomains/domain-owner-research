const $ = (id) => document.getElementById(id);

const els = {
  login: $('login'),
  loginForm: $('login-form'),
  password: $('password'),
  loginError: $('login-error'),
  app: $('app'),
  form: $('search'),
  domain: $('domain'),
  go: $('go'),
  deepToggle: $('deep-toggle'),
  status: $('status'),
  runControls: $('run-controls'),
  cancelRun: $('cancel-run'),
  report: $('report'),
  reportDomain: $('report-domain'),
  reportConfidence: $('report-confidence'),
  reportActions: $('report-actions'),
  exportPdf: $('export-pdf'),
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
  evidence: $('evidence'),
  trace: $('trace'),
  hero: $('hero'),
  navResearch: $('nav-research'),
  showAll: $('show-all'),
  viewResearch: $('view-research'),
  viewProjects: $('view-projects'),
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
    const res = await fetch(`/api/tool-history?kind=${kind}&limit=${limit}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (!Array.isArray(d.lookups)) return null;
    return d.lookups.map((r) => ({ key: r.query, ts: r.updated_at ? Date.parse(r.updated_at) : Date.now() }));
  } catch { return null; }
}
async function serverGetTool(kind, query) {
  try {
    const res = await fetch(`/api/tool-history?kind=${kind}&query=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const d = await res.json();
    return d.found ? d.data : null;
  } catch { return null; }
}
function serverSaveTool(kind, key, data) {
  try {
    fetch('/api/tool-history', {
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

function clearTimers() {
  if (pollTimer) clearInterval(pollTimer);
  if (clockTimer) clearInterval(clockTimer);
  pollTimer = null;
  clockTimer = null;
}

function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

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

// The standalone tools are PATH-routed (research stays hash-routed at "/"):
//   /trademark           /trademark/<query>
//   /appraisal           /appraisal/<domain>
function currentToolRoute() {
  const m = location.pathname.match(/^\/(trademark|appraisal)(?:\/(.+?))?\/?$/);
  if (!m) return null;
  return { tool: m[1], slug: m[2] ? decodeURIComponent(m[2]) : '' };
}
function setToolUrl(tool, slug) {
  const path = slug ? `/${tool}/${encodeURIComponent(slug)}` : `/${tool}`;
  if (location.pathname !== path) history.pushState(null, '', path);
}

// Single entry point for "where are we" — used after auth and on back/forward.
function route() {
  if (els.app.hidden) return;
  const tr = currentToolRoute();
  if (tr && tr.tool === 'trademark') {
    showView('trademark');
    refreshToolRecent(els.tmRecent, 'tm');
    if (tr.slug) openToolSlug('tm', tr.slug);
    else { els.tmResults.innerHTML = ''; els.tmQuery.value = ''; setToolStatus(els.tmStatus, ''); }
    return;
  }
  if (tr && tr.tool === 'appraisal') {
    showView('appraisal');
    refreshToolRecent(els.apRecent, 'ap');
    if (tr.slug) openToolSlug('ap', tr.slug);
    else { els.apResult.hidden = true; els.apResult.innerHTML = ''; els.apDomain.value = ''; setToolStatus(els.apStatus, ''); }
    return;
  }
  const id = runIdFromHash();
  if (id) openProject(id);
  else showEntry();
}
function routeAfterAuth() {
  route();
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
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

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
    await fetch('/api/feedback', {
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
function renderChatMessages(messages) {
  if (!els.chatThread) return;
  els.chatThread.innerHTML = (messages || [])
    .map((m) => `<div class="chat-msg ${m.role === 'assistant' ? 'bot' : 'me'}">${renderMarkdown(String(m.content || ''))}</div>`)
    .join('');
  els.chatThread.scrollTop = els.chatThread.scrollHeight;
}
async function loadChat(runId) {
  if (!els.reportChat) return;
  renderChatMessages([]);
  if (!runId) return;
  try {
    const res = await fetch(`/api/chat?run_id=${encodeURIComponent(runId)}`);
    const data = await res.json();
    renderChatMessages(data.messages || []);
  } catch { /* empty thread */ }
}
async function sendChat(message) {
  if (chatBusy || !message || !currentRunId) return;
  chatBusy = true;
  if (els.chatSend) els.chatSend.disabled = true;
  // Optimistically append the user message + a thinking placeholder.
  const thread = els.chatThread;
  thread.insertAdjacentHTML('beforeend', `<div class="chat-msg me">${renderMarkdown(message)}</div>`);
  thread.insertAdjacentHTML('beforeend', `<div class="chat-msg bot pending">Looking into it…</div>`);
  thread.scrollTop = thread.scrollHeight;
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ run_id: currentRunId, domain: currentReportDomain, message }),
    });
    const raw = await res.text();
    let reply = '';
    let errMsg = '';
    try {
      const d = JSON.parse(raw);
      if (res.ok) reply = d.reply || '';
      else errMsg = d.error || `Request failed (${res.status}).`;
    } catch {
      // Non-JSON body — usually a Vercel timeout/error page.
      errMsg = res.status === 504 || res.status === 502
        ? 'That follow-up took too long or hit an error — try a narrower, more specific question.'
        : `Request failed (${res.status}).`;
    }
    const pending = thread.querySelector('.chat-msg.pending');
    if (pending) {
      pending.classList.remove('pending');
      pending.innerHTML = renderMarkdown(reply || `⚠️ ${errMsg || 'No response.'}`);
    }
  } catch (e) {
    const pending = thread.querySelector('.chat-msg.pending');
    if (pending) { pending.classList.remove('pending'); pending.textContent = String(e.message || e); }
  } finally {
    chatBusy = false;
    if (els.chatSend) els.chatSend.disabled = false;
    thread.scrollTop = thread.scrollHeight;
  }
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
  const linkify = (c) => {
    const v = String(c.value == null ? '' : c.value);
    if (c.type === 'email') return `<a href="mailto:${e(v)}">${e(v)}</a>`;
    if (c.type === 'social' || /^https?:\/\//.test(v)) return `<a href="${e(v)}" target="_blank" rel="noopener">${e(v)}</a>`;
    return e(v);
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
      const val = isUsefulClue(c) ? `<span class="clue">${linkify(c)}</span>` : linkify(c);
      return `<li><span class="ctype">${e(c.type || '')}</span> ${val}${c.note ? ` <span class="muted">— ${e(c.note)}</span>` : ''}${msgLinks(c)}</li>`;
    };
    const list = (arr) => `<ul class="contacts">${arr.map(contactLi).join('')}</ul>`;
    const isPrimary = (c) => String((c && c.tier) || '').toLowerCase() === 'primary';
    // Consolidated contact card for the primary target: name as a heading, org
    // beneath, then the email/phone/profile rows — one easy-to-consume block.
    const card = (arr) => {
      const order = { name: 0, org: 1, email: 2, phone: 3, social: 4 };
      const sorted = arr.slice().sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
      const nameC = sorted.find((c) => c.type === 'name');
      const orgC = sorted.find((c) => c.type === 'org');
      const rest = sorted.filter((c) => c !== nameC && c !== orgC);
      const emails = arr.filter((c) => c.type === 'email' && c.value).map((c) => String(c.value).trim());
      let h = '<div class="contact-card">';
      if (nameC) h += `<div class="cc-name">${isUsefulClue(nameC) ? `<span class="clue">${e(nameC.value)}</span>` : e(nameC.value)}</div>`;
      if (orgC) h += `<div class="cc-org">${linkify(orgC)}${orgC.note ? ` <span class="muted">— ${e(orgC.note)}</span>` : ''}</div>`;
      if (emails.length) h += `<div class="cc-actions"><button type="button" class="copy-emails" data-emails="${e(emails.join(', '))}">Copy ${emails.length === 1 ? 'email' : `all ${emails.length} emails`}</button></div>`;
      if (rest.length) h += list(rest);
      return h + '</div>';
    };
    // Group into the primary target vs. other (secondary/tertiary/untagged)
    // leads when the report tags tiers; otherwise show one flat list.
    if (contacts.some(isPrimary)) {
      const primary = contacts.filter(isPrimary);
      const other = contacts.filter((c) => !isPrimary(c));
      html += `<div class="sum-block"><h3>Primary target — how to reach the likely owner</h3>${card(primary)}</div>`;
      if (other.length) html += `<div class="sum-block"><h3>Other &amp; historical leads</h3>${list(other)}</div>`;
    } else {
      html += `<div class="sum-block"><h3>Key contacts</h3>${list(contacts)}</div>`;
    }
  }
  const path = Array.isArray(d.contact_path) ? d.contact_path : [];
  if (path.length) {
    html += `<div class="sum-block"><h3>Recommended contact path</h3><ol class="cpath">${path.map((p) => `<li>${e(p)}</li>`).join('')}</ol></div>`;
  }
  const tl = Array.isArray(d.timeline) ? d.timeline : [];
  if (tl.length) {
    html += `<div class="sum-block"><h3>Ownership timeline</h3><ul class="timeline">${tl
      .map((t) => `<li><span class="tl-date">${e(t.date || '')}</span><span class="tl-event">${e(t.event || '')}${t.detail ? ` — ${e(t.detail)}` : ''}</span></li>`)
      .join('')}</ul></div>`;
  }
  return html ? `<div class="summary-card">${html}</div>` : '';
}

function renderReport(report) {
  const md = report && report.markdown ? report.markdown : '';
  const data = parseReportData(md);
  const band = data && data.confidence ? String(data.confidence).toLowerCase() : extractConfidence(md);
  renderConfidence(band);
  els.reportActions.hidden = false;

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
  const shallow = report && report.phase === 'shallow';
  const low = shallow && (band === 'low' || (!band && looksLowConfidence(md)));
  els.deepenTop.hidden = !low;
  els.deepenBar.hidden = !(shallow && !low);
}

// ── Auth ────────────────────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    const locked = data.gateEnabled && !data.authed;
    els.login.hidden = !locked;
    els.app.hidden = locked;
  } catch {
    els.login.hidden = true;
    els.app.hidden = false;
  }
}

els.loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.loginError.hidden = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: els.password.value }),
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

// ── Research (async: enqueue → poll) ────────────────────────────────────────
async function enqueue({ domain, deep }) {
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain, deep: !!deep }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data.run_id;
}

async function pollRun(runId) {
  const res = await fetch(`/api/research?id=${encodeURIComponent(runId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Poll failed (${res.status})`);
  return data;
}

function startPolling(runId, label) {
  currentRunId = runId;
  els.go.disabled = true;
  if (els.runControls) els.runControls.hidden = false;
  clearTimers();

  // Live elapsed clock, ticking once a second; the poll updates the stage label.
  const startedAt = Date.now();
  let stage = '';
  const tick = () => setStatus(`${label}…${stage ? ` (${stage})` : ''} · ${fmtElapsed(Date.now() - startedAt)}`);
  tick();
  clockTimer = setInterval(tick, 1000);

  pollTimer = setInterval(async () => {
    try {
      const r = await pollRun(runId);
      applyHash({ id: runId, domain: r.domain, created_at: r.created_at });
      if (r.status === 'done') {
        clearTimers();
        setStatus('');
        if (els.runControls) els.runControls.hidden = true;
        if (r.domain) setReportTitle(r.domain);
        renderReport(r.report);
        els.go.disabled = false;
      } else if (r.status === 'error') {
        clearTimers();
        setStatus(r.error || 'The run failed.', true);
        if (els.runControls) els.runControls.hidden = true;
        els.go.disabled = false;
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

// Switch the research view into "showing a result": hide the entry hero and
// reveal the standalone report area headed by the domain name.
function enterResultMode(domain) {
  showView('research');
  els.hero.hidden = true;
  setReportTitle(domain);
  els.reportConfidence.hidden = true;
  els.reportActions.hidden = true;
  els.report.hidden = true;
  if (els.reportFeedback) els.reportFeedback.hidden = true;
  if (els.reportChat) { els.reportChat.hidden = true; chatLoadedFor = null; }
  els.evidence.hidden = true;
  els.deepenTop.hidden = true;
  els.deepenBar.hidden = true;
  if (els.runControls) els.runControls.hidden = true;
}

async function run({ domain, deep }) {
  enterResultMode(domain);
  setStatus(deep
    ? `Researching ${domain} (deep, paid sources)… this can take a few minutes.`
    : `Researching ${domain}… this can take a few minutes.`);
  try {
    const runId = await enqueue({ domain, deep });
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
    const res = await fetch('/api/research', {
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
  clearTimers();
  els.go.disabled = false;
  if (els.runControls) els.runControls.hidden = true;
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
    const res = await fetch(`/api/research?list=1&q=${encodeURIComponent(q)}`);
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
    if (r.status === 'done') {
      setStatus('');
      renderReport(r.report);
    } else if (r.status === 'error') {
      setStatus(r.error || 'This run failed.', true);
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
};
function showView(name) {
  for (const [k, v] of Object.entries(VIEWS)) {
    const view = document.getElementById(v.view);
    if (view) view.hidden = k !== name;
    const nav = document.getElementById(v.nav);
    if (nav) nav.classList.toggle('active', k === name);
  }
  if (name === 'projects') loadProjects(els.projectsSearch.value.trim());
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
    else apPick(hit.key, hit.data);
    return;
  }
  const statusEl = kind === 'tm' ? els.tmStatus : els.apStatus;
  setToolStatus(statusEl, 'Loading…');
  const saved = await serverGetTool(kind, slug);
  setToolStatus(statusEl, '');
  if (saved) {
    saveRecentLocal(kind, slug, saved);
    if (kind === 'tm') tmPick(slug, saved);
    else apPick(slug, saved);
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
    if (!tmStatusInfo(o.status).active) continue;
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
    const res = await fetch(`/api/lookup?source=trademark_search&query=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || `Failed (${res.status})`);
    const items = (data.data && data.data.trademarks) || [];
    showTrademarks(q, items, isAi);
    saveRecent('tm', q, { items, isAi });
    refreshToolRecent(els.tmRecent, 'tm');
  } catch (e) {
    setToolStatus(els.tmStatus, e.message || String(e), true);
  }
}

// ── Appraisal tool ──
const apPick = (key, cached) => { setToolUrl('appraisal', key); els.apDomain.value = key; setToolStatus(els.apStatus, ''); renderAppraisal(key, cached); };
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
function renderAppraisal(domain, a) {
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
  const raw = escapeHtml(JSON.stringify(a, null, 2).slice(0, 4000));
  els.apResult.hidden = false;
  els.apResult.innerHTML =
    `<div class="tool-title">${escapeHtml(domain)}</div>` +
    (rows || '<div class="muted">No value fields recognized — see the raw appraisal below.</div>') +
    (analysis ? `<div class="ap-block"><h3>Market analysis</h3><p>${escapeHtml(analysis)}</p></div>` : '') +
    block(a.strengths || a.pros, 'Why it scored well') +
    block(a.weaknesses || a.cons || a.knocks, 'Main knocks') +
    (catStr ? `<div class="ap-field"><span>Categories</span> ${catStr}</div>` : '') +
    `<details class="src-detail"><summary>full appraisal</summary><pre>${raw}</pre></details>`;
}
function finishAppraisal(domain, a) {
  setToolUrl('appraisal', domain);
  setToolStatus(els.apStatus, '');
  renderAppraisal(domain, a);
  saveRecent('ap', domain, a);
  refreshToolRecent(els.apRecent, 'ap');
}
async function pollAppraisal(domain, jobId) {
  const started = Date.now();
  for (let i = 0; i < 40; i++) {
    setToolStatus(els.apStatus, `Appraising ${domain}… (${Math.round((Date.now() - started) / 1000)}s)`);
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await fetch(`/api/lookup?source=appraise_lookup&job_id=${encodeURIComponent(jobId)}`);
      const data = await res.json();
      const st = (data && data.data) || {};
      const statusStr = String(st.status || st.state || '');
      const v = digAppraisal(st);
      const ready = (v && v !== st) || appraisalRange(v) || /complete|done|success|finished/i.test(statusStr);
      if (ready) {
        finishAppraisal(domain, v);
        return;
      }
      if (/fail|error|cancel/i.test(statusStr)) { setToolStatus(els.apStatus, `Appraisal ${statusStr}.`, true); return; }
    } catch (e) { /* keep polling */ }
  }
  setToolStatus(els.apStatus, 'Still processing — try again shortly.', true);
}
async function runAppraisal(domainInput) {
  const domain = String(domainInput || '').trim();
  els.apResult.hidden = true;
  els.apResult.innerHTML = '';
  setToolStatus(els.apStatus, `Appraising ${domain}…`);
  try {
    const res = await fetch(`/api/lookup?source=appraise_lookup&domain=${encodeURIComponent(domain)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || `Failed (${res.status})`);
    const d = data.data || {};
    if (d.appraisal) finishAppraisal(domain, digAppraisal(d.appraisal));
    else if (d.job_id) await pollAppraisal(domain, d.job_id);
    else finishAppraisal(domain, digAppraisal(d));
  } catch (e) {
    setToolStatus(els.apStatus, e.message || String(e), true);
  }
}

// Last few runs, shown under the search bar on the homepage.
async function loadRecent() {
  if (!els.recent) return;
  try {
    const res = await fetch('/api/research?list=1');
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
  if (location.pathname !== '/') history.pushState(null, '', '/');
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
  els.evidence.hidden = true;
  currentRunId = null;
  els.domain.value = '';
  loadRecent();
}

// ── Wiring ──────────────────────────────────────────────────────────────────
els.form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const domain = els.domain.value.trim();
  if (!domain) return;
  run({ domain, deep: !!(els.deepToggle && els.deepToggle.checked) });
});

els.deepenBtn?.addEventListener('click', deepen);
els.deepenTopBtn?.addEventListener('click', deepen);
els.cancelRun?.addEventListener('click', cancelRun);
els.exportPdf?.addEventListener('click', () => window.print());
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
els.rfYes?.addEventListener('click', () => submitFeedback({ was_correct: true }));
els.rfNo?.addEventListener('click', () => { if (els.rfCorrection) els.rfCorrection.hidden = false; });
els.chatForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = els.chatInput ? els.chatInput.value.trim() : '';
  if (!msg) return;
  els.chatInput.value = '';
  sendChat(msg);
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

els.navResearch?.addEventListener('click', showEntry);
els.homeLink?.addEventListener('click', (e) => { e.preventDefault(); closeNav(); showEntry(); });
els.navTrademark?.addEventListener('click', () => { setToolUrl('trademark', ''); route(); });
els.navAppraisal?.addEventListener('click', () => { setToolUrl('appraisal', ''); route(); });
els.navNaming?.addEventListener('click', () => { if (location.pathname !== '/') history.pushState(null, '', '/'); showView('naming'); });
els.tmForm?.addEventListener('submit', (e) => { e.preventDefault(); const q = els.tmQuery.value.trim(); if (q) runTrademark(q); });
els.apForm?.addEventListener('submit', (e) => { e.preventDefault(); const v = els.apDomain.value.trim(); if (v) runAppraisal(v); });
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
  routeAfterAuth();
})();
