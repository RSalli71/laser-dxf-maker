/**
 * Pan-Implementierung fuer den SVG-Editor.
 *
 * Verschiebt die ViewBox proportional zur Mausbewegung.
 * Die Skalierung Pixel -> Welt-Einheiten haengt vom aktuellen
 * Zoom-Level ab.
 *
 * Referenz: ARCHITECTURE_V2.md §24.4, ADR-018
 */

import type { ViewBox } from '@/types/dxf-v2'

/**
 * Berechnet die neue ViewBox nach einer Pan-Bewegung.
 *
 * @param deltaClientX - Pixel-Verschiebung in X seit letztem Move
 * @param deltaClientY - Pixel-Verschiebung in Y seit letztem Move
 * @param svgElement - Das SVG-Element (fuer Groessenberechnung)
 * @param currentViewBox - Aktuelle ViewBox
 * @returns Neue ViewBox nach Pan
 */
export function handlePan(
  deltaClientX: number,
  deltaClientY: number,
  svgElement: SVGSVGElement,
  currentViewBox: ViewBox,
): ViewBox {
  // Pixel-Delta in Welt-Delta umrechnen
  const svgRect = svgElement.getBoundingClientRect()
  const scaleX = currentViewBox.w / svgRect.width
  const scaleY = currentViewBox.h / svgRect.height

  return {
    cx: currentViewBox.cx - deltaClientX * scaleX,
    cy: currentViewBox.cy - deltaClientY * scaleY,
    w: currentViewBox.w,
    h: currentViewBox.h,
  }
}
