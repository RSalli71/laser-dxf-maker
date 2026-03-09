/**
 * Tests for src/lib/dxf/exporter.ts
 *
 * Covers acceptance criteria from REQUIREMENTS.md F6:
 * - Valid DXF R12 HEADER with AC1009
 * - Layer definitions in TABLES section
 * - LINE, CIRCLE, ARC, LWPOLYLINE, TEXT in DXF syntax
 * - EOF marker
 * - Filename generation (with/without part suffix, special characters)
 */

import { describe, it, expect } from "vitest";
import { exportDxf, generateExportFilename } from "@/lib/dxf/exporter";
import type { DxfEntityV2 } from "@/types/dxf-v2";
import type { ProjectInfo } from "@/types/project";

// ---- Helpers -----------------------------------------------------------

function makeEntity(
  overrides: Partial<DxfEntityV2> & { id: number; type: DxfEntityV2["type"] },
): DxfEntityV2 {
  return {
    layer: "CUT_OUTER",
    color: 1,
    linetype: "CONTINUOUS",
    coordinates: {},
    length: 0,
    ...overrides,
  };
}

// ---- Tests: DXF Content ------------------------------------------------

describe("exportDxf", () => {
  // F6 AC: Die exportierte DXF enthaelt einen HEADER-Bereich
  it("contains a HEADER section with AC1009", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 10, y2: 10 },
      }),
    ];

    const output = exportDxf(entities);

    expect(output).toContain("HEADER");
    expect(output).toContain("AC1009");
    expect(output).toContain("$ACADVER");
  });

  // F6 AC: TABLES-Bereich mit Layer-Definitionen
  it("contains layer definitions in TABLES section", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        layer: "CUT_OUTER",
        color: 1,
        coordinates: { x1: 0, y1: 0, x2: 10, y2: 10 },
      }),
    ];

    const output = exportDxf(entities);

    expect(output).toContain("TABLES");
    expect(output).toContain("CUT_OUTER");
    expect(output).toContain("CUT_INNER");
    expect(output).toContain("BEND");
    expect(output).toContain("ENGRAVE");
  });

  // F6 AC: LINE wird korrekt in DXF R12-Syntax geschrieben
  it("writes LINE entity correctly in DXF syntax", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        layer: "CUT_OUTER",
        color: 1,
        coordinates: { x1: 10, y1: 20, x2: 30, y2: 40 },
      }),
    ];

    const output = exportDxf(entities);
    const lines = output.split("\n");

    // Find the LINE entity in ENTITIES section
    const lineIdx = lines.indexOf("LINE");
    expect(lineIdx).toBeGreaterThan(-1);

    // Check group codes after LINE
    const afterLine = lines.slice(lineIdx);
    // Should have coordinates with codes 10, 20, 11, 21
    expect(afterLine).toContain("10");
    expect(afterLine).toContain("20");
    expect(afterLine).toContain("11");
    expect(afterLine).toContain("21");
  });

  // F6 AC: CIRCLE wird korrekt geschrieben
  it("writes CIRCLE entity correctly in DXF syntax", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "CIRCLE",
        coordinates: { cx: 50, cy: 60, r: 25 },
      }),
    ];

    const output = exportDxf(entities);

    expect(output).toContain("CIRCLE");
    // Radius should appear as group code 40
    const lines = output.split("\n");
    const circleIdx = lines.indexOf("CIRCLE");
    const afterCircle = lines.slice(circleIdx);
    const code40Idx = afterCircle.indexOf("40");
    expect(code40Idx).toBeGreaterThan(-1);
    expect(afterCircle[code40Idx + 1]).toBe("25");
  });

  // ARC entity
  it("writes ARC entity correctly", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "ARC",
        coordinates: { cx: 10, cy: 20, r: 30, startAngle: 45, endAngle: 135 },
      }),
    ];

    const output = exportDxf(entities);

    expect(output).toContain("ARC");
    expect(output).toContain("50"); // start angle group code
    expect(output).toContain("51"); // end angle group code
  });

  // LWPOLYLINE entity
  it("writes LWPOLYLINE entity correctly", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LWPOLYLINE",
        coordinates: {
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        },
        closed: false,
      }),
    ];

    const output = exportDxf(entities);

    expect(output).toContain("LWPOLYLINE");
    // Should contain point count (90) and closed flag (70)
    const lines = output.split("\n");
    const polyIdx = lines.indexOf("LWPOLYLINE");
    const afterPoly = lines.slice(polyIdx);
    expect(afterPoly).toContain("90"); // vertex count
    expect(afterPoly).toContain("70"); // closed flag
  });

  // TEXT entity
  it("writes TEXT entity correctly", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "TEXT",
        coordinates: { x: 10, y: 20, text: "Hello", height: 5 },
      }),
    ];

    const output = exportDxf(entities);

    expect(output).toContain("TEXT");
    expect(output).toContain("Hello");
  });

  // F6 AC: Output endet mit EOF-Marker
  it("ends with EOF marker", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 10, y2: 10 },
      }),
    ];

    const output = exportDxf(entities);
    const lines = output.split("\n");

    // Last two lines should be "0" and "EOF"
    expect(lines[lines.length - 1]).toBe("EOF");
    expect(lines[lines.length - 2]).toBe("0");
  });

  // Empty entities
  it("produces valid DXF even with empty entities array", () => {
    const output = exportDxf([]);

    expect(output).toContain("HEADER");
    expect(output).toContain("ENTITIES");
    expect(output).toContain("EOF");
  });

  // Entity with non-default color writes color group code
  it("writes color group code for non-default ACI colors", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 0,
        type: "LINE",
        color: 1,
        coordinates: { x1: 0, y1: 0, x2: 10, y2: 10 },
      }),
    ];

    const output = exportDxf(entities);

    // Group code 62 should be present for ACI color 1
    const lines = output.split("\n");
    const entitiesIdx = lines.lastIndexOf("ENTITIES");
    const afterEntities = lines.slice(entitiesIdx);
    expect(afterEntities).toContain("62");
  });

  // DIMENSION entities are not exported
  it("does not export DIMENSION entities", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({ id: 0, type: "DIMENSION" }),
    ];

    const output = exportDxf(entities);

    // DIMENSION should not appear in ENTITIES section
    const lines = output.split("\n");
    const entitiesStart = lines.lastIndexOf("ENTITIES");
    const entitiesEnd = lines.indexOf("ENDSEC", entitiesStart);
    const entitiesSection = lines.slice(entitiesStart, entitiesEnd);
    expect(entitiesSection).not.toContain("DIMENSION");
  });
});

// ---- Tests: Filename generation ----------------------------------------

describe("generateExportFilename", () => {
  const projectInfo: ProjectInfo = {
    customerName: "Mustermann",
    projectNumber: "P2024-001",
  };

  // F6 AC: Dateiname folgt dem Muster [Kundenname]_[Projektnummer]-T[Nummer].dxf
  it("generates correct filename with part suffix for multiple parts", () => {
    const filename = generateExportFilename(projectInfo, "T1", 3);

    expect(filename).toBe("Mustermann_P2024-001-T1.dxf");
  });

  // F6 AC: Bei nur einem Teil entfaellt das -T1 Suffix
  it("generates filename without part suffix for single part", () => {
    const filename = generateExportFilename(projectInfo, "T1", 1);

    expect(filename).toBe("Mustermann_P2024-001.dxf");
  });

  // F6 AC: Sonderzeichen werden bereinigt (Umlaute, Leerzeichen)
  it("sanitizes umlauts in filename", () => {
    const info: ProjectInfo = {
      customerName: "M\u00FCller",
      projectNumber: "Pr\u00FCf-\u00C4nderung",
    };

    const filename = generateExportFilename(info, "T1", 1);

    expect(filename).not.toContain("\u00FC");
    expect(filename).not.toContain("\u00C4");
    expect(filename).toContain("Mueller");
    expect(filename).toContain("Ae");
  });

  it("replaces spaces with underscores", () => {
    const info: ProjectInfo = {
      customerName: "Max Mustermann",
      projectNumber: "P 001",
    };

    const filename = generateExportFilename(info, "T1", 1);

    expect(filename).not.toContain(" ");
    expect(filename).toContain("Max_Mustermann");
  });

  it("handles special characters in customer name", () => {
    const info: ProjectInfo = {
      customerName: "Firma & Co. GmbH",
      projectNumber: "123/456",
    };

    const filename = generateExportFilename(info, "T2", 2);

    expect(filename).toMatch(/\.dxf$/);
    // Should not contain special chars like &, ., /
    expect(filename).not.toContain("&");
    expect(filename).not.toContain("/");
  });

  it("falls back to 'Export' for empty customer name", () => {
    const info: ProjectInfo = {
      customerName: "   ",
      projectNumber: "   ",
    };

    const filename = generateExportFilename(info, "T1", 1);

    expect(filename).toContain("Export");
    expect(filename).toMatch(/\.dxf$/);
  });
});
