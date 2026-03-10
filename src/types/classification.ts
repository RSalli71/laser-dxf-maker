/**
 * Classification types for laser cutting operations.
 *
 * Each DXF entity is classified into one of three categories
 * that determine its layer name, color, and ACI number in the
 * exported DXF file. Trumpf/Bystronic standard.
 *
 * Reference: docs/ARCHITECTURE.md "ClassificationType" + "LayerConfig"
 */

/** The three laser-cutting classification categories */
export type ClassificationType =
  | "CUT"
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
 * Canonical layer configurations for all three classification types.
 * Used by the exporter (TABLES section) and classifier (color assignment).
 */
export const LAYER_CONFIGS: readonly LayerConfig[] = [
  {
    classification: "CUT",
    layerName: "CUT",
    hexColor: "#1a1a1a",
    aciNumber: 7,
  },
  {
    classification: "BEND",
    layerName: "BEND",
    hexColor: "#00cc00",
    aciNumber: 3,
  },
  {
    classification: "ENGRAVE",
    layerName: "ENGRAVE",
    hexColor: "#ff0000",
    aciNumber: 1,
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
