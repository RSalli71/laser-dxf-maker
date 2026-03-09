# ARCHITECTURE

> Technische Architektur fuer Laser DXF-Maker.
> Generiert aus docs/requirements/REQUIREMENTS.md am 2026-03-09.

## Projektziel

- **Was baut dieses Projekt?**
  Ein Browser-Tool das rohe Kunden-DXF-Dateien (R12 ASCII) einliest, als SVG darstellt, Elemente nach Schnitttypen klassifiziert (Aussenkontur, Innenkontur, Biegung, Gravur), bereinigt und als saubere DXF-Datei fuer Laser-Schneidmaschinen exportiert.

- **Fuer wen ist es?**
  Laserschneider-Bediener, die taeglich Kunden-DXF-Dateien aufbereiten.

- **Top-3 Erfolgskriterien:**
  1) Echte Kunden-DXF kann hochgeladen, angezeigt und klassifiziert werden
  2) Exportierte DXF wird von LightBurn korrekt gelesen (Layer + Farben stimmen)
  3) Gesamter Workflow (Upload bis Export) dauert unter 5 Minuten pro Datei

## Tech Stack

- **Sprache(n):** TypeScript (strict mode)
- **Framework:** Next.js 16 (App Router, React 19)
- **Styling:** Tailwind CSS v4, shadcn/ui (New York)
- **Animationen:** Framer Motion (nur wo noetig)
- **Icons:** Lucide React
- **DXF-Parser:** Eigener R12 ASCII Parser (kein npm-Paket)
- **SVG-Editor:** Wiederverwendet aus DXF-Kalkulator (4-Schichten-Architektur)
- **DB/Auth:** Keine im MVP (Simple-Komplexitaet). Phase 2: Supabase.
- **Validierung:** Manuelle Validierung (Pflichtfelder). Phase 2: Zod fuer komplexere Formulare.
- **Build/Test:** npm scripts (lint, format, typecheck, build)
- **Deployment:** Lokal (localhost) im MVP. Phase 2: Vercel.

### Zusaetzliche Dependencies

Keine im MVP. Kein externer DXF-Parser -- eigener Parser fuer volle Kontrolle ueber R12 ASCII Format.

## Komplexitaet

**Simple** -- Kein Auth, keine Datenbank, keine API-Routes, kein Server-State.
Alles laeuft client-seitig im Browser. Next.js wird primaer als Build-Tool und fuer die Seitenstruktur genutzt.

## Wiederverwendete Architektur (aus DXF-Kalkulator)

Die SVG-Editor-Architektur folgt einem erprobten 4-Schichten-Modell.
Referenz: `docs/architecture/DXF_EDITOR_ARCHITECTURE_BRIEFING.md`

```
Schicht 1: Datenmodell     -> DxfEntityV2 (flaches Interface, EntityCoordinates)
Schicht 2: SVG-Rendering   -> EntityPath.tsx (entity -> SVG path, React.memo, ACI-Farben)
Schicht 3: Viewport-Logik  -> useEditorViewport Hook (Zoom/Pan/Fit, transiente ViewBox-Ref)
Schicht 4: Editor-Shell    -> DxfEditor.tsx (SVG mit scale(1,-1), Pointer-Events, Hit-Testing)
```

### Dateien die 1:1 kopiert werden (COPY_FROM_SOURCE.md)

| Datei | Ziel | Aenderungen |
|-------|------|-------------|
| `EntityPath.tsx` | `src/components/editor/EntityPath.tsx` | Keine |
| `use-editor-viewport.ts` | `src/hooks/use-editor-viewport.ts` | Keine |
| `dxf-v2.ts` | `src/types/dxf-v2.ts` | Erweitert um `classification`, `partId` |
| `viewbox.ts` | `src/lib/editor/viewbox.ts` | Keine |
| `zoom.ts` | `src/lib/editor/zoom.ts` | Keine |
| `pan.ts` | `src/lib/editor/pan.ts` | Keine |
| `svg-coords.ts` | `src/lib/editor/svg-coords.ts` | Keine |
| `hit-test.ts` | `src/lib/editor/hit-test.ts` | Keine |
| `snap-tolerance.ts` | `src/lib/editor/snap-tolerance.ts` | Keine |

### Datei die angepasst wird

| Datei | Ziel | Aenderungen |
|-------|------|-------------|
| `DxfEditor.tsx` | `src/components/editor/DxfEditor.tsx` | Box-Selektion + Klassifizierungs-Toolbar + Teile-Management |

## Datenobjekte

### DxfEntityV2 (erweitert)

```typescript
interface DxfEntityV2 {
  id: number;
  type: "LINE" | "ARC" | "CIRCLE" | "LWPOLYLINE" | "TEXT";
  layer: string;
  color: number;              // ACI-Farbnummer (0-256)
  linetype: string;           // CONTINUOUS, DASHED, HIDDEN, etc.
  coordinates: EntityCoordinates;
  length: number;
  closed?: boolean;
  // NEU fuer Laser DXF-Maker:
  classification?: ClassificationType;
  partId?: string;            // z.B. "T1", "T2"
}
```

### EntityCoordinates (unveraendert aus DXF-Kalkulator)

```typescript
interface EntityCoordinates {
  x1?: number; y1?: number; x2?: number; y2?: number;  // LINE
  cx?: number; cy?: number; r?: number;                  // CIRCLE, ARC
  startAngle?: number; endAngle?: number;                // ARC
  points?: Array<{ x: number; y: number }>;              // LWPOLYLINE
  x?: number; y?: number;                                // TEXT, POINT
  text?: string;                                         // TEXT
  height?: number;                                       // TEXT
}
```

### ProjectInfo

```typescript
interface ProjectInfo {
  customerName: string;     // Pflicht
  projectNumber: string;    // Pflicht
}
```

### PartDefinition

```typescript
interface PartDefinition {
  id: string;               // UUID oder fortlaufend
  name: string;             // "T1", "T2", "T3", ...
  entityIds: number[];      // IDs der zugeordneten Entities
}
```

### ClassificationType

```typescript
type ClassificationType = "CUT_OUTER" | "CUT_INNER" | "BEND" | "ENGRAVE";
```

### LayerConfig

```typescript
interface LayerConfig {
  classification: ClassificationType;
  layerName: string;
  hexColor: string;
  aciNumber: number;
}

const LAYER_CONFIGS: LayerConfig[] = [
  { classification: "CUT_OUTER", layerName: "CUT_OUTER", hexColor: "#FF0000", aciNumber: 1 },
  { classification: "CUT_INNER", layerName: "CUT_INNER", hexColor: "#0000FF", aciNumber: 5 },
  { classification: "BEND",      layerName: "BEND",      hexColor: "#FFFF00", aciNumber: 2 },
  { classification: "ENGRAVE",   layerName: "ENGRAVE",   hexColor: "#00CC00", aciNumber: 3 },
];
```

### Beziehungen

```
ProjectInfo (1) --> (n) PartDefinition
PartDefinition (1) --> (n) DxfEntityV2
DxfEntityV2 (n) --> (1) ClassificationType
ClassificationType (1) --> (1) LayerConfig
```

## Kern-Workflow (Datenfluss)

```
F1: ProjectForm                F2: FileUpload + Parser
    |                              |
    v                              v
ProjectInfo (State)            DxfEntityV2[] (State)
    |                              |
    +------------------------------+
                |
                v
F3: DxfEditor (Teile definieren)
    - Box-Selektion / Einzelklick
    - partId auf Entities setzen
    - PartDefinition[] erstellen
                |
                v
F4: Cleaner (automatisch pro Teil)
    - DIMENSION entfernen
    - Gestrichelte Kreise/Boegen entfernen (Gewinde)
    - Duplikate entfernen
    - Nulllinien entfernen
                |
                v
F5: Classifier + DxfEditor (Korrektur)
    - Auto-Heuristiken anwenden
    - Bediener korrigiert per Klick/Box-Selektion
    - classification + layer + color setzen
                |
                v
F6: Exporter
    - Pro Teil: DxfEntityV2[] -> DXF R12 ASCII String
    - Dateiname: [Kunde]_[Projekt]-T[N].dxf
    - Browser-Download ausloesen
```

## Modul-Architektur

### Neue Module (NEU zu erstellen)

#### `src/lib/dxf/parser.ts` -- DXF R12 ASCII Parser

```
Input:  string (DXF-Dateiinhalt)
Output: { entities: DxfEntityV2[], stats: ParseStats }

Aufgaben:
- DXF-Sektionen erkennen (HEADER, TABLES, ENTITIES, EOF)
- ENTITIES-Sektion parsen: Gruppencode-Paare lesen
- Unterstuetzte Entity-Typen: LINE, CIRCLE, ARC, LWPOLYLINE, TEXT
- Layer, Color, Linetype pro Entity extrahieren
- Fortlaufende ID vergeben
- Parse-Statistik erstellen (Anzahl pro Typ)

Fehlerbehandlung:
- Binaer-DXF erkennen und ablehnen
- Leere ENTITIES-Sektion melden
- Unbekannte Entity-Typen ueberspringen (mit Warnung)
```

#### `src/lib/dxf/exporter.ts` -- DXF R12 ASCII Exporter

```
Input:  DxfEntityV2[] (klassifiziert), ProjectInfo, PartDefinition
Output: string (DXF R12 ASCII Inhalt)

Aufgaben:
- HEADER-Sektion schreiben (minimaler R12-Header)
- TABLES-Sektion: Layer-Definitionen (CUT_OUTER, CUT_INNER, BEND, ENGRAVE)
- ENTITIES-Sektion: Entities mit korrektem Layer + ACI-Farbe
- Unterstuetzte Typen: LINE, CIRCLE, ARC, LWPOLYLINE, TEXT
- EOF-Marker

Dateiname-Logik:
- Mehrere Teile: [Kunde]_[Projekt]-T1.dxf, -T2.dxf, ...
- Ein Teil: [Kunde]_[Projekt].dxf (ohne -T1)
- Sonderzeichen bereinigen (Umlaute, Leerzeichen -> Unterstrich)
```

#### `src/lib/dxf/cleaner.ts` -- Auto-Bereinigung

```
Input:  DxfEntityV2[] (eines Teils)
Output: { cleaned: DxfEntityV2[], report: CleanReport }

Regeln (in dieser Reihenfolge):
1. DIMENSION Entities entfernen (type-basiert, falls im Parser erkannt)
2. Gestrichelte Kreise/Boegen entfernen (linetype === "DASHED" | "HIDDEN")
   - Ausnahme: Volle Kreise mit CONTINUOUS behalten
3. Duplikate entfernen (gleicher Typ + gleiche Koordinaten, Toleranz ~0.01mm)
4. Nulllinien entfernen (LINE mit Start === Ende)
5. Leere Layer entfernen (keine Entities mehr)

CleanReport:
- removedDimensions: number
- removedThreadHelpers: number
- removedDuplicates: number
- removedZeroLines: number
- removedEmptyLayers: string[]
- totalRemoved: number
```

#### `src/lib/dxf/classifier.ts` -- Auto-Vorklassifizierung

```
Input:  DxfEntityV2[] (bereinigt, eines Teils)
Output: DxfEntityV2[] (mit classification, layer, color gesetzt)

Heuristiken:
1. TEXT Entities -> ENGRAVE
2. Geschlossene Konturen erkennen (closed Polylines, Circles)
3. Groesste geschlossene Kontur (nach Laenge/Flaeche) -> CUT_OUTER
4. Kleinere geschlossene Konturen -> CUT_INNER
5. Kurze gerade Linien (nicht Teil einer geschlossenen Kontur) -> BEND
6. Restliche Entities -> CUT_INNER (Default)

Nach Klassifizierung:
- layer und color werden gemaess LAYER_CONFIGS gesetzt
```

### UI-Komponenten (NEU zu erstellen)

#### `src/components/shared/ProjectForm.tsx` (Client Component)

```
Props: onSubmit(info: ProjectInfo)
State: customerName, projectNumber (controlled inputs)
Validierung: Manuelle Pflichtfeld-Pruefung (beide Felder required)
UI: shadcn/ui Input + Button, Fehlermeldungen inline
```

#### `src/components/shared/ClassifyToolbar.tsx` (Client Component)

```
Props:
  activeClassification: ClassificationType | null
  onClassificationChange(type: ClassificationType): void
  stats: Record<ClassificationType, number>

UI:
  4 Buttons nebeneinander, jeweils mit Farbe und Label:
  - Aussenkontur (Rot)
  - Innenkontur (Blau)
  - Biegung (Gelb)
  - Gravur (Gruen)
  Aktiver Button ist hervorgehoben.
  Unter jedem Button: Anzahl der Entities mit dieser Klassifikation.
```

#### `src/components/shared/FileUpload.tsx` (Client Component)

```
Props: onFileLoaded(content: string, fileName: string): void
UI: shadcn/ui Button + Drag-and-Drop-Zone
Validierung: Nur .dxf Dateien, Fehlermeldung bei falschem Format
```

#### `src/components/shared/PartsList.tsx` (Client Component)

```
Props:
  parts: PartDefinition[]
  activePart: string | null
  onNewPart(): void
  onSelectPart(partId: string): void

UI: Liste aller Teile mit Name und Entity-Anzahl. Button "Neues Teil".
```

#### `src/components/shared/CleanReport.tsx` (Server oder Client)

```
Props: report: CleanReport
UI: Zusammenfassung der Bereinigung (Tabelle oder Liste)
```

#### `src/components/shared/ExportPanel.tsx` (Client Component)

```
Props:
  parts: PartDefinition[]
  entities: DxfEntityV2[]
  projectInfo: ProjectInfo

Funktionen:
  - Vorschau pro Teil (nur bereinigte + klassifizierte Entities)
  - Export-Button pro Teil oder "Alle exportieren"
  - Dateien als Browser-Download
```

## Routen-Plan

| Route | Typ | Beschreibung |
|-------|-----|-------------|
| `/` | Public | Einzige Seite -- Wizard-artiger Workflow |

### Kein Multi-Page Routing

Die App hat eine einzige Seite. Der Workflow (F1-F6) wird ueber Client-State gesteuert, nicht ueber URL-Routing. Gruende:

- Simple-Komplexitaet: Kein Auth, keine DB, kein Grund fuer separate Routen
- Der Workflow ist linear und zustandsbehaftet (Entities im Speicher)
- Browser-Navigation (Zurueck-Button) wuerde den State verlieren

### Workflow-Steps (Client-State)

```typescript
type WorkflowStep =
  | "project"      // F1: Kunde/Projekt eingeben
  | "upload"       // F2: DXF hochladen + parsen
  | "select"       // F3: Bereiche auswaehlen (Teile definieren)
  | "clean"        // F4: Auto-Bereinigung (Ergebnis anzeigen)
  | "classify"     // F5: Auto-Klassifizierung + manuelle Korrektur
  | "export";      // F6: Export + Download
```

## Component-Architektur

### Layout-Hierarchie

```
RootLayout (Server)
└── page.tsx (Server -- rendert Client-Wrapper)
    └── AppShell.tsx (Client -- "use client")
        ├── Header (Projektinfo-Anzeige, Schritt-Indikator)
        ├── WorkflowStep === "project"
        │   └── ProjectForm
        ├── WorkflowStep === "upload"
        │   └── FileUpload + ParseStats
        ├── WorkflowStep === "select"
        │   ├── DxfEditor (Box-Selektion, Einzelklick)
        │   └── PartsList
        ├── WorkflowStep === "clean"
        │   ├── DxfEditor (Vorschau bereinigt)
        │   └── CleanReport
        ├── WorkflowStep === "classify"
        │   ├── ClassifyToolbar
        │   ├── DxfEditor (Klassifizierungs-Modus)
        │   └── Statistik
        └── WorkflowStep === "export"
            └── ExportPanel
```

### Server vs. Client

| Komponente | Server/Client | Warum |
|------------|--------------|-------|
| RootLayout | Server | Gemeinsame UI (HTML, Head) |
| page.tsx | Server | Rendert AppShell |
| AppShell | Client | Zentraler State-Container, steuert Workflow |
| ProjectForm | Client | useState, Events, Validierung |
| FileUpload | Client | File API, Drag-and-Drop |
| DxfEditor | Client | SVG Pointer-Events, Zoom/Pan, Hover |
| EntityPath | Client | React.memo, visuelle States |
| ClassifyToolbar | Client | onClick, aktiver State |
| PartsList | Client | Interaktive Liste |
| CleanReport | Client | Zeigt dynamische Daten |
| ExportPanel | Client | Download-Trigger |

> Fast alles ist Client-seitig, weil die App rein interaktiv ist (SVG-Editor, File API, kein Server-Datenzugriff).

### State-Strategie

```
AppShell (zentraler State-Container)
├── workflowStep: WorkflowStep                    // Aktueller Schritt
├── projectInfo: ProjectInfo | null               // F1
├── entities: DxfEntityV2[]                       // F2 (geparst), F4 (bereinigt), F5 (klassifiziert)
├── parseStats: ParseStats | null                 // F2
├── parts: PartDefinition[]                       // F3
├── activePart: string | null                     // F3 (welches Teil gerade definiert wird)
├── cleanReports: Map<string, CleanReport>        // F4 (pro Teil)
├── activeClassification: ClassificationType      // F5 (aktive Kategorie fuer Toolbar)
└── fileName: string                              // F2 (Original-Dateiname)
```

- **Kein globaler State-Manager.** Alles in AppShell via useState/useReducer.
- **Kein URL-State.** Kein Router, keine searchParams.
- **Kein Server-State.** Keine DB, keine API-Aufrufe.
- **Kein localStorage im MVP.** Daten existieren nur waehrend der Sitzung.

### Datenfluss

- **Lesen:** File API -> Parser -> useState in AppShell -> Props an Child Components
- **Schreiben:** User-Interaktion in Child Component -> Callback-Prop -> State-Update in AppShell
- **Export:** Entities aus State -> Exporter -> Blob -> Download-Link

## Box-Selektion (neu in DxfEditor)

```
Ablauf:
1. PointerDown (Linksklick, kein Shift, kein Mittelklick)
   -> Startpunkt merken (Weltkoordinaten via clientToWorld)
2. PointerMove (waehrend Drag)
   -> Rechteck visuell anzeigen (SVG <rect>, halbtransparent)
   -> Richtung egal (links-rechts oder rechts-links)
3. PointerUp
   -> Endpunkt bestimmen
   -> Alle Entities deren Bounding-Box innerhalb des Rechtecks liegt -> dem aktiven Teil zuordnen
   -> Selektions-Rechteck entfernen

Visuelle Darstellung:
- Halbtransparentes Rechteck mit gestricheltem Rand
- Farbe abhaengig vom Modus:
  - Teile-Auswahl (F3): Neutral (z.B. Blau halbtransparent)
  - Klassifizierung (F5): Farbe der aktiven Klassifikation
```

## Ordnerstruktur

```
src/
├── app/
│   ├── page.tsx                    # Server Component, rendert AppShell
│   ├── layout.tsx                  # RootLayout, Metadata
│   ├── error.tsx                   # Error Boundary
│   ├── loading.tsx                 # Loading State
│   └── not-found.tsx               # 404
├── components/
│   ├── ui/                         # shadcn/ui (NICHT manuell editieren!)
│   ├── shared/                     # Eigene wiederverwendbare Components
│   │   ├── AppShell.tsx            # Zentraler Workflow-Container
│   │   ├── ProjectForm.tsx         # F1: Kunde/Projekt
│   │   ├── FileUpload.tsx          # F2: Datei-Upload
│   │   ├── ClassifyToolbar.tsx     # F5: Klassifizierungs-Buttons
│   │   ├── PartsList.tsx           # F3: Teile-Uebersicht
│   │   ├── CleanReport.tsx         # F4: Bereinigungs-Zusammenfassung
│   │   ├── ExportPanel.tsx         # F6: Export + Download
│   │   ├── ParseStats.tsx          # F2: Parse-Statistik
│   │   └── StepIndicator.tsx       # Workflow-Fortschritt
│   └── editor/                     # SVG-Editor (aus DXF-Kalkulator)
│       ├── DxfEditor.tsx           # Angepasst: Box-Selektion, Modi
│       └── EntityPath.tsx          # 1:1 kopiert
├── lib/
│   ├── dxf/                        # DXF-Logik (NEU)
│   │   ├── parser.ts               # DXF R12 Parser
│   │   ├── exporter.ts             # DXF R12 Exporter
│   │   ├── cleaner.ts              # Auto-Bereinigung
│   │   └── classifier.ts           # Auto-Vorklassifizierung
│   ├── editor/                     # Editor-Helper (aus DXF-Kalkulator)
│   │   ├── viewbox.ts
│   │   ├── zoom.ts
│   │   ├── pan.ts
│   │   ├── svg-coords.ts
│   │   ├── hit-test.ts
│   │   └── snap-tolerance.ts
│   └── utils.ts                    # cn() + allgemeine Helfer
├── hooks/                          # Custom React Hooks
│   └── use-editor-viewport.ts      # 1:1 kopiert
├── types/                          # TypeScript-Types
│   ├── dxf-v2.ts                   # DxfEntityV2, EntityCoordinates (erweitert)
│   ├── project.ts                  # ProjectInfo, PartDefinition
│   ├── classification.ts           # ClassificationType, LayerConfig, LAYER_CONFIGS
│   └── workflow.ts                 # WorkflowStep
└── styles/
    └── globals.css                 # Tailwind v4 (CSS-first)
```

> `src/components/ui/` ist reserviert fuer shadcn/ui (AGENTS.md Paragraph 6).
> Eigene Components in `src/components/shared/` oder `src/components/editor/`.

## Performance-Strategie

| Massnahme | Ziel | Referenz |
|-----------|------|----------|
| `React.memo` auf EntityPath | Kein Re-Render bei Zoom/Pan | DXF-Kalkulator |
| Transiente ViewBox-Ref | Kein React-Re-render waehrend Drag | DXF-Kalkulator |
| `vectorEffect="non-scaling-stroke"` | Strichstaerke unabhaengig vom Zoom | DXF-Kalkulator |
| Imperatives Wheel-Event `passive:false` | Verhindert Browser-Scroll | DXF-Kalkulator |
| Parser als pure Funktion | Kann in Web Worker ausgelagert werden (falls noetig) | Neu |
| Kein unnuetzer Re-Render | AppShell-State granular, Callbacks mit useCallback | Neu |

> Ziel: 5000 Entities fluessig (< 3s Parse, 60fps Zoom/Pan).

## Env-Variablen

Keine im MVP. Die App laeuft komplett client-seitig ohne externe Services.

Phase 2 (Supabase):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Entscheidungs-Log

| Entscheidung | Gewaehlt | Begruendung |
|-------------|---------|-----------|
| Single-Page Workflow | Eine Seite, Steps via Client-State | Kein Auth, kein Server-State, linearer Workflow |
| Eigener DXF-Parser | Selbst geschrieben | Volle Kontrolle ueber R12 ASCII, keine npm-Abhaengigkeit |
| State in AppShell | useState/useReducer | Simple-Komplexitaet, kein Zustand-Manager noetig |
| Kein localStorage | Daten nur in Session | MVP-Scope, kein Persistenz-Bedarf |
| Manuelle Validierung | Pflichtfeld-Pruefung ohne Zod | Zwei Felder, Zod waere Over-Engineering. Phase 2: Zod fuer komplexere Formulare |
| Header inline in AppShell | Kein separates Header.tsx | Header ist minimal (1 Zeile Projektinfo + StepIndicator), eigene Datei unnoetig |
| Box-Selektion | Rechteck aufziehen | Requirements F3, kein Lasso noetig |
| Client-only Architektur | Kein Server-State | Kein Auth, keine DB, alles im Browser |

> Ausfuehrliche ADRs in `docs/DECISIONS.md`.
