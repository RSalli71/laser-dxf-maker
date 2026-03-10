/**
 * CleanReport -- F4: Bereinigungs-Zusammenfassung.
 *
 * Zeigt pro Teil: entfernte Elemente, Duplikate, Bemassungen, etc.
 */

"use client";

import type { CleanReport as CleanReportType } from "@/types/dxf-v2";

interface CleanReportProps {
  reports: Map<string, CleanReportType>;
  partNames: Map<string, string>;
}

export function CleanReport({ reports, partNames }: CleanReportProps) {
  if (reports.size === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Keine Bereinigungs-Ergebnisse vorhanden.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">
        Bereinigungs-Zusammenfassung
      </h3>

      {Array.from(reports.entries()).map(([partId, report]) => {
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
              />
              <ReportRow label="Bemassungen" count={report.removedDimensions} />
              <ReportRow
                label="Hilfslinien (Linetype)"
                count={report.removedThreadHelpers}
              />
              <ReportRow
                label="Gewinde-Boegen"
                count={report.removedThreadArcs}
              />
              <ReportRow
                label="Gewinde-Splines"
                count={report.removedThreadSplines}
              />
              <ReportRow
                label="Kreuz-Muster"
                count={report.removedCrossPatterns}
              />
              <ReportRow label="Duplikate" count={report.removedDuplicates} />
              <ReportRow label="Nulllinien" count={report.removedZeroLines} />
              {report.removedEmptyLayers.length > 0 && (
                <div className="col-span-2 text-gray-500">
                  Leere Layer:{" "}
                  {report.removedEmptyLayers.join(", ")}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportRow({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="tabular-nums font-medium text-gray-900">{count}</span>
    </div>
  );
}
