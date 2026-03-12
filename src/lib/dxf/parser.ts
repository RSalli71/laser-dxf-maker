/**
 * DXF R12 ASCII Parser.
 *
 * Pure function: string in, ParseResult out.
 * No external dependencies -- hand-written parser for full control
 * over the R12 ASCII format.
 *
 * Supported entity types: LINE, CIRCLE, ARC, LWPOLYLINE, SPLINE, TEXT, DIMENSION
 * (DIMENSION is parsed so the cleaner can remove it; it has no coordinates.)
 *
 * Also supports:
 * - BLOCKS section parsing (block definitions)
 * - INSERT entities (block references -> resolved to flat entities)
 * - Old-style POLYLINE with VERTEX sub-entities
 *
 * Reference: docs/ARCHITECTURE.md "src/lib/dxf/parser.ts"
 */

import type {
  DxfEntityV2,
  DxfEntityType,
  EntityCoordinates,
  LayerDefinition,
  ParseResult,
  ParseStats,
} from "@/types/dxf-v2";

// ---- Public API --------------------------------------------------------

/** Maximum file size in bytes (50 MB) */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Maximum number of entities before a warning is issued */
const MAX_ENTITY_COUNT = 100_000;

/** Maximum nested INSERT depth before resolution stops for safety */
const MAX_INSERT_DEPTH = 16;

/** Schwellwert: Bulge-Werte mit |bulge| < BULGE_THRESHOLD werden als gerade Linie behandelt. */
export const BULGE_THRESHOLD = 0.0001;

/**
 * Sammelt Warnungen und zaehlt Duplikate.
 *
 * Identische Warnungen werden gruppiert und bei der Ausgabe mit Zaehler versehen:
 *   - 1x: "Warnung" (ohne Zaehler)
 *   - 47x: "Warnung (47x)"
 *
 * Die Reihenfolge entspricht dem ersten Auftreten jeder einzigartigen Warnung.
 */
class WarningCollector {
  private counts = new Map<string, number>();
  private order: string[] = [];

  push(message: string): void {
    const existing = this.counts.get(message);
    if (existing !== undefined) {
      this.counts.set(message, existing + 1);
    } else {
      this.order.push(message);
      this.counts.set(message, 1);
    }
  }

  toArray(): string[] {
    return this.order.map((msg) => {
      const count = this.counts.get(msg)!;
      return count > 1 ? `${msg} (${count}x)` : msg;
    });
  }
}

/**
 * Parse a DXF R12 ASCII string into entities and statistics.
 *
 * @param content - Raw DXF file content as string
 * @returns ParseResult with entities and stats
 * @throws Error if the file is binary DXF or completely unparseable
 */
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

  // Parse TABLES section for layer definitions (color, linetype)
  const layerTable = parseLayerTable(lines);

  // Parse BLOCKS section (block definitions for INSERT resolution)
  const blocks = parseBlocksSection(lines);

  // Find ENTITIES section
  const entitiesStart = findSectionStart(lines, "ENTITIES");
  if (entitiesStart === -1) {
    throw new Error(
      "Keine ENTITIES-Sektion in der DXF-Datei gefunden. Ist die Datei ein gueltiges DXF R12?",
    );
  }

  // Parse entities (with INSERT resolution via blocks)
  const warnings = new WarningCollector();
  const entities = parseEntitiesSection(
    lines,
    entitiesStart,
    blocks,
    layerTable,
    warnings,
  );

  if (entities.length === 0) {
    warnings.push("Keine Entitaeten in der DXF-Datei gefunden.");
  }

  if (entities.length > MAX_ENTITY_COUNT) {
    warnings.push(
      `Sehr viele Entitaeten (${entities.length}). Die Verarbeitung kann langsam sein.`,
    );
  }

  // Keine manuelle Deduplizierung mehr noetig -- WarningCollector macht das

  // Build statistics
  const stats = buildStats(entities, warnings.toArray());

  return { entities, stats, layerTable };
}

// ---- Binary detection --------------------------------------------------

function isBinaryDxf(content: string): boolean {
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

// ---- TABLES section: LAYER table parsing --------------------------------

/**
 * Parse the TABLES section to extract LAYER definitions.
 * Each LAYER entry has: name (group 2), color (group 62), linetype (group 6).
 * Returns a Map from layer name to LayerDefinition.
 */
function parseLayerTable(lines: string[]): Map<string, LayerDefinition> {
  const layers = new Map<string, LayerDefinition>();

  const tablesStart = findSectionStart(lines, "TABLES");
  if (tablesStart === -1) return layers;

  // Find the LAYER table within TABLES
  let i = tablesStart;
  let foundLayerTable = false;

  while (i < lines.length - 1) {
    const code = lines[i].trim();
    const value = lines[i + 1].trim();

    // End of TABLES section
    if (code === "0" && value === "ENDSEC") break;

    // TABLE header -> check if it's the LAYER table
    if (code === "0" && value === "TABLE") {
      i += 2;
      // Next pair should be group 2 with table name
      if (i < lines.length - 1) {
        const nameCode = lines[i].trim();
        const nameValue = lines[i + 1].trim();
        if (nameCode === "2" && nameValue === "LAYER") {
          foundLayerTable = true;
          i += 2;
          continue;
        }
      }
      continue;
    }

    // End of current table
    if (code === "0" && value === "ENDTAB") {
      if (foundLayerTable) break; // Done with LAYER table
      i += 2;
      continue;
    }

    // LAYER entry within the LAYER table
    if (foundLayerTable && code === "0" && value === "LAYER") {
      i += 2;
      // Read all pairs for this LAYER entry
      let layerName: string | undefined;
      let layerColor = 7;
      let layerLinetype = "Continuous";

      while (i < lines.length - 1) {
        const pairCode = parseInt(lines[i].trim(), 10);
        const pairValue = lines[i + 1].trim();

        if (pairCode === 0) break; // Next entry

        if (pairCode === 2) layerName = pairValue;
        if (pairCode === 62) layerColor = Math.abs(parseInt(pairValue, 10));
        if (pairCode === 6) layerLinetype = pairValue;

        i += 2;
      }

      if (layerName !== undefined) {
        layers.set(layerName, {
          name: layerName,
          color: layerColor,
          linetype: layerLinetype,
        });
      }
      continue;
    }

    i += 2;
  }

  return layers;
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

// ---- BLOCKS section parsing --------------------------------------------

/** A parsed block definition: name -> list of raw entities */
interface BlockDefinition {
  name: string;
  /** Base point of the block (group codes 10/20) */
  baseX: number;
  baseY: number;
  /** Raw entities within this block */
  entities: BlockEntity[];
}

/** A raw entity within a block (before transformation) */
interface BlockEntity {
  type: string;
  pairs: GroupPair[];
  /** For old-style POLYLINE: collected vertex points */
  polylineVertices?: Array<{ x: number; y: number }>;
  polylineClosed?: boolean;
}

/**
 * Parse the BLOCKS section to collect block definitions.
 * Each block starts with "0 BLOCK" and ends with "0 ENDBLK".
 */
function parseBlocksSection(lines: string[]): Map<string, BlockDefinition> {
  const blocks = new Map<string, BlockDefinition>();

  const blocksStart = findSectionStart(lines, "BLOCKS");
  if (blocksStart === -1) return blocks;

  let i = blocksStart;

  while (i < lines.length - 1) {
    const code = lines[i].trim();
    const value = lines[i + 1].trim();

    // End of BLOCKS section
    if (code === "0" && value === "ENDSEC") break;
    if (code === "0" && value === "EOF") break;

    // Found a BLOCK
    if (code === "0" && value === "BLOCK") {
      const { block, nextIndex } = parseOneBlock(lines, i);
      if (block) {
        blocks.set(block.name, block);
      }
      i = nextIndex;
      continue;
    }

    i += 2;
  }

  return blocks;
}

/**
 * Parse a single block definition from BLOCK to ENDBLK.
 */
function parseOneBlock(
  lines: string[],
  startIndex: number,
): { block: BlockDefinition | null; nextIndex: number } {
  // Read BLOCK header pairs
  const { pairs: headerPairs, nextIndex: afterHeader } = readEntityPairs(
    lines,
    startIndex,
  );

  const name = getStringValue(headerPairs, 2);
  if (!name) {
    // Skip to ENDBLK
    let i = afterHeader;
    while (i < lines.length - 1) {
      if (lines[i].trim() === "0" && lines[i + 1].trim() === "ENDBLK") {
        return { block: null, nextIndex: skipPastEntity(lines, i) };
      }
      i += 2;
    }
    return { block: null, nextIndex: i };
  }

  const baseX = getFloatValue(headerPairs, 10) ?? 0;
  const baseY = getFloatValue(headerPairs, 20) ?? 0;

  // Collect entities within this block until ENDBLK
  const blockEntities: BlockEntity[] = [];
  let i = afterHeader;

  while (i < lines.length - 1) {
    const code = lines[i].trim();
    const value = lines[i + 1].trim();

    if (code === "0" && value === "ENDBLK") {
      // Skip ENDBLK and its properties
      i = skipPastEntity(lines, i);
      break;
    }

    if (code === "0" && value === "EOF") break;

    if (code === "0") {
      const entityType = value;

      // Handle VERTEX/SEQEND (part of old-style POLYLINE)
      if (entityType === "VERTEX" || entityType === "SEQEND") {
        i = skipPastEntity(lines, i);
        continue;
      }

      // Handle old-style POLYLINE in blocks
      if (entityType === "POLYLINE") {
        const { pairs, nextIndex } = readEntityPairs(lines, i);
        const closedFlag = getIntValue(pairs, 70) ?? 0;
        const closed = (closedFlag & 1) === 1;
        const vertices: Array<{ x: number; y: number }> = [];

        let vi = nextIndex;
        while (vi < lines.length - 1) {
          const vc = lines[vi].trim();
          const vv = lines[vi + 1].trim();

          if (vc === "0" && vv === "SEQEND") {
            vi = skipPastEntity(lines, vi);
            break;
          }

          if (vc === "0" && vv === "VERTEX") {
            const vResult = readEntityPairs(lines, vi);
            const x = getFloatValue(vResult.pairs, 10) ?? 0;
            const y = getFloatValue(vResult.pairs, 20) ?? 0;
            vertices.push({ x, y });
            vi = vResult.nextIndex;
            continue;
          }

          if (vc === "0") break; // Hit something unexpected
          vi += 2;
        }

        blockEntities.push({
          type: "POLYLINE",
          pairs,
          polylineVertices: vertices,
          polylineClosed: closed,
        });
        i = vi;
        continue;
      }

      // Regular entity
      const { pairs, nextIndex } = readEntityPairs(lines, i);
      blockEntities.push({ type: entityType, pairs });
      i = nextIndex;
      continue;
    }

    i += 2;
  }

  return {
    block: { name, baseX, baseY, entities: blockEntities },
    nextIndex: i,
  };
}

/**
 * Skip past a code-0 entity and all its property pairs.
 */
function skipPastEntity(lines: string[], startIndex: number): number {
  let i = startIndex + 2; // Skip the "0" + entity type
  while (i < lines.length - 1) {
    if (lines[i].trim() === "0") break;
    i += 2;
  }
  return i;
}

// ---- INSERT resolution -------------------------------------------------

/**
 * Transform a point by INSERT parameters: scale, rotate, translate.
 */
function transformPoint(
  x: number,
  y: number,
  insertX: number,
  insertY: number,
  scaleX: number,
  scaleY: number,
  rotationRad: number,
  baseX: number,
  baseY: number,
): { x: number; y: number } {
  // 1. Subtract block base point
  let px = x - baseX;
  let py = y - baseY;

  // 2. Scale
  px *= scaleX;
  py *= scaleY;

  // 3. Rotate
  if (rotationRad !== 0) {
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;
    px = rx;
    py = ry;
  }

  // 4. Translate to insertion point
  return { x: px + insertX, y: py + insertY };
}

/**
 * Transform an angle by rotation and Y-scale reflection.
 */
function transformAngle(
  angleDeg: number,
  scaleX: number,
  scaleY: number,
  rotationDeg: number,
): number {
  let a = angleDeg;
  // If scale flips one axis, mirror the angle
  if (scaleX * scaleY < 0) {
    a = -a;
  }
  a += rotationDeg;
  // Normalize to 0-360
  a = ((a % 360) + 360) % 360;
  return a;
}

interface InsertResolutionContext {
  parentLayer?: string;
  parentColor?: number;
  parentLinetype?: string;
  stack: string[];
  depth: number;
}

function transformResolvedEntity(
  entity: DxfEntityV2,
  insertX: number,
  insertY: number,
  scaleX: number,
  scaleY: number,
  rotationDeg: number,
  rotationRad: number,
  baseX: number,
  baseY: number,
): DxfEntityV2 {
  switch (entity.type) {
    case "LINE": {
      const { x1 = 0, y1 = 0, x2 = 0, y2 = 0 } = entity.coordinates;
      const p1 = transformPoint(
        x1,
        y1,
        insertX,
        insertY,
        scaleX,
        scaleY,
        rotationRad,
        baseX,
        baseY,
      );
      const p2 = transformPoint(
        x2,
        y2,
        insertX,
        insertY,
        scaleX,
        scaleY,
        rotationRad,
        baseX,
        baseY,
      );
      return {
        ...entity,
        coordinates: { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y },
        length: Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2),
      };
    }

    case "CIRCLE": {
      const { cx = 0, cy = 0, r = 0 } = entity.coordinates;
      const center = transformPoint(
        cx, cy, insertX, insertY, scaleX, scaleY, rotationRad, baseX, baseY,
      );
      const absScaleX = Math.abs(scaleX);
      const absScaleY = Math.abs(scaleY);
      // Nicht-uniforme Skalierung → ELLIPSE
      if (Math.abs(absScaleX - absScaleY) > 1e-6) {
        const rx = r * absScaleX;
        const ry = r * absScaleY;
        return {
          ...entity,
          type: "ELLIPSE",
          coordinates: { cx: center.x, cy: center.y, rx, ry, rotation: rotationDeg },
          length: approximateEllipsePerimeter(rx, ry),
          closed: true,
        };
      }
      const scaledR = r * absScaleX;
      return {
        ...entity,
        coordinates: { cx: center.x, cy: center.y, r: scaledR },
        length: 2 * Math.PI * scaledR,
        closed: true,
      };
    }

    case "ARC": {
      const {
        cx = 0, cy = 0, r = 0, startAngle = 0, endAngle = 360,
      } = entity.coordinates;
      const center = transformPoint(
        cx, cy, insertX, insertY, scaleX, scaleY, rotationRad, baseX, baseY,
      );
      const absScaleX = Math.abs(scaleX);
      const absScaleY = Math.abs(scaleY);
      const newStart = transformAngle(startAngle, scaleX, scaleY, rotationDeg);
      const newEnd = transformAngle(endAngle, scaleX, scaleY, rotationDeg);
      // Nicht-uniforme Skalierung → ELLIPSE (elliptischer Bogen)
      if (Math.abs(absScaleX - absScaleY) > 1e-6) {
        const rx = r * absScaleX;
        const ry = r * absScaleY;
        const angleFraction = calculateArcAngleFraction(newStart, newEnd);
        return {
          ...entity,
          type: "ELLIPSE",
          coordinates: {
            cx: center.x, cy: center.y, rx, ry,
            rotation: rotationDeg, startAngle: newStart, endAngle: newEnd,
          },
          length: approximateEllipsePerimeter(rx, ry) * angleFraction,
        };
      }
      const scaledR = r * absScaleX;
      return {
        ...entity,
        coordinates: {
          cx: center.x, cy: center.y, r: scaledR,
          startAngle: newStart, endAngle: newEnd,
        },
        length: calculateArcLength(scaledR, newStart, newEnd),
      };
    }

    case "ELLIPSE": {
      const {
        cx = 0, cy = 0, rx = 0, ry = 0,
        rotation: rot = 0, startAngle = 0, endAngle = 360,
      } = entity.coordinates;
      const center = transformPoint(
        cx, cy, insertX, insertY, scaleX, scaleY, rotationRad, baseX, baseY,
      );
      const newRx = rx * Math.abs(scaleX);
      const newRy = ry * Math.abs(scaleY);
      const newRot = rot + rotationDeg;
      const isFullEllipse = Math.abs(endAngle - startAngle) >= 359.99;
      const length = isFullEllipse
        ? approximateEllipsePerimeter(newRx, newRy)
        : approximateEllipsePerimeter(newRx, newRy) * calculateArcAngleFraction(startAngle, endAngle);
      return {
        ...entity,
        coordinates: {
          cx: center.x, cy: center.y, rx: newRx, ry: newRy,
          rotation: newRot, startAngle, endAngle,
        },
        length,
        closed: isFullEllipse,
      };
    }

    case "LWPOLYLINE":
    case "SPLINE": {
      const points = entity.coordinates.points ?? [];
      const mirrored = (scaleX < 0) !== (scaleY < 0);
      const transformedPoints = points.map((p) => {
        const tp = transformPoint(
          p.x,
          p.y,
          insertX,
          insertY,
          scaleX,
          scaleY,
          rotationRad,
          baseX,
          baseY,
        );
        const bulge = p.bulge !== undefined ? (mirrored ? -p.bulge : p.bulge) : undefined;
        return { ...tp, ...(bulge !== undefined ? { bulge } : {}) };
      });
      return {
        ...entity,
        coordinates: { points: transformedPoints },
        length: calculatePolylineLengthWithBulge(transformedPoints, entity.closed),
      };
    }

    case "TEXT": {
      const { x = 0, y = 0, text = "", height = 1 } = entity.coordinates;
      const pos = transformPoint(
        x,
        y,
        insertX,
        insertY,
        scaleX,
        scaleY,
        rotationRad,
        baseX,
        baseY,
      );
      return {
        ...entity,
        coordinates: {
          x: pos.x,
          y: pos.y,
          text,
          height: height * Math.abs(scaleY),
        },
        length: 0,
      };
    }

    case "DIMENSION":
      return entity;
  }
}

/**
 * Resolve an INSERT entity into flat DxfEntityV2[] by instantiating its block.
 */
function resolveInsert(
  pairs: GroupPair[],
  blocks: Map<string, BlockDefinition>,
  idCounter: { value: number },
  warnings: WarningCollector,
  layerTable: Map<string, LayerDefinition>,
  context: InsertResolutionContext = { stack: [], depth: 0 },
): DxfEntityV2[] {
  const blockName = getStringValue(pairs, 2);
  if (!blockName) return [];

  if (context.stack.includes(blockName)) {
    const cyclePath = [...context.stack, blockName].join(" -> ");
    warnings.push(`Zyklische INSERT-Referenz erkannt: ${cyclePath}.`);
    return [];
  }

  if (context.depth >= MAX_INSERT_DEPTH) {
    warnings.push(
      `Maximale INSERT-Verschachtelungstiefe (${MAX_INSERT_DEPTH}) bei Block \"${blockName}\" erreicht.`,
    );
    return [];
  }

  const block = blocks.get(blockName);
  if (!block) {
    warnings.push(`Block "${blockName}" nicht gefunden (INSERT ignoriert).`);
    return [];
  }

  // INSERT properties
  const insertX = getFloatValue(pairs, 10) ?? 0;
  const insertY = getFloatValue(pairs, 20) ?? 0;
  const scaleX = getFloatValue(pairs, 41) ?? 1;
  const scaleY = getFloatValue(pairs, 42) ?? 1;
  const rotationDeg = getFloatValue(pairs, 50) ?? 0;
  const rotationRad = (rotationDeg * Math.PI) / 180;

  // INSERT can override layer/color
  const insertLayer = getStringValue(pairs, 8);
  const insertColor = getIntValue(pairs, 62);
  const insertLinetype = getStringValue(pairs, 6);

  const effectiveInsertLayer = resolveLayer(pairs, context.parentLayer);
  const effectiveInsertColor = resolveColor(pairs, context.parentColor, layerTable, effectiveInsertLayer);
  const effectiveInsertLinetype = resolveLinetype(
    pairs,
    context.parentLinetype,
  );

  const result: DxfEntityV2[] = [];
  const nextContext: InsertResolutionContext = {
    parentLayer: effectiveInsertLayer,
    parentColor: effectiveInsertColor,
    parentLinetype: effectiveInsertLinetype,
    stack: [...context.stack, blockName],
    depth: context.depth + 1,
  };

  for (const blockEntity of block.entities) {
    const resolved = resolveBlockEntity(
      blockEntity,
      blocks,
      insertX,
      insertY,
      scaleX,
      scaleY,
      rotationDeg,
      rotationRad,
      block.baseX,
      block.baseY,
      effectiveInsertLayer ?? insertLayer,
      effectiveInsertColor ?? insertColor,
      effectiveInsertLinetype ?? insertLinetype,
      idCounter,
      warnings,
      layerTable,
      nextContext,
    );
    if (resolved.length > 0) {
      result.push(...resolved);
    }
  }

  // Tag all resolved entities with the top-level source block name
  const topLevelBlock = context.stack.length === 0 ? blockName : context.stack[0];
  for (const entity of result) {
    if (!entity.sourceBlock) {
      entity.sourceBlock = topLevelBlock;
    }
  }

  return result;
}

/**
 * Resolve a single block entity with INSERT transformation.
 */
function resolveBlockEntity(
  blockEntity: BlockEntity,
  blocks: Map<string, BlockDefinition>,
  insertX: number,
  insertY: number,
  scaleX: number,
  scaleY: number,
  rotationDeg: number,
  rotationRad: number,
  baseX: number,
  baseY: number,
  insertLayer: string | undefined,
  insertColor: number | undefined,
  insertLinetype: string | undefined,
  idCounter: { value: number },
  warnings: WarningCollector,
  layerTable: Map<string, LayerDefinition>,
  context: InsertResolutionContext,
): DxfEntityV2[] {
  const { type, pairs } = blockEntity;

  // Handle old-style POLYLINE from block
  if (type === "POLYLINE" && blockEntity.polylineVertices) {
    const layer = resolveLayer(pairs, insertLayer);
    const color = resolveColor(pairs, insertColor, layerTable, layer);
    const linetype = resolveLinetype(pairs, insertLinetype);

    const transformedPoints = blockEntity.polylineVertices.map((p) =>
      transformPoint(
        p.x,
        p.y,
        insertX,
        insertY,
        scaleX,
        scaleY,
        rotationRad,
        baseX,
        baseY,
      ),
    );

    if (transformedPoints.length < 2) return [];

    const closed = blockEntity.polylineClosed ?? false;
    const id = idCounter.value++;
    return [
      {
        id,
        type: "LWPOLYLINE",
        layer,
        color,
        linetype,
        coordinates: { points: transformedPoints },
        length: calculatePolylineLength(transformedPoints, closed),
        closed,
      },
    ];
  }

  if (!SUPPORTED_TYPES.has(type) && type !== "INSERT") {
    warnings.push(`Uebersprungener Entity-Typ: ${type}`);
    return [];
  }

  if (type === "INSERT") {
    return resolveInsert(pairs, blocks, idCounter, warnings, layerTable, {
      parentLayer: insertLayer,
      parentColor: insertColor,
      parentLinetype: insertLinetype,
      stack: context.stack,
      depth: context.depth,
    }).map((entity) =>
      transformResolvedEntity(
        entity,
        insertX,
        insertY,
        scaleX,
        scaleY,
        rotationDeg,
        rotationRad,
        baseX,
        baseY,
      ),
    );
  }

  // Parse the block entity normally, then transform coordinates
  const layer = resolveLayer(pairs, insertLayer);
  const color = resolveColor(pairs, insertColor, layerTable, layer);
  const linetype = resolveLinetype(pairs, insertLinetype);

  const id = idCounter.value++;

  switch (type) {
    case "LINE": {
      const x1 = getFloatValue(pairs, 10) ?? 0;
      const y1 = getFloatValue(pairs, 20) ?? 0;
      const x2 = getFloatValue(pairs, 11) ?? 0;
      const y2 = getFloatValue(pairs, 21) ?? 0;
      const p1 = transformPoint(
        x1,
        y1,
        insertX,
        insertY,
        scaleX,
        scaleY,
        rotationRad,
        baseX,
        baseY,
      );
      const p2 = transformPoint(
        x2,
        y2,
        insertX,
        insertY,
        scaleX,
        scaleY,
        rotationRad,
        baseX,
        baseY,
      );
      return [
        {
          id,
          type: "LINE",
          layer,
          color,
          linetype,
          coordinates: { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y },
          length: Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2),
        },
      ];
    }

    case "CIRCLE": {
      const cx = getFloatValue(pairs, 10) ?? 0;
      const cy = getFloatValue(pairs, 20) ?? 0;
      const r = getFloatValue(pairs, 40) ?? 0;
      const center = transformPoint(
        cx, cy, insertX, insertY, scaleX, scaleY, rotationRad, baseX, baseY,
      );
      const absScaleX = Math.abs(scaleX);
      const absScaleY = Math.abs(scaleY);
      if (Math.abs(absScaleX - absScaleY) > 1e-6) {
        const rx = r * absScaleX;
        const ry = r * absScaleY;
        return [{
          id, type: "ELLIPSE", layer, color, linetype,
          coordinates: { cx: center.x, cy: center.y, rx, ry, rotation: rotationDeg },
          length: approximateEllipsePerimeter(rx, ry), closed: true,
        }];
      }
      const scaledR = r * absScaleX;
      return [{
        id, type: "CIRCLE", layer, color, linetype,
        coordinates: { cx: center.x, cy: center.y, r: scaledR },
        length: 2 * Math.PI * scaledR, closed: true,
      }];
    }

    case "ARC": {
      const cx = getFloatValue(pairs, 10) ?? 0;
      const cy = getFloatValue(pairs, 20) ?? 0;
      const r = getFloatValue(pairs, 40) ?? 0;
      const startAngle = getFloatValue(pairs, 50) ?? 0;
      const endAngle = getFloatValue(pairs, 51) ?? 360;
      const center = transformPoint(
        cx, cy, insertX, insertY, scaleX, scaleY, rotationRad, baseX, baseY,
      );
      const absScaleX = Math.abs(scaleX);
      const absScaleY = Math.abs(scaleY);
      const newStart = transformAngle(startAngle, scaleX, scaleY, rotationDeg);
      const newEnd = transformAngle(endAngle, scaleX, scaleY, rotationDeg);
      if (Math.abs(absScaleX - absScaleY) > 1e-6) {
        const rx = r * absScaleX;
        const ry = r * absScaleY;
        const angleFraction = calculateArcAngleFraction(newStart, newEnd);
        return [{
          id, type: "ELLIPSE", layer, color, linetype,
          coordinates: {
            cx: center.x, cy: center.y, rx, ry,
            rotation: rotationDeg, startAngle: newStart, endAngle: newEnd,
          },
          length: approximateEllipsePerimeter(rx, ry) * angleFraction,
        }];
      }
      const scaledR = r * absScaleX;
      return [{
        id, type: "ARC", layer, color, linetype,
        coordinates: {
          cx: center.x, cy: center.y, r: scaledR,
          startAngle: newStart, endAngle: newEnd,
        },
        length: calculateArcLength(scaledR, newStart, newEnd),
      }];
    }

    case "ELLIPSE": {
      const cx = getFloatValue(pairs, 10) ?? 0;
      const cy = getFloatValue(pairs, 20) ?? 0;
      const majorEndX = getFloatValue(pairs, 11) ?? 1;
      const majorEndY = getFloatValue(pairs, 21) ?? 0;
      const minorRatio = getFloatValue(pairs, 40) ?? 1;
      const startParam = getFloatValue(pairs, 41) ?? 0;
      const endParam = getFloatValue(pairs, 42) ?? (2 * Math.PI);
      const center = transformPoint(
        cx, cy, insertX, insertY, scaleX, scaleY, rotationRad, baseX, baseY,
      );
      const baseMajor = Math.sqrt(majorEndX ** 2 + majorEndY ** 2);
      const baseRot = (Math.atan2(majorEndY, majorEndX) * 180) / Math.PI;
      const rx = baseMajor * Math.abs(scaleX);
      const ry = baseMajor * minorRatio * Math.abs(scaleY);
      const rotation = baseRot + rotationDeg;
      const startAngle = (startParam * 180) / Math.PI;
      const endAngle = (endParam * 180) / Math.PI;
      const isFullEllipse = Math.abs(endParam - startParam) >= (2 * Math.PI - 0.001);
      const length = isFullEllipse
        ? approximateEllipsePerimeter(rx, ry)
        : approximateEllipsePerimeter(rx, ry) * calculateArcAngleFraction(startAngle, endAngle);
      return [{
        id, type: "ELLIPSE", layer, color, linetype,
        coordinates: {
          cx: center.x, cy: center.y, rx, ry,
          rotation, startAngle, endAngle,
        },
        length, closed: isFullEllipse,
      }];
    }

    case "LWPOLYLINE": {
      const points = extractPolylinePoints(pairs);
      const closedFlag = getIntValue(pairs, 70) ?? 0;
      const closed = (closedFlag & 1) === 1;
      // Bulge negiert sich bei Achsenspiegelung
      const mirrored = (scaleX < 0) !== (scaleY < 0);
      const transformedPoints = points.map((p) => {
        const tp = transformPoint(
          p.x,
          p.y,
          insertX,
          insertY,
          scaleX,
          scaleY,
          rotationRad,
          baseX,
          baseY,
        );
        const bulge = p.bulge !== undefined ? (mirrored ? -p.bulge : p.bulge) : undefined;
        return { ...tp, ...(bulge !== undefined ? { bulge } : {}) };
      });
      if (transformedPoints.length < 2) return [];
      return [
        {
          id,
          type: "LWPOLYLINE",
          layer,
          color,
          linetype,
          coordinates: { points: transformedPoints },
          length: calculatePolylineLengthWithBulge(transformedPoints, closed),
          closed,
        },
      ];
    }

    case "SPLINE": {
      const points = extractSplinePoints(pairs);
      const splineFlags = getIntValue(pairs, 70) ?? 0;
      const closed = (splineFlags & 1) !== 0;
      const transformedPoints = points.map((p) =>
        transformPoint(
          p.x,
          p.y,
          insertX,
          insertY,
          scaleX,
          scaleY,
          rotationRad,
          baseX,
          baseY,
        ),
      );
      if (transformedPoints.length < 2) return [];
      return [
        {
          id,
          type: "SPLINE",
          layer,
          color,
          linetype,
          coordinates: { points: transformedPoints },
          length: calculatePolylineLength(transformedPoints, closed),
          closed,
        },
      ];
    }

    case "TEXT": {
      const x = getFloatValue(pairs, 10) ?? 0;
      const y = getFloatValue(pairs, 20) ?? 0;
      const text = getStringValue(pairs, 1) ?? "";
      const height = getFloatValue(pairs, 40) ?? 1;
      const pos = transformPoint(
        x,
        y,
        insertX,
        insertY,
        scaleX,
        scaleY,
        rotationRad,
        baseX,
        baseY,
      );
      const scaledHeight = height * Math.abs(scaleY);
      return [
        {
          id,
          type: "TEXT",
          layer,
          color,
          linetype,
          coordinates: { x: pos.x, y: pos.y, text, height: scaledHeight },
          length: 0,
        },
      ];
    }

    case "DIMENSION": {
      return [
        {
          id,
          type: "DIMENSION",
          layer,
          color,
          linetype,
          coordinates: {},
          length: 0,
        },
      ];
    }

    default:
      return [];
  }
}

/**
 * Resolve layer: if entity layer is "0" (ByBlock), use INSERT layer.
 */
function resolveLayer(
  pairs: GroupPair[],
  insertLayer: string | undefined,
): string {
  const entityLayer = getStringValue(pairs, 8) ?? "0";
  if (entityLayer === "0" && insertLayer) return insertLayer;
  return entityLayer;
}

/**
 * Resolve color with full DXF inheritance:
 *   1. Explicit entity color (group 62) if set and not special
 *   2. Color 0 (ByBlock): inherit from INSERT parent
 *   3. Color 256 (ByLayer) or missing: look up layer color in TABLES
 *   4. Fallback: 7 (white)
 */
function resolveColor(
  pairs: GroupPair[],
  insertColor: number | undefined,
  layerTable?: Map<string, LayerDefinition>,
  resolvedLayer?: string,
): number {
  const entityColor = getIntValue(pairs, 62);

  // ByBlock: inherit from INSERT parent
  if (entityColor === 0) {
    return insertColor ?? 7;
  }

  // ByLayer (explicit 256) or missing: look up layer color
  if (entityColor === undefined || entityColor === 256) {
    if (insertColor !== undefined && insertColor !== 0 && insertColor !== 256) {
      // INSERT has an explicit color override
      return insertColor;
    }
    // Look up color from layer table
    const layer = resolvedLayer ?? getStringValue(pairs, 8) ?? "0";
    if (layerTable) {
      const layerDef = layerTable.get(layer);
      if (layerDef) return layerDef.color;
    }
    return 7;
  }

  return entityColor;
}

/**
 * Resolve linetype: if entity has no linetype or "BYBLOCK", use INSERT linetype.
 */
function resolveLinetype(
  pairs: GroupPair[],
  insertLinetype: string | undefined,
): string {
  const entityLinetype = getStringValue(pairs, 6);
  if (!entityLinetype || entityLinetype === "BYBLOCK") {
    return insertLinetype ?? "CONTINUOUS";
  }
  return entityLinetype;
}

// ---- Entity parsing ----------------------------------------------------

const SUPPORTED_TYPES = new Set<string>([
  "LINE",
  "CIRCLE",
  "ARC",
  "ELLIPSE",
  "LWPOLYLINE",
  "SPLINE",
  "TEXT",
  "DIMENSION",
  "POLYLINE", // Treated as LWPOLYLINE
  "MTEXT",    // Treated as TEXT
]);

function parseEntitiesSection(
  lines: string[],
  startIndex: number,
  blocks: Map<string, BlockDefinition>,
  layerTable: Map<string, LayerDefinition>,
  warnings: WarningCollector,
): DxfEntityV2[] {
  const entities: DxfEntityV2[] = [];
  const idCounter = { value: 0 };
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
      i += 2;
      continue;
    }

    const entityType = valueLine;

    // Skip VERTEX/SEQEND (part of POLYLINE but handled differently)
    if (entityType === "VERTEX" || entityType === "SEQEND") {
      i = skipPastEntity(lines, i);
      continue;
    }

    // Handle INSERT entities: resolve block references
    if (entityType === "INSERT") {
      const { pairs, nextIndex } = readEntityPairs(lines, i);
      i = nextIndex;

      const resolved = resolveInsert(
        pairs,
        blocks,
        idCounter,
        warnings,
        layerTable,
      );
      entities.push(...resolved);
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
      const entity = parsePolylineEntity(
        pairs,
        lines,
        i,
        idCounter.value,
        warnings,
        layerTable,
      );
      if (entity) {
        entities.push(entity.entity);
        idCounter.value++;
        i = entity.nextIndex;
      }
      continue;
    }

    const entity = parseEntity(entityType, pairs, idCounter.value, warnings, layerTable);
    if (entity) {
      entities.push(entity);
      idCounter.value++;
    }
  }

  return entities;
}

/**
 * Bereinigt DXF-MTEXT-Formatierungssequenzen aus dem Rohtext.
 *
 * Behandelte Sequenzen:
 *   \P         -> Leerzeichen (Absatzumbruch)
 *   \~~        -> Leerzeichen (geschuetztes Leerzeichen)
 *   {\H2.5;..} -> Formatbloecke (Inhalt beibehalten)
 *   \A1; etc.  -> Steuersequenzen entfernt
 *   { }        -> verbleibende geschweifte Klammern entfernt
 */
function normalizeMText(raw: string): string {
  let text = raw;

  // 1. Iterativ Formatbloecke aufloesen: {\fArial|...; Content} -> Content
  //    Max 10 Iterationen fuer verschachtelte Bloecke
  for (let iter = 0; iter < 10; iter++) {
    const replaced = text.replace(/\{\\[^{}]*?;([^{}]*)\}/g, "$1");
    if (replaced === text) break;
    text = replaced;
  }

  // 2. Standalone-Steuersequenzen: \A1; \H2.5; \fArial; etc.
  text = text.replace(/\\[A-Za-z][^;]*;/g, "");

  // 3. Absatzumbruch und geschuetztes Leerzeichen
  text = text.replace(/\\P/gi, " ");
  text = text.replace(/\\~/g, " ");

  // 4. Verbleibende geschweifte Klammern
  text = text.replace(/[{}]/g, "");

  // 5. Whitespace normalisieren
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Parse a single entity from its group-code pairs.
 */
function parseEntity(
  entityType: string,
  pairs: GroupPair[],
  id: number,
  warnings: WarningCollector,
  layerTable?: Map<string, LayerDefinition>,
): DxfEntityV2 | null {
  // Extract common properties
  const layer = getStringValue(pairs, 8) ?? "0";
  const color = resolveColor(pairs, undefined, layerTable, layer);
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

    case "ELLIPSE": {
      type = "ELLIPSE";
      const cx = getFloatValue(pairs, 10) ?? 0;
      const cy = getFloatValue(pairs, 20) ?? 0;
      // DXF ELLIPSE: Code 11/21 = endpoint of major axis relative to center
      const majorEndX = getFloatValue(pairs, 11) ?? 1;
      const majorEndY = getFloatValue(pairs, 21) ?? 0;
      const minorRatio = getFloatValue(pairs, 40) ?? 1; // ratio minor/major
      const startParam = getFloatValue(pairs, 41) ?? 0;    // radians
      const endParam = getFloatValue(pairs, 42) ?? (2 * Math.PI); // radians

      const rx = Math.sqrt(majorEndX ** 2 + majorEndY ** 2);
      const ry = rx * minorRatio;
      const rotation = (Math.atan2(majorEndY, majorEndX) * 180) / Math.PI;
      const startAngle = (startParam * 180) / Math.PI;
      const endAngle = (endParam * 180) / Math.PI;

      const isFullEllipse = Math.abs(endParam - startParam) >= (2 * Math.PI - 0.001);
      coordinates = { cx, cy, rx, ry, rotation, startAngle, endAngle };
      length = isFullEllipse
        ? approximateEllipsePerimeter(rx, ry)
        : approximateEllipsePerimeter(rx, ry) * calculateArcAngleFraction(startAngle, endAngle);
      closed = isFullEllipse;
      break;
    }

    case "LWPOLYLINE": {
      type = "LWPOLYLINE";
      const points = extractPolylinePoints(pairs);
      const closedFlag = getIntValue(pairs, 70) ?? 0;
      closed = (closedFlag & 1) === 1;
      coordinates = { points };
      length = calculatePolylineLengthWithBulge(points, closed);
      break;
    }

    case "SPLINE": {
      type = "SPLINE";
      const points = extractSplinePoints(pairs);
      const splineFlags = getIntValue(pairs, 70) ?? 0;
      closed = (splineFlags & 1) !== 0;
      coordinates = { points };
      length = points.length >= 2 ? calculatePolylineLength(points, closed) : 0;
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

    case "MTEXT": {
      // MTEXT wird als TEXT gespeichert (kein neuer Entity-Typ)
      type = "TEXT";
      const x = getFloatValue(pairs, 10) ?? 0;
      const y = getFloatValue(pairs, 20) ?? 0;
      const height = getFloatValue(pairs, 40) ?? 1;

      // Code 3 = Textfragmente (mehrere möglich), Code 1 = letztes Fragment
      const fragments: string[] = [];
      for (const pair of pairs) {
        if (pair.code === 3) fragments.push(pair.value);
      }
      const code1 = getStringValue(pairs, 1) ?? "";
      fragments.push(code1);
      const rawText = fragments.join("");
      const text = normalizeMText(rawText);

      coordinates = { x, y, text, height };
      length = 0;
      break;
    }

    case "DIMENSION": {
      type = "DIMENSION";
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
  warnings: WarningCollector,
  layerTable?: Map<string, LayerDefinition>,
): { entity: DxfEntityV2; nextIndex: number } | null {
  const layer = getStringValue(headerPairs, 8) ?? "0";
  const color = resolveColor(headerPairs, undefined, layerTable, layer);
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
 * Extract ALL float values for a given group code (in order).
 * Used for SPLINE knots, control points, fit points etc.
 */
function getAllFloatValues(pairs: GroupPair[], code: number): number[] {
  const values: number[] = [];
  for (const pair of pairs) {
    if (pair.code === code) {
      const val = parseFloat(pair.value);
      if (!isNaN(val)) {
        values.push(val);
      }
    }
  }
  return values;
}

/**
 * Extract SPLINE points from group-code pairs.
 * If fit points (codes 11/21) are present, prefer them over control points (10/20).
 * Returns the point array and whether they came from fit points.
 */
function extractSplinePoints(
  pairs: GroupPair[],
): Array<{ x: number; y: number }> {
  // Try fit points first (codes 11/21)
  const fitX = getAllFloatValues(pairs, 11);
  const fitY = getAllFloatValues(pairs, 21);
  const fitCount = Math.min(fitX.length, fitY.length);

  if (fitCount >= 2) {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < fitCount; i++) {
      points.push({ x: fitX[i], y: fitY[i] });
    }
    return points;
  }

  // Fallback to control points (codes 10/20)
  const ctrlX = getAllFloatValues(pairs, 10);
  const ctrlY = getAllFloatValues(pairs, 20);
  const ctrlCount = Math.min(ctrlX.length, ctrlY.length);

  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < ctrlCount; i++) {
    points.push({ x: ctrlX[i], y: ctrlY[i] });
  }
  return points;
}

/**
 * Extract LWPOLYLINE points from group-code pairs.
 * Points are defined by multiple code-10/20 pairs in sequence.
 */
function extractPolylinePoints(
  pairs: GroupPair[],
): Array<{ x: number; y: number; bulge?: number }> {
  const points: Array<{ x: number; y: number; bulge?: number }> = [];
  const xValues: number[] = [];
  const yValues: number[] = [];
  const bulgeValues = new Map<number, number>(); // pointIndex -> bulge

  let pointIndex = -1;
  for (const pair of pairs) {
    if (pair.code === 10) {
      pointIndex++;
      xValues.push(parseFloat(pair.value) || 0);
    } else if (pair.code === 20) {
      yValues.push(parseFloat(pair.value) || 0);
    } else if (pair.code === 42) {
      const b = parseFloat(pair.value);
      if (!isNaN(b) && Math.abs(b) >= BULGE_THRESHOLD) {
        bulgeValues.set(pointIndex, b);
      }
    }
  }

  const count = Math.min(xValues.length, yValues.length);
  for (let i = 0; i < count; i++) {
    const bulge = bulgeValues.get(i);
    points.push({ x: xValues[i], y: yValues[i], ...(bulge !== undefined ? { bulge } : {}) });
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
  if (closed && points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    const dx = first.x - last.x;
    const dy = first.y - last.y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

/**
 * Ramanujan-Naeherung fuer den Ellipsenumfang.
 * Fehler < 0.01% fuer alle Achsverhaeltnisse.
 */
function approximateEllipsePerimeter(rx: number, ry: number): number {
  const a = Math.max(rx, ry);
  const b = Math.min(rx, ry);
  if (a < 1e-10) return 0;
  const h = ((a - b) * (a - b)) / ((a + b) * (a + b));
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

/**
 * Berechnet den Winkelanteil eines Bogens als Bruchteil von 360°.
 */
function calculateArcAngleFraction(startDeg: number, endDeg: number): number {
  let diff = endDeg - startDeg;
  if (diff <= 0) diff += 360;
  return diff / 360;
}

/**
 * Berechnet die Bogenlänge eines Segments mit Bulge-Wert.
 * Formel: theta = 4 * atan(|bulge|), r = chord / (2 * sin(theta/2)), Länge = r * theta
 */
function bulgeToArcLength(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  bulge: number,
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chord = Math.sqrt(dx * dx + dy * dy);

  if (chord < 1e-10) return 0; // Identische Punkte

  const theta = 4 * Math.atan(Math.abs(bulge));
  const sinHalfTheta = Math.sin(theta / 2);

  // Guard: sin(theta/2) nahe 0 (theta nahe 2*PI = Vollkreis)
  if (Math.abs(sinHalfTheta) < 1e-10) {
    return chord * Math.PI; // Naeherung: Vollkreis-Umfang
  }

  const r = chord / (2 * sinHalfTheta);
  return Math.abs(r * theta);
}

/**
 * Berechnet Polylinienlänge unter Berücksichtigung von Bulge-Werten.
 */
function calculatePolylineLengthWithBulge(
  points: Array<{ x: number; y: number; bulge?: number }>,
  closed?: boolean,
): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1.bulge !== undefined && Math.abs(p1.bulge) >= BULGE_THRESHOLD) {
      length += bulgeToArcLength(p1, p2, p1.bulge);
    } else {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
  }
  if (closed && points.length > 1) {
    const last = points[points.length - 1];
    const first = points[0];
    if (last.bulge !== undefined && Math.abs(last.bulge) >= BULGE_THRESHOLD) {
      length += bulgeToArcLength(last, first, last.bulge);
    } else {
      const dx = first.x - last.x;
      const dy = first.y - last.y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
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
