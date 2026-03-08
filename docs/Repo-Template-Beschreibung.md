# Repo-Template-Beschreibung

> Detaillierte Beschreibung des Universal Project Templates für Next.js-Projekte mit Vibe-Coding-Methodik.

---

## Projektziel

Dieses Repository ist ein **Projekt-Template** für neue Next.js-Anwendungen. Es liefert eine schlanke, aber vollständige Grundlage für:

- **Dokumentation** — strukturierte Vorlagen für Architektur, Entscheidungen und Entwicklungslog
- **Qualitätssicherung** — automatisierte Checks (Lint, Format, Typecheck, Test, Build)
- **AI/Agent-Integration** — klare Regeln, Best-Practice-Skills und spezialisierte Agent-Personas für Claude Code, Cursor, Copilot & Co.
- **Team-Onboarding** — einheitliche Workflows, die für alle Teammitglieder gelten

**Für wen:** Entwickler und Teams, die Next.js-Projekte mit AI-gestütztem Development starten wollen und von Anfang an Struktur, Qualität und Dokumentation sicherstellen möchten.

---

## PROJECT_BRIEF.md — Der Projekt-Einstieg

Das Template enthält eine **PROJECT_BRIEF.md** als zentrales Intake-Dokument. Bevor die AI-Agents starten, wird dieses Dokument ausgefüllt.

### Die 8 Sections

| # | Section | Inhalt |
|---|---------|--------|
| 1 | **Projektname & Einzeiler** | Name der App + Ein-Satz-Beschreibung |
| 2 | **Zielgruppen / Rollen** | Wer benutzt die App? (min. 2 Rollen mit Beschreibung) |
| 3 | **Kern-Features (MVP)** | Die 3–5 wichtigsten Features für den Launch |
| 4 | **Nice-to-Have** | Features nach MVP (hilft beim Scope-Begrenzen) |
| 5 | **Tech-Stack** | Zusätzliche Technologien über den Template-Default hinaus (DB, Auth, ORM, Hosting, etc.) |
| 6 | **Komplexität** | Simple / Standard / Enterprise (steuert Auth/RBAC/Infrastruktur-Umfang) |
| 7 | **Design-Referenzen** | Apps oder Websites als Inspiration (optional) |
| 8 | **Sonstiges** | Besonderheiten, Einschränkungen, Wünsche |

### Workflow

```
PROJECT_BRIEF.md ausfüllen → @requirements-engineer aufrufen → Agent orchestriert die weiteren Agents
```

> **Tipp:** Starte mit Komplexität "Simple". Upgraden geht immer.

---

## Agent-Personas (7)

Das Template enthält **7 spezialisierte Agent-Personas** unter `.claude/agents/`. Diese dienen als Kontext für Claude Code und ermöglichen rollenbasiertes AI-Development.

| Agent | Datei | Aufgabe |
|---|---|---|
| **Requirements Engineer** | `requirements-engineer.md` | Analysiert PROJECT_BRIEF.md, erstellt Anforderungen und orchestriert die weiteren Agents |
| **Solution Architect** | `solution-architect.md` | Entwirft Architektur, Datenmodell und API-Design |
| **Frontend Developer** | `frontend-developer.md` | Implementiert UI-Komponenten, Pages und Layouts |
| **Database Engineer** | `database-engineer.md` | Datenbank-Schema, Migrations und ORM-Konfiguration |
| **QA Engineer** | `qa-engineer.md` | Testplanung, Test-Erstellung und Qualitätsprüfung |
| **Code Reviewer** | `code-reviewer.md` | Code-Reviews nach Best Practices und Konventionen |
| **Gatekeeper** | `gatekeeper.md` | Quality-Gate vor Merge: Prüft Vollständigkeit und Standards |

### Orchestrierung

Der **Requirements Engineer** ist der Einstiegspunkt. Er:
1. Analysiert die ausgefüllte `PROJECT_BRIEF.md`
2. Erstellt strukturierte Anforderungen
3. Delegiert an die spezialisierten Agents (Architect → Frontend → DB → QA → Review → Gate)

**Aufruf:** `@requirements-engineer` in Claude Code eingeben, nachdem `PROJECT_BRIEF.md` ausgefüllt ist.

---

## Vibe Coding Philosophie

Das Template basiert auf der **Vibe-Coding-Methodik** — einer klaren Trennung zwischen Exploration und Produktion:

| Aspekt | `vibe/` | `src/` |
|---|---|---|
| **Zweck** | Prototypen, Spikes, schnelle Ideen | Stabiler, getesteter Produktionscode |
| **Qualität** | Quick & Dirty erlaubt | Muss sauber sein |
| **Imports** | Wird nicht von anderen importiert | Kann importiert werden |
| **Deployment** | Wird nie deployed | Geht in Produktion |
| **Lebensdauer** | Temporär, experimentell | Langfristig gepflegt |

### Wann wird Code von `vibe/` nach `src/` befördert?

1. **Wiederverwendung** — Du kopierst den Code bereits an andere Stellen
2. **Feature fertig** — Das Feature ist "done" und bereit zum Ausliefern
3. **Deployment** — Der Code soll live gehen
4. **Stabilität** — Bugfixes, Erweiterungen oder Refactoring sind nötig

### Promotion-Checkliste

1. Inputs/Outputs klar definieren
2. Seiteneffekte minimieren
3. Mindestens 1 Happy-Path + 1 Edge-Case testen
4. DEVLOG + DECISIONS aktualisieren (falls relevant)
5. `bash scripts/ship-safe.sh` ausführen

---

## Tech Stack

| Kategorie | Technologie | Version |
|---|---|---|
| **Sprache** | TypeScript | ^5.7 |
| **Framework** | Next.js (App Router) | ^15.2 |
| **UI-Library** | React | ^19.0 |
| **Styling** | Tailwind CSS | v4.0 |
| **Komponenten** | shadcn/ui (New York Style) | Latest |
| **Animationen** | Framer Motion | ^12.4 |
| **Icons** | Lucide React | ^0.474 |
| **Linting** | ESLint + eslint-config-next | ^9.19 |
| **Formatting** | Prettier + prettier-plugin-tailwindcss | ^3.4 |
| **Build** | Next.js mit Turbopack (Dev) | — |

### Konfiguration

- **TypeScript**: Strict Mode, Path-Alias `@/` → `./src/*`, `vibe/` ausgeschlossen
- **shadcn/ui**: New York Style, CSS Variables, Lucide Icons, RSC-fähig
- **Tailwind v4**: CSS-first Ansatz via `@tailwindcss/postcss` (kein `tailwind.config.ts`)
- **Prettier**: 80 Zeichen, 2 Spaces, Tailwind Class-Sorting automatisch
- **ESLint**: `next/core-web-vitals` + `next/typescript`, `vibe/` ignoriert

### npm Scripts

| Script | Befehl | Zweck |
|---|---|---|
| `dev` | `next dev --turbopack` | Entwicklungsserver starten |
| `build` | `next build` | Produktions-Build |
| `start` | `next start` | Produktionsserver starten |
| `lint` | `next lint` | ESLint ausführen |
| `lint:fix` | `next lint --fix` | ESLint mit Auto-Fix |
| `format` | `prettier --write .` | Prettier auf alle Dateien |
| `format:check` | `prettier --check .` | Prettier-Check (CI) |
| `typecheck` | `tsc --noEmit` | TypeScript-Prüfung |

---

## AI/Agent-Integration

Das Template ist von Grund auf für **AI-gestütztes Development** konzipiert.

### Regeln (AGENTS.md)

7 Sections mit klaren Vorgaben:

1. **Kleine, sichere Schritte** — Max. 1–3 Dateien pro Änderung, Plan vorher benennen
2. **Qualität** — Einfache Lösungen bevorzugen, keine Breaking Changes ohne Hinweis
3. **Sicherheit** — Niemals Secrets in Code, Logs oder Doku
4. **Doku-Pflicht** — DEVLOG bei relevanten Änderungen, DECISIONS bei "Warum?"-Fragen
5. **Next.js Konventionen** — App Router, Server/Client Components, Metadata
6. **Styling & UI** — Tailwind v4, shadcn/ui CLI, `cn()` Helper, Komponenten-Struktur
7. **Animationen** — Framer Motion nur in Client Components, einfache States mit Tailwind

### Installierte Skills (5)

Skills sind Wissensbasen, die AI-Agents automatisch als Kontext laden:

| Skill | Quelle | Regeln | Beschreibung |
|---|---|---|---|
| **conventional-commit** | marcelorodrigo | 1 Datei | Commit-Message-Format nach Conventional Commits Spezifikation |
| **framer-motion** | pproenca | 42 Regeln | Animations-Performance: Bundle-Optimierung, Re-render-Vermeidung, Layout-Animationen, Scroll, Gestures, Springs, SVG |
| **next-best-practices** | Vercel Labs | 20+ Dateien | Next.js 15+ Patterns: File Conventions, RSC Boundaries, Async Patterns, Data Fetching, Error Handling, Metadata, Image/Font Optimierung |
| **tailwind-v4-shadcn** | jezweb | 8+ Dateien | Tailwind v4 + shadcn/ui: CSS-Variable-Architektur, Dark Mode, Migration v3→v4, 8 dokumentierte Fehlerbehebungen |
| **vercel-react-best-practices** | Vercel Labs | 57 Regeln | React Performance: Waterfall-Elimination, Bundle-Size, Server-Side Caching, Re-render-Optimierung, JS Performance |

### Unterstützte AI-Agents

Die Skills sind über Symlinks für folgende Tools verfügbar:

- **Claude Code** (`.claude/skills/`)
- **Cursor** (`.cursor/`) ¹
- **GitHub Copilot** (`.github/copilot-instructions.md` + `skills/`)
- **Gemini CLI** (`skills/`)
- **OpenCode** (`skills/`)
- **Antigravity** (`.agent/skills/`)
- **Mistral Vibe** (`.vibe/`) ¹
- **OpenClaw** (`.agent/skills/`)
- **Replit** (`skills/`)

> ¹ `.cursor/` und `.vibe/` werden nur angelegt, wenn die jeweilige IDE auf dem System installiert ist. Auf Windows als Junction-Points — manche Dateibaum-Tools zeigen sie daher nicht an, Zugriffe funktionieren aber normal.

---

## Qualitätssicherung

### ship-safe.sh (Quality Gate)

Zentrale Qualitätskontrolle vor jedem Merge (352 Zeilen):

- **Auto-Detection**: Erkennt Node.js und Python Projekte automatisch
- **Package Manager**: Unterstützt npm, pnpm, yarn (Corepack-kompatibel)
- **Checks**: format → lint → typecheck → test → build (nur wenn Scripts vorhanden)
- **Flexible Varianten**: Erkennt z.B. `format:check`, `fmt:check`, `test:ci` automatisch
- **Toggles**: `SKIP_GIT=1`, `SKIP_NODE=1`, `SKIP_PYTHON=1`, `INSTALL_DEPS=1`, etc.

### CI/CD Pipeline (.github/workflows/ci.yml)

- **Trigger**: Push auf `main`/`master` und alle Pull Requests
- **Strategie**: Nutzt `ship-safe.sh` als Single Source of Truth (mit Fallback)
- **Concurrency**: Bricht vorherige Runs für denselben Branch ab
- **Timeout**: 20 Minuten Maximum

### Pre-commit Hooks (.pre-commit-config.yaml)

6 automatische Checks bei jedem Commit:

1. `trailing-whitespace` — Entfernt überflüssige Leerzeichen
2. `end-of-file-fixer` — Stellt sicher, dass Dateien mit Newline enden
3. `check-yaml` — YAML-Syntax-Validierung
4. `check-json` — JSON-Syntax-Validierung
5. `check-merge-conflict` — Erkennt Merge-Conflict-Marker
6. `detect-private-key` — Verhindert versehentliches Committen privater Schlüssel

### ESLint + Prettier

- **ESLint**: `next/core-web-vitals` + `next/typescript` Regeln
- **Prettier**: Automatisches Formatieren bei Save (VS Code), Tailwind Class-Sorting
- **VS Code**: Format-on-Save + ESLint Auto-Fix-on-Save konfiguriert

---

## Dokumentationsstruktur

| Datei | Zweck | Aktualisieren wenn... |
|---|---|---|
| `README.md` | Schnellstart, Projektübersicht, Vibe-Coding-Regeln | Neues Feature, Setup-Änderungen |
| `PROJECT_BRIEF.md` | Projekt-Briefing mit Platzhaltern (8 Sections) | Vor Projektstart ausfüllen |
| `docs/ARCHITECTURE.md` | Tech Stack, Projektziel, Erfolgskriterien | Stack-Änderungen, neue Komponenten |
| `docs/DECISIONS.md` | Architektur-Entscheidungen (ADRs) mit Status | Wichtige "Warum?"-Entscheidungen |
| `docs/DEVLOG.md` | Session-Logs (Ziel, Änderungen, Ergebnis, Nächste Schritte) | Nach jeder relevanten Arbeitseinheit |
| `AGENTS.md` | AI/Agent-Regeln (universal) | Neue Konventionen, Tool-Änderungen |
| `CONTRIBUTING.md` | Beitragsrichtlinien | Workflow-Änderungen |
| `SECURITY.md` | Vulnerability-Reporting | Kontakt-Änderungen |

### DECISIONS.md — Status-Werte

| Status | Bedeutung |
|---|---|
| `Accepted` | Aktuelle Entscheidung, gilt |
| `Rejected` | Wurde erwogen, aber nicht gewählt |
| `Deprecated` | Existiert noch, soll für Neues nicht verwendet werden |
| `Superseded` | Wurde ersetzt (Link zur neuen Entscheidung) |

---

## Scripts

| Script | Aufruf | Zweck |
|---|---|---|
| `init-template.sh` | `bash scripts/init-template.sh` | Setzt Platzhalter (Projektname, Lizenz, Security-E-Mail) in < 60 Sekunden |
| `ship-safe.sh` | `bash scripts/ship-safe.sh` | Quality Gate: Format, Lint, Typecheck, Test, Build |
| `debug-helper.sh` | `bash scripts/debug-helper.sh [logfile]` | Durchsucht Logs nach Error-Patterns |
| `update-devlog.sh` | `bash scripts/update-devlog.sh [datum] [titel]` | Generiert DEVLOG-Eintrag mit letzten 10 Commits |

---

## Standard-Workflow

### 1. Neues Projekt starten

```bash
# Template auf GitHub verwenden → "Use this template"
git clone <dein-repo>
code .
bash scripts/init-template.sh
npm install
npx shadcn@latest init
```

### 2. PROJECT_BRIEF ausfüllen

```bash
# PROJECT_BRIEF.md öffnen und alle ___ Platzhalter ausfüllen
# Danach: @requirements-engineer in Claude Code aufrufen
# → Der Agent analysiert den Brief und orchestriert die weiteren Agents
```

### 3. Feature entwickeln

```bash
git checkout -b feat/mein-feature
# Code in src/ schreiben (oder erst in vibe/ experimentieren)
# Bei Bedarf shadcn/ui Komponenten hinzufügen:
npx shadcn@latest add button card dialog
```

### 4. Vor dem Merge

```bash
bash scripts/ship-safe.sh
# Optional: INSTALL_DEPS=1 bash scripts/ship-safe.sh
```

### 5. Dokumentation pflegen

```bash
# DEVLOG aktualisieren (automatisch mit letzten Commits)
bash scripts/update-devlog.sh

# Oder manuell in docs/DEVLOG.md
# Architektur-Entscheidungen in docs/DECISIONS.md
```

### 6. PR erstellen

- Titel: Kurz (< 70 Zeichen)
- Body: Ziel/Warum, Kontext, Was geändert, Wie getestet
- Checklist: CI grün, Lint/Typecheck/Test lokal, Doku aktualisiert

---

## Platzhalter (nach Template-Nutzung anpassen)

| Datei | Platzhalter | Ersetzen durch |
|---|---|---|
| `PROJECT_BRIEF.md` | `___` (alle Felder) | Deine Projektdetails |
| `LICENSE` | `<YOUR NAME/ORG>` | Dein Name oder Organisation |
| `SECURITY.md` | `<SECURITY_EMAIL>` | E-Mail für Sicherheitsberichte |
| `.github/ISSUE_TEMPLATE/config.yml` | Repo-Links | Deine Repository-URLs |
| `docs/ARCHITECTURE.md` | Projektziel, Erfolgskriterien | Deine Projektdetails |
| `package.json` | `"name": "my-next-app"` | Dein Projektname (kebab-case) |

> **Tipp:** `bash scripts/init-template.sh` setzt die meisten Platzhalter automatisch.
