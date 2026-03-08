#!/usr/bin/env bash
set -euo pipefail

# Init-Script für neue Projekte, die aus diesem Template erstellt wurden.
# Ziel: in <60 Sekunden die wichtigsten Platzhalter setzen.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

say() { printf "%s\n" "$*"; }
die() { printf "ERROR: %s\n" "$*" >&2; exit 1; }

# --- Helpers ---
to_kebab() {
  # simple kebab-case: lower, spaces/underscores -> -, remove non-alnum/-
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[ _]+/-/g; s/[^a-z0-9-]//g; s/-+/-/g; s/^-|-$//g'
}

replace_in_file() {
  local file="$1"
  local search="$2"
  local replace="$3"

  if [[ ! -f "$file" ]]; then return 0; fi
  # Perl in-place works on Linux & macOS
  perl -0777 -i -pe "s/\Q${search}\E/${replace}/g" "$file"
}

# --- Inputs ---
DEFAULT_NAME="$(basename "$ROOT_DIR")"
read -r -p "Projektname (z.B. \"PV Forecast\"): [${DEFAULT_NAME}] " PROJECT_NAME
PROJECT_NAME="${PROJECT_NAME:-$DEFAULT_NAME}"

DEFAULT_SLUG="$(to_kebab "$PROJECT_NAME")"
read -r -p "Projekt-Slug (kebab-case, z.B. \"pv-forecast\"): [${DEFAULT_SLUG}] " PROJECT_SLUG
PROJECT_SLUG="${PROJECT_SLUG:-$DEFAULT_SLUG}"

read -r -p "Kurzbeschreibung (optional): " PROJECT_DESC

read -r -p "License Holder (Name/Org): [<YOUR NAME/ORG>] " LICENSE_HOLDER
LICENSE_HOLDER="${LICENSE_HOLDER:-<YOUR NAME/ORG>}"

read -r -p "Security Email (optional): " SECURITY_EMAIL

say ""
say "==> Setze Platzhalter…"

# README: Titel ersetzen (erste Zeile)
if [[ -f "README.md" ]]; then
  # Replace only if template title exists
  if grep -q "^# Universal Project Template" README.md; then
    perl -i -pe "s/^# Universal Project Template.*$/# ${PROJECT_NAME}/" README.md
  fi

  # Optional: Kurzbeschreibung unterbringen, wenn gesetzt
  if [[ -n "${PROJECT_DESC}" ]]; then
    # Add/replace first paragraph after title if it still matches the template wording
    if grep -q "Dieses Repository ist ein \*\*Template\*\*" README.md; then
      # keep it simple: insert a line under the title
      perl -0777 -i -pe "s/(^# .*?\n\n)/$1${PROJECT_DESC}\n\n/s" README.md
    fi
  fi
fi

# ARCHITECTURE: Projektziel grob vorfüllen, falls noch leer
if [[ -f "docs/ARCHITECTURE.md" ]]; then
  if grep -q "\(1–3 Sätze\)" docs/ARCHITECTURE.md; then
    if [[ -n "${PROJECT_DESC}" ]]; then
      perl -i -pe "s/\(1–3 Sätze\)/${PROJECT_DESC}/" docs/ARCHITECTURE.md
    else
      perl -i -pe "s/\(1–3 Sätze\)/${PROJECT_NAME} – TODO Projektziel eintragen/" docs/ARCHITECTURE.md
    fi
  fi
fi

# LICENSE: Holder ersetzen
replace_in_file "LICENSE" "<YOUR NAME/ORG>" "${LICENSE_HOLDER}"

# SECURITY: Email einsetzen (falls gesetzt)
if [[ -n "${SECURITY_EMAIL}" ]]; then
  replace_in_file "SECURITY.md" "<SECURITY_EMAIL>" "${SECURITY_EMAIL}"
else
  # lassen wir als Platzhalter, aber weisen im Output darauf hin
  :
fi

# .env: aus .env.example kopieren, falls noch nicht vorhanden
if [[ -f ".env.example" && ! -f ".env" ]]; then
  cp .env.example .env
  say "-> .env aus .env.example erstellt (bitte Werte setzen, keine Secrets committen)."
fi

say ""
say "✅ Init fertig."
say ""
say "Next Steps:"
say "1) README: 'Lokales Starten / Prüfen' Befehle eintragen"
say "2) docs/ARCHITECTURE.md: Tech Stack ergänzen"
say "3) Optional: docs/DECISIONS.md nutzen für wichtige 'Warum so?' Entscheidungen"
say ""
if [[ -z "${SECURITY_EMAIL}" ]]; then
  say "Hinweis: Bitte in SECURITY.md <SECURITY_EMAIL> ersetzen (oder Script erneut mit Email ausführen)."
fi
