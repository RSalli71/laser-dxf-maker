import { classifyEntities } from "@/lib/dxf/classifier";
import { cleanEntities } from "@/lib/dxf/cleaner";
import type { CleanReport, DxfEntityV2, LayerDefinition } from "@/types/dxf-v2";
import type { PartDefinition } from "@/types/project";

export function getPopulatedParts(parts: PartDefinition[]): PartDefinition[] {
  return parts.filter((part) => part.entityIds.length > 0);
}

export function assignEntitiesToPart(
  parts: PartDefinition[],
  partId: string,
  entityIds: number[],
): PartDefinition[] {
  const idsToAssign = new Set(entityIds);

  return parts.map((part) => {
    const remainingIds = part.entityIds.filter((id) => !idsToAssign.has(id));
    if (part.id !== partId) {
      return { ...part, entityIds: remainingIds };
    }

    return {
      ...part,
      entityIds: [...new Set([...remainingIds, ...entityIds])],
    };
  });
}

export function removeEntityFromPart(
  parts: PartDefinition[],
  partId: string,
  entityId: number,
): PartDefinition[] {
  return parts.map((part) => {
    if (part.id !== partId) {
      return part;
    }

    return {
      ...part,
      entityIds: part.entityIds.filter((id) => id !== entityId),
    };
  });
}

export function getAssignedPartEntities(
  entities: DxfEntityV2[],
  parts: PartDefinition[],
): DxfEntityV2[] {
  const assignedIds = new Set(
    getPopulatedParts(parts).flatMap((part) => part.entityIds),
  );
  return entities.filter((entity) => assignedIds.has(entity.id));
}

/**
 * Clean all assigned parts. Uses an entity index (Map) for O(1) lookups
 * instead of filter+includes (A4).
 *
 * @param layerTable - Optional layer table for BYLAYER linetype resolution (A2)
 */
export function cleanAssignedParts(
  entities: DxfEntityV2[],
  parts: PartDefinition[],
  layerTable?: Map<string, LayerDefinition>,
): {
  entities: DxfEntityV2[];
  parts: PartDefinition[];
  reports: Map<string, CleanReport>;
} {
  const workingParts = getPopulatedParts(parts);
  const assignedEntities = getAssignedPartEntities(entities, workingParts);

  // A4: Build entity index for O(1) lookups
  const entityById = new Map<number, DxfEntityV2>();
  for (const entity of assignedEntities) {
    entityById.set(entity.id, entity);
  }

  const cleanedById = new Map<number, DxfEntityV2>();
  const reports = new Map<string, CleanReport>();
  const nextParts: PartDefinition[] = [];

  for (const part of workingParts) {
    // O(n) per part via Map lookup instead of O(n*m) via filter+includes
    const partEntities: DxfEntityV2[] = [];
    for (const id of part.entityIds) {
      const entity = entityById.get(id);
      if (entity) partEntities.push(entity);
    }

    const { cleaned, report } = cleanEntities(partEntities, layerTable);

    reports.set(part.id, report);
    nextParts.push({
      ...part,
      entityIds: cleaned.map((entity) => entity.id),
    });

    for (const entity of cleaned) {
      cleanedById.set(entity.id, entity);
    }
  }

  const nextEntities = assignedEntities
    .filter((entity) => cleanedById.has(entity.id))
    .map((entity) => cleanedById.get(entity.id) ?? entity);

  return {
    entities: nextEntities,
    parts: nextParts.filter((part) => part.entityIds.length > 0),
    reports,
  };
}

/**
 * Classify entities for all assigned parts. Uses entity index (A4).
 */
export function classifyAssignedParts(
  entities: DxfEntityV2[],
  parts: PartDefinition[],
): DxfEntityV2[] {
  // A4: Build entity index for O(1) lookups
  const entityById = new Map<number, DxfEntityV2>();
  for (const entity of entities) {
    entityById.set(entity.id, entity);
  }

  const classifiedById = new Map<number, DxfEntityV2>();

  for (const part of getPopulatedParts(parts)) {
    const partEntities: DxfEntityV2[] = [];
    for (const id of part.entityIds) {
      const entity = entityById.get(id);
      if (entity) partEntities.push(entity);
    }

    const classified = classifyEntities(partEntities);

    for (const entity of classified) {
      classifiedById.set(entity.id, entity);
    }
  }

  return entities.map((entity) => classifiedById.get(entity.id) ?? entity);
}
