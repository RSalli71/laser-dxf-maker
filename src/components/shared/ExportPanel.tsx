/**
 * ExportPanel -- F6: Export + Download.
 *
 * Zeigt eine Vorschau pro Teil und bietet Export-Buttons.
 * Der eigentliche DXF-Export wird vom Exporter-Modul uebernommen.
 */

"use client";

import { useCallback, useState } from "react";
import type { DxfEntityV2 } from "@/types/dxf-v2";
import type { PartDefinition } from "@/types/project";
import type { ProjectInfo } from "@/types/project";
import { generateExportFilename } from "@/lib/dxf/exporter";

interface ExportPanelProps {
  parts: PartDefinition[];
  entities: DxfEntityV2[];
  projectInfo: ProjectInfo;
  onExportPart?: (partId: string) => void;
  onExportAll?: () => void;
}

export function ExportPanel({
  parts,
  entities,
  projectInfo,
  onExportPart,
  onExportAll,
}: ExportPanelProps) {
  const [exportedParts, setExportedParts] = useState<Set<string>>(new Set());

  const getFileName = useCallback(
    (part: PartDefinition) => {
      return generateExportFilename(projectInfo, part.name, parts.length);
    },
    [projectInfo, parts.length],
  );

  const handleExportPart = useCallback(
    (partId: string) => {
      onExportPart?.(partId);
      setExportedParts((prev) => new Set([...prev, partId]));
    },
    [onExportPart],
  );

  const handleExportAll = useCallback(() => {
    onExportAll?.();
    setExportedParts(new Set(parts.map((p) => p.id)));
  }, [onExportAll, parts]);

  if (parts.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          Keine Teile zum Exportieren vorhanden. Bitte definieren Sie zuerst
          Teile in Schritt 3.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Export
        </h3>
        <button
          type="button"
          onClick={handleExportAll}
          className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 transition-colors"
        >
          Alle exportieren ({parts.length})
        </button>
      </div>

      <div className="space-y-2">
        {parts.map((part) => {
          const partEntities = entities.filter(
            (e) => e.partId === part.id || part.entityIds.includes(e.id),
          );
          const classifiedCount = partEntities.filter(
            (e) => e.classification,
          ).length;
          const isExported = exportedParts.has(part.id);
          const fileName = getFileName(part);

          return (
            <div
              key={part.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-gray-900">
                  {part.name}
                </div>
                <div className="text-xs text-gray-500">
                  {partEntities.length} Entities, {classifiedCount} klassifiziert
                </div>
                <div className="font-mono text-xs text-gray-400">
                  {fileName}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleExportPart(part.id)}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition-colors",
                  isExported
                    ? "bg-gray-100 text-gray-500"
                    : "bg-blue-600 text-white hover:bg-blue-700",
                ].join(" ")}
              >
                {isExported ? "Erneut exportieren" : "Exportieren"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
