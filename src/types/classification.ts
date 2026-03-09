/**
 * Classification types for laser cutting operations.
 *
 * Each DXF entity is classified into one of four categories
 * that determine its layer name, color, and ACI number in the
 * exported DXF file.
 *
 * Reference: docs/ARCHITECTURE.md "ClassificationType" + "LayerConfig"
 */

/** The four laser-cutting classification categories */
export type ClassificationType =
  | "CUT_OUTER"
  | "CUT_INNER"
  | "BEND"
  | "ENGRAVE";

/** Layer configuration mapping a classification to DXF layer properties */
export interface LayerConfig {
  classification: ClassificationType;
  layerName: string;
  hexColor: string;
  /** AutoCAD Color Index number (0-256) */
  aciNumber: number;
}

/**
 * Canonical layer configurations for all four classification types.
 * Used by the exporter (TABLES section) and classifier (color assignment).
 */
export const LAYER_CONFIGS: readonly LayerConfig[] = [
  {
    classification: "CUT_OUTER",
    layerName: "CUT_OUTER",
    hexColor: "#FF0000",
    aciNumber: 1,
  },
  {
    classification: "CUT_INNER",
    layerName: "CUT_INNER",
    hexColor: "#0000FF",
    aciNumber: 5,
  },
  {
    classification: "BEND",
    layerName: "BEND",
    hexColor: "#FFFF00",
    aciNumber: 2,
  },
  {
    classification: "ENGRAVE",
    layerName: "ENGRAVE",
    hexColor: "#00CC00",
    aciNumber: 3,
  },
] as const;

/**
 * Look up a LayerConfig by classification type.
 * Returns undefined if the classification is not found (should not happen
 * with valid ClassificationType values).
 */
export function getLayerConfig(
  classification: ClassificationType,
): LayerConfig | undefined {
  return LAYER_CONFIGS.find((c) => c.classification === classification);
}
