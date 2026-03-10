# Development Log (DEVLOG)

> Zweck: Pro Session/Tag kurz dokumentieren, was gemacht wurde, warum, wie geprüft wurde, und was als nächstes kommt.  
> Regel: Bei relevanten Änderungen **mindestens einen Eintrag** ergänzen.

---

## Guidelines

- **Kurz halten:** 5–15 Zeilen pro Eintrag reichen fast immer.
- **Nachvollziehbar:** Ziel → Änderungen → Ergebnis → Next Steps.
- **Verify ist Pflicht:** mindestens 1–3 konkrete Commands/Schritte.
- **Verlinken:** Issue/PR/Decision/Commit, wenn vorhanden.

---

## Template (copy/paste)

## YYYY-MM-DD — Session/Topic

- **Goal/Problem:**
  - …
- **Changes:**
  - …
- **Result:**
  - …
- **Next Steps:**
  - …
- **Refs:** (Issue/PR/Links, optional)
- **Files touched:** (optional)
- **Verify (commands/steps):**
  - `...`

---

## Examples

## 2025-12-22 — Standardize template workflow for Vibe Coding

- **Goal/Problem:**
  - Einheitliche Struktur für Multi-Stack Projekte + Agent/Copilot Regeln.
- **Changes:**
  - Template-Struktur vereinheitlicht (`docs/`, `src/`, `vibe/`, `.agent/`, `scripts/`).
  - Guidelines für `vibe/ → src/` ergänzt.
- **Result:**
  - Onboarding schneller, Regeln klar, weniger Chaos bei Agent-Arbeit.
- **Next Steps:**
  - CI/ship-safe weiter harmonisieren (Single Source of Truth).
- **Verify (steps):**
  - README gelesen + Struktur geprüft (keine produktiven Imports aus `vibe/`)

## 2026-03-08 — Normalize skill paths for Copilot and Claude

- **Goal/Problem:**
  - Mehrere Skill-Verzeichnisse lagen als physische Duplikate vor (`.claude/skills`, `skills`, `.vibe/skills`) und mussten parallel gepflegt werden.
- **Changes:**
  - `.agents/skills` als kanonische Quelle beibehalten.
  - `.claude/skills`, `skills` und `.vibe/skills` von echten Ordnern auf Windows-Junctions nach `.agents/skills` umgestellt.
  - Vor der Umstellung die Inhalte der Skill-Pfade verglichen und die Identität verifiziert.
- **Result:**
  - Nur noch ein Skill-Bestand zur Pflege.
  - Claude-, Copilot- und Vibe-kompatible Pfade bleiben erhalten, ohne Inhaltsduplikate im Repo.
- **Next Steps:**
  - Falls weitere Tooling-Pfade hinzukommen, ebenfalls nur als Referenz auf `.agents/skills` anbinden.
- **Files touched:**
  - `.claude/skills`
  - `skills`
  - `.vibe/skills`
  - `docs/DEVLOG.md`
  - `docs/DECISIONS.md`
- **Verify (commands/steps):**
  - `Get-Item .claude\skills, skills, .vibe\skills | Select-Object FullName, LinkType, Target, Attributes | Format-List`
  - Stichproben und Hash-Vergleich der Skill-Inhalte vor der Umstellung geprüft

## 2026-03-08 — Update workflow documentation for new top-level folders

- **Goal/Problem:**
  - `docs/workflow.md` war zu knapp und bildete die neuen Top-Level-Ordner `data/`, `tools/` und `tests/` nicht ab.
- **Changes:**
  - Workflow-Reihenfolge um die Nutzung von `data/`, `tools/` und `tests/` erweitert.
  - Ordnerregeln fuer `src/`, `vibe/`, `data/`, `tools/` und `tests/` ergaenzt.
  - Vor-Merge-Hinweise auf `scripts/ship-safe.sh` sowie Team-Workflows unter `docs/team-doku/` aufgenommen.
- **Result:**
  - `docs/workflow.md` passt jetzt zur aktuellen Repo-Struktur und zu den dokumentierten Team-Ablaeufen.
- **Next Steps:**
  - Optional `docs/team-doku/Repo-Template-Beschreibung.md` weiter auf verbleibende alte Strukturannahmen pruefen.
- **Verify (steps):**
  - `docs/workflow.md` gegen `AGENTS.md`, `CONTRIBUTING.md` und die aktuelle Ordnerstruktur gegengelesen

## 2026-03-08 — Clarify developer roles in workflow

- **Goal/Problem:**
  - `docs/workflow.md` nannte Requirements, Architektur, QA und Review, aber die eigentliche Developer-Phase war nicht explizit aufgefuehrt.
- **Changes:**
  - Developer-Phase als eigenen Schritt in die Reihenfolge aufgenommen.
  - Rollen `frontend-developer`, `backend-developer` und `database-engineer` mit ihrem jeweiligen Einsatzbereich ergaenzt.
  - QA- und Review-Schritte voneinander getrennt und sprachlich bereinigt.
- **Result:**
  - Der Workflow zeigt jetzt klar, wann implementiert wird und welche Developer-Rolle je nach Aufgabe gemeint ist.
- **Next Steps:**
  - Optional die gleiche Klarstellung auch in team-internen Workflow-Dokumenten nachziehen.
- **Verify (steps):**
  - `docs/workflow.md` gegen die vorhandenen Agent-Dateien unter `.claude/agents/` abgeglichen

## 2026-03-08 — Align agent roles with workflow and directory ownership

- **Goal/Problem:**
  - Die einzelnen Agent-Dateien hatten uneinheitliche Pfade, teils veraltete Referenzen und keine klaren Lese-/Schreibverzeichnisse.
- **Changes:**
  - `requirements-engineer`, `solution-architect`, `frontend-developer`, `backend-developer`, `database-engineer`, `qa-engineer`, `code-reviewer` und `gatekeeper` um Workflow-Referenz, Leseverzeichnisse und Schreibziele ergänzt.
  - Requirements-Pfad auf `docs/requirements/REQUIREMENTS.md` vereinheitlicht.
  - QA-/Review-Pfade auf `tests/` und `docs/reports/TEST_REPORT.md` angepasst.
  - `docs/workflow.md` um direkte Verweise auf die zuständigen Agent-Dateien und deren Outputs erweitert.
  - Verbliebene Next.js-15-Hinweise in den aktiven `.claude/agents/` auf den aktuellen Next.js-16-Stack bereinigt.
- **Result:**
  - Die Agenten wissen jetzt explizit, wo sie Informationen holen sollen und in welche Verzeichnisse sie schreiben dürfen.
  - Der Workflow verweist direkt auf die passenden Agent-Dateien.
- **Next Steps:**
  - Optional die team-internen Detaildokumente unter `docs/team-doku/` auf dieselben Pfadkonventionen angleichen.
- **Verify (steps):**
  - Agent-Dateien unter `.claude/agents/` auf alte Pfade und Workflow-Bezug gegengeprueft
  - `docs/workflow.md` gegen die Agent-Dateien abgeglichen

## 2026-03-09 — Align team documentation with workflow and canonical paths

- **Goal/Problem:**
  - Die Team-Doku unter `docs/team-doku/` beschrieb noch einen veralteten Agent- und Skill-Stand und wich vom aktuellen `docs/workflow.md` ab.
- **Changes:**
  - `docs/team-doku/Repo-Template-Beschreibung.md` auf den aktuellen Workflow mit `docs/requirements/REQUIREMENTS.md`, `docs/reports/TEST_REPORT.md` und `docs/workflow.md` angepasst.
  - Agentenliste von 7 auf 8 Rollen erweitert und den `backend-developer` ergänzt.
  - Stack-, Script- und Skill-Beschreibungen auf Next.js 16, aktuelle `package.json`-Scripts und `.agents/skills/` als kanonische Skill-Quelle umgestellt.
- **Result:**
  - Die Team-Doku beschreibt jetzt denselben Delivery-Workflow und dieselben Pfadkonventionen wie die aktiven Agent-Dateien.
- **Next Steps:**
  - Optional die einzelnen Team-Checklisten in `docs/team-doku/` ebenfalls noch auf Vollständigkeit gegen `docs/workflow.md` prüfen.
- **Verify (steps):**
  - `docs/team-doku/Repo-Template-Beschreibung.md` gegen `package.json`, `.claude/agents/` und `docs/workflow.md` abgeglichen

## 2026-03-09 — Align team checklists with workflow and directory rules

- **Goal/Problem:**
  - Die Team-Checklisten `debug-bug.md` und `ship-safe.md` waren noch zu generisch und spiegelten die aktuellen Pfade, Outputs und Ordnerregeln nicht wider.
- **Changes:**
  - `docs/team-doku/debug-bug.md` auf `src/`, `tests/`, `tools/` und `docs/workflow.md` bezogen und um Re-Check-Schritt vor Handoff ergänzt.
  - `docs/team-doku/ship-safe.md` um kanonische Output-Dateien, Ordnerregeln und Workflow-Handoffs erweitert.
- **Result:**
  - Die Team-Checklisten passen jetzt zum aktuellen Delivery-Workflow und zu den Verzeichnis-Konventionen des Repos.
- **Next Steps:**
  - Optional die operativen Agent-Dateien und Team-Doku regelmäßig gemeinsam prüfen, wenn der Workflow erneut erweitert wird.
- **Verify (steps):**
  - `docs/team-doku/debug-bug.md` und `docs/team-doku/ship-safe.md` gegen `docs/workflow.md` und `AGENTS.md` abgeglichen

## 2026-03-09 — Reframe Obsidian formatting guide for analysis-first knowledge notes

- **Goal/Problem:**
  - Die Formatierungsanleitung fuer Agenten und Skills behandelte Obsidian-, VS-Code- und Runtime-Dateien wie ein gemeinsames Format und erzeugte damit zu viel Pflegeaufwand und zu wenig Trennung zwischen Analyse und Ausfuehrung.
- **Changes:**
  - `docs/knowledge/formatierungs-anleitung_Agenten-Skills.md` auf ein Zwei-Schichten-Modell umgestellt: Obsidian-Wissensnotizen einerseits, operative Tool-Dateien andererseits.
  - Das Frontmatter auf wenige, analysefreundliche Kernfelder reduziert und `source_of_truth` plus `runtime_path` als zentrale Trennlinie eingefuehrt.
  - Starre Pflichtvorgaben wie globaler Changelog, Version und Komplettbeispiel fuer jeden Skill entfernt und durch flexiblere Vorlagen fuer Agenten- und Skill-Notizen ersetzt.

## 2026-03-09 — Fix SEQEND parsing desync in ENTITIES scan

- **Goal/Problem:**
  - Die Kundendatei lieferte nur ~280 sichtbare Entitaeten und numerische Fake-Entity-Typen wie `6`, `100` und `42`, obwohl deutlich mehr echte Geometrie vorhanden ist.
- **Changes:**
  - `src/lib/dxf/parser.ts` in `parseEntitiesSection` auf paarweise Resynchronisierung (`i += 2`) umgestellt.
  - `VERTEX`/`SEQEND` in `parseEntitiesSection` und `parseOneBlock` nicht mehr nur um zwei Zeilen, sondern mit `skipPastEntity(...)` ueber alle Property-Paare uebersprungen.
  - Kundentest gegen die reale DXF-Datei geschaerft: keine numerischen Fake-Typen, deutlich hoeherer Entity-Floor, ARC- und SPLINE-Mindestwerte.
- **Result:**
  - Der Parser verliert nach `SEQEND` mit Attribut-Folgeflag die Paar-Ausrichtung nicht mehr und der bisherige Teilparse wird als Regression abgesichert.
- **Next Steps:**
  - Validieren, dass Test, Typecheck und Lint im aktuellen Repo-Zustand gruen laufen.
- **Files touched:**
  - `src/lib/dxf/parser.ts`
  - `tests/parser.test.ts`
  - `docs/DEVLOG.md`
- **Verify (commands/steps):**
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`

## 2026-03-09 — Reduce workflow to selected part geometry after F3

- **Goal/Problem:**
  - Nach der Teileauswahl blieb der komplette Zeichnungsbestand im globalen Workflow erhalten. Dadurch zeigte F4 weiterhin Rahmen und Schriftfeld, und F5 klassifizierte die groesste Kontur global statt pro Teil.
- **Changes:**
  - Teil-Workflow-Helper eingefuehrt, die Entity-Zuordnung exklusiv pro Teil halten, nicht zugeordnete Entities vor F4 verwerfen, pro Teil bereinigen und pro Teil klassifizieren.
  - `AppShell.tsx` so angepasst, dass der Uebergang F3 -> F4 nur noch zugeordnete Teil-Entities weiterreicht und F5 die Klassifizierung pro Teil statt global ausfuehrt.
  - Regressionstests fuer exklusive Teil-Zuordnung, Verwerfen unzugeordneter Entities und Klassifizierung pro Teil ergaenzt.
- **Result:**
  - Der Rahmen bleibt nach F3 nicht mehr im Arbeitsdatensatz, und jede Teilmenge bekommt in F5 ihre eigene Aussenkontur statt durch die Gesamtzeichnung verfaelscht zu werden.
- **Next Steps:**
  - Separat die F3-UX fuer zusammenhaengende Kontur-/Schriftselektion nachschaerfen, damit Texte wie `B10` bei Box-Selektion vollstaendig erfasst werden.
- **Files touched:**
  - `src/lib/workflow/part-workflow.ts`
  - `src/components/shared/AppShell.tsx`
  - `tests/part-workflow.test.ts`
  - `docs/DEVLOG.md`
- **Verify (commands/steps):**
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
- **Result:**
  - Die Anleitung ist jetzt deutlich besser fuer Obsidian-Analyse geeignet, ohne operative Agenten- oder Skill-Dateien in ein unpassendes Einheitsschema zu zwingen.
- **Next Steps:**
  - Optional echte Obsidian-Notizvorlagen fuer Agenten und Skills als separate Template-Dateien anlegen.
- **Verify (steps):**
  - Neue Anleitung gegen den vorgesehenen Obsidian-Analysezweck und die Trennung zu `.claude/agents/` sowie `.agents/skills/` gegengeprueft

## 2026-03-09 — Add ready-to-use Obsidian templates for agent and skill notes

- **Goal/Problem:**
  - Die neue Analyse-Anleitung beschrieb das Zielschema, bot aber noch keine direkt nutzbaren Template-Dateien fuer Obsidian.
- **Changes:**
  - `docs/knowledge/templates/agent-note-template.md` als ausfuellbare Vorlage fuer Agenten-Notizen angelegt.
  - `docs/knowledge/templates/skill-note-template.md` als ausfuellbare Vorlage fuer Skill-Notizen angelegt.
  - Die Anleitung unter `docs/knowledge/formatierungs-anleitung_Agenten-Skills.md` um direkte Verweise auf diese Template-Dateien erweitert.
- **Result:**
  - Fuer Obsidian stehen jetzt sofort verwendbare Vorlagen bereit, die das neue Zwei-Schichten-Modell direkt umsetzen.

## 2026-03-09 — Improve part selection in F3 and focus F4/F5 on the active part

- **Goal/Problem:**
  - Die Teilauswahl in F3 war zu strikt bei Box-Selektion und zu punktuell bei Einzelklicks. Dadurch wurden zusammengehoerige Konturen, Innengeometrie oder Beschriftung wie `B10` nicht zuverlaessig gemeinsam erfasst.
  - In F4/F5 war funktional zwar schon nur noch Teilgeometrie relevant, die Arbeitsansicht machte das aber noch nicht klar genug.
- **Changes:**
  - Neue Selektions-Helper fuer Bounding-Box-Schnittmengen und Cluster-Erweiterung eingefuehrt, damit Box-Selektion auf schneidende statt nur vollstaendig enthaltene Entities reagiert und Klick-Selektion verbundene Teilgeometrie mitnimmt.
  - `DxfEditor.tsx` so angepasst, dass die Cluster-Erweiterung nur im Select-Modus greift; im Classify-Modus bleibt die manuelle Praezision erhalten.
  - `AppShell.tsx` fuer F4/F5 auf aktive Teil-Arbeitsansichten mit Teil-Liste und klarer Zusammenfassung umgestellt.
  - Regressions-Tests fuer die neue Selektionslogik ergaenzt.
- **Result:**
  - F3 waehlt Teilgeometrie robuster aus, und F4/F5 zeigen nun sichtbar nur noch die aktive Teilmenge statt implizit den Gesamtdatensatz.
- **Next Steps:**
  - Im UI mit der realen Kundendatei pruefen, ob die Auswahlheuristik fuer Grenzfaelle wie eng benachbarte Konturen oder weit abgesetzte Beschriftungen noch weiter nachgeschaerft werden muss.
- **Files touched:**
  - `src/lib/editor/entity-selection.ts`
  - `src/components/editor/DxfEditor.tsx`
  - `src/components/shared/AppShell.tsx`
  - `src/components/shared/PartsList.tsx`
  - `tests/entity-selection.test.ts`
  - `docs/DEVLOG.md`
- **Verify (commands/steps):**
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`

## 2026-03-10 — Document F3 selection strategy and manual-selection alternative

- **Goal/Problem:**
  - Die Diskussion zur F3-Teileauswahl musste als belastbares Konzept dokumentiert werden, inklusive langfristiger Zielarchitektur und einer einfacheren Alternative fuer den aktuellen UX-Bedarf.
- **Changes:**
  - Neue Konzeptdatei fuer die F3-Selektionsstrategie unter `docs/concepts/` angelegt.
  - Langfristige kontur- und komponentenbasierte Zielarchitektur beschrieben.
  - Separate Alternative fuer einen bewusst rein manuellen F3-Auswahlmodus ohne automatische Systemzuordnung dokumentiert.
- **Result:**
  - Die strategische Entscheidung fuer F3 ist jetzt als referenzierbares Konzept dokumentiert und kann vor einer Implementierung gemeinsam bewertet werden.
- **Next Steps:**
  - Entscheiden, ob der naechste Umbau zuerst den einfachen manuellen F3-Modus oder direkt die langfristige Zielarchitektur verfolgen soll.
- **Files touched:**

## 2026-03-10 — Stabilize F3 highlighting and click-based deselection

- **Goal/Problem:**
  - Die neue F3-Selektion war im Editor nur lokal sichtbar. Dadurch war die Farbhervorhebung nach Part-Wechseln nicht belastbar an die echte Teilzuordnung gekoppelt, und Abwahl per Klick lief nicht ueber denselben Workflow-Pfad wie Zuweisungen.
- **Changes:**
  - F3-Auswahl in `AppShell.tsx` auf kontrollierte Editor-Selektion umgestellt und die aktive Teilmenge direkt als Highlight-Quelle an `DxfEditor.tsx` angebunden.
  - Gemeinsamen Workflow-Helper `removeEntityFromPart(...)` eingefuehrt, damit Abwahl und Zuweisung denselben Ownership-Pfad nutzen.
  - F3-Highlight visuell verstaerkt und im Sidebar-Text explizit erklaert, dass orange markierte Geometrie per Klick wieder entfernt werden kann.
  - Regressionstest fuer das Entfernen einer Entity aus dem aktiven Teil ergaenzt.
- **Result:**
  - Die F3-Markierung folgt jetzt stabil dem echten Part-State, bleibt nach Part-Wechseln nachvollziehbar sichtbar und laesst sich pro Entity wieder abbauen, ohne versteckten Editor-State.
- **Next Steps:**
  - Im Browser mit realer DXF pruefen, ob die orange Hervorhebung bei sehr dichter Geometrie kontrastreich genug bleibt oder zusaetzlich eine Flaechen- oder Halo-Darstellung noetig ist.
- **Files touched:**
  - `src/components/shared/AppShell.tsx`
  - `src/components/editor/DxfEditor.tsx`
  - `src/components/editor/EntityPath.tsx`
  - `src/lib/workflow/part-workflow.ts`
  - `tests/part-workflow.test.ts`
  - `docs/DEVLOG.md`
- **Verify (commands/steps):**
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
  - `docs/concepts/F3_SELECTION_STRATEGY.md`
  - `docs/DEVLOG.md`
- **Verify (steps):**
  - Konzepttext gegen die aktuellen F3-Probleme und die besprochenen Zielbilder gegengelesen

## 2026-03-10 — Specify concrete target behavior for manual F3 selection

- **Goal/Problem:**
  - Die konzeptionelle F3-Alternative musste in ein konkretes Soll-Verhalten fuer Klicks, Fensterauswahl und ausdruecklich verbotene Systemautomatik uebersetzt werden.
- **Changes:**
  - `docs/concepts/F3_SELECTION_STRATEGY.md` um ein direkt umsetzbares F3-Zielbild erweitert.
  - Klick-, Fenster-, Mehrfachauswahl- und Nicht-Erlaubt-Regeln fuer F3 explizit beschrieben.
  - F3 klar von F4 und F5 abgegrenzt, damit die manuelle Auswahl fachlich sauber im Workflow verankert ist.
- **Result:**
  - Fuer den naechsten Umbau gibt es jetzt ein belastbares Soll-Verhalten statt nur einer allgemeinen Richtungsentscheidung.
- **Next Steps:**
  - Das Soll-Verhalten in eine konkrete Implementierungsaufgabe fuer `DxfEditor.tsx` und die F3-Workflow-Logik uebersetzen.
- **Files touched:**
  - `docs/concepts/F3_SELECTION_STRATEGY.md`
  - `docs/DEVLOG.md`
- **Verify (steps):**
  - Neue Regeln gegen den aktuellen F3-Fehlerfall mit Rahmen-Eskalation gegengelesen

## 2026-03-10 — Add technical implementation description for manual F3 selection

- **Goal/Problem:**
  - Das konzeptionelle Soll-Verhalten fuer F3 musste in eine konkrete technische Umsetzungsbeschreibung fuer den aktuellen Codebestand uebersetzt werden.
- **Changes:**
  - `docs/concepts/F3_SELECTION_STRATEGY.md` um betroffene Dateien, Verantwortlichkeiten, notwendige Logik-Aenderungen und Testanforderungen erweitert.
  - Klar beschrieben, dass die automatische Auswahl-Expansion aus dem Standard-F3-Pfad entfernt und auf eine rein manuelle Selektion umgestellt werden soll.
- **Result:**
  - Es gibt jetzt eine direkt verwendbare technische Vorlage fuer den naechsten Umbau in `DxfEditor.tsx`, `entity-selection.ts` und den zugehoerigen Tests.
- **Next Steps:**
  - Die Umsetzungsbeschreibung in einen konkreten Code-Task ueberfuehren und gegen den aktuellen Select-Modus implementieren.
- **Files touched:**
  - `docs/concepts/F3_SELECTION_STRATEGY.md`
  - `docs/DEVLOG.md`
- **Verify (steps):**
  - Umsetzungsbeschreibung gegen den aktuellen Editor- und F3-Workflow gegengelesen
- **Next Steps:**
  - Optional die Templates spaeter noch um projekt- oder domain-spezifische Varianten erweitern.
- **Verify (steps):**
  - Template-Dateien gegen das empfohlene Frontmatter und die neue Obsidian-Analyse-Struktur abgeglichen

## 2026-03-09 — Add Obsidian knowledge notes for all runtime agents and skills

- **Goal/Problem:**
  - Die Runtime-Dateien unter `.claude/agents/` und `.agents/skills/` waren zwar lesbar, aber fuer Obsidian noch nicht als sauber verlinkbare und filterbare Wissensbasis aufbereitet.
- **Changes:**
  - `docs/knowledge/agents/` und `docs/knowledge/skills/` als separate Wissensschicht angelegt.
  - Fuer alle 8 operativen Agenten und alle 5 kanonischen Skills je eine Obsidian-Notiz mit `source_of_truth: runtime-file` und `runtime_path` erstellt.
  - Je einen kleinen `_index.md` fuer Agenten und Skills als Einstiegspunkt in Obsidian hinzugefuegt.
- **Result:**
  - Agenten und Skills sind jetzt in Obsidian als echte Wissensnotizen navigierbar, ohne die operativen Tool-Dateien umzubauen.
- **Next Steps:**
  - Optional spaeter Dataview-Abfragen oder echte Analyse-Notizen pro Regelcluster ergaenzen.
- **Verify (steps):**
  - Notizabdeckung gegen die Runtime-Dateien unter `.claude/agents/` und `.agents/skills/` gegengeprueft

## 2026-03-09 — Align AGENTS.md with canonical docs paths and workflow

- **Goal/Problem:**
  - `AGENTS.md` enthielt bisher nur allgemeine Regeln, aber keine klare Orientierung zu den kanonischen `docs/`-Pfaden, den operativen Rollen-Dateien und dem zentralen Workflow.
- **Changes:**
  - `AGENTS.md` um einen Orientierungsblock mit `docs/workflow.md`, `docs/requirements/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/reports/TEST_REPORT.md`, `docs/DEVLOG.md` und `docs/DECISIONS.md` erweitert.
  - Verweise auf alle operativen Agent-Dateien unter `.claude/agents/` und auf `.agents/skills/` als kanonische Skill-Quelle ergaenzt.
  - Handoffs zwischen Brief, Requirements, Architektur, Implementierung, QA und Gate explizit aufgenommen.
- **Result:**
  - `AGENTS.md` dient jetzt nicht nur als Regelblatt, sondern auch als kompakte Navigations- und Referenzdatei fuer den aktuellen Repo-Workflow.
- **Next Steps:**
  - Optional spaeter noch direkte Querverweise auf team-interne Checklisten oder Wissensindizes feiner ausbauen.
- **Verify (steps):**
  - `AGENTS.md` gegen `docs/workflow.md` und die Agent-Dateien unter `.claude/agents/` abgeglichen

## 2026-03-09 — Align PROJECT_BRIEF.md with workflow and canonical outputs

- **Goal/Problem:**
  - `PROJECT_BRIEF.md` war als Einstieg noch zu knapp und nannte weder die kanonischen Folge-Dateien unter `docs/` noch den aktuellen Stack-Stand vollstaendig.
- **Changes:**
  - `PROJECT_BRIEF.md` um einen kurzen Orientierungsblock mit `docs/workflow.md`, `docs/requirements/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/reports/TEST_REPORT.md`, `docs/DEVLOG.md` und `docs/DECISIONS.md` erweitert.
  - Verweise auf alle Folge-Rollen unter `.claude/agents/` aufgenommen.
  - Stack-Hinweis von Next.js 15 auf Next.js 16 aktualisiert und eine klare Uebergabe-Regel nach dem Ausfuellen ergaenzt.
- **Result:**
  - Der Projektbrief ist jetzt konsistent mit `AGENTS.md` und `docs/workflow.md` und fuehrt sauber in die naechsten Artefakte und Rollen.
- **Next Steps:**
  - Optional spaeter noch ein ausgefuelltes Beispiel-Briefing fuer typische Projektarten ergaenzen.
- **Verify (steps):**
  - `PROJECT_BRIEF.md` gegen `AGENTS.md` und `docs/workflow.md` abgeglichen

## 2026-03-09 — Align README.md with workflow, roles and canonical docs paths

- **Goal/Problem:**
  - `README.md` enthielt noch alte Hinweise zu Next.js 15, zur Agentenzahl und zum Briefing-Ablauf und spiegelte die heutigen `docs/`-Pfade nicht vollstaendig wider.
- **Changes:**
  - Stack-Hinweise in `README.md` auf Next.js 16 aktualisiert.
  - Briefing- und Workflow-Einstieg auf `docs/workflow.md` und `.claude/agents/requirements-engineer.md` umgestellt.
  - Agentenliste von 7 auf 8 Rollen erweitert und den `backend-developer` ergaenzt.
  - Projektstruktur und Dokumentationsabschnitte um `docs/workflow.md`, `docs/requirements/REQUIREMENTS.md`, `docs/reports/TEST_REPORT.md`, `docs/knowledge/`, `tests/`, `tools/` und `data/` ergaenzt.

## 2026-03-09 — Fix nested DXF INSERT resolution

- **Goal/Problem:**
  - Kundendateien mit Blockketten zeigten im Editor nur den Zeichnungsrahmen, weil der Parser verschachtelte INSERT-Referenzen innerhalb von Bloecken verworfen hat.
- **Changes:**
  - Rekursive INSERT-Aufloesung in `src/lib/dxf/parser.ts` implementiert.
  - Zyklus- und Tiefenschutz fuer rekursive Blockreferenzen ergänzt, damit sich fehlerhafte DXFs nicht endlos aufloesen.
  - Parser-Tests in `tests/parser.test.ts` um Nested-INSERT- und Cycle-Guard-Faelle erweitert.
- **Result:**
  - Mehrstufig referenzierte Blockgeometrie wird jetzt in flache Editor-Entities aufgeloest statt mit Warnspam zu verschwinden.
  - Die zuvor analysierte Kundendatei kann damit ihre in `Schriftkopf -> Block1` eingebettete Geometrie erreichen.
- **Next Steps:**
  - Optional spaeter Block-Herkunft mitfuehren, falls Zeichnungsrahmen oder Schriftkopf-Inhalte gezielt ausgefiltert werden sollen.
- **Files touched:**
  - `src/lib/dxf/parser.ts`
  - `tests/parser.test.ts`
  - `docs/DEVLOG.md`
- **Verify (commands/steps):**
  - `npm run test -- parser`
  - `npm run typecheck`
  - `npm run lint`
- **Result:**
  - README, Projektbrief, AGENTS und Workflow verweisen jetzt auf denselben Ablauf, dieselben Rollen und dieselben kanonischen Dateiorte.
- **Next Steps:**
  - Optional spaeter den README-Einstieg noch mit einem kleinen Diagramm oder Ablaufbeispiel fuer neue Projekte erweitern.
- **Verify (steps):**
  - `README.md` gegen `PROJECT_BRIEF.md`, `AGENTS.md` und `docs/workflow.md` abgeglichen

## 2026-03-09 — Align Templatestructur.md with current workflow and canonical paths

- **Goal/Problem:**
  - `docs/Templatestructur.md` enthielt noch Restverweise auf den alten Briefing-Ablauf, die alte Next.js-Formulierung und eine unvollstaendige Agentenliste ohne `backend-developer`.
- **Changes:**
  - Strukturbaum um `backend-developer`, `docs/knowledge/`, `docs/reports/TEST_REPORT.md` und `docs/requirements/REQUIREMENTS.md` als kanonische Artefakte geschaerft.
  - Agentenabschnitt von 7 auf 8 Rollen erweitert und den Workflow-Verweis auf `docs/workflow.md` plus `.claude/agents/requirements-engineer.md` aktualisiert.
  - Skill-Beschreibung fuer `next-best-practices` und die Beschreibung von `AGENTS.md` an den aktuellen Repo-Kanon angepasst.
- **Result:**
  - Struktur-Doku, README, Projekt-Brief, AGENTS und Workflow beschreiben jetzt dieselben Rollen, Pfade und Uebergaben.
- **Next Steps:**
  - Optional spaeter die tieferen Unterordner unter `docs/knowledge/` oder `docs/reports/` noch mit Beispielartefakten illustrieren.
- **Verify (steps):**
  - `docs/Templatestructur.md` gegen `README.md`, `PROJECT_BRIEF.md` und `docs/workflow.md` abgeglichen

## 2026-03-09 — Finalize team doc alignment and add README workflow overview

- **Goal/Problem:**
  - In der Team-Doku standen noch alte Einstiegshinweise ueber `@requirements-engineer`, und im README fehlte noch eine direkte visuelle Uebersicht ueber den Delivery-Ablauf.
- **Changes:**
  - `docs/team-doku/Repo-Template-Beschreibung.md` beim Einstieg, im AGENTS-Abschnitt und in der Doku-Tabelle an den aktuellen Kanon angepasst.
  - `README.md` um eine kompakte Mermaid-Uebersicht fuer Brief → Requirements → Architektur → Implementierung → QA → Review → Gate erweitert.
- **Result:**
  - Team-Doku und README fuehren jetzt beide konsistent in denselben Workflow und bieten neben Text auch eine schnelle visuelle Einstiegshilfe.
- **Next Steps:**
  - Optional spaeter weitere Diagramme fuer Rollen, Artefakte oder Handoffs ergaenzen.
- **Verify (steps):**
  - `docs/team-doku/Repo-Template-Beschreibung.md` und `README.md` gegen `docs/workflow.md` und `AGENTS.md` abgeglichen
