import { parseDxf } from "../src/lib/dxf/parser";
import { cleanEntities } from "../src/lib/dxf/cleaner";
import { readFileSync } from "fs";

const content = readFileSync(
  "docs/knowledge/dxf-Data/ai1607002_Kanthalter EFR B10.DXF",
  "utf8",
);
const parsed = parseDxf(content);

// Get all open SPLINEs without sourceBlock (those that would be removed)
const openSplines = parsed.entities.filter(
  (e) => e.type === "SPLINE" && !e.closed && !e.sourceBlock,
);

console.log(`Total open SPLINEs (ohne sourceBlock): ${openSplines.length}\n`);

// Cluster by spatial proximity
const CLUSTER_DIST = 20; // DXF units
type Cluster = typeof openSplines;
const clusters: Cluster[] = [];
const assigned = new Set<number>();

for (let i = 0; i < openSplines.length; i++) {
  if (assigned.has(i)) continue;
  const cluster: Cluster = [openSplines[i]];
  assigned.add(i);

  const pts0 = openSplines[i].coordinates.points || [];
  const cx0 = pts0.reduce((s, p) => s + p.x, 0) / pts0.length;
  const cy0 = pts0.reduce((s, p) => s + p.y, 0) / pts0.length;

  for (let j = i + 1; j < openSplines.length; j++) {
    if (assigned.has(j)) continue;
    const ptsJ = openSplines[j].coordinates.points || [];
    const cxJ = ptsJ.reduce((s, p) => s + p.x, 0) / ptsJ.length;
    const cyJ = ptsJ.reduce((s, p) => s + p.y, 0) / ptsJ.length;

    if (Math.abs(cx0 - cxJ) < CLUSTER_DIST && Math.abs(cy0 - cyJ) < CLUSTER_DIST) {
      cluster.push(openSplines[j]);
      assigned.add(j);
    }
  }
  clusters.push(cluster);
}

console.log(`Clusters: ${clusters.length}\n`);

for (const [ci, cluster] of clusters.entries()) {
  // Compute overall bounding box of cluster
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of cluster) {
    for (const p of s.coordinates.points || []) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  const cx = ((minX + maxX) / 2).toFixed(1);
  const cy = ((minY + maxY) / 2).toFixed(1);
  const w = (maxX - minX).toFixed(1);
  const h = (maxY - minY).toFixed(1);

  // Check if any CIRCLEs or ARCs are near this cluster
  const nearCircles = parsed.entities.filter(
    (e) =>
      (e.type === "CIRCLE" || e.type === "ARC") &&
      !e.sourceBlock &&
      Math.abs((e.coordinates.cx ?? 0) - (minX + maxX) / 2) < CLUSTER_DIST &&
      Math.abs((e.coordinates.cy ?? 0) - (minY + maxY) / 2) < CLUSTER_DIST,
  );

  console.log(
    `Cluster ${ci}: ${cluster.length} SPLINEs, bbox: ${w}x${h}, center: ${cx},${cy}, layers: ${[...new Set(cluster.map((s) => s.layer))].join(",")}, nearby circles/arcs: ${nearCircles.length}`,
  );
  for (const s of cluster) {
    const pts = s.coordinates.points || [];
    const sCx = (pts.reduce((a, p) => a + p.x, 0) / pts.length).toFixed(1);
    const sCy = (pts.reduce((a, p) => a + p.y, 0) / pts.length).toFixed(1);
    console.log(`  ID:${s.id} pts:${pts.length} len:${s.length.toFixed(1)} center:${sCx},${sCy} layer:${s.layer}`);
  }
  console.log();
}
