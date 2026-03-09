# Requirements: Laser DXF-Maker

> Generiert aus PROJECT_BRIEF.md am 2026-03-09.
> Dies ist die Single Source of Truth fuer alle Agents.

## 1. Ziel

Browser-Tool fuer Laserschneider-Bediener, das rohe Kunden-DXF-Dateien (R12 ASCII) einliest, als SVG darstellt, Elemente nach Schnitttypen klassifiziert (Aussenkontur, Innenkontur, Biegung, Gravur), bereinigt und als saubere DXF-Datei fuer Laser-Schneidmaschinen exportiert.

### Nicht-Ziele

- Kunden- und Projektverwaltung mit Datenbank (Phase 2, Supabase)
- Authentifizierung und Benutzerverwaltung (Phase 2)
- Projekthistorie und persistente Speicherung serverseitig
- PDF-Vorschau fuer Kunden
- Lasso-Selektion (Freihand-Auswahl)
- Undo/Redo
- SPLINE-Support (wird in R12 als Polyline behandelt, kein eigener Parser)
- Kundenrolle mit eigenem Zugang
- Online-Hosting / Internet-Zugang (MVP laeuft lokal)

## 2. Rollen & Rechte

| Rolle | Kann | Kann NICHT |
|-------|------|------------|
| Bediener | DXF hochladen, Elemente anzeigen, klassifizieren, bereinigen, exportieren, Kunde/Projekt-Name eingeben | Kunden/Projekte persistent verwalten, Benutzer anlegen |

### Auth-Konzept

- **MVP:** Kein Auth. Die App laeuft lokal ohne Login.
- **Phase 2:** Supabase Auth (Email/Password), Rollen-Spalte in `profiles`-Tabelle, Admin- und Kundenrolle.

## 3. Features (MVP)

### F1: Kunde/Projekt festlegen

**User Story:** Als Bediener moechte ich vor dem DXF-Upload einen Kundennamen und eine Projektnummer eingeben, damit die exportierte Datei zugeordnet werden kann.

**Ablauf:**
1. Bediener oeffnet die App
2. Bediener gibt Kundenname und Projektnummer ein
3. Bediener klickt "Weiter" und gelangt zum Upload-Bereich

**Akzeptanzkriterien:**
- [ ] Eingabefelder fuer Kundenname (Pflicht) und Projektnummer (Pflicht) sind vorhanden
- [ ] "Weiter" ist erst klickbar, wenn beide Felder ausgefuellt sind
- [ ] Fehlerfall: Bei leerem Kundennamen oder leerer Projektnummer wird eine Fehlermeldung angezeigt
- [ ] Die eingegebenen Daten werden im exportierten Dateinamen verwendet

**Betroffene Daten:** Kundenname (String), Projektnummer (String)

---

### F2: DXF laden & parsen

**User Story:** Als Bediener moechte ich eine DXF-Datei (R12 ASCII) hochladen und deren Inhalte als SVG-Zeichnung sehen, damit ich die Elemente visuell pruefen kann.

**Ablauf:**
1. Bediener waehlt eine DXF-Datei ueber Datei-Dialog (Button) oder Drag-and-Drop
2. App parst die DXF-Datei und extrahiert alle unterstuetzten Entitaeten zu DxfEntityV2[]
3. Parse-Statistik wird angezeigt (Anzahl Entitaeten pro Typ: LINE: 42, CIRCLE: 8, ARC: 15, ...)

**Akzeptanzkriterien:**
- [ ] Datei-Upload per Klick-Button und per Drag-and-Drop moeglich
- [ ] Nur .dxf-Dateien werden akzeptiert; andere Formate zeigen eine Fehlermeldung
- [ ] LINE, CIRCLE, ARC, POLYLINE/LWPOLYLINE und TEXT werden korrekt geparst
- [ ] LINETYPE-Information wird pro Entitaet mitgeparst (CONTINUOUS, DASHED, HIDDEN, etc.)
- [ ] Parse-Statistik zeigt Anzahl Entitaeten gruppiert nach Typ
- [ ] Fehlerfall: Bei ungueltigem DXF-Format (kein R12, binaer, korrupt) erscheint eine verstaendliche Fehlermeldung
- [ ] Fehlerfall: Bei leerer DXF-Datei (keine Entitaeten) erscheint ein Hinweis
- [ ] Grenzfall: DXF-Dateien mit bis zu 5000 Entitaeten werden ohne merkbare Verzoegerung (< 3s) geparst

**Betroffene Daten:** DxfEntityV2[] (geparste Entitaeten mit id, type, coordinates, layer, color, linetype)

---

### F3: Bereiche auswaehlen (Teile definieren)

**User Story:** Als Bediener moechte ich in der SVG-Anzeige einen oder mehrere Bereiche markieren, damit jeder Bereich als separates Teil (T1, T2, ...) in eine eigene DXF-Datei exportiert wird.

**Ablauf:**
1. Alle geparsten Entitaeten werden als SVG mit Zoom, Pan und Fit-to-View dargestellt
2. Bediener waehlt Bereiche aus:
   - Rechteck aufziehen (Box-Selektion) um mehrere Elemente zu erfassen
   - Einzelne Elemente anklicken
   - Beides ist kombinierbar
3. Jeder markierte Bereich wird als Teil benannt (T1, T2, T3, ...)
4. Bediener kann mehrere Teile in derselben Zeichnung definieren

**Akzeptanzkriterien:**
- [ ] SVG-Anzeige mit Zoom (Mausrad), Pan (Mittelklick/Shift+Links) und Fit-to-View funktioniert
- [ ] Box-Selektion: Bediener kann ein Rechteck aufziehen, alle Elemente innerhalb werden dem aktuellen Teil zugeordnet
- [ ] Einzelklick-Selektion: Bediener kann einzelne Elemente anklicken und dem aktuellen Teil zuordnen
- [ ] Box-Selektion und Einzelklick sind kombinierbar (additiv)
- [ ] Jedes Teil bekommt eine fortlaufende Nummer (T1, T2, T3, ...)
- [ ] Teile werden visuell unterscheidbar dargestellt (z.B. unterschiedliche Hintergrundfarbe oder Umrandung)
- [ ] Bediener kann ein neues Teil starten (Button "Neues Teil")
- [ ] Elemente die keinem Teil zugeordnet sind, werden spaeter verworfen
- [ ] Fehlerfall: Klick ins Leere (kein Element getroffen) hat keinen Effekt
- [ ] Grenzfall: Eng beieinanderliegende Elemente -- das naechstgelegene Element wird getroffen (Hit-Testing mit Snap-Toleranz)
- [ ] Eine Uebersicht zeigt alle definierten Teile mit Anzahl der Elemente pro Teil

**Betroffene Daten:** DxfEntityV2 (erweitertes Feld: partId), PartDefinition (id, name, entityIds)

---

### F4: Automatische Bereinigung (pro Teil)

**User Story:** Als Bediener moechte ich, dass pro definiertem Teil automatisch unnoetige Elemente entfernt werden (Bemassungen, Gewinde-Hilfslinien, Duplikate), damit nur schneidrelevante Geometrie uebrig bleibt.

**Ablauf:**
1. Nach Abschluss der Bereichsauswahl wird pro Teil automatisch bereinigt
2. Alles ausserhalb des Bereichs und nicht zugeordnete Elemente werden entfernt
3. Automatisch entfernt werden:
   - DIMENSION Entitaeten (Bemassungen)
   - Gestrichelte Kreise/Teilkreise (LINETYPE = DASHED/HIDDEN → Gewinde-Hilfslinien)
   - Duplikate (geometrisch deckungsgleiche Entitaeten)
   - Nulllinien (Start = Endpunkt)
   - Leere Layer
4. Gewinde-Logik: Voller Kreis mit LINETYPE = CONTINUOUS → behalten (Schneidkontur). 3/4-Kreis gestrichelt (LINETYPE = DASHED) → loeschen (Gewinde-Hilfslinie)
5. Zusammenfassung der Bereinigung wird angezeigt

**Akzeptanzkriterien:**
- [ ] DIMENSION Entitaeten werden automatisch entfernt
- [ ] Kreise/Boegen mit LINETYPE DASHED oder HIDDEN werden automatisch entfernt (Gewinde-Hilfslinien)
- [ ] Volle Kreise mit LINETYPE CONTINUOUS bleiben erhalten (Schneidkonturen)
- [ ] Geometrisch identische Elemente (gleicher Typ, gleiche Koordinaten) werden auf eines reduziert
- [ ] Linien mit Laenge 0 (Start = Ende) werden entfernt
- [ ] Leere Layer (ohne verbleibende Entitaeten) werden entfernt
- [ ] Nach Bereinigung zeigt eine Zusammenfassung pro Teil: Anzahl entfernter Elemente, Duplikate, Bemassungen, Gewinde-Hilfslinien, Nulllinien
- [ ] Fehlerfall: Wenn nach Bereinigung keine Elemente in einem Teil verbleiben, wird der Bediener gewarnt
- [ ] Grenzfall: Doppelklick auf "Bereinigen" fuehrt die Bereinigung nur einmal aus

**Betroffene Daten:** DxfEntityV2[] (reduzierte Liste pro Teil)

---

### F5: Automatische Vorklassifizierung & manuelle Korrektur (pro Teil)

**User Story:** Als Bediener moechte ich, dass die App die Elemente jedes Teils automatisch vorklassifiziert (Aussenkontur, Innenkontur, Biegung, Gravur), damit ich nur noch Korrekturen vornehmen muss statt alles manuell zuzuweisen.

**Ablauf:**
1. App wendet automatisch Klassifizierungs-Heuristiken an:
   - Groesste geschlossene Kontur → CUT_OUTER (Rot)
   - Kleinere geschlossene Konturen → CUT_INNER (Blau)
   - Kurze gerade Linien → BEND (Gelb)
   - TEXT Entitaeten → ENGRAVE (Gruen)
2. SVG-Anzeige zeigt die vorklassifizierten Elemente in den Layer-Farben
3. Bediener prueft die Vorklassifizierung und korrigiert bei Bedarf:
   - Element anklicken → Kategorie aendern
   - Box-Selektion → Kategorie fuer mehrere Elemente gleichzeitig aendern
4. Layer und Farben werden automatisch zugewiesen:
   - Aussenkontur → Layer: CUT_OUTER, Farbe: Rot #FF0000 (ACI 1)
   - Innenkontur → Layer: CUT_INNER, Farbe: Blau #0000FF (ACI 5)
   - Biegelinien → Layer: BEND, Farbe: Gelb #FFFF00 (ACI 2)
   - Gravuren → Layer: ENGRAVE, Farbe: Gruen #00CC00 (ACI 3)

**Akzeptanzkriterien:**
- [ ] Automatische Vorklassifizierung: Groesste geschlossene Kontur wird als CUT_OUTER erkannt
- [ ] Automatische Vorklassifizierung: Kleinere geschlossene Konturen werden als CUT_INNER erkannt
- [ ] Automatische Vorklassifizierung: Kurze gerade Linien (nicht Teil einer geschlossenen Kontur) werden als BEND erkannt
- [ ] Automatische Vorklassifizierung: TEXT Entitaeten werden als ENGRAVE erkannt
- [ ] Toolbar mit vier Kategorie-Buttons ist sichtbar: Aussenkontur (Rot), Innenkontur (Blau), Biegung (Gelb), Gravur (Gruen)
- [ ] Manuelle Korrektur per Einzelklick: Element anklicken, aktive Kategorie wird zugewiesen
- [ ] Manuelle Korrektur per Box-Selektion: Rechteck aufziehen, alle erfassten Elemente erhalten die aktive Kategorie
- [ ] Bereits klassifizierte Elemente koennen durch Zuweisung einer anderen Kategorie umklassifiziert werden
- [ ] Aussenkontur-Elemente erhalten Layer `CUT_OUTER` und Farbe Rot (#FF0000, ACI 1)
- [ ] Innenkontur-Elemente erhalten Layer `CUT_INNER` und Farbe Blau (#0000FF, ACI 5)
- [ ] Biegungs-Elemente erhalten Layer `BEND` und Farbe Gelb (#FFFF00, ACI 2)
- [ ] Gravur-Elemente erhalten Layer `ENGRAVE` und Farbe Gruen (#00CC00, ACI 3)
- [ ] Die SVG-Vorschau zeigt die Elemente in den zugewiesenen Layer-Farben
- [ ] Eine Statistik zeigt die Anzahl Elemente pro Kategorie
- [ ] Fehlerfall: Klick ins Leere hat keinen Effekt
- [ ] Grenzfall: Eng beieinanderliegende Elemente -- Hit-Testing mit Snap-Toleranz

**Betroffene Daten:** DxfEntityV2 (Felder: classification, layer, color)

---

### F6: DXF R12 Export (pro Teil)

**User Story:** Als Bediener moechte ich pro definiertem Teil eine bereinigte DXF R12-Datei herunterladen, damit ich sie in meiner Laser-Software (LightBurn) verwenden kann.

**Ablauf:**
1. Bediener sieht die bereinigte Zeichnung mit finalen Layern und Farben pro Teil
2. Bediener klickt "Exportieren"
3. App generiert pro Teil eine DXF R12 ASCII-Datei mit korrekten Layern, Farben und Entitaeten
4. Dateien werden als Download angeboten:
   - `[Kundenname]_[Projektnummer]-T1.dxf`
   - `[Kundenname]_[Projektnummer]-T2.dxf`
   - etc.
5. Die Originaldatei wird verworfen (nicht gespeichert)

**Akzeptanzkriterien:**
- [ ] Pro definiertem Teil wird eine separate DXF R12 ASCII-Datei erzeugt
- [ ] Vorschau zeigt nur bereinigte Elemente mit finalen Farben und Layern pro Teil
- [ ] Die exportierte DXF enthaelt einen HEADER-Bereich, TABLES-Bereich (Layer-Definitionen) und ENTITIES-Bereich
- [ ] Jede Entitaet hat den korrekten Layer-Namen und die korrekte ACI-Farbnummer
- [ ] LINE, CIRCLE, ARC, LWPOLYLINE und TEXT werden korrekt in DXF R12-Syntax geschrieben
- [ ] Der Dateiname folgt dem Muster `[Kundenname]_[Projektnummer]-T[Nummer].dxf`
- [ ] Bei nur einem Teil entfaellt das `-T1` Suffix
- [ ] Die exportierte Datei kann in LightBurn geoeffnet werden und zeigt die korrekten Layer
- [ ] Fehlerfall: Wenn keine Elemente zum Exportieren vorhanden sind, wird eine Warnung angezeigt
- [ ] Grenzfall: Sonderzeichen in Kundenname/Projektnummer werden im Dateinamen bereinigt (Umlaute, Leerzeichen)

**Betroffene Daten:** DxfEntityV2[] (finale, bereinigte Liste pro Teil), DXF-Datei(en) (Output)

## 4. Datenobjekte (High-Level)

| Objekt | Beschreibung | Gehoert zu Rolle | Kern-Felder |
|--------|-------------|------------------|-------------|
| DxfEntityV2 | Einzelne geometrische Entitaet aus DXF-Datei | Bediener | id, type, layer, color, linetype, coordinates, length, closed, classification, partId |
| ProjectInfo | Kunde und Projekt fuer aktuelle Sitzung | Bediener | customerName, projectNumber |
| PartDefinition | Ein markierter Bereich = ein separates Teil | Bediener | id, name (T1, T2, ...), entityIds |
| ClassificationType | Enum der vier Schnitttypen | Bediener | CUT_OUTER, CUT_INNER, BEND, ENGRAVE |
| LayerConfig | Layer-Name, Farbe und ACI-Nummer pro Klassifikation | System | layerName, hexColor, aciNumber |

### Beziehungen

- ProjectInfo 1:n PartDefinition (ein Projekt enthaelt ein oder mehrere Teile)
- PartDefinition 1:n DxfEntityV2 (ein Teil enthaelt viele Entitaeten)
- DxfEntityV2 n:1 ClassificationType (jede Entitaet hat maximal eine Klassifikation)
- ClassificationType 1:1 LayerConfig (jeder Typ hat genau eine Layer-Konfiguration)

## 5. Nicht-funktionale Anforderungen

- **Performance:** DXF-Dateien mit bis zu 5000 Entitaeten muessen ohne merkbare Verzoegerung (< 3s) geparst und dargestellt werden. Zoom und Pan muessen fluessig (60fps) funktionieren.
- **Responsive:** Desktop-first (Mindestbreite 1024px). Die App wird primaer am Arbeitsplatz-PC genutzt. Mobile-Optimierung ist kein MVP-Ziel.
- **Barrierefreiheit:** Semantisches HTML, ausreichend Kontrast zwischen den vier Kategorie-Farben, Keyboard-Navigation fuer Toolbar-Buttons.
- **Dateiformate:** Nur DXF R12 ASCII wird unterstuetzt (Eingabe und Ausgabe). Binaere DXF-Dateien werden mit Fehlermeldung abgelehnt.
- **Browser:** Letzte 2 Versionen Chrome, Firefox, Edge. Safari ist kein primaeres Ziel.
- **Workflow-Geschwindigkeit:** Der gesamte Workflow (Upload bis Export) soll unter 5 Minuten pro Datei dauern.

## 6. Offene Fragen

- [ ] Wie viele Entitaeten hat eine typische Kunden-DXF? (Betrifft Performance-Anforderungen) -- zu klaeren mit Bediener
- [ ] Welche Laser-Software wird primaer genutzt? (LightBurn, RDWorks, andere?) -- zu klaeren mit Bediener
- [ ] Soll die exportierte DXF bestimmte Layer-Farben verwenden, die von der Laser-Software vorgegeben sind? -- zu klaeren mit Bediener
- [ ] Gibt es DXF-Dateien mit verschachtelten BLOCKs/INSERTs, die aufgeloest werden muessen? -- zu klaeren mit Bediener

## 7. Annahmen

- ANNAHME: Typische Kunden-DXF-Dateien enthalten 100-5000 Entitaeten. Performance-Ziel: bis 5000 Entitaeten fluessig. -- Risiko wenn falsch: Bei deutlich mehr Entitaeten (>10000) koennten SVG-Rendering und Hit-Testing spuerbar langsamer werden; dann waere Canvas-Rendering oder Virtualisierung noetig.
- ANNAHME: Die primaere Laser-Software ist LightBurn. Der DXF R12 Export wird gegen LightBurn getestet. -- Risiko wenn falsch: Andere Software (RDWorks, LaserGRBL) koennte Layer oder Farben anders interpretieren; dann muessten Export-Einstellungen anpassbar sein.
- ANNAHME: Kein Undo/Redo im MVP. Fehlerhafte Klassifizierungen werden durch erneutes Zuweisen korrigiert. -- Risiko wenn falsch: Wenn Bediener haeufig groessere Aenderungen rueckgaengig machen muessen, wird der Workflow frustrierend; dann muesste Undo/Redo priorisiert werden.
- ANNAHME: Box-Selektion (Rechteck aufziehen) ist ausreichend fuer Mehrfachauswahl. Freihand-Lasso wird nicht benoetigt. -- Risiko wenn falsch: Bei sehr unregelmassig verteilten Elementen koennte Box-Selektion zu viele unerwuenschte Elemente erfassen; dann waere Lasso-Selektion noetig.
- ANNAHME: Die Heuristiken fuer die automatische Vorklassifizierung (groesste Kontur = Aussen, kleinere = Innen, kurze Linien = Biegung, TEXT = Gravur) decken 80%+ der Faelle korrekt ab. -- Risiko wenn falsch: Wenn die Heuristiken haeufig falsch liegen, wird die manuelle Korrektur aufwaendig und der Zeitvorteil geht verloren.
- ANNAHME: Gestrichelte Kreise/Boegen (LINETYPE = DASHED/HIDDEN) sind immer Gewinde-Hilfslinien und koennen sicher geloescht werden. -- Risiko wenn falsch: Wenn gestrichelte Kreise manchmal Schneidkonturen sind, wuerden diese faelschlicherweise entfernt; dann muesste der Bediener vorher bestaetigen.
- ANNAHME: Die App laeuft nur lokal (localhost). Kein oeffentlicher Internet-Zugang im MVP. -- Risiko wenn falsch: Keine Auswirkung auf Funktionalitaet, aber Deployment-Strategie muesste angepasst werden.
- ANNAHME: DXF-Dateien enthalten keine verschachtelten BLOCKs/INSERTs. Nur flache Entitaeten im ENTITIES-Bereich werden geparst. -- Risiko wenn falsch: Entitaeten innerhalb von BLOCKs wuerden nicht angezeigt; dann muesste der Parser BLOCK-Referenzen aufloesen.
- ANNAHME: Desktop-first Nutzung. Kein Tablet- oder Smartphone-Support im MVP. -- Risiko wenn falsch: Keine, da Laser-Bediener am Arbeitsplatz-PC arbeiten.
