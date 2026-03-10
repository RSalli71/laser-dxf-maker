import type { DxfEntityV2 } from "@/types/dxf-v2";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function getEntityBBox(entity: DxfEntityV2): Bounds | null {
  const c = entity.coordinates;

  if (entity.type === "LINE") {
    if (
      c.x1 === undefined ||
      c.y1 === undefined ||
      c.x2 === undefined ||
      c.y2 === undefined
    ) {
      return null;
    }

    return {
      minX: Math.min(c.x1, c.x2),
      minY: Math.min(c.y1, c.y2),
      maxX: Math.max(c.x1, c.x2),
      maxY: Math.max(c.y1, c.y2),
    };
  }

  if (entity.type === "CIRCLE" || entity.type === "ARC") {
    if (c.cx === undefined || c.cy === undefined || c.r === undefined) {
      return null;
    }

    return {
      minX: c.cx - c.r,
      minY: c.cy - c.r,
      maxX: c.cx + c.r,
      maxY: c.cy + c.r,
    };
  }

  if (
    (entity.type === "LWPOLYLINE" || entity.type === "SPLINE") &&
    c.points &&
    c.points.length > 0
  ) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of c.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, minY, maxX, maxY };
  }

  if (entity.type === "TEXT" && c.x !== undefined && c.y !== undefined) {
    const height = c.height ?? 1;
    const width = (c.text?.length ?? 1) * height * 0.6;
    return {
      minX: c.x,
      minY: c.y - height,
      maxX: c.x + width,
      maxY: c.y,
    };
  }

  return null;
}

function getRectBounds(rect: SelectionRect): Bounds {
  return {
    minX: Math.min(rect.startX, rect.endX),
    minY: Math.min(rect.startY, rect.endY),
    maxX: Math.max(rect.startX, rect.endX),
    maxY: Math.max(rect.startY, rect.endY),
  };
}

function mergeBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

function boundsInside(inner: Bounds, outer: Bounds, padding: number): boolean {
  return (
    inner.minX >= outer.minX - padding &&
    inner.maxX <= outer.maxX + padding &&
    inner.minY >= outer.minY - padding &&
    inner.maxY <= outer.maxY + padding
  );
}

function getBoundsGap(a: Bounds, b: Bounds): number {
  const gapX = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
  const gapY = Math.max(0, a.minY - b.maxY, b.minY - a.maxY);
  return Math.sqrt(gapX * gapX + gapY * gapY);
}

export function doesEntityIntersectRect(
  entity: DxfEntityV2,
  rect: SelectionRect,
): boolean {
  const bbox = getEntityBBox(entity);
  if (!bbox) return false;
  return boundsIntersect(bbox, getRectBounds(rect));
}

/**
 * @deprecated Nicht mehr im Standard-F3-Pfad verwenden.
 * Behalten fuer moegliche spaetere Verwendung als optionaler Expertenmodus
 * (siehe F3_SELECTION_REQUIREMENTS.md, Abschnitt 9).
 */
export function expandSelectionToPartCluster(
  entities: DxfEntityV2[],
  seedIds: number[],
  tolerance: number,
): number[] {
  const bboxById = new Map<number, Bounds>();
  for (const entity of entities) {
    const bbox = getEntityBBox(entity);
    if (bbox) {
      bboxById.set(entity.id, bbox);
    }
  }

  const selectedIds = new Set(seedIds.filter((id) => bboxById.has(id)));
  const queue = [...selectedIds];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) continue;

    const currentBounds = bboxById.get(currentId);
    if (!currentBounds) continue;

    for (const entity of entities) {
      if (selectedIds.has(entity.id)) continue;

      const candidateBounds = bboxById.get(entity.id);
      if (!candidateBounds) continue;

      if (getBoundsGap(currentBounds, candidateBounds) <= tolerance) {
        selectedIds.add(entity.id);
        queue.push(entity.id);
      }
    }
  }

  let clusterBounds: Bounds | null = null;
  for (const id of selectedIds) {
    const bbox = bboxById.get(id);
    if (!bbox) continue;
    clusterBounds = clusterBounds ? mergeBounds(clusterBounds, bbox) : bbox;
  }

  if (!clusterBounds) {
    return seedIds;
  }

  for (const entity of entities) {
    if (selectedIds.has(entity.id)) continue;

    const bbox = bboxById.get(entity.id);
    if (!bbox) continue;

    if (boundsInside(bbox, clusterBounds, tolerance)) {
      selectedIds.add(entity.id);
    }
  }

  return entities
    .filter((entity) => selectedIds.has(entity.id))
    .map((entity) => entity.id);
}
