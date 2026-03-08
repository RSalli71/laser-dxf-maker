# Ship-Safe Checklist
*Goal: Safely finalize changes (summary, tests, documentation)*

---
**Beschreibung (Deutsch):**
Diese Checkliste stellt sicher, dass Änderungen vor dem Zusammenführen oder Veröffentlichen sicher abgeschlossen werden.
Befolge die Schritte, um deine Arbeit zusammenzufassen, zu testen und zu dokumentieren.

---

## Steps

1) **Kurz zusammenfassen (5–10 Bulletpoints)**
   - Was wurde geändert? Was ist der Nutzen?

2) **Lokale Checks ausführen**
   - Empfohlen:
     ```bash
     bash scripts/ship-safe.sh
     ```
   - Falls Dependencies fehlen:
     ```bash
     INSTALL_DEPS=1 bash scripts/ship-safe.sh
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

4) **(Optional) Entscheidung dokumentieren**
   - Wenn später “Warum?” wichtig ist: `docs/DECISIONS.md` ergänzen.

5) **PR-Text vorbereiten**
   - Titel + 3 Bulletpoints (Was/Warum/Wie geprüft).
