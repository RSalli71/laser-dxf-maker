# Template-Struktur

> Vollständige Verzeichnisstruktur des Projekt-Templates mit Beschreibung aller Dateien und Ordner.

---

## Verzeichnisbaum

```
project-template-vibe-coding/
│
├── .agent/                                          # Agent-Regeln & Workflows (Antigravity etc.)
│   ├── rules/
│   │   └── 00-general.md                            # Universelle Agent-Leitlinien (8 Regeln)
│   ├── skills/                                      # Symlinks → .agents/skills/
│   └── workflows/
│       ├── debug-bug.md                             # 6-Schritte Bug-Debugging-Workflow
│       └── ship-safe.md                             # Pre-Merge Sicherheits-Checkliste
│
├── .agents/skills/                                  # Skill-Bibliothek (Quelldateien)
│   ├── conventional-commit/
│   │   └── SKILL.md                                 # Conventional Commits Spezifikation
│   ├── framer-motion/
│   │   ├── SKILL.md                                 # Übersicht & Schnellreferenz
│   │   └── references/                              # 42 Detail-Regeln (Animationen, Performance)
│   ├── next-best-practices/
│   │   ├── SKILL.md                                 # Next.js 15+ Übersicht
│   │   ├── async-patterns.md                        # Async/Await Patterns
│   │   ├── bundling.md                              # ESM/CommonJS, Code Splitting
│   │   ├── data-patterns.md                         # Server Components vs Actions
│   │   ├── debug-tricks.md                          # Debugging-Tipps
│   │   ├── directives.md                            # "use client" / "use server"
│   │   ├── error-handling.md                        # error.tsx, not-found.tsx
│   │   ├── file-conventions.md                      # Spezielle Dateinamen (layout, page, etc.)
│   │   ├── font.md                                  # next/font Optimierung
│   │   ├── functions.md                             # Hilfsfunktionen
│   │   ├── hydration-error.md                       # Hydration-Fehler lösen
│   │   ├── image.md                                 # next/image Best Practices
│   │   ├── metadata.md                              # generateMetadata, OG Images
│   │   ├── parallel-routes.md                       # Parallel & Intercepting Routes
│   │   ├── route-handlers.md                        # GET/POST Route Handler
│   │   ├── rsc-boundaries.md                        # Server/Client Component Grenzen
│   │   ├── runtime-selection.md                     # Edge vs Node Runtime
│   │   ├── scripts.md                               # next/script Einbindung
│   │   ├── self-hosting.md                          # Self-Hosting Konfiguration
│   │   └── suspense-boundaries.md                   # Suspense & Streaming
│   ├── tailwind-v4-shadcn/
│   │   ├── SKILL.md                                 # Setup-Guide (8 dokumentierte Fehlerbehebungen)
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json                          # Plugin-Metadaten
│   │   ├── commands/
│   │   │   └── setup.md                             # Setup-Anleitung
│   │   ├── references/
│   │   │   ├── architecture.md                      # CSS-Variable Architektur
│   │   │   ├── common-gotchas.md                    # Häufige Fehler & Lösungen
│   │   │   ├── dark-mode.md                         # Dark Mode Konfiguration
│   │   │   └── migration-guide.md                   # v3 → v4 Migration
│   │   ├── rules/
│   │   │   └── tailwind-v4-shadcn.md                # Styling-Regeln
│   │   └── templates/
│   │       ├── components.json                      # shadcn/ui Config-Vorlage
│   │       ├── index.css                            # CSS-Vorlage (Variablen + Tailwind)
│   │       ├── theme-provider.tsx                    # ThemeProvider Komponente
│   │       ├── tsconfig.app.json                    # TypeScript App-Config
│   │       ├── utils.ts                             # cn() Helper
│   │       └── vite.config.ts                       # Vite-Konfiguration
│   └── vercel-react-best-practices/
│       ├── SKILL.md                                 # Übersicht (57 Regeln)
│       ├── AGENTS.md                                # Kompilierte Anleitung
│       └── rules/                                   # 57 Detail-Regeln (Performance, Rendering)
│
├── .claude/                                         # Claude Code Einstellungen
│   ├── agents/                                      # Agent-Personas (spezialisierte Rollen)
│   │   ├── code-reviewer.md                         # Code-Review Agent
│   │   ├── database-engineer.md                     # Datenbank-Design & Migrations Agent
│   │   ├── frontend-developer.md                    # Frontend-Entwickler Agent
│   │   ├── gatekeeper.md                            # Quality-Gate & Merge-Prüfer Agent
│   │   ├── qa-engineer.md                           # QA/Test Agent
│   │   ├── requirements-engineer.md                 # Anforderungsanalyse Agent
│   │   └── solution-architect.md                    # Architektur-Design Agent
│   ├── settings.json                                # Projekt-Permissions
│   ├── settings.local.json                          # Lokale Permissions (nicht committen)
│   └── skills/                                      # Symlinks → .agents/skills/
│
├── .cursor/                                         # Cursor IDE Symlinks → .agents/skills/ (nur wenn Cursor installiert)
├── .vibe/                                           # Mistral Vibe Symlinks → .agents/skills/ (nur wenn Vibe installiert)
├── skills/                                          # Universal-Symlinks → .agents/skills/
│
├── .github/                                         # GitHub-Konfiguration
│   ├── copilot-instructions.md                      # Repo-weite Copilot-Richtlinien
│   ├── dependabot.yml                               # Automatische Dependency-Updates
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml                           # Bug-Report Formular (Severity, Steps, Env)
│   │   ├── config.yml                               # Issue-Template Konfiguration
│   │   └── feature_request.yml                      # Feature-Request Formular
│   ├── pull_request_template.md                     # PR-Vorlage (Ziel, Kontext, Checklist)
│   └── workflows/
│       └── ci.yml                                   # CI/CD Pipeline (Node + Python)
│
├── .vscode/                                         # VS Code Konfiguration
│   ├── extensions.json                              # Empfohlene Extensions (7 Stück)
│   └── settings.json                                # Editor-Einstellungen (Format, Lint, Tailwind)
│
├── docs/                                            # Projektdokumentation
│   ├── ARCHITECTURE.md                              # Tech Stack & Projektziel
│   ├── DECISIONS.md                                 # Architektur-Entscheidungen (ADRs)
│   ├── DEVLOG.md                                    # Session-Logs & Entwicklungsnotizen
│   ├── Repo-Template-Beschreibung.md                 # Detaillierte Template-Beschreibung
│   └── Templatestructur.md                          # Diese Datei
│
├── scripts/                                         # Automatisierungs-Scripts
│   ├── debug-helper.sh                              # Log-Debugging (Pattern-basiert)
│   ├── init-template.sh                             # Template-Initialisierung (< 60 Sek.)
│   ├── ship-safe.sh                                 # Quality Gate (Lint, Test, Build)
│   └── update-devlog.sh                             # DEVLOG-Eintrags-Generator
│
├── src/                                             # Produktionscode
│   ├── .gitkeep                                     # Platzhalter (leeres Verzeichnis)
│   └── README.md                                    # Richtlinien für src/
│
├── vibe/                                            # Prototypen & Spikes (temporär)
│   ├── .gitkeep                                     # Platzhalter (leeres Verzeichnis)
│   └── README.md                                    # Richtlinien für vibe/
│
├── .editorconfig                                    # Editor-Konfiguration (UTF-8, LF, 2 Spaces)
├── .env.example                                     # Umgebungsvariablen-Vorlage
├── .gitattributes                                   # Git LF-Normalisierung
├── .gitignore                                       # Ignore-Patterns (Node, Python, Secrets)
├── .pre-commit-config.yaml                          # Pre-commit Hooks (6 Checks)
├── .prettierignore                                  # Prettier Ignore-Patterns
├── .prettierrc                                      # Prettier Konfiguration
├── AGENTS.md                                        # AI/Agent-Regeln (7 Sections)
├── CONTRIBUTING.md                                  # Beitragsrichtlinien
├── LICENSE                                          # Lizenz (MIT, Platzhalter)
├── PROJECT_BRIEF.md                                 # Projekt-Briefing (Platzhalter zum Ausfüllen)
├── README.md                                        # Projekt-Übersicht & Schnellstart
├── SECURITY.md                                      # Sicherheitsrichtlinien
├── components.json                                  # shadcn/ui CLI-Konfiguration
├── eslint.config.mjs                                # ESLint Flat Config (Next.js + TS)
├── next.config.ts                                   # Next.js Konfiguration
├── package.json                                     # Dependencies & npm Scripts
├── postcss.config.mjs                               # PostCSS (Tailwind v4)
└── tsconfig.json                                    # TypeScript Konfiguration
```

---

## Top-Level Dateien & Ordner

| Datei/Ordner | Zweck |
|---|---|
| `README.md` | Schnellstart, Vibe-Coding-Regeln, Projektübersicht |
| `PROJECT_BRIEF.md` | Projekt-Briefing mit Platzhaltern (Name, Zielgruppen, Features, Tech-Stack) |
| `AGENTS.md` | Universelle Regeln für AI/Copilot (Next.js, Styling, Animationen) |
| `CONTRIBUTING.md` | Beitragsrichtlinien (Issues → Branch → PR) |
| `SECURITY.md` | Vulnerability-Reporting (E-Mail, kein öffentliches Issue) |
| `LICENSE` | MIT-Lizenz (Platzhalter für Name/Org) |
| `package.json` | Next.js 15, React 19, Tailwind v4, Framer Motion, shadcn/ui |
| `tsconfig.json` | TypeScript Strict, Path-Alias `@/` → `src/`, `vibe/` excluded |
| `next.config.ts` | React Strict Mode |
| `eslint.config.mjs` | ESLint (next/core-web-vitals + TypeScript), `vibe/` ignored |
| `.prettierrc` | Prettier + Tailwind Class Sorting Plugin |
| `postcss.config.mjs` | Tailwind v4 via `@tailwindcss/postcss` |
| `components.json` | shadcn/ui (New York Style, Lucide Icons, CSS Variables) |
| `.env.example` | Umgebungsvariablen-Vorlage (Next.js, Auth, DB, APIs) |
| `.editorconfig` | UTF-8, LF, 2 Spaces (Standard für alle Editoren) |
| `.pre-commit-config.yaml` | 6 Checks: Whitespace, EOF, YAML, JSON, Merge-Conflicts, Private Keys |
| `.gitignore` | Multi-Stack Patterns (Node, Python, Java, .NET, Rust, Go, C/C++) |

---

## Agent-Personas (7)

Spezialisierte Agent-Rollen unter `.claude/agents/`, die als Kontext für Claude Code dienen:

| Agent | Datei | Aufgabe |
|---|---|---|
| **Requirements Engineer** | `requirements-engineer.md` | Analysiert PROJECT_BRIEF.md und erstellt Anforderungen |
| **Solution Architect** | `solution-architect.md` | Entwirft Architektur, Datenmodell und API-Design |
| **Frontend Developer** | `frontend-developer.md` | Implementiert UI-Komponenten, Pages und Layouts |
| **Database Engineer** | `database-engineer.md` | Datenbank-Schema, Migrations und ORM-Konfiguration |
| **QA Engineer** | `qa-engineer.md` | Testplanung, Test-Erstellung und Qualitätsprüfung |
| **Code Reviewer** | `code-reviewer.md` | Code-Reviews nach Best Practices und Konventionen |
| **Gatekeeper** | `gatekeeper.md` | Quality-Gate vor Merge: Prüft Vollständigkeit und Standards |

**Workflow:** `PROJECT_BRIEF.md` ausfüllen → `@requirements-engineer` aufrufen → der orchestriert die weiteren Agents.

---

## Installierte Skills (5)

| Skill | Quelle | Regeln | Zweck |
|---|---|---|---|
| `conventional-commit` | marcelorodrigo/agent-skills | 1 | Commit-Message-Format (feat, fix, chore, ...) |
| `framer-motion` | pproenca/dot-skills | 42 | Animations-Performance & Patterns |
| `next-best-practices` | vercel-labs/next-skills | 20+ | Next.js 15+ Best Practices (Vercel offiziell) |
| `tailwind-v4-shadcn` | jezweb/claude-skills | 8+ | Tailwind v4 + shadcn/ui Setup & Migration |
| `vercel-react-best-practices` | vercel-labs/agent-skills | 57 | React Performance (Vercel offiziell) |

**Hinweis:** Die Skills liegen als Quelldateien in `.agents/skills/`. Die Ordner `.claude/skills/`, `skills/` und `.agent/skills/` enthalten **Symlinks** darauf, damit verschiedene AI-Agents (Claude Code, Copilot, etc.) automatisch Zugriff haben.

> **Optionale Symlinks:** `.cursor/` und `.vibe/` werden nur angelegt, wenn die jeweilige IDE (Cursor bzw. Mistral Vibe) auf dem System installiert ist. Auf Windows werden Symlinks als Junction-Points erstellt — der Glob-basierte Dateibaum in manchen Tools zeigt sie daher nicht an, Datei-Zugriffe funktionieren aber normal.

---

## Empfohlene VS Code Extensions (7)

| Extension | Zweck |
|---|---|
| `editorconfig.editorconfig` | EditorConfig Support |
| `github.vscode-github-actions` | GitHub Actions Syntax |
| `redhat.vscode-yaml` | YAML Validation |
| `dbaeumer.vscode-eslint` | ESLint Integration |
| `esbenp.prettier-vscode` | Prettier Formatter |
| `bradlc.vscode-tailwindcss` | Tailwind CSS IntelliSense |
| `ms-python.python` | Python Support |
