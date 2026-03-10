# Requirements: F3 Selection (Teile definieren) — Redesign

> Erstellt am 2026-03-10 auf Basis von REQUIREMENTS.md (F3-Abschnitt) und docs/concepts/F3_SELECTION_STRATEGY.md.
> Dieses Dokument ersetzt den F3-Abschnitt in REQUIREMENTS.md fuer die Implementierung.
> Richtung B: Manuelle Selektion ohne automatische Expansion.

## 1. Ziel

F3 ist ein rein manueller Markierungsschritt. Der Bediener sieht die komplette Zeichnung und markiert gezielt die Geometrie, die als Teil weiterverarbeitet werden soll. Das System nimmt in F3 keine automatische Erweiterung, Cluster-Bildung oder Teilinterpretation vor.

### Problem (Ist-Zustand)

F3 mischt aktuell zwei Aufgaben:

1. Manuelle Auswahl durch den Nutzer (Klick/Fenster)
2. Automatische Expansion durch das System (`expandSelectionToPartCluster()`)

Bei Zeichnungen mit Rahmen, Schriftfeldern oder grossen umschliessenden Konturen fuehrt ein einzelner Klick oder eine kleine Fensterauswahl dazu, dass die gesamte Zeichnung oder grosse Teilbereiche automatisch mitgerissen werden.

### Loesung (Soll-Zustand)

Die automatische Cluster-Erweiterung wird aus dem Standard-F3-Pfad entfernt. F3 wird auf eine direkte, vorhersagbare Benutzerselektion reduziert.

### Nicht-Ziele (fuer dieses Redesign)

- Kontur- und komponentenbasiertes Auswahlmodell (Richtung A, spaetere Architekturverbesserung)
- Automatische Teilerkennung oder Seed-basierte Expansion
- Automatische Innengeometrie-Zuordnung
- Visuelle Depriorisierung von Hilfsgeometrie (separate Anzeigeentscheidung)
- Lasso-Selektion (Freihand-Auswahl)
- Undo/Redo

## 2. User Story

Als Bediener moechte ich in der SVG-Anzeige gezielt einzelne Entities oder Gruppen per Fenster markieren und einem Teil zuordnen, damit ich selbst bestimme, was zu einem Teil gehoert, ohne dass das System meine Auswahl automatisch erweitert.

## 3. Ablauf

1. Alle geparsten Entities werden als SVG mit Zoom, Pan und Fit-to-View dargestellt
2. Bediener waehlt Geometrie aus:
   - **Einzelklick:** Waehlt nur die direkt getroffene Entity
   - **Box-Selektion:** Rechteck aufziehen, nur Entities im Fenster werden markiert (Intersections-Regel)
   - **Additiv:** Mehrere Klicks oder Fensteraktionen erweitern die aktuelle Auswahl
   - **Abwahl:** Einzelne Entities oder Teilmengen koennen wieder abgewaehlt werden
3. Bediener ordnet die markierte Geometrie dem aktiven Teil zu
4. Jedes Teil bekommt eine fortlaufende Nummer (T1, T2, T3, ...)
5. Bediener kann mehrere Teile in derselben Zeichnung definieren
6. Nicht zugeordnete Entities werden spaeter verworfen

## 4. Akzeptanzkriterien

### Anzeige und Navigation

- [ ] SVG-Anzeige mit Zoom (Mausrad), Pan (Mittelklick/Shift+Links) und Fit-to-View funktioniert
- [ ] Die gesamte Zeichnung ist sichtbar, einschliesslich Hilfs- und Blattgeometrie

### Einzelklick-Selektion

- [ ] Ein Klick waehlt nur die direkt getroffene Entity (genau eine Entity-ID)
- [ ] Bei mehreren Entities unter dem Cursor wird nur die direkt treffbare Vordergrundgeometrie gewaehlt
- [ ] Ein Klick auf eine Rahmenlinie waehlt nur diese eine Linie, nicht den gesamten Rahmen oder innenliegende Geometrie
- [ ] Ein Klick auf eine Teilkontur waehlt nur den getroffenen Konturabschnitt
- [ ] Klick ins Leere (kein Element getroffen) hat keinen Effekt
- [ ] Eng beieinanderliegende Elemente: das naechstgelegene Element wird getroffen (Hit-Testing mit Snap-Toleranz)

### Box-Selektion (Fensterauswahl)

- [ ] Bediener kann ein Rechteck aufziehen; nur Entities die das Fenster schneiden (Intersections-Regel) werden markiert
- [ ] Eine Fensterauswahl ueber einer Kontur waehlt nur die Geometrie im Fenster, nicht ausserhalb
- [ ] Ein Fenster das einen Rahmen schneidet, fuehrt nicht dazu, dass die gesamte Zeichnung markiert wird

### Mehrfachauswahl und Abwahl

- [ ] Box-Selektion und Einzelklick sind kombinierbar (additiv)
- [ ] Mehrere Klicks oder Fensteraktionen erweitern die bestehende Auswahl
- [ ] Einzelne Entities koennen durch erneuten Klick oder dedizierte Aktion abgewaehlt werden
- [ ] Teilmengen koennen abgewaehlt werden

### Teil-Zuordnung

- [ ] Jedes Teil bekommt eine fortlaufende Nummer (T1, T2, T3, ...)
- [ ] Bediener kann ein neues Teil starten (Button "Neues Teil")
- [ ] Teile werden visuell unterscheidbar dargestellt (z.B. unterschiedliche Farbe pro Teil)
- [ ] Die Teildefinition entsteht ausschliesslich aus der Summe der explizit markierten Geometrie
- [ ] Elemente die keinem Teil zugeordnet sind, werden spaeter verworfen
- [ ] Eine Uebersicht zeigt alle definierten Teile mit Anzahl der Entities pro Teil

## 5. Negativkriterien (was F3 ausdruecklich NICHT tun darf)

- [ ] Keine automatische Cluster-Erweiterung nach Klick oder Fensterauswahl
- [ ] Keine automatische Teilbildung aus einem Seed
- [ ] Keine automatische Mitnahme aller Geometrie innerhalb einer Bounding Box (kein BBox-Containment)
- [ ] Keine automatische Innengeometrie-Zuordnung
- [ ] Keine automatische Gravur- oder Text-Zuordnung
- [ ] Keine automatische Priorisierung eines Rahmens als Teilcontainer
- [ ] Keine nachgelagerte globale Erweiterung der Fensterauswahl
- [ ] Keine implizite Systeminterpretation der Auswahl

## 6. Betroffene Dateien und technische Constraints

### Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/editor/DxfEditor.tsx` | `expandSelectionToPartCluster()` im Select-Modus entfernen (Zeile 279: nach Box-Selektion, Zeile 303: nach Einzelklick) |
| `src/lib/editor/entity-selection.ts` | Fuer F3 auf Hilfsfunktionen reduzieren (BBox-Berechnung, Intersections-Pruefung). `expandSelectionToPartCluster()` nicht mehr im Standard-F3-Pfad verwenden |
| `src/components/shared/AppShell.tsx` | Nur explizit vom Editor gemeldete Entity-IDs dem aktiven Teil zuordnen. Keine implizite Erweiterung in der Workflow-Schicht |
| `tests/entity-selection.test.ts` | Tests an neues Zielbild anpassen. Tests die automatische Expansion erwarten, muessen ersetzt oder verschoben werden |

### Verantwortlichkeitstrennung

- **Editor (`DxfEditor.tsx`):** Bestimmt, was der Nutzer markiert hat. Meldet Entity-IDs.
- **Workflow (`AppShell.tsx`):** Nimmt die gemeldeten IDs entgegen und ordnet sie dem aktiven Teil zu. Keine eigene Selektionslogik.
- **Hilfsfunktionen (`entity-selection.ts`):** Stellt geometrische Hilfsfunktionen bereit (BBox, Intersections). Keine Teilbildungslogik fuer F3.

### Modi-Trennung im Editor

- **Select-Modus (F3):** Rein manuelle Auswahl, keine automatische Expansion
- **Classify-Modus (F5):** Praezise Einzel- oder Box-Zuordnung fuer Klassifizierungen

Der Select-Modus darf keine versteckte Teillogik enthalten.

## 7. Erforderliche Tests

- [ ] Fensterauswahl liefert nur Entities die das Fenster schneiden (Intersections)
- [ ] Einzelklick im Select-Modus liefert genau eine Entity-ID, keine Cluster-Erweiterung
- [ ] Eine umschliessende grosse Kontur (Rahmen) zieht nicht automatisch innenliegende Geometrie mit
- [ ] Ein Klick innerhalb eines Rahmens waehlt nicht die gesamte Rahmenflaeche oder den Gesamtbestand
- [ ] Abwahl einer einzelnen Entity aus bestehender Auswahl funktioniert
- [ ] Mehrere additive Fensterauswahlen ergeben die korrekte Vereinigungsmenge

## 8. Abgrenzung zu F4 und F5

| Schritt | Verantwortung | Intelligenz |
|---------|--------------|-------------|
| **F3** | Manuelle Markierung durch den Bediener | Keine automatische Systeminterpretation |
| **F4** | Automatische Bereinigung pro Teil | Entfernung von Bemassungen, Duplikaten, Gewinde-Hilfslinien etc. |
| **F5** | Automatische Vorklassifizierung + manuelle Korrektur | Heuristiken fuer CUT_OUTER, CUT_INNER, BEND, ENGRAVE |

Die Intelligenz (automatische Erkennung, Zuordnung, Interpretation) gehoert in F4 und F5, nicht in F3. F3 ist bewusst "dumm" — der Bediener entscheidet, was zu einem Teil gehoert.

## 9. Optionale spaetere Erweiterung

Wenn spaeter wieder Automatik in F3 gewuenscht ist, soll diese nicht als Standardverhalten zurueckkommen, sondern als explizite Zusatzfunktion:

- Gesonderter Modus "Teil automatisch erweitern" (separater Button)
- Optionaler Expertenmodus mit kontur- und komponentenbasierter Erkennung (Richtung A)
- Visuelle Depriorisierung von Hilfsgeometrie (Rahmen, Schriftfeld ausgegraut)

Damit bleibt das Basissystem fuer alle Dateien stabil und vorhersagbar, waehrend fortgeschrittene Automatik bewusst zugeschaltet werden kann.

## 10. Annahmen

- ANNAHME: Die bestehende Intersections-Regel fuer die Fensterauswahl ist fuer den Nutzer sinnvoll und kann beibehalten werden. Das Problem ist nicht die Intersections-Regel selbst, sondern die anschliessende Cluster-Eskalation. -- Risiko wenn falsch: Nutzer erwartet Vollcontainment statt Intersection; dann muesste die Fensterlogik konfigurierbar sein.
- ANNAHME: `expandSelectionToPartCluster()` kann fuer den Standard-F3-Pfad entfernt werden, ohne dass andere Features (F4, F5) beeintraechtigt werden. Die Funktion wird nur im Select-Modus von F3 aufgerufen. -- Risiko wenn falsch: Falls andere Stellen die Funktion nutzen, muessen diese separat geprueft werden.
- ANNAHME: Abwahl einzelner Entities ist ueber erneuten Klick oder eine dedizierte Toggle-Aktion realisierbar. Die genaue UX-Mechanik (Toggle vs. Modifier-Taste) ist eine Implementierungsentscheidung. -- Risiko wenn falsch: Keine fachliche Auswirkung, aber UX-Feinabstimmung noetig.

## 11. Betroffene Daten

Keine Aenderung an den Datenobjekten gegenueber REQUIREMENTS.md:

- `DxfEntityV2` (Feld: `partId`)
- `PartDefinition` (id, name, entityIds)

Die Teildefinition entsteht weiterhin aus der Zuordnung von Entity-IDs zu einem Teil. Nur der Weg dorthin aendert sich: von automatischer Expansion zu rein manueller Markierung.
