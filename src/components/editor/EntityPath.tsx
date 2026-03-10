/**
 * EntityPath -- Rendert eine einzelne DXF-Entity als SVG-Pfad.
 *
 * Verwendet React.memo um unnoetige Re-Renders bei Zoom/Pan zu vermeiden.
 *
 * Unterstuetzte Entity-Typen: LINE, ARC, CIRCLE, LWPOLYLINE
 * (TEXT wird nicht als Pfad gerendert, DIMENSION wird vom Cleaner entfernt)
 *
 * Visuelles Feedback basiert auf:
 * - classification (CUT, BEND, ENGRAVE)
 * - partId (zugeordnetes Teil)
 * - isSelected (vom Benutzer selektiert)
 *
 * Adapted from DXF-Kalkulator EntityPath.tsx for Laser DXF-Maker.
 */

import { memo } from "react";
import type { DxfEntityV2 } from "@/types/dxf-v2";
import { BULGE_THRESHOLD } from "@/lib/dxf/parser";
import type { ClassificationType } from "@/types/classification";
import { getLayerConfig } from "@/types/classification";

/** ACI-Farben Mapping (Subset der 256 AutoCAD-Farben) */
const ACI_COLORS: Record<number, string> = {
  0: "#808080", // ByBlock -> Grau
  1: "#ff0000", // Rot
  2: "#ffff00", // Gelb
  3: "#00cc00", // Gruen
  4: "#00aacc", // Cyan
  5: "#0000ff", // Blau
  6: "#cc00cc", // Magenta
  7: "#1a1a1a", // Weiss -> Dunkelgrau (auf hellem Hintergrund)
  8: "#555555", // Dunkelgrau
  9: "#888888", // Hellgrau
  256: "#808080", // ByLayer -> Grau
};

/** Default-Farbe fuer nicht gemappte ACI-Nummern */
const DEFAULT_COLOR = "#555555";

/** Classification to hex color mapping */
const CLASSIFICATION_COLORS: Record<ClassificationType, string> = {
  CUT: getLayerConfig("CUT")!.hexColor,
  BEND: getLayerConfig("BEND")!.hexColor,
  ENGRAVE: getLayerConfig("ENGRAVE")!.hexColor,
};

/**
 * Umfaerbt helle Farben die auf dem hellen Canvas unsichtbar waeren.
 */
function resolveEntityColor(color: string): string {
  const normalized = color.toLowerCase().trim();
  if (
    normalized === "#ffffff" ||
    normalized === "white" ||
    normalized === "#fff"
  ) {
    return "#1a1a1a";
  }
  return color;
}

interface EntityPathProps {
  entity: DxfEntityV2;
  /** Whether this entity is currently selected (highlight) */
  isSelected?: boolean;
  /** Whether this entity is hovered */
  isHovered?: boolean;
  /** Whether other entities are selected and this one is not part of them */
  isDimmed?: boolean;
  /** Whether this entity belongs to a part (has partId set) */
  isAssigned?: boolean;
}

/**
 * Rendert eine einzelne DXF-Entity als SVG-Pfad.
 */
function EntityPathInner({
  entity,
  isSelected = false,
  isHovered = false,
  isDimmed = false,
  isAssigned = false,
}: EntityPathProps) {
  const d = entityToSvgPath(entity);
  if (!d) return null;

  // Determine stroke color, width, opacity
  let stroke: string;
  let sw: number;
  let opacity: number;
  let dashArray: string | undefined;

  if (isSelected) {
    // Selected entity: high-contrast highlight for F3 review
    stroke = "#ea580c";
    sw = 3;
    opacity = 1;
  } else if (isHovered) {
    stroke = "#f97316";
    sw = 2;
    opacity = 0.9;
  } else if (entity.classification) {
    // Classified entity: use classification color
    stroke = CLASSIFICATION_COLORS[entity.classification];
    sw = 1.5;
    opacity = 1;
  } else if (isDimmed) {
    // Dimmed when other things are selected
    const rawColor = ACI_COLORS[entity.color] ?? DEFAULT_COLOR;
    stroke = resolveEntityColor(rawColor);
    sw = 1;
    opacity = 0.15;
  } else if (isAssigned) {
    // Assigned to a part but not classified yet
    const rawColor = ACI_COLORS[entity.color] ?? DEFAULT_COLOR;
    stroke = resolveEntityColor(rawColor);
    sw = 1.5;
    opacity = 0.8;
  } else {
    // Default: use DXF ACI color
    const rawColor = ACI_COLORS[entity.color] ?? DEFAULT_COLOR;
    stroke = resolveEntityColor(rawColor);
    sw = 1.5;
    opacity = 1;
  }

  return (
    <path
      data-entity-id={entity.id}
      d={d}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={opacity}
      strokeDasharray={dashArray}
      vectorEffect="non-scaling-stroke"
      className="pointer-events-stroke"
    />
  );
}

/**
 * Wandelt eine DxfEntityV2 in einen SVG-Path-d-String um.
 */
function entityToSvgPath(entity: DxfEntityV2): string | null {
  const c = entity.coordinates;

  switch (entity.type) {
    case "LINE":
      return lineToPath(c);
    case "ARC":
      return arcToPath(c);
    case "CIRCLE":
      return circleToPath(c);
    case "ELLIPSE":
      return ellipseToPath(c, entity.closed);
    case "LWPOLYLINE":
    case "SPLINE":
      return polylineToPath(c, entity.closed);
    default:
      return null;
  }
}

function lineToPath(c: DxfEntityV2["coordinates"]): string | null {
  if (
    c.x1 === undefined ||
    c.y1 === undefined ||
    c.x2 === undefined ||
    c.y2 === undefined
  ) {
    return null;
  }
  return `M${c.x1},${c.y1} L${c.x2},${c.y2}`;
}

function arcToPath(c: DxfEntityV2["coordinates"]): string | null {
  if (
    c.cx === undefined ||
    c.cy === undefined ||
    c.r === undefined ||
    c.startAngle === undefined ||
    c.endAngle === undefined
  ) {
    return null;
  }

  const startRad = (c.startAngle * Math.PI) / 180;
  let endRad = (c.endAngle * Math.PI) / 180;

  // DXF-Winkel CCW; wenn end < start -> +2pi
  if (endRad <= startRad) endRad += 2 * Math.PI;

  const x1 = c.cx + c.r * Math.cos(startRad);
  const y1 = c.cy + c.r * Math.sin(startRad);
  const x2 = c.cx + c.r * Math.cos(endRad);
  const y2 = c.cy + c.r * Math.sin(endRad);

  const largeArc = endRad - startRad > Math.PI ? 1 : 0;
  const sweep = 1; // CCW in DXF -> sweep=1 in SVG (wegen scale(1,-1))

  return `M${x1},${y1} A${c.r},${c.r} 0 ${largeArc},${sweep} ${x2},${y2}`;
}

function circleToPath(c: DxfEntityV2["coordinates"]): string | null {
  if (c.cx === undefined || c.cy === undefined || c.r === undefined) {
    return null;
  }

  // SVG-Kreis als zwei Halbkreis-Boegen
  const r = c.r;
  return [
    `M${c.cx - r},${c.cy}`,
    `A${r},${r} 0 1,0 ${c.cx + r},${c.cy}`,
    `A${r},${r} 0 1,0 ${c.cx - r},${c.cy}`,
    "Z",
  ].join(" ");
}

function ellipseToPath(
  c: DxfEntityV2["coordinates"],
  closed?: boolean,
): string | null {
  if (c.cx === undefined || c.cy === undefined || c.rx === undefined || c.ry === undefined) {
    return null;
  }

  const { cx, cy, rx, ry, rotation = 0 } = c;

  if (closed || (c.startAngle === undefined && c.endAngle === undefined)) {
    // Volle Ellipse als zwei Halbboegen
    // SVG-Arc mit rotation fuer gedrehte Ellipsen
    return [
      `M${cx - rx},${cy}`,
      `A${rx},${ry} ${rotation} 1,0 ${cx + rx},${cy}`,
      `A${rx},${ry} ${rotation} 1,0 ${cx - rx},${cy}`,
      "Z",
    ].join(" ");
  }

  // Elliptischer Bogen
  const startRad = ((c.startAngle ?? 0) * Math.PI) / 180;
  let endRad = ((c.endAngle ?? 360) * Math.PI) / 180;
  if (endRad <= startRad) endRad += 2 * Math.PI;

  const x1 = cx + rx * Math.cos(startRad);
  const y1 = cy + ry * Math.sin(startRad);
  const x2 = cx + rx * Math.cos(endRad);
  const y2 = cy + ry * Math.sin(endRad);

  const largeArc = endRad - startRad > Math.PI ? 1 : 0;
  const sweep = 1; // CCW in DXF → sweep=1 wegen scale(1,-1)

  return `M${x1},${y1} A${rx},${ry} ${rotation} ${largeArc},${sweep} ${x2},${y2}`;
}

/**
 * Konvertiert ein Bulge-Segment in einen SVG-Arc-String.
 *
 * Sweep-Richtung:
 *   sweep = bulge > 0 ? 1 : 0
 *   Dies ist KORREKT weil DxfEditor.tsx <g transform="scale(1,-1)"> verwendet.
 *   Ohne diese Y-Spiegelung waeren alle Boegen spiegelverkehrt!
 */
function bulgeToSvgArc(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  bulge: number,
): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chord = Math.sqrt(dx * dx + dy * dy);

  if (chord < 1e-10) return "";

  const theta = 4 * Math.atan(Math.abs(bulge));

  const sinHalfTheta = Math.sin(theta / 2);
  // Schutz vor Division durch Null
  const r =
    Math.abs(sinHalfTheta) < 1e-10
      ? chord * 1000 // Fallback: grosser Radius ergibt visuell fast gerade Linie (Faktor 1000 ist beliebig gross genug)
      : chord / (2 * sinHalfTheta);

  const largeArc = theta > Math.PI ? 1 : 0;
  // Korrekt NUR mit scale(1,-1) im SVG-Container!
  const sweep = bulge > 0 ? 1 : 0;

  return `A${r},${r} 0 ${largeArc},${sweep} ${p2.x},${p2.y}`;
}

function polylineToPath(
  c: DxfEntityV2["coordinates"],
  closed?: boolean,
): string | null {
  if (!c.points || c.points.length < 2) return null;

  const points = c.points;
  const parts: string[] = [`M${points[0].x},${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (p1.bulge !== undefined && Math.abs(p1.bulge) >= BULGE_THRESHOLD) {
      parts.push(bulgeToSvgArc(p1, p2, p1.bulge));
    } else {
      parts.push(`L${p2.x},${p2.y}`);
    }
  }

  // Geschlossene Polylinie: letztes Segment (letzter Punkt -> erster Punkt)
  if (closed && points.length > 1) {
    const lastPt = points[points.length - 1];
    const firstPt = points[0];
    if (lastPt.bulge !== undefined && Math.abs(lastPt.bulge) >= BULGE_THRESHOLD) {
      parts.push(bulgeToSvgArc(lastPt, firstPt, lastPt.bulge));
    } else {
      parts.push("Z");
    }
  }

  return parts.join(" ");
}

export const EntityPath = memo(EntityPathInner);
EntityPath.displayName = "EntityPath";
