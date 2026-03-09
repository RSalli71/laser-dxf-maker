# Formatierungs-Anleitung: Agenten & Skills fuer Obsidian

> **Zweck:** Diese Anleitung definiert das beste Format fuer Obsidian-gestuetzte Analyse von Agenten und Skills.
> Sie trennt bewusst zwischen **Wissensnotizen fuer Obsidian** und **operativen Dateien fuer echte Tools**.
> Geltungsbereich: Obsidian zuerst, VS Code als Editor, Tool-Dateien nur als referenzierte Quellen.

---

## Inhaltsverzeichnis

1. [Grundprinzip: Zwei Schichten statt Einheitsformat](#1-grundprinzip-zwei-schichten-statt-einheitsformat)
2. [Was ist die Source of Truth?](#2-was-ist-die-source-of-truth)
3. [Das empfohlene Frontmatter fuer Obsidian-Notizen](#3-das-empfohlene-frontmatter-fuer-obsidian-notizen)
4. [Empfohlenes Dateischema fuer Agenten-Notizen](#4-empfohlenes-dateischema-fuer-agenten-notizen)
5. [Empfohlenes Dateischema fuer Skill-Notizen](#5-empfohlenes-dateischema-fuer-skill-notizen)
6. [Wikilinks, Tags und Benennung](#6-wikilinks-tags-und-benennung)
7. [Was bewusst nicht mehr Pflicht ist](#7-was-bewusst-nicht-mehr-pflicht-ist)
8. [Dos and Don'ts](#8-dos-and-donts)
9. [Schnellvorlagen](#9-schnellvorlagen)

---

## 1. Grundprinzip: Zwei Schichten statt Einheitsformat

Fuer spaetere Analysezwecke in Obsidian ist ein einheitliches Schema sinnvoll.
Fuer echte Agenten- und Skill-Dateien ist ein starres Obsidian-Schema dagegen oft falsch, weil Tools eigene Formate erwarten.

Deshalb gilt ab jetzt:

### Schicht A: Operative Dateien

Das sind die echten Laufzeitdateien fuer Tools, zum Beispiel:

- `.claude/agents/*.md`
- `.agents/skills/**/SKILL.md`
- `.github/copilot-instructions.md`
- andere tool-spezifische Agent- oder Skill-Dateien

Diese Dateien folgen **immer zuerst** den Anforderungen des jeweiligen Tools.
Obsidian darf sie lesen, aber **nicht formatieren oder normieren**.

### Schicht B: Obsidian-Wissensnotizen

Das sind Analyse-, Uebersichts- und Referenznotizen in der Wissensbasis.
Sie beschreiben Agenten und Skills in einem fuer Menschen und Obsidian optimalen Format.

Diese Anleitung gilt primaer fuer genau diese Notizen.

### Merksatz

**Nicht jede operative Agent-Datei ist eine gute Obsidian-Notiz.**
**Nicht jede gute Obsidian-Notiz ist eine gueltige operative Agent-Datei.**

---

## 2. Was ist die Source of Truth?

Jede Notiz muss klar machen, wo die fachliche oder technische Wahrheit liegt.

Es gibt drei sinnvolle Varianten:

| Fall | `source_of_truth` | Bedeutung |
|---|---|---|
| Obsidian-Notiz beschreibt eine echte Runtime-Datei | `runtime-file` | Die operative Datei ist verbindlich |
| Obsidian-Notiz ist selbst die verbindliche Dokumentation | `obsidian-note` | Die Notiz ist fuehrend |
| Inhalt ist nur Analyse oder Ableitung | `derived-note` | Die Notiz darf nicht als Laufzeitdefinition gelesen werden |

### Empfehlung

Fuer Agenten- und Skill-Analyse in Obsidian fast immer:

```yaml
source_of_truth: runtime-file
runtime_path: ".claude/agents/frontend-developer.md"
```

oder

```yaml
source_of_truth: runtime-file
runtime_path: ".agents/skills/next-best-practices/SKILL.md"
```

So bleibt jederzeit klar, welche Datei nur Analyse ist und welche wirklich ausgefuehrt wird.

---

## 3. Das empfohlene Frontmatter fuer Obsidian-Notizen

### Ziel

Das Frontmatter soll:

- in Obsidian gut filterbar sein
- wenig Pflegeaufwand erzeugen
- keine doppelten Informationen erzwingen
- auf operative Dateien verweisen koennen

### Minimal empfohlene Felder

```yaml
---
type: agent-note
title: "Frontend Developer"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".claude/agents/frontend-developer.md"
summary: "Analysenotiz zum Frontend-Agenten mit Aufgabe, Inputs, Outputs und Abhaengigkeiten."
tags:
  - knowledge
  - agent
  - domain/frontend
  - tool/claude
related:
  - "[[workflow]]"
  - "[[ARCHITECTURE]]"
---
```

### Feld-Erklaerung

#### `type`

Verwende fuer Obsidian-Analyse **keine** Laufzeittypen wie `agent` oder `skill`, wenn die Datei nicht selbst operativ ist.

Empfohlen:

```yaml
type: agent-note
type: skill-note
type: knowledge-note
```

#### `title`

Der reine Anzeigename.
Kein erzwungenes Praefix wie `Agent:` oder `Skill:` noetig, wenn `type` bereits sauber gesetzt ist.

#### `status`

Empfohlen:

```yaml
status: entwurf
status: aktiv
status: veraltet
status: archiviert
```

#### `updated`

Nur ein Datumsfeld ist genug.
`erstellt` kann sinnvoll sein, ist aber fuer Analyse meist weniger wichtig als der letzte Pflegezeitpunkt.

#### `summary`

Kurze, 1- bis 3-saetzige Zusammenfassung fuer schnelle Vorschauen, Suche und Dataview-Auswertungen.

#### `source_of_truth`

Pflichtfeld fuer Agenten- und Skill-Notizen.
Es verhindert spaetere Verwechslungen zwischen Analyse- und Runtime-Dateien.

#### `runtime_path`

Pfad zur echten operativen Datei, wenn `source_of_truth: runtime-file` gesetzt ist.

#### `tags`

Immer als YAML-Liste.
Nicht als Komma-String.

#### `related`

Verweise auf relevante Obsidian-Notizen.
Wikilinks im YAML immer in Anfuehrungszeichen.

### Felder, die nicht mehr generell Pflicht sind

- `version`
- `erstellt`
- `agent_context`
- `changelog`
- doppelte Typ-Praefixe im Titel

Diese Felder sind nur dann sinnvoll, wenn der konkrete Inhalt davon profitiert.

---

## 4. Empfohlenes Dateischema fuer Agenten-Notizen

Agenten-Notizen in Obsidian sollen analysierbar sein, nicht ein Tool imitieren.

### Ziel eines Agenten-Profils

Die Notiz soll schnell beantworten:

- Wofuer ist der Agent gedacht?
- Welche Inputs erwartet er?
- Welche Outputs produziert er?
- Welche Skills, Quellen und Doku nutzt er?
- Wo liegt die echte operative Datei?

### Empfohlene Struktur

```markdown
---
type: agent-note
title: "Frontend Developer"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".claude/agents/frontend-developer.md"
summary: "Analysenotiz zum Frontend-Agenten mit Fokus auf UI, Pages, Komponenten und Interaktionen."
tags:
  - knowledge
  - agent
  - domain/frontend
  - tool/claude
related:
  - "[[workflow]]"
  - "[[ARCHITECTURE]]"
  - "[[REQUIREMENTS]]"
---

# Frontend Developer

> Analysenotiz fuer den operativen Agenten unter `.claude/agents/frontend-developer.md`.

## Zweck

[Wofuer ist dieser Agent gedacht?]

## Inputs

- [Wichtige Dateien, Doku, Signale]

## Outputs

- [Welche Artefakte oder Zielordner sind typisch?]

## Abhaengigkeiten

- [Welche Skills, Libraries, Prozesse sind wichtig?]

## Beobachtungen

- [Stolpersteine, Besonderheiten, Grenzen]

## Analyse-Notizen

- [Freie Auswertung, Entscheidungen, offene Fragen]
```

### Pflicht-Abschnitte fuer Agenten-Notizen

| Abschnitt | Warum? |
|---|---|
| `## Zweck` | Macht die Rolle sofort sichtbar |
| `## Inputs` | Hilft bei Analyse und Vergleich |
| `## Outputs` | Wichtig fuer Workflow- und Repo-Auswertungen |

### Optionale Abschnitte

| Abschnitt | Wann sinnvoll? |
|---|---|
| `## Abhaengigkeiten` | Bei Skill- oder Tool-Kopplungen |
| `## Beobachtungen` | Wenn du agentenspezifische Risiken dokumentieren willst |
| `## Analyse-Notizen` | Fuer freie Reflexion, offene Fragen, Verbesserungen |

---

## 5. Empfohlenes Dateischema fuer Skill-Notizen

Skill-Notizen sollen den Nutzen eines Skills dokumentieren, ohne jede Skill-Datei in ein grosses Tutorial zu zwingen.

### Wichtige Regel

Ein Skill kann drei Rollen haben:

| Skill-Typ | Zweck | Beispiel |
|---|---|---|
| `pattern` | Regel- oder Best-Practice-Sammlung | React Performance Guidelines |
| `recipe` | Konkretes Vorgehen in Schritten | DXF zu JSON konvertieren |
| `reference` | Nachschlagewissen | Dateiformate, APIs, Limits |

Deshalb ist ein grosses Komplettbeispiel **nicht** fuer jeden Skill Pflicht.

### Empfohlene Struktur

```markdown
---
type: skill-note
title: "next-best-practices"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: ".agents/skills/next-best-practices/SKILL.md"
summary: "Analysenotiz zum Next.js-Best-Practice-Skill mit Fokus auf App Router, RSC-Grenzen und Datenmuster."
skill_kind: pattern
tags:
  - knowledge
  - skill
  - domain/frontend
  - tech/nextjs
related:
  - "[[Frontend Developer]]"
  - "[[ARCHITECTURE]]"
---

# next-best-practices

> Analysenotiz fuer den operativen Skill unter `.agents/skills/next-best-practices/SKILL.md`.

## Zweck

[Was ermoeglicht oder verbessert dieser Skill?]

## Typ

- `pattern` | `recipe` | `reference`

## Kernaussagen

- [Die 3 bis 7 wichtigsten Regeln oder Erkenntnisse]

## Wann verwenden?

- [Typische Einsatzfaelle]

## Grenzen

- [Wann der Skill nicht passt oder nur bedingt taugt]

## Verknuepfte Agenten oder Themen

- [[Frontend Developer]]
- [[workflow]]
```

### Pflicht-Abschnitte fuer Skill-Notizen

| Abschnitt | Warum? |
|---|---|
| `## Zweck` | Kurze Orientierung |
| `## Kernaussagen` | Macht Skills analysierbar |
| `## Wann verwenden?` | Hilft bei Wiederverwendung |

### Was nicht mehr pauschal Pflicht ist

- `## Voraussetzungen`
- `## Schritt-fuer-Schritt`
- `## Vollstaendiges Beispiel`
- `## Haeufige Fehler`

Diese Abschnitte nur dann aufnehmen, wenn sie zum Skill-Typ passen.

---

## 6. Wikilinks, Tags und Benennung

### Wikilinks

Im Fliesstext:

```markdown
Dieser Agent nutzt [[workflow]] und arbeitet mit [[ARCHITECTURE]].
```

Im YAML:

```yaml
related:
  - "[[workflow]]"
  - "[[ARCHITECTURE]]"
```

### Faustregel fuer Links

Setze Links dann, wenn sie Analysebeziehungen zeigen.
Setze nicht mechanisch alles untereinander in Beziehung.

**Qualitaet vor Menge.**

### Tag-Struktur

Empfohlen:

```yaml
tags:
  - knowledge
  - agent
  - skill
  - domain/frontend
  - domain/backend
  - domain/database
  - tech/nextjs
  - tech/python
  - tool/claude
  - tool/obsidian
```

### Benennung

Fuer Dateinamen weiter kebab-case:

```text
frontend-developer.md
next-best-practices.md
dxf-parser-analyse.md
```

Keine Leerzeichen im Dateinamen.

---

## 7. Was bewusst nicht mehr Pflicht ist

Diese Anleitung setzt absichtlich auf weniger Zwang und weniger doppelte Pflege.

### Nicht mehr pauschal Pflicht

- `version` in jeder Notiz
- eigener `changelog` in jeder Notiz
- `erstellt` und `geaendert` gleichzeitig
- `agent_context` in jeder Wissensnotiz
- feste Abschnittslisten fuer jeden Skill-Typ
- Praefixe wie `Agent:` oder `Skill:` im Titel

### Warum?

- doppelte Pflege fuehrt zu Drift
- Git und `docs/DEVLOG.md` dokumentieren Aenderungen bereits zentral
- Analyse-Notizen sollen leichtgewichtig bleiben
- Obsidian profitiert mehr von konsistenten Kernfeldern als von maximalem Overhead

---

## 8. Dos and Don'ts

### Dos

```markdown
Do: Obsidian-Notizen und operative Dateien klar trennen
Do: source_of_truth und runtime_path setzen, wenn eine Runtime-Datei existiert
Do: title kurz und sauber halten
Do: nur wenige, stabile Metadaten pflegen
Do: Tags hierarchisch und als YAML-Liste schreiben
Do: Wikilinks gezielt fuer echte Analysebeziehungen setzen
Do: pro Notiz genau einen klaren Zweck haben
Do: Dateinamen in kebab-case halten
```

### Don'ts

```markdown
Don't: operative Agent-Dateien nur fuer Obsidian umformatieren
Don't: jedes Feld doppelt in Frontmatter, Titel und Text pflegen
Don't: Changelog in jede kleine Wissensnotiz zwingen
Don't: jeden Skill als Tutorial behandeln
Don't: Praefixe im Titel erzwingen, wenn type schon sauber gesetzt ist
Don't: Obsidian-Schema als universelles Tool-Schema verkaufen
```

---

## 9. Schnellvorlagen

Fuer den direkten Einsatz liegen die Vorlagen auch als eigene Dateien unter `docs/knowledge/templates/`:

- `docs/knowledge/templates/agent-note-template.md`
- `docs/knowledge/templates/skill-note-template.md`

### Vorlage: Agenten-Notiz

```markdown
---
type: agent-note
title: "[Name]"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: "[Pfad-zur-operativen-Datei]"
summary: "[1 bis 3 Saetze Zusammenfassung]"
tags:
  - knowledge
  - agent
related:
  - "[[workflow]]"
---

# [Name]

## Zweck

## Inputs

## Outputs

## Analyse-Notizen
```

### Vorlage: Skill-Notiz

```markdown
---
type: skill-note
title: "[Name]"
status: aktiv
updated: 2026-03-09
source_of_truth: runtime-file
runtime_path: "[Pfad-zur-operativen-Datei]"
summary: "[1 bis 3 Saetze Zusammenfassung]"
skill_kind: pattern
tags:
  - knowledge
  - skill
related:
  - "[[workflow]]"
---

# [Name]

## Zweck

## Kernaussagen

## Wann verwenden?

## Analyse-Notizen
```

### Schnell-Checkliste

```text
□ Ist die Datei eine Obsidian-Notiz oder eine operative Runtime-Datei?
□ Ist source_of_truth klar?
□ Gibt es bei Runtime-Bezug einen runtime_path?
□ Sind nur die wirklich nuetzlichen Metadaten vorhanden?
□ Sind title und type nicht redundant gepflegt?
□ Sind related-Links sinnvoll statt nur vollstaendig?
□ Ist die Notiz fuer Analyse kurz genug und fuer Suche aussagekraeftig?
```

---

*Leitfaden Version 2.0.0 — 2026-03-09*
