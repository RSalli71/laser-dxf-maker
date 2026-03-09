/**
 * Hit-Testing fuer Einzel-Entities im DXF-Editor.
 *
 * Unterstuetzte Typen:
 * - LINE: Distanz zu Segment
 * - ARC/CIRCLE: Distanz zu Radius (+ Winkelbereich bei ARC)
 * - LWPOLYLINE: Distanz zu naechstem Segment
 * - TEXT: vereinfachter Bounding-Box-Check
 *
 * Adapted from DXF-Kalkulator hit-test.ts for the Laser DXF-Maker.
 * Loop-based hit testing removed (not needed here).
 */

import type { DxfEntityV2 } from "@/types/dxf-v2";

/**
 * Hit-Test fuer Einzel-Entities.
 *
 * @param worldX - X-Koordinate in Weltkoordinaten
 * @param worldY - Y-Koordinate in Weltkoordinaten
 * @param entities - Alle renderbaren DXF-Entities
 * @param snapTolerance - Snap-Toleranz in Welt-Einheiten
 * @returns Getroffene Entity oder null
 */
export function hitTestEntity(
  worldX: number,
  worldY: number,
  entities: DxfEntityV2[],
  snapTolerance: number,
): DxfEntityV2 | null {
  // Iterate backwards so top-rendered entities are tested first
  for (let index = entities.length - 1; index >= 0; index -= 1) {
    const entity = entities[index];
    const c = entity.coordinates;

    if (
      entity.type === "LINE" &&
      c.x1 !== undefined &&
      c.y1 !== undefined &&
      c.x2 !== undefined &&
      c.y2 !== undefined
    ) {
      if (
        distanceToSegment(worldX, worldY, c.x1, c.y1, c.x2, c.y2) <=
        snapTolerance
      ) {
        return entity;
      }
      continue;
    }

    if (
      entity.type === "CIRCLE" &&
      c.cx !== undefined &&
      c.cy !== undefined &&
      c.r !== undefined
    ) {
      const distanceToCenter = Math.sqrt(
        (worldX - c.cx) * (worldX - c.cx) + (worldY - c.cy) * (worldY - c.cy),
      );
      if (Math.abs(distanceToCenter - c.r) <= snapTolerance) {
        return entity;
      }
      continue;
    }

    if (
      entity.type === "ARC" &&
      c.cx !== undefined &&
      c.cy !== undefined &&
      c.r !== undefined &&
      c.startAngle !== undefined &&
      c.endAngle !== undefined
    ) {
      const distanceToCenter = Math.sqrt(
        (worldX - c.cx) * (worldX - c.cx) + (worldY - c.cy) * (worldY - c.cy),
      );

      if (Math.abs(distanceToCenter - c.r) <= snapTolerance) {
        const angle =
          (Math.atan2(worldY - c.cy, worldX - c.cx) * 180) / Math.PI;
        if (isAngleOnArc(angle, c.startAngle, c.endAngle)) {
          return entity;
        }
      }
      continue;
    }

    if (entity.type === "LWPOLYLINE" && c.points && c.points.length >= 2) {
      if (
        isPointNearPolyline(
          worldX,
          worldY,
          c.points,
          entity.closed,
          snapTolerance,
        )
      ) {
        return entity;
      }
      continue;
    }

    if (
      entity.type === "TEXT" &&
      c.x !== undefined &&
      c.y !== undefined
    ) {
      if (pointInTextBounds(worldX, worldY, entity, snapTolerance)) {
        return entity;
      }
    }
  }

  return null;
}

function isPointNearPolyline(
  x: number,
  y: number,
  points: Array<{ x: number; y: number }>,
  closed: boolean | undefined,
  tolerance: number,
): boolean {
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (distanceToSegment(x, y, a.x, a.y, b.x, b.y) <= tolerance) {
      return true;
    }
  }

  if (closed && points.length > 2) {
    const first = points[0];
    const last = points[points.length - 1];
    if (
      distanceToSegment(x, y, last.x, last.y, first.x, first.y) <= tolerance
    ) {
      return true;
    }
  }

  return false;
}

function normalizeAngleDegrees(angle: number): number {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function isAngleOnArc(
  angle: number,
  startAngle: number,
  endAngle: number,
): boolean {
  const a = normalizeAngleDegrees(angle);
  const start = normalizeAngleDegrees(startAngle);
  const end = normalizeAngleDegrees(endAngle);

  if (start <= end) {
    return a >= start && a <= end;
  }

  return a >= start || a <= end;
}

function pointInTextBounds(
  worldX: number,
  worldY: number,
  entity: DxfEntityV2,
  tolerance: number,
): boolean {
  const x = entity.coordinates.x;
  const y = entity.coordinates.y;
  if (x === undefined || y === undefined) return false;

  const textLength = Math.max(entity.coordinates.text?.trim().length ?? 0, 1);
  const estimatedHeight = Math.max(entity.coordinates.height ?? tolerance * 2, 1);
  const estimatedWidth = Math.max(
    textLength * estimatedHeight * 0.6,
    tolerance * 3,
  );

  const minX = x - tolerance;
  const maxX = x + estimatedWidth + tolerance;
  const minY = y - estimatedHeight - tolerance;
  const maxY = y + tolerance;

  return worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY;
}

/**
 * Berechnet die minimale Distanz eines Punktes (px, py) zu einem
 * Liniensegment (ax, ay) -> (bx, by).
 */
function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  // Segment hat Laenge 0 -> Distanz zum Punkt
  if (lenSq === 0) {
    return Math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay));
  }

  // Projektion des Punktes auf die Gerade (Parameter t)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;

  // Auf das Segment clampen
  t = Math.max(0, Math.min(1, t));

  // Naechster Punkt auf dem Segment
  const nearX = ax + t * dx;
  const nearY = ay + t * dy;

  return Math.sqrt((px - nearX) * (px - nearX) + (py - nearY) * (py - nearY));
}
