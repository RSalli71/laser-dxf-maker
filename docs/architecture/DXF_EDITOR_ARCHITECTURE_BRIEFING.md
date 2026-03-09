# DXF-Editor Architektur-Briefing (zur Wiederverwendung)

Dieses Dokument beschreibt die Architektur des SVG-basierten DXF-Editors,
damit ein anderer Agent (oder Entwickler) die Grundstruktur in einem neuen Projekt nachbauen kann.

**Stack:** React 18+, Next.js (App Router, `"use client"`), TypeScript, reines SVG (keine Canvas-Library).

---

## Kern-Architektur (4 Schichten)

```
1. Datenmodell     -> DxfEntityV2 (flaches Interface mit type, coordinates, color, layer)
2. SVG-Rendering   -> EntityPath (memo'd Component, entity -> SVG <path d="...">)
3. Viewport-Logik  -> useEditorViewport Hook (Zoom/Pan/Fit, ViewBox-State)
4. Editor-Shell    -> DxfEditor (SVG-Container, Pointer-Events, Selektion)
```

---

## 1. Datenmodell (`DxfEntityV2`)

Jede geometrische Entity aus der DXF-Datei wird als flaches Objekt dargestellt:

```typescript
interface DxfEntityV2 {
  id: number;
  type: "LINE" | "ARC" | "CIRCLE" | "LWPOLYLINE" | "ELLIPSE" | "SPLINE" | ...;
  layer: string;
  color: number;           // ACI-Farbnummer (AutoCAD Color Index, 0-256)
  linetype: string;
  coordinates: EntityCoordinates;
  length: number;          // Laenge in DXF-Einheiten
  closed?: boolean;        // Ob Entity geschlossen ist (Polyline, Spline)
}

interface EntityCoordinates {
  // LINE: Start/End
  x1?: number; y1?: number; x2?: number; y2?: number;

  // CIRCLE, ARC: Mittelpunkt + Radius
  cx?: number; cy?: number; r?: number;

  // ARC, ELLIPSE: Winkel in Grad
  startAngle?: number; endAngle?: number;

  // ELLIPSE: Halbachsen + Rotation
  majorAxis?: number; minorAxis?: number; rotationAngle?: number;

  // LWPOLYLINE, SPLINE: Punkt-Liste
  points?: Array<{ x: number; y: number }>;

  // TEXT, POINT: Position
  x?: number; y?: number;
}
```

**Anpassung fuer anderes Projekt:** Das Interface an das eigene Datenformat anpassen.
Die Koordinaten-Struktur ist bewusst flach (kein Discriminated Union), weil das
die JSON-Serialisierung vereinfacht.

---

## 2. Entity -> SVG-Pfad (`EntityPath`)

**Datei:** `src/components/editor/EntityPath.tsx` (~395 Zeilen)

### Kernfunktion: `entityToSvgPath(entity) -> string | null`

Switch auf `entity.type`, erzeugt SVG-Path-d-String:

| Entity-Typ   | SVG-Konvertierung                                        |
|--------------|----------------------------------------------------------|
| LINE         | `M x1,y1 L x2,y2`                                       |
| ARC          | `M start A r,r 0 largeArc,sweep end` (Winkel CCW->SVG)  |
| CIRCLE       | Zwei Halbkreis-Boegen (`A` + `A` + `Z`)                 |
| LWPOLYLINE   | `M p0 L p1 L p2 ...` (+ `Z` wenn closed)                |
| ELLIPSE      | Volle: zwei Halbboegen / Teil: Punkt-Approximation (24 Segmente) |
| SPLINE       | Linienzug-Approximation (`M` + `L`-Folge)               |

### Wichtige Details

- **ARC-Winkel:** DXF nutzt CCW-Winkel in Grad. Konvertierung: `startRad`, `endRad`,
  wenn `endRad <= startRad` dann `+2*PI`. `sweep=1` wegen `scale(1,-1)`.
- **CIRCLE:** SVG hat kein natives Circle-Path-Element -> zwei `A`-Kommandos.
- **SPLINE:** Vereinfacht als Linienzug (Bezier waere exakter, aber aufwaendiger).

### Visuelles State-System

Die Komponente ist `React.memo` und bekommt visuelle States als Props:

```typescript
interface EntityPathProps {
  entity: DxfEntityV2;
  isSelected: boolean;    // Gehoert zur selektierten Kontur (blau, 2x Strich)
  isHovered: boolean;     // Gehoert zur gehoverten Kontur (leichtes Highlight)
  isContained: boolean;   // Liegt innerhalb selektierter Kontur (Akzent)
  isAlreadySplit: boolean; // Bereits verarbeitet (grau, gestrichelt, 0.3 opacity)
  isDimmed: boolean;      // Nicht Teil der aktiven Kontur (opacity 0.15)
  isOpenChain: boolean;   // Offene Kette (duennerer Strich, reduzierte opacity)
  // ... weitere optionale States
}
```

**Prioritaet der visuellen States** (hoechste zuerst):
`isAlreadySplit > isDeleted > isEntitySelected > isEntityHovered > isGroupHighlighted > isSelected > isContained > isHovered > isDimmed > default`

### ACI-Farben

```typescript
const ACI_COLORS: Record<number, string> = {
  0: "#808080",   // ByBlock
  1: "#ff0000",   // Rot
  2: "#ffff00",   // Gelb
  3: "#00cc00",   // Gruen
  4: "#00aacc",   // Cyan
  5: "#0000ff",   // Blau
  6: "#cc00cc",   // Magenta
  7: "#1a1a1a",   // Weiss -> Dunkelgrau (auf hellem Hintergrund!)
  8: "#555555",   // Dunkelgrau
  9: "#888888",   // Hellgrau
  256: "#808080", // ByLayer
};
```

Weisse Farben (`#ffffff`) werden automatisch auf `#1a1a1a` umgemappt,
damit sie auf hellem Canvas-Hintergrund sichtbar bleiben.

---

## 3. Viewport-Logik (`useEditorViewport` Hook)

**Datei:** `src/hooks/use-editor-viewport.ts` (~170 Zeilen)

### ViewBox-Konzept

Die SVG-ViewBox `{x, y, w, h}` bestimmt den sichtbaren Ausschnitt.
Zoom = ViewBox verkleinern, Pan = ViewBox verschieben.

```typescript
interface ViewBox { x: number; y: number; w: number; h: number; }
```

### Features

| Feature         | Implementierung                                                |
|-----------------|----------------------------------------------------------------|
| **Zoom**        | Mausrad -> `handleWheel()` skaliert ViewBox um Cursor-Position |
| **Pan**         | Mittelklick / Shift+Links -> `applyPan()` verschiebt ViewBox   |
| **Fit-to-View** | `fitToView(boundingBox, containerWidth, containerHeight)`      |
| **Resize**      | `ResizeObserver` auf Container-div, recalc ViewBox             |
| **clientToWorld** | `SVGPoint.matrixTransform(ctm.inverse())` fuer Maus->DXF     |

### Performance-Trick: Transiente ViewBox-Ref

Waehrend Pan/Zoom wird **nicht** React-State gesetzt, sondern:
1. `viewBoxRef.current` wird aktualisiert (useRef)
2. `svg.setAttribute("viewBox", ...)` wird direkt aufgerufen (imperativ)
3. React-State (`setViewBox`) wird erst bei `pointerUp` synchronisiert

Das verhindert hunderte Re-Renders waehrend einer Drag-Geste.

### Wheel-Listener

Muss imperativ registriert werden mit `{ passive: false }`, damit
`preventDefault()` funktioniert (verhindert Browser-Scroll):

```typescript
svg.addEventListener("wheel", onWheelNative, { passive: false });
```

---

## 4. Editor-Shell (`DxfEditor`)

**Datei:** `src/components/editor/DxfEditor.tsx` (~750+ Zeilen)

### SVG-Struktur

```tsx
<div ref={containerRef} className="w-full h-full">
  <svg
    ref={svgRef}
    viewBox={viewBoxToString(viewBox)}
    className="w-full h-full"
  >
    <g transform="scale(1,-1)">
      {/* Hintergrund-Rect fuer Deselect-Click */}
      <rect ... onClick={handleDeselect} />

      {/* Alle Entities rendern */}
      {entities.map(entity => (
        <EntityPath
          key={entity.id}
          entity={entity}
          isSelected={...}
          isHovered={...}
          // ... weitere States
        />
      ))}
    </g>
  </svg>
</div>
```

### Wichtig: `scale(1,-1)`

DXF-Koordinaten haben Y-Achse nach oben, SVG nach unten.
`transform="scale(1,-1)"` invertiert die Y-Achse.
Das beeinflusst auch die ARC-Sweep-Richtung (`sweep=1` statt `0`).

### Pointer-Events / Hit-Testing

- **Hover:** `onPointerMove` -> `clientToWorld()` -> `hitTestEntity()` (Distanzberechnung Punkt-zu-Entity mit Snap-Toleranz)
- **Klick:** `onPointerUp` -> Hit-Test -> Selektion setzen
- **Pan:** `onPointerDown` (Mittelklick/Shift) -> `onPointerMove` -> `applyPan()` -> `onPointerUp` -> State sync
- **Snap-Toleranz:** Zoom-abhaengig (bei starkemZoom: kleinere Toleranz in Weltkoordinaten)

---

## Helper-Module (`src/lib/editor/`)

| Modul              | Funktion                                            |
|--------------------|-----------------------------------------------------|
| `viewbox.ts`       | `fitToView(bbox, w, h)`, `viewBoxToString(vb)`     |
| `zoom.ts`          | `handleWheel(e, svg, vb)` -> neue ViewBox           |
| `pan.ts`           | `handlePan(dx, dy, svg, vb)` -> neue ViewBox        |
| `svg-coords.ts`    | `worldPerPixel(vbWidth, containerWidth)` Berechnung |
| `hit-test.ts`      | `hitTestEntity()` Punkt-zu-Entity Distanz           |
| `snap-tolerance.ts`| `getSnapTolerance(vb, containerSize)` zoom-abhaengig|

Diese Module sind pure Funktionen (kein React-State) und daher
einfach in andere Projekte uebertragbar.

---

## Performance-Zusammenfassung

| Muster                              | Effekt                                    |
|--------------------------------------|-------------------------------------------|
| `React.memo` auf EntityPath          | Kein Re-Render bei Zoom/Pan               |
| Transiente ViewBox-Ref + imperatives SVG-Update | Kein React-Re-render waehrend Drag |
| `vectorEffect="non-scaling-stroke"`  | Strichstaerke unabhaengig vom Zoom        |
| Imperatives Wheel-Event `passive:false` | Verhindert Browser-Scroll              |
| Pure Helper-Funktionen               | Einfach testbar, kein Side-Effect-State   |

---

## Minimaler Nachbau (was du brauchst)

Fuer einen minimalen DXF-Viewer in einem anderen Projekt:

1. **Datenmodell:** `DxfEntityV2` + `EntityCoordinates` anpassen
2. **EntityPath:** `entityToSvgPath()` Konvertierung (Switch auf Entity-Typen)
3. **Viewport-Hook:** `useEditorViewport` (Zoom/Pan/Fit)
4. **Editor-Shell:** SVG mit `scale(1,-1)`, ViewBox, EntityPath-Rendering
5. **Helper:** `viewbox.ts`, `zoom.ts`, `pan.ts` (je ~30-50 Zeilen)

Ohne Selektion/Hit-Testing/Containment sind das ca. 400-500 Zeilen Code.
