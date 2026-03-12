/**
 * DxfEditor -- SVG-Editor fuer den Laser DXF-Maker.
 *
 * Basiert auf dem DXF-Kalkulator Editor, angepasst fuer:
 * - Box-Selektion (Rechteck aufziehen, Entities selektieren)
 * - Zwei Modi: "select" (Teile definieren, F3) und "classify" (F5)
 * - Einzelklick-Selektion per Hit-Testing
 * - Zoom (Mausrad), Pan (Mittelklick/Shift+Links), Fit-to-View
 *
 * Performance:
 * - ViewBox via useRef waehrend Drag (kein React Re-render)
 * - EntityPath ist React.memo
 * - vectorEffect="non-scaling-stroke"
 */

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { DxfEntityV2, BoundingBoxV2 } from "@/types/dxf-v2";
import type { ClassificationType } from "@/types/classification";
import { viewBoxToString } from "@/lib/editor/viewbox";
import { getSnapTolerance } from "@/lib/editor/snap-tolerance";
import { hitTestEntity } from "@/lib/editor/hit-test";
import { doesEntityIntersectRect } from "@/lib/editor/entity-selection";
import { useEditorViewport } from "@/hooks/use-editor-viewport";
import { EntityPath } from "./EntityPath";

/** Editor mode */
export type EditorMode = "select" | "classify";

interface DxfEditorProps {
  /** All entities to render */
  entities: DxfEntityV2[];
  /** Current editor mode */
  mode: EditorMode;
  /** Active classification (F5: which category is being assigned) */
  activeClassification?: ClassificationType | null;
  /** Controlled selection for F3. When provided, highlight follows workflow state. */
  selectedEntityIds?: number[];
  /** Called when entities are selected via box or click */
  onEntitiesSelected?: (entityIds: number[]) => void;
  /** Called when a single entity is clicked */
  onEntityClicked?: (entityId: number) => void;
  /** Gerufen wenn eine einzelne Entity abgewaehlt wird (Toggle-Klick im Select-Modus) */
  onEntityDeselected?: (entityId: number) => void;
}

/** Selection rectangle in world coordinates */
interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Compute bounding box from entities.
 */
function computeBoundingBox(entities: DxfEntityV2[]): BoundingBoxV2 {
  if (entities.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const entity of entities) {
    const c = entity.coordinates;

    if (c.x1 !== undefined && c.y1 !== undefined) {
      minX = Math.min(minX, c.x1);
      minY = Math.min(minY, c.y1);
      maxX = Math.max(maxX, c.x1);
      maxY = Math.max(maxY, c.y1);
    }
    if (c.x2 !== undefined && c.y2 !== undefined) {
      minX = Math.min(minX, c.x2);
      minY = Math.min(minY, c.y2);
      maxX = Math.max(maxX, c.x2);
      maxY = Math.max(maxY, c.y2);
    }
    if (c.cx !== undefined && c.cy !== undefined && c.r !== undefined) {
      minX = Math.min(minX, c.cx - c.r);
      minY = Math.min(minY, c.cy - c.r);
      maxX = Math.max(maxX, c.cx + c.r);
      maxY = Math.max(maxY, c.cy + c.r);
    }
    // M4: Ellipse bounding box (conservative: uses max semi-axis)
    if (c.cx !== undefined && c.cy !== undefined && c.rx !== undefined && c.ry !== undefined) {
      const maxR = Math.max(c.rx, c.ry);
      minX = Math.min(minX, c.cx - maxR);
      minY = Math.min(minY, c.cy - maxR);
      maxX = Math.max(maxX, c.cx + maxR);
      maxY = Math.max(maxY, c.cy + maxR);
    }
    if (c.points) {
      for (const p of c.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    if (c.x !== undefined && c.y !== undefined) {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x);
      maxY = Math.max(maxY, c.y);
    }
  }

  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Classification color for selection rectangle */
const CLASSIFICATION_RECT_COLORS: Record<ClassificationType, string> = {
  CUT: "rgba(26, 26, 26, 0.15)",
  BEND: "rgba(0, 204, 0, 0.15)",
  ENGRAVE: "rgba(255, 0, 0, 0.15)",
};

const CLASSIFICATION_STROKE_COLORS: Record<ClassificationType, string> = {
  CUT: "rgba(26, 26, 26, 0.6)",
  BEND: "rgba(0, 204, 0, 0.6)",
  ENGRAVE: "rgba(255, 0, 0, 0.6)",
};

export function DxfEditor({
  entities,
  mode,
  activeClassification,
  selectedEntityIds: controlledSelectedEntityIds,
  onEntitiesSelected,
  onEntityClicked,
  onEntityDeselected,
}: DxfEditorProps) {
  // Bounding box from entities
  const boundingBox = useMemo(() => computeBoundingBox(entities), [entities]);

  // Viewport hook (zoom, pan, fit)
  const {
    svgRef,
    containerRef,
    containerSize,
    viewBox,
    setViewBox,
    viewBoxRef,
    handleFitToView,
    clientToWorld,
    applyPan,
  } = useEditorViewport(boundingBox);

  // ---- Interaction state ----
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null,
  );
  const [hoveredEntityId, setHoveredEntityId] = useState<number | null>(null);
  const [localSelectedEntityIds, setLocalSelectedEntityIds] = useState<
    Set<number>
  >(new Set());

  const isSelectionControlled = controlledSelectedEntityIds !== undefined;
  const effectiveSelectedEntityIds = useMemo(
    () =>
      isSelectionControlled
        ? new Set(controlledSelectedEntityIds)
        : localSelectedEntityIds,
    [
      controlledSelectedEntityIds,
      isSelectionControlled,
      localSelectedEntityIds,
    ],
  );

  const [isPanningState, setIsPanningState] = useState(false);
  const isPanning = useRef(false);
  const isDragging = useRef(false);
  const dragStart = useRef<{ clientX: number; clientY: number } | null>(null);
  const lastPointer = useRef<{ clientX: number; clientY: number } | null>(null);

  // ---- Pointer handlers ----

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Middle click or shift+left click = pan
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        isPanning.current = true;
        setIsPanningState(true);
        lastPointer.current = { clientX: e.clientX, clientY: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // Left click = start box selection or single click
      if (e.button === 0) {
        isDragging.current = false;
        dragStart.current = { clientX: e.clientX, clientY: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Pan handling
      if (isPanning.current && lastPointer.current) {
        const dx = e.clientX - lastPointer.current.clientX;
        const dy = e.clientY - lastPointer.current.clientY;
        lastPointer.current = { clientX: e.clientX, clientY: e.clientY };
        applyPan(dx, dy);
        return;
      }

      // Box selection drag
      if (dragStart.current && e.buttons === 1 && !e.shiftKey) {
        const dx = Math.abs(e.clientX - dragStart.current.clientX);
        const dy = Math.abs(e.clientY - dragStart.current.clientY);

        // Minimum drag threshold to distinguish click from drag
        if (dx > 3 || dy > 3) {
          isDragging.current = true;
        }

        if (isDragging.current) {
          const startWorld = clientToWorld(
            dragStart.current.clientX,
            dragStart.current.clientY,
          );
          const endWorld = clientToWorld(e.clientX, e.clientY);

          if (startWorld && endWorld) {
            setSelectionRect({
              startX: startWorld.x,
              startY: startWorld.y,
              endX: endWorld.x,
              endY: endWorld.y,
            });
          }
        }
        return;
      }

      // Hover hit-testing (only when not dragging/panning)
      if (!isPanning.current && !isDragging.current) {
        const world = clientToWorld(e.clientX, e.clientY);
        if (world) {
          const tolerance = getSnapTolerance(
            viewBoxRef.current,
            containerSize.width,
          );
          const hit = hitTestEntity(world.x, world.y, entities, tolerance);
          setHoveredEntityId(hit?.id ?? null);
        }
      }
    },
    [applyPan, clientToWorld, entities, containerSize.width, viewBoxRef],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);

      // End pan
      if (isPanning.current) {
        isPanning.current = false;
        setIsPanningState(false);
        lastPointer.current = null;
        // Sync viewBox state
        setViewBox({ ...viewBoxRef.current });
        return;
      }

      // End box selection
      if (isDragging.current && selectionRect) {
        // Find all entities within the selection rectangle
        const selectedIds: number[] = [];
        for (const entity of entities) {
          if (doesEntityIntersectRect(entity, selectionRect)) {
            selectedIds.push(entity.id);
          }
        }

        if (selectedIds.length > 0) {
          if (mode === "select") {
            if (!isSelectionControlled) {
              setLocalSelectedEntityIds((prev) => {
                const next = new Set(prev);
                for (const id of selectedIds) {
                  next.add(id);
                }
                return next;
              });
            }
            onEntitiesSelected?.(selectedIds);
          } else {
            onEntitiesSelected?.(selectedIds);
            setLocalSelectedEntityIds(new Set(selectedIds));
          }
        }

        setSelectionRect(null);
        isDragging.current = false;
        dragStart.current = null;
        return;
      }

      // Single click: hit test
      if (!isDragging.current && dragStart.current) {
        const world = clientToWorld(e.clientX, e.clientY);
        if (world) {
          const tolerance = getSnapTolerance(
            viewBoxRef.current,
            containerSize.width,
          );
          const hit = hitTestEntity(world.x, world.y, entities, tolerance);
          if (hit) {
            if (mode === "select") {
              const isCurrentlySelected = effectiveSelectedEntityIds.has(
                hit.id,
              );
              if (isCurrentlySelected) {
                if (!isSelectionControlled) {
                  setLocalSelectedEntityIds((prev) => {
                    const next = new Set(prev);
                    next.delete(hit.id);
                    return next;
                  });
                }
                onEntityDeselected?.(hit.id);
              } else {
                if (!isSelectionControlled) {
                  setLocalSelectedEntityIds((prev) =>
                    new Set(prev).add(hit.id),
                  );
                }
                onEntitiesSelected?.([hit.id]);
              }
            } else {
              onEntityClicked?.(hit.id);
              setLocalSelectedEntityIds(new Set([hit.id]));
            }
          } else if (mode === "classify" || !isSelectionControlled) {
            setLocalSelectedEntityIds(new Set());
          }
        }
      }

      isDragging.current = false;
      dragStart.current = null;
    },
    [
      selectionRect,
      entities,
      mode,
      effectiveSelectedEntityIds,
      isSelectionControlled,
      clientToWorld,
      containerSize.width,
      viewBoxRef,
      setViewBox,
      onEntitiesSelected,
      onEntityClicked,
      onEntityDeselected,
    ],
  );

  // ---- Selection rectangle SVG ----
  const selectionRectElement = useMemo(() => {
    if (!selectionRect) return null;

    const x = Math.min(selectionRect.startX, selectionRect.endX);
    const y = Math.min(selectionRect.startY, selectionRect.endY);
    const w = Math.abs(selectionRect.endX - selectionRect.startX);
    const h = Math.abs(selectionRect.endY - selectionRect.startY);

    // Color depends on mode
    let fill = "rgba(59, 130, 246, 0.15)";
    let strokeColor = "rgba(59, 130, 246, 0.6)";

    if (mode === "classify" && activeClassification) {
      fill = CLASSIFICATION_RECT_COLORS[activeClassification];
      strokeColor = CLASSIFICATION_STROKE_COLORS[activeClassification];
    }

    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={fill}
        stroke={strokeColor}
        strokeWidth={1}
        strokeDasharray="4 2"
        vectorEffect="non-scaling-stroke"
      />
    );
  }, [selectionRect, mode, activeClassification]);

  // ---- Render ----
  const hasSelection = effectiveSelectedEntityIds.size > 0;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#f8f9fa]"
    >
      {/* Fit-to-View button */}
      <button
        onClick={handleFitToView}
        className="absolute top-3 right-3 z-10 rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-white"
        type="button"
      >
        Fit
      </button>

      <svg
        ref={svgRef}
        viewBox={viewBoxToString(viewBox)}
        className={`h-full w-full ${isPanningState ? "cursor-grabbing" : "cursor-crosshair"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <g transform="scale(1,-1)">
          {/* Background rect for click-deselect */}
          <rect
            x={viewBox.cx - viewBox.w}
            y={-viewBox.cy - viewBox.h * 2}
            width={viewBox.w * 3}
            height={viewBox.h * 3}
            fill="transparent"
          />

          {/* Render all entities */}
          {entities.map((entity) => (
            <EntityPath
              key={entity.id}
              entity={entity}
              isSelected={effectiveSelectedEntityIds.has(entity.id)}
              isHovered={hoveredEntityId === entity.id}
              isDimmed={
                hasSelection && !effectiveSelectedEntityIds.has(entity.id)
              }
              isAssigned={!!entity.partId}
            />
          ))}

          {/* Selection rectangle */}
          {selectionRectElement}
        </g>
      </svg>
    </div>
  );
}
