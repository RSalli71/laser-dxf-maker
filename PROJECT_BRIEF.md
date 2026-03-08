# Projekt-Brief

> Füll dieses Dokument aus, bevor du die Agents startest.
> Ersetze alle `___` mit deinen Angaben. Lass Felder leer wenn unklar.
>
> **Danach:** `@requirements-engineer` aufrufen → der macht den Rest.

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

Das Template bringt bereits mit: Next.js 15, React 19, Tailwind CSS v4, shadcn/ui, Framer Motion, Lucide Icons.
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
