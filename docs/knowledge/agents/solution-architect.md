---
type: agent-note
title: "Solution Architect"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".claude/agents/solution-architect.md"
summary: "Analysenotiz fuer den Architektur-Agenten, der Requirements in eine umsetzbare technische Zielarchitektur fuer Frontend, Backend und Datenmodell ueberfuehrt."
tags:
  - knowledge
  - agent
  - domain/architecture
  - tool/claude
related:
  - "[[workflow]]"
  - "[[ARCHITECTURE]]"
  - "[[REQUIREMENTS]]"
  - "[[next-best-practices]]"
  - "[[tailwind-v4-shadcn]]"
---

# Solution Architect

> Analysenotiz fuer den operativen Agenten unter `.claude/agents/solution-architect.md`.

## Zweck

- Erstellt aus den Requirements eine technische Architektur mit direkt nutzbaren Leitplanken fuer die Implementierung.
- Verbindet Produktanforderungen mit Stack-Entscheidungen, Ordnerstruktur und Datenmodell.

## Inputs

- `AGENTS.md`
- `docs/workflow.md`
- `docs/requirements/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `package.json`
- relevante Skills unter `.agents/skills/`

## Outputs

- ausgearbeitete Architektur in `docs/ARCHITECTURE.md`
- technische Entscheidungen und Strukturvorgaben fuer die Developer-Rollen

## Abhaengigkeiten

- Next.js-, Tailwind- und React-bezogene Skills
- vorhandener Stack aus `package.json`

## Beobachtungen

- Diese Rolle ist die technische Uebersetzungsstelle zwischen Fachlichkeit und Implementierung.
- Sie ist stark template- und konventionsgetrieben, nicht nur featuregetrieben.

## Analyse-Notizen

- Gute Kandidatennotiz fuer spaetere ADR-Querverweise und Architektur-Entscheidungspfade.
- Sollte eng mit Frontend-, Backend- und Database-Notizen vernetzt bleiben.
