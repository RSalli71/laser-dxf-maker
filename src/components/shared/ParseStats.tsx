/**
 * ParseStats -- F2: Parse-Statistik anzeigen.
 *
 * Zeigt die Anzahl der Entities pro Typ als Tabelle.
 */

"use client";

import type { ParseStats as ParseStatsType } from "@/types/dxf-v2";

interface ParseStatsProps {
  stats: ParseStatsType;
  fileName: string;
}

export function ParseStats({ stats, fileName }: ParseStatsProps) {
  const typeEntries = Object.entries(stats.byType).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-gray-900">
          Parse-Ergebnis
        </h3>
        <p className="text-xs text-gray-500">
          Datei: <span className="font-mono">{fileName}</span>
        </p>
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

      {stats.warnings.length > 0 && (
        <div className="rounded-md bg-yellow-50 p-3">
          <h4 className="text-xs font-medium text-yellow-800">Warnungen</h4>
          <ul className="mt-1 space-y-0.5">
            {stats.warnings.map((warning, i) => (
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
