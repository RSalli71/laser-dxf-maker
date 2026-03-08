# Copilot Instructions (Repo-weit, universal)

## Arbeitsweise
- Arbeite in kleinen Schritten (max. 1–3 Dateien pro Änderung).
- Starte mit kurzem Plan + betroffene Dateien.
- Scope halten: keine Drive-by Refactors (nur was fürs Issue nötig ist).
- Bestehende Projekt-Patterns/Ordnerstruktur/Benennung beibehalten.

## Sicherheit
- Keine Secrets/Keys in Code oder Doku.
- Keine sensitiven Daten in Logs (Tokens, Session-Infos, personenbezogene Daten).

## Doku-Pflichten
- Bei relevanten Änderungen: docs/DEVLOG.md aktualisieren.
- Wenn eine Entscheidung “warum so?” wichtig ist: docs/DECISIONS.md ergänzen.

## Definition of Done (DoD)
- Checks müssen grün sein (mindestens lint + type-check/typecheck; zusätzlich tests/build falls vorhanden).
- Keine `any`/`ts-ignore` ohne kurze Begründung.
- Kein toter Code / keine TODOs ohne Kontext.

## Output-Format
- Antworte mit: Plan → Änderungen (Code/Diff) → Verify-Commands.
- Wenn Dateien geändert: Liste der Dateien + Kurzbegründung.
