# Requirements: Klassifizierungs-Refactoring (CUT_OUTER/CUT_INNER -> CUT)

> Generiert aus PROJECT_BRIEF.md und Codebase-Analyse am 2026-03-10.
> Dies ist die Single Source of Truth fuer das Klassifizierungs-Refactoring.

## 1. Ziel

Zusammenlegung der Klassifizierungstypen `CUT_OUTER` und `CUT_INNER` zu einem einzigen Typ `CUT` und Anpassung aller Farben an den Trumpf/Bystronic Maschinenstandard. Das 4-Layer-System (CUT_OUTER, CUT_INNER, BEND, ENGRAVE) wird auf ein 3-Layer-System (CUT, BEND, ENGRAVE) reduziert.

### Begruendung

- Trumpf- und Bystronic-Laserschneidmaschinen unterscheiden nicht zwischen Aussen- und Innenkontur
- Das CAM-System bestimmt Schnittparameter und Anfahrtstrategie automatisch
- Die bisherige Unterscheidung war eine falsche Annahme im urspruenglichen Projektbrief
- Die Farben muessen dem ACI-Standard der Maschinen entsprechen

### Nicht-Ziele

- Keine neue Klassifizierungslogik (Heuristiken bleiben gleich, nur Zieltypen aendern sich)
- Keine Aenderung am Workflow (F1-F6 Reihenfolge bleibt)
- Keine Aenderung am Parser oder Cleaner
- Keine Aenderung an der Selektions-Mechanik (F3)
- Kein neues Feature "Undo/Redo" in diesem Refactoring

## 2. Farbzuordnung: Alt vs. Neu

### Altes System (4 Layer)

| Layer | Anzeige-Farbe | ACI-Code | Zweck |
|---|---|---|---|
| `CUT_OUTER` | Rot `#FF0000` | 1 | Aussenkontur |
| `CUT_INNER` | Blau `#0000FF` | 5 | Innenkontur |
| `BEND` | Gelb `#FFFF00` | 2 | Biegelinien |
| `ENGRAVE` | Gruen `#00CC00` | 3 | Gravuren |

### Neues System (3 Layer, Trumpf/Bystronic Standard)

| Layer | DXF-ACI-Code | DXF-Farbe | SVG-Anzeige-Farbe | Zweck |
|---|---|---|---|---|
| `CUT` | 7 | Weiss | `#1a1a1a` (Dunkelgrau auf hellem Canvas) | Schneidkontur (aussen + innen) |
| `BEND` | 3 | Gruen | `#00cc00` | Biegelinien |
| `ENGRAVE` | 1 | Rot | `#ff0000` | Gravuren |

### Hinweis zur CUT-Anzeige

ACI 7 ist "Weiss" im DXF-Standard. Auf dem hellen Canvas der App wird Weiss zu Dunkelgrau (`#1a1a1a`) umgefaerbt. Dieser Mechanismus existiert bereits in `EntityPath.tsx` (`resolveEntityColor`).

## 3. Features

### F-CLS-1: ClassificationType reduzieren

**User Story:** Als Entwickler moechte ich den Typ `ClassificationType` von 4 auf 3 Werte reduzieren, damit der Code den Maschinenstandard korrekt abbildet.

**Ablauf:**
1. `ClassificationType` Union aendern: `"CUT" | "BEND" | "ENGRAVE"`
2. `LAYER_CONFIGS` Array auf 3 Eintraege reduzieren mit neuen ACI-Codes
3. `getLayerConfig()` funktioniert unveraendert (Lookup per Classification)
4. TypeScript-Compiler-Fehler in allen betroffenen Dateien beheben

**Akzeptanzkriterien:**
- [ ] `ClassificationType` hat exakt 3 Werte: `"CUT"`, `"BEND"`, `"ENGRAVE"`
- [ ] `LAYER_CONFIGS` hat exakt 3 Eintraege
- [ ] `LAYER_CONFIGS` fuer `CUT`: layerName `"CUT"`, aciNumber `7`, hexColor `"#1a1a1a"`
- [ ] `LAYER_CONFIGS` fuer `BEND`: layerName `"BEND"`, aciNumber `3`, hexColor `"#00cc00"`
- [ ] `LAYER_CONFIGS` fuer `ENGRAVE`: layerName `"ENGRAVE"`, aciNumber `1`, hexColor `"#ff0000"`
- [ ] Kein TypeScript-Compiler-Fehler (`tsc --noEmit` erfolgreich)
- [ ] Fehlerfall: Referenzen auf `"CUT_OUTER"` oder `"CUT_INNER"` erzeugen Compiler-Fehler

**Betroffene Dateien:** `src/types/classification.ts`

---

### F-CLS-2: Classifier-Heuristik anpassen

**User Story:** Als Bediener moechte ich, dass alle Schneidkonturen (egal ob aussen oder innen) einheitlich als `CUT` klassifiziert werden, weil meine Maschine keinen Unterschied macht.

**Ablauf:**
1. `classifyEntities()` weist geschlossenen Konturen (groesste und kleinere) den Typ `CUT` zu
2. Nicht-geschlossene, nicht-kurze Entities erhalten ebenfalls `CUT` als Default
3. TEXT-Entities bleiben `ENGRAVE`
4. Kurze Linien bleiben `BEND`

**Akzeptanzkriterien:**
- [ ] Groesste geschlossene Kontur erhaelt `classification: "CUT"` (vorher `CUT_OUTER`)
- [ ] Kleinere geschlossene Konturen erhalten `classification: "CUT"` (vorher `CUT_INNER`)
- [ ] Nicht-geschlossene Entities erhalten Default `classification: "CUT"` (vorher `CUT_INNER`)
- [ ] TEXT-Entities erhalten weiterhin `classification: "ENGRAVE"`
- [ ] Kurze Linien (Laenge <= 50 DXF-Einheiten) erhalten weiterhin `classification: "BEND"`
- [ ] Layer-Name wird auf `"CUT"` gesetzt, ACI-Farbe auf `7`
- [ ] Fehlerfall: Leeres Entity-Array gibt leeres Array zurueck (kein Crash)
- [ ] `classifyEntities()` mutiert das Input-Array nicht

**Betroffene Dateien:** `src/lib/dxf/classifier.ts`

---

### F-CLS-3: ClassifyToolbar auf 3 Buttons reduzieren

**User Story:** Als Bediener moechte ich in F5 drei Buttons sehen (Schneidkontur, Biegung, Gravur), damit die UI den tatsaechlichen Maschinentypen entspricht.

**Ablauf:**
1. BUTTONS-Array in `ClassifyToolbar.tsx` auf 3 Eintraege reduzieren
2. Button-Labels: "Schneidkontur", "Biegung", "Gravur"
3. Button-Farben an neues Farbschema anpassen
4. Stats-Anzeige unter den Buttons zeigt 3 statt 4 Kategorien

**Akzeptanzkriterien:**
- [ ] Toolbar zeigt exakt 3 Buttons: "Schneidkontur", "Biegung", "Gravur"
- [ ] Kein Button fuer "Aussenkontur" oder "Innenkontur" sichtbar
- [ ] CUT-Button: Grau-Toene (da Weiss auf hellem Hintergrund nicht sichtbar)
- [ ] BEND-Button: Gruen-Toene
- [ ] ENGRAVE-Button: Rot-Toene
- [ ] Stats-Counter unter jedem Button zeigt korrekte Anzahl
- [ ] Fehlerfall: Stats mit 0 Entities zeigt "0" pro Button (kein leerer State)
- [ ] Aktiver Button ist visuell hervorgehoben (filled, shadow)

**Betroffene Dateien:** `src/components/shared/ClassifyToolbar.tsx`

---

### F-CLS-4: Editor-Farben anpassen

**User Story:** Als Bediener moechte ich im Editor die klassifizierten Entities in den korrekten Maschinenfarben sehen, damit ich die Zuordnung visuell pruefen kann.

**Ablauf:**
1. `CLASSIFICATION_COLORS` in `EntityPath.tsx` auf 3 Eintraege anpassen
2. `CLASSIFICATION_RECT_COLORS` und `CLASSIFICATION_STROKE_COLORS` in `DxfEditor.tsx` auf 3 Eintraege anpassen
3. CUT-Entities werden dunkelgrau dargestellt (ACI 7 -> `#1a1a1a`)

**Akzeptanzkriterien:**
- [ ] CUT-Entities werden mit Stroke-Farbe `#1a1a1a` gerendert
- [ ] BEND-Entities werden mit Stroke-Farbe `#00cc00` gerendert
- [ ] ENGRAVE-Entities werden mit Stroke-Farbe `#ff0000` gerendert
- [ ] Selektions-Rechteck im Classify-Modus nutzt die Farbe der aktiven Klassifizierung
- [ ] Grenzfall: Entities ohne Klassifizierung werden weiterhin in ihrer Original-ACI-Farbe dargestellt

**Betroffene Dateien:** `src/components/editor/EntityPath.tsx`, `src/components/editor/DxfEditor.tsx`

---

### F-CLS-5: Exporter Layer-Mapping anpassen

**User Story:** Als Bediener moechte ich, dass die exportierte DXF-Datei die korrekten Layer-Namen und ACI-Farben enthaelt, damit meine Trumpf/Bystronic-Maschine die Datei korrekt liest.

**Ablauf:**
1. `writeLayerTable()` schreibt 3 Layer statt 4 in die TABLES-Section
2. Layer-Name `CUT` mit ACI-Farbe 7
3. Layer-Name `BEND` mit ACI-Farbe 3
4. Layer-Name `ENGRAVE` mit ACI-Farbe 1
5. Entities erhalten den korrekten Layer-Namen im `8`-Group-Code

**Akzeptanzkriterien:**
- [ ] Exportierte DXF enthaelt Layer `CUT` mit ACI 7 (Group Code 62)
- [ ] Exportierte DXF enthaelt Layer `BEND` mit ACI 3 (Group Code 62)
- [ ] Exportierte DXF enthaelt Layer `ENGRAVE` mit ACI 1 (Group Code 62)
- [ ] Kein Layer `CUT_OUTER` oder `CUT_INNER` in der exportierten DXF
- [ ] Jede Entity hat Group Code 8 mit dem korrekten Layer-Namen
- [ ] CUT-Entities: ACI 7 wird NICHT als Entity-Color geschrieben (weil 7 = ByLayer Default, siehe `writeCommonProps`)
- [ ] Fehlerfall: Export mit 0 Entities erzeugt gueltige DXF-Datei (Header + leere Entities-Section + EOF)

**Betroffene Dateien:** `src/lib/dxf/exporter.ts` (indirekt via `LAYER_CONFIGS`)

---

### F-CLS-6: AppShell State-Aenderungen

**User Story:** Als Bediener moechte ich, dass der Workflow-State korrekt mit den neuen 3 Klassifizierungstypen arbeitet.

**Ablauf:**
1. Default `activeClassification` von `"CUT_OUTER"` auf `"CUT"` aendern
2. `classificationStats` auf 3 Kategorien reduzieren
3. Alle Referenzen auf `CUT_OUTER`/`CUT_INNER` entfernen

**Akzeptanzkriterien:**
- [ ] Initial-State: `activeClassification` ist `"CUT"`
- [ ] Stats-Objekt hat exakt 3 Keys: `CUT`, `BEND`, `ENGRAVE`
- [ ] Kein Key `CUT_OUTER` oder `CUT_INNER` im Stats-Objekt
- [ ] Fehlerfall: Entities ohne Klassifizierung werden in Stats nicht gezaehlt

**Betroffene Dateien:** `src/components/shared/AppShell.tsx`

---

### F-CLS-7: Tests aktualisieren

**User Story:** Als Entwickler moechte ich, dass alle Tests die neuen 3 Klassifizierungstypen verwenden und bestehen.

**Ablauf:**
1. `classifier.test.ts`: Alle `CUT_OUTER`-Erwartungen auf `CUT` aendern
2. `classifier.test.ts`: Alle `CUT_INNER`-Erwartungen auf `CUT` aendern
3. Stats-Tests: 3 Keys statt 4
4. `applyClassification` Tests: `CUT` statt `CUT_OUTER`
5. ACI-Code-Erwartungen anpassen (CUT -> 7, BEND -> 3, ENGRAVE -> 1)

**Akzeptanzkriterien:**
- [ ] Alle bestehenden Classifier-Tests bestehen mit neuen Typen
- [ ] Test "classifies the largest closed contour as CUT_OUTER" -> prueft auf `CUT`
- [ ] Test "classifies smaller closed contours as CUT_INNER" -> prueft auf `CUT`
- [ ] Test "classifies long lines as CUT_INNER (default)" -> prueft auf `CUT`
- [ ] ACI-Erwartungen: CUT = 7, BEND = 3, ENGRAVE = 1
- [ ] Stats-Test: Kein Key `CUT_OUTER` oder `CUT_INNER`
- [ ] `applyClassification` Test: Verwendet `CUT` statt `CUT_OUTER`
- [ ] Alle Tests laufen durch: `npx vitest run`

**Betroffene Dateien:** `tests/classifier.test.ts`

---

### F-CLS-8: Migration bestehender Daten (localStorage)

**User Story:** Als Bediener moechte ich, dass bereits gespeicherte Projekte mit der alten 4-Typ-Klassifizierung nach dem Update weiterhin funktionieren.

**Ablauf:**
1. Beim Laden von Entities aus localStorage pruefen ob `CUT_OUTER` oder `CUT_INNER` vorkommt
2. Beide auf `CUT` migrieren und Layer/Farbe aktualisieren
3. Migrierte Daten zurueckschreiben

**Akzeptanzkriterien:**
- [ ] Entities mit `classification: "CUT_OUTER"` werden beim Laden zu `classification: "CUT"` migriert
- [ ] Entities mit `classification: "CUT_INNER"` werden beim Laden zu `classification: "CUT"` migriert
- [ ] Layer wird auf `"CUT"` gesetzt, ACI-Farbe auf `7`
- [ ] Entities ohne Klassifizierung bleiben unveraendert
- [ ] BEND- und ENGRAVE-Entities werden korrekt migriert (neue ACI-Codes)
- [ ] Fehlerfall: Korrupte/leere localStorage-Daten verursachen keinen Crash

**Betroffene Dateien:** Migrations-Logik (neues Utility oder in bestehendem Lade-Code)

> Anmerkung: Aktuell wird localStorage im MVP nicht persistent genutzt (State nur in React useState). Diese Anforderung wird relevant sobald Persistierung implementiert ist. Bei reinem In-Memory-State entfaellt die Migration.

## 4. Datenobjekte (Aenderungen)

| Objekt | Feld | Alt | Neu |
|---|---|---|---|
| `ClassificationType` | Union | `"CUT_OUTER" \| "CUT_INNER" \| "BEND" \| "ENGRAVE"` | `"CUT" \| "BEND" \| "ENGRAVE"` |
| `LAYER_CONFIGS[0]` | classification | `"CUT_OUTER"` | `"CUT"` |
| `LAYER_CONFIGS[0]` | layerName | `"CUT_OUTER"` | `"CUT"` |
| `LAYER_CONFIGS[0]` | hexColor | `"#FF0000"` | `"#1a1a1a"` |
| `LAYER_CONFIGS[0]` | aciNumber | `1` | `7` |
| `LAYER_CONFIGS[1]` | - | CUT_INNER-Eintrag | **entfaellt** |
| `LAYER_CONFIGS[1]` (neu) | classification | `"BEND"` | `"BEND"` |
| `LAYER_CONFIGS[1]` (neu) | hexColor | `"#FFFF00"` | `"#00cc00"` |
| `LAYER_CONFIGS[1]` (neu) | aciNumber | `2` | `3` |
| `LAYER_CONFIGS[2]` (neu) | classification | `"ENGRAVE"` | `"ENGRAVE"` |
| `LAYER_CONFIGS[2]` (neu) | hexColor | `"#00CC00"` | `"#ff0000"` |
| `LAYER_CONFIGS[2]` (neu) | aciNumber | `3` | `1` |

## 5. Betroffene Dateien (vollstaendige Liste)

| Datei | Aenderungstyp | Beschreibung |
|---|---|---|
| `src/types/classification.ts` | Type + Const | Union reduzieren, LAYER_CONFIGS aktualisieren |
| `src/lib/dxf/classifier.ts` | Logik | CUT_OUTER/CUT_INNER -> CUT, Stats-Keys anpassen |
| `src/components/shared/ClassifyToolbar.tsx` | UI | 4 -> 3 Buttons, Labels + Farben anpassen |
| `src/components/shared/AppShell.tsx` | State | Default-Wert + Stats-Keys anpassen |
| `src/components/editor/EntityPath.tsx` | Farben | CLASSIFICATION_COLORS auf 3 Keys anpassen |
| `src/components/editor/DxfEditor.tsx` | Farben | Selektions-Rechteck-Farben auf 3 Keys anpassen |
| `src/lib/dxf/exporter.ts` | Indirekt | Nutzt LAYER_CONFIGS, keine Code-Aenderung noetig |
| `tests/classifier.test.ts` | Tests | Erwartungswerte anpassen |
| `PROJECT_BRIEF.md` | Doku | Abschnitt 9 Layer-System aktualisieren |

## 6. Nicht-funktionale Anforderungen

- **Abwaertskompatibilitaet:** Kein Breaking Change im DXF-Parser oder Cleaner
- **Compile-Safety:** TypeScript-Compiler muss nach dem Refactoring fehlerfrei durchlaufen. Alle alten Referenzen auf `CUT_OUTER`/`CUT_INNER` sollen Compiler-Fehler erzeugen (kein String-Literal-Hack)
- **Test-Coverage:** Bestehende Test-Suite muss bestehen (`npx vitest run`)
- **Kein Feature-Creep:** Dieses Refactoring aendert ausschliesslich die Klassifizierungstypen und Farben

## 7. Reihenfolge der Implementierung

1. `src/types/classification.ts` -- Typ und Konstanten aendern (erzeugt Compiler-Fehler)
2. `src/lib/dxf/classifier.ts` -- Compiler-Fehler beheben, Logik anpassen
3. `src/components/shared/AppShell.tsx` -- State + Stats anpassen
4. `src/components/shared/ClassifyToolbar.tsx` -- Buttons reduzieren
5. `src/components/editor/EntityPath.tsx` -- Farb-Mapping anpassen
6. `src/components/editor/DxfEditor.tsx` -- Selektions-Farben anpassen
7. `tests/classifier.test.ts` -- Tests anpassen
8. `PROJECT_BRIEF.md` -- Doku aktualisieren

> Strategie: Zuerst den Typ aendern, dann dem Compiler folgen. Die Type-Narrowing-Fehler zeigen exakt wo Code angepasst werden muss.

## 8. Offene Fragen

- [ ] Soll BEND ACI 3 (Gruen) oder ACI 2 (Gelb) verwenden? Trumpf-Standard ist 3, Bystronic teilweise 2. -- Entscheidung: ACI 3 (Gruen) als Default, da Trumpf-Standard. Kann spaeter konfigurierbar gemacht werden.

## 9. Annahmen

- ANNAHME: ACI 7 (Weiss) ist der korrekte Maschinenstandard fuer Schneidkonturen bei Trumpf und Bystronic. -- Risiko wenn falsch: Exportierte DXF wird von der Maschine nicht korrekt gelesen, Layer-Farben stimmen nicht.
- ANNAHME: Es gibt aktuell keine persistierten Daten in localStorage mit der alten Klassifizierung. -- Risiko wenn falsch: Bestehende Projekte zeigen fehlerhafte Klassifizierung. Mitigiert durch F-CLS-8.
- ANNAHME: Die BEND-Farbe Gruen (ACI 3) wird von allen Ziel-Maschinen korrekt erkannt. -- Risiko wenn falsch: Biegelinien werden als Schneidlinien interpretiert.
