/**
 * StepIndicator -- Workflow-Fortschritt als Stepper.
 *
 * Zeigt die 6 Workflow-Steps (F1-F6) als horizontale Stepper-Leiste.
 * Der aktive Step ist hervorgehoben, abgeschlossene Steps sind markiert.
 */

"use client";

import type { WorkflowStep } from "@/types/workflow";
import { cn } from "@/lib/utils";

const STEPS: { id: WorkflowStep; label: string; short: string }[] = [
  { id: "project", label: "Projekt", short: "F1" },
  { id: "upload", label: "Upload", short: "F2" },
  { id: "select", label: "Teile", short: "F3" },
  { id: "clean", label: "Bereinigung", short: "F4" },
  { id: "classify", label: "Klassifizierung", short: "F5" },
  { id: "export", label: "Export", short: "F6" },
];

const STEP_ORDER: WorkflowStep[] = STEPS.map((s) => s.id);

interface StepIndicatorProps {
  currentStep: WorkflowStep;
  onStepClick?: (step: WorkflowStep) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <nav className="flex items-center gap-1" aria-label="Workflow-Schritte">
      {STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;
        const isClickable = onStepClick && isCompleted;

        return (
          <div key={step.id} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  "mx-1 h-px w-4 sm:w-6",
                  isCompleted ? "bg-green-500" : "bg-gray-300",
                )}
              />
            )}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                isActive &&
                  "bg-blue-600 text-white shadow-sm",
                isCompleted &&
                  "bg-green-100 text-green-800 hover:bg-green-200",
                !isActive &&
                  !isCompleted &&
                  "bg-gray-100 text-gray-400",
                isClickable && "cursor-pointer",
                !isClickable && !isActive && "cursor-default",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="hidden sm:inline">{step.short}</span>
              <span>{step.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
