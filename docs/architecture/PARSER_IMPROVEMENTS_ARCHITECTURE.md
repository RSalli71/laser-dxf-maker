# Parser-Verbesserungen: Technische Architektur

> Erstellt am 2026-03-10 aus `docs/requirements/PARSER_IMPROVEMENTS_REQUIREMENTS.md`.
> Bezieht sich auf `src/lib/dxf/parser.ts` (1477 Zeilen), `src/components/editor/EntityPath.tsx` (236 Zeilen), `src/types/dxf-v2.ts` (194 Zeilen).

---

## 1. Aenderungsuebersicht

| Datei | F1 Bulge | F2 MTEXT | F3 WarningCollector | Art der Aenderung |
|-------|----------|----------|---------------------|-------------------|
| `src/types/dxf-v2.ts` | Ja | Nein | Nein | `points` Array-Typ erweitern um `bulge?: number` |
| `src/lib/dxf/parser.ts` | Ja | Ja | Ja | 5 Stellen aendern, 4 neue Funktionen, 1 neue Klasse |
| `src/components/editor/EntityPath.tsx` | Ja | Nein | Nein | `polylineToPath()` erweitern, 1 neue Hilfsfunktion |
| `tests/parser.test.ts` | Ja | Ja | Ja | Mindestens 12 neue Tests |

---

## 2. F1: Bulge-Support LWPOLYLINE

### 2.1 Type-Aenderung in `dxf-v2.ts`

**VORHER** (Zeile 97-98):

```typescript
  /** LWPOLYLINE: Point list */
  points?: Array<{ x: number; y: number }>;
```

**NACHHER:**

```typescript
  /** LWPOLYLINE/SPLINE: Point list. Bulge definiert Bogen zum naechsten Punkt. */
  points?: Array<{ x: number; y: number; bulge?: number }>;
```

Dieses optionale Feld ist rueckwaertskompatibel. Bestehender Code, der `points[i].x` und `points[i].y` liest, funktioniert weiterhin. SPLINE-Punkte haben niemals `bulge` gesetzt.

---

### 2.2 Parser: `extractPolylinePoints()` erweitern

**VORHER** (Zeile 1403-1424):

```typescript
function extractPolylinePoints(
  pairs: GroupPair[],
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const xValues: number[] = [];
  const yValues: number[] = [];

  for (const pair of pairs) {
    if (pair.code === 10) {
      xValues.push(parseFloat(pair.value) || 0);
    } else if (pair.code === 20) {
      yValues.push(parseFloat(pair.value) || 0);
    }
  }

  const count = Math.min(xValues.length, yValues.length);
  for (let i = 0; i < count; i++) {
    points.push({ x: xValues[i], y: yValues[i] });
  }

  return points;
}
```

**NACHHER:**

```typescript
/** Schwellwert: Bulge-Werte mit |bulge| < BULGE_THRESHOLD werden als gerade Linie behandelt. */
const BULGE_THRESHOLD = 0.0001;

function extractPolylinePoints(
  pairs: GroupPair[],
): Array<{ x: number; y: number; bulge?: number }> {
  const xValues: number[] = [];
  const yValues: number[] = [];
  const bulgeValues = new Map<number, number>();

  let currentPointIndex = -1;

  for (const pair of pairs) {
    if (pair.code === 10) {
      xValues.push(parseFloat(pair.value) || 0);
      currentPointIndex = xValues.length - 1;
    } else if (pair.code === 20) {
      yValues.push(parseFloat(pair.value) || 0);
    } else if (pair.code === 42) {
      // Group Code 42 = Bulge, gehoert zum zuletzt gelesenen Punkt (nach Code 10)
      const b = parseFloat(pair.value);
      if (!isNaN(b) && Math.abs(b) >= BULGE_THRESHOLD && currentPointIndex >= 0) {
        bulgeValues.set(currentPointIndex, b);
      }
    }
  }

  const count = Math.min(xValues.length, yValues.length);
  const points: Array<{ x: number; y: number; bulge?: number }> = [];
  for (let i = 0; i < count; i++) {
    const point: { x: number; y: number; bulge?: number } = {
      x: xValues[i],
      y: yValues[i],
    };
    if (bulgeValues.has(i)) {
      point.bulge = bulgeValues.get(i);
    }
    points.push(point);
  }

  return points;
}
```

**Erklaerung:**
- Group Code 42 erscheint in DXF **nach** Code 10/20 eines Punktes. `currentPointIndex` trackt, zu welchem Punkt der Bulge gehoert.
- Bulge-Werte mit `|bulge| < 0.0001` werden verworfen (gerade Linie).
- `bulge = 0` und nicht-numerische Werte werden ignoriert.
- Rueckgabetyp aendert sich von `Array<{ x: number; y: number }>` zu `Array<{ x: number; y: number; bulge?: number }>`.

---

### 2.3 Parser: Neue Hilfsfunktionen fuer Bogenberechnung

Diese Funktionen werden in `parser.ts` im Abschnitt "Geometry calculations" (nach Zeile 1426) eingefuegt.

```typescript
/**
 * Berechnet die Bogenlaenge eines Bulge-Segments.
 *
 * Mathematik:
 *   theta = 4 * atan(|bulge|)       -- Bogenwinkel
 *   r = chord / (2 * sin(theta/2))  -- Radius
 *   Bogenlaenge = r * theta
 *
 * Numerische Stabilitaet:
 *   - chord = 0: identische Punkte, Laenge = 0
 *   - |bulge| < BULGE_THRESHOLD: sollte nie aufgerufen werden (Caller filtert),
 *     aber als Sicherheit: Sehnenlaenge zurueckgeben
 *   - Sehr grosser bulge (z.B. 100): theta naehert sich 2*PI,
 *     sin(theta/2) naehert sich 0, aber r*theta konvergiert korrekt.
 *     Fuer den Extremfall theta >= PI*2 - epsilon: Vollkreis-Naeherung.
 */
function bulgeToArcLength(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  bulge: number,
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chord = Math.sqrt(dx * dx + dy * dy);

  // Identische Punkte: keine Laenge
  if (chord < 1e-10) return 0;

  // Sicherheits-Check (sollte vom Caller bereits gefiltert sein)
  if (Math.abs(bulge) < BULGE_THRESHOLD) return chord;

  const theta = 4 * Math.atan(Math.abs(bulge));

  // Schutz vor Division durch Null bei theta nahe 2*PI
  const sinHalfTheta = Math.sin(theta / 2);
  if (Math.abs(sinHalfTheta) < 1e-10) {
    // Nahezu Vollkreis: Umfang = chord * PI (Durchmesser = chord)
    return chord * Math.PI;
  }

  const r = chord / (2 * sinHalfTheta);
  return Math.abs(r * theta);
}

/**
 * Berechnet die Gesamtlaenge einer Polylinie mit Bulge-Unterstuetzung.
 *
 * Fuer jedes Segment (i -> i+1):
 *   - Wenn points[i].bulge vorhanden und |bulge| >= BULGE_THRESHOLD: Bogenlaenge
 *   - Sonst: Sehnenlaenge (gerade Linie)
 *
 * Bei geschlossener Polylinie: letztes Segment = letzter Punkt -> erster Punkt,
 * mit dem Bulge des letzten Punktes.
 */
function calculatePolylineLengthWithBulge(
  points: Array<{ x: number; y: number; bulge?: number }>,
  closed?: boolean,
): number {
  if (points.length < 2) return 0;

  let length = 0;
  const segmentCount = closed ? points.length : points.length - 1;

  for (let i = 0; i < segmentCount; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    if (p1.bulge !== undefined && Math.abs(p1.bulge) >= BULGE_THRESHOLD) {
      length += bulgeToArcLength(p1, p2, p1.bulge);
    } else {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
  }

  return length;
}
```

---

### 2.4 Parser: Laengenberechnung in `parseEntity()` umstellen

**VORHER** (Zeile 1198-1206, innerhalb `parseEntity()` case LWPOLYLINE):

```typescript
    case "LWPOLYLINE": {
      type = "LWPOLYLINE";
      const points = extractPolylinePoints(pairs);
      const closedFlag = getIntValue(pairs, 70) ?? 0;
      closed = (closedFlag & 1) === 1;
      coordinates = { points };
      length = calculatePolylineLength(points, closed);
      break;
    }
```

**NACHHER:**

```typescript
    case "LWPOLYLINE": {
      type = "LWPOLYLINE";
      const points = extractPolylinePoints(pairs);
      const closedFlag = getIntValue(pairs, 70) ?? 0;
      closed = (closedFlag & 1) === 1;
      coordinates = { points };
      length = calculatePolylineLengthWithBulge(points, closed);
      break;
    }
```

Einzige Aenderung: `calculatePolylineLength` wird durch `calculatePolylineLengthWithBulge` ersetzt. Die alte Funktion `calculatePolylineLength` bleibt bestehen und wird weiterhin fuer SPLINE und INSERT-aufgeloeste Polylinien verwendet (dort gibt es keine Bulge-Werte).

---

### 2.5 Parser: Laengenberechnung in `resolveBlockEntity()` umstellen

**VORHER** (Zeile 879-909, innerhalb `resolveBlockEntity()` case LWPOLYLINE):

```typescript
    case "LWPOLYLINE": {
      const points = extractPolylinePoints(pairs);
      const closedFlag = getIntValue(pairs, 70) ?? 0;
      const closed = (closedFlag & 1) === 1;
      const transformedPoints = points.map((p) =>
        transformPoint(
          p.x,
          p.y,
          insertX,
          insertY,
          scaleX,
          scaleY,
          rotationRad,
          baseX,
          baseY,
        ),
      );
      if (transformedPoints.length < 2) return [];
      return [
        {
          id,
          type: "LWPOLYLINE",
          layer,
          color,
          linetype,
          coordinates: { points: transformedPoints },
          length: calculatePolylineLength(transformedPoints, closed),
          closed,
        },
      ];
    }
```

**NACHHER:**

```typescript
    case "LWPOLYLINE": {
      const points = extractPolylinePoints(pairs);
      const closedFlag = getIntValue(pairs, 70) ?? 0;
      const closed = (closedFlag & 1) === 1;
      const transformedPoints = points.map((p) => {
        const tp = transformPoint(
          p.x,
          p.y,
          insertX,
          insertY,
          scaleX,
          scaleY,
          rotationRad,
          baseX,
          baseY,
        );
        // Bulge-Wert uebernehmen (Bulge ist skalierungsinvariant)
        const result: { x: number; y: number; bulge?: number } = {
          x: tp.x,
          y: tp.y,
        };
        if (p.bulge !== undefined) {
          // Bei Achsenspiegelung (genau eine Achse negativ) kehrt sich die Bogenrichtung um
          const mirrored = (scaleX < 0) !== (scaleY < 0);
          result.bulge = mirrored ? -p.bulge : p.bulge;
        }
        return result;
      });
      if (transformedPoints.length < 2) return [];
      return [
        {
          id,
          type: "LWPOLYLINE",
          layer,
          color,
          linetype,
          coordinates: { points: transformedPoints },
          length: calculatePolylineLengthWithBulge(transformedPoints, closed),
          closed,
        },
      ];
    }
```

**Wichtiger Hinweis zu Bulge und Transformation:**
- Der Bulge-Wert ist **skalierungsinvariant** (er definiert ein Winkelverhaeltnis, keinen absoluten Radius). Daher aendert sich der Bulge-Betrag bei uniformer oder nicht-uniformer Skalierung NICHT.
- Bei **Achsenspiegelung** (genau eine Achse negativ skaliert) kehrt sich die Bogenrichtung um: `bulge` wird negiert.
- Rotation aendert den Bulge-Wert nicht.

---

### 2.6 Parser: `transformResolvedEntity()` Bulge-Propagation

**VORHER** (Zeile 521-541, case LWPOLYLINE in `transformResolvedEntity()`):

```typescript
    case "LWPOLYLINE":
    case "SPLINE": {
      const points = entity.coordinates.points ?? [];
      const transformedPoints = points.map((p) =>
        transformPoint(
          p.x,
          p.y,
          insertX,
          insertY,
          scaleX,
          scaleY,
          rotationRad,
          baseX,
          baseY,
        ),
      );
      return {
        ...entity,
        coordinates: { points: transformedPoints },
        length: calculatePolylineLength(transformedPoints, entity.closed),
      };
    }
```

**NACHHER:**

```typescript
    case "LWPOLYLINE":
    case "SPLINE": {
      const points = entity.coordinates.points ?? [];
      const mirrored = (scaleX < 0) !== (scaleY < 0);
      const transformedPoints = points.map((p) => {
        const tp = transformPoint(
          p.x,
          p.y,
          insertX,
          insertY,
          scaleX,
          scaleY,
          rotationRad,
          baseX,
          baseY,
        );
        const result: { x: number; y: number; bulge?: number } = {
          x: tp.x,
          y: tp.y,
        };
        if (p.bulge !== undefined) {
          result.bulge = mirrored ? -p.bulge : p.bulge;
        }
        return result;
      });

      // LWPOLYLINE: Bulge-aware Laenge. SPLINE: weiterhin Sehnenlaenge.
      const len =
        entity.type === "LWPOLYLINE"
          ? calculatePolylineLengthWithBulge(transformedPoints, entity.closed)
          : calculatePolylineLength(transformedPoints, entity.closed);

      return {
        ...entity,
        coordinates: { points: transformedPoints },
        length: len,
      };
    }
```

---

### 2.7 EntityPath.tsx: `polylineToPath()` mit Bulge-Rendering

**Neue Hilfsfunktion** (vor `polylineToPath()`):

```typescript
/**
 * Konvertiert ein Bulge-Segment in einen SVG-Arc-String.
 *
 * SVG-Arc: A rx,ry x-axis-rotation large-arc-flag,sweep-flag x2,y2
 *
 * Sweep-Richtung:
 *   sweep = bulge > 0 ? 1 : 0
 *   Dies ist KORREKT weil DxfEditor.tsx <g transform="scale(1,-1)"> verwendet.
 *   Ohne diese Y-Spiegelung waeren alle Boegen spiegelverkehrt!
 *
 * Numerische Stabilitaet:
 *   - chord = 0: leerer String (identische Punkte)
 *   - sin(theta/2) nahe 0: Fallback auf grossen Radius
 */
function bulgeToSvgArc(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  bulge: number,
): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chord = Math.sqrt(dx * dx + dy * dy);

  if (chord < 1e-10) return "";

  const theta = 4 * Math.atan(Math.abs(bulge));

  const sinHalfTheta = Math.sin(theta / 2);
  // Schutz vor Division durch Null
  const r =
    Math.abs(sinHalfTheta) < 1e-10
      ? chord * 1000 // Sehr grosser Radius = fast gerade Linie
      : chord / (2 * sinHalfTheta);

  const largeArc = theta > Math.PI ? 1 : 0;
  // Korrekt NUR mit scale(1,-1) im SVG-Container!
  const sweep = bulge > 0 ? 1 : 0;

  return `A${r},${r} 0 ${largeArc},${sweep} ${p2.x},${p2.y}`;
}
```

**VORHER** `polylineToPath()` (Zeile 220-233):

```typescript
function polylineToPath(
  c: DxfEntityV2["coordinates"],
  closed?: boolean,
): string | null {
  if (!c.points || c.points.length < 2) return null;

  const parts: string[] = [`M${c.points[0].x},${c.points[0].y}`];
  for (let i = 1; i < c.points.length; i++) {
    parts.push(`L${c.points[i].x},${c.points[i].y}`);
  }
  if (closed) parts.push("Z");

  return parts.join(" ");
}
```

**NACHHER:**

```typescript
function polylineToPath(
  c: DxfEntityV2["coordinates"],
  closed?: boolean,
): string | null {
  if (!c.points || c.points.length < 2) return null;

  const points = c.points;
  const parts: string[] = [`M${points[0].x},${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (p1.bulge !== undefined && Math.abs(p1.bulge) >= 0.0001) {
      parts.push(bulgeToSvgArc(p1, p2, p1.bulge));
    } else {
      parts.push(`L${p2.x},${p2.y}`);
    }
  }

  // Geschlossene Polylinie: letztes Segment (letzter Punkt -> erster Punkt)
  if (closed && points.length > 1) {
    const lastPt = points[points.length - 1];
    const firstPt = points[0];
    if (lastPt.bulge !== undefined && Math.abs(lastPt.bulge) >= 0.0001) {
      parts.push(bulgeToSvgArc(lastPt, firstPt, lastPt.bulge));
    } else {
      parts.push("Z");
    }
  }

  return parts.join(" ");
}
```

**Aenderungen gegenueber Vorher:**
1. Die Schleife iteriert jetzt von `i = 0` bis `points.length - 1` (statt `i = 1` bis `points.length`), damit jeweils `p1 = points[i]` und `p2 = points[i+1]` genutzt werden und der Bulge von `p1` geprueft werden kann.
2. Fuer Segmente mit Bulge wird `bulgeToSvgArc()` statt `L` verwendet.
3. Geschlossene Polylinien: Das Schlusssegment prueft den Bulge des letzten Punktes. Nur wenn kein Bulge vorhanden ist, wird `Z` verwendet (Gerade zum Startpunkt). Mit Bulge wird ein expliziter Arc zum Startpunkt gerendert.

---

## 3. F2: MTEXT als TEXT behandeln

### 3.1 Parser: `SUPPORTED_TYPES` erweitern

**VORHER** (Zeile 1034-1043):

```typescript
const SUPPORTED_TYPES = new Set<string>([
  "LINE",
  "CIRCLE",
  "ARC",
  "LWPOLYLINE",
  "SPLINE",
  "TEXT",
  "DIMENSION",
  "POLYLINE", // Treated as LWPOLYLINE
]);
```

**NACHHER:**

```typescript
const SUPPORTED_TYPES = new Set<string>([
  "LINE",
  "CIRCLE",
  "ARC",
  "LWPOLYLINE",
  "SPLINE",
  "TEXT",
  "DIMENSION",
  "POLYLINE", // Treated as LWPOLYLINE
  "MTEXT",    // Treated as TEXT
]);
```

---

### 3.2 Neue Hilfsfunktion: `normalizeMText()`

Diese Funktion wird in `parser.ts` eingefuegt (z.B. vor `parseEntity()`).

```typescript
/**
 * Bereinigt DXF-MTEXT-Formatierungssequenzen aus dem Rohtext.
 *
 * Behandelte Sequenzen:
 *   \P         -> Leerzeichen (Absatzumbruch)
 *   \~~        -> Leerzeichen (geschuetztes Leerzeichen, selten)
 *   {\H2.5;..} -> Formatblock entfernen (Inhalt beibehalten)
 *   \A1;       -> Steuersequenz entfernen
 *   \H2.5;     -> Steuersequenz entfernen
 *   { }        -> Verbleibende Klammern entfernen
 *
 * Reihenfolge der Regex-Anwendung ist wichtig:
 *   1. Formatbloecke aufloesen (Klammern + Steuersequenz entfernen, Inhalt behalten)
 *   2. Freisteehende Steuersequenzen entfernen
 *   3. Absatzumbrueche ersetzen
 *   4. Restliche Klammern entfernen
 *   5. Trim und Mehrfach-Leerzeichen normalisieren
 *
 * Verschachtelte Formatbloecke (z.B. {\H2.5;{\fArial;Text}}) werden durch
 * wiederholte Anwendung aufgeloest (maximal 10 Iterationen als Sicherheit).
 */
function normalizeMText(raw: string): string {
  let text = raw;

  // 1. Formatbloecke aufloesen: {\\X...;content} -> content
  //    Wiederholte Anwendung fuer verschachtelte Bloecke
  let prev = "";
  let iterations = 0;
  while (text !== prev && iterations < 10) {
    prev = text;
    text = text.replace(/\{\\[^{}]*?;([^{}]*)\}/g, "$1");
    iterations++;
  }

  // 2. Freisteehende Steuersequenzen: \A1; \H2.5; \fArial; etc.
  text = text.replace(/\\[A-Za-z][^;]*;/g, "");

  // 3. Absatzumbrueche und geschuetzte Leerzeichen
  text = text.replace(/\\P/gi, " ");
  text = text.replace(/\\~~/g, " ");

  // 4. Verbleibende geschweifte Klammern
  text = text.replace(/[{}]/g, "");

  // 5. Trim und Mehrfach-Leerzeichen
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
```

---

### 3.3 Parser: MTEXT-Case in `parseEntity()` hinzufuegen

**VORHER** (Zeile 1229-1238, nach dem TEXT-Case und vor dem default-Case):

```typescript
    case "DIMENSION": {
      type = "DIMENSION";
      coordinates = {};
      length = 0;
      break;
    }

    default:
      warnings.push(`Unbekannter Entity-Typ beim Parsen: ${entityType}`);
      return null;
```

**NACHHER** (neuer Case zwischen DIMENSION und default einfuegen):

```typescript
    case "DIMENSION": {
      type = "DIMENSION";
      coordinates = {};
      length = 0;
      break;
    }

    case "MTEXT": {
      type = "TEXT"; // MTEXT wird als TEXT gespeichert
      const x = getFloatValue(pairs, 10) ?? 0;
      const y = getFloatValue(pairs, 20) ?? 0;
      const height = getFloatValue(pairs, 40) ?? 1;

      // MTEXT-Text: Code 3 (Fragmente, in Reihenfolge) + Code 1 (letztes Fragment)
      // Code-3-Teile kommen zuerst, Code-1-Teil am Ende
      const textParts3 = pairs
        .filter((p) => p.code === 3)
        .map((p) => p.value);
      const textPart1 = getStringValue(pairs, 1) ?? "";
      const rawText = [...textParts3, textPart1].join("");

      const text = normalizeMText(rawText);
      coordinates = { x, y, text, height };
      length = 0;
      break;
    }

    default:
      warnings.push(`Unbekannter Entity-Typ beim Parsen: ${entityType}`);
      return null;
```

---

### 3.4 Parser: MTEXT in `resolveBlockEntity()` behandeln

In `resolveBlockEntity()` wird MTEXT durch den bestehenden `parseEntity()`-Aufruf nicht erreicht, da `resolveBlockEntity()` einen eigenen `switch` hat. MTEXT-Entities in Bloecken muessen behandelt werden.

**Loesung:** Im `switch` von `resolveBlockEntity()` (Zeile 768-989) einen neuen Case hinzufuegen, direkt nach dem TEXT-Case (Zeile 943-971):

```typescript
    case "MTEXT": {
      const x = getFloatValue(pairs, 10) ?? 0;
      const y = getFloatValue(pairs, 20) ?? 0;
      const height = getFloatValue(pairs, 40) ?? 1;

      const textParts3 = pairs
        .filter((p) => p.code === 3)
        .map((p) => p.value);
      const textPart1 = getStringValue(pairs, 1) ?? "";
      const rawText = [...textParts3, textPart1].join("");
      const text = normalizeMText(rawText);

      const pos = transformPoint(
        x,
        y,
        insertX,
        insertY,
        scaleX,
        scaleY,
        rotationRad,
        baseX,
        baseY,
      );
      const scaledHeight = height * Math.abs(scaleY);
      return [
        {
          id,
          type: "TEXT",
          layer,
          color,
          linetype,
          coordinates: { x: pos.x, y: pos.y, text, height: scaledHeight },
          length: 0,
        },
      ];
    }
```

Zusaetzlich muss in `transformResolvedEntity()` (Zeile 421-572) nichts geaendert werden, da MTEXT als `type: "TEXT"` gespeichert wird und der bestehende TEXT-Case die Transformation uebernimmt.

---

## 4. F3: WarningCollector

### 4.1 Neue Klasse: `WarningCollector`

Diese Klasse wird in `parser.ts` eingefuegt (z.B. nach den Konstanten, vor der `parseDxf()`-Funktion).

```typescript
/**
 * Sammelt Warnungen und zaehlt Duplikate.
 *
 * Identische Warnungen werden gruppiert und bei der Ausgabe mit Zaehler versehen:
 *   - 1x: "Warnung" (ohne Zaehler)
 *   - 47x: "Warnung (47x)"
 *
 * Die Reihenfolge entspricht dem ersten Auftreten jeder einzigartigen Warnung.
 */
class WarningCollector {
  private counts = new Map<string, number>();
  private order: string[] = [];

  push(message: string): void {
    const existing = this.counts.get(message);
    if (existing !== undefined) {
      this.counts.set(message, existing + 1);
    } else {
      this.order.push(message);
      this.counts.set(message, 1);
    }
  }

  toArray(): string[] {
    return this.order.map((msg) => {
      const count = this.counts.get(msg)!;
      return count > 1 ? `${msg} (${count}x)` : msg;
    });
  }
}
```

---

### 4.2 Parser: `parseDxf()` auf WarningCollector umstellen

**VORHER** (Zeile 45-107, relevanter Ausschnitt):

```typescript
export function parseDxf(content: string): ParseResult {
  // ... (Validierung) ...

  const skippedTypes = new Map<string, number>();
  const warnings: string[] = [];
  const entities = parseEntitiesSection(
    lines,
    entitiesStart,
    blocks,
    skippedTypes,
    warnings,
  );

  if (entities.length === 0) {
    warnings.push("Keine Entitaeten in der DXF-Datei gefunden.");
  }

  if (entities.length > MAX_ENTITY_COUNT) {
    warnings.push(
      `Sehr viele Entitaeten (${entities.length}). Die Verarbeitung kann langsam sein.`,
    );
  }

  // Deduplicate skipped entity type warnings
  for (const [type, count] of skippedTypes) {
    warnings.push(`Uebersprungener Entity-Typ: ${type} (${count}x)`);
  }

  // Build statistics
  const stats = buildStats(entities, warnings);

  return { entities, stats };
}
```

**NACHHER:**

```typescript
export function parseDxf(content: string): ParseResult {
  // ... (Validierung bleibt identisch) ...

  const warnings = new WarningCollector();
  const entities = parseEntitiesSection(
    lines,
    entitiesStart,
    blocks,
    warnings,
  );

  if (entities.length === 0) {
    warnings.push("Keine Entitaeten in der DXF-Datei gefunden.");
  }

  if (entities.length > MAX_ENTITY_COUNT) {
    warnings.push(
      `Sehr viele Entitaeten (${entities.length}). Die Verarbeitung kann langsam sein.`,
    );
  }

  // Keine manuelle Deduplizierung mehr noetig -- WarningCollector macht das

  // Build statistics
  const stats = buildStats(entities, warnings.toArray());

  return { entities, stats };
}
```

**Konsequenz:** Der `skippedTypes`-Parameter wird entfernt. Die `parseEntitiesSection()`, `resolveInsert()` und `resolveBlockEntity()` Funktionen erhalten stattdessen direkt den `WarningCollector`. Da der WarningCollector automatisch dedupliziert, werden uebersprungene Entity-Typen direkt dort hinzugefuegt:

**VORHER** (Zeile 1100-1103, in `parseEntitiesSection()`):

```typescript
      if (entityType !== "SECTION" && entityType !== "ENDSEC") {
        skippedTypes.set(entityType, (skippedTypes.get(entityType) ?? 0) + 1);
      }
```

**NACHHER:**

```typescript
      if (entityType !== "SECTION" && entityType !== "ENDSEC") {
        warnings.push(`Uebersprungener Entity-Typ: ${entityType}`);
      }
```

Der WarningCollector zaehlt automatisch. Das Ergebnis `"Uebersprungener Entity-Typ: MTEXT (47x)"` ist identisch mit dem bisherigen Format, ausser dass Typen die nur 1x vorkommen keinen Zaehler erhalten. Das aendert den bestehenden Test.

**Signatur-Aenderungen in Funktionskette:**

| Funktion | Alter Parameter | Neuer Parameter |
|----------|----------------|-----------------|
| `parseEntitiesSection()` | `skippedTypes: Map<string, number>, warnings: string[]` | `warnings: WarningCollector` |
| `resolveInsert()` | `skippedTypes: Map<string, number>, warnings: string[]` | `warnings: WarningCollector` |
| `resolveBlockEntity()` | `skippedTypes: Map<string, number>, warnings: string[]` | `warnings: WarningCollector` |
| `parseEntity()` | `warnings: string[]` | `warnings: WarningCollector` |
| `parsePolylineEntity()` | `warnings: string[]` | `warnings: WarningCollector` |

In jeder dieser Funktionen wird `warnings.push(...)` aufgerufen -- die Aufrufsyntax bleibt identisch, da `WarningCollector.push()` dieselbe Signatur wie `Array.push()` fuer einen einzelnen String hat.

---

### 4.3 Auswirkung auf bestehenden Test

Der Test "deduplicates skipped entity type warnings" (Zeile 318-356 in `tests/parser.test.ts`) prueft aktuell:

```typescript
expect(hatchWarnings[0]).toContain("1x");
```

Nach F2 (MTEXT wird geparst statt uebersprungen) und F3 (WarningCollector) muss dieser Test angepasst werden:
- MTEXT wird nicht mehr uebersprungen sondern geparst -> der Test braucht einen anderen Entity-Typ fuer den Duplikat-Test
- Warnungen die nur 1x vorkommen erhalten keinen Zaehler -> `"1x"` kommt nicht mehr vor

**ABER:** Da MTEXT nach F2 als TEXT geparst wird, muss der Test, der MTEXT als "uebersprungen" erwartet, komplett ueberarbeitet werden. Das ist ein erwarteter Breaking-Change im Test (nicht im Produktionscode).

---

## 5. Implementierungsreihenfolge

| Schritt | Was | Abhaengigkeit | Aufwand |
|---------|-----|---------------|---------|
| 1a | `dxf-v2.ts`: `points` Typ erweitern | Keine | 1 Zeile |
| 1b | `parser.ts`: `BULGE_THRESHOLD` Konstante + `extractPolylinePoints()` erweitern | 1a | ~35 Zeilen |
| 1c | `parser.ts`: `bulgeToArcLength()` + `calculatePolylineLengthWithBulge()` hinzufuegen | 1b | ~50 Zeilen |
| 1d | `parser.ts`: `parseEntity()` LWPOLYLINE-Case umstellen | 1c | 1 Zeile |
| 1e | `parser.ts`: `resolveBlockEntity()` LWPOLYLINE-Case + `transformResolvedEntity()` | 1c | ~30 Zeilen |
| 1f | `EntityPath.tsx`: `bulgeToSvgArc()` + `polylineToPath()` erweitern | 1a | ~45 Zeilen |
| 1g | Tests fuer F1 schreiben | 1a-1f | ~80 Zeilen |
| 2a | `parser.ts`: MTEXT zu `SUPPORTED_TYPES` hinzufuegen | Keine | 1 Zeile |
| 2b | `parser.ts`: `normalizeMText()` Funktion hinzufuegen | Keine | ~25 Zeilen |
| 2c | `parser.ts`: MTEXT-Case in `parseEntity()` + `resolveBlockEntity()` | 2a, 2b | ~35 Zeilen |
| 2d | Tests fuer F2 schreiben + bestehenden MTEXT-Skip-Test anpassen | 2a-2c | ~50 Zeilen |
| 3a | `parser.ts`: `WarningCollector` Klasse hinzufuegen | Keine | ~20 Zeilen |
| 3b | `parser.ts`: `parseDxf()` und Funktionskette auf WarningCollector umstellen | 3a | ~15 Zeilen |
| 3c | Tests fuer F3 schreiben + bestehenden Deduplizierungs-Test anpassen | 3a-3b | ~30 Zeilen |

**Empfohlene Reihenfolge:** F1 -> F2 -> F3. F3 zuletzt, weil es die Funktionssignaturen aendert und alle bestehenden Tests mitbetrifft.

---

## 6. Test-Strategie

### 6.1 F1: Bulge-Tests (mindestens 5)

| Test | Beschreibung | Erwartung |
|------|-------------|-----------|
| `parses LWPOLYLINE with bulge values` | 2 Punkte, einer mit Code 42 = 1.0 | `points[0].bulge === 1.0`, `points[1].bulge === undefined` |
| `ignores zero bulge` | Code 42 = 0 | `points[0].bulge === undefined` |
| `calculates arc length for bulge=1 (semicircle)` | Punkte (0,0)-(10,0), bulge=1 | Laenge ~ 15.708 (pi*5), nicht 10 |
| `handles near-zero bulge as straight line` | bulge = 0.00005 | Laenge = Sehnenlaenge |
| `handles very large bulge without NaN` | bulge = 100 | Laenge ist eine endliche positive Zahl |
| `renders bulge segment as SVG arc` | LWPOLYLINE mit bulge | `polylineToPath()` enthaelt `A`-Kommando |
| `renders non-bulge segment as SVG line` | LWPOLYLINE ohne bulge | `polylineToPath()` enthaelt nur `L` und `M` |
| `closed polyline uses last point bulge for closing segment` | 4 Punkte, letzter mit bulge=1, closed=true | Schlusssegment ist ein Arc |

### 6.2 F2: MTEXT-Tests (mindestens 4)

| Test | Beschreibung | Erwartung |
|------|-------------|-----------|
| `parses MTEXT as TEXT entity` | MTEXT mit Code 1 | `type === "TEXT"`, `coordinates.text` enthaelt bereinigten Text |
| `strips MTEXT formatting sequences` | `"\P"`, `"{\H2.5;Beschriftung}"` | `coordinates.text` ohne Formatierung |
| `concatenates Code 3 + Code 1 fragments` | Code 3: "Teil1", Code 3: "Teil2", Code 1: "Ende" | `coordinates.text === "Teil1Teil2Ende"` (nach Normalisierung) |
| `handles MTEXT with empty text` | MTEXT ohne Code 1/3 | `coordinates.text === ""`, kein Crash |
| `counts MTEXT under TEXT in stats` | 1 MTEXT | `stats.byType["TEXT"] === 1`, kein "MTEXT" Key |

### 6.3 F3: WarningCollector-Tests (mindestens 3)

| Test | Beschreibung | Erwartung |
|------|-------------|-----------|
| `groups identical warnings with count` | 47x gleiche Warnung | `["Block XY nicht gefunden (47x)"]` |
| `single warning has no count suffix` | 1x Warnung | `["Block XY nicht gefunden"]` |
| `preserves first-occurrence order` | "A" 3x, "B" 2x | `["A (3x)", "B (2x)"]` |
| `empty collector returns empty array` | Keine Warnungen | `[]` |

### 6.4 Bestehende Tests die angepasst werden muessen

| Test | Datei/Zeile | Grund der Anpassung |
|------|-------------|---------------------|
| `skips unknown entity types and adds a warning` | parser.test.ts:228-238 | MTEXT wird jetzt geparst, nicht uebersprungen. Test muss anderen Entity-Typ verwenden (z.B. HATCH) |
| `deduplicates skipped entity type warnings` | parser.test.ts:318-356 | MTEXT wird geparst. HATCH 1x ohne Zaehler statt mit "(1x)". |

---

## 7. Risiken

| Risiko | Schwere | Wahrscheinlichkeit | Mitigation |
|--------|---------|---------------------|------------|
| **Sweep-Richtung falsch** bei SVG-Rendering wenn `scale(1,-1)` entfernt wird | Hoch (alle Boegen spiegelverkehrt) | Niedrig (Y-Spiegelung ist fest eingebaut) | Kommentar im Code + Akzeptanztest mit visuellem Check |
| **Old-style POLYLINE verliert Bulge** bei VERTEX-Konvertierung | Mittel (Boegen als Geraden) | Mittel (VERTEX kann Code 42 haben) | Als bekannte Einschraenkung dokumentieren, separates Follow-up |
| **MTEXT mit tief verschachtelter Formatierung** wird nicht vollstaendig bereinigt | Niedrig (Formatreste im Text) | Niedrig (selten in Praxis-DXF) | Iterative Regex-Anwendung (max. 10x), Warnung bei Restresten moeglich |
| **WarningCollector aendert Format** bei 1x-Warnungen (kein "(1x)" mehr) | Niedrig (kosmetisch) | Sicher | Bestehenden Test anpassen |
| **Numerische Instabilitaet** bei extremen Bulge-Werten | Hoch (NaN/Infinity) | Niedrig (Guard-Clauses eingebaut) | Dedizierte Tests fuer chord=0, bulge nahe 0, bulge=100 |

---

## 8. Bekannte Einschraenkung: Old-style POLYLINE Bulge

Die Pruefung des bestehenden Codes zeigt: **Old-style POLYLINE (mit VERTEX-Entities) propagiert Bulge-Werte NICHT.**

Betroffene Stellen:
- `parseOneBlock()` (Zeile 304-309): VERTEX wird nur mit `x` und `y` gelesen, Group Code 42 ignoriert
- `parsePolylineEntity()` (Zeile 1289-1294): Gleich -- nur `x` und `y` aus VERTEX
- `BlockEntity.polylineVertices` (Zeile 193): Typ ist `Array<{ x: number; y: number }>` ohne `bulge`

**Konsequenz:** Old-style POLYLINE-Entities mit Bogen-Vertices werden weiterhin als gerade Linienzuege dargestellt. Dies betrifft nur DXF-Dateien die das aeltere POLYLINE-Format statt LWPOLYLINE verwenden.

**Empfehlung:** Separates Follow-up-Feature. Der Fix erfordert:
1. `BlockEntity.polylineVertices` Typ um `bulge?: number` erweitern
2. VERTEX-Parsing um Group Code 42 erweitern (an 2 Stellen)
3. Konvertierung zu LWPOLYLINE mit Bulge-Propagation

Dies ist NICHT Teil des aktuellen Scopes, wird aber in einem Kommentar im Code dokumentiert.
