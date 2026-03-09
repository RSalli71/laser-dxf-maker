/**
 * Tests for src/lib/dxf/cleaner.ts
 *
 * Covers acceptance criteria from REQUIREMENTS.md F4:
 * - DIMENSION entities removed
 * - Dashed circles/arcs removed (thread helpers)
 * - Full circles with CONTINUOUS kept
 * - Duplicates removed
 * - Zero-length lines removed
 * - CleanReport has correct numbers
 */

import { describe, it, expect } from "vitest";
import { cleanEntities } from "@/lib/dxf/cleaner";
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

describe("cleanEntities", () => {
  // F4 AC: DIMENSION Entities werden automatisch entfernt
  it("removes DIMENSION entities", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 10, y2: 10 }, length: 14.14 }),
      makeEntity({ id: 1, type: "DIMENSION" }),
      makeEntity({ id: 2, type: "DIMENSION" }),
      makeEntity({ id: 3, type: "CIRCLE", coordinates: { cx: 5, cy: 5, r: 10 }, length: 62.83 }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(2);
    expect(cleaned.every((e) => e.type !== "DIMENSION")).toBe(true);
    expect(report.removedDimensions).toBe(2);
  });

  // F4 AC: Kreise/Boegen mit LINETYPE DASHED oder HIDDEN werden entfernt
  it("removes dashed circles (thread helpers)", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "CIRCLE",
        linetype: "DASHED",
        coordinates: { cx: 5, cy: 5, r: 3 },
        length: 18.85,
      }),
      makeEntity({
        id: 1,
        type: "CIRCLE",
        linetype: "CONTINUOUS",
        coordinates: { cx: 5, cy: 5, r: 5 },
        length: 31.42,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].linetype).toBe("CONTINUOUS");
    expect(report.removedThreadHelpers).toBe(1);
  });

  it("removes HIDDEN arcs (thread helpers)", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "ARC",
        linetype: "HIDDEN",
        coordinates: { cx: 0, cy: 0, r: 10, startAngle: 0, endAngle: 270 },
        length: 47.12,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(0);
    expect(report.removedThreadHelpers).toBe(1);
  });

  // F4 AC: Volle Kreise mit LINETYPE CONTINUOUS bleiben erhalten
  it("keeps full circles with CONTINUOUS linetype", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "CIRCLE",
        linetype: "CONTINUOUS",
        coordinates: { cx: 10, cy: 10, r: 20 },
        length: 125.66,
        closed: true,
      }),
    ];

    const { cleaned } = cleanEntities(entities);

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].type).toBe("CIRCLE");
  });

  // F4 AC: Dashed LINEs are NOT thread helpers (only circles/arcs)
  it("keeps dashed lines (not circles/arcs)", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        linetype: "DASHED",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 0 },
        length: 100,
      }),
    ];

    const { cleaned } = cleanEntities(entities);

    expect(cleaned).toHaveLength(1);
  });

  // F4 AC: Duplikate werden erkannt und entfernt
  it("removes geometrically identical duplicates", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 100 },
        length: 141.42,
      }),
      makeEntity({
        id: 1,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 100 },
        length: 141.42,
      }),
      makeEntity({
        id: 2,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 100.005, y2: 100.005 },
        length: 141.42,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    // The third LINE is within tolerance of the first, so 2 duplicates removed
    expect(cleaned).toHaveLength(1);
    expect(report.removedDuplicates).toBe(2);
  });

  it("keeps entities with different coordinates (not duplicates)", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 0 },
        length: 100,
      }),
      makeEntity({
        id: 1,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 0, y2: 100 },
        length: 100,
      }),
    ];

    const { cleaned } = cleanEntities(entities);

    expect(cleaned).toHaveLength(2);
  });

  // F4 AC: Nulllinien werden entfernt
  it("removes zero-length lines (start === end)", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        coordinates: { x1: 50, y1: 50, x2: 50, y2: 50 },
        length: 0,
      }),
      makeEntity({
        id: 1,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 100 },
        length: 141.42,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe(1);
    expect(report.removedZeroLines).toBe(1);
  });

  it("removes near-zero-length lines within tolerance", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        coordinates: { x1: 50, y1: 50, x2: 50.005, y2: 50.005 },
        length: 0.007,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(0);
    expect(report.removedZeroLines).toBe(1);
  });

  // F4 AC: CleanReport enthaelt korrekte Zahlen
  it("produces a correct CleanReport with all counts", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "DIMENSION" }),
      makeEntity({
        id: 1,
        type: "CIRCLE",
        linetype: "DASHED",
        coordinates: { cx: 0, cy: 0, r: 5 },
        length: 31.42,
      }),
      makeEntity({
        id: 2,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 10, y2: 10 },
        length: 14.14,
      }),
      makeEntity({
        id: 3,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 10, y2: 10 },
        length: 14.14,
      }),
      makeEntity({
        id: 4,
        type: "LINE",
        coordinates: { x1: 5, y1: 5, x2: 5, y2: 5 },
        length: 0,
      }),
      makeEntity({
        id: 5,
        type: "CIRCLE",
        linetype: "CONTINUOUS",
        coordinates: { cx: 50, cy: 50, r: 20 },
        length: 125.66,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(report.removedDimensions).toBe(1);
    expect(report.removedThreadHelpers).toBe(1);
    expect(report.removedDuplicates).toBe(1);
    expect(report.removedZeroLines).toBe(1);
    expect(report.totalRemoved).toBe(4);
    expect(cleaned).toHaveLength(2); // LINE + CONTINUOUS CIRCLE
  });

  // F4 AC: Leere Layer werden erkannt
  it("reports removed empty layers", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "DIMENSION",
        layer: "Dimensions",
      }),
      makeEntity({
        id: 1,
        type: "LINE",
        layer: "Cutting",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 0 },
        length: 100,
      }),
    ];

    const { report } = cleanEntities(entities);

    expect(report.removedEmptyLayers).toContain("Dimensions");
    expect(report.removedEmptyLayers).not.toContain("Cutting");
  });

  // Edge case: empty input
  it("handles empty entity array", () => {
    const { cleaned, report } = cleanEntities([]);

    expect(cleaned).toHaveLength(0);
    expect(report.totalRemoved).toBe(0);
  });
});
