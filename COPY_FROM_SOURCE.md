# COPY_FROM_SOURCE.md — Quelldateien übernehmen

> Diese Datei ist eine Anweisung für Claude Code.
> Lies sie bevor du mit dem Frontend Developer Agent startest.

---

## Quellprojekt

```
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src
```

---

## Anweisung für Claude Code

Diese Dateien NICHT neu schreiben — direkt aus dem Quellprojekt kopieren:

### Kern-Dateien (1:1 kopieren)

| Quelle | Ziel im neuen Projekt |
|---|---|
| `C:/.../DXF-Kalkulator/src/components/editor/EntityPath.tsx` | `src/components/editor/EntityPath.tsx` |
| `C:/.../DXF-Kalkulator/src/hooks/use-editor-viewport.ts` | `src/hooks/use-editor-viewport.ts` |
| `C:/.../DXF-Kalkulator/src/types/dxf-v2.ts` | `src/types/dxf-v2.ts` |

### Helper-Module (1:1 kopieren)

| Quelle | Ziel im neuen Projekt |
|---|---|
| `C:/.../DXF-Kalkulator/src/lib/editor/viewbox.ts` | `src/lib/editor/viewbox.ts` |
| `C:/.../DXF-Kalkulator/src/lib/editor/zoom.ts` | `src/lib/editor/zoom.ts` |
| `C:/.../DXF-Kalkulator/src/lib/editor/pan.ts` | `src/lib/editor/pan.ts` |
| `C:/.../DXF-Kalkulator/src/lib/editor/svg-coords.ts` | `src/lib/editor/svg-coords.ts` |
| `C:/.../DXF-Kalkulator/src/lib/editor/hit-test.ts` | `src/lib/editor/hit-test.ts` |
| `C:/.../DXF-Kalkulator/src/lib/editor/snap-tolerance.ts` | `src/lib/editor/snap-tolerance.ts` |

### Diese Datei ANPASSEN (nicht 1:1 kopieren)

| Quelle | Ziel | Was ändern? |
|---|---|---|
| `C:/.../DXF-Kalkulator/src/components/editor/DxfEditor.tsx` | `src/components/editor/DxfEditor.tsx` | Klassifizierungs-Buttons hinzufügen (CUT_OUTER, CUT_INNER, BEND, ENGRAVE) |

---

## Diese Dateien NEU erstellen

| Datei | Beschreibung |
|---|---|
| `src/lib/dxf/parser.ts` | DXF R12 ASCII Parser → `DxfEntityV2[]` |
| `src/lib/dxf/exporter.ts` | `DxfEntityV2[]` → DXF R12 ASCII String |
| `src/lib/dxf/cleaner.ts` | Duplikate, Nulllinien entfernen |
| `src/lib/dxf/classifier.ts` | Layer + Farbe nach Kategorie zuweisen |
| `src/components/ui/ClassifyToolbar.tsx` | 4 Buttons: Außenkontur / Innenkontur / Biegung / Gravur |
| `src/components/ui/ProjectForm.tsx` | Kunden & Projekt festlegen |

---

## Vollständige Quelldatei-Pfade

```
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src\components\editor\DxfEditor.tsx
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src\components\editor\EntityPath.tsx
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src\hooks\use-editor-viewport.ts
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src\types\dxf-v2.ts
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src\lib\editor\viewbox.ts
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src\lib\editor\zoom.ts
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src\lib\editor\pan.ts
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src\lib\editor\svg-coords.ts
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src\lib\editor\hit-test.ts
C:\Users\Rupert Salletmaier\WEB-Software\Software_Projekte\DXF-Kalkulator\src\lib\editor\snap-tolerance.ts
```
