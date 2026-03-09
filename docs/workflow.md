# Workflow

## Reihenfolge
1. `PROJECT_BRIEF.md` ausfuellen
2. Requirements Engineer erzeugt Anforderungen
   Datei: `.claude/agents/requirements-engineer.md`
   Output: `docs/requirements/REQUIREMENTS.md`
3. Solution Architect erzeugt Architektur
   Datei: `.claude/agents/solution-architect.md`
   Output: `docs/ARCHITECTURE.md` und bei Bedarf `docs/DECISIONS.md`
4. Developer-Phase: Frontend Developer, Backend Developer oder Database Engineer setzen die Loesung um
   Dateien: `.claude/agents/frontend-developer.md`, `.claude/agents/backend-developer.md`, `.claude/agents/database-engineer.md`
   Output: produktiver Code in `src/`, DB-Artefakte in `prisma/` oder `supabase/`, Tests in `tests/` wenn Teil des Auftrags
5. Spikes und Experimente kommen zuerst nach `vibe/`
6. Daten und Samples landen in `data/`
7. Hilfsprogramme und kleine Utilities landen in `tools/`
8. Erst validierte Loesungen wandern nach `src/`
9. Tests kommen nach `tests/`
10. QA Engineer prueft Akzeptanzkriterien und Testabdeckung
   Datei: `.claude/agents/qa-engineer.md`
   Output: `tests/` und `docs/reports/TEST_REPORT.md`
11. Code Reviewer prueft Konsistenz und Risiken
   Datei: `.claude/agents/code-reviewer.md`
   Output: Review-Report im Chat
12. Gatekeeper gibt vor Merge frei
   Datei: `.claude/agents/gatekeeper.md`
   Output: Gatekeeper-Report im Chat

## Developer-Phase
- `frontend-developer` fuer UI, Pages, Components und Interaktionen
- `backend-developer` fuer Server-Logik, APIs, Import-Pipelines und Library-Code
- `database-engineer` fuer Schema, Migrations, RLS, Seeds und Types
- Je nach Aufgabe kann nur eine dieser Rollen noetig sein oder mehrere nacheinander

## Ordnerregeln
- `src/` enthaelt nur produktiven Code
- `vibe/` ist fuer Spikes, Prototypen und einmalige Experimente
- `data/` enthaelt Trainingsdaten, Samples, Fixtures und Korrekturen
- `tools/` enthaelt Hilfsprogramme, Konverter und Utilities
- `tests/` enthaelt Unit-, Integrations- und sonstige Testartefakte

## Regeln
- Kein Produktivcode ohne Acceptance Criteria
- Kein Merge ohne aktualisierte Doku
- Kein Feature ohne Tests fuer Kernlogik
- Kein unstrukturierter Datenimport in `src/`
- User-Korrekturen wandern nach `data/corrections/`
- Relevante Aenderungen in `docs/DEVLOG.md` dokumentieren
- Wichtige Warum-Entscheidungen in `docs/DECISIONS.md` festhalten

## Vor Merge
- Lokale Checks mit `bash scripts/ship-safe.sh` ausfuehren
- Bei Bugs den Ablauf aus `docs/team-doku/debug-bug.md` nutzen
- Bei groesseren Uebergaben die Team-Checkliste in `docs/team-doku/ship-safe.md` beachten
