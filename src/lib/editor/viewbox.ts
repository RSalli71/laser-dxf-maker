/**
 * ViewBox-Berechnung fuer den SVG-Editor.
 *
 * Die ViewBox beschreibt den sichtbaren Ausschnitt der DXF-Welt.
 * Da SVG die Y-Achse nach unten hat und DXF nach oben, wird
 * scale(1,-1) auf einem inneren <g>-Element angewandt.
 * Die ViewBox selbst arbeitet im invertierten Koordinatensystem.
 *
 * Referenz: ARCHITECTURE_V2.md §24.2, ADR-018
 */

import type { BoundingBoxV2, ViewBox } from '@/types/dxf-v2'

/** Default-Padding als Anteil der groesseren Dimension (5%) */
const DEFAULT_PADDING_PERCENT = 0.05

/**
 * Berechnet die initiale ViewBox fuer Fit-to-View.
 * Stellt sicher, dass die gesamte DXF-Zeichnung sichtbar ist und
 * die Aspekt-Ratio des Containers beibehalten wird.
 *
 * @param bbox - DXF Bounding-Box
 * @param containerWidth - Breite des SVG-Containers in Pixeln
 * @param containerHeight - Hoehe des SVG-Containers in Pixeln
 * @param paddingPercent - Padding als Anteil (Default: 0.05 = 5%)
 * @returns ViewBox { cx, cy, w, h }
 */
export function fitToView(
  bbox: BoundingBoxV2,
  containerWidth: number,
  containerHeight: number,
  paddingPercent: number = DEFAULT_PADDING_PERCENT,
): ViewBox {
  // Fallback bei leerer BBox
  if (bbox.width <= 0 || bbox.height <= 0) {
    return { cx: 0, cy: 0, w: 100, h: 100 }
  }

  // Fallback bei ungueltigem Container
  if (containerWidth <= 0 || containerHeight <= 0) {
    return {
      cx: bbox.minX,
      cy: -bbox.maxY,
      w: bbox.width,
      h: bbox.height,
    }
  }

  const padding = Math.max(bbox.width, bbox.height) * paddingPercent

  const contentW = bbox.width + 2 * padding
  const contentH = bbox.height + 2 * padding

  // Aspekt-Ratio des Containers beibehalten
  const containerAspect = containerWidth / containerHeight
  const contentAspect = contentW / contentH

  let w: number
  let h: number

  if (contentAspect > containerAspect) {
    // Content ist breiter -> an Breite anpassen
    w = contentW
    h = contentW / containerAspect
  } else {
    // Content ist hoeher -> an Hoehe anpassen
    h = contentH
    w = contentH * containerAspect
  }

  // cx, cy: obere linke Ecke der ViewBox
  // Y-Inversion: DXF maxY wird SVG minY
  const cx = bbox.minX - padding - (w - contentW) / 2
  const cy = -(bbox.maxY + padding) - (h - contentH) / 2

  return { cx, cy, w, h }
}

/**
 * Erzeugt den SVG viewBox-String aus einem ViewBox-Objekt.
 *
 * @param vb - ViewBox-Objekt
 * @returns SVG viewBox-String "cx cy w h"
 */
export function viewBoxToString(vb: ViewBox): string {
  return `${vb.cx} ${vb.cy} ${vb.w} ${vb.h}`
}
