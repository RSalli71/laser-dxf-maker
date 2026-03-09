/**
 * ClassifyToolbar -- F5: 4 Kategorie-Buttons fuer die Klassifizierung.
 *
 * Aussenkontur (Rot), Innenkontur (Blau), Biegung (Gelb), Gravur (Gruen).
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
    type: "CUT_OUTER",
    label: "Aussenkontur",
    bgColor: "bg-red-50",
    activeColor: "bg-red-600",
    textColor: "text-red-700",
    borderColor: "border-red-300",
  },
  {
    type: "CUT_INNER",
    label: "Innenkontur",
    bgColor: "bg-blue-50",
    activeColor: "bg-blue-600",
    textColor: "text-blue-700",
    borderColor: "border-blue-300",
  },
  {
    type: "BEND",
    label: "Biegung",
    bgColor: "bg-yellow-50",
    activeColor: "bg-yellow-500",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-300",
  },
  {
    type: "ENGRAVE",
    label: "Gravur",
    bgColor: "bg-green-50",
    activeColor: "bg-green-600",
    textColor: "text-green-700",
    borderColor: "border-green-300",
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
