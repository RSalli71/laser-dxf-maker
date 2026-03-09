---
type: agent-note
title: "Frontend Developer"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".claude/agents/frontend-developer.md"
summary: "Analysenotiz fuer den Frontend-Agenten mit Fokus auf App Router UI, Components, Layouts und Frontend-nahe Server Actions."
tags:
  - knowledge
  - agent
  - domain/frontend
  - tool/claude
related:
  - "[[workflow]]"
  - "[[ARCHITECTURE]]"
  - "[[REQUIREMENTS]]"
  - "[[next-best-practices]]"
  - "[[tailwind-v4-shadcn]]"
  - "[[framer-motion]]"
  - "[[vercel-react-best-practices]]"
---

# Frontend Developer

> Analysenotiz fuer den operativen Agenten unter `.claude/agents/frontend-developer.md`.

## Zweck

- Setzt die Architektur in Pages, Layouts und Komponenten unter `src/` um.
- Arbeitet entlang des Workflows nach Requirements und Architektur, nicht entlang freier UI-Ideen.

## Inputs

- `AGENTS.md`
- `docs/workflow.md`
- `docs/ARCHITECTURE.md`
- `docs/requirements/REQUIREMENTS.md`
- vorhandene Bausteine unter `src/`

## Outputs

- `src/app/`
- `src/components/shared/`
- `src/components/[feature]/`
- bei Bedarf `src/actions/`, `src/hooks/`, `src/lib/`, `src/types/`

## Abhaengigkeiten

- `next-best-practices`
- `tailwind-v4-shadcn`
- `framer-motion`
- `vercel-react-best-practices`

## Beobachtungen

- Der Agent darf nicht in `vibe/` entwickeln.
- `src/components/ui/` bleibt fuer shadcn/ui reserviert.
- Der Skill-Block ist verpflichtend und klar priorisiert.

## Analyse-Notizen

- Gute Kandidatennotiz fuer spaetere UI-Patterns, Layout-Konventionen und RSC-Grenzen.
- Sollte in Obsidian mit Architektur- und Skill-Notizen eng verlinkt werden.
