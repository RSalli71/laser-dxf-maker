/**
 * PartsList -- F3: Teile-Uebersicht.
 *
 * Liste aller definierten Teile mit Name und Entity-Anzahl.
 * Button "Neues Teil". Aktives Teil hervorgehoben.
 */

"use client";

import type { PartDefinition } from "@/types/project";
import { cn } from "@/lib/utils";

interface PartsListProps {
  parts: PartDefinition[];
  activePart: string | null;
  onNewPart: () => void;
  onSelectPart: (partId: string) => void;
}

export function PartsList({
  parts,
  activePart,
  onNewPart,
  onSelectPart,
}: PartsListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Teile</h3>
        <button
          type="button"
          onClick={onNewPart}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          + Neues Teil
        </button>
      </div>

      {parts.length === 0 ? (
        <p className="text-xs text-gray-400">
          Noch keine Teile definiert. Waehlen Sie Entities im Editor aus.
        </p>
      ) : (
        <ul className="space-y-1">
          {parts.map((part) => {
            const isActive = activePart === part.id;
            return (
              <li key={part.id}>
                <button
                  type="button"
                  onClick={() => onSelectPart(part.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-900 font-medium"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <span>{part.name}</span>
                  <span className="tabular-nums text-xs text-gray-500">
                    {part.entityIds.length} Entities
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
