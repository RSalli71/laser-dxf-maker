/**
 * V2 TypeScript-Interfaces for the DXF Laser-Maker.
 *
 * Based on the DXF-Kalkulator dxf-v2.ts, adapted and extended for
 * the Laser DXF-Maker project:
 *   - Reduced entity type union to supported types only
 *   - Added `classification` field (ClassificationType)
 *   - Added `partId` field (e.g. "T1", "T2")
 *   - Removed V1-specific fields (hasBulge, textContent) in favour
 *     of coordinates-based text/height
 *
 * Reference: docs/ARCHITECTURE.md "DxfEntityV2 (erweitert)"
 * Source:    DXF-Kalkulator/src/types/dxf-v2.ts
 */

import type { ClassificationType } from "./classification";

// ---- Entities ----------------------------------------------------------

/**
 * Supported entity types for DXF R12 ASCII parsing.
 * DIMENSION is recognized by the parser only so the cleaner can remove it.
 */
export type DxfEntityType =
  | "LINE"
  | "ARC"
  | "CIRCLE"
  | "LWPOLYLINE"
  | "TEXT"
  | "DIMENSION";

/**
 * A single geometric entity parsed from a DXF file.
 * Extended with `classification` and `partId` for the Laser DXF-Maker workflow.
 */
export interface DxfEntityV2 {
  /** Sequential ID (0-based, assigned by the parser) */
  id: number;

  /** Entity type from DXF */
  type: DxfEntityType;

  /** Layer name */
  layer: string;

  /** ACI color number (AutoCAD Color Index, 0-256) */
  color: number;

  /** Line type (CONTINUOUS, DASHED, HIDDEN, etc.) */
  linetype: string;

  /** Geometric coordinates (type-dependent) */
  coordinates: EntityCoordinates;

  /** Length in DXF units (0 for non-geometric entities like TEXT) */
  length: number;

  /** Whether the entity is closed (Polyline, Circle) */
  closed?: boolean;

  // ---- Laser DXF-Maker extensions ----

  /** Laser cutting classification (set by classifier, corrected by user) */
  classification?: ClassificationType;

  /** Part assignment ID (e.g. "T1", "T2") */
  partId?: string;
}

/**
 * Coordinate variants depending on entity type.
 * Flat object with optional fields for JSON serialization simplicity.
 */
export interface EntityCoordinates {
  /** LINE: Start point */
  x1?: number;
  y1?: number;
  /** LINE: End point */
  x2?: number;
  y2?: number;

  /** CIRCLE, ARC: Center point */
  cx?: number;
  cy?: number;

  /** CIRCLE, ARC: Radius */
  r?: number;

  /** ARC: Angles in degrees */
  startAngle?: number;
  endAngle?: number;

  /** LWPOLYLINE: Point list */
  points?: Array<{ x: number; y: number }>;

  /** TEXT: Position */
  x?: number;
  y?: number;

  /** TEXT: Content string */
  text?: string;

  /** TEXT: Character height */
  height?: number;
}

// ---- Parse Statistics --------------------------------------------------

/**
 * Statistics produced by the DXF parser.
 * Shows entity counts grouped by type.
 */
export interface ParseStats {
  /** Total number of parsed entities */
  totalEntities: number;

  /** Count per entity type */
  byType: Record<string, number>;

  /** All layer names found in the file */
  layers: string[];

  /** Parser warnings (e.g. skipped unknown entity types) */
  warnings: string[];
}

/**
 * Complete result from the DXF parser.
 */
export interface ParseResult {
  /** All parsed entities */
  entities: DxfEntityV2[];

  /** Parse statistics */
  stats: ParseStats;
}

// ---- Bounding Box -------------------------------------------------------

/**
 * Axis-aligned bounding box in DXF world coordinates.
 * Used by the editor viewport for fit-to-view calculations.
 */
export interface BoundingBoxV2 {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Width in DXF units */
  width: number;
  /** Height in DXF units */
  height: number;
}

// ---- ViewBox ------------------------------------------------------------

/**
 * SVG ViewBox describing the visible world region in the editor.
 * Used by the viewport hook for zoom/pan/fit.
 */
export interface ViewBox {
  /** Left edge in world units */
  cx: number;
  /** Top edge in world units (inverted DXF Y) */
  cy: number;
  /** Width in world units */
  w: number;
  /** Height in world units */
  h: number;
}

// ---- Clean Report -------------------------------------------------------

/**
 * Report produced by the auto-cleaner (F4).
 * Summarizes what was removed from a part.
 */
export interface CleanReport {
  removedDimensions: number;
  removedThreadHelpers: number;
  removedDuplicates: number;
  removedZeroLines: number;
  removedEmptyLayers: string[];
  totalRemoved: number;
}
