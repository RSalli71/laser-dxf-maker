# AGENTS.md — Regeln für AI/Agenten (universal)

## 0) Orientierung: Kanonische Dateien und Workflow
- Der zentrale Ablauf steht in `docs/workflow.md`.
- Der Projektbrief startet in `PROJECT_BRIEF.md`.
- Fachliche Anforderungen liegen in `docs/requirements/REQUIREMENTS.md`.
- Die technische Zielarchitektur liegt in `docs/ARCHITECTURE.md`.
- Test-Ergebnisse und QA-Status liegen in `docs/reports/TEST_REPORT.md`.
- Laufende Aenderungen kommen in `docs/DEVLOG.md`.
- Wichtige Warum-Entscheidungen kommen in `docs/DECISIONS.md`.
- Team-Checklisten liegen in `docs/team-doku/`.
- Obsidian-Wissensnotizen liegen in `docs/knowledge/` und referenzieren Runtime-Dateien, ersetzen sie aber nicht.

## 0.1) Rollen und operative Agent-Dateien
- Requirements Engineer: `.claude/agents/requirements-engineer.md`
- Solution Architect: `.claude/agents/solution-architect.md`
- Frontend Developer: `.claude/agents/frontend-developer.md`
- Backend Developer: `.claude/agents/backend-developer.md`
- Database Engineer: `.claude/agents/database-engineer.md`
- QA Engineer: `.claude/agents/qa-engineer.md`
- Code Reviewer: `.claude/agents/code-reviewer.md`
- Gatekeeper: `.claude/agents/gatekeeper.md`

## 0.2) Skills: kanonische Quelle
- Die kanonische Skill-Quelle ist `.agents/skills/`.
- Kompatibilitaetspfade wie `.claude/skills/` oder `skills/` sind nur Ableitungen derselben Skill-Basis.
- Relevante Wissensnotizen zu Skills liegen unter `docs/knowledge/skills/`.

## 0.3) Arbeitsreihenfolge
- Folge immer zuerst `docs/workflow.md`.
- Springe nicht direkt in Implementierung, wenn Requirements oder Architektur fuer den aktuellen Schritt noch fehlen.
- Verweise in Status, Reviews und Handoffs immer auf die kanonischen Dateien unter `docs/`.

## 1) So arbeiten wir (kleine, sichere Schritte)
- Arbeite in kleinen, überprüfbaren Schritten (max. 1–3 Dateien pro Schritt).
- Vor Änderungen: nenne kurz den Plan + welche Dateien du änderst.
- Nach Änderungen: kurzer Self-Check (Risiken/Edge-Cases) + wie ich es testen kann.
- Wenn der Auftrag eine bestimmte Rolle betrifft, lies zuerst die zugehoerige Agent-Datei unter `.claude/agents/` und den passenden Abschnitt in `docs/workflow.md`.

## 2) Qualität
- Bevorzuge einfache, robuste Lösungen statt “clever”.
- Keine Breaking Changes ohne Hinweis + kurze Migration/Alternative.
- Neue Dependencies nur, wenn wirklich nötig (kurz begründen).

## 3) Sicherheit
- Niemals Secrets (API Keys, Passwörter, Tokens) in Code, Logs oder Doku schreiben.
- Keine geheimen Dateien (.env, private Keys) in Antworten kopieren.

## 4) Doku-Pflicht bei relevanten Änderungen
- Bei wichtigen Änderungen: docs/DEVLOG.md aktualisieren (3–6 Bulletpoints).
- Wenn ein "Warum" wichtig ist: docs/DECISIONS.md kurz ergänzen.
- Requirements nie in freie Notizen auslagern, sondern in `docs/requirements/REQUIREMENTS.md` pflegen.
- Test-Resultate nie nur im Chat lassen, wenn sie als Artefakt erwartet sind: dann `docs/reports/TEST_REPORT.md` aktualisieren.

## 5) Next.js Konventionen
- **App Router** verwenden (src/app/). Kein Pages Router.
- Unterscheide **Server Components** (default) und **Client Components** ("use client").
- "use client" nur wenn nötig: Event-Handler, Hooks (useState, useEffect), Browser-APIs, Framer Motion.
- Datenabfragen bevorzugt in Server Components (async/await, kein useEffect).
- Layouts (`layout.tsx`) für gemeinsame UI-Elemente, nicht in jeder Page wiederholen.
- Metadata via `export const metadata` oder `generateMetadata()` in Server Components.

## 6) Styling & UI
- **Tailwind CSS v4** für Styling. Keine inline-styles oder CSS-Module ohne Grund.
- **shadcn/ui** Komponenten via CLI installieren (`npx shadcn@latest add <component>`).
- shadcn/ui Komponenten liegen in `src/components/ui/` — dort nicht manuell editieren.
- Eigene Komponenten in `src/components/shared/`.
- `cn()` Helper aus `src/lib/utils.ts` für bedingte Klassen verwenden.

## 7) Animationen
- **Framer Motion** für Animationen. Nur in Client Components ("use client").
- Bevorzuge `motion.*` Komponenten statt CSS-Animationen für komplexe Übergänge.
- Einfache Hover/Focus-States mit Tailwind lösen, nicht mit Framer Motion.

## 8) Handoffs und Referenzen
- Requirements-Handoff: `PROJECT_BRIEF.md` → `docs/requirements/REQUIREMENTS.md`
- Architektur-Handoff: `docs/requirements/REQUIREMENTS.md` → `docs/ARCHITECTURE.md`
- Implementierungs-Handoff: `docs/ARCHITECTURE.md` → `src/`, `tests/`, DB-Artefakte
- QA-Handoff: `src/` und `tests/` → `docs/reports/TEST_REPORT.md`
- Review- und Gate-Handoff folgen der Reihenfolge in `docs/workflow.md`.
- Wenn unklar ist, wer als Nächstes dran ist, gilt `docs/workflow.md` vor Bauchgefuehl.
