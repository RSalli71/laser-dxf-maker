import { parseDxf } from "../src/lib/dxf/parser";
import { readFileSync } from "fs";

const content = readFileSync(
  "docs/knowledge/dxf-Data/ai1607002_Kanthalter EFR B10.DXF",
  "utf8",
);
const parsed = parseDxf(content);

// Filter: nur direkte Entities mit CONTINUOUS linetype
const afterBasic = parsed.entities.filter(
  (e) =>
    !e.sourceBlock &&
    e.type !== "DIMENSION" &&
    e.linetype.toUpperCase() === "CONTINUOUS",
);

const circles = afterBasic.filter((e) => e.type === "CIRCLE");
const arcs = afterBasic.filter((e) => e.type === "ARC");

console.log("=== CIRCLEs MIT konzentrischen ARCs (Gewinde-Muster) ===");
for (const c of circles) {
  const concentricArcs = arcs.filter(
    (a) =>
      Math.abs((a.coordinates.cx ?? 0) - (c.coordinates.cx ?? 0)) < 1.0 &&
      Math.abs((a.coordinates.cy ?? 0) - (c.coordinates.cy ?? 0)) < 1.0,
  );
  if (concentricArcs.length > 0) {
    console.log(
      `CIRCLE ID:${c.id} r:${c.coordinates.r?.toFixed(2)} cx:${c.coordinates.cx?.toFixed(1)} cy:${c.coordinates.cy?.toFixed(1)}`,
    );
    for (const a of concentricArcs) {
      let span =
        (a.coordinates.endAngle ?? 360) - (a.coordinates.startAngle ?? 0);
      if (span <= 0) span += 360;
      console.log(
        `  -> ARC ID:${a.id} r:${a.coordinates.r?.toFixed(2)} span:${span.toFixed(0)} angles:${a.coordinates.startAngle?.toFixed(0)}-${a.coordinates.endAngle?.toFixed(0)}`,
      );
    }
  }
}

console.log("\n=== ARCs OHNE konzentrischen Circle ===");
for (const a of arcs) {
  const hasCircle = circles.some(
    (c) =>
      Math.abs((a.coordinates.cx ?? 0) - (c.coordinates.cx ?? 0)) < 1.0 &&
      Math.abs((a.coordinates.cy ?? 0) - (c.coordinates.cy ?? 0)) < 1.0,
  );
  if (!hasCircle) {
    let span =
      (a.coordinates.endAngle ?? 360) - (a.coordinates.startAngle ?? 0);
    if (span <= 0) span += 360;
    console.log(
      `ARC ID:${a.id} r:${a.coordinates.r?.toFixed(2)} span:${span.toFixed(0)} cx:${a.coordinates.cx?.toFixed(1)} cy:${a.coordinates.cy?.toFixed(1)}`,
    );
  }
}

console.log("\n=== CIRCLEs OHNE konzentrischen ARC (reine Bohrungen) ===");
for (const c of circles) {
  const concentricArcs = arcs.filter(
    (a) =>
      Math.abs((a.coordinates.cx ?? 0) - (c.coordinates.cx ?? 0)) < 1.0 &&
      Math.abs((a.coordinates.cy ?? 0) - (c.coordinates.cy ?? 0)) < 1.0,
  );
  if (concentricArcs.length === 0) {
    console.log(
      `CIRCLE ID:${c.id} r:${c.coordinates.r?.toFixed(2)} cx:${c.coordinates.cx?.toFixed(1)} cy:${c.coordinates.cy?.toFixed(1)}`,
    );
  }
}
