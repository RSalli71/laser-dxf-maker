/**
 * CleanReport -- F4: Bereinigungs-Zusammenfassung.
 *
 * Zeigt pro Teil: entfernte Elemente, Duplikate, Bemassungen, etc.
 * C1: Sortiert nach Part-Name fuer stabile Reihenfolge.
 * C2: Debug-Mode zeigt auch Regeln mit 0 Treffern.
 */

"use client";

import { useState } from "react";
import type { CleanReport as CleanReportType } from "@/types/dxf-v2";

interface CleanReportProps {
  reports: Map<string, CleanReportType>;
  partNames: Map<string, string>;
}

export function CleanReport({ reports, partNames }: CleanReportProps) {
  const [debug, setDebug] = useState(false);

  if (reports.size === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Keine Bereinigungs-Ergebnisse vorhanden.
        </p>
      </div>
    );
  }

  // C1: Sort entries by part name for stable ordering
  const sortedEntries = Array.from(reports.entries()).sort(([idA], [idB]) => {
    const nameA = partNames.get(idA) ?? idA;
    const nameB = partNames.get(idB) ?? idB;
    return nameA.localeCompare(nameB, "de");
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Bereinigungs-Zusammenfassung
        </h3>
        <button
          type="button"
          onClick={() => setDebug((d) => !d)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {debug ? "Kompakt" : "Details"}
        </button>
      </div>

      {sortedEntries.map(([partId, report]) => {
        const partName = partNames.get(partId) ?? partId;

        return (
          <div
            key={partId}
            className="rounded-lg border border-gray-200 bg-white"
          >
            <div className="border-b border-gray-100 px-4 py-2">
              <span className="text-sm font-medium text-gray-900">
                {partName}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                {report.totalRemoved} entfernt
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-4 py-3 text-xs">
              <ReportRow
                label="Hilfsbloecke"
                count={report.removedHelperBlocks}
                showZero={debug}
              />
              <ReportRow
                label="Bemassungen"
                count={report.removedDimensions}
                showZero={debug}
              />
              <ReportRow
                label="Hilfslinien (Linetype)"
                count={report.removedThreadHelpers}
                showZero={debug}
              />
              <ReportRow
                label="Gewinde-Boegen"
                count={report.removedThreadArcs}
                showZero={debug}
              />
              {(report.suspectedThreadSplines > 0 || debug) && (
                <ReportRow
                  label="Verdacht Gewinde-Splines"
                  count={report.suspectedThreadSplines}
                  showZero={debug}
                  warning
                />
              )}
              <ReportRow
                label="Kreuz-Muster"
                count={report.removedCrossPatterns}
                showZero={debug}
              />
              <ReportRow
                label="Duplikate"
                count={report.removedDuplicates}
                showZero={debug}
              />
              <ReportRow
                label="Nulllinien"
                count={report.removedZeroLines}
                showZero={debug}
              />
              {report.removedEmptyLayers.length > 0 && (
                <div className="col-span-2 text-gray-500">
                  Leere Layer: {report.removedEmptyLayers.join(", ")}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportRow({
  label,
  count,
  showZero = false,
  warning = false,
}: {
  label: string;
  count: number;
  showZero?: boolean;
  warning?: boolean;
}) {
  if (count === 0 && !showZero) return null;
  return (
    <div className="flex justify-between">
      <span className={warning ? "text-amber-600" : "text-gray-600"}>
        {label}
      </span>
      <span
        className={`tabular-nums font-medium ${
          warning && count > 0 ? "text-amber-600" : "text-gray-900"
        }`}
      >
        {count}
      </span>
    </div>
  );
}
