---
type: skill-note
title: "next-best-practices"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".agents/skills/next-best-practices/SKILL.md"
summary: "Analysenotiz fuer den Next.js-Skill mit Fokus auf App Router, RSC-Grenzen, Datenmuster, Runtime-Entscheidungen und Build-nahe Best Practices."
skill_kind: pattern
tags:
  - knowledge
  - skill
  - domain/frontend
  - tech/nextjs
related:
  - "[[workflow]]"
  - "[[ARCHITECTURE]]"
  - "[[frontend-developer]]"
  - "[[solution-architect]]"
---

# next-best-practices

> Analysenotiz fuer den operativen Skill unter `.agents/skills/next-best-practices/SKILL.md`.

## Zweck

- Buendelt wichtige Next.js-Regeln fuer Struktur, Rendering-Grenzen, Datenzugriff und Build-Verhalten.

## Typ

- `pattern` fuer belastbare Architektur- und Implementierungsregeln rund um Next.js.

## Kernaussagen

- File Conventions und App Router Konventionen haben Vorrang.
- RSC-Grenzen, Direktiven und Async-Patterns muessen korrekt eingesetzt werden.
- Datenzugriff, Fehlerbehandlung, Metadata und Bundling werden als zusammenhaengendes System betrachtet.

## Wann verwenden?

- Bei neuen Next.js-Routen, Layouts, Server Components und Route Handlers.
- Bei Reviews oder Architekturentscheidungen fuer App-Router-Code.

## Grenzen

- Kein UI-System an sich, sondern ein Struktur- und Framework-Skill.
- Muss mit Repo-spezifischen Regeln aus `AGENTS.md` zusammengedacht werden.

## Verknuepfte Agenten oder Themen

- [[frontend-developer]]
- [[solution-architect]]
- [[workflow]]

## Analyse-Notizen

- Gute Kernnotiz fuer fast alle Frontend- und Architekturpfade im Repo.
- Sinnvoll fuer spaetere Unterteilung nach RSC, Routing, Datenmustern und Runtime-Auswahl.
