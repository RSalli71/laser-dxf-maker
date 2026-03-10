import { describe, expect, it } from "vitest";
import {
  doesEntityIntersectRect,
  expandSelectionToPartCluster,
} from "@/lib/editor/entity-selection";
import type { DxfEntityV2 } from "@/types/dxf-v2";

function makeEntity(
  overrides: Partial<DxfEntityV2> & { id: number; type: DxfEntityV2["type"] },
): DxfEntityV2 {
  return {
    layer: "0",
    color: 7,
    linetype: "CONTINUOUS",
    coordinates: {},
    length: 0,
    ...overrides,
  };
}

describe("entity selection helpers", () => {
  it("treats box selection as intersection instead of full containment", () => {
    const line = makeEntity({
      id: 1,
      type: "LINE",
      coordinates: { x1: 0, y1: 0, x2: 20, y2: 0 },
      length: 20,
    });

    expect(
      doesEntityIntersectRect(line, {
        startX: 10,
        startY: -5,
        endX: 15,
        endY: 5,
      }),
    ).toBe(true);
  });
});

describe("expandSelectionToPartCluster (deprecated)", () => {
  it("expands a selected contour to include connected edges and contained inner geometry", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 1,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 40, y2: 0 },
        length: 40,
      }),
      makeEntity({
        id: 2,
        type: "LINE",
        coordinates: { x1: 40, y1: 0, x2: 40, y2: 20 },
        length: 20,
      }),
      makeEntity({
        id: 3,
        type: "LINE",
        coordinates: { x1: 40, y1: 20, x2: 0, y2: 20 },
        length: 40,
      }),
      makeEntity({
        id: 4,
        type: "LINE",
        coordinates: { x1: 0, y1: 20, x2: 0, y2: 0 },
        length: 20,
      }),
      makeEntity({
        id: 5,
        type: "TEXT",
        coordinates: { x: 12, y: 12, text: "B10", height: 5 },
      }),
      makeEntity({
        id: 6,
        type: "CIRCLE",
        coordinates: { cx: 28, cy: 10, r: 3 },
        length: 18.85,
        closed: true,
      }),
      makeEntity({
        id: 7,
        type: "LINE",
        coordinates: { x1: 80, y1: 80, x2: 100, y2: 80 },
        length: 20,
      }),
    ];

    const expanded = expandSelectionToPartCluster(entities, [1], 0.5);

    expect(expanded).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("doesEntityIntersectRect — F3 Regressionstests", () => {
  it("selektiert nur intersectende Entities, keine automatische Erweiterung", () => {
    // Setup: Rahmen (4 Linien) + innenliegende Geometrie
    // Box-Selektion trifft nur 1 Rahmenlinie
    const entities: DxfEntityV2[] = [
      // Rahmen: 4 Linien bilden ein Rechteck 0,0 -> 100,80
      makeEntity({
        id: 1,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 0 },
        length: 100,
      }),
      makeEntity({
        id: 2,
        type: "LINE",
        coordinates: { x1: 100, y1: 0, x2: 100, y2: 80 },
        length: 80,
      }),
      makeEntity({
        id: 3,
        type: "LINE",
        coordinates: { x1: 100, y1: 80, x2: 0, y2: 80 },
        length: 100,
      }),
      makeEntity({
        id: 4,
        type: "LINE",
        coordinates: { x1: 0, y1: 80, x2: 0, y2: 0 },
        length: 80,
      }),
      // Innenliegende Geometrie
      makeEntity({
        id: 5,
        type: "CIRCLE",
        coordinates: { cx: 50, cy: 40, r: 10 },
        length: 62.83,
        closed: true,
      }),
    ];

    // Fenster trifft nur die untere Rahmenlinie (y um 0)
    const rect = { startX: 20, startY: -5, endX: 80, endY: 5 };

    const selected: number[] = [];
    for (const entity of entities) {
      if (doesEntityIntersectRect(entity, rect)) {
        selected.push(entity.id);
      }
    }

    // Erwartung: nur die untere Rahmenlinie, nicht der ganze Rahmen oder der Kreis
    expect(selected).toEqual([1]);
  });

  it("eine umschliessende grosse Kontur zieht nicht automatisch innenliegende Geometrie mit", () => {
    // Setup: grosser Rahmen + kleiner Kreis innen
    const entities: DxfEntityV2[] = [
      // Grosser Rahmen
      makeEntity({
        id: 1,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 200, y2: 0 },
        length: 200,
      }),
      makeEntity({
        id: 2,
        type: "LINE",
        coordinates: { x1: 200, y1: 0, x2: 200, y2: 150 },
        length: 150,
      }),
      makeEntity({
        id: 3,
        type: "LINE",
        coordinates: { x1: 200, y1: 150, x2: 0, y2: 150 },
        length: 200,
      }),
      makeEntity({
        id: 4,
        type: "LINE",
        coordinates: { x1: 0, y1: 150, x2: 0, y2: 0 },
        length: 150,
      }),
      // Kleiner Kreis innen
      makeEntity({
        id: 5,
        type: "CIRCLE",
        coordinates: { cx: 100, cy: 75, r: 5 },
        length: 31.42,
        closed: true,
      }),
    ];

    // Fenster trifft nur den oberen Teil des Rahmens (y: 140-160)
    const rect = { startX: -10, startY: 140, endX: 210, endY: 160 };

    const selected: number[] = [];
    for (const entity of entities) {
      if (doesEntityIntersectRect(entity, rect)) {
        selected.push(entity.id);
      }
    }

    // Erwartung: nur die Rahmenlinien die das Fenster schneiden, nicht den Kreis
    // Linie 2 (x=200, y=0..150) schneidet das Fenster bei y=140..150
    // Linie 3 (y=150) liegt im Fenster
    // Linie 4 (x=0, y=0..150) schneidet das Fenster bei y=140..150
    // Linie 1 (y=0) und Kreis (cy=75, r=5) liegen ausserhalb
    expect(selected).toEqual([2, 3, 4]);
    expect(selected).not.toContain(5); // Kreis darf nicht mitgezogen werden
  });
});
