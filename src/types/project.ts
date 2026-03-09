/**
 * Project-level types for customer and part management.
 *
 * Reference: docs/ARCHITECTURE.md "ProjectInfo" + "PartDefinition"
 */

/** Customer and project identification (F1) */
export interface ProjectInfo {
  /** Customer name (required) */
  customerName: string;

  /** Project number (required) */
  projectNumber: string;
}

/**
 * A defined part (subset of entities selected by the operator).
 * Each part becomes a separate DXF file on export.
 */
export interface PartDefinition {
  /** Unique identifier (UUID or sequential) */
  id: string;

  /** Display name (e.g. "T1", "T2", "T3") */
  name: string;

  /** IDs of DxfEntityV2 entities assigned to this part */
  entityIds: number[];
}
