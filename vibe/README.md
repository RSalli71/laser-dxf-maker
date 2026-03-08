# vibe/ — Spikes & Prototypes (Temporary)

`vibe/` ist die **Spielwiese**: schnelle Experimente, Prototypen, Spikes.
Hier darf Code „quick & dirty“ sein – **aber nur temporär**.

## Was ist erlaubt?
✅ Erlaubt in `vibe/`:
- Proof-of-Concepts / Spikes
- API-Experimente (Parsing, Requests, Mocking)
- Einmalige Test-Skripte
- Architektur-/Flow-Skizzen

## Was ist nicht erlaubt?
❌ Nicht dauerhaft in `vibe/` lassen:
- Code, der von `src/` importiert wird
- Business-Logik, die produktiv genutzt wird
- Security-kritische Dinge (Auth, Secrets Handling, Zugriffsschlüssel)
- Alles, was deployt wird

## Struktur-Empfehlung
- Lege Spikes in klar benannten Ordnern ab, z.B.:
  - `vibe/2026-01-03-api-spike/`
  - `vibe/issue-123-parsing-test/`

Optional:
- `vibe/_examples/` kann 1–2 Mini-Beispiele enthalten (nur Orientierung, nicht „Produkt“).

## Cleanup-Regel
- Spikes älter als **30 Tage**: löschen oder promoten (im DEVLOG kurz notieren).

## Promote-Kriterien (vibe → src)
Promote nach `src/`, wenn:
- du den Code **mehr als einmal** brauchst,
- es Teil eines Features ist,
- du es deployen willst,
- Stabilität wichtig wird.

Checkliste: siehe `src/README.md`.
