/**
 * ClassifyToolbar -- F5: 3 Kategorie-Buttons fuer die Klassifizierung.
 *
 * Schneidkontur (Grau/Schwarz), Biegung (Gruen), Gravur (Rot).
 * Der aktive Button ist hervorgehoben. Statistik unter jedem Button.
 */

"use client";

import type { ClassificationType } from "@/types/classification";
import { cn } from "@/lib/utils";

interface ClassifyToolbarProps {
  activeClassification: ClassificationType | null;
  onClassificationChange: (type: ClassificationType) => void;
  stats: Record<ClassificationType, number>;
}

const BUTTONS: {
  type: ClassificationType;
  label: string;
  bgColor: string;
  activeColor: string;
  textColor: string;
  borderColor: string;
}[] = [
  {
    type: "CUT",
    label: "Schneidkontur",
    bgColor: "bg-gray-50",
    activeColor: "bg-gray-700",
    textColor: "text-gray-700",
    borderColor: "border-gray-300",
  },
  {
    type: "BEND",
    label: "Biegung",
    bgColor: "bg-green-50",
    activeColor: "bg-green-600",
    textColor: "text-green-700",
    borderColor: "border-green-300",
  },
  {
    type: "ENGRAVE",
    label: "Gravur",
    bgColor: "bg-red-50",
    activeColor: "bg-red-600",
    textColor: "text-red-700",
    borderColor: "border-red-300",
  },
];

export function ClassifyToolbar({
  activeClassification,
  onClassificationChange,
  stats,
}: ClassifyToolbarProps) {
  return (
    <div className="flex gap-2">
      {BUTTONS.map(({ type, label, bgColor, activeColor, textColor, borderColor }) => {
        const isActive = activeClassification === type;
        const count = stats[type] ?? 0;

        return (
          <button
            key={type}
            type="button"
            onClick={() => onClassificationChange(type)}
            className={cn(
              "flex flex-col items-center rounded-lg border px-3 py-2 text-xs font-medium transition-all",
              isActive
                ? `${activeColor} border-transparent text-white shadow-md`
                : `${bgColor} ${borderColor} ${textColor} hover:shadow-sm`,
            )}
          >
            <span>{label}</span>
            <span
              className={cn(
                "mt-1 tabular-nums",
                isActive ? "text-white/80" : "text-gray-400",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
