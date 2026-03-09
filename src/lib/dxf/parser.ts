/**
 * DXF R12 ASCII Parser.
 *
 * Pure function: string in, ParseResult out.
 * No external dependencies -- hand-written parser for full control
 * over the R12 ASCII format.
 *
 * Supported entity types: LINE, CIRCLE, ARC, LWPOLYLINE, TEXT, DIMENSION
 * (DIMENSION is parsed so the cleaner can remove it; it has no coordinates.)
 *
 * Reference: docs/ARCHITECTURE.md "src/lib/dxf/parser.ts"
 */

import type {
  DxfEntityV2,
  DxfEntityType,
  EntityCoordinates,
  ParseResult,
  ParseStats,
} from "@/types/dxf-v2";

// ---- Public API --------------------------------------------------------

/**
 * Parse a DXF R12 ASCII string into entities and statistics.
 *
 * @param content - Raw DXF file content as string
 * @returns ParseResult with entities and stats
 * @throws Error if the file is binary DXF or completely unparseable
 */
/** Maximum file size in bytes (50 MB) */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Maximum number of entities before a warning is issued */
const MAX_ENTITY_COUNT = 100_000;

export function parseDxf(content: string): ParseResult {
  // Reject oversized files
  if (content.length > MAX_FILE_SIZE) {
    throw new Error("Datei zu gross (max. 50 MB)");
  }

  // Reject binary DXF (starts with "AutoCAD Binary DXF" sentinel)
  if (isBinaryDxf(content)) {
    throw new Error(
      "Binaere DXF-Dateien werden nicht unterstuetzt. Bitte als ASCII R12 DXF speichern.",
    );
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new Error("Die DXF-Datei ist leer.");
  }

  // Split into lines (handle \r\n and \n)
  const lines = trimmed.split(/\r?\n/);

  // Find ENTITIES section
  const entitiesStart = findSectionStart(lines, "ENTITIES");
  if (entitiesStart === -1) {
    throw new Error(
      "Keine ENTITIES-Sektion in der DXF-Datei gefunden. Ist die Datei ein gueltiges DXF R12?",
    );
  }

  // Parse entities
  const warnings: string[] = [];
  const entities = parseEntitiesSection(lines, entitiesStart, warnings);

  if (entities.length === 0) {
    warnings.push("Keine Entitaeten in der DXF-Datei gefunden.");
  }

  if (entities.length > MAX_ENTITY_COUNT) {
    warnings.push(
      `Sehr viele Entitaeten (${entities.length}). Die Verarbeitung kann langsam sein.`,
    );
  }

  // Build statistics
  const stats = buildStats(entities, warnings);

  return { entities, stats };
}

// ---- Binary detection --------------------------------------------------

function isBinaryDxf(content: string): boolean {
  // Binary DXF files start with "AutoCAD Binary DXF\r\n\x1a\x00"
  return content.startsWith("AutoCAD Binary DXF");
}

// ---- Section finding ---------------------------------------------------

/**
 * Find the line index where a named section starts.
 * DXF sections begin with group code 0 / value "SECTION",
 * followed by group code 2 / value <sectionName>.
 */
function findSectionStart(lines: string[], sectionName: string): number {
  for (let i = 0; i < lines.length - 3; i++) {
    if (
      lines[i].trim() === "0" &&
      lines[i + 1].trim() === "SECTION" &&
      lines[i + 2].trim() === "2" &&
      lines[i + 3].trim() === sectionName
    ) {
      return i + 4; // Return index after the section header
    }
  }
  return -1;
}

// ---- Group code pair reading -------------------------------------------

interface GroupPair {
  code: number;
  value: string;
}

/**
 * Read group-code pairs starting at `index`.
 * Returns all pairs until the next entity start (code 0) or ENDSEC.
 * Also returns the line index where reading stopped.
 */
function readEntityPairs(
  lines: string[],
  startIndex: number,
): { pairs: GroupPair[]; nextIndex: number } {
  const pairs: GroupPair[] = [];
  let i = startIndex;

  while (i < lines.length - 1) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1].trim();

    // If we hit another entity start (code 0), stop here
    if (code === 0 && pairs.length > 0) {
      break;
    }

    pairs.push({ code, value });
    i += 2;

    // If this was code 0 (the entity type header), continue reading its properties
    if (code === 0) {
      continue;
    }
  }

  return { pairs, nextIndex: i };
}

// ---- Entity parsing ----------------------------------------------------

const SUPPORTED_TYPES = new Set<string>([
  "LINE",
  "CIRCLE",
  "ARC",
  "LWPOLYLINE",
  "TEXT",
  "DIMENSION",
  "POLYLINE", // Treated as LWPOLYLINE
]);

function parseEntitiesSection(
  lines: string[],
  startIndex: number,
  warnings: string[],
): DxfEntityV2[] {
  const entities: DxfEntityV2[] = [];
  let id = 0;
  let i = startIndex;

  while (i < lines.length - 1) {
    const codeLine = lines[i].trim();
    const valueLine = lines[i + 1].trim();

    // Check for end of section
    if (codeLine === "0" && valueLine === "ENDSEC") {
      break;
    }

    // Check for EOF
    if (codeLine === "0" && valueLine === "EOF") {
      break;
    }

    // We expect code 0 for entity type
    if (codeLine !== "0") {
      i++;
      continue;
    }

    const entityType = valueLine;

    // Skip VERTEX/SEQEND (part of POLYLINE but handled differently)
    if (entityType === "VERTEX" || entityType === "SEQEND") {
      i += 2;
      continue;
    }

    if (!SUPPORTED_TYPES.has(entityType)) {
      if (entityType !== "SECTION" && entityType !== "ENDSEC") {
        warnings.push(`Uebersprungener Entity-Typ: ${entityType}`);
      }
      // Skip to next code-0 pair
      i += 2;
      while (i < lines.length - 1) {
        if (lines[i].trim() === "0") break;
        i += 2;
      }
      continue;
    }

    // Read all group-code pairs for this entity
    const { pairs, nextIndex } = readEntityPairs(lines, i);
    i = nextIndex;

    // Handle POLYLINE entities (old-style, converted to LWPOLYLINE)
    if (entityType === "POLYLINE") {
      const entity = parsePolylineEntity(pairs, lines, i, id, warnings);
      if (entity) {
        entities.push(entity.entity);
        id++;
        i = entity.nextIndex;
      }
      continue;
    }

    const entity = parseEntity(entityType, pairs, id, warnings);
    if (entity) {
      entities.push(entity);
      id++;
    }
  }

  return entities;
}

/**
 * Parse a single entity from its group-code pairs.
 */
function parseEntity(
  entityType: string,
  pairs: GroupPair[],
  id: number,
  warnings: string[],
): DxfEntityV2 | null {
  // Extract common properties
  const layer = getStringValue(pairs, 8) ?? "0";
  const color = getIntValue(pairs, 62) ?? 7;
  const linetype = getStringValue(pairs, 6) ?? "CONTINUOUS";

  let type: DxfEntityType;
  let coordinates: EntityCoordinates = {};
  let length = 0;
  let closed: boolean | undefined;

  switch (entityType) {
    case "LINE": {
      type = "LINE";
      const x1 = getFloatValue(pairs, 10) ?? 0;
      const y1 = getFloatValue(pairs, 20) ?? 0;
      const x2 = getFloatValue(pairs, 11) ?? 0;
      const y2 = getFloatValue(pairs, 21) ?? 0;
      coordinates = { x1, y1, x2, y2 };
      length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      break;
    }

    case "CIRCLE": {
      type = "CIRCLE";
      const cx = getFloatValue(pairs, 10) ?? 0;
      const cy = getFloatValue(pairs, 20) ?? 0;
      const r = getFloatValue(pairs, 40) ?? 0;
      coordinates = { cx, cy, r };
      length = 2 * Math.PI * r;
      closed = true;
      break;
    }

    case "ARC": {
      type = "ARC";
      const cx = getFloatValue(pairs, 10) ?? 0;
      const cy = getFloatValue(pairs, 20) ?? 0;
      const r = getFloatValue(pairs, 40) ?? 0;
      const startAngle = getFloatValue(pairs, 50) ?? 0;
      const endAngle = getFloatValue(pairs, 51) ?? 360;
      coordinates = { cx, cy, r, startAngle, endAngle };
      length = calculateArcLength(r, startAngle, endAngle);
      break;
    }

    case "LWPOLYLINE": {
      type = "LWPOLYLINE";
      const points = extractPolylinePoints(pairs);
      const closedFlag = getIntValue(pairs, 70) ?? 0;
      closed = (closedFlag & 1) === 1;
      coordinates = { points };
      length = calculatePolylineLength(points, closed);
      break;
    }

    case "TEXT": {
      type = "TEXT";
      const x = getFloatValue(pairs, 10) ?? 0;
      const y = getFloatValue(pairs, 20) ?? 0;
      const text = getStringValue(pairs, 1) ?? "";
      const height = getFloatValue(pairs, 40) ?? 1;
      coordinates = { x, y, text, height };
      length = 0;
      break;
    }

    case "DIMENSION": {
      type = "DIMENSION";
      // Dimensions are parsed so the cleaner can remove them.
      // We don't extract geometry -- just mark them.
      coordinates = {};
      length = 0;
      break;
    }

    default:
      warnings.push(`Unbekannter Entity-Typ beim Parsen: ${entityType}`);
      return null;
  }

  return {
    id,
    type,
    layer,
    color,
    linetype,
    coordinates,
    length,
    ...(closed !== undefined ? { closed } : {}),
  };
}

// ---- Old-style POLYLINE parsing ----------------------------------------

/**
 * Parse an old-style POLYLINE entity (with VERTEX sub-entities).
 * Converts it to an LWPOLYLINE DxfEntityV2.
 */
function parsePolylineEntity(
  headerPairs: GroupPair[],
  lines: string[],
  startIndex: number,
  id: number,
  warnings: string[],
): { entity: DxfEntityV2; nextIndex: number } | null {
  const layer = getStringValue(headerPairs, 8) ?? "0";
  const color = getIntValue(headerPairs, 62) ?? 7;
  const linetype = getStringValue(headerPairs, 6) ?? "CONTINUOUS";
  const closedFlag = getIntValue(headerPairs, 70) ?? 0;
  const closed = (closedFlag & 1) === 1;

  const points: Array<{ x: number; y: number }> = [];
  let i = startIndex;

  // Read VERTEX entities until SEQEND
  while (i < lines.length - 1) {
    const code = lines[i].trim();
    const value = lines[i + 1].trim();

    if (code === "0" && value === "SEQEND") {
      i += 2;
      // Skip SEQEND's own pairs
      while (i < lines.length - 1 && lines[i].trim() !== "0") {
        i += 2;
      }
      break;
    }

    if (code === "0" && value === "VERTEX") {
      const { pairs, nextIndex } = readEntityPairs(lines, i);
      const x = getFloatValue(pairs, 10) ?? 0;
      const y = getFloatValue(pairs, 20) ?? 0;
      points.push({ x, y });
      i = nextIndex;
      continue;
    }

    // Skip unexpected content
    if (code === "0") {
      // Hit something that's not VERTEX or SEQEND -- stop
      break;
    }

    i += 2;
  }

  if (points.length < 2) {
    warnings.push("POLYLINE mit weniger als 2 Punkten uebersprungen.");
    return null;
  }

  const length = calculatePolylineLength(points, closed);

  return {
    entity: {
      id,
      type: "LWPOLYLINE",
      layer,
      color,
      linetype,
      coordinates: { points },
      length,
      closed,
    },
    nextIndex: i,
  };
}

// ---- Helper: group-code value extraction --------------------------------

function getStringValue(pairs: GroupPair[], code: number): string | undefined {
  const pair = pairs.find((p) => p.code === code);
  return pair?.value;
}

function getIntValue(pairs: GroupPair[], code: number): number | undefined {
  const pair = pairs.find((p) => p.code === code);
  if (pair === undefined) return undefined;
  const val = parseInt(pair.value, 10);
  return isNaN(val) ? undefined : val;
}

function getFloatValue(pairs: GroupPair[], code: number): number | undefined {
  const pair = pairs.find((p) => p.code === code);
  if (pair === undefined) return undefined;
  const val = parseFloat(pair.value);
  return isNaN(val) ? undefined : val;
}

/**
 * Extract LWPOLYLINE points from group-code pairs.
 * Points are defined by multiple code-10/20 pairs in sequence.
 */
function extractPolylinePoints(
  pairs: GroupPair[],
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const xValues: number[] = [];
  const yValues: number[] = [];

  for (const pair of pairs) {
    if (pair.code === 10) {
      xValues.push(parseFloat(pair.value) || 0);
    } else if (pair.code === 20) {
      yValues.push(parseFloat(pair.value) || 0);
    }
  }

  const count = Math.min(xValues.length, yValues.length);
  for (let i = 0; i < count; i++) {
    points.push({ x: xValues[i], y: yValues[i] });
  }

  return points;
}

// ---- Geometry calculations ---------------------------------------------

function calculateArcLength(
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): number {
  let angleDiff = endAngleDeg - startAngleDeg;
  if (angleDiff <= 0) {
    angleDiff += 360;
  }
  return (angleDiff / 360) * 2 * Math.PI * radius;
}

function calculatePolylineLength(
  points: Array<{ x: number; y: number }>,
  closed?: boolean,
): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  // Add closing segment if polyline is closed
  if (closed && points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    const dx = first.x - last.x;
    const dy = first.y - last.y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

// ---- Statistics --------------------------------------------------------

function buildStats(entities: DxfEntityV2[], warnings: string[]): ParseStats {
  const byType: Record<string, number> = {};
  const layerSet = new Set<string>();

  for (const entity of entities) {
    byType[entity.type] = (byType[entity.type] ?? 0) + 1;
    layerSet.add(entity.layer);
  }

  return {
    totalEntities: entities.length,
    byType,
    layers: Array.from(layerSet).sort(),
    warnings,
  };
}
