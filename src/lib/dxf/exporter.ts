/**
 * DXF R12 ASCII Exporter.
 *
 * Pure function: classified DxfEntityV2[] + ProjectInfo + PartDefinition -> DXF string.
 * No external dependencies.
 *
 * Produces a valid DXF R12 ASCII file with:
 * - HEADER section (minimal, $ACADVER AC1009)
 * - TABLES section (layer definitions with ACI colors)
 * - ENTITIES section (LINE, CIRCLE, ARC, LWPOLYLINE, TEXT)
 * - EOF marker
 *
 * Reference: docs/ARCHITECTURE.md "src/lib/dxf/exporter.ts"
 */

import type { DxfEntityV2 } from "@/types/dxf-v2";
import type { ProjectInfo, PartDefinition } from "@/types/project";
import { LAYER_CONFIGS } from "@/types/classification";

// ---- Public API --------------------------------------------------------

/**
 * Export classified entities as a DXF R12 ASCII string.
 *
 * @param entities - Classified DxfEntityV2 array (one part)
 * @param projectInfo - Customer/project info for filename generation
 * @param part - Part definition (for filename generation)
 * @returns DXF R12 ASCII string
 */
export function exportDxf(
  entities: DxfEntityV2[],
  _projectInfo?: ProjectInfo,
  _part?: PartDefinition,
): string {
  const lines: string[] = [];

  writeHeader(lines);
  writeTables(lines, entities);
  writeEntities(lines, entities);
  writeEof(lines);

  return lines.join("\n");
}

/**
 * Generate a DXF export filename following the naming convention.
 *
 * Pattern:
 * - Multiple parts: [Kunde]_[Projekt]-T1.dxf, -T2.dxf, ...
 * - Single part: [Kunde]_[Projekt].dxf (no -T1 suffix)
 *
 * @param projectInfo - Customer/project info
 * @param partName - Part name (e.g. "T1")
 * @param totalParts - Total number of parts
 * @returns Sanitized filename
 */
export function generateExportFilename(
  projectInfo: ProjectInfo,
  partName: string,
  totalParts: number,
): string {
  const customer = sanitizeFilenameSegment(projectInfo.customerName);
  const project = sanitizeFilenameSegment(projectInfo.projectNumber);

  if (totalParts <= 1) {
    return `${customer}_${project}.dxf`;
  }

  return `${customer}_${project}-${partName}.dxf`;
}

// ---- HEADER section ----------------------------------------------------

function writeHeader(lines: string[]): void {
  lines.push("0", "SECTION");
  lines.push("2", "HEADER");

  // $ACADVER: R12
  lines.push("9", "$ACADVER");
  lines.push("1", "AC1009");

  // $INSUNITS: millimeters (4)
  lines.push("9", "$INSUNITS");
  lines.push("70", "4");

  lines.push("0", "ENDSEC");
}

// ---- TABLES section ----------------------------------------------------

function writeTables(lines: string[], entities: DxfEntityV2[]): void {
  lines.push("0", "SECTION");
  lines.push("2", "TABLES");

  // LTYPE table (line types used)
  writeLinetypeTable(lines);

  // LAYER table
  writeLayerTable(lines, entities);

  lines.push("0", "ENDSEC");
}

function writeLinetypeTable(lines: string[]): void {
  lines.push("0", "TABLE");
  lines.push("2", "LTYPE");
  lines.push("70", "1"); // Number of entries (approximate)

  // CONTINUOUS linetype
  lines.push("0", "LTYPE");
  lines.push("2", "CONTINUOUS");
  lines.push("70", "0");
  lines.push("3", "Solid line");
  lines.push("72", "65"); // Alignment code
  lines.push("73", "0"); // Number of dash-length items
  lines.push("40", "0.0"); // Total pattern length

  lines.push("0", "ENDTAB");
}

function writeLayerTable(lines: string[], entities: DxfEntityV2[]): void {
  // Collect layers actually used in entities
  const usedLayers = new Set(entities.map((e) => e.layer));

  // Always include the three classification layers
  for (const config of LAYER_CONFIGS) {
    usedLayers.add(config.layerName);
  }

  lines.push("0", "TABLE");
  lines.push("2", "LAYER");
  lines.push("70", String(usedLayers.size));

  for (const layerName of usedLayers) {
    const config = LAYER_CONFIGS.find((c) => c.layerName === layerName);
    const aciColor = config?.aciNumber ?? 7;

    lines.push("0", "LAYER");
    lines.push("2", layerName);
    lines.push("70", "0"); // Standard flags
    lines.push("62", String(aciColor));
    lines.push("6", "CONTINUOUS");
  }

  lines.push("0", "ENDTAB");
}

// ---- ENTITIES section --------------------------------------------------

function writeEntities(lines: string[], entities: DxfEntityV2[]): void {
  lines.push("0", "SECTION");
  lines.push("2", "ENTITIES");

  for (const entity of entities) {
    writeEntity(lines, entity);
  }

  lines.push("0", "ENDSEC");
}

function writeEntity(lines: string[], entity: DxfEntityV2): void {
  switch (entity.type) {
    case "LINE":
      writeLine(lines, entity);
      break;
    case "CIRCLE":
      writeCircle(lines, entity);
      break;
    case "ARC":
      writeArc(lines, entity);
      break;
    case "LWPOLYLINE":
      writeLwPolyline(lines, entity);
      break;
    case "TEXT":
      writeText(lines, entity);
      break;
    // DIMENSION entities are not exported (they should be cleaned out)
    default:
      break;
  }
}

function writeCommonProps(lines: string[], entity: DxfEntityV2): void {
  lines.push("8", entity.layer);
  if (entity.color !== 7 && entity.color !== 256) {
    lines.push("62", String(entity.color));
  }
  if (entity.linetype !== "CONTINUOUS") {
    lines.push("6", entity.linetype);
  }
}

function writeLine(lines: string[], entity: DxfEntityV2): void {
  const { x1, y1, x2, y2 } = entity.coordinates;
  lines.push("0", "LINE");
  writeCommonProps(lines, entity);
  lines.push("10", formatFloat(x1 ?? 0));
  lines.push("20", formatFloat(y1 ?? 0));
  lines.push("30", "0.0");
  lines.push("11", formatFloat(x2 ?? 0));
  lines.push("21", formatFloat(y2 ?? 0));
  lines.push("31", "0.0");
}

function writeCircle(lines: string[], entity: DxfEntityV2): void {
  const { cx, cy, r } = entity.coordinates;
  lines.push("0", "CIRCLE");
  writeCommonProps(lines, entity);
  lines.push("10", formatFloat(cx ?? 0));
  lines.push("20", formatFloat(cy ?? 0));
  lines.push("30", "0.0");
  lines.push("40", formatFloat(r ?? 0));
}

function writeArc(lines: string[], entity: DxfEntityV2): void {
  const { cx, cy, r, startAngle, endAngle } = entity.coordinates;
  lines.push("0", "ARC");
  writeCommonProps(lines, entity);
  lines.push("10", formatFloat(cx ?? 0));
  lines.push("20", formatFloat(cy ?? 0));
  lines.push("30", "0.0");
  lines.push("40", formatFloat(r ?? 0));
  lines.push("50", formatFloat(startAngle ?? 0));
  lines.push("51", formatFloat(endAngle ?? 360));
}

function writeLwPolyline(lines: string[], entity: DxfEntityV2): void {
  const points = entity.coordinates.points ?? [];
  if (points.length === 0) return;

  lines.push("0", "LWPOLYLINE");
  writeCommonProps(lines, entity);
  lines.push("90", String(points.length));
  lines.push("70", entity.closed ? "1" : "0");

  for (const pt of points) {
    lines.push("10", formatFloat(pt.x));
    lines.push("20", formatFloat(pt.y));
  }
}

function writeText(lines: string[], entity: DxfEntityV2): void {
  const { x, y, text, height } = entity.coordinates;
  if (!text) return;

  lines.push("0", "TEXT");
  writeCommonProps(lines, entity);
  lines.push("10", formatFloat(x ?? 0));
  lines.push("20", formatFloat(y ?? 0));
  lines.push("30", "0.0");
  lines.push("40", formatFloat(height ?? 1));
  lines.push("1", text);
}

// ---- EOF ---------------------------------------------------------------

function writeEof(lines: string[]): void {
  lines.push("0", "EOF");
}

// ---- Helpers -----------------------------------------------------------

/**
 * Format a floating point number for DXF output.
 * Uses up to 6 decimal places, removing trailing zeros.
 */
function formatFloat(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, "") || "0";
}

/**
 * Sanitize a string for use in a filename.
 * Replaces umlauts, removes special characters, replaces spaces with underscores.
 */
function sanitizeFilenameSegment(input: string): string {
  let result = input.trim();

  // Replace German umlauts
  const umlautMap: Record<string, string> = {
    ae: "ae",
    oe: "oe",
    ue: "ue",
    Ae: "Ae",
    Oe: "Oe",
    Ue: "Ue",
    ss: "ss",
    "\u00E4": "ae",
    "\u00F6": "oe",
    "\u00FC": "ue",
    "\u00C4": "Ae",
    "\u00D6": "Oe",
    "\u00DC": "Ue",
    "\u00DF": "ss",
  };

  for (const [char, replacement] of Object.entries(umlautMap)) {
    result = result.split(char).join(replacement);
  }

  // Replace spaces and special characters with underscores
  result = result.replace(/[^a-zA-Z0-9_-]/g, "_");

  // Collapse multiple underscores
  result = result.replace(/_+/g, "_");

  // Remove leading/trailing underscores
  result = result.replace(/^_+|_+$/g, "");

  return result || "Export";
}
