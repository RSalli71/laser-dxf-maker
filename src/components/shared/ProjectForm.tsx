/**
 * ProjectForm -- F1: Kunde/Projekt eingeben.
 *
 * Controlled inputs fuer Kundenname und Projektnummer.
 * Beide Felder sind Pflicht. "Weiter" nur aktiv wenn beide ausgefuellt.
 */

"use client";

import { useState } from "react";
import type { ProjectInfo } from "@/types/project";

interface ProjectFormProps {
  onSubmit: (info: ProjectInfo) => void;
}

export function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [errors, setErrors] = useState<{ customer?: string; project?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { customer?: string; project?: string } = {};
    if (!customerName.trim()) {
      newErrors.customer = "Kundenname ist erforderlich";
    }
    if (!projectNumber.trim()) {
      newErrors.project = "Projektnummer ist erforderlich";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit({
      customerName: customerName.trim(),
      projectNumber: projectNumber.trim(),
    });
  };

  const isValid = customerName.trim() !== "" && projectNumber.trim() !== "";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Projekt festlegen
        </h2>
        <p className="text-sm text-gray-500">
          Geben Sie Kundenname und Projektnummer ein. Diese Daten werden im
          exportierten Dateinamen verwendet.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="customerName"
            className="block text-sm font-medium text-gray-700"
          >
            Kundenname *
          </label>
          <input
            id="customerName"
            type="text"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              if (errors.customer) setErrors((prev) => ({ ...prev, customer: undefined }));
            }}
            placeholder="z.B. Mustermann GmbH"
            className={cn(
              "w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              errors.customer
                ? "border-red-300 text-red-900 placeholder-red-300"
                : "border-gray-300 text-gray-900 placeholder-gray-400",
            )}
          />
          {errors.customer && (
            <p className="text-xs text-red-600">{errors.customer}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="projectNumber"
            className="block text-sm font-medium text-gray-700"
          >
            Projektnummer *
          </label>
          <input
            id="projectNumber"
            type="text"
            value={projectNumber}
            onChange={(e) => {
              setProjectNumber(e.target.value);
              if (errors.project) setErrors((prev) => ({ ...prev, project: undefined }));
            }}
            placeholder="z.B. 2024-0042"
            className={cn(
              "w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              errors.project
                ? "border-red-300 text-red-900 placeholder-red-300"
                : "border-gray-300 text-gray-900 placeholder-gray-400",
            )}
          />
          {errors.project && (
            <p className="text-xs text-red-600">{errors.project}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid}
        className={cn(
          "w-full rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors",
          isValid
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "cursor-not-allowed bg-gray-200 text-gray-400",
        )}
      >
        Weiter
      </button>
    </form>
  );
}

// Inline cn to avoid circular dependency issues during SSR
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
