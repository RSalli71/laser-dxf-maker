# Ship-Safe Checklist
*Goal: Safely finalize changes (summary, tests, documentation)*

---
**Beschreibung (Deutsch):**
Diese Checkliste stellt sicher, dass Änderungen vor dem Zusammenführen oder Veröffentlichen sicher abgeschlossen werden.
Befolge die Schritte, um deine Arbeit entlang von `docs/workflow.md` sauber abzuschließen, zu testen und zu dokumentieren.

---

## Steps

1) **Kurz zusammenfassen (5–10 Bulletpoints)**
  - Was wurde geändert? Was ist der Nutzen?
  - Welche Outputs aus `docs/workflow.md` wurden angepasst? Zum Beispiel `src/`, `tests/`, `docs/requirements/REQUIREMENTS.md`, `docs/ARCHITECTURE.md` oder `docs/reports/TEST_REPORT.md`.

2) **Lokale Checks ausführen**
   - Empfohlen:
     ```bash
     bash scripts/ship-safe.sh
     ```
   - Falls Dependencies fehlen:
     ```bash
     INSTALL_DEPS=1 bash scripts/ship-safe.sh
     ```
   - Falls nur ein Teilbereich geändert wurde, zuerst den kleinsten sinnvollen Check ausführen, zum Beispiel:
     ```bash
     npm run lint
     npm run typecheck
     ```

3) **DEVLOG aktualisieren (wenn relevant)**
   - Mindestens ein Eintrag pro relevanter Session:
     ```markdown
     ## 2025-12-22 — Short topic
     - **Goal/Problem:**
       - ...
     - **Changes:**
       - ...
     - **Result:**
       - ...
     - **Next Steps:**
       - ...
     - **Verify (commands/steps):**
       - `bash scripts/ship-safe.sh`
     ```
     - Wenn QA betroffen ist: Ergebnisse in `docs/reports/TEST_REPORT.md` nachziehen.
     - Wenn Anforderungen oder Architektur geändert wurden: `docs/requirements/REQUIREMENTS.md` oder `docs/ARCHITECTURE.md` aktualisieren.

4) **(Optional) Entscheidung dokumentieren**
   - Wenn später “Warum?” wichtig ist: `docs/DECISIONS.md` ergänzen.

5) **PR-Text vorbereiten**
   - Titel + 3 Bulletpoints (Was/Warum/Wie geprüft).

6) **Ordnerregeln gegenprüfen**
   - Produktivcode liegt nur in `src/`.
   - Tests liegen in `tests/`.
   - Prototypen bleiben in `vibe/`.
   - Samples, Fixtures und Korrekturen liegen in `data/`.
   - Hilfsprogramme liegen in `tools/`.

7) **Handoff im Workflow sauber machen**
   - Nach Developer-Änderungen: QA in `tests/` und `docs/reports/TEST_REPORT.md` ermöglichen.
   - Vor Review/Gate: keine offenen Debug-Ausgaben, keine ungeklärten TODOs ohne Kontext, relevante Doku aktualisiert.
