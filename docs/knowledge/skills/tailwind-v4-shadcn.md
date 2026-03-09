---
type: skill-note
title: "tailwind-v4-shadcn"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".agents/skills/tailwind-v4-shadcn/SKILL.md"
summary: "Analysenotiz fuer den Tailwind-v4- und shadcn/ui-Skill mit Fokus auf CSS-Variablen, `@theme inline`, Basisstyles und typische Setup-Fallen."
skill_kind: recipe
tags:
  - knowledge
  - skill
  - domain/frontend
  - tech/tailwindcss
related:
  - "[[ARCHITECTURE]]"
  - "[[frontend-developer]]"
  - "[[solution-architect]]"
---

# tailwind-v4-shadcn

> Analysenotiz fuer den operativen Skill unter `.agents/skills/tailwind-v4-shadcn/SKILL.md`.

## Zweck

- Beschreibt ein produktionsnahes Setup fuer Tailwind CSS v4 mit shadcn/ui.

## Typ

- `recipe` fuer eine konkrete Reihenfolge und Konfigurationslogik.

## Kernaussagen

- CSS-Variablen und `@theme inline` sind zentrale Bausteine des Setups.
- Das Setup soll typische Integrationsfehler zwischen Tailwind v4 und shadcn/ui vermeiden.
- Die Reihenfolge der Schritte ist Teil der Loesung, nicht nur Dekoration.

## Wann verwenden?

- Beim Initialisieren oder Reparieren des UI-Stacks.
- Wenn Farben, Themes oder shadcn/ui unter Tailwind v4 fehlerhaft arbeiten.

## Grenzen

- Deckt vor allem Styling- und Setup-Fragen ab, nicht App-Architektur oder Performance insgesamt.
- Muss mit den Repo-Regeln zu `src/components/ui/` und `src/components/shared/` zusammengedacht werden.

## Verknuepfte Agenten oder Themen

- [[frontend-developer]]
- [[solution-architect]]
- [[ARCHITECTURE]]

## Analyse-Notizen

- In Obsidian gut geeignet fuer Setup-Fehlerbilder und Designsystem-Notizen.
- Spaeter sinnvoll mit einer Liste typischer Tailwind-v4-Migrationsprobleme erweiterbar.
