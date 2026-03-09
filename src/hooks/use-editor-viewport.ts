/**
 * useEditorViewport -- Custom Hook fuer ViewBox/Zoom/Pan-Logik im DXF-Editor.
 *
 * Extrahiert aus DxfEditor.tsx fuer bessere Wartbarkeit.
 * Verwaltet: ViewBox-State, Container-Groesse, Fit-to-View, Wheel-Zoom,
 * Pan-Handling (via viewBoxRef fuer Performance), clientToWorld-Konvertierung.
 *
 * Copied from DXF-Kalkulator, adapted for Laser DXF-Maker types.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoundingBoxV2, ViewBox } from "@/types/dxf-v2";
import { fitToView, viewBoxToString } from "@/lib/editor/viewbox";
import { handleWheel } from "@/lib/editor/zoom";
import { handlePan } from "@/lib/editor/pan";
import { worldPerPixel } from "@/lib/editor/svg-coords";

export interface UseEditorViewportResult {
  /** Ref fuer das SVG-Element */
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** Ref fuer den Container (div) */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Aktuelle Container-Groesse */
  containerSize: { width: number; height: number };
  /** Aktueller ViewBox-State (React-State, wird bei pointerUp aktualisiert) */
  viewBox: ViewBox;
  /** Setter fuer ViewBox (z.B. nach Pan-End) */
  setViewBox: React.Dispatch<React.SetStateAction<ViewBox>>;
  /** Transiente ViewBox-Ref fuer Drag-Performance */
  viewBoxRef: React.RefObject<ViewBox>;
  /** Fit-to-View ausfuehren */
  handleFitToView: () => void;
  /** Strichstaerke basierend auf Zoom */
  strokeWidth: number;
  /** Client-Koordinaten in DXF-Weltkoordinaten umrechnen */
  clientToWorld: (
    clientX: number,
    clientY: number,
  ) => { x: number; y: number } | null;
  /** Pan-Handling: ViewBox direkt auf SVG-Attribut setzen (kein Re-render) */
  applyPan: (deltaX: number, deltaY: number) => void;
}

/**
 * Hook fuer die gesamte Viewport-Logik des DXF-Editors.
 *
 * @param preferredFitBoundingBox - BoundingBox fuer Fit-to-View
 */
export function useEditorViewport(
  preferredFitBoundingBox: BoundingBoxV2,
): UseEditorViewportResult {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 600,
  });

  const [viewBox, setViewBox] = useState<ViewBox>(() =>
    fitToView(preferredFitBoundingBox, 800, 600),
  );

  // Transiente ViewBox fuer Drag-Performance (kein React-State)
  const viewBoxRef = useRef<ViewBox>(viewBox);

  // ---- Container-Groesse messen ----
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const fittedViewBox = fitToView(
            preferredFitBoundingBox,
            width,
            height,
          );
          setViewBox(fittedViewBox);
          viewBoxRef.current = fittedViewBox;
          setContainerSize({ width, height });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [preferredFitBoundingBox]);

  // ---- Fit-to-View ----
  const handleFitToView = useCallback(() => {
    const vb = fitToView(
      preferredFitBoundingBox,
      containerSize.width,
      containerSize.height,
    );
    setViewBox(vb);
    viewBoxRef.current = vb;
  }, [preferredFitBoundingBox, containerSize]);

  // ---- Wheel-Zoom ----
  const onWheelNative = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const newVb = handleWheel(e, svg, viewBoxRef.current);
    viewBoxRef.current = newVb;
    setViewBox(newVb);
  }, []);

  // Wheel-Listener imperativ registrieren: { passive: false } erlaubt preventDefault()
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      svg.removeEventListener("wheel", onWheelNative);
    };
  }, [onWheelNative]);

  // ---- Strichstaerke basierend auf Zoom ----
  const strokeWidth = useMemo(() => {
    const wpp = worldPerPixel(viewBox.w, containerSize.width);
    return Math.max(wpp * 1, 0.001); // Mindestens 1 Pixel breit
  }, [viewBox.w, containerSize.width]);

  // ---- Client-zu-Welt-Konvertierung ----
  const clientToWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;

      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const svgPt = pt.matrixTransform(ctm.inverse());
      return { x: svgPt.x, y: -svgPt.y };
    },
    [],
  );

  // ---- Pan anwenden (direkt auf SVG-Attribut, kein React re-render) ----
  const applyPan = useCallback((deltaX: number, deltaY: number) => {
    const svg = svgRef.current;
    if (!svg) return;

    const newVb = handlePan(deltaX, deltaY, svg, viewBoxRef.current);
    viewBoxRef.current = newVb;
    svg.setAttribute("viewBox", viewBoxToString(newVb));
  }, []);

  return {
    svgRef,
    containerRef,
    containerSize,
    viewBox,
    setViewBox,
    viewBoxRef,
    handleFitToView,
    strokeWidth,
    clientToWorld,
    applyPan,
  };
}
