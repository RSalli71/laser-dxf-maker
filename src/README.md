# src/ — Production Code

`src/` enthält **Produktionscode**: stabil, wartbar, deploybar.

## Grundregeln
- **Kein Import aus `vibe/`** (niemals).
- Code in `src/` ist **reviewbar**: klare Struktur, saubere API-Schnittstellen.
- Wenn ein Spike aus `vibe/` dauerhaft gebraucht wird → **promote** nach `src/` (siehe README).

## Empfohlene Struktur (Beispiele)
> Passe die Struktur an deinen Stack an – wichtig ist Konsistenz.

### Variante A: Domain/Feature basiert (empfohlen)
src/
auth/
components/
server/
types.ts
projects/
ui/
server/
model.ts
shared/
utils/
types/


### Variante B: Layered
rc/
ui/
server/
data/
lib/

## Definition of Done (DoD) für Änderungen in src/
- Lint/Typecheck/Test/Build laufen (soweit vorhanden)
- Keine toten TODOs ohne Kontext
- Keine Secrets/Keys/PII in Code oder Logs
- DEVLOG aktualisiert, wenn Änderung relevant ist
- Entscheidung dokumentiert, wenn „Warum?“ später wichtig ist (DECISIONS)

## Promote-Checkliste (vibe → src)
Wenn du etwas aus `vibe/` nach `src/` übernimmst:
1) Inputs/Outputs klar definieren
2) Side-Effects minimieren
3) Mindestens 1 Happy-Path + 1 Edge-Case testen (oder begründen)
4) Docs: DEVLOG (und ggf. DECISIONS) ergänzen
5) `bash scripts/ship-safe.sh`
