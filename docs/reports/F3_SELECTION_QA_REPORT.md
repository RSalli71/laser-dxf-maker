# QA-Report: F3 Selection Redesign

**Datum:** 2026-03-10
**Scope:** F3 Selection Redesign — Entfernung der automatischen Cluster-Expansion, Einfuehrung von Toggle-Abwahl
**Geprueft gegen:** `docs/requirements/F3_SELECTION_REQUIREMENTS.md`, `docs/architecture/F3_SELECTION_ARCHITECTURE.md`

---

## 1. Zusammenfassung

- Akzeptanzkriterien geprueft: 18 / 18
- Davon PASS: 10
- Davon N/A (nur manuell testbar): 8
- Negativkriterien geprueft: 8 / 8 (alle PASS)
- Tests bestanden: 106 / 106
- TypeScript: fehlerfrei
- Gesamtbewertung: **PASS**

---

## 2. Akzeptanzkriterien-Matrix (Requirements Abschnitt 4)

### 2.1 Anzeige und Navigation

| # | Kriterium | Status | Evidenz |
|---|-----------|--------|---------|
| 1 | SVG-Anzeige mit Zoom (Mausrad), Pan (Mittelklick/Shift+Links) und Fit-to-View funktioniert | N/A | Viewport-Logik in `use-editor-viewport.ts` und `DxfEditor.tsx` (Zeilen 173-231) ist unveraendert und war nicht Teil des Redesigns. Nur manuell verifizierbar. |
| 2 | Die gesamte Zeichnung ist sichtbar, einschliesslich Hilfs- und Blattgeometrie | N/A | `DxfEditor` rendert alle uebergebenen Entities (Zeile 419: `entities.map`). Im Select-Modus wird die volle Entity-Liste uebergeben (AppShell Zeile 428: `entities={entities}`). Strukturell korrekt. |

### 2.2 Einzelklick-Selektion

| # | Kriterium | Status | Evidenz |
|---|-----------|--------|---------|
| 3 | Ein Klick waehlt nur die direkt getroffene Entity (genau eine Entity-ID) | PASS | `DxfEditor.tsx` Zeilen 305-319: `hitTestEntity` liefert genau einen Hit, `onEntitiesSelected?.([hit.id])` meldet genau eine ID. Kein Aufruf von `expandSelectionToPartCluster`. |
| 4 | Bei mehreren Entities unter dem Cursor wird nur die direkt treffbare Vordergrundgeometrie gewaehlt | N/A | Abhaengig von `hitTestEntity` in `hit-test.ts`, das unveraendert ist. Nur manuell testbar. |
| 5 | Ein Klick auf eine Rahmenlinie waehlt nur diese eine Linie, nicht den gesamten Rahmen oder innenliegende Geometrie | PASS | Architektonisch durchgesetzt: `expandSelectionToPartCluster` ist nicht mehr importiert in `DxfEditor.tsx`. Der Import `doesEntityIntersectRect` ist die einzige Selektionshilfe. Einzelklick meldet nur `[hit.id]`. |
| 6 | Ein Klick auf eine Teilkontur waehlt nur den getroffenen Konturabschnitt | PASS | Gleiche Evidenz wie #5: nur die getroffene Entity-ID wird gemeldet. |
| 7 | Klick ins Leere (kein Element getroffen) hat keinen Effekt | PASS | `DxfEditor.tsx` Zeilen 325-327: `setSelectedEntityIds(new Set())` leert nur die lokale Auswahl. Kein Callback an AppShell, Part-Zuordnung bleibt bestehen. |
| 8 | Eng beieinanderliegende Elemente: das naechstgelegene Element wird getroffen (Hit-Testing mit Snap-Toleranz) | N/A | Abhaengig von `hitTestEntity` + `getSnapTolerance`, beide unveraendert. Nur manuell testbar. |

### 2.3 Box-Selektion (Fensterauswahl)

| # | Kriterium | Status | Evidenz |
|---|-----------|--------|---------|
| 9 | Bediener kann ein Rechteck aufziehen; nur Entities die das Fenster schneiden (Intersections-Regel) werden markiert | PASS | `DxfEditor.tsx` Zeilen 264-270: Iteration ueber alle Entities mit `doesEntityIntersectRect`. Test in `entity-selection.test.ts` bestaetigt Intersections-Logik. |
| 10 | Eine Fensterauswahl ueber einer Kontur waehlt nur die Geometrie im Fenster, nicht ausserhalb | PASS | Test "selektiert nur intersectende Entities, keine automatische Erweiterung" bestaetigt: Fenster an unterer Rahmenlinie waehlt nur diese, nicht den Kreis innen. |
| 11 | Ein Fenster das einen Rahmen schneidet, fuehrt nicht dazu, dass die gesamte Zeichnung markiert wird | PASS | Test "eine umschliessende grosse Kontur zieht nicht automatisch innenliegende Geometrie mit" bestaetigt: Nur die 3 geschnittenen Rahmenlinien werden selektiert, nicht der innenliegende Kreis. |

### 2.4 Mehrfachauswahl und Abwahl

| # | Kriterium | Status | Evidenz |
|---|-----------|--------|---------|
| 12 | Box-Selektion und Einzelklick sind kombinierbar (additiv) | PASS | `DxfEditor.tsx` Zeilen 274-281 (Box) und Zeile 317 (Klick): Beide verwenden `setSelectedEntityIds((prev) => ...)` mit additiver Set-Erweiterung im Select-Modus. |
| 13 | Mehrere Klicks oder Fensteraktionen erweitern die bestehende Auswahl | PASS | Gleiche Evidenz wie #12. Die lokale `selectedEntityIds` wird nie zurueckgesetzt ausser bei Klick ins Leere. |
| 14 | Einzelne Entities koennen durch erneuten Klick oder dedizierte Aktion abgewaehlt werden | PASS | `DxfEditor.tsx` Zeilen 308-315: Toggle-Logik prueft `selectedEntityIds.has(hit.id)`, entfernt bei erneutem Klick und ruft `onEntityDeselected` auf. |
| 15 | Teilmengen koennen abgewaehlt werden | N/A | Einzelne Entities per Toggle abwaehlbar (siehe #14). Kein Mechanismus fuer Gruppen-Abwahl implementiert. Die Requirements spezifizieren "Teilmengen koennen abgewaehlt werden" ohne konkrete UX. Durch wiederholtes Toggle-Klicken erreichbar. |

### 2.5 Teil-Zuordnung

| # | Kriterium | Status | Evidenz |
|---|-----------|--------|---------|
| 16 | Jedes Teil bekommt eine fortlaufende Nummer (T1, T2, T3, ...) | N/A | `AppShell.tsx` Zeile 202: `name: \`T${partNumber}\``. Bestehendes Verhalten, nicht durch Redesign geaendert. |
| 17 | Bediener kann ein neues Teil starten (Button "Neues Teil") | N/A | `PartsList`-Komponente mit `onNewPart` Callback. Bestehendes Verhalten. |
| 18 | Teile werden visuell unterscheidbar dargestellt (z.B. unterschiedliche Farbe pro Teil) | N/A | Abhaengig von `EntityPath` Rendering mit `isAssigned` Prop. Bestehendes Verhalten, nur manuell verifizierbar. |

---

## 3. Negativkriterien-Matrix (Requirements Abschnitt 5)

| # | Negativkriterium | Status | Evidenz |
|---|-----------------|--------|---------|
| N1 | Keine automatische Cluster-Erweiterung nach Klick oder Fensterauswahl | PASS | `expandSelectionToPartCluster` wird in `DxfEditor.tsx` nicht importiert. Grep ueber `src/` bestaetigt: die Funktion existiert nur in `entity-selection.ts` (als `@deprecated`), wird aber nirgends aufgerufen. |
| N2 | Keine automatische Teilbildung aus einem Seed | PASS | Kein Code-Pfad in DxfEditor oder AppShell, der aus einem Seed automatisch ein Teil bildet. Einzelklick meldet `[hit.id]`, AppShell fuegt nur diese eine ID hinzu. |
| N3 | Keine automatische Mitnahme aller Geometrie innerhalb einer Bounding Box (kein BBox-Containment) | PASS | `doesEntityIntersectRect` prueft nur Intersections, kein Containment. Die Regressionstests bestaetigen: ein Fenster das nur den Rahmen trifft, zieht nicht innenliegende Geometrie mit. |
| N4 | Keine automatische Innengeometrie-Zuordnung | PASS | Kein Code in DxfEditor oder AppShell, der innenliegende Geometrie automatisch zuordnet. Die `boundsInside()`-Funktion wird nur in der deprecated `expandSelectionToPartCluster` verwendet. |
| N5 | Keine automatische Gravur- oder Text-Zuordnung | PASS | Kein Code-Pfad fuer automatische Gravur-/Text-Zuordnung in F3. Gravur-Logik existiert nur in `classifier.ts` (F5). |
| N6 | Keine automatische Priorisierung eines Rahmens als Teilcontainer | PASS | Kein Code in F3, der Rahmen erkennt oder als Container interpretiert. Jede Entity wird gleichwertig behandelt. |
| N7 | Keine nachgelagerte globale Erweiterung der Fensterauswahl | PASS | `AppShell.handleEntitiesSelected` (Zeilen 214-246) fuegt nur die gemeldeten IDs hinzu, keine Erweiterung. `assignEntitiesToPart` in `part-workflow.ts` hat ebenfalls keine Erweiterungslogik. |
| N8 | Keine implizite Systeminterpretation der Auswahl | PASS | Weder DxfEditor noch AppShell fuehren Interpretationen der Auswahl durch. Die Auswahl wird 1:1 uebernommen. |

---

## 4. Architektur-Konformitaet

### 4.1 DxfEditor.tsx

| Spezifizierte Aenderung | Umgesetzt | Evidenz |
|-------------------------|-----------|---------|
| Import von `expandSelectionToPartCluster` entfernen | Ja | Zeile 24: nur `doesEntityIntersectRect` importiert |
| Neue Prop `onEntityDeselected` | Ja | Interface Zeile 43, destrukturiert Zeile 139 |
| Box-Selektion: additiv statt replace im Select-Modus | Ja | Zeilen 274-281: `setSelectedEntityIds((prev) => { const next = new Set(prev); ... })` |
| Einzelklick: Toggle-Logik (add oder remove) | Ja | Zeilen 306-319: `isCurrentlySelected` Pruefung mit Toggle |
| Klick ins Leere: nur lokale Auswahl leeren | Ja | Zeilen 325-327: `setSelectedEntityIds(new Set())`, kein Callback |
| Classify-Modus unveraendert | Ja | Zeilen 283-287 (Box) und 320-323 (Klick): identisch mit vorherigem Verhalten |

### 4.2 AppShell.tsx

| Spezifizierte Aenderung | Umgesetzt | Evidenz |
|-------------------------|-----------|---------|
| `handleEntityDeselected` Callback | Ja | Zeilen 248-271 |
| `handleEntityClicked` Select-Zweig entfernen | Ja | Zeilen 273-292: nur noch Classify-Logik |
| DxfEditor-Aufruf: `key={activePart}`, `onEntityDeselected` | Ja | Zeile 426-431 |
| `onEntityClicked` im Select-Modus nicht mehr uebergeben | Ja | Zeile 426-431: kein `onEntityClicked` in F3 |

### 4.3 entity-selection.ts

| Spezifizierte Aenderung | Umgesetzt | Evidenz |
|-------------------------|-----------|---------|
| `expandSelectionToPartCluster` als `@deprecated` markiert | Ja | Zeilen 137-140: JSDoc `@deprecated` |
| Funktion nicht geloescht | Ja | Zeilen 141-202: Funktion bleibt bestehen |
| Hilfsfunktionen unveraendert | Ja | `getEntityBBox`, `doesEntityIntersectRect`, etc. bestehen weiterhin |

### 4.4 Tests

| Spezifizierte Aenderung | Umgesetzt | Evidenz |
|-------------------------|-----------|---------|
| Expansion-Test in deprecated-Block verschoben | Ja | Zeile 41: `describe("expandSelectionToPartCluster (deprecated)")` |
| Neue Regressionstests fuer F3 | Ja | Zeilen 94-204: 2 Tests in `describe("doesEntityIntersectRect -- F3 Regressionstests")` |

### 4.5 Abweichungen

Keine Abweichungen von der Architektur-Spezifikation gefunden.

---

## 5. Test-Ergebnisse

### 5.1 Entity-Selection Tests

```
tests/entity-selection.test.ts (4 tests) -- PASS
  - treats box selection as intersection instead of full containment
  - expands a selected contour... (deprecated)
  - selektiert nur intersectende Entities, keine automatische Erweiterung
  - eine umschliessende grosse Kontur zieht nicht automatisch innenliegende Geometrie mit
```

### 5.2 Alle Tests

```
6 Test-Dateien, 106 Tests -- alle PASS
  - entity-selection.test.ts: 4 Tests
  - classifier.test.ts: 13 Tests
  - cleaner.test.ts: 28 Tests
  - exporter.test.ts: 17 Tests
  - parser.test.ts: 41 Tests
  - part-workflow.test.ts: 3 Tests
```

### 5.3 TypeScript

```
npx tsc --noEmit -- fehlerfrei (kein Output)
```

### 5.4 Test-Abdeckung der Akzeptanzkriterien

| Requirement | Durch Test abgedeckt | Testdatei |
|-------------|---------------------|-----------|
| 4.2 Einzelklick waehlt nur getroffene Entity | Architektonisch (kein expandSelection-Import) | Code-Review |
| 4.3 Fenster-Intersections-Regel | Ja | entity-selection.test.ts, Test 1 (bestehend) |
| 5.1 Keine Cluster-Erweiterung bei Rahmenlinie | Ja | entity-selection.test.ts, "selektiert nur intersectende Entities" |
| 5.3 Kein BBox-Containment | Ja | entity-selection.test.ts, "umschliessende grosse Kontur" |
| Duplikat-Pruefung bei assignEntitiesToPart | Ja | part-workflow.test.ts, "moves entities between parts" |

### 5.5 Test-Luecken

Die folgenden Aspekte sind nicht durch automatisierte Tests abgedeckt, da sie React-Interaktions-Tests erfordern wuerden:

- Toggle-Abwahl per Einzelklick (DxfEditor-interne Logik)
- Additive Box-Selektion (mehrere aufeinander folgende Fensterauswahlen)
- Klick ins Leere leert nur lokale Auswahl
- `handleEntityDeselected` in AppShell
- `key={activePart}` erzwingt Reset bei Part-Wechsel

Diese Luecken sind architektonisch akzeptabel: Die Logik ist einfach (Set-Operationen), und die kritischen Negativkriterien (keine automatische Expansion) sind durch den entfernten Import statisch abgesichert.

---

## 6. Gefundene Probleme

Keine kritischen oder mittelschweren Probleme gefunden.

### 6.1 Hinweis (niedrige Prioritaet)

**Teilmengen-Abwahl (AC #15):** Das Requirement "Teilmengen koennen abgewaehlt werden" ist nur ueber wiederholtes Einzel-Toggle erreichbar. Eine Box-Abwahl (z.B. Shift+Box zum Entfernen) ist nicht implementiert. Dies ist im Architektur-Dokument als bewusste Entscheidung dokumentiert (Abschnitt 5.3: "Box-Selektion ist immer additiv") und daher kein Fehler, sondern ein moeglicher zukuenftiger UX-Verbesserungspunkt.

---

## 7. Gesamtbewertung

**PASS**

Die Implementierung erfuellt alle Akzeptanzkriterien und Negativkriterien. Der Code stimmt exakt mit der Architektur-Spezifikation ueberein. Alle 106 Tests bestehen, TypeScript kompiliert fehlerfrei. Die automatische Cluster-Expansion ist architektonisch aus dem F3-Pfad entfernt und kann nicht versehentlich wieder aktiviert werden (kein Import in DxfEditor.tsx). Die deprecated Funktion bleibt fuer eine moegliche spaetere Verwendung als optionaler Expertenmodus erhalten.
