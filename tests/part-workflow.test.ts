import { describe, expect, it } from "vitest";
import {
  assignEntitiesToPart,
  classifyAssignedParts,
  cleanAssignedParts,
  getAssignedPartEntities,
  removeEntityFromPart,
} from "@/lib/workflow/part-workflow";
import type { DxfEntityV2 } from "@/types/dxf-v2";
import type { PartDefinition } from "@/types/project";

function makeEntity(
  overrides: Partial<DxfEntityV2> & { id: number; type: DxfEntityV2["type"] },
): DxfEntityV2 {
  return {
    layer: "0",
    color: 7,
    linetype: "CONTINUOUS",
    coordinates: {},
    length: 0,
    ...overrides,
  };
}

describe("part workflow helpers", () => {
  it("moves entities between parts instead of duplicating ownership", () => {
    const parts: PartDefinition[] = [
      { id: "part-a", name: "T1", entityIds: [1, 2] },
      { id: "part-b", name: "T2", entityIds: [3] },
    ];

    const updated = assignEntitiesToPart(parts, "part-b", [2]);

    expect(updated[0].entityIds).toEqual([1]);
    expect(updated[1].entityIds).toEqual([3, 2]);
  });

  it("removes a deselected entity only from the active part", () => {
    const parts: PartDefinition[] = [
      { id: "part-a", name: "T1", entityIds: [1, 2, 3] },
      { id: "part-b", name: "T2", entityIds: [4] },
    ];

    const updated = removeEntityFromPart(parts, "part-a", 2);

    expect(updated[0].entityIds).toEqual([1, 3]);
    expect(updated[1].entityIds).toEqual([4]);
  });

  it("drops unassigned entities during the clean transition", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 1,
        type: "LINE",
        coordinates: { x1: 0, y1: 0, x2: 10, y2: 0 },
        length: 10,
        partId: "part-a",
      }),
      makeEntity({ id: 2, type: "DIMENSION", partId: "part-a" }),
      makeEntity({
        id: 3,
        type: "LINE",
        coordinates: { x1: 50, y1: 50, x2: 60, y2: 60 },
        length: 14.14,
      }),
    ];
    const parts: PartDefinition[] = [
      { id: "part-a", name: "T1", entityIds: [1, 2] },
    ];

    const assigned = getAssignedPartEntities(entities, parts);
    const cleaned = cleanAssignedParts(assigned, parts);

    expect(assigned.map((entity) => entity.id)).toEqual([1, 2]);
    expect(cleaned.entities.map((entity) => entity.id)).toEqual([1]);
    expect(cleaned.parts[0].entityIds).toEqual([1]);
    expect(cleaned.reports.get("part-a")?.removedDimensions).toBe(1);
  });

  it("classifies each part separately so each part gets its own outer contour", () => {
    const entities: DxfEntityV2[] = [
      makeEntity({
        id: 1,
        type: "CIRCLE",
        coordinates: { cx: 0, cy: 0, r: 20 },
        length: 125.66,
        closed: true,
        partId: "part-a",
      }),
      makeEntity({
        id: 2,
        type: "CIRCLE",
        coordinates: { cx: 0, cy: 0, r: 5 },
        length: 31.42,
        closed: true,
        partId: "part-a",
      }),
      makeEntity({
        id: 3,
        type: "CIRCLE",
        coordinates: { cx: 100, cy: 100, r: 15 },
        length: 94.25,
        closed: true,
        partId: "part-b",
      }),
      makeEntity({
        id: 4,
        type: "CIRCLE",
        coordinates: { cx: 100, cy: 100, r: 4 },
        length: 25.13,
        closed: true,
        partId: "part-b",
      }),
    ];
    const parts: PartDefinition[] = [
      { id: "part-a", name: "T1", entityIds: [1, 2] },
      { id: "part-b", name: "T2", entityIds: [3, 4] },
    ];

    const classified = classifyAssignedParts(entities, parts);

    expect(classified.find((entity) => entity.id === 1)?.classification).toBe(
      "CUT",
    );
    expect(classified.find((entity) => entity.id === 2)?.classification).toBe(
      "CUT",
    );
    expect(classified.find((entity) => entity.id === 3)?.classification).toBe(
      "CUT",
    );
    expect(classified.find((entity) => entity.id === 4)?.classification).toBe(
      "CUT",
    );
  });
});
