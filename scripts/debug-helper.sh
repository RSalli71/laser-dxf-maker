#!/usr/bin/env bash
set -euo pipefail

# Simple helper to surface likely error lines from logs / command output.
# Usage:
#   scripts/debug-helper.sh [path/to/logfile]
# If no logfile is provided, it will scan common log locations.

PATTERN="${PATTERN:-error|exception|traceback|failed|fatal|warn}"
MAX_LINES="${MAX_LINES:-200}"

scan_file () {
  local f="$1"
  [[ -f "$f" ]] || return 0
  echo "==> Scanning: $f"
  # Show matching lines with a little context; keep it portable.
  grep -Ein "$PATTERN" "$f" | head -n "$MAX_LINES" || true
  echo ""
}

echo "Debug helper"
echo "- pattern: ${PATTERN}"
echo "- max_lines: ${MAX_LINES}"
echo ""

if [[ $# -ge 1 ]]; then
  scan_file "$1"
  exit 0
fi

# Try common locations
for f in   "./log.txt"   "./logs/app.log"   "./logs/*.log"   "./*.log"   "./npm-debug.log"   "./yarn-error.log"; do
  for match in $f; do
    scan_file "$match"
  done
done

echo "Tip: run with a specific log file:"
echo "  scripts/debug-helper.sh path/to/logfile"
