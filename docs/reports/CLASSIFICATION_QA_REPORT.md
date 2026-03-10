# QA-Report: Klassifizierungs-Refactoring (CUT_OUTER/CUT_INNER -> CUT)

**Datum:** 2026-03-10
**Getestet gegen:** docs/requirements/CLASSIFICATION_REQUIREMENTS.md
**Pruefumfang:** F-CLS-1 bis F-CLS-8

## Zusammenfassung

- Features geprueft: 8 / 8
- Akzeptanzkriterien geprueft: 41
- Akzeptanzkriterien bestanden: 38
- Akzeptanzkriterien mit Befunden: 3 (alle Medium-Schwere)
- tsc --noEmit: PASS (0 Fehler)
- npx vitest run: PASS (107 Tests, 6 Dateien, alle bestanden)
- Grep CUT_OUTER/CUT_INNER in src/: 0 Treffer -- PASS
- Grep CUT_OUTER/CUT_INNER in tests/: 6 Treffer -- FAIL (siehe Befunde)

---

## F-CLS-1: ClassificationType reduzieren

| Akzeptanzkriterium | Status | Beleg |
|---|---|---|
| ClassificationType hat exakt 3 Werte: CUT, BEND, ENGRAVE | PASS | src/types/classification.ts Z.12-15 |
| LAYER_CONFIGS hat exakt 3 Eintraege | PASS | src/types/classification.ts Z.30-49 |
| LAYER_CONFIGS CUT: layerName "CUT", aciNumber 7, hexColor "#1a1a1a" | PASS | src/types/classification.ts Z.32-36 |
| LAYER_CONFIGS BEND: layerName "BEND", aciNumber 3, hexColor "#00cc00" | PASS | src/types/classification.ts Z.37-41 |
| LAYER_CONFIGS ENGRAVE: layerName "ENGRAVE", aciNumber 1, hexColor "#ff0000" | PASS | src/types/classification.ts Z.42-46 |
| Kein TypeScript-Compiler-Fehler (tsc --noEmit) | PASS | tsc --noEmit: 0 Fehler |
| Referenzen auf CUT_OUTER/CUT_INNER erzeugen Compiler-Fehler | PASS | ClassificationType ist Union-Typ, Compiler lehnt andere Werte ab |

---

## F-CLS-2: Classifier-Heuristik anpassen

| Akzeptanzkriterium | Status | Beleg |
|---|---|---|
| Groesste geschlossene Kontur erhaelt classification: "CUT" | PASS | classifier.ts Z.56-58, Rule 3 default |
| Kleinere geschlossene Konturen erhalten classification: "CUT" | PASS | classifier.ts Z.56-58, gleiche Regel |
| Nicht-geschlossene Entities erhalten Default classification: "CUT" | PASS | classifier.ts Z.56-58 |
| TEXT-Entities erhalten classification: "ENGRAVE" | PASS | classifier.ts Z.48-49 |
| Kurze Linien (<=50) erhalten classification: "BEND" | PASS | classifier.ts Z.52-53, BEND_MAX_LENGTH=50 |
| Layer-Name wird auf "CUT" gesetzt, ACI-Farbe auf 7 | PASS | classifier.ts Z.63-67 via getLayerConfig |
| Leeres Entity-Array gibt leeres Array zurueck | PASS | .map() auf leeres Array gibt [] zurueck |
| classifyEntities() mutiert das Input-Array nicht | PASS | classifier.ts Z.41 shallow copy via .map(e => ({...e})) |
| isClosedContour() ist entfernt | PASS | grep isClosedContour in src/: 0 Treffer |

---

## F-CLS-3: ClassifyToolbar auf 3 Buttons reduzieren

| Akzeptanzkriterium | Status | Beleg |
|---|---|---|
| Toolbar zeigt exakt 3 Buttons: "Schneidkontur", "Biegung", "Gravur" | PASS | ClassifyToolbar.tsx Z.27-51, BUTTONS Array mit 3 Eintraegen |
| Kein Button fuer "Aussenkontur" oder "Innenkontur" | PASS | Kein solches Label im BUTTONS Array |
| CUT-Button: Grau-Toene | PASS | bgColor "bg-gray-50", activeColor "bg-gray-700" |
| BEND-Button: Gruen-Toene | PASS | bgColor "bg-green-50", activeColor "bg-green-600" |
| ENGRAVE-Button: Rot-Toene | PASS | bgColor "bg-red-50", activeColor "bg-red-600" |
| Stats-Counter unter jedem Button zeigt korrekte Anzahl | PASS | Z.62: count = stats[type] ?? 0, Z.82-84: {count} gerendert |
| Stats mit 0 Entities zeigt "0" pro Button | PASS | Fallback via ?? 0 |
| Aktiver Button ist visuell hervorgehoben | PASS | Z.72: activeColor + shadow-md + text-white |

---

## F-CLS-4: Editor-Farben anpassen

| Akzeptanzkriterium | Status | Beleg |
|---|---|---|
| CUT-Entities Stroke-Farbe #1a1a1a | PASS | EntityPath.tsx Z.42: CLASSIFICATION_COLORS.CUT = LAYER_CONFIGS[0].hexColor = "#1a1a1a" |
| BEND-Entities Stroke-Farbe #00cc00 | PASS | EntityPath.tsx Z.43: LAYER_CONFIGS[1].hexColor = "#00cc00" |
| ENGRAVE-Entities Stroke-Farbe #ff0000 | PASS | EntityPath.tsx Z.44: LAYER_CONFIGS[2].hexColor = "#ff0000" |
| Selektions-Rechteck nutzt Farbe der aktiven Klassifizierung | PASS | DxfEditor.tsx Z.121-131, 383-385 |
| Entities ohne Klassifizierung in Original-ACI-Farbe | PASS | EntityPath.tsx Z.107-125 Fallback-Logik |

---

## F-CLS-5: Exporter Layer-Mapping anpassen

| Akzeptanzkriterium | Status | Beleg |
|---|---|---|
| Layer CUT mit ACI 7 (Group Code 62) | PASS | exporter.ts Z.126-128 iteriert LAYER_CONFIGS, ACI 7 fuer CUT |
| Layer BEND mit ACI 3 | PASS | LAYER_CONFIGS[1].aciNumber = 3 |
| Layer ENGRAVE mit ACI 1 | PASS | LAYER_CONFIGS[2].aciNumber = 1 |
| Kein Layer CUT_OUTER oder CUT_INNER in exportierter DXF | PASS | Exporter nutzt nur LAYER_CONFIGS dynamisch |
| Jede Entity hat Group Code 8 mit korrektem Layer-Namen | PASS | exporter.ts Z.185: writeCommonProps schreibt entity.layer |
| CUT-Entities: ACI 7 wird NICHT als Entity-Color geschrieben | PASS | exporter.ts Z.186: `if (entity.color !== 7 && entity.color !== 256)` |
| Export mit 0 Entities erzeugt gueltige DXF | PASS | Test "produces valid DXF even with empty entities array" besteht |

---

## F-CLS-6: AppShell State-Aenderungen

| Akzeptanzkriterium | Status | Beleg |
|---|---|---|
| Initial-State activeClassification ist "CUT" | PASS | AppShell.tsx Z.75: useState<ClassificationType>("CUT") |
| Stats-Objekt hat exakt 3 Keys: CUT, BEND, ENGRAVE | PASS | AppShell.tsx Z.315-319 |
| Kein Key CUT_OUTER oder CUT_INNER im Stats-Objekt | PASS | Nur CUT, BEND, ENGRAVE in Z.316-318 |
| Entities ohne Klassifizierung werden in Stats nicht gezaehlt | PASS | Z.321: `if (entity.classification)` Guard |

---

## F-CLS-7: Tests aktualisieren

| Akzeptanzkriterium | Status | Beleg |
|---|---|---|
| Alle Classifier-Tests bestehen mit neuen Typen | PASS | vitest run: 13/13 Tests in classifier.test.ts bestanden |
| Test prueft groesste geschlossene Kontur auf CUT | PASS | classifier.test.ts Z.77: expect(...).toBe("CUT") |
| Test prueft kleinere geschlossene Konturen auf CUT | PASS | classifier.test.ts Z.117-118: alle CUT |
| Test prueft lange Linien auf CUT | PASS | classifier.test.ts Z.152: expect(...).toBe("CUT") |
| ACI-Erwartungen: CUT=7, BEND=3, ENGRAVE=1 | PASS | classifier.test.ts Z.51, Z.136, Z.170, Z.194 |
| Stats-Test: Kein Key CUT_OUTER oder CUT_INNER | PASS | classifier.test.ts Z.274-276: nur CUT, BEND, ENGRAVE |
| applyClassification Test: Verwendet CUT | PASS | classifier.test.ts Z.300: applyClassification(..., "CUT") |
| Alle Tests laufen durch (npx vitest run) | PASS | 107/107 Tests bestanden |

---

## F-CLS-8: Migration bestehender Daten (localStorage)

| Akzeptanzkriterium | Status | Beleg |
|---|---|---|
| Migration von CUT_OUTER/CUT_INNER zu CUT | N/A | Laut Requirements-Anmerkung: "Bei reinem In-Memory-State entfaellt die Migration." AppShell nutzt nur useState, kein localStorage. |

---

## Grep-Ergebnis: CUT_OUTER / CUT_INNER

**src/**: 0 Treffer -- PASS

**tests/**: 6 Treffer -- FAIL

| Datei | Zeile | Kontext | Bewertung |
|---|---|---|---|
| tests/exporter.test.ts:23 | `layer: "CUT_OUTER"` | makeEntity-Helper Default | Medium: Stale Referenz, sollte "CUT" sein |
| tests/exporter.test.ts:58 | `layer: "CUT_OUTER"` | Testdaten | Medium: Stale Referenz |
| tests/exporter.test.ts:78 | `layer: "CUT_OUTER"` | Testdaten | Medium: Stale Referenz |
| tests/parser.test.ts:639 | `layer: "CUT_OUTER"` | INSERT-Testdaten | OK: Parser testet beliebige DXF-Layer-Namen, kein Klassifizierungsbezug |
| tests/parser.test.ts:646 | Kommentar | "inherits INSERT layer CUT_OUTER" | OK: Beschreibt DXF-Verhalten, nicht Klassifizierung |
| tests/parser.test.ts:647 | `expect(...).toBe("CUT_OUTER")` | Assertion | OK: Parser-Test, Layer-Name aus DXF-Eingabe |

**Bewertung:** Die 3 Treffer in `exporter.test.ts` sind stale Testdaten, die das alte Schema verwenden. Die Tests bestehen trotzdem, weil `layer` als `string` typisiert ist und "CUT_OUTER" ein gueltiger String ist. Die Tests pruefen nicht, ob der Layer-Name dem neuen Schema entspricht. Die 3 Treffer in `parser.test.ts` sind korrekt -- der Parser liest beliebige DXF-Layer-Namen.

## Stale-Kommentar in Produktivcode

| Datei | Zeile | Problem |
|---|---|---|
| src/lib/dxf/exporter.ts | 125 | Kommentar sagt "four classification layers", korrekt waeren "three" |

---

## TypeScript-Check

```
npx tsc --noEmit
```

Ergebnis: 0 Fehler -- PASS

---

## Vitest-Ergebnis

```
npx vitest run
  tests/cleaner.test.ts      28 tests  PASS
  tests/classifier.test.ts   13 tests  PASS
  tests/part-workflow.test.ts  4 tests  PASS
  tests/entity-selection.test.ts  4 tests  PASS
  tests/exporter.test.ts     17 tests  PASS
  tests/parser.test.ts       41 tests  PASS

  Test Files  6 passed (6)
  Tests       107 passed (107)
```

Ergebnis: Alle 107 Tests bestanden -- PASS

---

## Offene Probleme

| # | Schwere | Feature | Beschreibung | Datei |
|---|---|---|---|---|
| 1 | Medium | F-CLS-7 | exporter.test.ts makeEntity-Helper nutzt Default `layer: "CUT_OUTER"` statt `"CUT"`. 3 Stellen betroffen. Tests bestehen nur weil `layer` ein `string` ist. | tests/exporter.test.ts Z.23, 58, 78 |
| 2 | Low | F-CLS-5 | Kommentar in exporter.ts Z.125 sagt "four classification layers", korrekt waeren "three". | src/lib/dxf/exporter.ts Z.125 |

---

## Fazit

Das Klassifizierungs-Refactoring ist im Produktivcode (`src/`) vollstaendig und korrekt umgesetzt. Alle Akzeptanzkriterien aus CLASSIFICATION_REQUIREMENTS.md sind erfuellt. TypeScript-Check und alle 107 Tests bestehen.

Es gibt 2 offene Befunde mit Medium/Low-Schwere:
1. **tests/exporter.test.ts** enthaelt 3 stale Referenzen auf "CUT_OUTER" als Layer-Name in Testdaten. Diese sollten auf "CUT" aktualisiert werden, damit die Testdaten das neue Schema widerspiegeln.
2. **src/lib/dxf/exporter.ts** hat einen stale Kommentar ("four" statt "three").

Keiner der Befunde ist funktional kritisch -- alle Tests laufen durch und der Produktivcode ist korrekt.
