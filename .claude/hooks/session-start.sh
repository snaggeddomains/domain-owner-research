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

echo "▸ Session start hook complete."
