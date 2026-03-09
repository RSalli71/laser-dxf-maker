/**
 * Screen <-> World Koordinaten-Umrechnung fuer den SVG-Editor.
 *
 * Nutzt die native SVG CTM (Current Transformation Matrix) Inverse
 * um Pixel-Koordinaten in Weltkoordinaten umzurechnen.
 *
 * Referenz: ARCHITECTURE_V2.md §24.3, ADR-018
 */

/**
 * Wandelt Screen-Koordinaten (Pixel) in SVG-Weltkoordinaten um.
 * Nutzt die native SVG getScreenCTM().inverse() Methode.
 *
 * @param clientX - X-Position relativ zum Viewport (z.B. aus MouseEvent)
 * @param clientY - Y-Position relativ zum Viewport
 * @param svgElement - Das SVG-Element mit der ViewBox
 * @returns Weltkoordinaten { x, y }
 */
export function svgToWorldCoords(
  clientX: number,
  clientY: number,
  svgElement: SVGSVGElement,
): { x: number; y: number } {
  const pt = svgElement.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svgElement.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const worldPt = pt.matrixTransform(ctm.inverse())
  return { x: worldPt.x, y: worldPt.y }
}

/**
 * Berechnet den Skalierungsfaktor: Welt-Einheiten pro Pixel.
 * Nuetzlich fuer Snap-Toleranz und Strichstaerke-Berechnung.
 *
 * @param viewBoxWidth - Breite der ViewBox in Welt-Einheiten
 * @param containerWidth - Breite des SVG-Containers in Pixeln
 * @returns Welt-Einheiten pro Pixel
 */
export function worldPerPixel(
  viewBoxWidth: number,
  containerWidth: number,
): number {
  if (containerWidth <= 0) return 1
  return viewBoxWidth / containerWidth
}
