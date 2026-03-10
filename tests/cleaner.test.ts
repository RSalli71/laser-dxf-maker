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

  // F4 AC: LINEs with non-CONTINUOUS linetype are helper lines (removed)
  it("removes dashed/center/hidden lines as helper geometry", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        linetype: "DASHED",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 0 },
        length: 100,
      }),
      makeEntity({
        id: 1,
        type: "LINE",
        linetype: "CENTER",
        coordinates: { x1: 0, y1: 50, x2: 100, y2: 50 },
        length: 100,
      }),
      makeEntity({
        id: 2,
        type: "LINE",
        linetype: "HIDDEN",
        coordinates: { x1: 0, y1: 100, x2: 100, y2: 100 },
        length: 100,
      }),
      makeEntity({
        id: 3,
        type: "LINE",
        linetype: "CONTINUOUS",
        coordinates: { x1: 0, y1: 150, x2: 100, y2: 150 },
        length: 100,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe(3);
    expect(report.removedThreadHelpers).toBe(3);
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

  // ---- Rule 0: Helper block detection -----------------------------------

  it("removes entities from SW_CENTERMARKSYMBOL blocks", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        sourceBlock: "SW_CENTERMARKSYMBOL_0",
        coordinates: { x1: 0, y1: 0, x2: 2.5, y2: 0 },
        length: 2.5,
      }),
      makeEntity({
        id: 1,
        type: "LINE",
        sourceBlock: "SW_CENTERMARKSYMBOL_0",
        coordinates: { x1: 0, y1: 0, x2: 0, y2: 2.5 },
        length: 2.5,
      }),
      makeEntity({
        id: 2,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 0 },
        length: 100,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe(2);
    expect(report.removedHelperBlocks).toBe(2);
  });

  it("removes entities from various helper block types", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE", sourceBlock: "SW_SFSYMBOL_0", length: 5, coordinates: { x1: 0, y1: 0, x2: 5, y2: 0 } }),
      makeEntity({ id: 1, type: "LINE", sourceBlock: "SW_NOTE_0_99", length: 5, coordinates: { x1: 0, y1: 0, x2: 0, y2: 5 } }),
      makeEntity({ id: 2, type: "LINE", sourceBlock: "Schriftkopf", length: 50, coordinates: { x1: 0, y1: 0, x2: 50, y2: 0 } }),
      makeEntity({ id: 3, type: "LINE", sourceBlock: "SW_CENTERLINE_1", length: 10, coordinates: { x1: 0, y1: 0, x2: 10, y2: 0 } }),
      makeEntity({ id: 4, type: "CIRCLE", coordinates: { cx: 50, cy: 50, r: 10 }, length: 62.83 }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe(4);
    expect(report.removedHelperBlocks).toBe(4);
  });

  it("keeps entities from non-helper blocks", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        sourceBlock: "Block1",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 0 },
        length: 100,
      }),
      makeEntity({
        id: 1,
        type: "CIRCLE",
        sourceBlock: "CUSTOM_PART",
        coordinates: { cx: 50, cy: 50, r: 10 },
        length: 62.83,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(2);
    expect(report.removedHelperBlocks).toBe(0);
  });

  // ---- Rule 3: Cross-pattern detection ----------------------------------

  it("removes cross-pattern of short lines from a common point", () => {
    // 4 short lines forming a cross at origin (typical center mark)
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 5, y2: 0 }, length: 5 }),
      makeEntity({ id: 1, type: "LINE", coordinates: { x1: 0, y1: 0, x2: -5, y2: 0 }, length: 5 }),
      makeEntity({ id: 2, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 0, y2: 5 }, length: 5 }),
      makeEntity({ id: 3, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 0, y2: -5 }, length: 5 }),
      // This long line should survive
      makeEntity({ id: 4, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 200, y2: 0 }, length: 200 }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe(4);
    expect(report.removedCrossPatterns).toBe(4);
  });

  it("keeps short lines that share an endpoint but don't form a pattern", () => {
    // 2 short lines from the same point, both going right/up -- not a cross
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 5, y2: 0 }, length: 5 }),
      makeEntity({ id: 1, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 5, y2: 5 }, length: 7.07 }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(2);
    expect(report.removedCrossPatterns).toBe(0);
  });

  it("removes 2-line cross (H+V through same midpoint)", () => {
    // Two full lines crossing at their midpoint (10,10)
    const entities: DxfEntityV2[] = [
      // Horizontal line through (10,10)
      makeEntity({ id: 0, type: "LINE", coordinates: { x1: 5, y1: 10, x2: 15, y2: 10 }, length: 10 }),
      // Vertical line through (10,10)
      makeEntity({ id: 1, type: "LINE", coordinates: { x1: 10, y1: 5, x2: 10, y2: 15 }, length: 10 }),
      // Real geometry (long line, survives)
      makeEntity({ id: 2, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 200, y2: 0 }, length: 200 }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe(2);
    expect(report.removedCrossPatterns).toBe(2);
  });

  it("keeps 2 short lines with same midpoint if both are horizontal", () => {
    // Two horizontal lines, same midpoint -- not a cross pattern
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE", coordinates: { x1: 5, y1: 10, x2: 15, y2: 10 }, length: 10 }),
      makeEntity({ id: 1, type: "LINE", coordinates: { x1: 7, y1: 10, x2: 13, y2: 10 }, length: 6 }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(2);
    expect(report.removedCrossPatterns).toBe(0);
  });

  it("does not remove circles or arcs as cross-patterns", () => {
    // Short lines + a circle at the same point: circle must survive
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 5, y2: 0 }, length: 5 }),
      makeEntity({ id: 1, type: "LINE", coordinates: { x1: 0, y1: 0, x2: -5, y2: 0 }, length: 5 }),
      makeEntity({ id: 2, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 0, y2: 5 }, length: 5 }),
      makeEntity({ id: 3, type: "CIRCLE", coordinates: { cx: 0, cy: 0, r: 3 }, length: 18.85 }),
    ];

    const { cleaned } = cleanEntities(entities);

    expect(cleaned.some((e) => e.type === "CIRCLE")).toBe(true);
  });

  // ---- Rule 3: Thread ARC detection -------------------------------------

  it("removes thread indicator ARCs concentric with a smaller CIRCLE", () => {
    const entities: DxfEntityV2[] = [
      // The bore hole (CIRCLE, smaller radius) -- must survive
      makeEntity({
        id: 0,
        type: "CIRCLE",
        coordinates: { cx: 50, cy: 50, r: 3 },
        length: 18.85,
      }),
      // Thread indicator ARC (larger radius, near-full span 75°-345° = 270°)
      makeEntity({
        id: 1,
        type: "ARC",
        coordinates: { cx: 50, cy: 50, r: 4.5, startAngle: 75, endAngle: 345 },
        length: 21.2,
      }),
      // Regular ARC that should survive (small span, not a thread indicator)
      makeEntity({
        id: 2,
        type: "ARC",
        coordinates: { cx: 50, cy: 50, r: 10, startAngle: 0, endAngle: 90 },
        length: 15.71,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(2);
    expect(cleaned.map((e) => e.id).sort()).toEqual([0, 2]);
    expect(report.removedThreadArcs).toBe(1);
  });

  it("keeps near-full-circle ARCs when no concentric CIRCLE exists", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "ARC",
        coordinates: { cx: 50, cy: 50, r: 4.5, startAngle: 75, endAngle: 345 },
        length: 21.2,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(1);
    expect(report.removedThreadArcs).toBe(0);
  });

  it("removes multiple thread ARCs at different positions", () => {
    const entities: DxfEntityV2[] = [
      // Thread 1: bore + thread arc
      makeEntity({ id: 0, type: "CIRCLE", coordinates: { cx: 10, cy: 10, r: 2.5 }, length: 15.71 }),
      makeEntity({ id: 1, type: "ARC", coordinates: { cx: 10, cy: 10, r: 3.5, startAngle: 75, endAngle: 345 }, length: 18.85 }),
      // Thread 2: bore + thread arc
      makeEntity({ id: 2, type: "CIRCLE", coordinates: { cx: 80, cy: 80, r: 4 }, length: 25.13 }),
      makeEntity({ id: 3, type: "ARC", coordinates: { cx: 80, cy: 80, r: 5.5, startAngle: 60, endAngle: 350 }, length: 27.93 }),
      // Regular geometry
      makeEntity({ id: 4, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 100, y2: 0 }, length: 100 }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(3);
    expect(cleaned.map((e) => e.id).sort()).toEqual([0, 2, 4]);
    expect(report.removedThreadArcs).toBe(2);
  });

  // ---- Rule 3b: Thread SPLINE detection ----------------------------------

  it("removes open SPLINEs near a CIRCLE center (thread indicator)", () => {
    const entities: DxfEntityV2[] = [
      // Bore hole
      makeEntity({
        id: 0,
        type: "CIRCLE",
        coordinates: { cx: 50, cy: 50, r: 3 },
        length: 18.85,
      }),
      // Open SPLINE centered on the bore (thread indicator)
      makeEntity({
        id: 1,
        type: "SPLINE",
        closed: false,
        coordinates: { points: [{ x: 48, y: 48 }, { x: 52, y: 48 }, { x: 52, y: 52 }, { x: 48, y: 52 }] },
        length: 12.0,
      }),
      // Regular LINE (should survive)
      makeEntity({
        id: 2,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 100, y2: 0 },
        length: 100,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(2);
    expect(cleaned.map((e) => e.id).sort()).toEqual([0, 2]);
    expect(report.removedThreadSplines).toBe(1);
  });

  it("keeps open SPLINEs far from any CIRCLE (potential engrave)", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "CIRCLE",
        coordinates: { cx: 50, cy: 50, r: 3 },
        length: 18.85,
      }),
      // Open SPLINE far from any circle -- engrave geometry, keep it
      makeEntity({
        id: 1,
        type: "SPLINE",
        closed: false,
        coordinates: { points: [{ x: 200, y: 200 }, { x: 210, y: 200 }, { x: 210, y: 210 }] },
        length: 14.0,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(2);
    expect(report.removedThreadSplines).toBe(0);
  });

  it("keeps closed SPLINEs even near bore holes", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "CIRCLE",
        coordinates: { cx: 50, cy: 50, r: 3 },
        length: 18.85,
      }),
      makeEntity({
        id: 1,
        type: "SPLINE",
        closed: true,
        coordinates: { points: [{ x: 48, y: 48 }, { x: 52, y: 48 }, { x: 52, y: 52 }, { x: 48, y: 52 }] },
        length: 16.0,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(2);
    expect(report.removedThreadSplines).toBe(0);
  });

  it("removes multiple thread SPLINEs around the same bore", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "CIRCLE",
        coordinates: { cx: 50, cy: 50, r: 3 },
        length: 18.85,
      }),
      // Thread SPLINE 1 (outer)
      makeEntity({
        id: 1,
        type: "SPLINE",
        closed: false,
        coordinates: { points: [{ x: 47, y: 47 }, { x: 53, y: 47 }, { x: 53, y: 53 }, { x: 47, y: 53 }] },
        length: 16.0,
      }),
      // Thread SPLINE 2 (inner)
      makeEntity({
        id: 2,
        type: "SPLINE",
        closed: false,
        coordinates: { points: [{ x: 49, y: 49 }, { x: 51, y: 49 }, { x: 51, y: 51 }, { x: 49, y: 51 }] },
        length: 8.0,
      }),
      // Engrave SPLINE far away -- keep
      makeEntity({
        id: 3,
        type: "SPLINE",
        closed: false,
        coordinates: { points: [{ x: 200, y: 200 }, { x: 210, y: 210 }] },
        length: 14.0,
      }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(cleaned).toHaveLength(2);
    expect(cleaned.map((e) => e.id).sort()).toEqual([0, 3]);
    expect(report.removedThreadSplines).toBe(2);
  });

  // ---- Combined priority test -------------------------------------------

  it("applies all rules in priority order", () => {
    const entities: DxfEntityV2[] = [
      // Rule 0: helper block
      makeEntity({ id: 0, type: "LINE", sourceBlock: "SW_CENTERMARKSYMBOL_5", coordinates: { x1: 0, y1: 0, x2: 3, y2: 0 }, length: 3 }),
      // Rule 1: DIMENSION
      makeEntity({ id: 1, type: "DIMENSION" }),
      // Rule 2: non-CONTINUOUS linetype
      makeEntity({ id: 2, type: "LINE", linetype: "CENTER", coordinates: { x1: 0, y1: 0, x2: 50, y2: 0 }, length: 50 }),
      // Rule 3: cross-pattern (4 short lines at (100,100))
      makeEntity({ id: 3, type: "LINE", coordinates: { x1: 100, y1: 100, x2: 105, y2: 100 }, length: 5 }),
      makeEntity({ id: 4, type: "LINE", coordinates: { x1: 100, y1: 100, x2: 95, y2: 100 }, length: 5 }),
      makeEntity({ id: 5, type: "LINE", coordinates: { x1: 100, y1: 100, x2: 100, y2: 105 }, length: 5 }),
      makeEntity({ id: 6, type: "LINE", coordinates: { x1: 100, y1: 100, x2: 100, y2: 95 }, length: 5 }),
      // Surviving real geometry
      makeEntity({ id: 7, type: "LINE", coordinates: { x1: 0, y1: 0, x2: 200, y2: 0 }, length: 200 }),
      makeEntity({ id: 8, type: "CIRCLE", coordinates: { cx: 50, cy: 50, r: 20 }, length: 125.66 }),
    ];

    const { cleaned, report } = cleanEntities(entities);

    expect(report.removedHelperBlocks).toBe(1);
    expect(report.removedDimensions).toBe(1);
    expect(report.removedThreadHelpers).toBe(1);
    expect(report.removedCrossPatterns).toBe(4);
    expect(report.totalRemoved).toBe(7);
    expect(cleaned).toHaveLength(2);
    expect(cleaned.map((e) => e.id).sort()).toEqual([7, 8]);
  });
});
