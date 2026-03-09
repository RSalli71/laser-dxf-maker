---
type: agent-note
title: "Requirements Engineer"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".claude/agents/requirements-engineer.md"
summary: "Analysenotiz fuer den Requirements-Agenten, der aus dem Projektbrief testbare Requirements mit User Stories und Acceptance Criteria ableitet."
tags:
  - knowledge
  - agent
  - domain/requirements
  - tool/claude
related:
  - "[[workflow]]"
  - "[[REQUIREMENTS]]"
  - "[[PROJECT_BRIEF]]"
  - "[[DECISIONS]]"
---

# Requirements Engineer

> Analysenotiz fuer den operativen Agenten unter `.claude/agents/requirements-engineer.md`.

## Zweck

- Uebersetzt den Projektbrief in testbare Anforderungen.
- Legt mit `docs/requirements/REQUIREMENTS.md` die fachliche Basis fuer alle Folgephasen.

## Inputs

- `PROJECT_BRIEF.md`
- `AGENTS.md`
- `docs/workflow.md`
- vorhandene Vorlagen und Logs unter `docs/`

## Outputs

- `docs/requirements/REQUIREMENTS.md`
- geklaerte User Stories, Acceptance Criteria, Annahmen und Nicht-Ziele

## Abhaengigkeiten

- Projektbrief als Ursprung der Anforderungen
- Workflow-Regeln fuer Reihenfolge und Handoffs

## Beobachtungen

- Diese Rolle erzeugt die wichtigste inhaltliche Source of Truth fuer den Rest des Workflows.
- Gut geeignet fuer spaetere Obsidian-Abfragen nach offenen Fragen, Annahmen und Feature-Struktur.

## Analyse-Notizen

- Sollte in der Wissensbasis als frueher Einstiegspunkt fuer jedes Projekt markiert werden.
- Beziehungen zu Architektur-, QA- und Gatekeeper-Notizen sind zentral.
