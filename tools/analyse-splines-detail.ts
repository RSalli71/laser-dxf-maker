import { parseDxf } from "../src/lib/dxf/parser";
import { readFileSync } from "fs";

const content = readFileSync(
  "docs/knowledge/dxf-Data/ai1607002_Kanthalter EFR B10.DXF",
  "utf8",
);
const parsed = parseDxf(content);

const openSplines = parsed.entities.filter(
  (e) => e.type === "SPLINE" && !e.closed && !e.sourceBlock,
);

console.log("=== Alle open SPLINEs mit Color + Linetype ===");
for (const s of openSplines) {
  const pts = s.coordinates.points || [];
  const cx = (pts.reduce((a, p) => a + p.x, 0) / pts.length).toFixed(1);
  const cy = (pts.reduce((a, p) => a + p.y, 0) / pts.length).toFixed(1);
  console.log(
    `ID:${s.id} color:${s.color} linetype:${s.linetype} layer:${s.layer} center:${cx},${cy} pts:${pts.length}`,
  );
}

// Check: Are there ANY non-SPLINE entities near the spline clusters?
console.log("\n=== Nicht-SPLINE Entities in Region 425-470, 190-225 (Thread-Cluster T2) ===");
const nonSplineNearThread = parsed.entities.filter(
  (e) =>
    e.type !== "SPLINE" &&
    !e.sourceBlock &&
    e.type !== "DIMENSION",
);
for (const e of nonSplineNearThread) {
  let cx = 0, cy = 0;
  if (e.type === "LINE") {
    cx = ((e.coordinates.x1 ?? 0) + (e.coordinates.x2 ?? 0)) / 2;
    cy = ((e.coordinates.y1 ?? 0) + (e.coordinates.y2 ?? 0)) / 2;
  } else if (e.type === "CIRCLE" || e.type === "ARC") {
    cx = e.coordinates.cx ?? 0;
    cy = e.coordinates.cy ?? 0;
  } else continue;

  if (cx >= 420 && cx <= 475 && cy >= 185 && cy <= 230) {
    console.log(`${e.type} ID:${e.id} center:${cx.toFixed(1)},${cy.toFixed(1)} len:${e.length.toFixed(1)} color:${e.color} linetype:${e.linetype}`);
  }
}

console.log("\n=== Nicht-SPLINE Entities in Region 95-130, 245-270 (Gravur-Cluster T1) ===");
for (const e of nonSplineNearThread) {
  let cx = 0, cy = 0;
  if (e.type === "LINE") {
    cx = ((e.coordinates.x1 ?? 0) + (e.coordinates.x2 ?? 0)) / 2;
    cy = ((e.coordinates.y1 ?? 0) + (e.coordinates.y2 ?? 0)) / 2;
  } else if (e.type === "CIRCLE" || e.type === "ARC") {
    cx = e.coordinates.cx ?? 0;
    cy = e.coordinates.cy ?? 0;
  } else continue;

  if (cx >= 90 && cx <= 135 && cy >= 240 && cy <= 275) {
    console.log(`${e.type} ID:${e.id} center:${cx.toFixed(1)},${cy.toFixed(1)} len:${e.length.toFixed(1)} color:${e.color} linetype:${e.linetype}`);
  }
}
