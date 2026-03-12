/**
 * AppShell -- Zentraler Workflow-Container fuer den Laser DXF-Maker.
 *
 * Haelt den gesamten Client-State (kein externer State-Manager).
 * Rendert je nach workflowStep die richtige Komponente.
 * Header mit Projektinfo und Step-Indikator.
 * Weiter/Zurueck Navigation zwischen Steps.
 *
 * State-Strategie: Alles via useState in AppShell, Props + Callbacks an Children.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import type { WorkflowStep } from "@/types/workflow";
import type {
  DxfEntityV2,
  LayerDefinition,
  ParseStats as ParseStatsType,
  CleanReport as CleanReportType,
} from "@/types/dxf-v2";
import type { ProjectInfo, PartDefinition } from "@/types/project";
import type { ClassificationType } from "@/types/classification";

import { generateExportFilename } from "@/lib/dxf/exporter";
import { aciToHex, aciName } from "@/lib/dxf/aci-colors";
import {
  assignEntitiesToPart,
  classifyAssignedParts,
  cleanAssignedParts,
  getAssignedPartEntities,
  getPopulatedParts,
  removeEntityFromPart,
} from "@/lib/workflow/part-workflow";
import { getLayerConfig } from "@/types/classification";

import { StepIndicator } from "./StepIndicator";
import { ProjectForm } from "./ProjectForm";
import { FileUpload } from "./FileUpload";
import { ParseStats } from "./ParseStats";
import { PartsList } from "./PartsList";
import { CleanReport } from "./CleanReport";
import { ClassifyToolbar } from "./ClassifyToolbar";
import { ExportPanel } from "./ExportPanel";
import { DxfEditor } from "@/components/editor/DxfEditor";

const STEP_ORDER: WorkflowStep[] = [
  "project",
  "upload",
  "select",
  "clean",
  "classify",
  "export",
];

const STEP_LABELS: Record<WorkflowStep, string> = {
  project: "Projekt festlegen",
  upload: "DXF hochladen",
  select: "Teile definieren",
  clean: "Bereinigung",
  classify: "Klassifizierung",
  export: "Export",
};

export function AppShell() {
  // ---- Central State ----
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("project");
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [entities, setEntities] = useState<DxfEntityV2[]>([]);
  const [parseStats, setParseStats] = useState<ParseStatsType | null>(null);
  const [parts, setParts] = useState<PartDefinition[]>([]);
  const [activePart, setActivePart] = useState<string | null>(null);
  const [cleanReports, setCleanReports] = useState<
    Map<string, CleanReportType>
  >(new Map());
  const [activeClassification, setActiveClassification] =
    useState<ClassificationType>("CUT");
  const [fileName, setFileName] = useState("");
  const [layerTable, setLayerTable] = useState<Map<string, LayerDefinition>>(
    new Map(),
  );

  // ---- Derived State ----
  const currentStepIndex = STEP_ORDER.indexOf(workflowStep);

  const canGoNext = useMemo(() => {
    switch (workflowStep) {
      case "project":
        return projectInfo !== null;
      case "upload":
        return entities.length > 0;
      case "select":
        return parts.length > 0 && parts.some((p) => p.entityIds.length > 0);
      case "clean":
        return true; // Auto-step, always can proceed
      case "classify":
        return entities.some((e) => e.classification);
      case "export":
        return false; // Last step
      default:
        return false;
    }
  }, [workflowStep, projectInfo, entities, parts]);

  const canGoBack = currentStepIndex > 0;

  const populatedParts = useMemo(() => getPopulatedParts(parts), [parts]);

  const displayedPartId = useMemo(() => {
    if (activePart && populatedParts.some((part) => part.id === activePart)) {
      return activePart;
    }

    return populatedParts[0]?.id ?? null;
  }, [activePart, populatedParts]);

  const displayedPart = useMemo(
    () => populatedParts.find((part) => part.id === displayedPartId) ?? null,
    [displayedPartId, populatedParts],
  );

  const displayedPartEntities = useMemo(() => {
    if (!displayedPart) return entities;
    const entityIds = new Set(displayedPart.entityIds);
    return entities.filter((entity) => entityIds.has(entity.id));
  }, [displayedPart, entities]);

  const activePartDefinition = useMemo(
    () => parts.find((part) => part.id === activePart) ?? null,
    [activePart, parts],
  );

  /** Color/layer summary for the active part's selected entities */
  const activePartLayerSummary = useMemo(() => {
    if (!activePartDefinition) return [];
    const idSet = new Set(activePartDefinition.entityIds);
    const groups = new Map<string, { count: number; color: number; layer: string }>();

    for (const e of entities) {
      if (!idSet.has(e.id)) continue;
      const key = `${e.layer}:${e.color}`;
      const entry = groups.get(key);
      if (entry) {
        entry.count++;
      } else {
        groups.set(key, { count: 1, color: e.color, layer: e.layer });
      }
    }

    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [activePartDefinition, entities]);

  // ---- Navigation ----
  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      const nextStep = STEP_ORDER[nextIndex];

      // F4 auto-cleaning: when entering "clean" step, trigger cleaning
      if (nextStep === "clean") {
        const populatedParts = getPopulatedParts(parts);
        const assignedEntities = getAssignedPartEntities(
          entities,
          populatedParts,
        );
        const cleaned = cleanAssignedParts(assignedEntities, populatedParts, layerTable);

        setEntities(cleaned.entities);
        setParts(cleaned.parts);
        setCleanReports(cleaned.reports);
      }

      // F5 auto-classification: when entering "classify" step
      if (nextStep === "classify") {
        const classified = classifyAssignedParts(entities, parts);
        setEntities(classified);
      }

      setWorkflowStep(nextStep);
    }
  }, [currentStepIndex, entities, parts]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setWorkflowStep(STEP_ORDER[prevIndex]);
    }
  }, [currentStepIndex]);

  // ---- F1: Project ----
  const handleProjectSubmit = useCallback((info: ProjectInfo) => {
    setProjectInfo(info);
    setWorkflowStep("upload");
  }, []);

  // ---- F2: File Upload ----
  const handleFileLoaded = useCallback((content: string, name: string) => {
    setFileName(name);

    // Dynamic import of parser to avoid bundling issues
    import("@/lib/dxf/parser")
      .then(({ parseDxf }) => {
        try {
          const result = parseDxf(content);
          setEntities(result.entities);
          setParseStats(result.stats);
          setLayerTable(result.layerTable);
        } catch {
          // Parser not yet implemented -- show error
          setParseStats({
            totalEntities: 0,
            byType: {},
            layers: [],
            warnings: [
              "Parser noch nicht implementiert. Bitte Backend-Entwicklung abwarten.",
            ],
          });
        }
      })
      .catch(() => {
        setParseStats({
          totalEntities: 0,
          byType: {},
          layers: [],
          warnings: ["Parser-Modul konnte nicht geladen werden."],
        });
      });
  }, []);

  // ---- F3: Parts ----
  const handleNewPart = useCallback(() => {
    const partNumber = parts.length + 1;
    const newPart: PartDefinition = {
      id: crypto.randomUUID(),
      name: `T${partNumber}`,
      entityIds: [],
    };
    setParts((prev) => [...prev, newPart]);
    setActivePart(newPart.id);
  }, [parts.length]);

  const handleSelectPart = useCallback((partId: string) => {
    setActivePart(partId);
  }, []);

  const handleEntitiesSelected = useCallback(
    (entityIds: number[]) => {
      if (!activePart) {
        // Auto-create first part if none exists
        const newPart: PartDefinition = {
          id: crypto.randomUUID(),
          name: "T1",
          entityIds,
        };
        setParts([newPart]);
        setActivePart(newPart.id);

        // Set partId on entities
        setEntities((prev) =>
          prev.map((e) =>
            entityIds.includes(e.id) ? { ...e, partId: newPart.id } : e,
          ),
        );
        return;
      }

      // Add entities to active part
      setParts((prev) => assignEntitiesToPart(prev, activePart, entityIds));

      // Set partId on entities
      setEntities((prev) =>
        prev.map((e) =>
          entityIds.includes(e.id) ? { ...e, partId: activePart } : e,
        ),
      );
    },
    [activePart],
  );

  const handleEntityDeselected = useCallback(
    (entityId: number) => {
      if (!activePart) return;

      setParts((prev) => removeEntityFromPart(prev, activePart, entityId));

      setEntities((prev) =>
        prev.map((e) =>
          e.id === entityId && e.partId === activePart
            ? { ...e, partId: undefined }
            : e,
        ),
      );
    },
    [activePart],
  );

  const handleEntityClicked = useCallback(
    (entityId: number) => {
      if (workflowStep === "classify" && activeClassification) {
        const config = getLayerConfig(activeClassification);
        setEntities((prev) =>
          prev.map((e) =>
            e.id === entityId
              ? {
                  ...e,
                  classification: activeClassification,
                  layer: config?.layerName ?? e.layer,
                  color: config?.aciNumber ?? e.color,
                }
              : e,
          ),
        );
      }
    },
    [workflowStep, activeClassification],
  );

  const handleClassifyEntities = useCallback(
    (entityIds: number[]) => {
      if (workflowStep === "classify" && activeClassification) {
        const config = getLayerConfig(activeClassification);
        setEntities((prev) =>
          prev.map((e) =>
            entityIds.includes(e.id)
              ? {
                  ...e,
                  classification: activeClassification,
                  layer: config?.layerName ?? e.layer,
                  color: config?.aciNumber ?? e.color,
                }
              : e,
          ),
        );
      }
    },
    [workflowStep, activeClassification],
  );

  // ---- F5: Classification stats ----
  const classificationStats = useMemo(() => {
    const stats: Record<ClassificationType, number> = {
      CUT: 0,
      BEND: 0,
      ENGRAVE: 0,
    };
    for (const entity of displayedPartEntities) {
      if (entity.classification) {
        stats[entity.classification]++;
      }
    }
    return stats;
  }, [displayedPartEntities]);

  // ---- F6: Export ----
  const handleExportPart = useCallback(
    (partId: string) => {
      const part = parts.find((p) => p.id === partId);
      if (!part || !projectInfo) return;

      // Dynamic import of exporter
      import("@/lib/dxf/exporter")
        .then(({ exportDxf }) => {
          try {
            const partEntities = entities.filter((e) =>
              part.entityIds.includes(e.id),
            );
            const dxfContent = exportDxf(partEntities, projectInfo, part);
            const exportFilename = generateExportFilename(
              projectInfo,
              part.name,
              parts.length,
            );
            triggerDownload(dxfContent, exportFilename);
          } catch {
            // Exporter not yet implemented
            console.error("Exporter noch nicht implementiert.");
          }
        })
        .catch(() => {
          console.error("Exporter-Modul konnte nicht geladen werden.");
        });
    },
    [parts, entities, projectInfo],
  );

  const handleExportAll = useCallback(() => {
    for (const part of parts) {
      handleExportPart(part.id);
    }
  }, [parts, handleExportPart]);

  // ---- New Project (reset) ----
  const handleNewProject = useCallback(() => {
    setWorkflowStep("project");
    setProjectInfo(null);
    setEntities([]);
    setParseStats(null);
    setParts([]);
    setActivePart(null);
    setCleanReports(new Map());
    setActiveClassification("CUT");
    setFileName("");
    setLayerTable(new Map());
  }, []);

  // ---- Next File (keep project, reset file state) ----
  const handleNextFile = useCallback(() => {
    setWorkflowStep("upload");
    setEntities([]);
    setParseStats(null);
    setParts([]);
    setActivePart(null);
    setCleanReports(new Map());
    setActiveClassification("CUT");
    setFileName("");
    setLayerTable(new Map());
  }, []);

  // ---- Part names map for CleanReport ----
  const partNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const part of parts) {
      map.set(part.id, part.name);
    }
    return map;
  }, [parts]);

  // ---- Render ----
  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-bold text-gray-900">Laser DXF-Maker</h1>
          {projectInfo && (
            <span className="text-xs text-gray-500">
              {projectInfo.customerName} / {projectInfo.projectNumber}
              {fileName && <> &mdash; {fileName}</>}
            </span>
          )}
        </div>
        <StepIndicator currentStep={workflowStep} />
      </header>

      {/* Main Content */}
      <main className="flex min-h-0 flex-1">
        {/* Step Content */}
        {workflowStep === "project" && (
          <div className="flex flex-1 items-center justify-center p-8">
            <ProjectForm onSubmit={handleProjectSubmit} />
          </div>
        )}

        {workflowStep === "upload" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
            {!parseStats ? (
              <FileUpload onFileLoaded={handleFileLoaded} />
            ) : (
              <>
                <ParseStats stats={parseStats} fileName={fileName} />
                {entities.length > 0 && (
                  <p className="text-sm text-green-600">
                    {entities.length} Entities erfolgreich geparst.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {workflowStep === "select" && (
          <>
            {/* Editor area */}
            <div className="flex-1">
              <DxfEditor
                key={activePart ?? "no-part"}
                entities={entities}
                mode="select"
                selectedEntityIds={activePartDefinition?.entityIds ?? []}
                onEntitiesSelected={handleEntitiesSelected}
                onEntityDeselected={handleEntityDeselected}
              />
            </div>
            {/* Sidebar */}
            <aside className="w-72 shrink-0 space-y-4 overflow-y-auto border-l border-gray-200 bg-white p-4">
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="text-xs font-semibold tracking-wide text-orange-700 uppercase">
                  F3 Auswahl
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {activePartDefinition
                    ? `${activePartDefinition.name}: ${activePartDefinition.entityIds.length} Entities markiert`
                    : "Noch kein Teil aktiv"}
                </p>
                {activePartLayerSummary.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-gray-500">
                      Farben / Layer:
                    </p>
                    {activePartLayerSummary.map(({ layer, count, color }) => {
                      const hasMultipleLayers = activePartLayerSummary.some(
                        (s) => s.layer !== activePartLayerSummary[0].layer,
                      );
                      const label = hasMultipleLayers
                        ? `${layer} — ${aciName(color)}`
                        : aciName(color);
                      return (
                        <div
                          key={`${layer}:${color}`}
                          className="flex items-center gap-2 text-xs text-gray-700"
                        >
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-gray-300"
                            style={{ backgroundColor: aciToHex(color) }}
                          />
                          <span className="truncate font-medium">{label}</span>
                          <span className="ml-auto tabular-nums text-gray-400">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-xs leading-5 text-gray-600">
                  Fenster oder Klick fuegt Geometrie zum aktiven Teil hinzu. Ein
                  Klick auf bereits orange markierte Geometrie entfernt sie
                  wieder aus dem Teil.
                </p>
              </div>
              <PartsList
                parts={parts}
                activePart={activePart}
                onNewPart={handleNewPart}
                onSelectPart={handleSelectPart}
              />
            </aside>
          </>
        )}

        {workflowStep === "clean" && (
          <div className="flex flex-1 gap-6 p-8">
            <div className="flex-1">
              <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Arbeitsansicht: {displayedPart?.name ?? "Kein Teil aktiv"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {displayedPartEntities.length} bereinigte Entities im
                    aktiven Teil
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Nur die gewaehlte Teilgeometrie bleibt ab F4 sichtbar.
                </p>
              </div>
              <DxfEditor entities={displayedPartEntities} mode="select" />
            </div>
            <aside className="w-80 shrink-0 space-y-4 overflow-y-auto">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <PartsList
                  parts={populatedParts}
                  activePart={displayedPartId}
                  onSelectPart={handleSelectPart}
                  showCreateButton={false}
                  emptyText="Keine bereinigten Teile vorhanden."
                />
              </div>
              <CleanReport reports={cleanReports} partNames={partNames} />
            </aside>
          </div>
        )}

        {workflowStep === "classify" && (
          <div className="flex flex-1">
            {/* Classify toolbar */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-2">
                <div className="flex items-center justify-between gap-4">
                  <ClassifyToolbar
                    activeClassification={activeClassification}
                    onClassificationChange={setActiveClassification}
                    stats={classificationStats}
                  />
                  <div className="text-right text-xs text-gray-500">
                    <p className="font-medium text-gray-700">
                      Aktives Teil: {displayedPart?.name ?? "-"}
                    </p>
                    <p>
                      {displayedPartEntities.length} Entities in der
                      Arbeitsansicht
                    </p>
                  </div>
                </div>
              </div>
              {/* Editor */}
              <div className="flex-1">
                <DxfEditor
                  entities={displayedPartEntities}
                  mode="classify"
                  activeClassification={activeClassification}
                  onEntitiesSelected={handleClassifyEntities}
                  onEntityClicked={handleEntityClicked}
                />
              </div>
            </div>
            <aside className="w-72 shrink-0 border-l border-gray-200 bg-white p-4">
              <PartsList
                parts={populatedParts}
                activePart={displayedPartId}
                onSelectPart={handleSelectPart}
                showCreateButton={false}
                emptyText="Keine Teile fuer die Klassifizierung vorhanden."
              />
            </aside>
          </div>
        )}

        {workflowStep === "export" && projectInfo && (
          <div className="flex flex-1 items-start justify-center p-8">
            <div className="w-full max-w-2xl">
              <ExportPanel
                parts={parts}
                entities={entities}
                projectInfo={projectInfo}
                onExportPart={handleExportPart}
                onExportAll={handleExportAll}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={goBack}
          disabled={!canGoBack}
          className={[
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            canGoBack
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "cursor-not-allowed bg-gray-50 text-gray-300",
          ].join(" ")}
        >
          Zurueck
        </button>

        <span className="text-xs text-gray-400">
          Schritt {currentStepIndex + 1} von {STEP_ORDER.length}:{" "}
          {STEP_LABELS[workflowStep]}
        </span>

        {workflowStep !== "export" && (
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className={[
              "rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors",
              canGoNext
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "cursor-not-allowed bg-gray-200 text-gray-400",
            ].join(" ")}
          >
            Weiter
          </button>
        )}

        {workflowStep === "export" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleNextFile}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Naechste Datei
            </button>
            <button
              type="button"
              onClick={handleNewProject}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Neues Projekt
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}

// ---- Helper functions ----

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
