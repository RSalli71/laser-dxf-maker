---
type: agent-note
title: "Code Reviewer"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".claude/agents/code-reviewer.md"
summary: "Analysenotiz fuer den Review-Agenten, der Produktivcode auf Security, Performance, Konsistenz und Best Practices prueft."
tags:
  - knowledge
  - agent
  - domain/review
  - tool/claude
related:
  - "[[workflow]]"
  - "[[ARCHITECTURE]]"
  - "[[REQUIREMENTS]]"
  - "[[TEST_REPORT]]"
  - "[[vercel-react-best-practices]]"
  - "[[next-best-practices]]"
---

# Code Reviewer

> Analysenotiz fuer den operativen Agenten unter `.claude/agents/code-reviewer.md`.

## Zweck

- Prueft Produktivcode vor Production auf Risiken und Regelverletzungen.
- Nutzt Architektur, Requirements, Test-Report und Skills als Review-Massstab.

## Inputs

- `AGENTS.md`
- `docs/workflow.md`
- `docs/ARCHITECTURE.md`
- `docs/requirements/REQUIREMENTS.md`
- `docs/reports/TEST_REPORT.md`
- `src/`

## Outputs

- Review-Befunde und Freigabe- oder Blocker-Signale fuer den letzten Abschnitt des Workflows

## Abhaengigkeiten

- `scripts/ship-safe.sh`
- relevante Skills aus `.agents/skills/`

## Beobachtungen

- Die Rolle ist explizit auf Review fokussiert und schreibt keinen Produktivcode.
- Sie kombiniert technische und prozessuale Checks in einem Gate vor Production.

## Analyse-Notizen

- Eignet sich gut fuer eine spaetere Review-Taxonomie nach Security, Performance und Architektur.
- Sollte mit QA- und Gatekeeper-Notizen direkt verlinkt bleiben.
