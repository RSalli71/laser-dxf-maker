/**
 * DXF Auto-Cleaning Module.
 *
 * Pure function: DxfEntityV2[] in, cleaned DxfEntityV2[] + CleanReport out.
 * No external dependencies.
 *
 * Cleaning rules (priority order):
 *
 * Safe rules (deterministic, no false positives):
 * 0. Remove entities from known helper blocks (sourceBlock matching)
 * 1. Remove DIMENSION entities
 * 6. Remove zero-length lines (start === end)
 *
 * Heuristic rules (pattern-based, small false-positive risk):
 * 2. Remove entities with non-CONTINUOUS effective linetype
 * 3. Remove thread indicator ARCs (near-full-circle arcs concentric with a CIRCLE)
 * 3b. Flag (not remove) open SPLINEs near bore holes as suspected thread indicators
 * 4. Remove cross-patterns: 3+ short lines emanating from a common point
 * 5. Remove duplicates (same type + same coordinates, direction-independent)
 *
 * Informational:
 * 7. Detect empty layers
 *
 * Reference: docs/ARCHITECTURE.md "src/lib/dxf/cleaner.ts"
 */

import type {
  DxfEntityV2,
  CleanReport,
  LayerDefinition,
} from "@/types/dxf-v2";

// ---- Public Types ------------------------------------------------------

export type { CleanReport };

/** Result of the cleaning operation */
export interface CleanResult {
  cleaned: DxfEntityV2[];
  report: CleanReport;
}

/** Configuration for cleaning thresholds (B1: centralized magic numbers) */
export interface CleanerConfig {
  /** Coordinate comparison tolerance in DXF units (default: 0.01) */
  tolerance: number;
  /** Spatial grouping tolerance for thread/cross detection in DXF units (default: 1.0) */
  spatialTolerance: number;
  /** Proximity for thread-spline-to-circle matching in DXF units (default: 3.0) */
  threadSplineProximity: number;
  /** Maximum line length to be considered part of a cross-pattern (default: 15) */
  crossMaxLength: number;
  /** Minimum arc span in degrees to be a thread indicator (default: 240) */
  threadArcMinSpan: number;
}

/** Default cleaner configuration */
export const DEFAULT_CLEANER_CONFIG: CleanerConfig = {
  tolerance: 0.01,
  spatialTolerance: 1.0,
  threadSplineProximity: 3.0,
  crossMaxLength: 15,
  threadArcMinSpan: 240,
};

// ---- Public API --------------------------------------------------------

/**
 * Clean a set of DXF entities by removing unnecessary elements.
 *
 * @param entities - DxfEntityV2 array (typically for one part)
 * @param layerTable - Layer definitions for BYLAYER linetype resolution (A2)
 * @param config - Optional cleaning thresholds (B1)
 * @returns CleanResult with cleaned entities and a report
 */
export function cleanEntities(
  entities: DxfEntityV2[],
  layerTable?: Map<string, LayerDefinition>,
  config: CleanerConfig = DEFAULT_CLEANER_CONFIG,
): CleanResult {
  const report: CleanReport = {
    removedHelperBlocks: 0,
    removedDimensions: 0,
    removedThreadHelpers: 0,
    removedThreadArcs: 0,
    suspectedThreadSplines: 0,
    removedCrossPatterns: 0,
    removedDuplicates: 0,
    removedZeroLines: 0,
    removedEmptyLayers: [],
    totalRemoved: 0,
  };

  let result = [...entities];

  // ---- Stage 1: Safe Cleanup (deterministic, no false positives) ----

  // Step 0: Remove entities from known helper blocks (highest priority)
  const beforeBlocks = result.length;
  result = result.filter((e) => !isFromHelperBlock(e));
  report.removedHelperBlocks = beforeBlocks - result.length;

  // Step 1: Remove DIMENSION entities
  const beforeDimensions = result.length;
  result = result.filter((e) => e.type !== "DIMENSION");
  report.removedDimensions = beforeDimensions - result.length;

  // Step 6: Remove zero-length lines (moved to safe stage)
  const beforeZeroLines = result.length;
  result = result.filter((e) => !isZeroLengthLine(e, config));
  report.removedZeroLines = beforeZeroLines - result.length;

  // ---- Stage 2: Heuristic Detection (pattern-based) ----

  // Step 2: Remove non-CONTINUOUS effective linetype entities (A2: BYLAYER resolution)
  const beforeThread = result.length;
  result = result.filter((e) => !isNonContinuousHelper(e, layerTable));
  report.removedThreadHelpers = beforeThread - result.length;

  // Step 3: Remove thread indicator ARCs (concentric with CIRCLE, near-full span)
  const beforeThreadArcs = result.length;
  result = removeThreadArcs(result, config);
  report.removedThreadArcs = beforeThreadArcs - result.length;

  // Step 3b: Flag (not remove) open SPLINEs near bore holes (A1: entschärft)
  report.suspectedThreadSplines = countSuspectedThreadSplines(result, config);

  // Step 4: Remove cross-patterns (geometric detection)
  const beforeCross = result.length;
  result = removeCrossPatterns(result, config);
  report.removedCrossPatterns = beforeCross - result.length;

  // Step 5: Remove duplicates (A3: direction-independent, O(n) via canonical keys)
  const beforeDuplicates = result.length;
  result = removeDuplicates(result, config);
  report.removedDuplicates = beforeDuplicates - result.length;

  // ---- Stage 3: Informational ----

  // Step 7: Detect empty layers
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

// ---- Rule 2: Non-CONTINUOUS linetype detection (A2: BYLAYER) -----------

/** Dashed/hidden linetype names (case-insensitive matching) */
const DASHED_LINETYPES = new Set(["DASHED", "HIDDEN", "DASHDOT", "CENTER"]);

/**
 * Determine the effective linetype, resolving BYLAYER via the layer table.
 * Falls back to entity linetype if no layer table or layer entry exists.
 */
function getEffectiveLinetype(
  entity: DxfEntityV2,
  layerTable?: Map<string, LayerDefinition>,
): string {
  const lt = entity.linetype.toUpperCase();
  if (lt === "BYLAYER" && layerTable) {
    const layerDef = layerTable.get(entity.layer);
    return layerDef?.linetype.toUpperCase() ?? "CONTINUOUS";
  }
  return lt;
}

/**
 * Determine if an entity is a helper/construction line (should be removed).
 * Uses effective linetype (resolves BYLAYER from layer table).
 */
function isNonContinuousHelper(
  entity: DxfEntityV2,
  layerTable?: Map<string, LayerDefinition>,
): boolean {
  const effectiveLt = getEffectiveLinetype(entity, layerTable);
  return DASHED_LINETYPES.has(effectiveLt);
}

// ---- Rule 3: Thread indicator ARC detection ----------------------------

/**
 * Remove thread indicator ARCs.
 *
 * A thread indicator ARC is detected when:
 * - The ARC spans > threadArcMinSpan (near-full circle)
 * - A CIRCLE exists at (approximately) the same center with smaller radius
 *
 * The CIRCLE is the actual bore hole (kept), the ARC is the thread
 * outer diameter visualization (removed).
 */
function removeThreadArcs(
  entities: DxfEntityV2[],
  config: CleanerConfig,
): DxfEntityV2[] {
  const circleCenters: Array<{ cx: number; cy: number; r: number }> = [];
  for (const e of entities) {
    if (e.type === "CIRCLE") {
      circleCenters.push({
        cx: safeNum(e.coordinates.cx),
        cy: safeNum(e.coordinates.cy),
        r: safeNum(e.coordinates.r),
      });
    }
  }

  if (circleCenters.length === 0) return entities;

  const threadArcIds = new Set<number>();

  for (const e of entities) {
    if (e.type !== "ARC") continue;

    const startAngle = safeNum(e.coordinates.startAngle);
    const endAngle = safeNum(e.coordinates.endAngle, 360);
    let span = endAngle - startAngle;
    if (span <= 0) span += 360;

    if (span < config.threadArcMinSpan) continue;

    const arcCx = safeNum(e.coordinates.cx);
    const arcCy = safeNum(e.coordinates.cy);
    const arcR = safeNum(e.coordinates.r);

    const hasConcentricCircle = circleCenters.some(
      (c) =>
        Math.abs(c.cx - arcCx) < config.spatialTolerance &&
        Math.abs(c.cy - arcCy) < config.spatialTolerance &&
        c.r < arcR,
    );

    if (hasConcentricCircle) {
      threadArcIds.add(e.id);
    }
  }

  if (threadArcIds.size === 0) return entities;

  return entities.filter((e) => !threadArcIds.has(e.id));
}

// ---- Rule 3b: Open SPLINE thread indicator detection (A1: flag only) ---

/**
 * Count open SPLINEs that are near a CIRCLE center (suspected thread indicators).
 * These are NOT removed — only counted for the report so the user can review them.
 */
function countSuspectedThreadSplines(
  entities: DxfEntityV2[],
  config: CleanerConfig,
): number {
  const circleCenters: Array<{ cx: number; cy: number }> = [];
  for (const e of entities) {
    if (e.type === "CIRCLE") {
      circleCenters.push({
        cx: safeNum(e.coordinates.cx),
        cy: safeNum(e.coordinates.cy),
      });
    }
  }

  if (circleCenters.length === 0) return 0;

  let count = 0;
  for (const e of entities) {
    if (e.type !== "SPLINE" || e.closed) continue;

    const pts = e.coordinates.points ?? [];
    if (pts.length === 0) continue;

    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

    const isNearCircle = circleCenters.some(
      (c) =>
        Math.abs(c.cx - cx) < config.threadSplineProximity &&
        Math.abs(c.cy - cy) < config.threadSplineProximity,
    );

    if (isNearCircle) count++;
  }

  return count;
}

// ---- Rule 4: Cross-pattern detection -----------------------------------

/**
 * Minimum number of short lines sharing an endpoint to form a cross-pattern.
 */
const CROSS_MIN_LINES = 3;

/** Angle tolerance (degrees) for detecting horizontal/vertical lines. */
const HV_ANGLE_TOLERANCE = 5;

/** Length ratio: two lines of a 2-line cross must have similar length. */
const CROSS_LENGTH_RATIO = 0.5;

/**
 * Remove cross-shaped patterns of short lines.
 *
 * Two detection strategies:
 * A) 3+ short lines sharing a common endpoint
 * B) 2 short lines with the same midpoint, one ~horizontal, one ~vertical
 *    and approximately equal length
 *
 * Only removes LINEs — never removes CIRCLES, ARCS, POLYLINES, etc.
 */
function removeCrossPatterns(
  entities: DxfEntityV2[],
  config: CleanerConfig,
): DxfEntityV2[] {
  const shortLines: DxfEntityV2[] = [];
  const otherEntities: DxfEntityV2[] = [];

  for (const e of entities) {
    if (e.type === "LINE" && e.length > 0 && e.length <= config.crossMaxLength) {
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
    // M1: Use spatialTolerance as cell size (not tolerance*10) to avoid
    // boundary splits where nearby endpoints fall into different cells
    const cellSize = config.spatialTolerance;
    const endpointMap = new Map<string, number[]>();

    for (let i = 0; i < shortLines.length; i++) {
      const line = shortLines[i];
      const { x1 = 0, y1 = 0, x2 = 0, y2 = 0 } = line.coordinates;

      for (const [x, y] of [
        [x1, y1],
        [x2, y2],
      ]) {
        // Insert into primary cell + adjacent cells to handle boundary cases
        const cx = Math.round(x / cellSize);
        const cy = Math.round(y / cellSize);
        for (const dx of [-1, 0, 1]) {
          for (const dy of [-1, 0, 1]) {
            const key = `${cx + dx},${cy + dy}`;
            let bucket = endpointMap.get(key);
            if (!bucket) {
              bucket = [];
              endpointMap.set(key, bucket);
            }
            bucket.push(i);
          }
        }
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
  const midCellSize = config.spatialTolerance;
  const midpointMap = new Map<string, number[]>();

  for (let i = 0; i < shortLines.length; i++) {
    if (crossLineIndices.has(i)) continue;
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

    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const lineA = shortLines[indices[a]];
        const lineB = shortLines[indices[b]];

        if (isTwoLineCross(lineA, lineB, config)) {
          crossLineIndices.add(indices[a]);
          crossLineIndices.add(indices[b]);
        }
      }
    }
  }

  if (crossLineIndices.size === 0) {
    return entities;
  }

  const survivingShortLines = shortLines.filter(
    (_, i) => !crossLineIndices.has(i),
  );
  return [...otherEntities, ...survivingShortLines];
}

/**
 * Check if two lines form a 2-line cross pattern:
 * - Similar midpoints (within spatialTolerance)
 * - One is approximately horizontal, the other approximately vertical
 * - Similar lengths (ratio >= CROSS_LENGTH_RATIO)
 */
function isTwoLineCross(
  a: DxfEntityV2,
  b: DxfEntityV2,
  config: CleanerConfig,
): boolean {
  const { x1: ax1 = 0, y1: ay1 = 0, x2: ax2 = 0, y2: ay2 = 0 } =
    a.coordinates;
  const { x1: bx1 = 0, y1: by1 = 0, x2: bx2 = 0, y2: by2 = 0 } =
    b.coordinates;

  const mxA = (ax1 + ax2) / 2;
  const myA = (ay1 + ay2) / 2;
  const mxB = (bx1 + bx2) / 2;
  const myB = (by1 + by2) / 2;

  if (Math.abs(mxA - mxB) > config.spatialTolerance) return false;
  if (Math.abs(myA - myB) > config.spatialTolerance) return false;

  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 || lenB === 0) return false;
  const ratio = Math.min(lenA, lenB) / Math.max(lenA, lenB);
  if (ratio < CROSS_LENGTH_RATIO) return false;

  const angleA = Math.abs(
    Math.atan2(ay2 - ay1, ax2 - ax1) * (180 / Math.PI),
  );
  const angleB = Math.abs(
    Math.atan2(by2 - by1, bx2 - bx1) * (180 / Math.PI),
  );

  const isHorizA =
    angleA <= HV_ANGLE_TOLERANCE || angleA >= 180 - HV_ANGLE_TOLERANCE;
  const isVertA = Math.abs(angleA - 90) <= HV_ANGLE_TOLERANCE;
  const isHorizB =
    angleB <= HV_ANGLE_TOLERANCE || angleB >= 180 - HV_ANGLE_TOLERANCE;
  const isVertB = Math.abs(angleB - 90) <= HV_ANGLE_TOLERANCE;

  return (isHorizA && isVertB) || (isVertA && isHorizB);
}

// ---- Rule 5: Duplicate detection (A3: direction-independent, O(n)) -----

/**
 * Remove geometrically identical entities.
 *
 * Uses spatial bucketing for O(n) average case:
 * 1. Entities are placed into grid cells based on a canonical type+coordinate key
 * 2. Each new entity is compared only against entities in its own bucket
 * 3. LINEs are direction-independent: LINE(A→B) === LINE(B→A)
 *
 * O(n) average, O(n*k) worst case where k = max bucket size.
 */
function removeDuplicates(
  entities: DxfEntityV2[],
  config: CleanerConfig,
): DxfEntityV2[] {
  const buckets = new Map<string, DxfEntityV2[]>();
  const kept: DxfEntityV2[] = [];

  for (const entity of entities) {
    const key = bucketKey(entity, config.tolerance);
    if (key === null) {
      // Entities without a bucket key (unknown types) are always kept
      kept.push(entity);
      continue;
    }

    const bucket = buckets.get(key);
    if (!bucket) {
      buckets.set(key, [entity]);
      kept.push(entity);
      continue;
    }

    // Check against same-bucket entities for tolerance match
    const isDuplicate = bucket.some((existing) =>
      areGeometricallyEqual(existing, entity, config),
    );
    if (!isDuplicate) {
      bucket.push(entity);
      kept.push(entity);
    }
  }

  return kept;
}

/**
 * Coarse bucket key for spatial grouping.
 * Uses a cell size of 10x tolerance so that entities within tolerance
 * are very likely in the same bucket. For LINEs, endpoints are sorted
 * to make direction-independent.
 */
function bucketKey(entity: DxfEntityV2, tolerance: number): string | null {
  const c = entity.coordinates;
  const cellSize = tolerance * 10;
  const r = (v: number | undefined) =>
    v === undefined ? "u" : String(Math.round(v / cellSize));

  switch (entity.type) {
    case "LINE": {
      const p1 = `${r(c.x1)},${r(c.y1)}`;
      const p2 = `${r(c.x2)},${r(c.y2)}`;
      const [a, b] = p1 <= p2 ? [p1, p2] : [p2, p1];
      return `L:${a}:${b}`;
    }
    case "CIRCLE":
      return `C:${r(c.cx)},${r(c.cy)},${r(c.r)}`;
    case "ARC":
      return `A:${r(c.cx)},${r(c.cy)},${r(c.r)}`;
    case "ELLIPSE":
      return `E:${r(c.cx)},${r(c.cy)},${r(c.rx)},${r(c.ry)}`;
    case "LWPOLYLINE":
    case "SPLINE": {
      const pts = c.points ?? [];
      if (pts.length === 0) return `P:empty`;
      // Bucket by first point + count
      return `P:${r(pts[0].x)},${r(pts[0].y)},${pts.length}`;
    }
    case "TEXT":
      return `T:${r(c.x)},${r(c.y)}`;
    default:
      return null;
  }
}

/**
 * Geometric equality check with tolerance.
 * LINEs are direction-independent: LINE(A→B) equals LINE(B→A).
 */
function areGeometricallyEqual(
  a: DxfEntityV2,
  b: DxfEntityV2,
  config: CleanerConfig,
): boolean {
  if (a.type !== b.type) return false;
  const near = (x: number | undefined, y: number | undefined) =>
    nearEqual(x, y, config.tolerance);

  switch (a.type) {
    case "LINE": {
      // Direction-independent: A→B or B→A
      const fwd =
        near(a.coordinates.x1, b.coordinates.x1) &&
        near(a.coordinates.y1, b.coordinates.y1) &&
        near(a.coordinates.x2, b.coordinates.x2) &&
        near(a.coordinates.y2, b.coordinates.y2);
      if (fwd) return true;
      return (
        near(a.coordinates.x1, b.coordinates.x2) &&
        near(a.coordinates.y1, b.coordinates.y2) &&
        near(a.coordinates.x2, b.coordinates.x1) &&
        near(a.coordinates.y2, b.coordinates.y1)
      );
    }
    case "CIRCLE":
      return (
        near(a.coordinates.cx, b.coordinates.cx) &&
        near(a.coordinates.cy, b.coordinates.cy) &&
        near(a.coordinates.r, b.coordinates.r)
      );
    case "ARC":
      return (
        near(a.coordinates.cx, b.coordinates.cx) &&
        near(a.coordinates.cy, b.coordinates.cy) &&
        near(a.coordinates.r, b.coordinates.r) &&
        near(normalizeAngle(a.coordinates.startAngle), normalizeAngle(b.coordinates.startAngle)) &&
        near(normalizeAngle(a.coordinates.endAngle), normalizeAngle(b.coordinates.endAngle))
      );
    case "ELLIPSE":
      return (
        near(a.coordinates.cx, b.coordinates.cx) &&
        near(a.coordinates.cy, b.coordinates.cy) &&
        near(a.coordinates.rx, b.coordinates.rx) &&
        near(a.coordinates.ry, b.coordinates.ry) &&
        near(a.coordinates.rotation, b.coordinates.rotation) &&
        near(a.coordinates.startAngle, b.coordinates.startAngle) &&
        near(a.coordinates.endAngle, b.coordinates.endAngle)
      );
    case "LWPOLYLINE":
    case "SPLINE": {
      const ptsA = a.coordinates.points ?? [];
      const ptsB = b.coordinates.points ?? [];
      if (ptsA.length !== ptsB.length) return false;
      return ptsA.every(
        (p, i) =>
          near(p.x, ptsB[i].x) &&
          near(p.y, ptsB[i].y) &&
          near(p.bulge ?? 0, ptsB[i].bulge ?? 0),
      );
    }
    case "TEXT":
      return (
        near(a.coordinates.x, b.coordinates.x) &&
        near(a.coordinates.y, b.coordinates.y) &&
        a.coordinates.text === b.coordinates.text
      );
    default:
      return false;
  }
}

function nearEqual(
  a: number | undefined,
  b: number | undefined,
  tolerance: number,
): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  // M5: Guard against NaN propagation from corrupted DXF data
  if (!isFinite(a) || !isFinite(b)) return false;
  return Math.abs(a - b) < tolerance;
}

// ---- Rule 6: Zero-length line detection --------------------------------

function isZeroLengthLine(entity: DxfEntityV2, config: CleanerConfig): boolean {
  if (entity.type !== "LINE") return false;

  const { x1, y1, x2, y2 } = entity.coordinates;
  if (x1 === undefined || y1 === undefined) return false;
  if (x2 === undefined || y2 === undefined) return false;

  return (
    Math.abs(x1 - x2) < config.tolerance &&
    Math.abs(y1 - y2) < config.tolerance
  );
}

// ---- Helpers -----------------------------------------------------------

/**
 * Normalize an angle to [0, 360) range for consistent comparison.
 * Guards against NaN (returns 0).
 */
function normalizeAngle(angle: number | undefined): number {
  if (angle === undefined || !isFinite(angle)) return 0;
  return ((angle % 360) + 360) % 360;
}

/**
 * Safe number extraction: guards against NaN from corrupted DXF data.
 * Returns fallback (default 0) if value is undefined or NaN.
 */
function safeNum(val: number | undefined, fallback = 0): number {
  if (val === undefined || !isFinite(val)) return fallback;
  return val;
}

function collectLayers(entities: DxfEntityV2[]): string[] {
  return [...new Set(entities.map((e) => e.layer))].sort();
}
