#!/bin/bash
# SessionStart hook for domain-owner-research.
# Prevents concurrent Claude Code sessions from stomping each other's work
# and surfaces the project's CLAUDE.md as the source of truth.
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || true

# ── 1. Git divergence check ────────────────────────────────────────────────
if [ -d .git ] && command -v git >/dev/null 2>&1; then
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [ -n "$branch" ] && [ "$branch" != "HEAD" ]; then
    echo "▸ git fetch origin (checking for divergence on '$branch')…"
    if git fetch --quiet origin 2>/dev/null; then
      if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
        ahead=$(git rev-list --count "origin/$branch..HEAD" 2>/dev/null || echo 0)
        behind=$(git rev-list --count "HEAD..origin/$branch" 2>/dev/null || echo 0)
        if [ "$behind" -gt 0 ]; then
          echo ""
          echo "⚠️  WARNING: Your local '$branch' is $behind commit(s) BEHIND origin/$branch."
          echo "    Another session has pushed work you don't have. Before making changes:"
          echo "      git log --oneline HEAD..origin/$branch"
          echo "    READ those commits, or you will duplicate or conflict with them."
          echo ""
        fi
        if [ "$ahead" -gt 0 ]; then
          echo "▸ Local '$branch' is $ahead unpushed commit(s) ahead of origin."
        fi
        if [ "$ahead" = "0" ] && [ "$behind" = "0" ]; then
          echo "▸ Local '$branch' is in sync with origin/$branch."
        fi
      else
        echo "▸ Branch '$branch' has no upstream on origin yet."
      fi

      # Also flag if main has moved beyond your feature branch.
      if [ "$branch" != "main" ] && git show-ref --verify --quiet refs/remotes/origin/main; then
        behind_main=$(git rev-list --count "HEAD..origin/main" 2>/dev/null || echo 0)
        if [ "$behind_main" -gt 0 ]; then
          echo "▸ Note: origin/main is $behind_main commit(s) ahead of '$branch' (consider rebasing)."
        fi
      fi
    else
      echo "▸ git fetch failed (offline or restricted); skipping divergence check."
    fi
  fi
fi

# ── 2. Surface CLAUDE.md ───────────────────────────────────────────────────
if [ -f CLAUDE.md ]; then
  echo ""
  echo "📄 CLAUDE.md exists at repo root — READ IT FIRST."
  echo "   It documents project state, branch policy, and where to look."
  echo ""
fi

# ── 3. Install dependencies for the app subfolder ──────────────────────────
if [ -f domain-research/package.json ]; then
  echo "▸ Installing dependencies in domain-research/ …"
  ( cd domain-research && npm install --no-audit --no-fund --silent ) \
    && echo "  ✓ npm install done" \
    || echo "  ⚠ npm install failed (check connectivity / package.json)"
fi

# ── 3b. Activate repo git hooks (pre-push import-resolution gate) ──────────
if [ -d .githooks ] && command -v git >/dev/null 2>&1; then
  git config core.hooksPath .githooks 2>/dev/null \
    && echo "▸ git hooks: core.hooksPath → .githooks (pre-push import check active)"
fi

# ── 4. Headless-browser tooling for GUI verification ───────────────────────
# A Chromium is pre-installed in this environment; expose its path and install
# the Playwright/jsdom npm drivers (skipping the browser DOWNLOAD, which the
# network policy blocks — we launch the pre-installed binary via $PW_CHROME).
# Lets Claude render the SPA + screenshot it to catch GUI regressions pre-push.
PW_CHROME="$(find /opt/pw-browsers -name chrome -path '*chrome-linux*' 2>/dev/null | head -1)"
TOOLS="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/tools"
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  [ -n "$PW_CHROME" ] && echo "export PW_CHROME=\"$PW_CHROME\"" >> "$CLAUDE_ENV_FILE"
  echo "export NODE_PATH=\"$TOOLS/node_modules\"" >> "$CLAUDE_ENV_FILE"
fi
if command -v npm >/dev/null 2>&1 && [ ! -d "$TOOLS/node_modules/playwright" ]; then
  mkdir -p "$TOOLS"
  cat > "$TOOLS/package.json" <<'JSON'
{ "name": "claude-gui-tools", "private": true, "dependencies": { "jsdom": "^25.0.0", "playwright": "^1.48.0" } }
JSON
  echo "▸ Installing GUI verification tools (playwright + jsdom)…"
  ( cd "$TOOLS" && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund --silent ) \
    && echo "  ✓ GUI tools ready (Chromium: ${PW_CHROME:-NOT FOUND})" \
    || echo "  ⚠ GUI tools install failed"
fi

echo "▸ Session start hook complete."
