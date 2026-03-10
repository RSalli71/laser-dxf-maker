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
  points: Array<{ x: number; y: number; bulge?: number }>,
  closed = false,
): string {
  const parts = ["0", "LWPOLYLINE"];
  parts.push("90", String(points.length));
  if (closed) parts.push("70", "1");
  for (const pt of points) {
    parts.push("10", String(pt.x), "20", String(pt.y));
    if (pt.bulge !== undefined) {
      parts.push("42", String(pt.bulge));
    }
  }
  return parts.join("\n");
}

function makeMText(
  x: number,
  y: number,
  text: string,
  height = 5,
  code3Parts?: string[],
): string {
  const parts = ["0", "MTEXT", "10", String(x), "20", String(y), "40", String(height)];
  if (code3Parts) {
    for (const part of code3Parts) {
      parts.push("3", part);
    }
  }
  parts.push("1", text);
  return parts.join("\n");
}

function makeText(
  x: number,
  y: number,
  text: string,
  height = 5,
): string {
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
    const dxf = wrapEntities(
      makeLine(0, 0, 10, 10, { linetype: "DASHED" }),
    );
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
      [
        "0",
        "SPLINE",
        "10",
        "0",
        "20",
        "0",
        makeLine(0, 0, 10, 10),
      ].join("\n"),
    );
    const result = parseDxf(dxf);

    // Only the LINE should be parsed
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe("LINE");
    expect(
      result.stats.warnings.some((w) => w.includes("SPLINE")),
    ).toBe(true);
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
    const dxf = [
      "0",
      "SECTION",
      "2",
      "HEADER",
      "0",
      "ENDSEC",
      "0",
      "EOF",
    ].join("\n");
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
    const dxf = wrapEntities(
      ["0", "DIMENSION", "8", "Dimensions"].join("\n"),
    );
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe("DIMENSION");
  });

  // ---- F1: Bulge-Support LWPOLYLINE -----------------------------------

  it("parses LWPOLYLINE with bulge values", () => {
    const dxf = wrapEntities(
      makeLwPolyline([
        { x: 0, y: 0, bulge: 1.0 },
        { x: 10, y: 0 },
      ]),
    );
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const poly = result.entities[0];
    expect(poly.coordinates.points![0].bulge).toBe(1.0);
    expect(poly.coordinates.points![1].bulge).toBeUndefined();
  });

  it("ignores zero bulge", () => {
    const dxf = wrapEntities(
      makeLwPolyline([
        { x: 0, y: 0, bulge: 0 },
        { x: 10, y: 0 },
      ]),
    );
    const result = parseDxf(dxf);

    expect(result.entities[0].coordinates.points![0].bulge).toBeUndefined();
  });

  it("calculates arc length for bulge=1 (semicircle)", () => {
    // bulge=1 means semicircle. Points (0,0)-(10,0), chord=10, arc=pi*5
    const dxf = wrapEntities(
      makeLwPolyline([
        { x: 0, y: 0, bulge: 1.0 },
        { x: 10, y: 0 },
      ]),
    );
    const result = parseDxf(dxf);

    // Semicircle arc length = pi * r = pi * 5 = 15.708...
    expect(result.entities[0].length).toBeCloseTo(Math.PI * 5, 2);
  });

  it("handles near-zero bulge as straight line", () => {
    const dxf = wrapEntities(
      makeLwPolyline([
        { x: 0, y: 0, bulge: 0.00005 },
        { x: 10, y: 0 },
      ]),
    );
    const result = parseDxf(dxf);

    // Near-zero bulge is treated as straight line -> chord length = 10
    expect(result.entities[0].length).toBeCloseTo(10, 4);
  });

  it("handles very large bulge without NaN", () => {
    const dxf = wrapEntities(
      makeLwPolyline([
        { x: 0, y: 0, bulge: 100 },
        { x: 10, y: 0 },
      ]),
    );
    const result = parseDxf(dxf);

    expect(result.entities[0].length).toBeGreaterThan(0);
    expect(isFinite(result.entities[0].length)).toBe(true);
  });

  it("calculates correct length for closed polyline with bulge on last point", () => {
    // Square with semicircle closing segment
    const dxf = wrapEntities(
      makeLwPolyline(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10, bulge: 1.0 },
        ],
        true,
      ),
    );
    const result = parseDxf(dxf);

    // 3 straight segments of 10 each = 30, plus semicircle arc on closing segment
    // Closing: (0,10)->(0,0), chord=10, bulge=1 => arc = pi*5
    const expectedLength = 30 + Math.PI * 5;
    expect(result.entities[0].length).toBeCloseTo(expectedLength, 2);
  });

  // ---- F2: MTEXT als TEXT ---------------------------------------------

  it("parses MTEXT as TEXT entity", () => {
    const dxf = wrapEntities(makeMText(10, 20, "Beschriftung", 3));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    const entity = result.entities[0];
    expect(entity.type).toBe("TEXT");
    expect(entity.coordinates.x).toBe(10);
    expect(entity.coordinates.y).toBe(20);
    expect(entity.coordinates.text).toBe("Beschriftung");
    expect(entity.coordinates.height).toBe(3);
    expect(entity.length).toBe(0);
  });

  it("strips MTEXT formatting sequences", () => {
    const dxf = wrapEntities(
      makeMText(0, 0, "{\\H2.5;Beschriftung}\\PMehr Text"),
    );
    const result = parseDxf(dxf);

    expect(result.entities[0].coordinates.text).toBe("Beschriftung Mehr Text");
  });

  it("concatenates Code 3 + Code 1 fragments in MTEXT", () => {
    const dxf = wrapEntities(
      makeMText(0, 0, "Ende", 5, ["Teil1", "Teil2"]),
    );
    const result = parseDxf(dxf);

    expect(result.entities[0].coordinates.text).toBe("Teil1Teil2Ende");
  });

  it("handles MTEXT with empty text", () => {
    const dxf = wrapEntities(makeMText(0, 0, ""));
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].coordinates.text).toBe("");
  });

  it("counts MTEXT under TEXT in stats", () => {
    const dxf = wrapEntities(makeMText(0, 0, "Test"));
    const result = parseDxf(dxf);

    expect(result.stats.byType["TEXT"]).toBe(1);
    expect(result.stats.byType["MTEXT"]).toBeUndefined();
  });

  // ---- F3: WarningCollector -------------------------------------------

  it("groups identical warnings with count", () => {
    // Create DXF with multiple HATCH entities (unsupported -> same warning each time)
    const hatchEntities = Array(5)
      .fill(["0", "HATCH", "8", "0"].join("\n"))
      .join("\n");
    const dxf = wrapEntities(hatchEntities);
    const result = parseDxf(dxf);

    const hatchWarnings = result.stats.warnings.filter((w) =>
      w.includes("HATCH"),
    );
    expect(hatchWarnings).toHaveLength(1);
    expect(hatchWarnings[0]).toContain("(5x)");
  });

  it("single warning has no count suffix", () => {
    const dxf = wrapEntities(["0", "HATCH", "8", "0"].join("\n"));
    const result = parseDxf(dxf);

    const hatchWarnings = result.stats.warnings.filter((w) =>
      w.includes("HATCH"),
    );
    expect(hatchWarnings).toHaveLength(1);
    expect(hatchWarnings[0]).not.toContain("(");
  });

  it("preserves first-occurrence order in warnings", () => {
    // HATCH 3x, then SOLID 2x
    const entities = [
      ...Array(3).fill(["0", "HATCH", "8", "0"].join("\n")),
      ...Array(2).fill(["0", "SOLID", "8", "0"].join("\n")),
    ].join("\n");
    const dxf = wrapEntities(entities);
    const result = parseDxf(dxf);

    const skipWarnings = result.stats.warnings.filter((w) =>
      w.includes("Uebersprungener"),
    );
    expect(skipWarnings.length).toBe(2);
    expect(skipWarnings[0]).toContain("HATCH");
    expect(skipWarnings[0]).toContain("(3x)");
    expect(skipWarnings[1]).toContain("SOLID");
    expect(skipWarnings[1]).toContain("(2x)");
  });

  it("no warnings returns empty array", () => {
    const dxf = wrapEntities(makeLine(0, 0, 10, 10));
    const result = parseDxf(dxf);

    expect(result.stats.warnings).toEqual([]);
  });

  // ---- F1 Edge Cases: non-numeric bulge, SVG path output ----------------

  it("ignores non-numeric Group Code 42 value", () => {
    // Manually craft DXF with non-numeric bulge
    const entityLines = [
      "0", "LWPOLYLINE",
      "90", "2",
      "10", "0",
      "20", "0",
      "42", "abc",
      "10", "10",
      "20", "0",
    ].join("\n");
    const dxf = wrapEntities(entityLines);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    // Non-numeric bulge should be ignored -> treated as undefined
    expect(result.entities[0].coordinates.points![0].bulge).toBeUndefined();
    // Length should be straight chord = 10
    expect(result.entities[0].length).toBeCloseTo(10, 4);
  });

  it("bulge=1 arc length is greater than chord length", () => {
    // AC: Gesamtlaenge mit Bulge ist groesser als reine Sehnenlaenge
    const withBulge = wrapEntities(
      makeLwPolyline([
        { x: 0, y: 0, bulge: 1.0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ], true),
    );
    const withoutBulge = wrapEntities(
      makeLwPolyline([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ], true),
    );
    const resultWith = parseDxf(withBulge);
    const resultWithout = parseDxf(withoutBulge);

    expect(resultWith.entities[0].length).toBeGreaterThan(
      resultWithout.entities[0].length,
    );
  });

  // ---- F2 Edge Cases: MTEXT without height, only-formatting text --------

  it("MTEXT without Code 40 defaults height to 1", () => {
    // Manually craft MTEXT without Code 40
    const entityLines = [
      "0", "MTEXT",
      "10", "5",
      "20", "10",
      "1", "NoHeight",
    ].join("\n");
    const dxf = wrapEntities(entityLines);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].coordinates.height).toBe(1);
  });

  it("MTEXT with only formatting sequences yields empty text", () => {
    const dxf = wrapEntities(
      makeMText(0, 0, "{\\H2.5;\\A1;}"),
    );
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].coordinates.text).toBe("");
    expect(result.entities[0].type).toBe("TEXT");
  });

  it("MTEXT without Code 1 and Code 3 yields empty text", () => {
    const entityLines = [
      "0", "MTEXT",
      "10", "0",
      "20", "0",
      "40", "2.5",
    ].join("\n");
    const dxf = wrapEntities(entityLines);
    const result = parseDxf(dxf);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].coordinates.text).toBe("");
  });

  it("MTEXT normalizes \\~~ to space", () => {
    const dxf = wrapEntities(makeMText(0, 0, "A\\~~B"));
    const result = parseDxf(dxf);

    expect(result.entities[0].coordinates.text).toBe("A B");
  });
});
