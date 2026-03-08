#!/usr/bin/env bash
set -euo pipefail

cleanup_on_error() {
  say ""
  say "⚠️  ship-safe aborted due to an error."
  if command_exists git && in_repo_root; then
    say "Tip: check changes with: git status"
    say "Tip: revert working tree with: git restore ."
  fi
  say "If this happened during installs: re-run with INSTALL_DEPS=1 or fix the failing tool."
}
trap cleanup_on_error ERR

# "Ship safe" runner (template-friendly, fail-fast)
# - Detects common stacks and runs checks if present
# - Does NOT swallow errors
# - Optional dependency install via INSTALL_DEPS=1
#
# Usage:
#   bash scripts/ship-safe.sh
#   INSTALL_DEPS=1 bash scripts/ship-safe.sh
#   REQUIRE_CLEAN=1 bash scripts/ship-safe.sh
#
# Optional toggles:
#   SKIP_GIT=1          Skip git clean check
#   SKIP_PRECOMMIT=1    Skip pre-commit (if configured)
#   SKIP_NODE=1         Skip Node checks
#   SKIP_PYTHON=1       Skip Python checks
#   INSTALL_DEPS=1      Install dependencies (npm/pnpm/yarn, pip) if applicable
#   REQUIRE_CLEAN=1     Fail if working tree is dirty (includes untracked files)
#   REQUIRE_PRECOMMIT=1 Fail if .pre-commit-config.yaml exists but pre-commit is missing

say() { printf "%s\n" "$*"; }
die() { say "❌ $*"; exit 1; }
section() { say ""; say "== $* =="; }

has_file() { [[ -f "$1" ]]; }
command_exists() { command -v "$1" >/dev/null 2>&1; }

in_repo_root() {
  git rev-parse --show-toplevel >/dev/null 2>&1
}

require_clean_tree() {
  if [[ "${SKIP_GIT:-}" == "1" ]]; then
    return 0
  fi
  if ! in_repo_root; then
    return 0
  fi
  if [[ "${REQUIRE_CLEAN:-}" != "1" ]]; then
    return 0
  fi

  # Includes untracked files (git diff does not)
  if [[ -n "$(git status --porcelain)" ]]; then
    die "Working tree is not clean (REQUIRE_CLEAN=1). Commit/stash or disable REQUIRE_CLEAN."
  fi
}

# -------------------------
# Node helpers
# -------------------------

detect_pm() {
  if has_file "pnpm-lock.yaml"; then echo "pnpm"; return; fi
  if has_file "yarn.lock"; then echo "yarn"; return; fi
  if has_file "package-lock.json"; then echo "npm"; return; fi
  if has_file "package.json"; then echo "npm"; return; fi
  echo ""
}

enable_corepack_if_needed() {
  local pm="$1"
  if [[ "$pm" == "pnpm" || "$pm" == "yarn" ]]; then
    if command_exists corepack; then
      # Corepack is bundled with modern Node, but often disabled by default.
      corepack enable >/dev/null 2>&1 || true
    fi
  fi
}

node_has_script() {
  local script="$1"
  has_file "package.json" || return 1
  # lightweight check (no jq)
  grep -qE "\"$script\"[[:space:]]*:" package.json
}

node_install() {
  local pm="$1"
  [[ "${INSTALL_DEPS:-}" == "1" ]] || return 0

  enable_corepack_if_needed "$pm"

  section "Install Node dependencies ($pm)"
  case "$pm" in
    pnpm)
      command_exists pnpm || die "pnpm not found (try: corepack enable)"
      if has_file "pnpm-lock.yaml"; then pnpm install --frozen-lockfile; else pnpm install; fi
      ;;
    yarn)
      command_exists yarn || die "yarn not found (try: corepack enable)"
      # Yarn classic vs berry: berry typically has .yarnrc.yml
      if has_file ".yarnrc.yml"; then
        yarn install --immutable
      else
        yarn install --frozen-lockfile || yarn install
      fi
      ;;
    npm)
      command_exists npm || die "npm not found"
      if has_file "package-lock.json"; then npm ci; else npm install; fi
      ;;
    *)
      return 0
      ;;
  esac
}

node_run() {
  local pm="$1"
  local script="$2"

  enable_corepack_if_needed "$pm"

  if ! node_has_script "$script"; then
    say "↷ Skip: npm script \"$script\" not found"
    return 0
  fi

  section "Node: $script"
  case "$pm" in
    pnpm) pnpm run "$script" ;;
    yarn) yarn run "$script" ;;
    npm)  npm run "$script" ;;
    *) die "Unknown package manager: $pm" ;;
  esac
  return 0
}

# Run first matching script from a list (sets var to 1 if ran)
node_run_first() {
  local pm="$1"; shift
  local ran_var="$1"; shift

  for s in "$@"; do
    if node_has_script "$s"; then
      node_run "$pm" "$s"
      printf -v "$ran_var" "1"
      return 0
    fi
  done

  return 1
}

run_node_checks() {
  if [[ "${SKIP_NODE:-}" == "1" ]]; then
    say "↷ Node checks skipped (SKIP_NODE=1)"
    return 1
  fi

  local pm
  pm="$(detect_pm)"
  [[ -n "$pm" ]] || return 1

  node_install "$pm"

  local ran="0"

  # Prefer check-variants (CI-friendly), but allow generic names
  if node_run_first "$pm" ran "format:check" "format:ci" "fmt:check" "prettier:check"; then :; else
    node_run_first "$pm" ran "format" "fmt" || true
  fi

  node_run_first "$pm" ran "lint" "lint:ci" "eslint" || true

  # Typecheck script names vary
  node_run_first "$pm" ran "typecheck" "type-check" "type-check:ci" "check-types" "type:check" || true

  # Tests: prefer test:ci
  if node_has_script "test:ci"; then
    node_run "$pm" "test:ci"
    ran="1"
  else
    node_run_first "$pm" ran "test" || true
  fi

  node_run_first "$pm" ran "build" || true

  if [[ "$ran" == "0" ]]; then
    say "↷ Node project detected, but no recognized scripts were run."
    return 1
  fi

  return 0
}

# -------------------------
# Python helpers
# -------------------------

detect_python_project() {
  has_file "pyproject.toml" || has_file "requirements.txt" || has_file "Pipfile" || has_file "setup.py"
}

detect_python_bin() {
  if command_exists python3; then echo "python3"; return; fi
  if command_exists python; then echo "python"; return; fi
  echo ""
}

python_install() {
  local py="$1"
  [[ "${INSTALL_DEPS:-}" == "1" ]] || return 0

  section "Install Python dependencies"
  "$py" -m pip install --upgrade pip

  if has_file "requirements.txt"; then
    "$py" -m pip install -r requirements.txt
  elif has_file "pyproject.toml"; then
    # Best-effort editable install
    "$py" -m pip install -e . || true
  fi
}

python_has_tests() {
  [[ -n "$(find . -type f \( -name 'test_*.py' -o -name '*_test.py' \) \
    -not -path '*/.venv/*' -not -path '*/venv/*' -not -path '*/.tox/*' \
    -not -path '*/.git/*' -not -path '*/node_modules/*' 2>/dev/null | head -n 1)" ]]
}

run_python_checks() {
  if [[ "${SKIP_PYTHON:-}" == "1" ]]; then
    say "↷ Python checks skipped (SKIP_PYTHON=1)"
    return 1
  fi

  detect_python_project || return 1

  local py
  py="$(detect_python_bin)"
  [[ -n "$py" ]] || die "python/python3 not found"

  python_install "$py"

  section "Python checks"

  local ran="0"

  if command_exists ruff; then
    section "Ruff"
    ruff check .
    ran="1"
  else
    say "↷ Skip: ruff not installed"
  fi

  if command_exists black; then
    section "Black"
    black --check .
    ran="1"
  else
    say "↷ Skip: black not installed"
  fi

  if command_exists mypy; then
    section "Mypy"
    mypy .
    ran="1"
  else
    say "↷ Skip: mypy not installed"
  fi

  # Run pytest only if tests exist AND pytest is available (or INSTALL_DEPS=1)
  if python_has_tests; then
    if command_exists pytest; then
      section "Pytest"
      pytest
      ran="1"
    elif [[ "${INSTALL_DEPS:-}" == "1" ]]; then
      section "Pytest (install)"
      "$py" -m pip install --upgrade pip
      "$py" -m pip install pytest
      pytest
      ran="1"
    else
      say "↷ Skip: pytest not installed (set INSTALL_DEPS=1 to install)"
    fi
  else
    say "↷ Skip: no pytest tests found"
  fi

  [[ "$ran" == "1" ]] || return 1
  return 0
}

# -------------------------
# pre-commit (optional)
# -------------------------

run_precommit() {
  if [[ "${SKIP_PRECOMMIT:-}" == "1" ]]; then
    say "↷ pre-commit skipped (SKIP_PRECOMMIT=1)"
    return 1
  fi

  has_file ".pre-commit-config.yaml" || return 1

  if ! command_exists pre-commit; then
    if [[ "${REQUIRE_PRECOMMIT:-}" == "1" ]]; then
      die "pre-commit config present but pre-commit is not installed (REQUIRE_PRECOMMIT=1)."
    fi
    say "↷ Skip: pre-commit not installed"
    return 1
  fi

  section "pre-commit"
  pre-commit run --all-files
  return 0
}

main() {
  require_clean_tree

  local did_something=0

  # pre-commit first (fast feedback)
  if run_precommit; then did_something=1; fi
  if run_node_checks; then did_something=1; fi
  if run_python_checks; then did_something=1; fi

  if [[ "$did_something" -eq 0 ]]; then
    say ""
    say "No runnable checks detected."
    say ""
    say "Manual checklist:"
    say "- Update docs/DEVLOG.md (3–6 bullet points)"
    say "- Run your project's tests"
    say "- Build once locally"
    say "- Quick smoke-test the main flow"
  fi

  say ""
  say "Done."
}

main "$@"
