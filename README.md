# Universal Project Template — Next.js + Vibe Coding

Projekt-Template für **Next.js 15**-Anwendungen mit AI-gestütztem Development.
Liefert Struktur, Qualität und Dokumentation von Anfang an — optimiert für Claude Code, Cursor, Copilot & Co.

## Tech Stack

| Kategorie | Technologie |
|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 |
| **Sprache** | TypeScript (Strict Mode) |
| **Styling** | Tailwind CSS v4 + shadcn/ui (New York) |
| **Animationen** | Framer Motion |
| **Icons** | Lucide React |
| **Linting** | ESLint + Prettier (Tailwind Class Sorting) |
| **Build** | Turbopack (Dev) |

---

## Schnellstart

> Windows: Scripts in **Git Bash** ausführen (nicht cmd.exe).

```bash
# 1. Template auf GitHub: "Use this template" → neues Repo erstellen
git clone <dein-repo>
code .

# 2. Template initialisieren (setzt Platzhalter)
bash scripts/init-template.sh

# 3. Dependencies installieren
npm install
npx shadcn@latest init

# 4. PROJECT_BRIEF.md ausfüllen
# Dann: @requirements-engineer in Claude Code aufrufen

# 5. Entwicklungsserver starten
npm run dev
```

---

## Vibe Coding: `vibe/` vs `src/`

Klare Trennung zwischen **Exploration** und **Produktion**:

| | `vibe/` | `src/` |
|---|---|---|
| **Zweck** | Prototypen, Spikes, schnelle Ideen | Stabiler, getesteter Produktionscode |
| **Qualität** | Quick & Dirty erlaubt | Muss sauber sein |
| **Deployment** | Wird nie deployed | Geht in Produktion |

**Promote to `src/`, wenn:**
- Code wird mehr als einmal genutzt
- Feature ist fertig / soll deployed werden
- Stabilität ist nötig (Bugfixes, Refactoring)

---

## AI/Agent-Integration

### PROJECT_BRIEF.md

Zentrales Intake-Dokument mit 8 Sections (Projektname, Zielgruppen, MVP-Features, Tech-Stack, etc.).
Workflow: **Ausfüllen → `@requirements-engineer` aufrufen → Agent orchestriert den Rest.**

### Agent-Personas (7)

Spezialisierte Rollen unter `.claude/agents/`:

| Agent | Aufgabe |
|---|---|
| **Requirements Engineer** | Analysiert Brief, erstellt Anforderungen, orchestriert Agents |
| **Solution Architect** | Architektur, Datenmodell, API-Design |
| **Frontend Developer** | UI-Komponenten, Pages, Layouts |
| **Database Engineer** | DB-Schema, Migrations, ORM |
| **QA Engineer** | Testplanung und -erstellung |
| **Code Reviewer** | Code-Reviews nach Best Practices |
| **Gatekeeper** | Quality-Gate vor Merge |

### Installierte Skills (5)

| Skill | Beschreibung |
|---|---|
| **next-best-practices** | Next.js 15+ Patterns (Vercel offiziell, 20+ Dateien) |
| **vercel-react-best-practices** | React Performance (Vercel offiziell, 57 Regeln) |
| **tailwind-v4-shadcn** | Tailwind v4 + shadcn/ui Setup & Migration |
| **framer-motion** | Animations-Performance (42 Regeln) |
| **conventional-commit** | Commit-Message-Format |

Skills liegen in `.agents/skills/` und sind per Symlink für alle AI-Tools verfügbar (Claude Code, Cursor, Copilot, Gemini CLI, etc.).

### Regeln (AGENTS.md)

7 Sections: Kleine Schritte, Qualität, Sicherheit, Doku-Pflicht, Next.js Konventionen, Styling & UI, Animationen.

---

## npm Scripts

| Script | Befehl |
|---|---|
| `npm run dev` | Entwicklungsserver (Turbopack) |
| `npm run build` | Produktions-Build |
| `npm start` | Produktionsserver |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint mit Auto-Fix |
| `npm run format` | Prettier auf alle Dateien |
| `npm run format:check` | Prettier-Check (CI) |
| `npm run typecheck` | TypeScript-Prüfung |

---

## Qualitätssicherung

```bash
# Quality Gate vor Merge (Format, Lint, Typecheck, Test, Build)
bash scripts/ship-safe.sh

# Mit Dependency-Installation
INSTALL_DEPS=1 bash scripts/ship-safe.sh
```

- **CI/CD**: GitHub Actions Pipeline auf Push/PR, nutzt `ship-safe.sh`
- **Pre-commit**: 6 Hooks (Whitespace, EOF, YAML, JSON, Merge-Conflicts, Private Keys)
- **VS Code**: Format-on-Save + ESLint Auto-Fix vorkonfiguriert

---

## Projektstruktur

```
├── .agents/skills/          # 5 Skills (Quelldateien)
├── .claude/agents/          # 7 Agent-Personas
├── .github/workflows/       # CI/CD Pipeline
├── docs/
│   ├── ARCHITECTURE.md      # Tech Stack & Projektziel
│   ├── DECISIONS.md         # Architektur-Entscheidungen
│   ├── DEVLOG.md            # Session-Logs
│   ├── Repo-Template-Beschreibung.md  # Detaillierte Beschreibung
│   └── Templatestructur.md  # Vollständige Verzeichnisstruktur
├── scripts/                 # ship-safe, init-template, debug-helper, update-devlog
├── src/                     # Produktionscode
├── vibe/                    # Prototypen & Spikes
├── AGENTS.md                # AI/Agent-Regeln
├── PROJECT_BRIEF.md         # Projekt-Briefing (ausfüllen!)
├── package.json             # Dependencies & Scripts
└── tsconfig.json            # TypeScript Strict Mode
```

> Vollständige Struktur mit allen Dateien: siehe [docs/Templatestructur.md](docs/Templatestructur.md)

---

## Dokumentation pflegen

| Datei | Wann aktualisieren |
|---|---|
| `docs/DEVLOG.md` | Nach jeder relevanten Arbeitseinheit |
| `docs/DECISIONS.md` | Bei wichtigen "Warum?"-Entscheidungen |
| `docs/ARCHITECTURE.md` | Bei Stack-Änderungen |

```bash
# DEVLOG automatisch aktualisieren (mit letzten Commits)
bash scripts/update-devlog.sh
```

---

## Platzhalter ersetzen

| Datei | Platzhalter |
|---|---|
| `PROJECT_BRIEF.md` | `___` (alle Felder) |
| `LICENSE` | `<YOUR NAME/ORG>` |
| `SECURITY.md` | `<SECURITY_EMAIL>` |
| `package.json` | `"name": "my-next-app"` |
| `docs/ARCHITECTURE.md` | Projektziel, Erfolgskriterien |

> `bash scripts/init-template.sh` setzt die meisten Platzhalter automatisch.

---

## Lizenz

[MIT](LICENSE) — siehe Datei für Details.
