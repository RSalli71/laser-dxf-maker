/**
 * Tests for src/lib/dxf/parser.ts
 *
 * Covers acceptance criteria from REQUIREMENTS.md F2:
 * - LINE, CIRCLE, ARC, LWPOLYLINE, TEXT parsing
 * - LINETYPE extraction
 * - Binary DXF rejection
 * - Empty DXF handling
 * - Unknown entity types skipped
 * - Parse statistics correctness
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { parseDxf } from "@/lib/dxf/parser";

// ---- Helpers: build minimal DXF strings --------------------------------

function wrapEntities(entityLines: string): string {
  return [
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    entityLines,
    "0",
    "ENDSEC",
    "0",
    "EOF",
  ].join("\n");
}

function makeLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opts?: { layer?: string; color?: number; linetype?: string },
): string {
  const parts = ["0", "LINE"];
  if (opts?.layer) parts.push("8", opts.layer);
  if (opts?.color !== undefined) parts.push("62", String(opts.color));
  if (opts?.linetype) parts.push("6", opts.linetype);
  parts.push("10", String(x1), "20", String(y1));
  parts.push("11", String(x2), "21", String(y2));
  return parts.join("\n");
}

function makeCircle(
  cx: number,
  cy: number,
  r: number,
  opts?: { linetype?: string },
): string {
  const parts = ["0", "CIRCLE"];
  if (opts?.linetype) parts.push("6", opts.linetype);
  parts.push("10", String(cx), "20", String(cy), "40", String(r));
  return parts.join("\n");
}

function makeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  return [
    "0",
    "ARC",
    "10",
    String(cx),
    "20",
    String(cy),
    "40",
    String(r),
    "50",
    String(startAngle),
    "51",
    String(endAngle),
  ].join("\n");
}

function makeLwPolyline(
  points: Array<{ x: number; y: number }>,
  closed = false,
): string {
  const parts = ["0", "LWPOLYLINE"];
  parts.push("90", String(points.length));
  if (closed) parts.push("70", "1");
  for (const pt of points) {
    parts.push("10", String(pt.x), "20", String(pt.y));
  }
  return parts.join("\n");
}

function makeText(x: number, y: number, text: string, height = 5): string {
  return [
    "0",
    "TEXT",
    "10",
    String(x),
    "20",
    String(y),
    "40",
    String(height),
    "1",
    text,
  ].join("\n");
}

// ---- Tests -------------------------------------------------------------

describe("parseDxf", () => {
  // F2 AC: LINE wird korrekt geparst
  it("parses a simple LINE entity", () => {
    const dxf = wrapEntities(makeLine(0, 0, 100, 200));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const line = result.entities[0];
    expect(line.type).toBe("LINE");
    expect(line.coordinates.x1).toBe(0);
    expect(line.coordinates.y1).toBe(0);
    expect(line.coordinates.x2).toBe(100);
    expect(line.coordinates.y2).toBe(200);
    expect(line.length).toBeCloseTo(Math.sqrt(100 ** 2 + 200 ** 2));
  });

  // F2 AC: CIRCLE wird korrekt geparst
  it("parses a CIRCLE entity (cx, cy, r)", () => {
    const dxf = wrapEntities(makeCircle(50, 60, 25));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const circle = result.entities[0];
    expect(circle.type).toBe("CIRCLE");
    expect(circle.coordinates.cx).toBe(50);
    expect(circle.coordinates.cy).toBe(60);
    expect(circle.coordinates.r).toBe(25);
    expect(circle.closed).toBe(true);
    expect(circle.length).toBeCloseTo(2 * Math.PI * 25);
  });

  // F2 AC: ARC wird korrekt geparst (mit Winkeln)
  it("parses an ARC entity with angles", () => {
    const dxf = wrapEntities(makeArc(10, 20, 30, 45, 135));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const arc = result.entities[0];
    expect(arc.type).toBe("ARC");
    expect(arc.coordinates.cx).toBe(10);
    expect(arc.coordinates.cy).toBe(20);
    expect(arc.coordinates.r).toBe(30);
    expect(arc.coordinates.startAngle).toBe(45);
    expect(arc.coordinates.endAngle).toBe(135);
    expect(arc.length).toBeGreaterThan(0);
  });

  // F2 AC: LWPOLYLINE wird korrekt geparst (mit Punkten)
  it("parses an LWPOLYLINE entity with points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const dxf = wrapEntities(makeLwPolyline(points, true));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const poly = result.entities[0];
    expect(poly.type).toBe("LWPOLYLINE");
    expect(poly.coordinates.points).toHaveLength(4);
    expect(poly.closed).toBe(true);
    expect(poly.length).toBeCloseTo(400); // perimeter of 100x100 square
  });

  // F2 AC: TEXT wird korrekt geparst
  it("parses a TEXT entity", () => {
    const dxf = wrapEntities(makeText(10, 20, "Hello", 5));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const text = result.entities[0];
    expect(text.type).toBe("TEXT");
    expect(text.coordinates.x).toBe(10);
    expect(text.coordinates.y).toBe(20);
    expect(text.coordinates.text).toBe("Hello");
    expect(text.coordinates.height).toBe(5);
    expect(text.length).toBe(0);
  });

  // F2 AC: LINETYPE wird pro Entitaet mitgeparst
  it("extracts LINETYPE information per entity", () => {
    const dxf = wrapEntities(makeLine(0, 0, 10, 10, { linetype: "DASHED" }));
    const result = parseDxf(dxf);

    expect(result.entities[0].linetype).toBe("DASHED");
  });

  it("defaults LINETYPE to CONTINUOUS when not specified", () => {
    const dxf = wrapEntities(makeLine(0, 0, 10, 10));
    const result = parseDxf(dxf);

    expect(result.entities[0].linetype).toBe("CONTINUOUS");
  });

  // F2 AC: Binaer-DXF wird abgelehnt
  it("rejects binary DXF files with an error", () => {
    const binaryContent = "AutoCAD Binary DXF\r\n\x1a\x00...binary data...";
    expect(() => parseDxf(binaryContent)).toThrow(/[Bb]in/);
  });

  // F2 AC: Leere DXF (keine Entities)
  it("handles empty DXF (no entities) with a warning", () => {
    const dxf = wrapEntities("");
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(0);
    expect(result.stats.warnings.length).toBeGreaterThan(0);
    expect(result.stats.warnings.some((w) => /[Kk]eine/.test(w))).toBe(true);
  });

  // F2 AC: Unbekannte Entity-Typen werden uebersprungen
  it("skips unknown entity types and adds a warning", () => {
    const dxf = wrapEntities(
      ["0", "HATCH", "10", "0", "20", "0", makeLine(0, 0, 10, 10)].join("\n"),
    );
    const result = parseDxf(dxf);

    // Only the LINE should be parsed (HATCH is unsupported)
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe("LINE");
    expect(result.stats.warnings.some((w) => w.includes("HATCH"))).toBe(true);
  });

  // F2 AC: Parse-Statistik ist korrekt
  it("produces correct parse statistics", () => {
    const dxf = wrapEntities(
      [
        makeLine(0, 0, 10, 10),
        makeLine(20, 20, 30, 30),
        makeCircle(50, 50, 10),
        makeArc(0, 0, 5, 0, 90),
        makeText(0, 0, "Test"),
      ].join("\n"),
    );
    const result = parseDxf(dxf);

    expect(result.stats.totalEntities).toBe(5);
    expect(result.stats.byType["LINE"]).toBe(2);
    expect(result.stats.byType["CIRCLE"]).toBe(1);
    expect(result.stats.byType["ARC"]).toBe(1);
    expect(result.stats.byType["TEXT"]).toBe(1);
  });

  // F2 AC: Layer und Color werden extrahiert
  it("extracts layer and color from entities", () => {
    const dxf = wrapEntities(
      makeLine(0, 0, 10, 10, { layer: "MyLayer", color: 3 }),
    );
    const result = parseDxf(dxf);

    expect(result.entities[0].layer).toBe("MyLayer");
    expect(result.entities[0].color).toBe(3);
  });

  it("defaults layer to '0' and color to 7 when not specified", () => {
    const dxf = wrapEntities(makeLine(0, 0, 10, 10));
    const result = parseDxf(dxf);

    expect(result.entities[0].layer).toBe("0");
    expect(result.entities[0].color).toBe(7);
  });

  // Empty file
  it("throws on completely empty input", () => {
    expect(() => parseDxf("")).toThrow(/leer/);
  });

  // Missing ENTITIES section
  it("throws when ENTITIES section is missing", () => {
    const dxf = ["0", "SECTION", "2", "HEADER", "0", "ENDSEC", "0", "EOF"].join(
      "\n",
    );
    expect(() => parseDxf(dxf)).toThrow(/ENTITIES/);
  });

  // Multiple entities of different types
  it("assigns sequential IDs to parsed entities", () => {
    const dxf = wrapEntities(
      [
        makeLine(0, 0, 10, 10),
        makeCircle(50, 50, 10),
        makeText(0, 0, "Hi"),
      ].join("\n"),
    );
    const result = parseDxf(dxf);

    expect(result.entities[0].id).toBe(0);
    expect(result.entities[1].id).toBe(1);
    expect(result.entities[2].id).toBe(2);
  });

  // DIMENSION entity is parsed (so cleaner can remove it)
  it("parses DIMENSION entities for cleaner removal", () => {
    const dxf = wrapEntities(["0", "DIMENSION", "8", "Dimensions"].join("\n"));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe("DIMENSION");
  });

  // Deduplicated warnings via WarningCollector
  it("deduplicates skipped entity type warnings", () => {
    const dxf = wrapEntities(
      [
        "0",
        "HATCH",
        "10",
        "0",
        "20",
        "0",
        "0",
        "HATCH",
        "10",
        "5",
        "20",
        "5",
        "0",
        "SOLID",
        "10",
        "0",
        "20",
        "0",
        makeLine(0, 0, 10, 10),
      ].join("\n"),
    );
    const result = parseDxf(dxf);

    // WarningCollector: 2x HATCH grouped with count, 1x SOLID without count
    const hatchWarnings = result.stats.warnings.filter((w) =>
      w.includes("HATCH"),
    );
    expect(hatchWarnings).toHaveLength(1);
    expect(hatchWarnings[0]).toContain("2x");

    const solidWarnings = result.stats.warnings.filter((w) =>
      w.includes("SOLID"),
    );
    expect(solidWarnings).toHaveLength(1);
    expect(solidWarnings[0]).not.toContain("x)"); // Single warning: no count suffix
  });
});

// ---- BLOCK/INSERT Tests ------------------------------------------------

/**
 * Helper: build a DXF string with BLOCKS section and ENTITIES section.
 */
function wrapWithBlocks(blockLines: string, entityLines: string): string {
  return [
    "0",
    "SECTION",
    "2",
    "BLOCKS",
    blockLines,
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    entityLines,
    "0",
    "ENDSEC",
    "0",
    "EOF",
  ].join("\n");
}

/**
 * Helper: create a BLOCK definition wrapping entity lines.
 */
function makeBlock(
  name: string,
  entityLines: string,
  baseX = 0,
  baseY = 0,
): string {
  return [
    "0",
    "BLOCK",
    "2",
    name,
    "10",
    String(baseX),
    "20",
    String(baseY),
    entityLines,
    "0",
    "ENDBLK",
  ].join("\n");
}

/**
 * Helper: create an INSERT entity referencing a block.
 */
function makeInsert(
  blockName: string,
  x: number,
  y: number,
  opts?: {
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    layer?: string;
    color?: number;
  },
): string {
  const parts = [
    "0",
    "INSERT",
    "2",
    blockName,
    "10",
    String(x),
    "20",
    String(y),
  ];
  if (opts?.scaleX !== undefined) parts.push("41", String(opts.scaleX));
  if (opts?.scaleY !== undefined) parts.push("42", String(opts.scaleY));
  if (opts?.rotation !== undefined) parts.push("50", String(opts.rotation));
  if (opts?.layer) parts.push("8", opts.layer);
  if (opts?.color !== undefined) parts.push("62", String(opts.color));
  return parts.join("\n");
}

describe("parseDxf - BLOCK/INSERT support", () => {
  it("resolves a simple INSERT with LINE entities from a block", () => {
    const block = makeBlock("PART1", makeLine(0, 0, 10, 0));
    const insert = makeInsert("PART1", 100, 200);
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const line = result.entities[0];
    expect(line.type).toBe("LINE");
    // LINE(0,0 -> 10,0) translated by (100,200)
    expect(line.coordinates.x1).toBeCloseTo(100);
    expect(line.coordinates.y1).toBeCloseTo(200);
    expect(line.coordinates.x2).toBeCloseTo(110);
    expect(line.coordinates.y2).toBeCloseTo(200);
  });

  it("resolves INSERT with multiple entities in a block", () => {
    const blockContent = [makeLine(0, 0, 10, 0), makeCircle(5, 5, 3)].join(
      "\n",
    );
    const block = makeBlock("MULTI", blockContent);
    const insert = makeInsert("MULTI", 0, 0);
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].type).toBe("LINE");
    expect(result.entities[1].type).toBe("CIRCLE");
  });

  it("applies scaling to INSERT entities", () => {
    const block = makeBlock("SCALED", makeLine(0, 0, 10, 0));
    const insert = makeInsert("SCALED", 0, 0, { scaleX: 2, scaleY: 2 });
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const line = result.entities[0];
    // LINE(0,0 -> 10,0) scaled by 2x
    expect(line.coordinates.x2).toBeCloseTo(20);
    expect(line.coordinates.y2).toBeCloseTo(0);
  });

  it("applies rotation to INSERT entities", () => {
    const block = makeBlock("ROTATED", makeLine(0, 0, 10, 0));
    // Rotate 90 degrees CCW
    const insert = makeInsert("ROTATED", 0, 0, { rotation: 90 });
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const line = result.entities[0];
    // LINE(0,0 -> 10,0) rotated 90 CCW -> (0,0 -> 0,10)
    expect(line.coordinates.x1).toBeCloseTo(0);
    expect(line.coordinates.y1).toBeCloseTo(0);
    expect(line.coordinates.x2).toBeCloseTo(0, 0);
    expect(line.coordinates.y2).toBeCloseTo(10);
  });

  it("combines translation, scale and rotation", () => {
    const block = makeBlock("COMBO", makeLine(0, 0, 10, 0));
    const insert = makeInsert("COMBO", 50, 50, {
      scaleX: 2,
      scaleY: 2,
      rotation: 90,
    });
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const line = result.entities[0];
    // LINE(0,0 -> 10,0) -> scale 2x -> (0,0 -> 20,0) -> rotate 90 -> (0,0 -> 0,20) -> translate (50,50)
    expect(line.coordinates.x1).toBeCloseTo(50);
    expect(line.coordinates.y1).toBeCloseTo(50);
    expect(line.coordinates.x2).toBeCloseTo(50, 0);
    expect(line.coordinates.y2).toBeCloseTo(70);
  });

  it("resolves multiple INSERTs of the same block", () => {
    const block = makeBlock("PART", makeLine(0, 0, 10, 0));
    const entities = [
      makeInsert("PART", 0, 0),
      makeInsert("PART", 100, 0),
    ].join("\n");
    const dxf = wrapWithBlocks(block, entities);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].coordinates.x1).toBeCloseTo(0);
    expect(result.entities[1].coordinates.x1).toBeCloseTo(100);
  });

  it("resolves CIRCLE in a block with correct center and radius", () => {
    const block = makeBlock("WITH_CIRCLE", makeCircle(5, 5, 10));
    const insert = makeInsert("WITH_CIRCLE", 100, 100);
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const circle = result.entities[0];
    expect(circle.type).toBe("CIRCLE");
    expect(circle.coordinates.cx).toBeCloseTo(105);
    expect(circle.coordinates.cy).toBeCloseTo(105);
    expect(circle.coordinates.r).toBeCloseTo(10);
  });

  it("resolves nested INSERT chains across multiple block levels", () => {
    const childBlock = makeBlock("CHILD", makeLine(0, 0, 10, 0));
    const parentBlock = makeBlock(
      "PARENT",
      makeInsert("CHILD", 10, 5, { scaleX: 2, scaleY: 2 }),
    );
    const dxf = wrapWithBlocks(
      [childBlock, parentBlock].join("\n"),
      makeInsert("PARENT", 100, 200),
    );

    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const line = result.entities[0];
    expect(line.type).toBe("LINE");
    expect(line.coordinates.x1).toBeCloseTo(110);
    expect(line.coordinates.y1).toBeCloseTo(205);
    expect(line.coordinates.x2).toBeCloseTo(130);
    expect(line.coordinates.y2).toBeCloseTo(205);
    expect(
      result.stats.warnings.some((w) =>
        w.includes(
          "Verschachtelte INSERT-Referenzen werden nicht unterstuetzt",
        ),
      ),
    ).toBe(false);
  });

  it("stops cyclic INSERT chains with a warning instead of recursing forever", () => {
    const blockA = makeBlock("A", makeInsert("B", 0, 0));
    const blockB = makeBlock("B", makeInsert("A", 0, 0));
    const dxf = wrapWithBlocks(
      [blockA, blockB].join("\n"),
      makeInsert("A", 0, 0),
    );

    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(0);
    expect(
      result.stats.warnings.some((w) =>
        w.includes("Zyklische INSERT-Referenz erkannt"),
      ),
    ).toBe(true);
  });

  it("resolves the customer DXF without nested INSERT skip warnings", () => {
    const filePath = resolve(
      process.cwd(),
      "docs/knowledge/dxf-Data/ai1607002_Kanthalter EFR B10.DXF",
    );
    const dxf = readFileSync(filePath, "utf8");

    const result = parseDxf(dxf);

    expect(
      result.stats.warnings.some((w) =>
        w.includes(
          "Verschachtelte INSERT-Referenzen werden nicht unterstuetzt",
        ),
      ),
    ).toBe(false);
    expect(
      result.stats.warnings.some((w) =>
        /^Uebersprungener Entity-Typ: \d+ \(/.test(w),
      ),
    ).toBe(false);
    expect(result.stats.totalEntities).toBeGreaterThan(700);
    expect(result.stats.byType.LINE).toBeGreaterThan(300);
    expect(result.stats.byType.ARC).toBeGreaterThan(0);
    expect(result.stats.byType.SPLINE).toBeGreaterThan(40);
  });

  it("warns when INSERT references an unknown block", () => {
    const insert = makeInsert("NONEXISTENT", 0, 0);
    const dxf = wrapWithBlocks("", insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(0);
    expect(result.stats.warnings.some((w) => w.includes("NONEXISTENT"))).toBe(
      true,
    );
  });

  it("resolves INSERT with ByBlock layer/color inheritance", () => {
    // Entity in block has layer "0" (ByBlock) and no color -> should inherit from INSERT
    const blockContent = makeLine(0, 0, 10, 0); // default layer "0", color 7
    const block = makeBlock("INHERIT", blockContent);
    const insert = makeInsert("INHERIT", 0, 0, {
      layer: "CUT_OUTER",
      color: 1,
    });
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    // Layer "0" in block -> inherits INSERT layer "CUT_OUTER"
    expect(result.entities[0].layer).toBe("CUT_OUTER");
  });

  it("handles DXF with no BLOCKS section gracefully", () => {
    // Just ENTITIES, no BLOCKS
    const dxf = wrapEntities(makeLine(0, 0, 10, 10));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
  });

  it("mixes direct entities and INSERT-resolved entities", () => {
    const block = makeBlock("BLK", makeCircle(0, 0, 5));
    const entities = [makeLine(0, 0, 100, 0), makeInsert("BLK", 50, 50)].join(
      "\n",
    );
    const dxf = wrapWithBlocks(block, entities);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].type).toBe("LINE");
    expect(result.entities[1].type).toBe("CIRCLE");
  });

  it("uses block base point for transformation offset", () => {
    // Block with base point (10, 10), entity at (10, 10)
    // After subtracting base: (0,0). Then translated by INSERT position.
    const block = makeBlock("BASED", makeLine(10, 10, 20, 10), 10, 10);
    const insert = makeInsert("BASED", 50, 50);
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    // (10,10) - base(10,10) = (0,0), + insert(50,50) = (50,50)
    expect(result.entities[0].coordinates.x1).toBeCloseTo(50);
    expect(result.entities[0].coordinates.y1).toBeCloseTo(50);
    // (20,10) - base(10,10) = (10,0), + insert(50,50) = (60,50)
    expect(result.entities[0].coordinates.x2).toBeCloseTo(60);
    expect(result.entities[0].coordinates.y2).toBeCloseTo(50);
  });
});

// ---- SPLINE Tests ------------------------------------------------------

/**
 * Helper: create a SPLINE entity with control points.
 */
function makeSpline(
  controlPoints: Array<{ x: number; y: number }>,
  opts?: {
    degree?: number;
    closed?: boolean;
    fitPoints?: Array<{ x: number; y: number }>;
    layer?: string;
    color?: number;
    knots?: number[];
  },
): string {
  const parts = ["0", "SPLINE"];
  if (opts?.layer) parts.push("8", opts.layer);
  if (opts?.color !== undefined) parts.push("62", String(opts.color));

  // Flags (bit 1 = closed)
  const flags = opts?.closed ? 1 : 0;
  parts.push("70", String(flags));

  // Degree
  parts.push("71", String(opts?.degree ?? 3));

  // Number of knots
  const numKnots = opts?.knots?.length ?? 0;
  parts.push("72", String(numKnots));

  // Number of control points
  parts.push("73", String(controlPoints.length));

  // Number of fit points
  const numFit = opts?.fitPoints?.length ?? 0;
  parts.push("74", String(numFit));

  // Knot values (code 40)
  if (opts?.knots) {
    for (const k of opts.knots) {
      parts.push("40", String(k));
    }
  }

  // Control points (codes 10/20)
  for (const pt of controlPoints) {
    parts.push("10", String(pt.x), "20", String(pt.y));
  }

  // Fit points (codes 11/21)
  if (opts?.fitPoints) {
    for (const pt of opts.fitPoints) {
      parts.push("11", String(pt.x), "21", String(pt.y));
    }
  }

  return parts.join("\n");
}

describe("parseDxf - SPLINE support", () => {
  it("parses a simple SPLINE with control points", () => {
    const controlPoints = [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 30, y: 10 },
      { x: 40, y: 0 },
    ];
    const dxf = wrapEntities(makeSpline(controlPoints));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const spline = result.entities[0];
    expect(spline.type).toBe("SPLINE");
    expect(spline.coordinates.points).toHaveLength(4);
    expect(spline.coordinates.points![0]).toEqual({ x: 0, y: 0 });
    expect(spline.coordinates.points![3]).toEqual({ x: 40, y: 0 });
    expect(spline.length).toBeGreaterThan(0);
    expect(spline.closed).toBe(false);
  });

  it("prefers fit points over control points when both are present", () => {
    const controlPoints = [
      { x: 0, y: 0 },
      { x: 5, y: 15 },
      { x: 15, y: 15 },
      { x: 20, y: 0 },
    ];
    const fitPoints = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ];
    const dxf = wrapEntities(makeSpline(controlPoints, { fitPoints }));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const spline = result.entities[0];
    expect(spline.type).toBe("SPLINE");
    // Should use fit points (3) not control points (4)
    expect(spline.coordinates.points).toHaveLength(3);
    expect(spline.coordinates.points![0]).toEqual({ x: 0, y: 0 });
    expect(spline.coordinates.points![1]).toEqual({ x: 10, y: 10 });
    expect(spline.coordinates.points![2]).toEqual({ x: 20, y: 0 });
  });

  it("parses a closed SPLINE (flag bit 1 set)", () => {
    const controlPoints = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const dxf = wrapEntities(makeSpline(controlPoints, { closed: true }));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const spline = result.entities[0];
    expect(spline.type).toBe("SPLINE");
    expect(spline.closed).toBe(true);
    // Closed polyline length includes segment from last to first point
    const openLength = 10 + 10 + 10; // three segments
    const closingSegment = 10; // last to first
    expect(spline.length).toBeCloseTo(openLength + closingSegment);
  });

  it("resolves a SPLINE in a BLOCK via INSERT", () => {
    const controlPoints = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const splineStr = makeSpline(controlPoints);
    const block = makeBlock("SPLINE_BLK", splineStr);
    const insert = makeInsert("SPLINE_BLK", 100, 200);
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const spline = result.entities[0];
    expect(spline.type).toBe("SPLINE");
    // Points should be translated by (100, 200)
    expect(spline.coordinates.points![0]).toEqual({ x: 100, y: 200 });
    expect(spline.coordinates.points![1]).toEqual({ x: 110, y: 200 });
    expect(spline.coordinates.points![2]).toEqual({ x: 110, y: 210 });
  });

  it("calculates SPLINE length as polyline approximation", () => {
    // Simple straight-line spline: (0,0) -> (10,0) -> (10,10)
    const controlPoints = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const dxf = wrapEntities(makeSpline(controlPoints));
    const result = parseDxf(dxf);

    const spline = result.entities[0];
    // Length should be 10 + 10 = 20
    expect(spline.length).toBeCloseTo(20);
  });

  it("includes SPLINE in parse statistics", () => {
    const dxf = wrapEntities(
      [
        makeSpline([
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ]),
        makeSpline([
          { x: 20, y: 20 },
          { x: 30, y: 30 },
        ]),
        makeLine(0, 0, 10, 10),
      ].join("\n"),
    );
    const result = parseDxf(dxf);

    expect(result.stats.totalEntities).toBe(3);
    expect(result.stats.byType["SPLINE"]).toBe(2);
    expect(result.stats.byType["LINE"]).toBe(1);
  });

  it("handles SPLINE with knot values (ignored for geometry)", () => {
    const controlPoints = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ];
    const knots = [0, 0, 0, 1, 1, 1];
    const dxf = wrapEntities(makeSpline(controlPoints, { degree: 2, knots }));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const spline = result.entities[0];
    expect(spline.type).toBe("SPLINE");
    expect(spline.coordinates.points).toHaveLength(3);
  });

  it("applies scale and rotation to SPLINE in INSERT", () => {
    const controlPoints = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const splineStr = makeSpline(controlPoints);
    const block = makeBlock("SPLINE_TR", splineStr);
    // Scale 2x, rotate 90 degrees, translate to (50, 50)
    const insert = makeInsert("SPLINE_TR", 50, 50, {
      scaleX: 2,
      scaleY: 2,
      rotation: 90,
    });
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const spline = result.entities[0];
    // (0,0) -> scale 2 -> (0,0) -> rotate 90 -> (0,0) -> translate (50,50) = (50,50)
    expect(spline.coordinates.points![0].x).toBeCloseTo(50);
    expect(spline.coordinates.points![0].y).toBeCloseTo(50);
    // (10,0) -> scale 2 -> (20,0) -> rotate 90 -> (0,20) -> translate (50,50) = (50,70)
    expect(spline.coordinates.points![1].x).toBeCloseTo(50, 0);
    expect(spline.coordinates.points![1].y).toBeCloseTo(70);
  });
});

// ---- ELLIPSE Tests ---------------------------------------------------

describe("parseDxf - ELLIPSE support", () => {
  it("parses an ELLIPSE entity", () => {
    // DXF ELLIPSE: center (10,20), major axis endpoint (5,0) relative to center,
    // minor ratio 0.6, full ellipse (0 to 2*PI)
    const dxf = wrapEntities(
      [
        "0", "ELLIPSE",
        "8", "0",
        "10", "10",      // cx
        "20", "20",      // cy
        "11", "5",       // major axis endpoint X (relative)
        "21", "0",       // major axis endpoint Y (relative)
        "40", "0.6",     // minor/major ratio
        "41", "0",       // start param (radians)
        "42", String(2 * Math.PI), // end param (radians)
      ].join("\n"),
    );
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const e = result.entities[0];
    expect(e.type).toBe("ELLIPSE");
    expect(e.coordinates.cx).toBe(10);
    expect(e.coordinates.cy).toBe(20);
    expect(e.coordinates.rx).toBe(5);      // major axis = sqrt(5²+0²)
    expect(e.coordinates.ry).toBeCloseTo(3); // 5 * 0.6
    expect(e.coordinates.rotation).toBe(0);  // atan2(0,5) = 0
    expect(e.closed).toBe(true);
    expect(e.length).toBeGreaterThan(0);
  });

  it("CIRCLE becomes ELLIPSE under non-uniform scaling", () => {
    const block = makeBlock(
      "CIRC_BLOCK",
      ["0", "CIRCLE", "8", "0", "10", "0", "20", "0", "40", "10"].join("\n"),
    );
    const insert = makeInsert("CIRC_BLOCK", 0, 0, { scaleX: 2, scaleY: 1 });
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const e = result.entities[0];
    expect(e.type).toBe("ELLIPSE");
    expect(e.coordinates.rx).toBeCloseTo(20);  // 10 * |scaleX=2|
    expect(e.coordinates.ry).toBeCloseTo(10);  // 10 * |scaleY=1|
    expect(e.closed).toBe(true);
  });

  it("CIRCLE stays CIRCLE under uniform scaling", () => {
    const block = makeBlock(
      "CIRC_UNIFORM",
      ["0", "CIRCLE", "8", "0", "10", "0", "20", "0", "40", "10"].join("\n"),
    );
    const insert = makeInsert("CIRC_UNIFORM", 0, 0, { scaleX: 3, scaleY: 3 });
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const e = result.entities[0];
    expect(e.type).toBe("CIRCLE");
    expect(e.coordinates.r).toBeCloseTo(30); // 10 * 3
  });

  it("ARC becomes ELLIPSE under non-uniform scaling", () => {
    const block = makeBlock(
      "ARC_BLOCK",
      ["0", "ARC", "8", "0", "10", "0", "20", "0", "40", "10", "50", "0", "51", "90"].join("\n"),
    );
    const insert = makeInsert("ARC_BLOCK", 0, 0, { scaleX: 2, scaleY: 1 });
    const dxf = wrapWithBlocks(block, insert);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const e = result.entities[0];
    expect(e.type).toBe("ELLIPSE");
    expect(e.coordinates.rx).toBeCloseTo(20);
    expect(e.coordinates.ry).toBeCloseTo(10);
    expect(e.closed).toBeFalsy(); // Arc, not full ellipse
  });
});
