const $ = (id) => document.getElementById(id);

const els = {
  login: $('login'),
  loginForm: $('login-form'),
  password: $('password'),
  loginError: $('login-error'),
  app: $('app'),
  form: $('search'),
  domain: $('domain'),
  question: $('question'),
  go: $('go'),
  status: $('status'),
  report: $('report'),
  evidence: $('evidence'),
  trace: $('trace'),
  navResearch: $('nav-research'),
  navProjects: $('nav-projects'),
  viewResearch: $('view-research'),
  viewProjects: $('view-projects'),
  deepenBar: $('deepen-bar'),
  deepenBtn: $('deepen'),
  projectsSearch: $('projects-search'),
  projectsList: $('projects-list'),
};

const POLL_MS = 2500;
let pollTimer = null;
let currentRunId = null;

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

// Show every source: the ones that ran (status + what came back) and the ones
// that were available but the assistant chose not to call.
function renderTrace(trace, toolsAvailable) {
  const called = trace || [];
  const available = toolsAvailable || [];
  if (!called.length && !available.length) {
    els.evidence.hidden = true;
    return;
  }
  els.evidence.hidden = false;

  const byTool = {};
  for (const t of called) (byTool[t.tool] = byTool[t.tool] || []).push(t);
  const names = [...new Set([...available, ...Object.keys(byTool)])];

  els.trace.innerHTML = names
    .map((name) => {
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
    })
    .join('');
}

function renderReport(report) {
  els.report.hidden = false;
  els.report.innerHTML = renderMarkdown(report && report.markdown ? report.markdown : '');
  renderTrace(report && report.trace, report && report.toolsAvailable);
  // A deep (paid) pass is only offered after a shallow (free) pre-flight.
  els.deepenBar.hidden = !(report && report.phase === 'shallow');
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
  } catch (err) {
    els.loginError.textContent = String(err.message || err);
    els.loginError.hidden = false;
  }
});

// ── Research (async: enqueue → poll) ────────────────────────────────────────
async function enqueue({ domain, question }) {
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain, question }),
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
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const r = await pollRun(runId);
      if (r.status === 'done') {
        clearInterval(pollTimer);
        setStatus('');
        renderReport(r.report);
        els.go.disabled = false;
      } else if (r.status === 'error') {
        clearInterval(pollTimer);
        setStatus(r.error || 'The run failed.', true);
        els.go.disabled = false;
      } else {
        setStatus(`${label}… (${r.stage || r.status})`);
      }
    } catch (err) {
      clearInterval(pollTimer);
      setStatus(err.message || String(err), true);
      els.go.disabled = false;
    }
  }, POLL_MS);
}

async function run({ domain, question }) {
  showView('research');
  els.report.hidden = true;
  els.evidence.hidden = true;
  els.deepenBar.hidden = true;
  setStatus(`Researching ${domain}… this can take a few minutes.`);
  try {
    const runId = await enqueue({ domain, question });
    startPolling(runId, `Researching ${domain}`);
  } catch (err) {
    setStatus(err.message || String(err), true);
    els.go.disabled = false;
  }
}

async function deepen() {
  if (!currentRunId) return;
  els.deepenBar.hidden = true;
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

// ── Projects ────────────────────────────────────────────────────────────────
async function loadProjects(q = '') {
  els.projectsList.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const res = await fetch(`/api/research?list=1&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
    const runs = data.runs || [];
    if (!runs.length) {
      els.projectsList.innerHTML = '<li class="muted">No runs yet.</li>';
      return;
    }
    els.projectsList.innerHTML = runs
      .map((r) => {
        const when = r.created_at ? new Date(r.created_at).toLocaleString() : '';
        return `<li class="project" data-id="${escapeHtml(r.id)}">
            <span class="project-domain">${escapeHtml(r.domain || '(unknown)')}</span>
            <span class="project-meta">${escapeHtml(r.status || '')} · ${escapeHtml(when)}</span>
          </li>`;
      })
      .join('');
  } catch (err) {
    els.projectsList.innerHTML = `<li class="err">${escapeHtml(err.message || String(err))}</li>`;
  }
}

async function openProject(id) {
  showView('research');
  els.report.hidden = true;
  els.evidence.hidden = true;
  els.deepenBar.hidden = true;
  setStatus('Loading…');
  try {
    const r = await pollRun(id);
    currentRunId = id;
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

function showView(name) {
  const isProjects = name === 'projects';
  els.viewResearch.hidden = isProjects;
  els.viewProjects.hidden = !isProjects;
  els.navResearch.classList.toggle('active', !isProjects);
  els.navProjects.classList.toggle('active', isProjects);
  if (isProjects) loadProjects(els.projectsSearch.value.trim());
}

// ── Wiring ──────────────────────────────────────────────────────────────────
els.form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const domain = els.domain.value.trim();
  if (!domain) return;
  run({ domain, question: els.question.value.trim() });
});

els.deepenBtn?.addEventListener('click', deepen);
els.navResearch?.addEventListener('click', () => showView('research'));
els.navProjects?.addEventListener('click', () => showView('projects'));

let searchTimer = null;
els.projectsSearch?.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadProjects(els.projectsSearch.value.trim()), 300);
});

els.projectsList?.addEventListener('click', (e) => {
  const li = e.target.closest('.project');
  if (li && li.dataset.id) openProject(li.dataset.id);
});

checkAuth();
