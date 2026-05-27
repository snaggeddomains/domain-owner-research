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
  status: $('status'),
  report: $('report'),
  reportDomain: $('report-domain'),
  reportConfidence: $('report-confidence'),
  reportActions: $('report-actions'),
  exportPdf: $('export-pdf'),
  evidence: $('evidence'),
  trace: $('trace'),
  hero: $('hero'),
  navResearch: $('nav-research'),
  navProjects: $('nav-projects'),
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
  tmForm: $('tm-form'),
  tmQuery: $('tm-query'),
  tmStatus: $('tm-status'),
  tmResults: $('tm-results'),
  apForm: $('ap-form'),
  apDomain: $('ap-domain'),
  apStatus: $('ap-status'),
  apResult: $('ap-result'),
};

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
function routeAfterAuth() {
  if (els.app.hidden) return;
  const id = runIdFromHash();
  if (id) openProject(id);
  else loadRecent();
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
function setReportTitle(domain) {
  if (domain) {
    els.reportDomain.hidden = false;
    els.reportDomain.textContent = `Domain Ownership Report — ${domain}`;
  } else {
    els.reportDomain.hidden = true;
    els.reportDomain.textContent = '';
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
    html += `<div class="owner">${d.likely_owner ? `<span class="owner-name">${e(d.likely_owner)}</span>` : '<span class="muted">Owner not established</span>'}${t}</div>`;
  }
  const contacts = Array.isArray(d.contacts) ? d.contacts : [];
  if (contacts.length) {
    html += `<div class="sum-block"><h3>Key contacts</h3><ul class="contacts">${contacts
      .map((c) => `<li><span class="ctype">${e(c.type || '')}</span> ${linkify(c)}${c.note ? ` <span class="muted">— ${e(c.note)}</span>` : ''}</li>`)
      .join('')}</ul></div>`;
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
async function enqueue({ domain }) {
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain }),
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
        if (r.domain) setReportTitle(r.domain);
        renderReport(r.report);
        els.go.disabled = false;
      } else if (r.status === 'error') {
        clearTimers();
        setStatus(r.error || 'The run failed.', true);
        els.go.disabled = false;
      } else {
        stage = r.stage || r.status; // rendered by the clock tick
      }
    } catch (err) {
      clearTimers();
      setStatus(err.message || String(err), true);
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
  els.evidence.hidden = true;
  els.deepenTop.hidden = true;
  els.deepenBar.hidden = true;
}

async function run({ domain }) {
  enterResultMode(domain);
  setStatus(`Researching ${domain}… this can take a few minutes.`);
  try {
    const runId = await enqueue({ domain });
    applyHash({ id: runId, domain, created_at: new Date().toISOString() });
    startPolling(runId, `Researching ${domain}`);
  } catch (err) {
    setStatus(err.message || String(err), true);
    els.go.disabled = false;
  }
}

async function deepen() {
  if (!currentRunId) return;
  els.deepenTop.hidden = true;
  els.deepenBar.hidden = true;
  els.reportConfidence.hidden = true;
  els.reportActions.hidden = true;
  els.report.hidden = true;
  els.evidence.hidden = true;
  setStatus('Going deeper (paid sources)… this can take a few minutes.');
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

async function runTrademark(q) {
  els.tmResults.innerHTML = '';
  setToolStatus(els.tmStatus, `Searching trademarks for "${q}"…`);
  try {
    const res = await fetch(`/api/lookup?source=trademark_search&query=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || `Failed (${res.status})`);
    const items = (data.data && data.data.trademarks) || [];
    setToolStatus(els.tmStatus, items.length ? '' : 'No trademarks found.');
    els.tmResults.innerHTML = items
      .map((o) => {
        const mark = escapeHtml(pick(o, ['mark', 'markText', 'wordmark', 'text', 'name', 'title']) || '(mark)');
        const owner = escapeHtml(pick(o, ['owner', 'applicant', 'ownerName', 'owner_name', 'holder', 'applicantName']));
        const status = escapeHtml(pick(o, ['status', 'statusType', 'markStatus']));
        const filed = escapeHtml(pick(o, ['filingDate', 'filing_date', 'applicationDate', 'dateFiled', 'filed']));
        const reg = escapeHtml(pick(o, ['registrationDate', 'registration_date', 'dateRegistered']));
        const office = escapeHtml(String(pick(o, ['office']) || '').toUpperCase());
        const meta = [owner && `Owner: ${owner}`, status && `Status: ${status}`, filed && `Filed: ${filed}`, reg && `Reg: ${reg}`, office]
          .filter(Boolean)
          .join(' · ');
        const raw = escapeHtml(JSON.stringify(o, null, 2).slice(0, 1800));
        return `<li class="tool-item"><div class="tool-title">${mark}</div>${meta ? `<div class="tool-meta">${meta}</div>` : ''}<details class="src-detail"><summary>raw</summary><pre>${raw}</pre></details></li>`;
      })
      .join('');
  } catch (e) {
    setToolStatus(els.tmStatus, e.message || String(e), true);
  }
}

async function runAppraisal(domain) {
  els.apResult.hidden = true;
  els.apResult.innerHTML = '';
  setToolStatus(els.apStatus, `Appraising ${domain}… (a new appraisal can take a few seconds)`);
  try {
    const res = await fetch(`/api/lookup?source=appraise_lookup&domain=${encodeURIComponent(domain)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || `Failed (${res.status})`);
    const d = data.data || {};
    const a = d.appraisal || d;
    const value = pick(a, ['estimated_value', 'value', 'appraisal_value', 'price', 'estimate', 'valuation', 'fair_market_value']);
    setToolStatus(els.apStatus, '');
    els.apResult.hidden = false;
    const head = value
      ? `<div class="ap-value">${escapeHtml(String(value))}</div>`
      : '<div class="muted">No headline value field found — see the full appraisal below.</div>';
    const note = d.status === 'pending' ? `<div class="muted">${escapeHtml(d.note || 'Still processing.')}</div>` : '';
    const raw = escapeHtml(JSON.stringify(a, null, 2).slice(0, 4000));
    els.apResult.innerHTML = `<div class="tool-title">${escapeHtml(domain)}</div>${head}${note}<details class="src-detail"><summary>full appraisal</summary><pre>${raw}</pre></details>`;
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
  clearHash();
  showView('research');
  els.hero.hidden = false;
  setReportTitle(null);
  els.reportConfidence.hidden = true;
  els.reportActions.hidden = true;
  els.status.hidden = true;
  els.report.hidden = true;
  els.deepenTop.hidden = true;
  els.deepenBar.hidden = true;
  els.evidence.hidden = true;
  currentRunId = null;
  els.domain.value = '';
  loadRecent();
  els.domain.focus();
}

// ── Wiring ──────────────────────────────────────────────────────────────────
els.form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const domain = els.domain.value.trim();
  if (!domain) return;
  run({ domain });
});

els.deepenBtn?.addEventListener('click', deepen);
els.deepenTopBtn?.addEventListener('click', deepen);
els.exportPdf?.addEventListener('click', () => window.print());
els.navResearch?.addEventListener('click', showEntry);
els.homeLink?.addEventListener('click', (e) => { e.preventDefault(); showEntry(); });
els.navTrademark?.addEventListener('click', () => showView('trademark'));
els.navAppraisal?.addEventListener('click', () => showView('appraisal'));
els.tmForm?.addEventListener('submit', (e) => { e.preventDefault(); const q = els.tmQuery.value.trim(); if (q) runTrademark(q); });
els.apForm?.addEventListener('submit', (e) => { e.preventDefault(); const v = els.apDomain.value.trim(); if (v) runAppraisal(v); });
els.navProjects?.addEventListener('click', () => showView('projects'));

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
  const id = runIdFromHash();
  if (id) openProject(id);
  else showEntry();
});

(async () => {
  await checkAuth();
  routeAfterAuth();
})();
