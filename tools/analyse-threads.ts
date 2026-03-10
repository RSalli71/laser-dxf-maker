import { parseDxf } from "../src/lib/dxf/parser";
import { cleanEntities } from "../src/lib/dxf/cleaner";
import { readFileSync } from "fs";

const content = readFileSync(
  "docs/knowledge/dxf-Data/ai1607002_Kanthalter EFR B10.DXF",
  "utf8",
);
const parsed = parseDxf(content);
const { cleaned } = cleanEntities(parsed.entities);

console.log("=== SPLINES nach Bereinigung ===");
const splines = cleaned.filter((e) => e.type === "SPLINE");
for (const s of splines) {
  const pts = s.coordinates.points || [];
  const bbox = pts.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      maxX: Math.max(acc.maxX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxY: Math.max(acc.maxY, p.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const w = bbox.maxX - bbox.minX;
  const h = bbox.maxY - bbox.minY;
  console.log(
    `ID:${s.id} closed:${s.closed} pts:${pts.length} len:${s.length.toFixed(1)} bbox:${w.toFixed(1)}x${h.toFixed(1)} center:${((bbox.minX + bbox.maxX) / 2).toFixed(1)},${((bbox.minY + bbox.maxY) / 2).toFixed(1)} src:${s.sourceBlock || "direct"}`,
  );
}

console.log("\n=== ARCS nach Bereinigung ===");
const arcs = cleaned.filter((e) => e.type === "ARC");
for (const a of arcs) {
  console.log(
    `ID:${a.id} r:${a.coordinates.r?.toFixed(1)} angles:${a.coordinates.startAngle?.toFixed(0)}-${a.coordinates.endAngle?.toFixed(0)} len:${a.length.toFixed(1)} cx:${a.coordinates.cx?.toFixed(1)} cy:${a.coordinates.cy?.toFixed(1)} src:${a.sourceBlock || "direct"}`,
  );
}

console.log("\n=== CIRCLES nach Bereinigung ===");
const circles = cleaned.filter((e) => e.type === "CIRCLE");
for (const c of circles) {
  console.log(
    `ID:${c.id} r:${c.coordinates.r?.toFixed(2)} cx:${c.coordinates.cx?.toFixed(1)} cy:${c.coordinates.cy?.toFixed(1)} src:${c.sourceBlock || "direct"}`,
  );
}

// Suche: Welche Entities haben gleiche/aehnliche Mittelpunkte?
console.log("\n=== ENTITIES GRUPPIERT NACH POSITION ===");
type PosKey = string;
const groups = new Map<
  PosKey,
  Array<{ id: number; type: string; r?: number; length: number }>
>();
const GRID = 1.0;

for (const e of cleaned) {
  let cx: number, cy: number;
  if (e.type === "CIRCLE" || e.type === "ARC") {
    cx = e.coordinates.cx || 0;
    cy = e.coordinates.cy || 0;
  } else if (e.type === "SPLINE") {
    const pts = e.coordinates.points || [];
    if (pts.length === 0) continue;
    cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  } else {
    continue;
  }
  const key = `${Math.round(cx / GRID)},${Math.round(cy / GRID)}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push({
    id: e.id,
    type: e.type,
    r: e.coordinates.r,
    length: e.length,
  });
}

// Zeige nur Gruppen mit mehreren Entities (potentielle Gewinde)
for (const [key, items] of groups) {
  if (items.length > 1) {
    console.log(
      `Position ${key}: ${items.map((i) => `${i.type}(id:${i.id}, r:${i.r?.toFixed(1) ?? "-"}, len:${i.length.toFixed(1)})`).join(" + ")}`,
    );
  }
}
