/**
 * DXF Auto-Cleaning Module.
 *
 * Pure function: DxfEntityV2[] in, cleaned DxfEntityV2[] + CleanReport out.
 * No external dependencies.
 *
 * Cleaning rules (applied in order):
 * 1. Remove DIMENSION entities
 * 2. Remove dashed/hidden circles and arcs (thread helpers)
 *    Exception: full circles with CONTINUOUS linetype are kept
 * 3. Remove duplicates (same type + same coordinates, tolerance ~0.01)
 * 4. Remove zero-length lines (start === end)
 * 5. Remove empty layers (no remaining entities)
 *
 * Reference: docs/ARCHITECTURE.md "src/lib/dxf/cleaner.ts"
 */

import type { DxfEntityV2, CleanReport } from "@/types/dxf-v2";

// ---- Public Types ------------------------------------------------------

export type { CleanReport };

/** Result of the cleaning operation */
export interface CleanResult {
  cleaned: DxfEntityV2[];
  report: CleanReport;
}

// ---- Public API --------------------------------------------------------

/** Coordinate comparison tolerance (in DXF units, ~0.01 mm) */
const TOLERANCE = 0.01;

/**
 * Clean a set of DXF entities by removing unnecessary elements.
 *
 * @param entities - DxfEntityV2 array (typically for one part)
 * @returns CleanResult with cleaned entities and a report
 */
export function cleanEntities(entities: DxfEntityV2[]): CleanResult {
  const report: CleanReport = {
    removedDimensions: 0,
    removedThreadHelpers: 0,
    removedDuplicates: 0,
    removedZeroLines: 0,
    removedEmptyLayers: [],
    totalRemoved: 0,
  };

  let result = [...entities];

  // Step 1: Remove DIMENSION entities
  const beforeDimensions = result.length;
  result = result.filter((e) => e.type !== "DIMENSION");
  report.removedDimensions = beforeDimensions - result.length;

  // Step 2: Remove dashed/hidden circles and arcs (thread helpers)
  const beforeThread = result.length;
  result = result.filter((e) => !isThreadHelper(e));
  report.removedThreadHelpers = beforeThread - result.length;

  // Step 3: Remove duplicates
  const beforeDuplicates = result.length;
  result = removeDuplicates(result);
  report.removedDuplicates = beforeDuplicates - result.length;

  // Step 4: Remove zero-length lines
  const beforeZeroLines = result.length;
  result = result.filter((e) => !isZeroLengthLine(e));
  report.removedZeroLines = beforeZeroLines - result.length;

  // Step 5: Detect empty layers (informational -- entities are already filtered)
  const layersBefore = collectLayers(entities);
  const layersAfter = collectLayers(result);
  report.removedEmptyLayers = layersBefore.filter(
    (l) => !layersAfter.includes(l),
  );

  report.totalRemoved =
    report.removedDimensions +
    report.removedThreadHelpers +
    report.removedDuplicates +
    report.removedZeroLines;

  return { cleaned: result, report };
}

// ---- Rule 2: Thread helper detection -----------------------------------

/** Dashed/hidden linetype names (case-insensitive matching) */
const DASHED_LINETYPES = new Set(["DASHED", "HIDDEN", "DASHDOT", "CENTER"]);

/**
 * Determine if an entity is a thread helper line (should be removed).
 * Thread helpers are dashed/hidden circles (arcs), NOT full continuous circles.
 */
function isThreadHelper(entity: DxfEntityV2): boolean {
  const lt = entity.linetype.toUpperCase();

  if (!DASHED_LINETYPES.has(lt)) {
    return false;
  }

  // Dashed circles and arcs are thread helpers
  if (entity.type === "CIRCLE" || entity.type === "ARC") {
    return true;
  }

  return false;
}

// ---- Rule 3: Duplicate detection ---------------------------------------

/**
 * Remove geometrically identical entities.
 * Two entities are duplicates if they have the same type
 * and their coordinates match within TOLERANCE.
 */
function removeDuplicates(entities: DxfEntityV2[]): DxfEntityV2[] {
  const kept: DxfEntityV2[] = [];

  for (const entity of entities) {
    const isDuplicate = kept.some((existing) =>
      areGeometricallyEqual(existing, entity),
    );
    if (!isDuplicate) {
      kept.push(entity);
    }
  }

  return kept;
}

function areGeometricallyEqual(a: DxfEntityV2, b: DxfEntityV2): boolean {
  if (a.type !== b.type) return false;

  switch (a.type) {
    case "LINE":
      return (
        nearEqual(a.coordinates.x1, b.coordinates.x1) &&
        nearEqual(a.coordinates.y1, b.coordinates.y1) &&
        nearEqual(a.coordinates.x2, b.coordinates.x2) &&
        nearEqual(a.coordinates.y2, b.coordinates.y2)
      );

    case "CIRCLE":
      return (
        nearEqual(a.coordinates.cx, b.coordinates.cx) &&
        nearEqual(a.coordinates.cy, b.coordinates.cy) &&
        nearEqual(a.coordinates.r, b.coordinates.r)
      );

    case "ARC":
      return (
        nearEqual(a.coordinates.cx, b.coordinates.cx) &&
        nearEqual(a.coordinates.cy, b.coordinates.cy) &&
        nearEqual(a.coordinates.r, b.coordinates.r) &&
        nearEqual(a.coordinates.startAngle, b.coordinates.startAngle) &&
        nearEqual(a.coordinates.endAngle, b.coordinates.endAngle)
      );

    case "LWPOLYLINE": {
      const ptsA = a.coordinates.points ?? [];
      const ptsB = b.coordinates.points ?? [];
      if (ptsA.length !== ptsB.length) return false;
      return ptsA.every(
        (p, i) => nearEqual(p.x, ptsB[i].x) && nearEqual(p.y, ptsB[i].y),
      );
    }

    case "TEXT":
      return (
        nearEqual(a.coordinates.x, b.coordinates.x) &&
        nearEqual(a.coordinates.y, b.coordinates.y) &&
        a.coordinates.text === b.coordinates.text
      );

    default:
      return false;
  }
}

function nearEqual(a: number | undefined, b: number | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return Math.abs(a - b) < TOLERANCE;
}

// ---- Rule 4: Zero-length line detection --------------------------------

function isZeroLengthLine(entity: DxfEntityV2): boolean {
  if (entity.type !== "LINE") return false;

  const { x1, y1, x2, y2 } = entity.coordinates;
  if (x1 === undefined || y1 === undefined) return false;
  if (x2 === undefined || y2 === undefined) return false;

  return (
    Math.abs(x1 - x2) < TOLERANCE && Math.abs(y1 - y2) < TOLERANCE
  );
}

// ---- Helpers -----------------------------------------------------------

function collectLayers(entities: DxfEntityV2[]): string[] {
  return [...new Set(entities.map((e) => e.layer))].sort();
}
