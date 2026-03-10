/**
 * ParseStats -- F2: Parse-Statistik anzeigen.
 *
 * Zeigt die Anzahl der Entities pro Typ als Tabelle.
 * Uebersprungene Entity-Typen werden separat und prominent dargestellt.
 */

"use client";

import type { ParseStats as ParseStatsType } from "@/types/dxf-v2";

interface ParseStatsProps {
  stats: ParseStatsType;
  fileName: string;
}

/** Pattern: "Uebersprungener Entity-Typ: TYPENAME (Nx)" */
const SKIPPED_PATTERN = /^Uebersprungener Entity-Typ:\s+(\S+)\s+\((\d+)x\)$/;

interface SkippedType {
  type: string;
  count: number;
}

/**
 * Separate skipped-type warnings from other warnings.
 */
function categorizeWarnings(warnings: string[]): {
  skippedTypes: SkippedType[];
  otherWarnings: string[];
} {
  const skippedTypes: SkippedType[] = [];
  const otherWarnings: string[] = [];

  for (const w of warnings) {
    const match = w.match(SKIPPED_PATTERN);
    if (match) {
      skippedTypes.push({ type: match[1], count: parseInt(match[2], 10) });
    } else {
      otherWarnings.push(w);
    }
  }

  // Sort by count descending
  skippedTypes.sort((a, b) => b.count - a.count);

  return { skippedTypes, otherWarnings };
}

export function ParseStats({ stats, fileName }: ParseStatsProps) {
  const typeEntries = Object.entries(stats.byType).sort(
    ([, a], [, b]) => b - a,
  );

  const { skippedTypes, otherWarnings } = categorizeWarnings(stats.warnings);

  const totalSkipped = skippedTypes.reduce((sum, s) => sum + s.count, 0);
  const totalInFile = stats.totalEntities + totalSkipped;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-gray-900">
          Parse-Ergebnis
        </h3>
        <p className="text-xs text-gray-500">
          Datei: <span className="font-mono">{fileName}</span>
        </p>
        {totalSkipped > 0 && (
          <p className="text-xs text-gray-500">
            {stats.totalEntities} von {totalInFile} Entities geparst (
            {totalInFile > 0
              ? Math.round((stats.totalEntities / totalInFile) * 100)
              : 0}
            %)
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                Typ
              </th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">
                Anzahl
              </th>
            </tr>
          </thead>
          <tbody>
            {typeEntries.map(([type, count]) => (
              <tr key={type} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-1.5 font-mono text-gray-800">
                  {type}
                </td>
                <td className="px-4 py-1.5 text-right tabular-nums text-gray-700">
                  {count}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50">
              <td className="px-4 py-2 font-medium text-gray-900">Gesamt</td>
              <td className="px-4 py-2 text-right font-medium tabular-nums text-gray-900">
                {stats.totalEntities}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {skippedTypes.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50">
          <div className="px-4 py-2 border-b border-amber-200">
            <h4 className="text-xs font-semibold text-amber-900">
              Uebersprungene Entity-Typen
            </h4>
            <p className="text-xs text-amber-700 mt-0.5">
              {totalSkipped} Entities nicht unterstuetzt
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-amber-200">
                <th className="px-4 py-1.5 text-left text-xs font-medium text-amber-800">
                  Typ
                </th>
                <th className="px-4 py-1.5 text-right text-xs font-medium text-amber-800">
                  Anzahl
                </th>
              </tr>
            </thead>
            <tbody>
              {skippedTypes.map((s) => (
                <tr
                  key={s.type}
                  className="border-b border-amber-100 last:border-0"
                >
                  <td className="px-4 py-1 font-mono text-amber-900">
                    {s.type}
                  </td>
                  <td className="px-4 py-1 text-right tabular-nums text-amber-800">
                    {s.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {otherWarnings.length > 0 && (
        <div className="rounded-md bg-yellow-50 p-3">
          <h4 className="text-xs font-medium text-yellow-800">Warnungen</h4>
          <ul className="mt-1 space-y-0.5">
            {otherWarnings.map((warning, i) => (
              <li key={i} className="text-xs text-yellow-700">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
