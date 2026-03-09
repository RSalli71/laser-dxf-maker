/**
 * Workflow step type for the single-page wizard UI.
 *
 * The app has one page; the workflow is driven by client state.
 * Reference: docs/ARCHITECTURE.md "Workflow-Steps (Client-State)"
 */

export type WorkflowStep =
  | "project"   // F1: Enter customer/project info
  | "upload"    // F2: Upload + parse DXF file
  | "select"    // F3: Select areas (define parts)
  | "clean"     // F4: Auto-cleaning (show report)
  | "classify"  // F5: Auto-classification + manual correction
  | "export";   // F6: Export + download
