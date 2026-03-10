# Requirements: Parser-Verbesserungen (Bulge, MTEXT, WarningCollector)

> Generiert aus `docs/concepts/parser-vollanalyse_REV1.md` am 2026-03-10.
> Bezieht sich auf den bestehenden Parser `src/lib/dxf/parser.ts` (~1477 Zeilen).
> Dies ist die Single Source of Truth fuer die 3 beschriebenen Parser-Features.

## 1. Ziel

Drei gezielte Verbesserungen am DXF-Parser und SVG-Renderer, um (a) korrekte Bogengeometrie bei LWPOLYLINE-Bulge-Werten zu liefern, (b) MTEXT-Entities als TEXT zu erkennen, und (c) die Warning-Ausgabe bei grossen DXF-Dateien lesbar zu machen.

### Nicht-Ziele

- ELLIPSE Entity Support (eigenes Feature, spaeter)
- CIRCLE/ARC zu ELLIPSE Transformation bei nicht-uniformer Skalierung (eigenes Feature, spaeter)
- TABLES-Sektion / Layer-Farben auslesen (eigenes Feature, spaeter)
- Tokenizer-Architektur (Refactoring, spaeter)
- DxfEntityV3 Datenmodell (Refactoring, spaeter)
- Performance-Optimierung switch vs. find (Refactoring, spaeter)
- Spline-Flattening / NURBS-Auswertung (eigenes Feature, spaeter)
- Aenderungen am Cleaner oder Classifier

## 2. Reihenfolge der Implementierung

| Schritt | Feature | Begruendung |
|---------|---------|-------------|
| 1 | F1: Bulge-Support LWPOLYLINE | Hoechste Prioritaet, CAM-kritisch, betrifft Parser + Renderer + Types |
| 2 | F2: MTEXT als TEXT | Unabhaengig von F1, erfordert nur Parser-Aenderung |
| 3 | F3: WarningCollector | Unabhaengig, rein interne Verbesserung ohne Auswirkung auf Output-Daten |

## 3. Betroffene Dateien

| Datei | F1 Bulge | F2 MTEXT | F3 Warnings |
|-------|----------|----------|-------------|
| `src/types/dxf-v2.ts` | Ja (Points-Typ erweitern) | Nein | Nein |
| `src/lib/dxf/parser.ts` | Ja (extractPolylinePoints, Laengenberechnung) | Ja (MTEXT parsen) | Ja (WarningCollector) |
| `src/components/editor/EntityPath.tsx` | Ja (polylineToPath mit Arcs) | Nein | Nein |
| `tests/parser.test.ts` | Ja (neue Tests) | Ja (neue Tests) | Ja (neue Tests) |

## 4. Features

### F1: Bulge-Support LWPOLYLINE

**User Story:** Als Anwender moechte ich, dass LWPOLYLINE-Entities mit Bulge-Werten (Group Code 42) korrekt als Boegen dargestellt und berechnet werden, damit Langlocher, abgerundete Ecken und Freiformkonturen masshaltig an den Laser gehen.

**Ablauf:**
1. Parser liest Group Code 42 pro LWPOLYLINE-Punkt und speichert den Bulge-Wert
2. Parser berechnet die Laenge eines Bogensegments ueber `r * theta` statt Sehnenlaenge
3. EntityPath.tsx rendert Bulge-Segmente als SVG-Arc (`A`-Kommando) statt Linie (`L`-Kommando)

**Technische Randbedingungen:**
- Bulge-Mathematik: `bulge = tan(Bogenwinkel / 4)`
- `bulge > 0` bedeutet Bogen links (CCW), `bulge < 0` bedeutet Bogen rechts (CW)
- `bulge = 1` ergibt einen Halbkreis (180 Grad), NICHT 90 Grad
- Bogenlange: `theta = 4 * atan(|bulge|)`, `r = chord / (2 * sin(theta/2))`, Laenge = `r * theta`
- SVG-Arc: `A rx,ry 0 largeArc,sweep x2,y2`
- `largeArc = theta > PI ? 1 : 0`
- `sweep = bulge > 0 ? 1 : 0` (korrekt NUR weil DxfEditor `<g transform="scale(1,-1)">` verwendet)

**Aenderungen an Types (`dxf-v2.ts`):**
- `EntityCoordinates.points` wird von `Array<{ x: number; y: number }>` zu `Array<{ x: number; y: number; bulge?: number }>` erweitert
- Kein neuer Typ noetig, nur optionales Feld

**Akzeptanzkriterien:**
- [ ] Ein LWPOLYLINE-Punkt mit Group Code 42 und Wert 1.0 wird als `{ x, y, bulge: 1.0 }` geparst
- [ ] Ein LWPOLYLINE-Punkt ohne Group Code 42 hat `bulge: undefined` (nicht 0)
- [ ] Ein LWPOLYLINE-Punkt mit Group Code 42 und Wert 0 hat `bulge: undefined` (Null-Bulge wird nicht gespeichert)
- [ ] Die Gesamtlaenge einer geschlossenen LWPOLYLINE mit 4 Punkten und Bulge=1 auf einem Segment ist groesser als die reine Sehnenlaenge
- [ ] Konkret: Segment mit Endpunkten (0,0)-(10,0) und Bulge=1 ergibt Bogenlange ~15.708 (Halbkreis-Umfang = pi * 5), nicht Sehne 10
- [ ] `polylineToPath()` erzeugt fuer ein Segment mit Bulge ein SVG-`A`-Kommando statt `L`
- [ ] `polylineToPath()` erzeugt fuer ein Segment ohne Bulge weiterhin ein `L`-Kommando
- [ ] Geschlossene Polylinien: Das letzte Segment (letzter Punkt zum ersten Punkt) verwendet den Bulge des letzten Punktes falls vorhanden
- [ ] Bestehende Tests fuer LWPOLYLINE ohne Bulge bleiben gruen (kein Breaking Change)
- [ ] Fehlerfall: Wenn Group Code 42 einen nicht-numerischen Wert hat, wird er ignoriert (kein Crash)
- [ ] Grenzfall: `bulge = 0.0001` (nahe Null) wird als gerade Linie behandelt (Schwelle: `|bulge| < 0.0001`)
- [ ] Grenzfall: Sehr grosser Bulge (z.B. `bulge = 100`) erzeugt keinen NaN/Infinity in Laenge oder SVG

**Betroffene Daten:** `EntityCoordinates.points`, `DxfEntityV2.length`

---

### F2: MTEXT als TEXT behandeln

**User Story:** Als Anwender moechte ich, dass MTEXT-Entities aus der DXF-Datei erkannt und als TEXT-Entities geparst werden, damit Beschriftungen vollstaendig erfasst und spaeter als Gravur klassifiziert werden koennen.

**Ablauf:**
1. Parser erkennt Entity-Typ "MTEXT" (zu `SUPPORTED_TYPES` hinzufuegen)
2. Parser liest Group Code 1 und 3 (Textinhalt, ggf. ueber mehrere Code-3-Paare verteilt), Code 10/20 (Position), Code 40 (Zeichenhoehe)
3. Parser bereinigt DXF-Formatierungssequenzen aus dem Rohtext
4. Entity wird mit `type: "TEXT"` gespeichert (keine neue Entity-Art)

**DXF-Formatierungssequenzen die bereinigt werden muessen:**
- `\P` wird zu Leerzeichen (Absatzumbruch)
- `\~~` wird zu Leerzeichen (geschuetztes Leerzeichen)
- `{\H2.5;...}` Formatbloecke werden entfernt
- `\A1;`, `\H2.5;` und aehnliche Steuersequenzen werden entfernt
- Verbleibende geschweifte Klammern `{` `}` werden entfernt

**Aenderungen an Types (`dxf-v2.ts`):**
- Keine. MTEXT wird als `type: "TEXT"` gespeichert, `DxfEntityType` bleibt unveraendert.

**Akzeptanzkriterien:**
- [ ] Eine DXF-Datei mit einem MTEXT-Entity ergibt ein geparses Entity mit `type: "TEXT"`
- [ ] `coordinates.text` enthaelt den bereinigten Textinhalt ohne Formatierungssequenzen
- [ ] `coordinates.x` und `coordinates.y` enthalten die Position aus Group Code 10/20
- [ ] `coordinates.height` enthaelt die Zeichenhoehe aus Group Code 40
- [ ] `entity.length` ist 0 (wie bei TEXT)
- [ ] MTEXT mit mehrzeiligem Text (Code 3 + Code 1) wird korrekt zusammengesetzt: Code-3-Teile zuerst, Code-1-Teil am Ende
- [ ] MTEXT mit `\P` im Text: `"Zeile1\PZeile2"` wird zu `"Zeile1 Zeile2"`
- [ ] MTEXT mit Formatblock: `"{\H2.5;Beschriftung}"` wird zu `"Beschriftung"` oder leer (je nach Regex-Tiefe)
- [ ] Grenzfall: MTEXT ohne Code 1 und ohne Code 3 ergibt `coordinates.text` als leeren String
- [ ] Grenzfall: MTEXT ohne Code 40 ergibt `coordinates.height` als Fallback-Wert (z.B. 1)
- [ ] MTEXT wird in `stats.byType` unter `"TEXT"` gezaehlt (nicht unter `"MTEXT"`)
- [ ] Bestehende TEXT-Tests bleiben gruen (kein Breaking Change)
- [ ] Fehlerfall: MTEXT mit nur Formatierungssequenzen und keinem sichtbaren Text ergibt ein Entity mit leerem `coordinates.text` (kein Crash, kein Skip)

**Betroffene Daten:** `DxfEntityV2` (type=TEXT), `ParseStats.byType`

---

### F3: WarningCollector

**User Story:** Als Anwender moechte ich, dass identische Parser-Warnungen gruppiert und mit Zaehler angezeigt werden (z.B. `"Warnung XY (47x)"`), damit die Warning-Liste bei grossen DXF-Dateien mit vielen Bloecken lesbar bleibt.

**Ablauf:**
1. Eine `WarningCollector`-Klasse sammelt Warnungen und zaehlt Duplikate
2. `parseDxf()` verwendet intern den WarningCollector statt `string[]`
3. Am Ende wird `collector.toArray()` aufgerufen, das die Warnungen mit Zaehler als `string[]` zurueckgibt
4. Die Reihenfolge der Warnungen entspricht der Reihenfolge des ersten Auftretens

**Akzeptanzkriterien:**
- [ ] 47 identische Warnungen `"Block XY nicht gefunden"` ergeben genau einen Eintrag: `"Block XY nicht gefunden (47x)"`
- [ ] Eine Warnung die nur einmal vorkommt wird ohne Zaehler ausgegeben: `"Block XY nicht gefunden"` (nicht `"... (1x)"`)
- [ ] Die Reihenfolge der Ausgabe entspricht der Reihenfolge des ersten Auftretens jeder einzigartigen Warnung
- [ ] `ParseResult.stats.warnings` ist weiterhin `string[]` (kein API-Breaking-Change)
- [ ] Verschiedene Warnungen bleiben getrennt: `"A"` 3x und `"B"` 2x ergeben `["A (3x)", "B (2x)"]`
- [ ] Grenzfall: Keine Warnungen ergibt leeres Array `[]`
- [ ] Grenzfall: Eine einzelne Warnung ergibt `["Warnung"]` (ohne Zaehler)
- [ ] Der bestehende `skippedTypes`-Mechanismus in `parseDxf()` (Zeile 98-100) kann in den WarningCollector integriert oder beibehalten werden — beides ist akzeptabel, solange die Ausgabe identisch bleibt
- [ ] Bestehende Tests die `stats.warnings` pruefen bleiben gruen

**Betroffene Daten:** `ParseStats.warnings` (Format aendert sich bei Duplikaten, Typ bleibt `string[]`)

## 5. Negative Kriterien (was sich NICHT aendern darf)

- Die Signatur von `parseDxf(content: string): ParseResult` bleibt identisch
- `ParseResult`, `ParseStats`, `DxfEntityV2` Interfaces bleiben rueckwaertskompatibel (nur Erweiterungen, keine Entfernungen)
- LINE, CIRCLE, ARC, SPLINE, TEXT, DIMENSION Parsing bleibt identisch
- BLOCKS/INSERT-Aufloesung bleibt identisch
- Cleaner und Classifier werden nicht angefasst
- Bestehende 41 Parser-Tests muessen alle gruen bleiben
- `DxfEntityType` Union wird NICHT um "MTEXT" erweitert (MTEXT wird als "TEXT" gespeichert)

## 6. Nicht-funktionale Anforderungen

- **Performance:** Bulge-Berechnung (trigonometrische Funktionen) darf bei 10.000 Polylinien-Punkten keine spuerbare Verzoegerung verursachen
- **Numerische Stabilitaet:** Kein NaN, Infinity oder Division durch Null bei Extremwerten (bulge nahe 0, bulge sehr gross, chord = 0)
- **Testabdeckung:** Mindestens 5 neue Tests fuer F1, 4 fuer F2, 3 fuer F3

## 7. Offene Fragen

- [ ] Soll `normalizeMText()` als exportierte Funktion verfuegbar sein (fuer spaetere Wiederverwendung) oder reicht eine private Funktion im Parser? -- Entscheidung: Developer
- [ ] Soll der WarningCollector als eigene Datei (`src/lib/dxf/warning-collector.ts`) oder inline im Parser leben? -- Entscheidung: Developer

## 8. Annahmen

- ANNAHME: MTEXT mit verschachtelten Formatbloecken (`{\H2.5;{\fArial;Text}}`) kommt in Praxis-DXFs selten vor. Die Regex-basierte Bereinigung muss nicht beliebig tief verschachtelte Bloecke aufloesen. -- Risiko wenn falsch: Formatreste im Text, die manuell bereinigt werden muessen.
- ANNAHME: Die Y-Achsen-Spiegelung via `<g transform="scale(1,-1)">` in DxfEditor.tsx bleibt bestehen. Die Sweep-Richtung in F1 (`sweep = bulge > 0 ? 1 : 0`) ist NUR damit korrekt. -- Risiko wenn falsch: Alle Boegen werden spiegelverkehrt gerendert.
- ANNAHME: Bulge-Werte bei old-style POLYLINE (mit VERTEX-Entities) sind aktuell nicht relevant, da diese bereits zu LWPOLYLINE konvertiert werden. Falls die Konvertierung Bulge-Werte aus VERTEX (Group Code 42) nicht weitergibt, ist das ein separates Problem. -- Risiko wenn falsch: Old-style Polylinien mit Boegen werden weiterhin falsch dargestellt.
