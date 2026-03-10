# Klassifizierungs-Refactoring: Technische Architektur

> Erstellt am 2026-03-10 auf Basis von `docs/requirements/CLASSIFICATION_REQUIREMENTS.md`.
> Dieses Dokument beschreibt die exakten Code-Aenderungen fuer die Zusammenlegung von
> CUT_OUTER/CUT_INNER zu CUT und die Anpassung aller Farben an den Trumpf/Bystronic-Standard.

---

## 1. Aenderungsuebersicht

| Datei | Was aendert sich | Aufwand |
|---|---|---|
| `src/types/classification.ts` | Union 4->3, LAYER_CONFIGS 4->3, neue ACI-Codes | Klein |
| `src/lib/dxf/classifier.ts` | CUT_OUTER/CUT_INNER -> CUT, Stats-Keys 4->3 | Klein |
| `src/components/shared/ClassifyToolbar.tsx` | BUTTONS 4->3, Labels + Farben | Klein |
| `src/components/shared/AppShell.tsx` | Default `"CUT"`, Stats-Keys 3 | Klein |
| `src/components/editor/EntityPath.tsx` | CLASSIFICATION_COLORS 4->3 | Klein |
| `src/components/editor/DxfEditor.tsx` | RECT/STROKE_COLORS 4->3 | Klein |
| `src/lib/dxf/exporter.ts` | Keine Code-Aenderung (nutzt LAYER_CONFIGS dynamisch) | Keine |
| `tests/classifier.test.ts` | Erwartungswerte anpassen | Klein |

---

## 2. Detaillierte Code-Aenderungen pro Datei

### 2.1 `src/types/classification.ts`

**VORHER:**
```typescript
/** The four laser-cutting classification categories */
export type ClassificationType =
  | "CUT_OUTER"
  | "CUT_INNER"
  | "BEND"
  | "ENGRAVE";
```

**NACHHER:**
```typescript
/** The three laser-cutting classification categories (Trumpf/Bystronic standard) */
export type ClassificationType =
  | "CUT"
  | "BEND"
  | "ENGRAVE";
```

**Warum:** Trumpf/Bystronic-Maschinen unterscheiden nicht zwischen Aussen- und Innenkontur. Das CAM-System bestimmt die Anfahrtstrategie automatisch.

---

**VORHER:**
```typescript
/**
 * Canonical layer configurations for all four classification types.
 * Used by the exporter (TABLES section) and classifier (color assignment).
 */
export const LAYER_CONFIGS: readonly LayerConfig[] = [
  {
    classification: "CUT_OUTER",
    layerName: "CUT_OUTER",
    hexColor: "#FF0000",
    aciNumber: 1,
  },
  {
    classification: "CUT_INNER",
    layerName: "CUT_INNER",
    hexColor: "#0000FF",
    aciNumber: 5,
  },
  {
    classification: "BEND",
    layerName: "BEND",
    hexColor: "#FFFF00",
    aciNumber: 2,
  },
  {
    classification: "ENGRAVE",
    layerName: "ENGRAVE",
    hexColor: "#00CC00",
    aciNumber: 3,
  },
] as const;
```

**NACHHER:**
```typescript
/**
 * Canonical layer configurations for all three classification types.
 * Used by the exporter (TABLES section) and classifier (color assignment).
 *
 * ACI-Codes folgen dem Trumpf/Bystronic-Standard:
 * - CUT: ACI 7 (Weiss) -> SVG-Anzeige als #1a1a1a (Dunkelgrau auf hellem Canvas)
 * - BEND: ACI 3 (Gruen)
 * - ENGRAVE: ACI 1 (Rot)
 */
export const LAYER_CONFIGS: readonly LayerConfig[] = [
  {
    classification: "CUT",
    layerName: "CUT",
    hexColor: "#1a1a1a",
    aciNumber: 7,
  },
  {
    classification: "BEND",
    layerName: "BEND",
    hexColor: "#00cc00",
    aciNumber: 3,
  },
  {
    classification: "ENGRAVE",
    layerName: "ENGRAVE",
    hexColor: "#ff0000",
    aciNumber: 1,
  },
] as const;
```

**Warum:** Reduktion auf 3 Layer mit korrekten ACI-Codes. CUT = ACI 7 (Weiss, Maschinenstandard), BEND = ACI 3 (Gruen), ENGRAVE = ACI 1 (Rot).

---

**VORHER (Doc-Kommentar):**
```typescript
/**
 * Classification types for laser cutting operations.
 *
 * Each DXF entity is classified into one of four categories
 * that determine its layer name, color, and ACI number in the
 * exported DXF file.
 *
 * Reference: docs/ARCHITECTURE.md "ClassificationType" + "LayerConfig"
 */
```

**NACHHER:**
```typescript
/**
 * Classification types for laser cutting operations.
 *
 * Each DXF entity is classified into one of three categories
 * that determine its layer name, color, and ACI number in the
 * exported DXF file.
 *
 * ACI color mapping follows the Trumpf/Bystronic machine standard.
 *
 * Reference: docs/ARCHITECTURE.md "ClassificationType" + "LayerConfig"
 */
```

---

### 2.2 `src/lib/dxf/classifier.ts`

**VORHER (Module-Kommentar Zeilen 1-18):**
```typescript
/**
 * DXF Auto-Classification Module.
 *
 * Pure function: DxfEntityV2[] in, classified DxfEntityV2[] out.
 * No external dependencies.
 *
 * Heuristics (applied in order):
 * 1. TEXT entities -> ENGRAVE
 * 2. Detect closed contours (closed polylines, circles)
 * 3. Largest closed contour (by length) -> CUT_OUTER
 * 4. Smaller closed contours -> CUT_INNER
 * 5. Short straight lines (not part of a closed contour) -> BEND
 * 6. Everything else -> CUT_INNER (default)
 *
 * After classification, layer and color are set according to LAYER_CONFIGS.
 *
 * Reference: docs/ARCHITECTURE.md "src/lib/dxf/classifier.ts"
 */
```

**NACHHER:**
```typescript
/**
 * DXF Auto-Classification Module.
 *
 * Pure function: DxfEntityV2[] in, classified DxfEntityV2[] out.
 * No external dependencies.
 *
 * Heuristics (applied in order):
 * 1. TEXT entities -> ENGRAVE
 * 2. Short straight lines (length <= 50 DXF units) -> BEND
 * 3. Everything else (closed contours, long lines, arcs, etc.) -> CUT
 *
 * After classification, layer and color are set according to LAYER_CONFIGS.
 *
 * Reference: docs/ARCHITECTURE.md "src/lib/dxf/classifier.ts"
 */
```

**Warum:** Die Heuristik wird vereinfacht. Da CUT_OUTER und CUT_INNER zum selben Typ CUT werden, entfaellt die Logik zur Ermittlung der groessten geschlossenen Kontur.

---

**VORHER (classifyEntities Funktion, Zeilen 42-100):**
```typescript
export function classifyEntities(entities: DxfEntityV2[]): DxfEntityV2[] {
  // Work with copies to avoid mutation
  const result = entities.map((e) => ({ ...e }));

  // Step 1: Find closed contours
  const closedContourIds = new Set<number>();
  const closedContours: Array<{ id: number; length: number }> = [];

  for (const entity of result) {
    if (isClosedContour(entity)) {
      closedContourIds.add(entity.id);
      closedContours.push({ id: entity.id, length: entity.length });
    }
  }

  // Step 2: Find the largest closed contour (by length)
  let largestContourId: number | null = null;
  if (closedContours.length > 0) {
    closedContours.sort((a, b) => b.length - a.length);
    largestContourId = closedContours[0].id;
  }

  // Step 3: Classify each entity
  for (const entity of result) {
    let classification: ClassificationType;

    // Rule 1: TEXT -> ENGRAVE
    if (entity.type === "TEXT") {
      classification = "ENGRAVE";
    }
    // Rule 3: Largest closed contour -> CUT_OUTER
    else if (entity.id === largestContourId) {
      classification = "CUT_OUTER";
    }
    // Rule 4: Other closed contours -> CUT_INNER
    else if (closedContourIds.has(entity.id)) {
      classification = "CUT_INNER";
    }
    // Rule 5: Short straight lines -> BEND
    else if (isShortLine(entity)) {
      classification = "BEND";
    }
    // Rule 6: Everything else -> CUT_INNER
    else {
      classification = "CUT_INNER";
    }

    entity.classification = classification;

    // Set layer and color from LAYER_CONFIGS
    const config = getLayerConfig(classification);
    if (config) {
      entity.layer = config.layerName;
      entity.color = config.aciNumber;
    }
  }

  return result;
}
```

**NACHHER:**
```typescript
export function classifyEntities(entities: DxfEntityV2[]): DxfEntityV2[] {
  // Work with copies to avoid mutation
  const result = entities.map((e) => ({ ...e }));

  for (const entity of result) {
    let classification: ClassificationType;

    // Rule 1: TEXT -> ENGRAVE
    if (entity.type === "TEXT") {
      classification = "ENGRAVE";
    }
    // Rule 2: Short straight lines -> BEND
    else if (isShortLine(entity)) {
      classification = "BEND";
    }
    // Rule 3: Everything else -> CUT
    else {
      classification = "CUT";
    }

    entity.classification = classification;

    // Set layer and color from LAYER_CONFIGS
    const config = getLayerConfig(classification);
    if (config) {
      entity.layer = config.layerName;
      entity.color = config.aciNumber;
    }
  }

  return result;
}
```

**Warum:** Die gesamte Closed-Contour-Erkennung (Steps 1+2 im alten Code) wird entfernt, da sie nur zur Unterscheidung CUT_OUTER vs. CUT_INNER diente. Die Funktionen `isClosedContour()` koennen entfernt werden (nur noch von der alten Logik genutzt). `isShortLine()` bleibt unveraendert.

---

**VORHER (getClassificationStats, Zeilen 129-146):**
```typescript
export function getClassificationStats(
  entities: DxfEntityV2[],
): Record<ClassificationType, number> {
  const stats: Record<ClassificationType, number> = {
    CUT_OUTER: 0,
    CUT_INNER: 0,
    BEND: 0,
    ENGRAVE: 0,
  };

  for (const entity of entities) {
    if (entity.classification && entity.classification in stats) {
      stats[entity.classification]++;
    }
  }

  return stats;
}
```

**NACHHER:**
```typescript
export function getClassificationStats(
  entities: DxfEntityV2[],
): Record<ClassificationType, number> {
  const stats: Record<ClassificationType, number> = {
    CUT: 0,
    BEND: 0,
    ENGRAVE: 0,
  };

  for (const entity of entities) {
    if (entity.classification && entity.classification in stats) {
      stats[entity.classification]++;
    }
  }

  return stats;
}
```

---

**Entfernter Code:**

Die Funktion `isClosedContour()` (Zeilen 110-114) kann entfernt werden, da sie ausschliesslich in der alten CUT_OUTER/CUT_INNER-Unterscheidung verwendet wurde:

```typescript
// ENTFERNEN:
function isClosedContour(entity: DxfEntityV2): boolean {
  if (entity.type === "CIRCLE") return true;
  if (entity.type === "LWPOLYLINE" && entity.closed) return true;
  return false;
}
```

**Warum:** Die Funktion hat keinen Nutzen mehr, nachdem alle Nicht-TEXT/Nicht-BEND Entities zu CUT werden.

---

### 2.3 `src/components/shared/ClassifyToolbar.tsx`

**VORHER (BUTTONS Array, Zeilen 19-59):**
```typescript
const BUTTONS: {
  type: ClassificationType;
  label: string;
  bgColor: string;
  activeColor: string;
  textColor: string;
  borderColor: string;
}[] = [
  {
    type: "CUT_OUTER",
    label: "Aussenkontur",
    bgColor: "bg-red-50",
    activeColor: "bg-red-600",
    textColor: "text-red-700",
    borderColor: "border-red-300",
  },
  {
    type: "CUT_INNER",
    label: "Innenkontur",
    bgColor: "bg-blue-50",
    activeColor: "bg-blue-600",
    textColor: "text-blue-700",
    borderColor: "border-blue-300",
  },
  {
    type: "BEND",
    label: "Biegung",
    bgColor: "bg-yellow-50",
    activeColor: "bg-yellow-500",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-300",
  },
  {
    type: "ENGRAVE",
    label: "Gravur",
    bgColor: "bg-green-50",
    activeColor: "bg-green-600",
    textColor: "text-green-700",
    borderColor: "border-green-300",
  },
];
```

**NACHHER:**
```typescript
const BUTTONS: {
  type: ClassificationType;
  label: string;
  bgColor: string;
  activeColor: string;
  textColor: string;
  borderColor: string;
}[] = [
  {
    type: "CUT",
    label: "Schneidkontur",
    bgColor: "bg-gray-50",
    activeColor: "bg-gray-700",
    textColor: "text-gray-700",
    borderColor: "border-gray-300",
  },
  {
    type: "BEND",
    label: "Biegung",
    bgColor: "bg-green-50",
    activeColor: "bg-green-600",
    textColor: "text-green-700",
    borderColor: "border-green-300",
  },
  {
    type: "ENGRAVE",
    label: "Gravur",
    bgColor: "bg-red-50",
    activeColor: "bg-red-600",
    textColor: "text-red-700",
    borderColor: "border-red-300",
  },
];
```

**Warum:** 4 Buttons -> 3 Buttons. Farben folgen dem neuen Schema: CUT = Grau (ACI 7 Weiss -> Dunkelgrau auf hellem Hintergrund), BEND = Gruen (ACI 3), ENGRAVE = Rot (ACI 1). Labels angepasst: "Schneidkontur" statt "Aussenkontur"/"Innenkontur".

---

**VORHER (Module-Kommentar, Zeilen 1-6):**
```typescript
/**
 * ClassifyToolbar -- F5: 4 Kategorie-Buttons fuer die Klassifizierung.
 *
 * Aussenkontur (Rot), Innenkontur (Blau), Biegung (Gelb), Gravur (Gruen).
 * Der aktive Button ist hervorgehoben. Statistik unter jedem Button.
 */
```

**NACHHER:**
```typescript
/**
 * ClassifyToolbar -- F5: 3 Kategorie-Buttons fuer die Klassifizierung.
 *
 * Schneidkontur (Grau), Biegung (Gruen), Gravur (Rot).
 * Farben folgen dem Trumpf/Bystronic ACI-Standard.
 * Der aktive Button ist hervorgehoben. Statistik unter jedem Button.
 */
```

---

### 2.4 `src/components/shared/AppShell.tsx`

**VORHER (Zeile 74-75):**
```typescript
  const [activeClassification, setActiveClassification] =
    useState<ClassificationType>("CUT_OUTER");
```

**NACHHER:**
```typescript
  const [activeClassification, setActiveClassification] =
    useState<ClassificationType>("CUT");
```

---

**VORHER (classificationStats, Zeilen 314-327):**
```typescript
  const classificationStats = useMemo(() => {
    const stats: Record<ClassificationType, number> = {
      CUT_OUTER: 0,
      CUT_INNER: 0,
      BEND: 0,
      ENGRAVE: 0,
    };
    for (const entity of displayedPartEntities) {
      if (entity.classification) {
        stats[entity.classification]++;
      }
    }
    return stats;
  }, [displayedPartEntities]);
```

**NACHHER:**
```typescript
  const classificationStats = useMemo(() => {
    const stats: Record<ClassificationType, number> = {
      CUT: 0,
      BEND: 0,
      ENGRAVE: 0,
    };
    for (const entity of displayedPartEntities) {
      if (entity.classification) {
        stats[entity.classification]++;
      }
    }
    return stats;
  }, [displayedPartEntities]);
```

**Warum:** Default-Wert und Stats-Objekt muessen die neuen 3 Keys verwenden.

---

### 2.5 `src/components/editor/EntityPath.tsx`

**VORHER (CLASSIFICATION_COLORS, Zeilen 41-46):**
```typescript
/** Classification to hex color mapping */
const CLASSIFICATION_COLORS: Record<ClassificationType, string> = {
  CUT_OUTER: LAYER_CONFIGS[0].hexColor,
  CUT_INNER: LAYER_CONFIGS[1].hexColor,
  BEND: LAYER_CONFIGS[2].hexColor,
  ENGRAVE: LAYER_CONFIGS[3].hexColor,
};
```

**NACHHER:**
```typescript
/** Classification to hex color mapping */
const CLASSIFICATION_COLORS: Record<ClassificationType, string> = {
  CUT: LAYER_CONFIGS[0].hexColor,
  BEND: LAYER_CONFIGS[1].hexColor,
  ENGRAVE: LAYER_CONFIGS[2].hexColor,
};
```

**Warum:** Indizes passen sich automatisch an, da LAYER_CONFIGS nur noch 3 Eintraege hat. Die Farben kommen aus den aktualisierten LAYER_CONFIGS.

---

**VORHER (Kommentar Zeile 10-14):**
```typescript
 * Visuelles Feedback basiert auf:
 * - classification (CUT_OUTER, CUT_INNER, BEND, ENGRAVE)
```

**NACHHER:**
```typescript
 * Visuelles Feedback basiert auf:
 * - classification (CUT, BEND, ENGRAVE)
```

---

### 2.6 `src/components/editor/DxfEditor.tsx`

**VORHER (CLASSIFICATION_RECT_COLORS, Zeilen 121-126):**
```typescript
/** Classification color for selection rectangle */
const CLASSIFICATION_RECT_COLORS: Record<ClassificationType, string> = {
  CUT_OUTER: "rgba(255, 0, 0, 0.15)",
  CUT_INNER: "rgba(0, 0, 255, 0.15)",
  BEND: "rgba(255, 255, 0, 0.15)",
  ENGRAVE: "rgba(0, 204, 0, 0.15)",
};
```

**NACHHER:**
```typescript
/** Classification color for selection rectangle */
const CLASSIFICATION_RECT_COLORS: Record<ClassificationType, string> = {
  CUT: "rgba(26, 26, 26, 0.15)",
  BEND: "rgba(0, 204, 0, 0.15)",
  ENGRAVE: "rgba(255, 0, 0, 0.15)",
};
```

---

**VORHER (CLASSIFICATION_STROKE_COLORS, Zeilen 128-133):**
```typescript
const CLASSIFICATION_STROKE_COLORS: Record<ClassificationType, string> = {
  CUT_OUTER: "rgba(255, 0, 0, 0.6)",
  CUT_INNER: "rgba(0, 0, 255, 0.6)",
  BEND: "rgba(255, 255, 0, 0.6)",
  ENGRAVE: "rgba(0, 204, 0, 0.6)",
};
```

**NACHHER:**
```typescript
const CLASSIFICATION_STROKE_COLORS: Record<ClassificationType, string> = {
  CUT: "rgba(26, 26, 26, 0.6)",
  BEND: "rgba(0, 204, 0, 0.6)",
  ENGRAVE: "rgba(255, 0, 0, 0.6)",
};
```

**Warum:** CUT-Selektionsrechteck in Dunkelgrau (passend zu ACI 7 -> #1a1a1a). BEND und ENGRAVE Farben an neue ACI-Codes angepasst.

---

### 2.7 `src/lib/dxf/exporter.ts`

**Keine Code-Aenderung erforderlich.**

Der Exporter verwendet `LAYER_CONFIGS` dynamisch:
- `writeLayerTable()` iteriert ueber `LAYER_CONFIGS` (Zeile 126-128) -- wird automatisch 3 statt 4 Layer schreiben
- `writeCommonProps()` prueft `entity.color !== 7` (Zeile 186) -- CUT-Entities mit ACI 7 werden korrekt als "ByLayer" behandelt (keine Entity-Color geschrieben)

Das ist korrekt: ACI 7 ist der Default-Wert "ByLayer", daher sollte die Entity-Color bei CUT-Entities NICHT explizit geschrieben werden. Die Farbe kommt dann aus der Layer-Definition.

---

### 2.8 `tests/classifier.test.ts`

**VORHER (Test "classifies TEXT entities as ENGRAVE", Zeile 52):**
```typescript
    expect(result[0].color).toBe(3); // ACI 3 = Green
```

**NACHHER:**
```typescript
    expect(result[0].color).toBe(1); // ACI 1 = Red
```

**Warum:** ENGRAVE ist jetzt ACI 1 (Rot) statt ACI 3 (Gruen).

---

**VORHER (Test "classifies the largest closed contour as CUT_OUTER", Zeilen 56-80):**
```typescript
  // F5 AC: Groesste geschlossene Kontur wird CUT_OUTER
  it("classifies the largest closed contour as CUT_OUTER", () => {
    // ...
    expect(result[0].classification).toBe("CUT_OUTER");
    expect(result[1].classification).toBe("CUT_INNER");
  });
```

**NACHHER:**
```typescript
  // F5 AC: Geschlossene Konturen werden CUT
  it("classifies closed contours as CUT", () => {
    // ...
    expect(result[0].classification).toBe("CUT");
    expect(result[1].classification).toBe("CUT");
  });
```

---

**VORHER (Test "classifies smaller closed contours as CUT_INNER", Zeilen 83-120):**
```typescript
  it("classifies smaller closed contours as CUT_INNER", () => {
    // ...
    expect(result[0].classification).toBe("CUT_OUTER");
    expect(result[1].classification).toBe("CUT_INNER");
    expect(result[2].classification).toBe("CUT_INNER");
  });
```

**NACHHER:**
```typescript
  it("classifies all closed contours as CUT", () => {
    // ...
    expect(result[0].classification).toBe("CUT");
    expect(result[1].classification).toBe("CUT");
    expect(result[2].classification).toBe("CUT");
  });
```

---

**VORHER (Test "classifies short straight lines as BEND", Zeile 137):**
```typescript
    expect(result[0].color).toBe(2); // ACI 2 = Yellow
```

**NACHHER:**
```typescript
    expect(result[0].color).toBe(3); // ACI 3 = Green
```

**Warum:** BEND ist jetzt ACI 3 (Gruen) statt ACI 2 (Gelb).

---

**VORHER (Test "classifies long lines as CUT_INNER (default)", Zeilen 141-154):**
```typescript
  it("classifies long lines as CUT_INNER (default)", () => {
    // ...
    expect(result[0].classification).toBe("CUT_INNER");
  });
```

**NACHHER:**
```typescript
  it("classifies long lines as CUT (default)", () => {
    // ...
    expect(result[0].classification).toBe("CUT");
  });
```

---

**VORHER (Test "sets correct layer and ACI color for CUT_OUTER", Zeilen 157-172):**
```typescript
  it("sets correct layer and ACI color for CUT_OUTER", () => {
    // ...
    expect(result[0].layer).toBe("CUT_OUTER");
    expect(result[0].color).toBe(1); // ACI 1 = Red
  });
```

**NACHHER:**
```typescript
  it("sets correct layer and ACI color for CUT", () => {
    // ...
    expect(result[0].layer).toBe("CUT");
    expect(result[0].color).toBe(7); // ACI 7 = White (Trumpf standard)
  });
```

---

**VORHER (Test "sets correct layer and ACI color for CUT_INNER", Zeilen 174-196):**
```typescript
  it("sets correct layer and ACI color for CUT_INNER", () => {
    // ...
    expect(result[1].layer).toBe("CUT_INNER");
    expect(result[1].color).toBe(5); // ACI 5 = Blue
  });
```

**NACHHER:** Dieser Test wird **entfernt** oder zum Duplikat-Check umgebaut, da CUT_INNER nicht mehr existiert. Die Layer/Farbe-Pruefung fuer CUT ist bereits im vorherigen Test abgedeckt.

Alternative: Umbau zu einem Test der prueft, dass auch die zweite geschlossene Kontur CUT bekommt:

```typescript
  it("sets correct layer and ACI color for second closed contour (also CUT)", () => {
    // ...
    expect(result[1].layer).toBe("CUT");
    expect(result[1].color).toBe(7); // ACI 7 = White (same as first)
  });
```

---

**VORHER (Test "correctly classifies a mixed set of entities", Zeilen 254-259):**
```typescript
    expect(result[0].classification).toBe("CUT_OUTER");
    expect(result[1].classification).toBe("CUT_INNER");
    expect(result[2].classification).toBe("BEND");
    expect(result[3].classification).toBe("ENGRAVE");
```

**NACHHER:**
```typescript
    expect(result[0].classification).toBe("CUT");
    expect(result[1].classification).toBe("CUT");
    expect(result[2].classification).toBe("BEND");
    expect(result[3].classification).toBe("ENGRAVE");
```

---

**VORHER (getClassificationStats Tests, Zeilen 263-292):**
```typescript
  it("counts entities per classification type", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE", classification: "CUT_OUTER" }),
      makeEntity({ id: 1, type: "LINE", classification: "CUT_INNER" }),
      makeEntity({ id: 2, type: "LINE", classification: "CUT_INNER" }),
      makeEntity({ id: 3, type: "LINE", classification: "BEND" }),
      makeEntity({ id: 4, type: "TEXT", classification: "ENGRAVE" }),
    ];

    const stats = getClassificationStats(entities);

    expect(stats.CUT_OUTER).toBe(1);
    expect(stats.CUT_INNER).toBe(2);
    expect(stats.BEND).toBe(1);
    expect(stats.ENGRAVE).toBe(1);
  });

  it("returns zeros for unclassified entities", () => {
    // ...
    expect(stats.CUT_OUTER).toBe(0);
    expect(stats.CUT_INNER).toBe(0);
    expect(stats.BEND).toBe(0);
    expect(stats.ENGRAVE).toBe(0);
  });
```

**NACHHER:**
```typescript
  it("counts entities per classification type", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE", classification: "CUT" }),
      makeEntity({ id: 1, type: "LINE", classification: "CUT" }),
      makeEntity({ id: 2, type: "LINE", classification: "CUT" }),
      makeEntity({ id: 3, type: "LINE", classification: "BEND" }),
      makeEntity({ id: 4, type: "TEXT", classification: "ENGRAVE" }),
    ];

    const stats = getClassificationStats(entities);

    expect(stats.CUT).toBe(3);
    expect(stats.BEND).toBe(1);
    expect(stats.ENGRAVE).toBe(1);
  });

  it("returns zeros for unclassified entities", () => {
    // ...
    expect(stats.CUT).toBe(0);
    expect(stats.BEND).toBe(0);
    expect(stats.ENGRAVE).toBe(0);
  });
```

---

**VORHER (applyClassification Test, Zeilen 296-310):**
```typescript
    const result = applyClassification(entities, new Set([0, 2]), "CUT_OUTER");

    expect(result[0].classification).toBe("CUT_OUTER");
    expect(result[0].layer).toBe("CUT_OUTER");
    expect(result[0].color).toBe(1);
    // ...
    expect(result[2].classification).toBe("CUT_OUTER");
```

**NACHHER:**
```typescript
    const result = applyClassification(entities, new Set([0, 2]), "CUT");

    expect(result[0].classification).toBe("CUT");
    expect(result[0].layer).toBe("CUT");
    expect(result[0].color).toBe(7);
    // ...
    expect(result[2].classification).toBe("CUT");
```

---

## 3. TypeScript Type-Aenderung (Kernstueck)

### Neue Type-Definition

```typescript
export type ClassificationType = "CUT" | "BEND" | "ENGRAVE";
```

### Neue LAYER_CONFIGS

| Index | classification | layerName | hexColor | aciNumber |
|---|---|---|---|---|
| 0 | `"CUT"` | `"CUT"` | `"#1a1a1a"` | `7` |
| 1 | `"BEND"` | `"BEND"` | `"#00cc00"` | `3` |
| 2 | `"ENGRAVE"` | `"ENGRAVE"` | `"#ff0000"` | `1` |

### Compiler-Sicherheit

Nach Aenderung von `ClassificationType` erzeugt `tsc --noEmit` Fehler an jeder Stelle, die `"CUT_OUTER"` oder `"CUT_INNER"` referenziert. Das betrifft:
- `classifier.ts`: String-Literale in der Heuristik
- `ClassifyToolbar.tsx`: BUTTONS-Array `type`-Felder
- `AppShell.tsx`: useState Default-Wert
- `EntityPath.tsx`: CLASSIFICATION_COLORS Keys
- `DxfEditor.tsx`: RECT/STROKE_COLORS Keys
- `classifier.test.ts`: Erwartungswerte und makeEntity-Aufrufe

Alle diese Stellen werden durch die Aenderungen in Abschnitt 2 behoben.

---

## 4. Classifier-Logik

### Vereinfachung der Heuristik

**Alt (6 Regeln):**
1. TEXT -> ENGRAVE
2. Detect closed contours
3. Groesste geschlossene Kontur -> CUT_OUTER
4. Kleinere geschlossene Konturen -> CUT_INNER
5. Kurze Linien -> BEND
6. Alles andere -> CUT_INNER

**Neu (3 Regeln):**
1. TEXT -> ENGRAVE
2. Kurze Linien (LINE mit length <= 50) -> BEND
3. Alles andere -> CUT

### Entfernter Code

- `isClosedContour()` Hilfsfunktion: wird nicht mehr benoetigt
- Closed-Contour-Detection (closedContourIds Set, closedContours Array, Sortierung): wird nicht mehr benoetigt
- `largestContourId` Variable: wird nicht mehr benoetigt

### Unveraenderter Code

- `isShortLine()` Hilfsfunktion: bleibt identisch
- `BEND_MAX_LENGTH` Konstante (50): bleibt identisch
- `applyClassification()`: keine Logik-Aenderung (nutzt `getLayerConfig()` dynamisch)
- `getLayerConfig()`: keine Aenderung (generischer Lookup)

---

## 5. UI-Komponenten

### ClassifyToolbar: 4 -> 3 Buttons

| Position | Alt | Neu |
|---|---|---|
| 1 | "Aussenkontur" (Rot) | "Schneidkontur" (Grau) |
| 2 | "Innenkontur" (Blau) | "Biegung" (Gruen) |
| 3 | "Biegung" (Gelb) | "Gravur" (Rot) |
| 4 | "Gravur" (Gruen) | -- entfaellt -- |

### DxfEditor: Selektions-Rechteck-Farben

| Klassifizierung | Rechteck-Fill | Rechteck-Stroke |
|---|---|---|
| CUT | `rgba(26, 26, 26, 0.15)` | `rgba(26, 26, 26, 0.6)` |
| BEND | `rgba(0, 204, 0, 0.15)` | `rgba(0, 204, 0, 0.6)` |
| ENGRAVE | `rgba(255, 0, 0, 0.15)` | `rgba(255, 0, 0, 0.6)` |

### EntityPath: Rendering-Farben

Die Farben kommen aus `LAYER_CONFIGS[].hexColor`:

| Klassifizierung | Stroke-Farbe |
|---|---|
| CUT | `#1a1a1a` (Dunkelgrau) |
| BEND | `#00cc00` (Gruen) |
| ENGRAVE | `#ff0000` (Rot) |

---

## 6. Exporter

### Keine Code-Aenderung

Der Exporter nutzt `LAYER_CONFIGS` dynamisch. Durch die Aenderung in `classification.ts` aendert sich das Export-Verhalten automatisch:

### Layer-Tabelle im exportierten DXF (NACHHER)

```
0 TABLE
2 LAYER
70 3
0 LAYER
2 CUT
70 0
62 7
6 CONTINUOUS
0 LAYER
2 BEND
70 0
62 3
6 CONTINUOUS
0 LAYER
2 ENGRAVE
70 0
62 1
6 CONTINUOUS
0 ENDTAB
```

### Entity-Properties im exportierten DXF

CUT-Entities: Group Code 8 = "CUT", **keine** Group Code 62 (da ACI 7 = ByLayer Default, gefiltert in `writeCommonProps` Zeile 186: `if (entity.color !== 7 && entity.color !== 256)`)

BEND-Entities: Group Code 8 = "BEND", Group Code 62 = "3"

ENGRAVE-Entities: Group Code 8 = "ENGRAVE", Group Code 62 = "1"

---

## 7. Implementierungsreihenfolge

Strategie: **"Typ aendern, Compiler folgen."**

| Schritt | Datei | Aktion | Compiler-Status |
|---|---|---|---|
| 1 | `src/types/classification.ts` | Union + LAYER_CONFIGS aendern | FEHLER (ca. 6 Dateien) |
| 2 | `src/lib/dxf/classifier.ts` | Logik vereinfachen, isClosedContour entfernen | Weniger Fehler |
| 3 | `src/components/shared/AppShell.tsx` | Default + Stats anpassen | Weniger Fehler |
| 4 | `src/components/shared/ClassifyToolbar.tsx` | BUTTONS reduzieren | Weniger Fehler |
| 5 | `src/components/editor/EntityPath.tsx` | CLASSIFICATION_COLORS anpassen | Weniger Fehler |
| 6 | `src/components/editor/DxfEditor.tsx` | RECT/STROKE_COLORS anpassen | CLEAN |
| 7 | `tests/classifier.test.ts` | Erwartungswerte anpassen | Tests gruenn |
| 8 | Kommentare | Doc-Kommentare in allen Dateien aktualisieren | -- |

Nach jedem Schritt: `npx tsc --noEmit` ausfuehren um den Fortschritt zu pruefen.

### Validierung nach Abschluss

```bash
npx tsc --noEmit          # Keine Compiler-Fehler
npx vitest run            # Alle Tests bestehen
npm run lint              # Keine Lint-Fehler
npm run build             # Build erfolgreich
```

---

## 8. Test-Strategie

### Aenderungen an bestehenden Tests

| Test-Name (alt) | Aenderung |
|---|---|
| "classifies TEXT entities as ENGRAVE" | ACI-Erwartung: 3 -> 1 |
| "classifies the largest closed contour as CUT_OUTER" | Umbenennen, CUT_OUTER -> CUT, CUT_INNER -> CUT |
| "classifies smaller closed contours as CUT_INNER" | Umbenennen, alle -> CUT |
| "classifies short straight lines as BEND" | ACI-Erwartung: 2 -> 3 |
| "classifies long lines as CUT_INNER (default)" | Umbenennen, CUT_INNER -> CUT |
| "sets correct layer and ACI color for CUT_OUTER" | Umbenennen, CUT_OUTER -> CUT, ACI 1 -> 7 |
| "sets correct layer and ACI color for CUT_INNER" | Entfernen oder zu CUT-Duplikat umbauen |
| "correctly classifies a mixed set of entities" | CUT_OUTER/CUT_INNER -> CUT |
| "counts entities per classification type" | 3 Keys statt 4, CUT_OUTER/CUT_INNER -> CUT |
| "returns zeros for unclassified entities" | 3 Keys statt 4 |
| "applies classification to specified entity IDs" | CUT_OUTER -> CUT, ACI 1 -> 7 |

### Keine neuen Tests noetig

Das Refactoring reduziert Komplexitaet. Die bestehende Test-Suite deckt alle Pfade ab, wenn die Erwartungswerte angepasst werden. Neue Tests waeren nur noetig, wenn neue Logik hinzukaeme (Requirements: "Keine neue Klassifizierungslogik").

---

## 9. Risiken und Mitigierung

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigierung |
|---|---|---|---|
| ACI 7 wird von Maschine nicht als CUT erkannt | Niedrig | Hoch | ACI 7 ist der Trumpf/Bystronic Standard. Validierung mit Kunden-DXF vor Auslieferung |
| Stellen mit String-Literal "CUT_OUTER" ausserhalb von TypeScript-Pruefung | Niedrig | Mittel | grep im gesamten Projekt nach "CUT_OUTER" und "CUT_INNER" nach dem Refactoring |
| LAYER_CONFIGS Index-Zugriff an anderen Stellen | Niedrig | Mittel | EntityPath.tsx nutzt Index-Zugriff -- wird in Schritt 5 korrigiert. Compiler findet restliche Stellen |
| DxfEntityV2.classification in Types erlaubt noch alte Werte | Niedrig | Niedrig | `classification` ist als `ClassificationType` typisiert -- aendert sich automatisch mit dem Union-Typ |

### Grep-Check nach Abschluss

```bash
grep -r "CUT_OUTER\|CUT_INNER" src/ tests/ --include="*.ts" --include="*.tsx"
```

Erwartetes Ergebnis: 0 Treffer.
