---
type: agent-note
title: "Backend Developer"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".claude/agents/backend-developer.md"
summary: "Analysenotiz fuer den Backend-Agenten mit Fokus auf API-Routes, Server-Logik, Import-Pipelines und modulare Library-Bausteine."
tags:
  - knowledge
  - agent
  - domain/backend
  - tool/claude
related:
  - "[[workflow]]"
  - "[[ARCHITECTURE]]"
  - "[[REQUIREMENTS]]"
  - "[[DECISIONS]]"
---

# Backend Developer

> Analysenotiz fuer den operativen Agenten unter `.claude/agents/backend-developer.md`.

## Zweck

- Baut API-Routes und Server-Logik auf Basis der definierten Architektur.
- Uebersetzt Konzepte und Deep-Dive-Dokumente in produktiven Code unter `src/`.

## Inputs

- `docs/workflow.md`
- `docs/ARCHITECTURE.md`
- `docs/architecture/`
- `docs/requirements/REQUIREMENTS.md`
- `docs/DECISIONS.md`
- `docs/concepts/`

## Outputs

- API-Routes unter `src/app/api/`
- Server-Module und Libraries unter `src/lib/` und angrenzenden `src/`-Bereichen
- import- und pipeline-nahe Backend-Bausteine

## Abhaengigkeiten

- Architektur-Deep-Dives unter `docs/architecture/`
- Decisions und Konzepte als zusaetzliche Source fuer Implementierungsdetails

## Beobachtungen

- Der Agent ist staerker dokumentgetrieben als der Frontend-Agent.
- `docs/DECISIONS.md` ist hier explizit Pflichtlektuere und damit Teil des Architekturvertrags.

## Analyse-Notizen

- Gute Notiz fuer spaetere Verknuepfungen mit API-Konzepten, Import-Pipeline und Storage-Layer.
- Sollte in Obsidian mit Architektur-Teilnotizen verlinkt werden, falls `docs/architecture/` weiter ausgebaut wird.
