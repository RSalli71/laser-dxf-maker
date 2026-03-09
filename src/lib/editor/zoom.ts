/**
 * Zoom-Implementierung fuer den SVG-Editor.
 *
 * Zoomt auf die aktuelle Mausposition (nicht auf die Mitte).
 * Der Punkt unter der Maus bleibt visuell stabil.
 *
 * Referenz: ARCHITECTURE_V2.md §24.3, ADR-018
 */

import type { ViewBox } from '@/types/dxf-v2'
import { svgToWorldCoords } from './svg-coords'

/** 10% pro Mausrad-Schritt */
const ZOOM_FACTOR = 0.1

/** Minimale ViewBox-Breite (verhindert Division-by-Zero) */
const MIN_ZOOM_W = 0.001

/**
 * Berechnet die neue ViewBox nach einem Mausrad-Zoom-Event.
 * Zoomt auf die aktuelle Mausposition: der Punkt unter dem
 * Mauszeiger bleibt visuell an derselben Stelle.
 *
 * @param event - Das native WheelEvent
 * @param svgElement - Das SVG-Element mit der ViewBox
 * @param currentViewBox - Aktuelle ViewBox
 * @returns Neue ViewBox nach Zoom
 */
export function handleWheel(
  event: WheelEvent,
  svgElement: SVGSVGElement,
  currentViewBox: ViewBox,
): ViewBox {
  // 1. Mausposition in Weltkoordinaten umrechnen
  const point = svgToWorldCoords(event.clientX, event.clientY, svgElement)

  // 2. Zoom-Faktor berechnen (scrollUp = rein, scrollDown = raus)
  const delta = event.deltaY > 0 ? 1 + ZOOM_FACTOR : 1 - ZOOM_FACTOR

  // 3. Neue ViewBox-Groesse (mit Minimum)
  const newW = Math.max(MIN_ZOOM_W, currentViewBox.w * delta)
  const newH = Math.max(MIN_ZOOM_W, currentViewBox.h * delta)

  // 4. Verschiebung so berechnen, dass der Punkt unter der Maus stabil bleibt
  const ratioX = (point.x - currentViewBox.cx) / currentViewBox.w
  const ratioY = (point.y - currentViewBox.cy) / currentViewBox.h

  const newCx = point.x - ratioX * newW
  const newCy = point.y - ratioY * newH

  return { cx: newCx, cy: newCy, w: newW, h: newH }
}

export { ZOOM_FACTOR, MIN_ZOOM_W }
