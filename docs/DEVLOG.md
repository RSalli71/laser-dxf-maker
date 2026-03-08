# Development Log (DEVLOG)
> Zweck: Pro Session/Tag kurz dokumentieren, was gemacht wurde, warum, wie geprüft wurde, und was als nächstes kommt.  
> Regel: Bei relevanten Änderungen **mindestens einen Eintrag** ergänzen.

---

## Guidelines
- **Kurz halten:** 5–15 Zeilen pro Eintrag reichen fast immer.
- **Nachvollziehbar:** Ziel → Änderungen → Ergebnis → Next Steps.
- **Verify ist Pflicht:** mindestens 1–3 konkrete Commands/Schritte.
- **Verlinken:** Issue/PR/Decision/Commit, wenn vorhanden.

---

## Template (copy/paste)

## YYYY-MM-DD — Session/Topic
- **Goal/Problem:**  
  - …
- **Changes:**  
  - …
- **Result:**  
  - …
- **Next Steps:**  
  - …
- **Refs:** (Issue/PR/Links, optional)  
- **Files touched:** (optional)  
- **Verify (commands/steps):**  
  - `...`

---

## Examples

## 2025-12-22 — Standardize template workflow for Vibe Coding
- **Goal/Problem:**
  - Einheitliche Struktur für Multi-Stack Projekte + Agent/Copilot Regeln.
- **Changes:**
  - Template-Struktur vereinheitlicht (`docs/`, `src/`, `vibe/`, `.agent/`, `scripts/`).
  - Guidelines für `vibe/ → src/` ergänzt.
- **Result:**
  - Onboarding schneller, Regeln klar, weniger Chaos bei Agent-Arbeit.
- **Next Steps:**
  - CI/ship-safe weiter harmonisieren (Single Source of Truth).
- **Verify (steps):**
  - README gelesen + Struktur geprüft (keine produktiven Imports aus `vibe/`)
