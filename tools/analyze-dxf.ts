/**
 * DXF Diagnose-Tool
 *
 * Analysiert eine DXF-Datei unabhaengig vom Parser und zeigt:
 * - Welche Sektionen existieren
 * - BLOCKS-Inhalt (Name, Entities, Typen)
 * - ENTITIES-Inhalt (alle Typen mit Anzahl)
 * - INSERT-Referenzen
 * - Unterstuetzte vs. nicht-unterstuetzte Entity-Typen
 * - Zusammenfassung
 *
 * Usage: npx tsx tools/analyze-dxf.ts <pfad-zur-dxf>
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ---- Types --------------------------------------------------------------

interface SectionInfo {
  name: string;
  startLine: number;
  endLine: number;
}

interface BlockInfo {
  name: string;
  entityCount: number;
  entityTypes: Map<string, number>;
}

interface InsertRef {
  blockName: string;
  count: number;
}

interface EntitySample {
  /** First 3 group-code pairs after the type declaration */
  pairs: Array<{ code: string; value: string }>;
}

// Entity types supported by our parser (src/lib/dxf/parser.ts)
const SUPPORTED_TYPES = new Set([
  "LINE",
  "CIRCLE",
  "ARC",
  "LWPOLYLINE",
  "TEXT",
  "DIMENSION",
  "POLYLINE", // converted to LWPOLYLINE
  "INSERT",   // resolved via BLOCKS
]);

// Internal DXF markers that are not real entities
const INTERNAL_MARKERS = new Set([
  "SECTION",
  "ENDSEC",
  "EOF",
  "BLOCK",
  "ENDBLK",
  "VERTEX",
  "SEQEND",
  "TABLE",
  "ENDTAB",
  "ATTRIB",
  "ATTDEF",
]);

// ---- Main ---------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npx tsx tools/analyze-dxf.ts <pfad-zur-dxf>");
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  if (!fs.existsSync(filePath)) {
    console.error(`Datei nicht gefunden: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  console.log("=".repeat(70));
  console.log(`DXF-Analyse: ${path.basename(filePath)}`);
  console.log(`Dateipfad:   ${filePath}`);
  console.log(`Dateigroesse: ${(content.length / 1024).toFixed(1)} KB`);
  console.log(`Zeilenanzahl: ${lines.length}`);
  console.log("=".repeat(70));

  // Check for binary DXF
  if (content.startsWith("AutoCAD Binary DXF")) {
    console.error("\n[FEHLER] Binaere DXF-Datei! Dieses Tool unterstuetzt nur ASCII DXF.");
    process.exit(1);
  }

  // 1. Find sections
  const sections = findSections(lines);
  printSections(sections);

  // 2. Analyze BLOCKS
  const blocks = analyzeBlocks(lines, sections);
  printBlocks(blocks);

  // 3. Analyze ENTITIES
  const { entityTypes, insertRefs, samples, totalEntities } = analyzeEntities(lines, sections);
  printEntities(entityTypes, totalEntities);

  // 4. INSERT references
  printInsertRefs(insertRefs, blocks);

  // 5. Supported vs. unsupported
  printSupportAnalysis(entityTypes, blocks, insertRefs, totalEntities);
}

// ---- Section Finding ----------------------------------------------------

function findSections(lines: string[]): SectionInfo[] {
  const sections: SectionInfo[] = [];

  for (let i = 0; i < lines.length - 3; i++) {
    if (
      lines[i].trim() === "0" &&
      lines[i + 1].trim() === "SECTION" &&
      lines[i + 2].trim() === "2"
    ) {
      const name = lines[i + 3].trim();
      const startLine = i;

      // Find ENDSEC
      let endLine = -1;
      for (let j = i + 4; j < lines.length - 1; j++) {
        if (lines[j].trim() === "0" && lines[j + 1].trim() === "ENDSEC") {
          endLine = j + 1;
          break;
        }
      }

      sections.push({ name, startLine, endLine });
    }
  }

  return sections;
}

function printSections(sections: SectionInfo[]): void {
  console.log("\n--- Sektionen ---");
  if (sections.length === 0) {
    console.log("  Keine Sektionen gefunden!");
    return;
  }
  for (const s of sections) {
    const lineRange = s.endLine >= 0
      ? `Zeilen ${s.startLine + 1} - ${s.endLine + 1}`
      : `Start Zeile ${s.startLine + 1} (kein ENDSEC gefunden!)`;
    console.log(`  ${s.name.padEnd(12)} ${lineRange}`);
  }
}

// ---- BLOCKS Analysis ----------------------------------------------------

function analyzeBlocks(lines: string[], sections: SectionInfo[]): BlockInfo[] {
  const blocksSection = sections.find((s) => s.name === "BLOCKS");
  if (!blocksSection) return [];

  const blocks: BlockInfo[] = [];
  const start = blocksSection.startLine + 4; // after SECTION/2/BLOCKS
  const end = blocksSection.endLine >= 0 ? blocksSection.endLine : lines.length;

  let i = start;
  let currentBlock: BlockInfo | null = null;
  let insideBlock = false;

  while (i < end - 1) {
    const code = lines[i].trim();
    const value = lines[i + 1].trim();

    if (code === "0" && value === "BLOCK") {
      // Read block name (group code 2)
      let blockName = "???";
      let j = i + 2;
      while (j < end - 1) {
        const gc = lines[j].trim();
        const gv = lines[j + 1].trim();
        if (gc === "0") break; // hit next entity
        if (gc === "2") {
          blockName = gv;
          break;
        }
        j += 2;
      }
      currentBlock = { name: blockName, entityCount: 0, entityTypes: new Map() };
      insideBlock = true;
      // Skip past block header pairs
      i += 2;
      while (i < end - 1 && lines[i].trim() !== "0") {
        i += 2;
      }
      continue;
    }

    if (code === "0" && value === "ENDBLK") {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      insideBlock = false;
      i += 2;
      // Skip ENDBLK properties
      while (i < end - 1 && lines[i].trim() !== "0") {
        i += 2;
      }
      continue;
    }

    if (code === "0" && insideBlock && currentBlock) {
      // Entity inside block
      if (!INTERNAL_MARKERS.has(value)) {
        currentBlock.entityCount++;
        currentBlock.entityTypes.set(value, (currentBlock.entityTypes.get(value) ?? 0) + 1);
      }
      i += 2;
      // Skip entity properties
      while (i < end - 1 && lines[i].trim() !== "0") {
        i += 2;
      }
      continue;
    }

    i += 2;
  }

  return blocks;
}

function printBlocks(blocks: BlockInfo[]): void {
  console.log("\n--- BLOCKS-Inhalt ---");
  if (blocks.length === 0) {
    console.log("  Keine Blocks gefunden oder keine BLOCKS-Sektion.");
    return;
  }

  // Filter out system blocks (starting with *)
  const userBlocks = blocks.filter((b) => !b.name.startsWith("*"));
  const sysBlocks = blocks.filter((b) => b.name.startsWith("*"));

  console.log(`  Gesamt: ${blocks.length} Blocks (${userBlocks.length} User, ${sysBlocks.length} System *-Blocks)`);
  console.log();

  for (const b of blocks) {
    const prefix = b.name.startsWith("*") ? "  [SYS] " : "  ";
    console.log(`${prefix}Block "${b.name}" -- ${b.entityCount} Entities`);
    if (b.entityTypes.size > 0) {
      const sorted = [...b.entityTypes.entries()].sort((a, b) => b[1] - a[1]);
      for (const [type, count] of sorted) {
        const supported = SUPPORTED_TYPES.has(type) ? "OK" : "NICHT UNTERSTUETZT";
        console.log(`         ${type.padEnd(16)} ${String(count).padStart(5)}x  [${supported}]`);
      }
    }
  }
}

// ---- ENTITIES Analysis --------------------------------------------------

interface EntitiesAnalysis {
  entityTypes: Map<string, number>;
  insertRefs: Map<string, number>;
  samples: Map<string, EntitySample>;
  totalEntities: number;
}

function analyzeEntities(lines: string[], sections: SectionInfo[]): EntitiesAnalysis {
  const entitiesSection = sections.find((s) => s.name === "ENTITIES");
  const entityTypes = new Map<string, number>();
  const insertRefs = new Map<string, number>();
  const samples = new Map<string, EntitySample>();
  let totalEntities = 0;

  if (!entitiesSection) {
    return { entityTypes, insertRefs, samples, totalEntities };
  }

  const start = entitiesSection.startLine + 4;
  const end = entitiesSection.endLine >= 0 ? entitiesSection.endLine : lines.length;

  let i = start;

  while (i < end - 1) {
    const code = lines[i].trim();
    const value = lines[i + 1].trim();

    if (code === "0" && !INTERNAL_MARKERS.has(value) && value !== "ENDSEC" && value !== "EOF") {
      const entityType = value;
      totalEntities++;
      entityTypes.set(entityType, (entityTypes.get(entityType) ?? 0) + 1);

      // Collect pairs for this entity
      const entityPairs: Array<{ code: string; value: string }> = [];
      let j = i + 2;
      while (j < end - 1) {
        const pc = lines[j].trim();
        const pv = lines[j + 1].trim();
        if (pc === "0") break;
        entityPairs.push({ code: pc, value: pv });
        j += 2;
      }

      // Track INSERT block references
      if (entityType === "INSERT") {
        const blockNamePair = entityPairs.find((p) => p.code === "2");
        if (blockNamePair) {
          insertRefs.set(blockNamePair.value, (insertRefs.get(blockNamePair.value) ?? 0) + 1);
        }
      }

      // Collect sample for unsupported types (first occurrence only)
      if (!SUPPORTED_TYPES.has(entityType) && !samples.has(entityType)) {
        samples.set(entityType, {
          pairs: entityPairs.slice(0, 3),
        });
      }

      i = j;
      continue;
    }

    i += 2;
  }

  return { entityTypes, insertRefs, samples, totalEntities };
}

function printEntities(entityTypes: Map<string, number>, totalEntities: number): void {
  console.log("\n--- ENTITIES-Inhalt ---");
  if (entityTypes.size === 0) {
    console.log("  Keine Entities gefunden.");
    return;
  }

  console.log(`  Gesamt: ${totalEntities} Entities\n`);

  const sorted = [...entityTypes.entries()].sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sorted) {
    const pct = ((count / totalEntities) * 100).toFixed(1);
    const supported = SUPPORTED_TYPES.has(type) ? "OK" : "NICHT UNTERSTUETZT";
    console.log(`  ${type.padEnd(16)} ${String(count).padStart(6)}x  (${pct.padStart(5)}%)  [${supported}]`);
  }
}

// ---- INSERT References --------------------------------------------------

function printInsertRefs(insertRefs: Map<string, number>, blocks: BlockInfo[]): void {
  console.log("\n--- INSERT-Referenzen ---");
  if (insertRefs.size === 0) {
    console.log("  Keine INSERT-Referenzen gefunden.");
    return;
  }

  const sorted = [...insertRefs.entries()].sort((a, b) => b[1] - a[1]);
  for (const [blockName, count] of sorted) {
    const block = blocks.find((b) => b.name === blockName);
    const entitiesInBlock = block ? block.entityCount : 0;
    const resolvedTotal = count * entitiesInBlock;
    const found = block ? "gefunden" : "NICHT GEFUNDEN!";
    console.log(
      `  Block "${blockName}" -- ${count}x referenziert, ${entitiesInBlock} Entities im Block = ${resolvedTotal} aufgeloeste Entities [${found}]`,
    );
  }
}

// ---- Support Analysis ---------------------------------------------------

function printSupportAnalysis(
  entityTypes: Map<string, number>,
  blocks: BlockInfo[],
  insertRefs: Map<string, number>,
  totalInEntitiesSection: number,
): void {
  console.log("\n--- Unterstuetzungs-Analyse ---");

  // Count supported entities in ENTITIES section
  let supportedInEntities = 0;
  let unsupportedInEntities = 0;
  const unsupportedTypes: Array<{ type: string; count: number }> = [];

  for (const [type, count] of entityTypes) {
    if (SUPPORTED_TYPES.has(type)) {
      supportedInEntities += count;
    } else {
      unsupportedInEntities += count;
      unsupportedTypes.push({ type, count });
    }
  }

  // Count entities that come from INSERT resolution
  let insertResolvedEntities = 0;
  let insertResolvedUnsupported = 0;

  for (const [blockName, insertCount] of insertRefs) {
    const block = blocks.find((b) => b.name === blockName);
    if (block) {
      for (const [type, typeCount] of block.entityTypes) {
        const resolved = insertCount * typeCount;
        if (SUPPORTED_TYPES.has(type)) {
          insertResolvedEntities += resolved;
        } else {
          insertResolvedUnsupported += resolved;
        }
      }
    }
  }

  // Total entities the parser would produce
  // Direct entities (excluding INSERT itself) + resolved from INSERT
  const directSupported = supportedInEntities - (entityTypes.get("INSERT") ?? 0);
  const totalParsed = directSupported + insertResolvedEntities;
  const totalLost = unsupportedInEntities + insertResolvedUnsupported;
  const totalAll = totalParsed + totalLost;

  console.log(`\n  Direkte Entities (ENTITIES-Sektion):`);
  console.log(`    Unterstuetzt:       ${supportedInEntities} (davon ${entityTypes.get("INSERT") ?? 0} INSERT)`);
  console.log(`    Nicht unterstuetzt: ${unsupportedInEntities}`);

  if (insertRefs.size > 0) {
    console.log(`\n  Aus INSERT aufgeloest:`);
    console.log(`    Unterstuetzt:       ${insertResolvedEntities}`);
    console.log(`    Nicht unterstuetzt: ${insertResolvedUnsupported}`);
  }

  if (unsupportedTypes.length > 0) {
    console.log(`\n  Nicht unterstuetzte Typen (ENTITIES-Sektion):`);
    unsupportedTypes.sort((a, b) => b.count - a.count);
    for (const { type, count } of unsupportedTypes) {
      console.log(`    ${type.padEnd(16)} ${count}x`);
    }
  }

  // Collect unsupported types from blocks too
  const unsupportedInBlocks = new Map<string, number>();
  for (const block of blocks) {
    for (const [type, count] of block.entityTypes) {
      if (!SUPPORTED_TYPES.has(type)) {
        unsupportedInBlocks.set(type, (unsupportedInBlocks.get(type) ?? 0) + count);
      }
    }
  }

  if (unsupportedInBlocks.size > 0) {
    console.log(`\n  Nicht unterstuetzte Typen (in BLOCKS):`);
    const sorted = [...unsupportedInBlocks.entries()].sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sorted) {
      console.log(`    ${type.padEnd(16)} ${count}x`);
    }
  }

  // Print samples of unsupported types
  // Re-scan for samples here (we have them from analyzeEntities but need to pass them)
  // For simplicity, just reference what was already printed

  console.log("\n" + "=".repeat(70));
  if (totalAll > 0) {
    const pct = ((totalParsed / totalAll) * 100).toFixed(1);
    console.log(`ZUSAMMENFASSUNG: ${totalParsed} von ${totalAll} Entities werden geparst (${pct}%).`);
    if (totalLost > 0) {
      console.log(`                 ${totalLost} Entities gehen verloren.`);
    }
  } else {
    console.log("ZUSAMMENFASSUNG: Keine Entities gefunden.");
  }
  console.log("=".repeat(70));
}

// ---- Run ----------------------------------------------------------------

main();
