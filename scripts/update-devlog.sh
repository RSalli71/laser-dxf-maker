#!/usr/bin/env bash
set -euo pipefail

# Adds a new entry to docs/DEVLOG.md.
# Usage:
#   bash scripts/update-devlog.sh
#   bash scripts/update-devlog.sh 2026-01-03 "Fix CI + ship-safe"
#
# Notes:
# - If an entry for the date already exists (any title), the script exits without changes.
# - The entry is appended to the end of the file.

DEVLOG="docs/DEVLOG.md"
DATE="${1:-$(date +%F)}"
TITLE="${2:-Session/Topic}"

if [[ ! -f "${DEVLOG}" ]]; then
  echo "DEVLOG file not found: ${DEVLOG}" >&2
  exit 1
fi

# Match headings like:
#   ## 2026-01-03
#   ## 2026-01-03 — Something
if grep -qE "^##[[:space:]]+${DATE}([[:space:]]|$|—)" "${DEVLOG}"; then
  echo "DEVLOG already contains an entry for ${DATE}"
  exit 0
fi

COMMITS=""
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  # Short recent summary (last 10 commit subjects)
  COMMITS="$(git log -n 10 --pretty=format:'- %s' 2>/dev/null || true)"
fi

{
  echo ""
  echo "## ${DATE} — ${TITLE}"
  echo "- **Goal/Problem:**"
  echo "  - "
  echo "- **Changes:**"
  if [[ -n "${COMMITS}" ]]; then
    # Indent commit bullets under 'Changes'
    while IFS= read -r line; do
      [[ -z "${line}" ]] && continue
      echo "  ${line}"
    done <<< "${COMMITS}"
  else
    echo "  - "
  fi
  echo "- **Result:**"
  echo "  - "
  echo "- **Next Steps:**"
  echo "  - "
  echo "- **Refs:**"
  echo "  - "
  echo "- **Verify (commands/steps):**"
  echo "  - \`bash scripts/ship-safe.sh\`"
} >> "${DEVLOG}"

echo "Added DEVLOG entry for ${DATE} to ${DEVLOG}"
