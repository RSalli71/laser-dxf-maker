# DXF Parser — Vollständige Code-Analyse
**Datei:** `parser.ts` — 1477 Zeilen — Laser DXF-Maker  
**Kombinierte Analyse:** eigene Review + Kollegen-Review + Team-Review (Gemini) — März 2026

---

## 1. Gesamtbewertung ✅

Dein Parser ist bereits weit über Durchschnitt. Er ist kein einfacher Datei-Einleser mehr, sondern ein echter DXF-Resolver mit vollständiger BLOCKS/INSERT-Auflösung, Sicherheitsgrenzen und sauberem Datenmodell.

| Feature | Status |
|---|---|
| Binary DXF Erkennung | ✅ |
| 50 MB Größenlimit | ✅ |
| BLOCKS/INSERT Auflösung | ✅ |
| Zyklische INSERT-Erkennung | ✅ |
| Max. INSERT-Tiefe (16) | ✅ |
| POLYLINE (alt) → LWPOLYLINE | ✅ |
| SPLINE Fit-Points bevorzugt | ✅ |
| ByBlock Layer/Color/Linetype | ✅ |
| sourceBlock Tagging | ✅ |
| Pure function (keine Seiteneffekte) | ✅ |
| Bulge bei LWPOLYLINE | ⚠️ Fehlt — wichtigste Lücke |
| ELLIPSE Entity | ⚠️ Fehlt |
| TABLES-Sektion (Layer-Farben) | ⚠️ Fehlt |
| MTEXT Support | ⚠️ Fehlt |
| Tokenizer-Architektur | ⚠️ Noch nicht getrennt |

---

## 2. Bugs — Sofort beheben

### Bug #1 🔴 — CIRCLE/ARC bei nicht-uniformer Skalierung

In zwei Stellen (Zeile 825 und 857) wird der Radius bei nicht-uniformer INSERT-Skalierung mit dem arithmetischen Mittel berechnet. Das ist für einen CAM-Workflow **gefährlich**:

> **Warum kritisch für Laserschneiden:**  
> Ein Kreis mit Radius 10 mm und Skalierung `scaleX=2, scaleY=1` ist in der CAD-Realität
> ein **20×10 mm Oval** (Ellipse). Wenn der Parser daraus einen 14,14 mm Kreis macht,
> wird das Bauteil unbrauchbar. Eine reine Warnung reicht für ein CAM-System **nicht aus.**

**Die korrekte Lösung: CIRCLE/ARC → ELLIPSE transformieren:**

```typescript
// ❌ FALSCH — Arithmetisches Mittel:
const scaledR = r * Math.abs((scaleX + scaleY) / 2);

// ⚠️ BESSER als arithmetisches Mittel, aber immer noch nur eine Näherung:
// Das geometrische Mittel ist pragmatisch brauchbarer, geometrisch aber
// ebenfalls nicht korrekt — aus einem Kreis wird bei nicht-uniformer
// Skalierung keine neue Kreisform, sondern eine echte Ellipse.
const scaledR = r * Math.sqrt(Math.abs(scaleX * scaleY)); // Näherung!

// ✅ RICHTIG für ein CAM-System — als ELLIPSE ausgeben:
if (Math.abs(scaleX) !== Math.abs(scaleY)) {
  // Kreis wird zur Ellipse — Typ muss gewechselt werden!
  const majorR = r * Math.abs(scaleX);
  const minorR = r * Math.abs(scaleY);
  // → Entity-Typ von CIRCLE zu ELLIPSE ändern
  // → majorR, minorR an EntityCoordinates übergeben
  // → Ellipsen-Logik aus Abschnitt 3.2 verwenden
  warnings.push(
    `CIRCLE/ARC mit nicht-uniformer Skalierung ` +
    `(scaleX=${scaleX}, scaleY=${scaleY}) zu ELLIPSE transformiert.`
  );
  // Typ auf ELLIPSE setzen und coordinates entsprechend befüllen
}
```

> **Wichtig:** Diese Transformation muss in `resolveBlockEntity()` für CIRCLE und ARC
> implementiert werden — als aktive Typ-Umwandlung, nicht nur als Warnung.

---

### Bug #2 🔴 — Bulge bei LWPOLYLINE wird ignoriert

Das ist die **wichtigste fachliche Lücke** im gesamten Parser. Bei LWPOLYLINE kann jeder Punkt einen Bulge-Wert (Group Code 42) haben, der einen Bogen zwischen zwei Punkten definiert. Ohne Bulge werden gebogene Segmente als gerade Linien dargestellt.

> **Warum kritisch für Laserschneiden:**  
> Langlöcher, abgerundete Ecken, Freiformkonturen — all das verwendet Bulge-Werte.  
> Ohne Bulge: falsche Geometrie im SVG, falsche Länge in der Kalkulation,
> zackige statt weicher Schnitte an der Maschine.

**Neuer Punkt-Typ mit Bulge:**

```typescript
// Neuer Typ — Punkt mit optionalem Bogen
type PolyPoint = {
  x: number;
  y: number;
  bulge?: number;  // 0 = gerade, ≠0 = Bogen
};

// bulge = tan(Bogenwinkel / 4)
// bulge > 0  → Bogen links (CCW)
// bulge < 0  → Bogen rechts (CW)
// bulge = 1  → Halbkreis (180°)         ← NICHT 90°!
// bulge ≈ 0.414 (= tan(π/8)) → 90°-Bogen
```

**Neue `extractPolylinePoints()` mit Bulge:**

```typescript
function extractPolylinePoints(pairs: GroupPair[]): PolyPoint[] {
  const xValues: number[] = [];
  const yValues: number[] = [];
  const bulgeValues = new Map<number, number>();

  let bulgeIndex = -1;

  for (const pair of pairs) {
    if (pair.code === 10) {
      xValues.push(parseFloat(pair.value) || 0);
      bulgeIndex = xValues.length - 1;
    } else if (pair.code === 20) {
      yValues.push(parseFloat(pair.value) || 0);
    } else if (pair.code === 42) {
      // Bulge gehört zum letzten gelesenen Punkt
      const b = parseFloat(pair.value);
      if (!isNaN(b) && b !== 0) {
        bulgeValues.set(bulgeIndex, b);
      }
    }
  }

  const count = Math.min(xValues.length, yValues.length);
  const points: PolyPoint[] = [];
  for (let i = 0; i < count; i++) {
    const point: PolyPoint = { x: xValues[i], y: yValues[i] };
    if (bulgeValues.has(i)) {
      point.bulge = bulgeValues.get(i);
    }
    points.push(point);
  }
  return points;
}
```

**Bogenlänge aus Bulge berechnen:**

```typescript
function bulgeToArcLength(
  p1: PolyPoint,
  p2: PolyPoint,
  bulge: number
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chord = Math.sqrt(dx * dx + dy * dy);

  // Bogenwinkel aus Bulge: theta = 4 * atan(|bulge|)
  const theta = 4 * Math.atan(Math.abs(bulge));

  // Radius des Bogens
  const r = chord / (2 * Math.sin(theta / 2));

  return r * theta; // Bogenlänge
}

// Polylinien-Länge mit Bulge-Unterstützung:
function calculatePolylineLengthWithBulge(
  points: PolyPoint[],
  closed?: boolean
): number {
  let length = 0;
  const count = closed ? points.length : points.length - 1;

  for (let i = 0; i < count; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    // Explizite undefined-Prüfung — nicht nur truthy-Check!
    if (p1.bulge !== undefined && Math.abs(p1.bulge) > 0.0001) {
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

**Bulge → SVG-Arc (in `EntityPath.tsx`):**

> ⚠️ **Wichtiger Hinweis zum Koordinatensystem:**  
> In DXF zeigt die Y-Achse nach **oben**. Im Standard-SVG zeigt Y nach **unten**.  
> Die unten gezeigte `sweep`-Logik funktioniert nur korrekt wenn das SVG-Element
> mit `transform="scale(1, -1)"` gespiegelt wird — wie es in deinem `DxfEditor.tsx`
> bereits mit `<g transform="scale(1,-1)">` der Fall ist.  
> **Fehlt diese Spiegelung, rendert und schneidet die Maschine alle Bögen spiegelverkehrt!**

```typescript
function bulgeToSvgArc(
  p1: PolyPoint,
  p2: PolyPoint,
  bulge: number
): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chord = Math.sqrt(dx * dx + dy * dy);
  const theta = 4 * Math.atan(Math.abs(bulge));
  const r = chord / (2 * Math.sin(theta / 2));
  const largeArc = theta > Math.PI ? 1 : 0;
  // Sweep korrekt NUR mit scale(1,-1)-Spiegelung im SVG!
  const sweep = bulge > 0 ? 1 : 0;

  return `A${r},${r} 0 ${largeArc},${sweep} ${p2.x},${p2.y}`;
}

// In polylineToPath() — mit expliziter undefined-Prüfung:
function polylineToPath(points: PolyPoint[], closed?: boolean): string {
  if (!points || points.length < 2) return '';
  const parts = [`M${points[0].x},${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (p1.bulge !== undefined && Math.abs(p1.bulge) > 0.0001) {
      parts.push(bulgeToSvgArc(p1, p2, p1.bulge));
    } else {
      parts.push(`L${p2.x},${p2.y}`);
    }
  }

  if (closed) parts.push('Z');
  return parts.join(' ');
}
```

---

## 3. Wichtige Erweiterungen

### 3.1 🟡 TABLES-Sektion — Layer-Farben lesen

Aktuell weißt du nicht welche Farbe ein Layer wirklich hat. Wenn eine Entity `color=256` (ByLayer) hat, bekommst du nur Fallback-Grau — obwohl der Layer z.B. als Rot definiert ist.

```typescript
interface LayerInfo {
  name: string;
  color: number;      // ACI 1-255
  linetype: string;   // z.B. "CONTINUOUS"
  frozen: boolean;
}

function parseTablesSection(lines: string[]): Map<string, LayerInfo> {
  const layers = new Map<string, LayerInfo>();
  const tablesStart = findSectionStart(lines, "TABLES");
  if (tablesStart === -1) return layers;

  let i = tablesStart;
  let inLayerTable = false;

  while (i < lines.length - 1) {
    const code = lines[i].trim();
    const value = lines[i + 1].trim();

    if (code === "0" && value === "ENDSEC") break;

    if (code === "2" && value === "LAYER") {
      inLayerTable = true;
      i += 2;
      continue;
    }
    if (code === "0" && value === "TABLE") inLayerTable = false;

    if (inLayerTable && code === "0" && value === "LAYER") {
      const { pairs, nextIndex } = readEntityPairs(lines, i);
      const name = getStringValue(pairs, 2);
      const colorRaw = getIntValue(pairs, 62) ?? 7;
      const linetype = getStringValue(pairs, 6) ?? "CONTINUOUS";
      const flags = getIntValue(pairs, 70) ?? 0;

      if (name) {
        layers.set(name, {
          name,
          color: Math.abs(colorRaw), // Negativ = gefroren
          linetype,
          frozen: (flags & 1) !== 0,
        });
      }
      i = nextIndex;
      continue;
    }
    i += 2;
  }
  return layers;
}

// In parseDxf() hinzufügen:
const layerInfos = parseTablesSection(lines);

// ByLayer-Farbe auflösen:
function resolveEntityColor(
  entity: DxfEntityV2,
  layers: Map<string, LayerInfo>
): number {
  if (entity.color !== 256) return entity.color;
  return layers.get(entity.layer)?.color ?? 7;
}
```

---

### 3.2 🟡 ELLIPSE Entity hinzufügen

ELLIPSE-Entitäten entstehen sowohl direkt aus der DXF als auch durch die Transformation von CIRCLE/ARC bei nicht-uniformer INSERT-Skalierung (Bug #1).

> ⚠️ **Volle Ellipse vs. Teil-Ellipse:**  
> Die DXF-Spezifikation kennt auch elliptische Bögen (startParam/endParam ≠ 0/2π).  
> Der unten gezeigte Code rendert **nur die volle Ellipse** — die Teilbogen-Parameter
> werden ignoriert. Das ist eine **MVP-Variante**. Für Teil-Ellipsen ist eine separate
> Implementierung erforderlich, ebenso für die korrekte Längenberechnung.

```typescript
// In SUPPORTED_TYPES hinzufügen:
const SUPPORTED_TYPES = new Set<string>([
  "LINE", "CIRCLE", "ARC", "LWPOLYLINE", "SPLINE",
  "TEXT", "DIMENSION", "POLYLINE",
  "ELLIPSE",  // ← NEU
  "MTEXT",    // ← NEU (siehe 3.3)
]);

// In parseEntity():
case "ELLIPSE": {
  type = "ELLIPSE";
  const cx = getFloatValue(pairs, 10) ?? 0;
  const cy = getFloatValue(pairs, 20) ?? 0;
  const majorX = getFloatValue(pairs, 11) ?? 1;  // Hauptachse relativ
  const majorY = getFloatValue(pairs, 21) ?? 0;
  const ratio  = getFloatValue(pairs, 40) ?? 1;  // Nebenachse/Hauptachse
  const startParam = getFloatValue(pairs, 41) ?? 0;
  const endParam   = getFloatValue(pairs, 42) ?? (2 * Math.PI);

  const majorR = Math.sqrt(majorX ** 2 + majorY ** 2);
  const minorR = majorR * ratio;

  // Ramanujan-Näherung — gilt nur für volle Ellipse (startParam=0, endParam=2π)
  const h = ((majorR - minorR) / (majorR + minorR)) ** 2;
  length = Math.PI * (majorR + minorR) *
           (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));

  // Einfache closed-Näherung — nur für den häufigsten Fall korrekt.
  // Bei variierenden Parameterlagen in DXF kann diese Prüfung unzuverlässig sein.
  closed = Math.abs(endParam - startParam - 2 * Math.PI) < 0.001;

  coordinates = { cx, cy, majorR, minorR, majorX, majorY,
                  startParam, endParam };
  break;
}

// In EntityPath.tsx — MVP: nur volle Ellipse, keine Teilbögen:
// ⚠️ startParam und endParam werden hier nicht ausgewertet.
function ellipseToPath(c: EntityCoordinates): string | null {
  if (!c.cx || !c.cy || !c.majorR) return null;
  const rot = Math.atan2(c.majorY ?? 0, c.majorX ?? 1) * 180 / Math.PI;
  const rx = c.majorR;
  const ry = c.minorR ?? rx;
  return [
    `M${c.cx - rx},${c.cy}`,
    `A${rx},${ry} ${rot} 1,0 ${c.cx + rx},${c.cy}`,
    `A${rx},${ry} ${rot} 1,0 ${c.cx - rx},${c.cy}`,
    "Z"
  ].join(" ");
}
```

---

### 3.3 🟡 MTEXT als TEXT behandeln

> ⚠️ **MTEXT enthält Formatierungssequenzen:**  
> Echte MTEXT-Daten enthalten oft Steuerfolgen wie `\\P` (Zeilenumbruch),
> `{\\H2.5;Text}`, `\\A1;` usw. Das reine Zusammenfügen von Code 1 und 3
> reicht für viele reale Dateien nicht. Für Anzeige/Klassifizierung sollte eine
> `normalizeMText()`-Funktion die Formatcodes bereinigen.

```typescript
case "MTEXT": {
  type = "TEXT";
  const x = getFloatValue(pairs, 10) ?? 0;
  const y = getFloatValue(pairs, 20) ?? 0;
  const rawText = pairs
    .filter(p => p.code === 1 || p.code === 3)
    .map(p => p.value)
    .join("");
  const height = getFloatValue(pairs, 40) ?? 1;
  const text = normalizeMText(rawText);
  coordinates = { x, y, text, height };
  length = 0;
  break;
}

// Minimale normalizeMText()-Implementierung:
function normalizeMText(raw: string): string {
  return raw
    .replace(/\\P/g, " ")             // Absatzumbruch → Leerzeichen
    .replace(/\\~~/g, " ")            // Geschütztes Leerzeichen
    .replace(/\{\\[^}]+\}/g, "")      // Formatblöcke: {\H2.5;...}
    .replace(/\\[A-Za-z][^;]*;/g, "") // Steuersequenzen: \A1; \H2.5;
    .replace(/[{}]/g, "")             // Verbleibende geschweifte Klammern
    .trim();
}
```

---

### 3.4 🟢 Nulllinien filtern

```typescript
case "LINE": {
  length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  if (length < 0.0001) return null; // Nulllinien ignorieren
  break;
}
```

---

## 4. Architektur verbessern

### 4.1 🟡 Tokenizer-Architektur einführen

```typescript
interface DxfToken {
  index: number;
  line: number;
  code: number;
  value: string;
}

function tokenizeDxf(content: string): {
  tokens: DxfToken[];
  warnings: string[];
} {
  const normalized = content.replace(/^\uFEFF/, ""); // BOM entfernen
  const lines = normalized.split(/\r?\n/);
  const tokens: DxfToken[] = [];
  const warnings: string[] = [];

  if (lines.length % 2 !== 0) {
    warnings.push("Ungerade Zeilenanzahl — Datei möglicherweise beschädigt.");
  }

  for (let i = 0; i < lines.length - 1; i += 2) {
    const codeLine = lines[i].trim();
    const valueLine = lines[i + 1].trim();
    const code = parseInt(codeLine, 10);

    if (isNaN(code)) {
      warnings.push(`Zeile ${i}: Ungültiger Group Code '${codeLine}'`);
      continue;
    }
    tokens.push({ index: tokens.length, line: i, code, value: valueLine });
  }
  return { tokens, warnings };
}

// Klare Trennung:
// tokenizeDxf()    → string → DxfToken[]
// parseBlocks()    → DxfToken[] → Map<string, BlockDefinition>
// parseEntities()  → DxfToken[] → DxfEntityV2[]
```

---

### 4.2 🟡 WarningCollector — Wiederholungen vermeiden

```typescript
class WarningCollector {
  private counts = new Map<string, number>();
  private order: string[] = [];

  push(message: string): void {
    if (!this.counts.has(message)) {
      this.order.push(message);
      this.counts.set(message, 1);
    } else {
      this.counts.set(message, this.counts.get(message)! + 1);
    }
  }

  toArray(): string[] {
    return this.order.map(msg => {
      const count = this.counts.get(msg)!;
      return count > 1 ? `${msg} (${count}x)` : msg;
    });
  }
}
```

---

### 4.3 🟡 Performance — switch statt Map pro Entity

> ⚠️ **Kein `Map`-Objekt pro Entity erstellen!**  
> Ein Ansatz der für jede Entity zwei neue `Map`-Objekte und Arrays erstellt,
> erzeugt bei 100.000 Entities 200.000 kurzlebige Maps in Sekundenbruchteilen.
> Das erhöht den RAM-Bedarf stark und lässt den Garbage Collector der V8-Engine
> einfrieren — der erhoffte Performance-Gewinn kehrt sich ins Gegenteil.

```typescript
// ✅ RICHTIG — kein Map-Overhead, direkte Zuweisung per switch:
function parseEntity(
  entityType: string,
  pairs: GroupPair[],
  id: number,
  warnings: string[],
): DxfEntityV2 | null {

  // Gemeinsame Felder einmalig per switch extrahieren:
  let layer    = "0";
  let color    = 7;
  let linetype = "CONTINUOUS";
  let handle: string | undefined;

  for (const pair of pairs) {
    switch (pair.code) {
      case 5:  handle   = pair.value; break;
      case 6:  linetype = pair.value; break;
      case 8:  layer    = pair.value; break;
      case 62: color    = parseInt(pair.value, 10) || 7; break;
    }
  }

  // Geometrie je nach Typ aus denselben pairs lesen
  // (getFloatValue / getAllFloatValues weiterhin verwenden)
  // ...
}
```

> Dieser Ansatz kostet keinen zusätzlichen Speicher und ist bei größeren Dateien
> erfahrungsgemäß spürbar schneller als wiederholte `Array.find()`-Aufrufe.

---

### 4.4 🟡 Parser / Classifier trennen

```typescript
// classifier.ts (neues Modul):
export function classifyEntities(
  entities: DxfEntityV2[],
  layers: Map<string, LayerInfo>
): DxfEntityV2[] {
  return entities.map(entity => ({
    ...entity,
    classification: classifyOne(entity, layers),
  }));
}

function classifyOne(
  entity: DxfEntityV2,
  layers: Map<string, LayerInfo>
): ClassificationType | undefined {

  // ⚠️ NUR BEISPIEL-HEURISTIK — nicht als feste Regel verwenden!
  // Die konkrete Zuordnung muss projektspezifisch über konfigurierbare
  // Layer-Regeln gesteuert werden. "CUT" kann je nach Betrieb sowohl
  // Außen- als auch Innenschnitt bedeuten.

  const layerName = entity.layer.toUpperCase();
  if (layerName.includes("CUT"))     return "CUT_INNER";  // Beispiel!
  if (layerName.includes("BEND"))    return "BEND";
  if (layerName.includes("ENGRAVE")) return "ENGRAVE";

  if (entity.color === 1) return "CUT_OUTER";
  if (entity.color === 5) return "BEND";
  if (entity.color === 3) return "ENGRAVE";

  return undefined; // → User entscheidet
}
```

---

### 4.5 🟢 Datenmodell erweitern (DxfEntityV3)

```typescript
type DxfEntityV3 = {
  id: number;
  type: DxfEntityType;
  layer: string;
  color: number;
  linetype: string;
  coordinates: EntityCoordinates;
  length: number;
  closed?: boolean;

  sourceBlock?: string;
  sourceInsertDepth?: number;

  handle?: string;             // Group Code 5
  lengthEstimated?: boolean;   // true bei SPLINE
  warnings?: string[];

  classification?: ClassificationType;
  partId?: number;
};

// SPLINE markieren — und Hinweis für Wave 2:
case "SPLINE": {
  // ⚠️ SPLINE wird aktuell nur als Linienzug approximiert!
  // Für korrekte Laser-Ausgabe muss in Wave 2 Spline-Flattening
  // implementiert werden: NURBS-Kurve → viele kleine Liniensegmente.
  // Ohne das schneidet der Laser zackige Ecken statt weicher Kurven.
  return { ...entity, lengthEstimated: true };
}
```

---

### 4.6 🟢 BOM und globales trim() korrigieren

```typescript
// ❌ Aktuell:
const trimmed = content.trim();

// ✅ Besser:
const normalized = content.replace(/^\uFEFF/, "");
const lines = normalized.split(/\r?\n/);

if (lines.length % 2 !== 0) {
  warnings.push("Ungerade Anzahl DXF-Zeilen — Datei möglicherweise beschädigt.");
}
```

---

## 5. Prioritätsliste

| Priorität | Was | Aufwand | Wirkung |
|---|---|---|---|
| 🔴 Sofort | CIRCLE/ARC → ELLIPSE bei nicht-uniformer Skalierung | ~20 Zeilen | Kein falsches Bauteil an der Maschine |
| 🔴 Sofort | Bulge-Support LWPOLYLINE | ~80 Zeilen | Korrekte Bögen & Längen |
| 🟡 Bald | TABLES-Sektion (Layer-Farben) | ~60 Zeilen | ByLayer-Farben korrekt |
| 🟡 Bald | ELLIPSE Entity (MVP: volle Ellipse) | ~30 Zeilen | Ellipsen nicht mehr ignoriert |
| 🟡 Bald | WarningCollector | ~25 Zeilen | Keine Warning-Flut mehr |
| 🟡 Bald | Parser / Classifier trennen | ~50 Zeilen | Saubere Architektur |
| 🟡 Später | Tokenizer-Architektur | ~100 Zeilen Umbau | Robuster, besser testbar |
| 🟡 Später | switch statt find() für Performance | ~30 Zeilen | Spürbar schneller bei großen Dateien |
| 🟢 Optional | MTEXT + normalizeMText() | ~25 Zeilen | Mehr Text erkannt |
| 🟢 Optional | Nulllinien filtern | ~3 Zeilen | Weniger Entities |
| 🟢 Optional | DxfEntityV3 Felder | ~15 Zeilen | Besser für Debug/KI |
| 🟢 Optional | BOM-Handling verbessern | ~5 Zeilen | Robuster bei Altdateien |

---

## 6. Was bereits richtig und gut ist — NICHT ändern

- ✅ Zyklische INSERT-Erkennung — verhindert Endlosschleifen sicher
- ✅ SPLINE Fit-Points vs Control-Points — richtige Priorität
- ✅ POLYLINE → LWPOLYLINE Konvertierung — sauber umgesetzt
- ✅ `resolveLayer / resolveColor / resolveLinetype` — ByBlock-Vererbung korrekt
- ✅ Binary DXF Erkennung — zuverlässig
- ✅ 50 MB Limit und 100k Entity-Warnung — gute Sicherheitsgrenzen
- ✅ Pure function — kein globaler State, leicht testbar
- ✅ sourceBlock Tagging — wichtig für Cleaner-Logik
- ✅ `MAX_INSERT_DEPTH = 16` — vernünftiger Wert

---

## 7. Roadmap — 4 Waves

### Wave 1 — Parser robuster machen
- BOM-Handling und ungerade Zeilen erkennen
- WarningCollector einführen
- Nulllinien filtern

### Wave 2 — Geometriequalität erhöhen
- **Bulge-Support für LWPOLYLINE** ← höchste Priorität!
- **CIRCLE/ARC → ELLIPSE bei nicht-uniformer Skalierung** ← CAM-kritisch!
- ELLIPSE Entity hinzufügen (MVP: volle Ellipse; Teil-Ellipsen separat)
- **Spline-Flattening:** NURBS-Kurve in viele Liniensegmente unterteilen  
  *(ohne das schneidet der Laser zackige Ecken statt weicher Kurven)*
- MTEXT als TEXT + normalizeMText()
- SPLINE als `lengthEstimated` markieren

### Wave 3 — Architektur trennen
- TABLES-Sektion für Layer-Farben
- Parser / Classifier sauber trennen *(Layer-Regeln projektspezifisch konfigurierbar!)*
- DxfEntityV3 Datenmodell
- switch-basiertes Pair-Parsing für Performance

### Wave 4 — Tokenizer & ML-Ready
- Tokenizer-Architektur einführen
- Klassifizierungs-Labels strukturiert speichern
- User-Korrekturen loggen
- Benchmark-DXF-Dateien aufbauen

---

> **Fazit:** Dein Parser ist gut genug für MVP/V1 — aber für einen CAM-Workflow
> (Laserschneiden) sind **Bulge-Support** und die **CIRCLE→ELLIPSE-Transformation**
> bei nicht-uniformer Skalierung keine optionalen Verbesserungen, sondern
> **Voraussetzungen für maßhaltige Bauteile**.
