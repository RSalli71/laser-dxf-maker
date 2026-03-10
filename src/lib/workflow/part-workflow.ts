import { classifyEntities } from "@/lib/dxf/classifier";
import { cleanEntities } from "@/lib/dxf/cleaner";
import type { CleanReport, DxfEntityV2 } from "@/types/dxf-v2";
import type { PartDefinition } from "@/types/project";

function toEntityIdSet(parts: PartDefinition[]): Set<number> {
  return new Set(parts.flatMap((part) => part.entityIds));
}

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
  const assignedIds = toEntityIdSet(getPopulatedParts(parts));
  return entities.filter((entity) => assignedIds.has(entity.id));
}

export function cleanAssignedParts(
  entities: DxfEntityV2[],
  parts: PartDefinition[],
): {
  entities: DxfEntityV2[];
  parts: PartDefinition[];
  reports: Map<string, CleanReport>;
} {
  const workingParts = getPopulatedParts(parts);
  const assignedEntities = getAssignedPartEntities(entities, workingParts);
  const cleanedById = new Map<number, DxfEntityV2>();
  const reports = new Map<string, CleanReport>();
  const nextParts: PartDefinition[] = [];

  for (const part of workingParts) {
    const partEntities = assignedEntities.filter((entity) =>
      part.entityIds.includes(entity.id),
    );
    const { cleaned, report } = cleanEntities(partEntities);

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

export function classifyAssignedParts(
  entities: DxfEntityV2[],
  parts: PartDefinition[],
): DxfEntityV2[] {
  const classifiedById = new Map<number, DxfEntityV2>();

  for (const part of getPopulatedParts(parts)) {
    const partEntities = entities.filter((entity) =>
      part.entityIds.includes(entity.id),
    );
    const classified = classifyEntities(partEntities);

    for (const entity of classified) {
      classifiedById.set(entity.id, entity);
    }
  }

  return entities.map((entity) => classifiedById.get(entity.id) ?? entity);
}
