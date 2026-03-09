/**
 * Dynamische Snap-Toleranz fuer den SVG-Editor.
 *
 * Die Snap-Toleranz ist in Pixeln konstant (immer SNAP_PIXELS px),
 * aber in Weltkoordinaten variabel. Bei kleinem Zoom (Uebersicht) ist
 * die Welt-Toleranz gross, bei grossem Zoom (Detail) klein.
 *
 * Referenz: ARCHITECTURE_V2.md §24.6, F4.2
 */

import type { ViewBox } from '@/types/dxf-v2'

/** Fester Pixelwert fuer "nah genug" */
const SNAP_PIXELS = 8

/**
 * Berechnet die Snap-Toleranz in Weltkoordinaten
 * basierend auf dem aktuellen Zoom-Level.
 *
 * @param viewBox - Aktuelle ViewBox
 * @param containerWidth - Breite des SVG-Containers in Pixeln
 * @returns Snap-Toleranz in Welt-Einheiten
 */
export function getSnapTolerance(
  viewBox: ViewBox,
  containerWidth: number,
): number {
  if (containerWidth <= 0) return 1
  // Welt-Einheiten pro Pixel
  const wpp = viewBox.w / containerWidth
  // Snap-Toleranz in Welt-Einheiten
  return SNAP_PIXELS * wpp
}

export { SNAP_PIXELS }
