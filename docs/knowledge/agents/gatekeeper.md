---
type: agent-note
title: "Gatekeeper"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".claude/agents/gatekeeper.md"
summary: "Analysenotiz fuer den Gatekeeper-Agenten, der Artefakte phasenuebergreifend auf Konsistenz prueft und den naechsten Schritt nur bei Stimmigkeit freigibt."
tags:
  - knowledge
  - agent
  - domain/governance
  - tool/claude
related:
  - "[[workflow]]"
  - "[[REQUIREMENTS]]"
  - "[[ARCHITECTURE]]"
  - "[[TEST_REPORT]]"
---

# Gatekeeper

> Analysenotiz fuer den operativen Agenten unter `.claude/agents/gatekeeper.md`.

## Zweck

- Prueft die Konsistenz zwischen Brief, Requirements, Architektur, Code und Tests.
- Blockiert den naechsten Schritt, wenn Artefakte fachlich oder technisch nicht zusammenpassen.

## Inputs

- `AGENTS.md`
- `docs/workflow.md`
- `PROJECT_BRIEF.md`
- `docs/requirements/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `src/`
- `tests/`

## Outputs

- Gatekeeper-Report und klare Freigabe- oder Blocker-Aussage pro Phase

## Abhaengigkeiten

- alle vorangehenden Artefakte
- Skills als Referenzrahmen fuer Konventionspruefungen

## Beobachtungen

- Diese Rolle produziert bewusst nichts Neues, sondern validiert Querverbindungen.
- Sie ist die staerkste Governance-Notiz im Workflow.

## Analyse-Notizen

- Besonders geeignet fuer Obsidian-Ansichten nach Phase, Artefaktpaar und Blocker-Typ.
- Sollte spaeter mit konkreten Gate-Faellen und wiederkehrenden Fehlerbildern angereichert werden.
