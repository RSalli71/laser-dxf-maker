import { parseDxf } from "../src/lib/dxf/parser";
import { cleanEntities } from "../src/lib/dxf/cleaner";
import { readFileSync } from "fs";

const content = readFileSync(
  "docs/knowledge/dxf-Data/ai1607002_Kanthalter EFR B10.DXF",
  "utf8",
);
const parsed = parseDxf(content);
const { cleaned, report } = cleanEntities(parsed.entities);

console.log("Report:", JSON.stringify(report));

// Gravur-Region: ~90-135, ~240-275
function inGravurRegion(e: (typeof cleaned)[0]): boolean {
  let cx = 0, cy = 0;
  if (e.type === "LINE") {
    cx = ((e.coordinates.x1 ?? 0) + (e.coordinates.x2 ?? 0)) / 2;
    cy = ((e.coordinates.y1 ?? 0) + (e.coordinates.y2 ?? 0)) / 2;
  } else if (e.type === "SPLINE") {
    const pts = e.coordinates.points || [];
    if (!pts.length) return false;
    cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  } else {
    return false;
  }
  return cx >= 90 && cx <= 135 && cy >= 240 && cy <= 275;
}

// Before cleaning
const gravurBefore = parsed.entities.filter(
  (e) => !e.sourceBlock && e.type !== "DIMENSION" && inGravurRegion(e),
);
console.log("\nGravur-Entities VOR Cleaning:", gravurBefore.length);
for (const e of gravurBefore) {
  console.log(`  ${e.type} ID:${e.id} len:${e.length.toFixed(1)} closed:${e.closed ?? "-"}`);
}

// After cleaning
const gravurAfter = cleaned.filter(inGravurRegion);
console.log("\nGravur-Entities NACH Cleaning:", gravurAfter.length);
for (const e of gravurAfter) {
  console.log(`  ${e.type} ID:${e.id} len:${e.length.toFixed(1)} closed:${e.closed ?? "-"}`);
}

// What was removed from gravur?
const afterIds = new Set(gravurAfter.map((e) => e.id));
const removed = gravurBefore.filter((e) => !afterIds.has(e.id));
console.log("\nAus Gravur ENTFERNT:", removed.length);
for (const e of removed) {
  console.log(`  ${e.type} ID:${e.id} len:${e.length.toFixed(1)}`);
}
