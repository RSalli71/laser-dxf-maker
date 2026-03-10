/**
 * DXF Auto-Cleaning Module.
 *
 * Pure function: DxfEntityV2[] in, cleaned DxfEntityV2[] + CleanReport out.
 * No external dependencies.
 *
 * Cleaning rules (priority order):
 * 0. Remove entities from known helper blocks (sourceBlock matching)
 *    - SW_CENTERMARKSYMBOL* (Mittelpunktmarkierungen)
 *    - SW_SFSYMBOL* (Oberflaechensymbole)
 *    - SW_NOTE* (Notizrahmen)
 *    - Schriftkopf (Zeichnungsrahmen)
 * 1. Remove DIMENSION entities
 * 2. Remove entities with non-CONTINUOUS linetype (CENTER, DASHED, HIDDEN, DASHDOT)
 * 3. Remove thread indicator ARCs (near-full-circle arcs concentric with a CIRCLE)
 * 4. Remove cross-patterns: 3+ short lines emanating from a common point
 * 5. Remove duplicates (same type + same coordinates, tolerance ~0.01)
 * 6. Remove zero-length lines (start === end)
 * 7. Detect empty layers (informational)
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

/** Spatial grouping tolerance for thread/cross detection (~1 DXF unit) */
const SPATIAL_TOLERANCE = 1.0;

/**
 * Clean a set of DXF entities by removing unnecessary elements.
 *
 * @param entities - DxfEntityV2 array (typically for one part)
 * @returns CleanResult with cleaned entities and a report
 */
export function cleanEntities(entities: DxfEntityV2[]): CleanResult {
  const report: CleanReport = {
    removedHelperBlocks: 0,
    removedDimensions: 0,
    removedThreadHelpers: 0,
    removedThreadArcs: 0,
    removedThreadSplines: 0,
    removedCrossPatterns: 0,
    removedDuplicates: 0,
    removedZeroLines: 0,
    removedEmptyLayers: [],
    totalRemoved: 0,
  };

  let result = [...entities];

  // Step 0: Remove entities from known helper blocks (highest priority)
  const beforeBlocks = result.length;
  result = result.filter((e) => !isFromHelperBlock(e));
  report.removedHelperBlocks = beforeBlocks - result.length;

  // Step 1: Remove DIMENSION entities
  const beforeDimensions = result.length;
  result = result.filter((e) => e.type !== "DIMENSION");
  report.removedDimensions = beforeDimensions - result.length;

  // Step 2: Remove non-CONTINUOUS linetype entities (helper/construction lines)
  const beforeThread = result.length;
  result = result.filter((e) => !isNonContinuousHelper(e));
  report.removedThreadHelpers = beforeThread - result.length;

  // Step 3: Remove thread indicator ARCs (concentric with CIRCLE, near-full span)
  const beforeThreadArcs = result.length;
  result = removeThreadArcs(result);
  report.removedThreadArcs = beforeThreadArcs - result.length;

  // Step 3b: Remove open SPLINEs near bore holes/slots (thread indicator cosmetics)
  const beforeThreadSplines = result.length;
  result = removeThreadSplines(result);
  report.removedThreadSplines = beforeThreadSplines - result.length;

  // Step 4: Remove cross-patterns (geometric detection, supporting signal)
  const beforeCross = result.length;
  result = removeCrossPatterns(result);
  report.removedCrossPatterns = beforeCross - result.length;

  // Step 5: Remove duplicates
  const beforeDuplicates = result.length;
  result = removeDuplicates(result);
  report.removedDuplicates = beforeDuplicates - result.length;

  // Step 6: Remove zero-length lines
  const beforeZeroLines = result.length;
  result = result.filter((e) => !isZeroLengthLine(e));
  report.removedZeroLines = beforeZeroLines - result.length;

  // Step 7: Detect empty layers (informational)
  const layersBefore = collectLayers(entities);
  const layersAfter = collectLayers(result);
  report.removedEmptyLayers = layersBefore.filter(
    (l) => !layersAfter.includes(l),
  );

  report.totalRemoved =
    report.removedHelperBlocks +
    report.removedDimensions +
    report.removedThreadHelpers +
    report.removedThreadArcs +
    report.removedThreadSplines +
    report.removedCrossPatterns +
    report.removedDuplicates +
    report.removedZeroLines;

  return { cleaned: result, report };
}

// ---- Rule 0: Helper block detection ------------------------------------

/**
 * Known helper block name prefixes (case-insensitive).
 * Entities resolved from INSERT blocks matching these patterns
 * are purely visual CAD aids and irrelevant for laser cutting.
 */
const HELPER_BLOCK_PREFIXES = [
  "SW_CENTERMARKSYMBOL",
  "SW_CENTERLINE",
  "SW_SFSYMBOL",
  "SW_NOTE",
  "SCHRIFTKOPF",
];

function isFromHelperBlock(entity: DxfEntityV2): boolean {
  if (!entity.sourceBlock) return false;
  const upper = entity.sourceBlock.toUpperCase();
  return HELPER_BLOCK_PREFIXES.some((prefix) => upper.startsWith(prefix));
}

// ---- Rule 2: Non-CONTINUOUS linetype detection -------------------------

/** Dashed/hidden linetype names (case-insensitive matching) */
const DASHED_LINETYPES = new Set(["DASHED", "HIDDEN", "DASHDOT", "CENTER"]);

/**
 * Determine if an entity is a helper/construction line (should be removed).
 * Any entity with a non-CONTINUOUS linetype is considered a helper.
 * For laser cutting, only CONTINUOUS geometry is relevant.
 */
function isNonContinuousHelper(entity: DxfEntityV2): boolean {
  const lt = entity.linetype.toUpperCase();
  return DASHED_LINETYPES.has(lt);
}

// ---- Rule 3: Thread indicator ARC detection ----------------------------

/**
 * Minimum arc span (in degrees) to be considered a thread indicator.
 * Thread arcs in technical drawings typically span ~270° (e.g. 75°-345°).
 * We use 240° as threshold to catch variants.
 */
const THREAD_ARC_MIN_SPAN = 240;

/**
 * Remove thread indicator ARCs.
 *
 * A thread indicator ARC is detected when:
 * - The ARC spans > 240° (near-full circle)
 * - A CIRCLE exists at (approximately) the same center with smaller radius
 *
 * The CIRCLE is the actual bore hole (kept), the ARC is the thread
 * outer diameter visualization (removed).
 */
function removeThreadArcs(entities: DxfEntityV2[]): DxfEntityV2[] {
  // Collect circle centers for spatial lookup
  const circleCenters: Array<{ cx: number; cy: number; r: number }> = [];
  for (const e of entities) {
    if (e.type === "CIRCLE") {
      circleCenters.push({
        cx: e.coordinates.cx ?? 0,
        cy: e.coordinates.cy ?? 0,
        r: e.coordinates.r ?? 0,
      });
    }
  }

  if (circleCenters.length === 0) return entities;

  const threadArcIds = new Set<number>();

  for (const e of entities) {
    if (e.type !== "ARC") continue;

    const startAngle = e.coordinates.startAngle ?? 0;
    const endAngle = e.coordinates.endAngle ?? 360;
    let span = endAngle - startAngle;
    if (span <= 0) span += 360;

    if (span < THREAD_ARC_MIN_SPAN) continue;

    // Check if a smaller circle exists at the same center
    const arcCx = e.coordinates.cx ?? 0;
    const arcCy = e.coordinates.cy ?? 0;
    const arcR = e.coordinates.r ?? 0;

    const hasConcentricCircle = circleCenters.some(
      (c) =>
        Math.abs(c.cx - arcCx) < SPATIAL_TOLERANCE &&
        Math.abs(c.cy - arcCy) < SPATIAL_TOLERANCE &&
        c.r < arcR,
    );

    if (hasConcentricCircle) {
      threadArcIds.add(e.id);
    }
  }

  if (threadArcIds.size === 0) return entities;

  return entities.filter((e) => !threadArcIds.has(e.id));
}

// ---- Rule 3b: Open SPLINE thread indicator detection -------------------

/**
 * Remove open SPLINEs that are near a concentric CIRCLE (thread indicators).
 *
 * In SolidWorks DXF exports, cosmetic thread indicators for round holes
 * are open SPLINEs surrounding the bore CIRCLE. Open SPLINEs NOT near
 * a CIRCLE are kept -- they may be engrave/marking geometry (e.g. text).
 *
 * Detection: open SPLINE whose center is within PROXIMITY of a CIRCLE center.
 */
function removeThreadSplines(entities: DxfEntityV2[]): DxfEntityV2[] {
  const circleCenters: Array<{ cx: number; cy: number }> = [];
  for (const e of entities) {
    if (e.type === "CIRCLE") {
      circleCenters.push({
        cx: e.coordinates.cx ?? 0,
        cy: e.coordinates.cy ?? 0,
      });
    }
  }

  if (circleCenters.length === 0) return entities;

  const PROXIMITY = 3.0;

  return entities.filter((e) => {
    if (e.type !== "SPLINE") return true;
    if (e.closed) return true;

    const pts = e.coordinates.points ?? [];
    if (pts.length === 0) return true;

    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

    return !circleCenters.some(
      (c) =>
        Math.abs(c.cx - cx) < PROXIMITY &&
        Math.abs(c.cy - cy) < PROXIMITY,
    );
  });
}

// ---- Rule 4: Cross-pattern detection -----------------------------------

/**
 * Maximum length for a line to be part of a cross-pattern (in DXF units).
 * Center marks are typically very short (2-10 units).
 */
const CROSS_MAX_LENGTH = 15;

/**
 * Minimum number of short lines sharing an endpoint to form a cross-pattern.
 * A typical center mark has 4 lines (cross) or 8 lines (cross + extensions).
 */
const CROSS_MIN_LINES = 3;

/**
 * Angle tolerance (in degrees) for detecting horizontal/vertical lines.
 */
const HV_ANGLE_TOLERANCE = 5;

/**
 * Length ratio tolerance: two lines of a 2-line cross must have similar length.
 * ratio = shorter / longer; must be >= this threshold.
 */
const CROSS_LENGTH_RATIO = 0.5;

/**
 * Remove cross-shaped patterns of short lines.
 *
 * Two detection strategies:
 * A) 3+ short lines sharing a common endpoint (original)
 * B) 2 short lines with the same midpoint, one ~horizontal, one ~vertical
 *    and approximately equal length (2-line cross pattern)
 *
 * Only removes LINEs -- never removes CIRCLES, ARCS, POLYLINES, etc.
 */
function removeCrossPatterns(entities: DxfEntityV2[]): DxfEntityV2[] {
  // Collect short lines and index their endpoints
  const shortLines: DxfEntityV2[] = [];
  const otherEntities: DxfEntityV2[] = [];

  for (const e of entities) {
    if (e.type === "LINE" && e.length > 0 && e.length <= CROSS_MAX_LENGTH) {
      shortLines.push(e);
    } else {
      otherEntities.push(e);
    }
  }

  if (shortLines.length < 2) {
    return entities;
  }

  const crossLineIndices = new Set<number>();

  // --- Strategy A: 3+ lines sharing an endpoint ---
  if (shortLines.length >= CROSS_MIN_LINES) {
    const cellSize = TOLERANCE * 10; // ~0.1 DXF units grouping
    const endpointMap = new Map<string, number[]>();

    for (let i = 0; i < shortLines.length; i++) {
      const line = shortLines[i];
      const { x1 = 0, y1 = 0, x2 = 0, y2 = 0 } = line.coordinates;

      for (const [x, y] of [[x1, y1], [x2, y2]]) {
        const key = `${Math.round(x / cellSize)},${Math.round(y / cellSize)}`;
        let bucket = endpointMap.get(key);
        if (!bucket) {
          bucket = [];
          endpointMap.set(key, bucket);
        }
        bucket.push(i);
      }
    }

    for (const [, indices] of endpointMap) {
      const uniqueIndices = [...new Set(indices)];
      if (uniqueIndices.length >= CROSS_MIN_LINES) {
        for (const idx of uniqueIndices) {
          crossLineIndices.add(idx);
        }
      }
    }
  }

  // --- Strategy B: 2 lines with same midpoint, one H + one V ---
  const midCellSize = SPATIAL_TOLERANCE; // ~1.0 DXF unit grouping
  const midpointMap = new Map<string, number[]>();

  for (let i = 0; i < shortLines.length; i++) {
    if (crossLineIndices.has(i)) continue; // already caught by Strategy A
    const { x1 = 0, y1 = 0, x2 = 0, y2 = 0 } = shortLines[i].coordinates;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const key = `${Math.round(mx / midCellSize)},${Math.round(my / midCellSize)}`;
    let bucket = midpointMap.get(key);
    if (!bucket) {
      bucket = [];
      midpointMap.set(key, bucket);
    }
    bucket.push(i);
  }

  for (const [, indices] of midpointMap) {
    if (indices.length < 2) continue;

    // Check all pairs for H+V cross pattern
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const lineA = shortLines[indices[a]];
        const lineB = shortLines[indices[b]];

        if (isTwoLineCross(lineA, lineB)) {
          crossLineIndices.add(indices[a]);
          crossLineIndices.add(indices[b]);
        }
      }
    }
  }

  if (crossLineIndices.size === 0) {
    return entities;
  }

  // Return non-cross entities + surviving short lines
  const survivingShortLines = shortLines.filter(
    (_, i) => !crossLineIndices.has(i),
  );
  return [...otherEntities, ...survivingShortLines];
}

/**
 * Check if two lines form a 2-line cross pattern:
 * - Similar midpoints (within SPATIAL_TOLERANCE)
 * - One is approximately horizontal, the other approximately vertical
 * - Similar lengths (ratio >= CROSS_LENGTH_RATIO)
 */
function isTwoLineCross(a: DxfEntityV2, b: DxfEntityV2): boolean {
  const { x1: ax1 = 0, y1: ay1 = 0, x2: ax2 = 0, y2: ay2 = 0 } = a.coordinates;
  const { x1: bx1 = 0, y1: by1 = 0, x2: bx2 = 0, y2: by2 = 0 } = b.coordinates;

  // Check midpoints match
  const mxA = (ax1 + ax2) / 2;
  const myA = (ay1 + ay2) / 2;
  const mxB = (bx1 + bx2) / 2;
  const myB = (by1 + by2) / 2;

  if (Math.abs(mxA - mxB) > SPATIAL_TOLERANCE) return false;
  if (Math.abs(myA - myB) > SPATIAL_TOLERANCE) return false;

  // Check length similarity
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 || lenB === 0) return false;
  const ratio = Math.min(lenA, lenB) / Math.max(lenA, lenB);
  if (ratio < CROSS_LENGTH_RATIO) return false;

  // Check one is ~horizontal and the other ~vertical
  const angleA = Math.abs(Math.atan2(ay2 - ay1, ax2 - ax1) * (180 / Math.PI));
  const angleB = Math.abs(Math.atan2(by2 - by1, bx2 - bx1) * (180 / Math.PI));

  const isHorizA = angleA <= HV_ANGLE_TOLERANCE || angleA >= (180 - HV_ANGLE_TOLERANCE);
  const isVertA = Math.abs(angleA - 90) <= HV_ANGLE_TOLERANCE;
  const isHorizB = angleB <= HV_ANGLE_TOLERANCE || angleB >= (180 - HV_ANGLE_TOLERANCE);
  const isVertB = Math.abs(angleB - 90) <= HV_ANGLE_TOLERANCE;

  return (isHorizA && isVertB) || (isVertA && isHorizB);
}

// ---- Rule 5: Duplicate detection ---------------------------------------

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

    case "ELLIPSE":
      return (
        nearEqual(a.coordinates.cx, b.coordinates.cx) &&
        nearEqual(a.coordinates.cy, b.coordinates.cy) &&
        nearEqual(a.coordinates.rx, b.coordinates.rx) &&
        nearEqual(a.coordinates.ry, b.coordinates.ry) &&
        nearEqual(a.coordinates.rotation, b.coordinates.rotation) &&
        nearEqual(a.coordinates.startAngle, b.coordinates.startAngle) &&
        nearEqual(a.coordinates.endAngle, b.coordinates.endAngle)
      );

    case "LWPOLYLINE": {
      const ptsA = a.coordinates.points ?? [];
      const ptsB = b.coordinates.points ?? [];
      if (ptsA.length !== ptsB.length) return false;
      return ptsA.every(
        (p, i) =>
          nearEqual(p.x, ptsB[i].x) &&
          nearEqual(p.y, ptsB[i].y) &&
          nearEqual(p.bulge ?? 0, ptsB[i].bulge ?? 0),
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

// ---- Rule 6: Zero-length line detection --------------------------------

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
