---
type: agent-note
title: "QA Engineer"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".claude/agents/qa-engineer.md"
summary: "Analysenotiz fuer den QA-Agenten, der Implementierungen gegen Acceptance Criteria, Architektur und Quality Gates testet und dokumentiert."
tags:
  - knowledge
  - agent
  - domain/quality
  - tool/claude
related:
  - "[[workflow]]"
  - "[[REQUIREMENTS]]"
  - "[[ARCHITECTURE]]"
  - "[[TEST_REPORT]]"
---

# QA Engineer

> Analysenotiz fuer den operativen Agenten unter `.claude/agents/qa-engineer.md`.

## Zweck

- Prueft, ob der Code die definierten Akzeptanzkriterien erfuellt.
- Helt Ergebnisse fuer den weiteren Handoff in Test- und Review-Artefakten fest.

## Inputs

- `AGENTS.md`
- `docs/workflow.md`
- `docs/requirements/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- produktiver Code unter `src/`

## Outputs

- Testartefakte unter `tests/`
- Ergebnisse und Befunde fuer `docs/reports/TEST_REPORT.md`
- Hinweise fuer Handoffs an Review und Gatekeeper

## Abhaengigkeiten

- Quality Gate `scripts/ship-safe.sh`
- Acceptance Criteria aus den Requirements

## Beobachtungen

- Der Agent testet bewusst nur Produktionscode unter `src/`.
- Die Rolle ist die Bruecke zwischen Implementierung und Freigabe.

## Analyse-Notizen

- Sinnvoll fuer spaetere Test-Matrixen nach Feature, Kriterium und Fehlerklasse.
- Sollte in Obsidian mit Gatekeeper- und Code-Review-Notizen verbunden werden.
