/**
 * ACI (AutoCAD Color Index) to Hex color mapping.
 * Subset of the 256 standard AutoCAD colors.
 * Shared between EntityPath (rendering) and UI info panels.
 */
export const ACI_COLORS: Record<number, string> = {
  0: "#808080", // ByBlock -> Grau
  1: "#ff0000", // Rot
  2: "#ffff00", // Gelb
  3: "#00cc00", // Gruen
  4: "#00aacc", // Cyan
  5: "#0000ff", // Blau
  6: "#cc00cc", // Magenta
  7: "#1a1a1a", // Weiss -> Dunkelgrau (auf hellem Hintergrund)
  8: "#555555", // Dunkelgrau
  9: "#888888", // Hellgrau
  20: "#ff8800", // Orange (Mittellinien)
  84: "#996699", // Violett (Bemassung)
  250: "#333333", // Sehr dunkelgrau
  256: "#808080", // ByLayer -> Grau
};

/** Default color for unmapped ACI numbers */
export const ACI_DEFAULT_COLOR = "#555555";

/** Get hex color for an ACI number */
export function aciToHex(aci: number): string {
  return ACI_COLORS[aci] ?? ACI_DEFAULT_COLOR;
}

/** ACI number to German color name */
const ACI_NAMES: Record<number, string> = {
  0: "ByBlock",
  1: "Rot",
  2: "Gelb",
  3: "Gruen",
  4: "Cyan",
  5: "Blau",
  6: "Magenta",
  7: "Weiss",
  8: "Dunkelgrau",
  9: "Hellgrau",
  256: "ByLayer",
};

/** Get display name for an ACI number (e.g. "Rot (1)") */
export function aciName(aci: number): string {
  const name = ACI_NAMES[aci];
  return name ? `${name} (${aci})` : `ACI ${aci}`;
}
