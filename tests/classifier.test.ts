/**
 * Tests for src/lib/dxf/classifier.ts
 *
 * Covers acceptance criteria from REQUIREMENTS.md F5:
 * - TEXT -> ENGRAVE
 * - Closed contours -> CUT
 * - Short lines -> BEND
 * - Layer and color set correctly per LAYER_CONFIGS
 */

import { describe, it, expect } from "vitest";
import {
  classifyEntities,
  getClassificationStats,
  applyClassification,
} from "@/lib/dxf/classifier";
import type { DxfEntityV2 } from "@/types/dxf-v2";

// ---- Helpers -----------------------------------------------------------

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

// ---- Tests -------------------------------------------------------------

describe("classifyEntities", () => {
  // F5 AC: TEXT Entitaeten werden als ENGRAVE erkannt
  it("classifies TEXT entities as ENGRAVE", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "TEXT",
        coordinates: { x: 10, y: 20, text: "Part No. 123", height: 5 },
      }),
    ];

    const result = classifyEntities(entities);

    expect(result[0].classification).toBe("ENGRAVE");
    expect(result[0].layer).toBe("ENGRAVE");
    expect(result[0].color).toBe(1); // ACI 1 = Red
  });

  // F5 AC: Geschlossene Konturen werden CUT
  it("classifies closed contours as CUT", () => {
    const entities: DxfEntityV2[] = [
      // Large circle
      makeEntity({
        id: 0,
        type: "CIRCLE",
        coordinates: { cx: 0, cy: 0, r: 100 },
        length: 2 * Math.PI * 100,
        closed: true,
      }),
      // Small circle
      makeEntity({
        id: 1,
        type: "CIRCLE",
        coordinates: { cx: 0, cy: 0, r: 10 },
        length: 2 * Math.PI * 10,
        closed: true,
      }),
    ];

    const result = classifyEntities(entities);

    expect(result[0].classification).toBe("CUT");
    expect(result[1].classification).toBe("CUT");
  });

  // F5 AC: Alle geschlossenen Konturen werden CUT
  it("classifies all closed contours as CUT", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "CIRCLE",
        coordinates: { cx: 0, cy: 0, r: 200 },
        length: 2 * Math.PI * 200,
        closed: true,
      }),
      makeEntity({
        id: 1,
        type: "CIRCLE",
        coordinates: { cx: 10, cy: 10, r: 5 },
        length: 2 * Math.PI * 5,
        closed: true,
      }),
      makeEntity({
        id: 2,
        type: "LWPOLYLINE",
        coordinates: {
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
            { x: 50, y: 50 },
            { x: 0, y: 50 },
          ],
        },
        length: 200,
        closed: true,
      }),
    ];

    const result = classifyEntities(entities);

    expect(result[0].classification).toBe("CUT");
    expect(result[1].classification).toBe("CUT");
    expect(result[2].classification).toBe("CUT");
  });

  // F5 AC: Kurze gerade Linien werden BEND
  it("classifies short straight lines as BEND", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 30, y2: 0 },
        length: 30, // <= 50 -> BEND
      }),
    ];

    const result = classifyEntities(entities);

    expect(result[0].classification).toBe("BEND");
    expect(result[0].layer).toBe("BEND");
    expect(result[0].color).toBe(3); // ACI 3 = Green
  });

  // Long lines default to CUT
  it("classifies long lines as CUT (default)", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 200, y2: 0 },
        length: 200, // > 50 -> not BEND
      }),
    ];

    const result = classifyEntities(entities);

    expect(result[0].classification).toBe("CUT");
  });

  // F5 AC: Layer und Farbe werden korrekt gesetzt
  it("sets correct layer and ACI color for CUT", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "CIRCLE",
        coordinates: { cx: 0, cy: 0, r: 100 },
        length: 628,
        closed: true,
      }),
    ];

    const result = classifyEntities(entities);

    expect(result[0].layer).toBe("CUT");
    expect(result[0].color).toBe(7); // ACI 7 = White/Black
  });

  it("sets correct layer and ACI color for second closed contour (also CUT)", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "CIRCLE",
        coordinates: { cx: 0, cy: 0, r: 100 },
        length: 628,
        closed: true,
      }),
      makeEntity({
        id: 1,
        type: "CIRCLE",
        coordinates: { cx: 0, cy: 0, r: 10 },
        length: 62.8,
        closed: true,
      }),
    ];

    const result = classifyEntities(entities);

    expect(result[1].layer).toBe("CUT");
    expect(result[1].color).toBe(7); // ACI 7 = White/Black
  });

  // Does not mutate input
  it("does not mutate the input array", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "TEXT",
        coordinates: { x: 0, y: 0, text: "X", height: 5 },
      }),
    ];

    classifyEntities(entities);

    expect(entities[0].classification).toBeUndefined();
  });

  // Mixed scenario
  it("correctly classifies a mixed set of entities", () => {
    const entities: DxfEntityV2[] = [
      // Outer contour (largest)
      makeEntity({
        id: 0,
        type: "LWPOLYLINE",
        coordinates: {
          points: [
            { x: 0, y: 0 },
            { x: 500, y: 0 },
            { x: 500, y: 500 },
            { x: 0, y: 500 },
          ],
        },
        length: 2000,
        closed: true,
      }),
      // Inner hole
      makeEntity({
        id: 1,
        type: "CIRCLE",
        coordinates: { cx: 100, cy: 100, r: 10 },
        length: 62.83,
        closed: true,
      }),
      // Bend line
      makeEntity({
        id: 2,
        type: "LINE",
        coordinates: { x1: 0, y1: 250, x2: 40, y2: 250 },
        length: 40,
      }),
      // Text label
      makeEntity({
        id: 3,
        type: "TEXT",
        coordinates: { x: 200, y: 200, text: "Part A", height: 10 },
      }),
    ];

    const result = classifyEntities(entities);

    expect(result[0].classification).toBe("CUT");
    expect(result[1].classification).toBe("CUT");
    expect(result[2].classification).toBe("BEND");
    expect(result[3].classification).toBe("ENGRAVE");
  });
});

describe("getClassificationStats", () => {
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
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE" }),
    ];

    const stats = getClassificationStats(entities);

    expect(stats.CUT).toBe(0);
    expect(stats.BEND).toBe(0);
    expect(stats.ENGRAVE).toBe(0);
  });
});

describe("applyClassification", () => {
  it("applies classification to specified entity IDs", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 10, y2: 10 }, length: 14.14 }),
      makeEntity({ id: 1, type: "LINE", coordinates: { x1: 20, y1: 20, x2: 30, y2: 30 }, length: 14.14 }),
      makeEntity({ id: 2, type: "CIRCLE", coordinates: { cx: 5, cy: 5, r: 10 }, length: 62.83 }),
    ];

    const result = applyClassification(entities, new Set([0, 2]), "CUT");

    expect(result[0].classification).toBe("CUT");
    expect(result[0].layer).toBe("CUT");
    expect(result[0].color).toBe(7);
    expect(result[1].classification).toBeUndefined(); // unchanged
    expect(result[2].classification).toBe("CUT");
  });

  it("does not mutate the original array", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE", length: 10 }),
    ];

    const result = applyClassification(entities, new Set([0]), "BEND");

    expect(entities[0].classification).toBeUndefined();
    expect(result[0].classification).toBe("BEND");
  });
});
