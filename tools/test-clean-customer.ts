import { parseDxf } from "../src/lib/dxf/parser";
import { cleanEntities } from "../src/lib/dxf/cleaner";
import { readFileSync } from "fs";

const content = readFileSync(
  "docs/knowledge/dxf-Data/ai1607002_Kanthalter EFR B10.DXF",
  "utf8",
);
const parsed = parseDxf(content);
console.log("Total parsed:", parsed.entities.length);

const sourceBlockCounts: Record<string, number> = {};
let withoutBlock = 0;
for (const e of parsed.entities) {
  if (e.sourceBlock) {
    sourceBlockCounts[e.sourceBlock] =
      (sourceBlockCounts[e.sourceBlock] || 0) + 1;
  } else {
    withoutBlock++;
  }
}
console.log("Without sourceBlock:", withoutBlock);
console.log("With sourceBlock:", JSON.stringify(sourceBlockCounts, null, 2));

const { cleaned, report } = cleanEntities(parsed.entities);
console.log("\nAfter cleaning:", cleaned.length);
console.log("Report:", JSON.stringify(report, null, 2));

const typeMap: Record<string, number> = {};
for (const e of cleaned) {
  typeMap[e.type] = (typeMap[e.type] || 0) + 1;
}
console.log("\nCleaned by type:", JSON.stringify(typeMap));
