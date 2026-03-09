# Projekt-Brief — Laser DXF-Maker

> Dieser Brief ist der Einstiegspunkt für alle Agenten.
> Danach: `docs/workflow.md` beachten und dann den
> Requirements Engineer über `.claude/agents/requirements-engineer.md` starten.

---

## 0. Orientierung nach dem Brief

- Dieser Brief ist nur der Einstiegspunkt.
- Der nächste kanonische Output ist `docs/requirements/REQUIREMENTS.md`.
- Danach folgt `docs/ARCHITECTURE.md`.
- QA-Ergebnisse landen später in `docs/reports/TEST_REPORT.md`.
- Wichtige Änderungen in `docs/DEVLOG.md` und `docs/DECISIONS.md`.
- Der komplette Ablauf steht in `docs/workflow.md`.

### Zuständige Folge-Rollen

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

- **Name:** Laser DXF-Maker
- **Was macht die App in einem Satz?**
  Ein Browser-Tool das rohe Kunden-DXF-Dateien einliest, bereinigt,
  nach Schnitttypen klassifiziert (Außenkontur, Innenkontur, Biegung,
  Gravur) und als saubere DXF-Datei für Laser-Schneidmaschinen exportiert.

---

## 2. Zielgruppen / Rollen

| Rolle | Beschreibung | Beispiel-Aktionen |
|---|---|---|
| **Bediener** | Laserschneider der die App täglich nutzt | DXF hochladen, Konturen markieren, exportieren |
| **Admin** | Verwaltet Kunden und Projekte | Kunden anlegen, Projekthistorie einsehen |
| **Kunde** *(Phase 2)* | Liefert DXF-Dateien | DXF hochladen, Vorschau ansehen |

---

## 3. Kern-Features (MVP)

1. **DXF Upload & Anzeige** — DXF-Datei hochladen, parsen, als SVG anzeigen
2. **Elemente klassifizieren** — Per Klick einer Kategorie zuweisen
3. **Bereinigung** — Nicht markierte löschen, Duplikate automatisch entfernen
4. **Layer & Farben** — Automatisch nach Kategorie zuweisen
5. **DXF Export** — Bereinigte DXF R12 Datei herunterladen

---

## 4. Nice-to-Have (nach MVP)

- Kunden & Projektverwaltung mit Supabase
- Projekthistorie pro Kunde
- PDF-Vorschau für Kunden
- Lasso-Selektion (mehrere Elemente gleichzeitig)
- Undo / Redo

---

## 5. Tech-Stack

| Entscheidung | Wahl | Begründung |
|---|---|---|
| **Framework** | Next.js 16, React 19 | Template-Standard |
| **Styling** | Tailwind v4 + shadcn/ui | Template-Standard |
| **SVG-Editor** | Wiederverwendet aus bestehendem Projekt | Fertige Architektur! |
| **DXF-Parser** | Selbst geschrieben (R12 ASCII) | Volle Kontrolle |
| **Datenbank** | Supabase *(Phase 2)* | Lokal zuerst |
| **Auth** | Supabase Auth *(Phase 2)* | Passt zu Supabase |
| **Hosting** | Vercel | Template-Standard |

---

## 6. Komplexität

- [x] **Simple** — Lokal zuerst, kein Auth im MVP
- [ ] Standard
- [ ] Enterprise

---

## 7. Wiederverwendete Architektur ⭐

> Wichtig für Solution Architect und Frontend Developer!
> Lies: `docs/architecture/DXF_EDITOR_ARCHITECTURE_BRIEFING.md`

### Was bereits fertig ist (aus bestehendem Projekt übernehmen):

| Komponente | Datei | Was es macht |
|---|---|---|
| Datenmodell | `DxfEntityV2` Interface | Alle Entitätstypen mit Koordinaten |
| SVG-Rendering | `EntityPath.tsx` | Entity → SVG `<path>` Konvertierung |
| Viewport | `useEditorViewport` Hook | Zoom, Pan, Fit-to-View |
| Editor-Shell | `DxfEditor.tsx` | SVG-Container, Pointer-Events |
| Helper | `viewbox.ts`, `zoom.ts`, `pan.ts` | Pure Funktionen |

### Was NEU gebaut werden muss:

| Feature | Beschreibung |
|---|---|
| DXF R12 Parser | ASCII DXF einlesen → `DxfEntityV2[]` |
| Klassifizierungs-UI | Buttons: Außenkontur / Innenkontur / Biegung / Gravur |
| Layer-Logik | Markierte Elemente → Layer + Farbe |
| Auto-Bereinigung | Nicht markierte löschen, Duplikate entfernen |
| DXF R12 Exporter | `DxfEntityV2[]` → DXF R12 ASCII |
| Kunden/Projekt-Form | Name, Projektnummer vor dem Start |
| Lokaler Speicher | `localStorage` Phase 1, Supabase Phase 2 |

---

## 8. Unterstützte DXF-Entitäten

**Format:** AutoCAD DXF R12 (ASCII)

| Entität | Priorität | Hinweis |
|---|---|---|
| `LINE` | Pflicht | |
| `CIRCLE` | Pflicht | |
| `ARC` | Pflicht | CCW-Winkel → SVG beachten |
| `POLYLINE` / `LWPOLYLINE` | Pflicht | Wichtigste Kontur-Entität |
| `TEXT` | Pflicht | Gravuren |
| `SPLINE` | Nice-to-have | In R12 als Polyline gespeichert |

---

## 9. Layer-System

| Layer | Farbe | Hex | Zweck |
|---|---|---|---|
| `CUT_OUTER` | Rot | `#FF0000` | Außenkontur |
| `CUT_INNER` | Blau | `#0000FF` | Innenkontur / Ausschnitte |
| `BEND` | Gelb | `#FFFF00` | Biegelinien |
| `ENGRAVE` | Grün | `#00CC00` | Gravuren / Text |

---

## 10. Kern-Workflow

```
1. Kunde & Projekt festlegen
        ↓
2. DXF-Datei hochladen
        ↓
3. DXF parsen → DxfEntityV2[]
        ↓
4. SVG anzeigen (wiederverwendeter Editor)
        ↓
5. Elemente markieren (Außenkontur / Innenkontur / Biegung / Gravur)
        ↓
6. Nicht markiertes löschen
        ↓
7. Auto-Bereinigung (Duplikate, Nulllinien)
        ↓
8. Layer + Farben automatisch zuweisen
        ↓
9. Vorschau der bereinigten Zeichnung
        ↓
10. DXF R12 exportieren & herunterladen
        ↓
11. Lokal speichern (Phase 1) → Supabase (Phase 2)
```

---

## 11. Offene Fragen für Requirements Engineer

- [ ] Wie viele Elemente hat eine typische Kunden-DXF?
- [ ] Soll Lasso-Selektion im MVP dabei sein?
- [ ] Welche Laser-Software liest die DXF? (LightBurn? RDWorks?)
- [ ] Nur lokal oder im Internet erreichbar?
- [ ] Braucht es Undo/Redo im MVP?

---

## 12. Erfolgskriterien

- [ ] Echte Kunden-DXF kann hochgeladen und angezeigt werden
- [ ] Alle Entitäten können markiert und klassifiziert werden
- [ ] Exportierte DXF wird von LightBurn korrekt gelesen
- [ ] Workflow dauert unter 5 Minuten pro Datei
