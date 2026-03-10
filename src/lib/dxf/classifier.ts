/**
 * DXF Auto-Classification Module.
 *
 * Pure function: DxfEntityV2[] in, classified DxfEntityV2[] out.
 * No external dependencies.
 *
 * Heuristics (applied in order):
 * 1. TEXT entities -> ENGRAVE
 * 2. Short straight lines -> BEND
 * 3. Everything else -> CUT
 *
 * After classification, layer and color are set according to LAYER_CONFIGS.
 *
 * Reference: docs/ARCHITECTURE.md "src/lib/dxf/classifier.ts"
 */

import type { DxfEntityV2 } from "@/types/dxf-v2";
import type { ClassificationType } from "@/types/classification";
import { getLayerConfig } from "@/types/classification";

// ---- Configuration -----------------------------------------------------

/**
 * Maximum length for a LINE to be considered a BEND marker.
 * Lines shorter than this (in DXF units) that are not part of
 * a closed contour are classified as BEND.
 */
const BEND_MAX_LENGTH = 50;

// ---- Public API --------------------------------------------------------

/**
 * Classify cleaned entities using heuristics.
 * Returns a NEW array with classification, layer, and color set.
 *
 * @param entities - Cleaned DxfEntityV2 array (one part)
 * @returns New array with classification applied
 */
export function classifyEntities(entities: DxfEntityV2[]): DxfEntityV2[] {
  // Work with copies to avoid mutation
  const result = entities.map((e) => ({ ...e }));

  // Classify each entity
  for (const entity of result) {
    let classification: ClassificationType;

    // Rule 1: TEXT -> ENGRAVE
    if (entity.type === "TEXT") {
      classification = "ENGRAVE";
    }
    // Rule 2: Short straight lines -> BEND
    else if (isShortLine(entity)) {
      classification = "BEND";
    }
    // Rule 3: Everything else -> CUT
    else {
      classification = "CUT";
    }

    entity.classification = classification;

    // Set layer and color from LAYER_CONFIGS
    const config = getLayerConfig(classification);
    if (config) {
      entity.layer = config.layerName;
      entity.color = config.aciNumber;
    }
  }

  return result;
}

// ---- Heuristic helpers -------------------------------------------------

/**
 * Determine if an entity is a short straight line
 * that could be a bend marker.
 */
function isShortLine(entity: DxfEntityV2): boolean {
  if (entity.type !== "LINE") return false;
  return entity.length > 0 && entity.length <= BEND_MAX_LENGTH;
}

/**
 * Get classification statistics for a set of entities.
 * Useful for the ClassifyToolbar stats display.
 */
export function getClassificationStats(
  entities: DxfEntityV2[],
): Record<ClassificationType, number> {
  const stats: Record<ClassificationType, number> = {
    CUT: 0,
    BEND: 0,
    ENGRAVE: 0,
  };

  for (const entity of entities) {
    if (entity.classification && entity.classification in stats) {
      stats[entity.classification]++;
    }
  }

  return stats;
}

/**
 * Apply a classification to a set of entity IDs.
 * Used for manual correction (single click or box selection).
 * Returns a NEW array with updated entities.
 *
 * @param entities - Full entity array
 * @param entityIds - IDs of entities to reclassify
 * @param classification - New classification to apply
 * @returns New array with updated classification, layer, and color
 */
export function applyClassification(
  entities: DxfEntityV2[],
  entityIds: Set<number>,
  classification: ClassificationType,
): DxfEntityV2[] {
  const config = getLayerConfig(classification);

  return entities.map((entity) => {
    if (!entityIds.has(entity.id)) return entity;

    return {
      ...entity,
      classification,
      layer: config?.layerName ?? entity.layer,
      color: config?.aciNumber ?? entity.color,
    };
  });
}
