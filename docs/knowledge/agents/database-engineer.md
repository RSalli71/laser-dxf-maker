---
type: agent-note
title: "Database Engineer"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".claude/agents/database-engineer.md"
summary: "Analysenotiz fuer den Database-Agenten mit Fokus auf Datenmodell, Migrations, RLS-Policies, Seed-Daten und abgeleitete TypeScript-Typen."
tags:
  - knowledge
  - agent
  - domain/database
  - tool/claude
related:
  - "[[workflow]]"
  - "[[ARCHITECTURE]]"
  - "[[REQUIREMENTS]]"
  - "[[DECISIONS]]"
---

# Database Engineer

> Analysenotiz fuer den operativen Agenten unter `.claude/agents/database-engineer.md`.

## Zweck

- Uebersetzt das Datenmodell in Migrations, Policies, Seed-Daten und Types.
- Sichert, dass Datenstruktur und Zugriffskontrolle zu Requirements und Architektur passen.

## Inputs

- `AGENTS.md`
- `docs/workflow.md`
- `docs/ARCHITECTURE.md`
- `docs/requirements/REQUIREMENTS.md`
- `package.json`

## Outputs

- DB-nahe Dateien unter `src/`
- Migrations und Policies gemaess Architekturvorgaben
- TypeScript-Typen fuer Datenbankstrukturen

## Abhaengigkeiten

- Sicherheitsregeln aus `AGENTS.md`
- Architekturvorgaben fuer Auth, Rollen und RLS

## Beobachtungen

- Die Rolle ist fachlich stark sicherheitsgetrieben.
- Die Notiz sollte spaeter gut mit RLS-, Auth- und Tabellen-Analysen verlinkt werden.

## Analyse-Notizen

- Sinnvoll fuer Obsidian-Auswertungen nach Tabellen, Rollen und Policy-Verantwortung.
- Kandidat fuer spaetere Unternotizen pro Datenobjekt oder Migrationsfamilie.
