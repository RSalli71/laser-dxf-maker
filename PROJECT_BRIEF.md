# Projekt-Brief

> Füll dieses Dokument aus, bevor du die Agents startest.
> Ersetze alle `___` mit deinen Angaben. Lass Felder leer wenn unklar.
>
> **Danach:** zuerst `docs/workflow.md` beachten und dann den Requirements Engineer ueber `.claude/agents/requirements-engineer.md` starten.

---

## 0. Orientierung nach dem Brief

- Dieser Brief ist nur der Einstiegspunkt.
- Der naechste kanonische Output ist `docs/requirements/REQUIREMENTS.md`.
- Danach folgt `docs/ARCHITECTURE.md`.
- QA-Ergebnisse landen spaeter in `docs/reports/TEST_REPORT.md`.
- Wichtige Aenderungen und Entscheidungen werden in `docs/DEVLOG.md` und `docs/DECISIONS.md` festgehalten.
- Der komplette Ablauf steht in `docs/workflow.md`.

### Zustaendige Folge-Rollen

- Requirements Engineer: `.claude/agents/requirements-engineer.md`
- Solution Architect: `.claude/agents/solution-architect.md`
- Frontend Developer: `.claude/agents/frontend-developer.md`
- Backend Developer: `.claude/agents/backend-developer.md`
- Database Engineer: `.claude/agents/database-engineer.md`
- QA Engineer: `.claude/agents/qa-engineer.md`
- Code Reviewer: `.claude/agents/code-reviewer.md`
- Gatekeeper: `.claude/agents/gatekeeper.md`

---

## 1. Projektname & Einzeiler

- **Name:** ___
- **Was macht die App in einem Satz?** ___
- **Beispiel:** "Terminbuchung für Friseursalons – Kunden buchen online, Inhaber verwalten Kalender."

## 2. Zielgruppen / Rollen

Wer benutzt die App? Mindestens 2 Rollen angeben.

| Rolle | Beschreibung | Beispiel-Aktionen |
|-------|-------------|-------------------|
| ___ | ___ | ___ |
| ___ | ___ | ___ |
| ___ (optional) | ___ | ___ |

## 3. Kern-Features (MVP)

Die **3–5 wichtigsten** Features. Nur was zum Launch da sein MUSS.

1. ___
2. ___
3. ___
4. ___ (optional)
5. ___ (optional)

## 4. Nice-to-Have (nach MVP)

Was kommt später? Hilft den Agents, den Scope zu begrenzen.

- ___
- ___

## 5. Tech-Stack

Das Template bringt bereits mit: Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, Framer Motion, Lucide Icons.
Füll nur aus, was **zusätzlich** nötig ist oder vom Default abweicht.

| Entscheidung | Deine Wahl | Template-Default |
|-------------|-----------|-----------------|
| **Datenbank** | ___ | (keiner – ausfüllen!) |
| **Auth** | ___ | (keiner – ausfüllen!) |
| **ORM / DB-Client** | ___ | (keiner – ausfüllen!) |
| **Hosting** | ___ | `Vercel` |
| **E-Mail** | ___ | (keiner – nur wenn nötig) |
| **File-Upload** | ___ | (keiner – nur wenn nötig) |
| **Payment** | ___ | (keiner – nur wenn nötig) |

## 6. Komplexität

Wähle EINE Option – steuert wie viel Auth/RBAC/Infrastruktur generiert wird.

- [ ] **Simple** – Login/Logout, 1–2 Rollen, kein Multi-Tenant
- [ ] **Standard** – 2–3 Rollen mit unterschiedlichen Rechten, Row-Level-Security
- [ ] **Enterprise** – Multi-Tenant, Permission-Matrix, Audit-Logs

> **Tipp:** Starte mit Simple. Upgraden geht immer.

## 7. Design-Referenzen (optional)

Apps oder Websites, die ähnlich aussehen/funktionieren sollen?

- ___
- ___

## 8. Sonstiges

Besonderheiten, Einschränkungen, Wünsche?

> ___

---

## 9. Uebergabe-Regel nach dem Ausfuellen

- Brief fertigstellen.
- `docs/workflow.md` kurz gegenlesen.
- Danach den Requirements Engineer starten.
- Keine Architektur, Tests oder Implementierungsdetails direkt hier festhalten, wenn sie spaeter in die kanonischen Dateien unter `docs/` gehoeren.
