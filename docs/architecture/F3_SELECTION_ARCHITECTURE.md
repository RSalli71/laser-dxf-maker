# F3 Selection Architecture — Redesign

> Technische Umsetzungsspezifikation fuer F3_SELECTION_REQUIREMENTS.md.
> Erstellt am 2026-03-10 durch Solution Architect.
> Ziel: Entfernung der automatischen Cluster-Expansion, Einfuehrung von Toggle-Abwahl.

## 1. Aenderungsuebersicht

### Geaenderte Dateien

| Datei | Art | Was sich aendert |
|-------|-----|------------------|
| `src/components/editor/DxfEditor.tsx` | Aenderung | Import von `expandSelectionToPartCluster` entfernen. handlePointerUp: Select-Modus verwendet direkte IDs statt Cluster-Expansion. Neues State-Management fuer additive/toggle Selektion. |
| `src/lib/editor/entity-selection.ts` | Aenderung | `expandSelectionToPartCluster()` wird NICHT geloescht, aber als `@deprecated` markiert. Kein neuer Code noetig. |
| `tests/entity-selection.test.ts` | Aenderung | Test "expands a selected contour..." wird in eigenen describe-Block "expandSelectionToPartCluster (deprecated)" verschoben. Neue Tests fuer direktes Selektionsverhalten. |
| `src/components/shared/AppShell.tsx` | Aenderung | Neuer Callback `handleEntityDeselected`. `handleEntityClicked` Select-Zweig entfernen. DxfEditor-Aufruf in F3: `onEntityDeselected` statt `onEntityClicked`, `key={activePart}` fuer Reset bei Part-Wechsel. |

### Unveraenderte Dateien

| Datei | Begruendung |
|-------|-------------|
| `src/components/editor/EntityPath.tsx` | Reines Rendering, keine Selektionslogik |
| `src/hooks/use-editor-viewport.ts` | Viewport-Logik, nicht betroffen |
| `src/lib/editor/hit-test.ts` | Hit-Testing bleibt identisch |
| `src/lib/editor/snap-tolerance.ts` | Toleranz-Berechnung bleibt identisch |
| `src/lib/editor/viewbox.ts`, `zoom.ts`, `pan.ts`, `svg-coords.ts` | Schichten 2-3, nicht betroffen |
| `src/types/dxf-v2.ts` | Keine Aenderung am Datenmodell |
| `src/types/project.ts` | PartDefinition bleibt identisch |

### Keine neuen Dateien

Das Redesign erfordert keine neuen Dateien. Alle Aenderungen finden in bestehenden Dateien statt.

---

## 2. DxfEditor.tsx — Konkrete Code-Aenderungen

### 2.1 Import-Aenderung

VORHER:
```typescript
import {
  doesEntityIntersectRect,
  expandSelectionToPartCluster,
} from "@/lib/editor/entity-selection";
```

NACHHER:
```typescript
import { doesEntityIntersectRect } from "@/lib/editor/entity-selection";
```

`expandSelectionToPartCluster` wird im Editor nicht mehr verwendet.

### 2.2 Neue Props

```typescript
interface DxfEditorProps {
  entities: DxfEntityV2[];
  mode: EditorMode;
  activeClassification?: ClassificationType | null;
  onEntitiesSelected?: (entityIds: number[]) => void;
  onEntityClicked?: (entityId: number) => void;
  /** Gerufen wenn eine einzelne Entity abgewaehlt wird (Toggle-Klick im Select-Modus) */
  onEntityDeselected?: (entityId: number) => void;
}
```

Einzige neue Prop: `onEntityDeselected`. Keine Prop `assignedEntityIds` noetig — Entities tragen bereits `partId`, und `EntityPath` nutzt `isAssigned={!!entity.partId}` fuer die visuelle Darstellung.

### 2.3 handlePointerUp — Select-Modus nach Umbau

#### Box-Selektion (war Zeile 262-289)

VORHER:
```typescript
if (selectedIds.length > 0) {
  const tolerance = Math.max(
    getSnapTolerance(viewBoxRef.current, containerSize.width), 0.5,
  );
  const nextSelectedIds =
    mode === "select"
      ? expandSelectionToPartCluster(entities, selectedIds, tolerance)
      : selectedIds;
  onEntitiesSelected?.(nextSelectedIds);
  setSelectedEntityIds(new Set(nextSelectedIds));
}
```

NACHHER:
```typescript
if (selectedIds.length > 0) {
  if (mode === "select") {
    // Additiv: neue IDs zur bestehenden lokalen Auswahl hinzufuegen
    setSelectedEntityIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.add(id);
      }
      return next;
    });
    onEntitiesSelected?.(selectedIds);
  } else {
    // Classify-Modus: unveraendert
    onEntitiesSelected?.(selectedIds);
    setSelectedEntityIds(new Set(selectedIds));
  }
}
```

Kernprinzip: Im Select-Modus wird die lokale `selectedEntityIds` additiv erweitert. Die gemeldeten IDs an `onEntitiesSelected` sind nur die NEUEN IDs aus dieser Aktion (nicht die Gesamtmenge). AppShell fuegt sie dem aktiven Part hinzu.

#### Einzelklick (war Zeile 292-319)

VORHER:
```typescript
if (hit) {
  if (mode === "select") {
    const nextSelectedIds = expandSelectionToPartCluster(
      entities, [hit.id], Math.max(tolerance, 0.5),
    );
    onEntitiesSelected?.(nextSelectedIds);
    setSelectedEntityIds(new Set(nextSelectedIds));
  } else {
    onEntityClicked?.(hit.id);
    setSelectedEntityIds(new Set([hit.id]));
  }
} else {
  setSelectedEntityIds(new Set());
}
```

NACHHER:
```typescript
if (hit) {
  if (mode === "select") {
    // Toggle: wenn bereits in lokaler Auswahl, abwaehlen
    const isCurrentlySelected = selectedEntityIds.has(hit.id);
    if (isCurrentlySelected) {
      setSelectedEntityIds((prev) => {
        const next = new Set(prev);
        next.delete(hit.id);
        return next;
      });
      onEntityDeselected?.(hit.id);
    } else {
      setSelectedEntityIds((prev) => new Set(prev).add(hit.id));
      onEntitiesSelected?.([hit.id]);
    }
  } else {
    // Classify-Modus: unveraendert
    onEntityClicked?.(hit.id);
    setSelectedEntityIds(new Set([hit.id]));
  }
} else {
  // Klick ins Leere: lokale Auswahl leeren (NICHT die Part-Zuordnung)
  setSelectedEntityIds(new Set());
}
```

### 2.4 Neuer Callback: onEntityDeselected

```typescript
interface DxfEditorProps {
  // ... bestehende Props ...
  /** Gerufen wenn eine einzelne Entity abgewaehlt wird (Toggle-Klick) */
  onEntityDeselected?: (entityId: number) => void;
}
```

Dieser Callback informiert AppShell, dass eine Entity aus der aktuellen Auswahl entfernt wurde. AppShell entscheidet dann, ob die Entity aus dem aktiven Part entfernt wird.

### 2.5 Classify-Modus: UNVERAENDERT

Der gesamte Classify-Modus (F5) bleibt exakt wie bisher. Dort wurde `expandSelectionToPartCluster()` nie aufgerufen (der ternary-Ausdruck waehlt im classify-Modus den `selectedIds`-Pfad). Damit ist sichergestellt, dass F5 nicht tangiert wird.

### 2.6 Klick ins Leere

Klick ins Leere (kein Hit) setzt nur die lokale visuelle Selektion zurueck (`selectedEntityIds = new Set()`). Die Part-Zuordnung in AppShell wird NICHT beeinflusst. Entities die bereits einem Part zugeordnet sind, behalten ihren `partId` und werden weiterhin als "assigned" dargestellt.

### 2.7 Reset bei Part-Wechsel

Wenn der Bediener in der PartsList den aktiven Part wechselt (z.B. von T1 auf T2), muss die lokale `selectedEntityIds` im Editor geleert werden. Sonst zeigt die visuelle Selektion noch Entities von T1, waehrend neue Klicks T2 zugeordnet wuerden.

Loesung: DxfEditor erhaelt `activePart` als Prop (oder einen `key`-Wechsel). Bei Aenderung wird `selectedEntityIds` zurueckgesetzt.

Einfachste Variante (empfohlen):
```tsx
// In AppShell — F3 DxfEditor Aufruf:
<DxfEditor
  key={activePart ?? "no-part"}
  entities={entities}
  mode="select"
  onEntitiesSelected={handleEntitiesSelected}
  onEntityDeselected={handleEntityDeselected}
/>
```

Der `key`-Wechsel erzwingt einen React-Remount, was `selectedEntityIds` automatisch auf `new Set()` zuruecksetzt. Bei typischen Zeichnungen (< 5000 Entities) ist der Remount-Overhead vernachlaessigbar.

### 2.8 Performance-Implikationen

- `selectedEntityIds` ist ein `Set<number>` — Lookup ist O(1), Toggle ist O(1)
- Die additive `setSelectedEntityIds((prev) => ...)` erzeugt ein neues Set-Objekt pro Aktion. Das ist akzeptabel, weil es maximal einmal pro User-Interaktion passiert (nicht pro Frame)
- `EntityPath` ist `React.memo` — nur Entities deren `isSelected`/`isDimmed` sich aendert, werden neu gerendert
- Der Wegfall von `expandSelectionToPartCluster()` verbessert die Performance: die BFS-Expansion ueber alle Entities (O(n^2) worst case) entfaellt

---

## 3. entity-selection.ts — Aenderungen

### 3.1 Bleiben unveraendert

- `getEntityBBox()` — wird weiterhin von `doesEntityIntersectRect()` genutzt
- `doesEntityIntersectRect()` — wird weiterhin in DxfEditor fuer Box-Selektion genutzt
- `getRectBounds()`, `boundsIntersect()` — interne Hilfsfunktionen fuer `doesEntityIntersectRect()`

### 3.2 expandSelectionToPartCluster(): Deprecation, nicht Loeschung

```typescript
/**
 * @deprecated Nicht mehr im Standard-F3-Pfad verwenden.
 * Behalten fuer moegliche spaetere Verwendung als optionaler Expertenmodus
 * (siehe F3_SELECTION_REQUIREMENTS.md, Abschnitt 9).
 */
export function expandSelectionToPartCluster(
  entities: DxfEntityV2[],
  seedIds: number[],
  tolerance: number,
): number[] {
  // ... bestehender Code bleibt ...
}
```

Begruendung:
- Die Funktion ist korrekt implementiert und getestet
- Die Requirements sehen eine optionale spaetere Wiederverwendung als Expertenmodus vor
- Loeschung wuerde unnoetige Git-History-Kosten verursachen
- Der Import wird aus DxfEditor.tsx entfernt — die Funktion wird also nicht mehr aufgerufen
- Tree-Shaking entfernt sie aus dem Production-Bundle wenn kein Import existiert

### 3.3 Interne Hilfsfunktionen

`mergeBounds()`, `boundsInside()`, `getBoundsGap()` werden nur von `expandSelectionToPartCluster()` genutzt. Sie bleiben ebenfalls mit der Deprecation-Markierung bestehen. Kein Handlungsbedarf.

### 3.4 Keine neuen Hilfsfunktionen noetig

Die Toggle-Logik (Add/Remove aus Set) ist trivial und gehoert in die Interaktionsschicht (DxfEditor), nicht in die Geometrie-Hilfsfunktionen.

---

## 4. AppShell.tsx — Aenderungen

### 4.1 Neuer Callback: handleEntityDeselected

```typescript
const handleEntityDeselected = useCallback(
  (entityId: number) => {
    if (!activePart) return;

    // Entity aus dem aktiven Part entfernen
    setParts((prev) =>
      prev.map((part) =>
        part.id === activePart
          ? { ...part, entityIds: part.entityIds.filter((id) => id !== entityId) }
          : part,
      ),
    );

    // partId von der Entity entfernen
    setEntities((prev) =>
      prev.map((e) =>
        e.id === entityId && e.partId === activePart
          ? { ...e, partId: undefined }
          : e,
      ),
    );
  },
  [activePart],
);
```

Wichtig: Abwahl entfernt die Entity nur aus dem AKTIVEN Part. Wenn die Entity einem anderen Part zugeordnet ist (`e.partId !== activePart`), passiert nichts.

### 4.2 handleEntitiesSelected: Bleibt fast identisch

Der bestehende `handleEntitiesSelected` fuegt bereits additiv Entities zum aktiven Part hinzu. Er muss nur sicherstellen, dass bereits zugeordnete Entities nicht doppelt hinzugefuegt werden. Das passiert bereits korrekt in `assignEntitiesToPart()` (Pruefung auf `part.entityIds.includes(id)` oder Set-basierte Deduplizierung).

Pruefpunkt fuer den Entwickler: Verifiziere in `src/lib/workflow/part-workflow.ts` dass `assignEntitiesToPart()` Duplikate verhindert. Falls nicht, muss das ergaenzt werden.

### 4.3 DxfEditor-Aufruf in F3

VORHER:
```tsx
<DxfEditor
  entities={entities}
  mode="select"
  onEntitiesSelected={handleEntitiesSelected}
  onEntityClicked={handleEntityClicked}
/>
```

NACHHER:
```tsx
<DxfEditor
  key={activePart ?? "no-part"}
  entities={entities}
  mode="select"
  onEntitiesSelected={handleEntitiesSelected}
  onEntityDeselected={handleEntityDeselected}
/>
```

Aenderungen:
- `key={activePart}` erzwingt Reset der lokalen Selektion bei Part-Wechsel (siehe 2.7)
- `onEntityClicked` wird im Select-Modus nicht mehr gebraucht — der Editor handhabt Einzelklicks intern als additive Selektion oder Toggle-Abwahl und meldet diese ueber `onEntitiesSelected` bzw. `onEntityDeselected`
- `onEntityDeselected` ist neu

### 4.4 handleEntityClicked vereinfachen

Der bestehende `handleEntityClicked` hat eine Verzweigung fuer `workflowStep === "select"` und `workflowStep === "classify"`. Der Select-Zweig kann entfernt werden, da der Editor im Select-Modus jetzt direkt `onEntitiesSelected` oder `onEntityDeselected` aufruft.

VORHER:
```typescript
const handleEntityClicked = useCallback(
  (entityId: number) => {
    if (workflowStep === "select") {
      handleEntitiesSelected([entityId]);
    } else if (workflowStep === "classify" && activeClassification) {
      // Classify ...
    }
  },
  [workflowStep, activeClassification, handleEntitiesSelected],
);
```

NACHHER:
```typescript
const handleEntityClicked = useCallback(
  (entityId: number) => {
    if (workflowStep === "classify" && activeClassification) {
      const config = getLayerConfig(activeClassification);
      setEntities((prev) =>
        prev.map((e) =>
          e.id === entityId
            ? {
                ...e,
                classification: activeClassification,
                layer: config?.layerName ?? e.layer,
                color: config?.aciNumber ?? e.color,
              }
            : e,
        ),
      );
    }
  },
  [workflowStep, activeClassification],
);
```

---

## 5. Abwahl-Mechanik (Detail-Design)

### 5.1 UX-Entscheidung: Toggle via erneuten Klick

**Gewaehlt: Toggle.** Ein Klick auf eine bereits selektierte Entity waehlt sie ab.

Begruendung:
- Einfachster und intuitivster Mechanismus
- Kein Modifier-Wissen (Ctrl) noetig fuer den Bediener
- Konsistent mit dem additiven Klick-Modell (Klick = hinzufuegen, nochmal Klick = entfernen)
- Kein Risiko dass Ctrl+Klick auf verschiedenen Betriebssystemen unterschiedlich wirkt

Abgelehnt:
- Ctrl+Klick: Erfordert Modifier-Wissen, nicht intuitiv fuer Laserschneid-Bediener
- Dedizierter Abwahl-Button: Zusaetzliche UI-Komplexitaet, nicht noetig
- Rechtsklick-Kontextmenu: Over-Engineering fuer diesen Use Case

### 5.2 Interaktionsmatrix

| Aktion | Entity-Status | Ergebnis |
|--------|--------------|----------|
| Klick auf unselektierte Entity | Nicht in Auswahl | Entity wird zur lokalen Auswahl hinzugefuegt + an AppShell gemeldet |
| Klick auf selektierte Entity | In lokaler Auswahl | Entity wird aus lokaler Auswahl entfernt + Abwahl an AppShell gemeldet |
| Klick auf bereits zugeordnete Entity (anderer Part) | partId gesetzt, nicht in lokaler Auswahl | Entity wird zur lokalen Auswahl hinzugefuegt + an AppShell gemeldet (AppShell entscheidet ob Re-Assignment) |
| Box-Selektion | Gemischt | Alle intersectenden Entities werden additiv hinzugefuegt (kein Toggle bei Box) |
| Klick ins Leere | - | Lokale Auswahl wird geleert, Part-Zuordnung bleibt |

### 5.3 Warum kein Toggle bei Box-Selektion

Box-Selektion ist immer additiv. Begruendung:
- Ein Fenster ueber einer Mischung aus selektierten und unselektierten Entities wuerde bei Toggle zu unvorhersagbarem Verhalten fuehren
- Der primaere Use Case fuer Box-Selektion ist "weitere Geometrie hinzufuegen"
- Abwahl einzelner Entities nach einer zu grossen Box-Selektion geht per Einzelklick-Toggle

### 5.4 Abwahl und Part-Zuordnung

Ablauf bei Toggle-Abwahl:

```
1. Bediener klickt auf Entity E42 (bereits selektiert)
2. DxfEditor: selectedEntityIds.delete(42)
3. DxfEditor: onEntityDeselected(42)
4. AppShell.handleEntityDeselected(42):
   a. Findet aktiven Part (z.B. "T1")
   b. Entfernt 42 aus T1.entityIds
   c. Setzt entities[42].partId = undefined
5. EntityPath fuer E42 re-rendert: isSelected=false, isAssigned=false
```

### 5.5 Edge Case: Abwahl von Entities die zu einem anderen Part gehoeren

Wenn eine Entity zu Part T2 gehoert, der Bediener aber T1 aktiv hat:
- Die Entity ist im Editor als "assigned" sichtbar (visuell markiert)
- Ein Klick auf diese Entity fuegt sie zur lokalen Auswahl hinzu und meldet `onEntitiesSelected`
- AppShell ordnet sie dem aktiven Part T1 zu (Re-Assignment)
- Das bedeutet: die Entity wechselt von T2 zu T1

Das ist bestehendes Verhalten und aendert sich nicht. Die Abwahl-Logik greift nur fuer Entities die dem AKTIVEN Part zugeordnet sind.

### 5.6 State-Lifecycle der lokalen Selektion

```
selectedEntityIds (im Editor)
  = Visuelle Hervorhebung der aktuell markierten Entities
  ≠ Part-Zuordnung (in AppShell)

Szenario:
1. Bediener klickt Entity 1, 2, 3  -> selectedEntityIds = {1,2,3}
2. AppShell ordnet 1,2,3 dem Part T1 zu
3. Bediener klickt Entity 3 erneut -> selectedEntityIds = {1,2}
4. AppShell entfernt 3 aus T1
5. Bediener klickt ins Leere       -> selectedEntityIds = {}
6. Part T1 hat weiterhin entityIds = [1,2]
```

---

## 6. Implementierungsreihenfolge

### Phase 1: Editor-Umbau (1 Commit)

1. **DxfEditor.tsx**: Import von `expandSelectionToPartCluster` entfernen
2. **DxfEditor.tsx**: `onEntityDeselected` Prop hinzufuegen
3. **DxfEditor.tsx**: handlePointerUp im Select-Modus umbauen:
   - Box-Selektion: additiv statt replace
   - Einzelklick: Toggle-Logik (add oder remove)
   - Klick ins Leere: nur lokale Auswahl leeren
4. **Self-Check**: `npm run typecheck` muss durchlaufen

### Phase 2: AppShell-Anpassung (1 Commit)

1. **AppShell.tsx**: `handleEntityDeselected` Callback implementieren
2. **AppShell.tsx**: `handleEntityClicked` Select-Zweig entfernen
3. **AppShell.tsx**: DxfEditor-Aufruf in F3 anpassen (`key={activePart}`, `onEntityDeselected`, `onEntityClicked` entfernen)
4. **Self-Check**: `npm run typecheck` + manuelle Pruefung im Browser

### Phase 3: Deprecation + Tests (1 Commit)

1. **entity-selection.ts**: JSDoc `@deprecated` auf `expandSelectionToPartCluster` setzen
2. **entity-selection.test.ts**: Bestehenden Expansion-Test in deprecated-Block verschieben
3. **entity-selection.test.ts**: Neue Tests schreiben (siehe Abschnitt 7)
4. **Self-Check**: `npm run test`

### Abhaengigkeiten

- Phase 1 und Phase 2 sind voneinander abhaengig (neue Props muessen auf beiden Seiten existieren). Empfehlung: zusammen in einem Commit oder Phase 1 zuerst mit temporaer optionalen Props
- Phase 3 ist unabhaengig und kann parallel oder danach erfolgen

---

## 7. Test-Strategie

### 7.1 Bestehende Tests — Anpassung

| Test | Datei | Aenderung |
|------|-------|-----------|
| "treats box selection as intersection instead of full containment" | entity-selection.test.ts | BLEIBT UNVERAENDERT — testet `doesEntityIntersectRect`, das weiterhin genutzt wird |
| "expands a selected contour to include connected edges and contained inner geometry" | entity-selection.test.ts | In `describe("expandSelectionToPartCluster (deprecated)")` verschieben. Test bleibt bestehen als Absicherung der deprecated Funktion |

### 7.2 Neue Tests

#### In entity-selection.test.ts

```typescript
describe("doesEntityIntersectRect — F3 Regressionstests", () => {
  it("selektiert nur intersectende Entities, keine automatische Erweiterung", () => {
    // Setup: Rahmen (4 Linien) + innenliegende Geometrie
    // Box-Selektion trifft nur 1 Rahmenlinie
    // Erwartung: nur die getroffene Linie, nicht der ganze Rahmen
  });

  it("eine umschliessende grosse Kontur zieht nicht automatisch innenliegende Geometrie mit", () => {
    // Setup: grosser Rahmen + kleiner Kreis innen
    // Fenster trifft nur den Rahmen
    // Erwartung: nur Rahmenlinien, nicht den Kreis
  });
});
```

#### Neuer Test-Block fuer DxfEditor-Verhalten (Unit oder Integration)

Da DxfEditor eine React-Komponente ist, erfordern echte Interaktionstests entweder:
- **Extraktion der Logik** in eine pure Funktion (empfohlen), oder
- **React Testing Library** (RTL) Tests

Empfehlung fuer den Entwickler: Die Toggle-Logik und das additive Set-Management sind einfach genug um direkt in DxfEditor zu bleiben. Tests erfolgen ueber manuelle Browser-Tests + die Regressionstests in entity-selection.test.ts.

### 7.3 Requirement-zu-Test-Mapping

| Requirement (Abschnitt) | Test |
|--------------------------|------|
| 4.2 "Einzelklick waehlt nur getroffene Entity" | Kein expandSelection-Aufruf im Select-Modus (Code-Review) |
| 4.3 "Fenster waehlt nur intersectende Entities" | doesEntityIntersectRect-Test (besteht bereits) |
| 4.4 "Additiv + Abwahl" | Manueller Browser-Test (Toggle-Klick) |
| 5.1 "Keine automatische Cluster-Erweiterung" | Neuer Regressionstest: Rahmenlinie-Klick waehlt nicht den ganzen Rahmen |
| 5.3 "Kein BBox-Containment" | Neuer Regressionstest: Rahmen-Selektion zieht nicht innenliegende Geometrie mit |
| 5.7 "Keine nachgelagerte globale Erweiterung" | Code-Review: kein expandSelection-Import in DxfEditor |

### 7.4 Regressionstests fuer Negativkriterien

Fuer jedes der 8 Negativkriterien aus Requirements Abschnitt 5 gilt:

Die Negativkriterien 1-4 und 6-8 sind architektonisch durch die Entfernung des `expandSelectionToPartCluster`-Aufrufs abgedeckt. Negativkriterium 5 (keine automatische Gravur-Zuordnung) war ohnehin nie in F3 implementiert.

Der primaere Regressionsschutz ist architektonisch: Der Import von `expandSelectionToPartCluster` wird aus DxfEditor.tsx entfernt. Das wird ueber Code-Review und TypeScript-Compilation abgesichert (fehlender Import = Compile-Fehler wenn versehentlich wieder aufgerufen). Ein separater Dateiinhalt-Lesetest waere fragil und nicht wartbar.

---

## 8. Risiken und offene Entscheidungen

### 8.1 Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|-----------|
| Bediener vermisst die automatische Expansion | Mittel | Mittel | Requirement 9 sieht optionalen Expertenmodus vor. Funktion bleibt erhalten |
| Toggle-Klick wird als versehentlich empfunden | Niedrig | Niedrig | Klick ins Leere hebt nur lokale Auswahl auf, Part-Zuordnung bleibt |
| Re-Assignment zwischen Parts bei Klick auf bereits zugeordnete Entity | Niedrig | Mittel | Bestehendes Verhalten, aendert sich nicht. Dokumentation im UI (z.B. Tooltip) waere hilfreich |
| selectedEntityIds und Part-Zuordnung laufen auseinander | Niedrig | Hoch | Klare Trennung: Editor hat lokale Auswahl, AppShell hat Part-State. Kein bidirektionales Sync noetig |

### 8.2 Offene Entscheidungen fuer den Entwickler

| Entscheidung | Optionen | Empfehlung |
|-------------|----------|------------|
| Soll Klick ins Leere die lokale Auswahl leeren oder beibehalten? | A) Leeren (aktuelles Verhalten) B) Beibehalten | A) Leeren — konsistent mit dem bestehenden Verhalten und gibt dem Bediener eine schnelle "Reset"-Moeglichkeit |
| Soll bei Box-Selektion die lokale Auswahl vorher geleert werden? | A) Additiv (neue IDs hinzufuegen) B) Replace (nur neue IDs) | A) Additiv — konsistent mit Requirements "Mehrere Fensteraktionen erweitern die bestehende Auswahl" |
| Visuelles Feedback bei Toggle-Abwahl | A) Sofortige Deselektions-Animation B) Kein spezielles Feedback | B) Kein spezielles Feedback — die Entity verliert einfach ihren Selected-Stil. Animation waere Over-Engineering |
| assignEntitiesToPart Duplikat-Check | Existiert der Check? Falls nein: hinzufuegen | Entwickler muss `part-workflow.ts` pruefen |

### 8.3 Nicht-Risiken

- **F5 (Classify-Modus):** Nicht betroffen, da `expandSelectionToPartCluster` dort nie aufgerufen wurde
- **F4 (Clean):** Nicht betroffen, da F4 keine Selektionslogik hat
- **Performance:** Verbessert sich, da die O(n^2) Cluster-Expansion entfaellt
- **EntityPath Re-Renders:** Durch React.memo auf einzelne Entities beschraenkt
