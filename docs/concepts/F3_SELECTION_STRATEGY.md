# F3 Selection Strategy

## Kontext

Im aktuellen Workflow ist F3 der Schritt "Teile definieren". Der Nutzer soll die gesamte Zeichnung sehen und gezielt die Geometrie markieren, die spaeter als Teil weiterverarbeitet wird.

Aktuell mischt F3 jedoch zwei unterschiedliche Aufgaben:

- manuelle Auswahl durch den Nutzer
- automatische Erweiterung durch das System

Das fuehrt bei Zeichnungen mit Rahmen, Schriftfeldern oder grossen umschliessenden Konturen dazu, dass ein einzelner Klick oder eine kleine Auswahl auf den gesamten Rahmen oder grosse Teilbereiche der Zeichnung eskaliert.

## Langfristig saubere Zielarchitektur

Die fachlich sauberste Zielarchitektur ist ein kontur- und komponentenbasiertes Auswahlmodell mit klarer Trennung zwischen drei Ebenen:

1. Einzelne Geometrie-Entity
2. Lokale Kontur oder zusammenhaengende Komponente
3. Vollstaendiges Teil mit Aussenkontur, Innenkonturen und zugehoeriger Innengeometrie

### Grundprinzip

Ein Nutzerklick darf nicht sofort auf eine aggressive Voll-Teil-Erweiterung springen. Stattdessen sollte F3 in einer nachvollziehbaren Reihenfolge arbeiten:

1. Seed bestimmen
2. lokale zusammenhaengende Komponente ermitteln
3. pruefen, ob diese Komponente eine plausible Aussenkontur oder Teilkomponente ist
4. erst danach gezielt Innengeometrie zuordnen

### Fachliche Regeln

- Bekannte Blatt- und Hilfsgeometrie darf nicht gleichwertig als Seed dienen.
- Geometrische Konnektivitaet ist wichtiger als Bounding-Box-Containment.
- Innengeometrie darf erst zugeordnet werden, wenn eine plausible Aussenkontur erkannt wurde.
- Rahmen, Schriftfeld, Notizcontainer und CAD-Hilfsobjekte muessen als eigene Klasse behandelt werden.

### Vorteile

- robustere Teilerkennung bei komplexen Zeichnungen
- klarere und besser begruendbare Auswahlentscheidungen
- weniger Fehlselektionen durch globale Containergeometrie
- bessere Grundlage fuer spaetere automatische Unterstuetzung

### Nachteil

Diese Loesung ist die fachlich beste, aber nicht die einfachste. Sie fuehrt ein deutlich reichhaltigeres Auswahlmodell ein und ist eher eine mittel- bis langfristige Architekturverbesserung als ein kleiner UX-Fix.

## Alternative Loesung fuer den aktuellen F3-Bedarf

Es gibt eine zweite Loesung, die fachlich nicht so vollstaendig ist wie die Zielarchitektur, aber sehr gut zu der aktuellen Nutzererwartung passt.

### Manuelle F3-Selektion ohne automatische Systemzuordnung

In dieser Variante wird F3 bewusst auf einen einfachen, kontrollierten Auswahlmodus reduziert:

- Die gesamte Zeichnung wird angezeigt.
- Das System nimmt in F3 keine automatische Teil-Erweiterung vor.
- Ein Klick waehlt nur die direkt getroffene Geometrie.
- Ein Auswahlfenster waehlt nur die Geometrie im Fenster oder mit definierter Intersections-Regel.
- Es gibt in F3 keine automatische Teilinterpretation durch Bounding-Box-Cluster oder globale Einschluesse.

### Fachliche Bedeutung

Diese Variante verschiebt die Intelligenz bewusst aus F3 heraus. F3 wird dann nicht als automatische Teilerkennung verstanden, sondern als expliziter Markierungsschritt durch den Nutzer.

Das passt gut zu der Anforderung:

- gesamte Zeichnung sehen
- gewuenschte Kontur oder Komponente gezielt markieren
- keine vom System vorweggenommene Zuordnung in diesem Schritt

### Vorteile

- Verhalten ist fuer den Nutzer direkt nachvollziehbar.
- Kein Rahmen-Eskalationsproblem durch automatische Cluster-Erweiterung.
- Geringeres Risiko, dass F3 falsche Teilzuordnungen trifft.
- Passt besser zu Zeichnungen, in denen der Nutzer selbst weiss, welche Komponente relevant ist.

### Nachteile

- Weniger Komfort bei Dateien, in denen eine automatische Teilgruppierung wirklich hilfreich waere.
- Innengeometrie, Gravuren oder Texte muessen entweder mitmarkiert oder in einem spaeteren Schritt zugeordnet werden.
- Das System hilft dem Nutzer in F3 weniger aktiv.

## Bewertung

Es gibt damit zwei fachlich legitime Richtungen:

### Richtung A: saubere Zielarchitektur

Kontur- und komponentenbasierte Teilselektion mit Seed-Priorisierung, Hilfsgeometrie-Ausschluss und kontrollierter Innengeometrie-Zuordnung.

Das ist die langfristig beste Loesung.

### Richtung B: manuelles F3 ohne automatische Expansion

F3 wird auf einen klaren Benutzer-Selektionsschritt reduziert. Das System ordnet in diesem Schritt nichts automatisch zu.

Das ist die bessere Loesung fuer den aktuellen UX-Wunsch.

## Empfehlung

Wenn das akute Problem lautet, dass in F3 eine einzelne Komponente oder Kontur nicht sauber per Fenster markiert werden kann und das System zu frueh eingreift, dann ist fuer den naechsten Umbau Richtung B die passendere Loesung.

Wenn spaeter wieder mehr Automatik gewuenscht ist, sollte diese nicht als Bounding-Box-Cluster zurueckkommen, sondern als Richtung-A-Architektur mit fachlicher Seed- und Komponentenlogik.

## Konkretes Soll-Verhalten fuer F3

Die folgende Beschreibung konkretisiert Richtung B als direkt umsetzbares Zielbild fuer F3.

### Ziel von F3

F3 ist ein manueller Markierungsschritt.

Der Nutzer soll:

- die komplette Zeichnung sehen
- gezielt eine Kontur oder Komponente markieren koennen
- selbst entscheiden, was zu einem Teil gehoert
- in diesem Schritt nicht von automatischen Systemzuordnungen uebersteuert werden

### Klick-Verhalten

- Ein einzelner Klick in F3 waehlt nur die direkt getroffene Entity.
- Wenn mehrere Entities unter dem Cursor liegen, darf hoechstens die direkt treffbare Vordergrundgeometrie gewaehlt werden.
- Ein Klick darf keine automatische Teil-Erweiterung ausloesen.
- Ein Klick darf keine Bounding-Box-basierte Cluster-Auswahl ausloesen.
- Ein Klick darf keine innenliegende Geometrie automatisch mitnehmen.

### Fenster-Auswahl

- Eine Fenster-Auswahl in F3 markiert nur die Entities, die im Fenster liegen oder die definierte Intersections-Regel erfuellen.
- Die Fenster-Auswahl darf nicht anschliessend global erweitert werden.
- Die Fenster-Auswahl darf nicht aufgrund einer umschliessenden Rahmenkontur auf die ganze Zeichnung eskalieren.
- Die Fenster-Auswahl ist eine reine Benutzerselektion, keine automatische Teilerkennung.

### Mehrfachauswahl

- Mehrere Klicks oder mehrere Fensteraktionen duerfen die aktuelle Auswahl erweitern.
- Der Nutzer muss einzelne Entities oder Teilmengen auch wieder abwaehlen koennen.
- Die Teildefinition entsteht aus der Summe der explizit markierten Geometrie, nicht aus einer impliziten Systeminterpretation.

### Was das System in F3 ausdruecklich nicht tun darf

- keine automatische Cluster-Erweiterung
- keine automatische Teilbildung aus einem Seed
- keine automatische Mitnahme aller Geometrie innerhalb einer Bounding Box
- keine automatische Innengeometrie-Zuordnung
- keine automatische Gravur-/Text-Zuordnung
- keine automatische Priorisierung eines Rahmens als Teilcontainer

### Rolle von Hilfsgeometrie in F3

- Bekannte Hilfs- und Blattgeometrie darf sichtbar bleiben, solange der Nutzer die gesamte Zeichnung sehen soll.
- Diese Geometrie darf aber nicht zu einer automatischen Selektionserweiterung fuehren.
- Falls spaeter eine visuelle Depriorisierung gewuenscht ist, sollte das eine Anzeigeentscheidung sein, keine implizite Auswahlentscheidung.

### Fachlicher Nutzen dieses Zielbilds

- F3 wird wieder vorhersagbar.
- Ein Nutzer versteht sofort, warum etwas ausgewaehlt wurde: weil er es markiert hat.
- Der Rahmen verliert seine schaedliche Wirkung als globaler Auswahlcontainer.
- Die Teildefinition wird in F3 wieder eine bewusste Nutzerentscheidung.

## Abgrenzung zu spaeteren Schritten

Dieses Zielbild bedeutet nicht, dass das System gar keine Intelligenz mehr haben darf. Die Automatik wird nur aus F3 herausgenommen oder stark reduziert.

- F3: manuelle Markierung
- F4: Bereinigung der ausgewaehlten Geometrie
- F5: Klassifizierung der verbleibenden Teilgeometrie

Wenn spaeter wieder intelligente Teilunterstuetzung gewuenscht ist, sollte sie optional und explizit sein, zum Beispiel als bewusste Zusatzfunktion statt als Standardverhalten jedes Klicks.

## Technische Umsetzungsbeschreibung

Die folgende Beschreibung uebersetzt das Soll-Verhalten in konkrete technische Aenderungen fuer den aktuellen Codebestand.

### Betroffene Dateien

- `src/components/editor/DxfEditor.tsx`
- `src/lib/editor/entity-selection.ts`
- `src/components/shared/AppShell.tsx`
- `tests/entity-selection.test.ts`
- optional zusaetzlich neue editornahe Tests fuer Klick- und Fensterauswahl

### 1. Auswahl-Expansion im Select-Modus entfernen

In `DxfEditor.tsx` muss im Select-Modus die automatische Expansion ueber `expandSelectionToPartCluster(...)` entfallen.

Das betrifft zwei Stellen:

- Einzelklick in F3
- Fensterselektion in F3

Stattdessen soll gelten:

- Klick liefert nur die direkt getroffene Entity-ID
- Fenster liefert nur die direkt vom Fenster getroffenen Entity-IDs
- keine nachgelagerte globale Erweiterung

### 2. Box-Selektion als reine Benutzerselektion beibehalten

Die Fensterlogik darf weiter mit einer klar definierten geometrischen Regel arbeiten, zum Beispiel Intersections statt Vollcontainment.

Wichtig ist nur:

- Das Fenster bestimmt die Auswahl.
- Das System erweitert diese Auswahl nicht im Nachgang.
- Die Fensterauswahl bleibt lokal und direkt nachvollziehbar.

Falls die bestehende Intersections-Logik fuer den Nutzer sinnvoll ist, kann sie bleiben. Problematisch ist nicht die Intersections-Regel selbst, sondern die anschliessende Cluster-Eskalation.

### 3. Select-Modus und Classify-Modus strikter trennen

`DxfEditor.tsx` sollte zwei klar verschiedene Verhaltensmodi haben:

- `select`: rein manuelle Auswahl, keine automatische Expansion
- `classify`: praezise Einzel- oder Box-Zuordnung fuer Klassifizierungen

Der Select-Modus darf keine versteckte Teillogik enthalten. Alles, was wie automatische Teilerkennung wirkt, gehoert nicht mehr in den Standardpfad von F3.

### 4. AppShell unveraendert in der Verantwortung lassen

`AppShell.tsx` sollte weiterhin nur die vom Editor gemeldeten Entity-IDs entgegennehmen und dem aktiven Teil zuordnen.

Die Zuordnungslogik in `AppShell.tsx` bleibt damit bewusst simpel:

- Editor meldet explizit vom Nutzer markierte IDs
- AppShell ordnet genau diese IDs dem aktiven Teil zu
- keine implizite Erweiterung in der Workflow-Schicht

Damit bleibt die Verantwortlichkeit sauber getrennt:

- Editor bestimmt, was markiert wurde
- Workflow bestimmt, welchem Teil diese Markierung zugeordnet wird

### 5. `entity-selection.ts` funktional verschlanken

`entity-selection.ts` sollte fuer F3 nicht mehr die Rolle einer Teilbildungslogik haben.

Sinnvoll waere eine Reduktion auf Hilfsfunktionen mit engem Zweck, zum Beispiel:

- Bounding-Box-Berechnung
- Intersections-Pruefung fuer Fensterauswahl

Die Funktion `expandSelectionToPartCluster(...)` sollte fuer den Standard-F3-Pfad nicht mehr verwendet werden.

Ob sie ganz entfernt oder fuer eine spaetere optionale Expertenfunktion behalten wird, ist eine separate Architekturentscheidung.

### 6. Erwartetes Verhalten nach dem Umbau

Nach der Umstellung muss folgendes Verhalten gelten:

- Klick auf Rahmenlinie waehlt nur diese Linie oder genau den getroffenen Rahmenbestandteil
- Klick auf Teilkontur waehlt nur den getroffenen Konturabschnitt
- Fenster ueber einer Kontur waehlt nur die Geometrie im Fenster
- Rahmen darf nicht mehr die gesamte Auswahl aufblasen
- Innengeometrie wird nicht ungefragt automatisch mitgenommen

### 7. Erforderliche Tests

Die vorhandenen Tests fuer `entity-selection.ts` muessen an das neue Zielbild angepasst werden.

Insbesondere sollte es Tests fuer diese Faelle geben:

- Fensterauswahl liefert nur intersectende Entities
- Klick im Select-Modus fuehrt nicht zu Cluster-Erweiterung
- Eine umschliessende grosse Kontur zieht nicht automatisch innenliegende Geometrie mit
- Ein Seed innerhalb eines Rahmens waehlt nicht die gesamte Rahmenflaeche oder den Gesamtbestand

Die bisherigen Tests, die eine automatische Expansion auf verbundene Konturen und enthaltene Innengeometrie erwarten, passen dann nicht mehr zum neuen F3-Zielbild und muessen ersetzt oder in einen spaeteren optionalen Automatik-Modus verschoben werden.

### 8. Optionale spaetere Erweiterung

Wenn spaeter wieder Automatik in F3 unterstuetzt werden soll, sollte sie nicht mehr Standardverhalten sein, sondern als explizite Zusatzfunktion gestaltet werden, zum Beispiel:

- gesonderter Modus "Teil automatisch erweitern"
- separater Button fuer intelligente Auswahl
- optionaler Expertenmodus

Damit bleibt das Basissystem fuer alle Dateien stabil und vorhersagbar, waehrend fortgeschrittene Automatik bewusst zugeschaltet werden kann.
