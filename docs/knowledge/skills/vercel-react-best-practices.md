---
type: skill-note
title: "vercel-react-best-practices"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".agents/skills/vercel-react-best-practices/SKILL.md"
summary: "Analysenotiz fuer den Vercel-React-Skill mit Fokus auf Performance, Bundle-Kosten, Datenfluesse, Re-Render-Kontrolle und moderne React-Patterns."
skill_kind: pattern
tags:
  - knowledge
  - skill
  - domain/frontend
  - tech/react
related:
  - "[[frontend-developer]]"
  - "[[code-reviewer]]"
  - "[[next-best-practices]]"
---

# vercel-react-best-practices

> Analysenotiz fuer den operativen Skill unter `.agents/skills/vercel-react-best-practices/SKILL.md`.

## Zweck

- Buendelt performanzorientierte React- und Next.js-Regeln aus Vercel-Perspektive.

## Typ

- `pattern` fuer priorisierte Engineering-Regeln mit starkem Review- und Refactoring-Nutzen.

## Kernaussagen

- Waterfalls, Bundle-Aufblaehung und unnötige Re-Renders sind zentrale Zielprobleme.
- Server- und Client-Performance werden gemeinsam betrachtet.
- Moderne React-Muster wie Transition-orientierte Updates werden bevorzugt.

## Wann verwenden?

- Beim Schreiben oder Reviewen von React- und Next.js-Code.
- Bei Performance-Untersuchungen in Komponenten, Datenfluesse oder Bundles.

## Grenzen

- Kein Repo-spezifischer Workflow-Skill, sondern eine allgemeine Performance-Referenz.
- Muss mit lokalen Regeln aus `AGENTS.md` und Architekturvorgaben kombiniert werden.

## Verknuepfte Agenten oder Themen

- [[frontend-developer]]
- [[code-reviewer]]
- [[next-best-practices]]

## Analyse-Notizen

- Besonders wertvoll fuer spaetere Cluster nach Performance-Dimensionen und Regelprioritaet.
- Ueberschneidet sich bewusst mit Framer-Motion- und Next-Patterns, aber mit breiterem Fokus.
