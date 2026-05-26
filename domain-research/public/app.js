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
};

const POLL_MS = 2500;

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

function renderTrace(trace) {
  if (!trace || !trace.length) {
    els.evidence.hidden = true;
    return;
  }
  els.evidence.hidden = false;
  els.trace.innerHTML = trace
    .map((t) => {
      const dot = t.ok ? 'ok' : 'bad';
      const arg = t.args && t.args.domain ? ` ${t.args.domain}` : '';
      const err = t.ok ? '' : ` <span class="err">— ${(t.error || 'failed').replace(/</g, '&lt;')}</span>`;
      return `<li><span class="dot ${dot}"></span>${t.tool}${arg}${err}</li>`;
    })
    .join('');
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
    // If /api/me fails, show the app and let actions surface errors.
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

function renderReport(report) {
  const markdown = report && report.markdown ? report.markdown : '';
  els.report.hidden = false;
  els.report.innerHTML = renderMarkdown(markdown);
  renderTrace(report && report.trace);
}

let pollTimer = null;

async function run({ domain, question }) {
  els.go.disabled = true;
  els.report.hidden = true;
  els.evidence.hidden = true;
  setStatus(`Researching ${domain}… this can take a few minutes.`);
  if (pollTimer) clearInterval(pollTimer);

  try {
    const runId = await enqueue({ domain, question });

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
          setStatus(`Researching ${domain}… (${r.stage || r.status})`);
        }
      } catch (err) {
        clearInterval(pollTimer);
        setStatus(err.message || String(err), true);
        els.go.disabled = false;
      }
    }, POLL_MS);
  } catch (err) {
    setStatus(err.message || String(err), true);
    els.go.disabled = false;
  }
}

els.form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const domain = els.domain.value.trim();
  if (!domain) return;
  run({ domain, question: els.question.value.trim() });
});

checkAuth();
