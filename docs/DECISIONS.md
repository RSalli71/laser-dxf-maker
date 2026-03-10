# Decisions Log (DECISIONS)
> Purpose: Document key decisions and their rationale for future reference.  
> Zweck (Deutsch): Entscheidungen dokumentieren, bei denen später die Frage aufkommt: „Warum haben wir das so gemacht?“

---

## When to write an entry
Create an entry when the decision has **long-term impact**, e.g.:
- Architecture / structure / boundaries
- Libraries / frameworks / tooling
- DB / auth / security / data model
- CI / deployment / workflows
- Significant UX/product decisions that affect many files

---

## Status values (required)
- **Accepted** — current decision, applies
- **Rejected** — considered and intentionally not chosen
- **Deprecated** — still exists, but should not be used for new work
- **Superseded** — replaced by a newer decision (link to the new one)

---

## Template (copy/paste)

### YYYY-MM-DD — Title
- **Status:** Accepted | Rejected | Deprecated | Superseded
- **Owner:** @name (optional)
- **Context:**  
- **Decision:**  
- **Alternatives:**  
  - A) …  
  - B) …  
- **Consequences:**  
  - **Positive:** …  
  - **Negative:** …  
- **Related:** Issue/PR/DEVLOG/Links (optional)

---

## Examples

### 2025-12-22 — Universal Project Template Structure
- **Status:** Accepted
- **Context:**
  - Multi-Stack Projekte brauchen eine einheitliche Doku + klare Agent-Guardrails.
- **Decision:**
  - Template-Struktur standardisieren: `docs/`, `src/`, `vibe/`, `.agent/`, `scripts/`.
- **Alternatives:**
  - A) Minimalist: nur `README.md`
  - B) Log-only: nur `docs/DEVLOG.md`
- **Consequences:**
  - **Positive:** Konsistenter Start, schnelleres Onboarding, weniger Chaos.
  - **Negative:** Etwas mehr “Initial Setup”.

---

### 2026-03-08 — Canonical skill source in `.agents/skills`
- **Status:** Accepted
- **Context:**
  - Das Repo enthielt identische Skills unter `.agents/skills`, `.claude/skills`, `skills` und `.vibe/skills` als getrennte physische Ordner.
  - Die Duplikate erhöhen Pflegeaufwand und Drift-Risiko, obwohl verschiedene Tools dieselben Inhalte erwarten.
- **Decision:**
  - `.agents/skills` ist die einzige kanonische Quelle.
  - Tool-spezifische Kompatibilitätspfade werden als Junctions/Links darauf abgebildet, nicht als eigene Kopien gepflegt.
- **Alternatives:**
  - A) Jede Tool-Integration mit eigenem physischen Skill-Ordner weiterführen
  - B) Nur einen Pfad behalten und Kompatibilität für andere Tools manuell wiederherstellen
- **Consequences:**
  - **Positive:** Single Source of Truth, kein Inhaltsdrift zwischen Tool-Pfaden, geringerer Pflegeaufwand.
  - **Negative:** Lokale Entwicklung ist auf funktionierende Junctions/Links im Dateisystem angewiesen.
- **Related:** `docs/DEVLOG.md`

---

### 2026-03-09 — Single-Page Workflow statt Multi-Page Routing
- **Status:** Accepted
- **Context:**
  - Die App hat 6 lineare Workflow-Schritte (F1-F6), die alle auf denselben In-Memory-State (DxfEntityV2[]) zugreifen.
  - Bei Multi-Page Routing wuerde der State bei Navigation verloren gehen oder muesste serialisiert werden.
- **Decision:**
  - Eine einzige Seite (`/`), Workflow-Schritte via Client-State (`WorkflowStep`) gesteuert.
  - Kein URL-Routing fuer Workflow-Steps.
- **Alternatives:**
  - A) Separate Routes pro Step mit URL-State oder Context
  - B) localStorage als State-Bridge zwischen Seiten
- **Consequences:**
  - **Positive:** Einfache Architektur, kein State-Verlust, kein Serialisierungs-Overhead.
  - **Negative:** Browser-Zurueck-Button hat keine Funktion im Workflow. Kein Deep-Linking zu Steps.
- **Related:** `docs/ARCHITECTURE.md` (Routen-Plan)

---

### 2026-03-09 — Eigener DXF R12 Parser statt npm-Paket
- **Status:** Accepted
- **Context:**
  - Es gibt npm-Pakete fuer DXF-Parsing (z.B. dxf-parser), aber diese unterstuetzen oft neuere DXF-Versionen und haben unnoetige Komplexitaet.
  - Wir brauchen nur R12 ASCII mit 5 Entity-Typen und muessen LINETYPE zuverlaessig extrahieren (fuer Gewinde-Logik).
- **Decision:**
  - Eigener Parser in `src/lib/dxf/parser.ts`, ca. 200-400 Zeilen.
  - Nur LINE, CIRCLE, ARC, LWPOLYLINE, TEXT. Kein BLOCK/INSERT-Support.
- **Alternatives:**
  - A) `dxf-parser` npm-Paket (unterstuetzt viele Versionen, aber schwerer zu kontrollieren)
  - B) `dxf` npm-Paket (TypeScript, aber fuer neuere DXF-Versionen optimiert)
- **Consequences:**
  - **Positive:** Volle Kontrolle, keine externe Abhaengigkeit, exakt auf R12 zugeschnitten, LINETYPE-Extraktion garantiert.
  - **Negative:** Mehr initialer Aufwand. Edge Cases in DXF-Dateien muessen selbst behandelt werden.
- **Related:** `docs/requirements/REQUIREMENTS.md` (F2, Annahme: nur R12 ASCII, keine BLOCKs)

---

### 2026-03-09 — Client-only Architektur (kein Server-State)
- **Status:** Accepted
- **Context:**
  - MVP hat keine Datenbank, kein Auth, keine API-Routes.
  - Alle Operationen (Parsen, Bereinigen, Klassifizieren, Exportieren) sind reine Daten-Transformationen.
- **Decision:**
  - Alles laeuft client-seitig. Next.js wird nur als Build-Tool und fuer die Seitenstruktur genutzt.
  - Keine Server Actions, keine API Routes im MVP.
  - Parser, Cleaner, Classifier, Exporter sind pure Funktionen ohne Server-Abhaengigkeit.
- **Alternatives:**
  - A) Server Actions fuer DXF-Verarbeitung (unnoetig ohne Persistenz)
  - B) API Route fuer Parser (unnoetig, File API liest Dateien im Browser)
- **Consequences:**
  - **Positive:** Keine Server-Infrastruktur noetig, laeuft komplett offline/lokal, schnellere Verarbeitung (kein Netzwerk-Roundtrip).
  - **Negative:** Kein serverseitiges Logging, keine Persistenz. Wird in Phase 2 teilweise umgebaut.
- **Related:** `docs/requirements/REQUIREMENTS.md` (Annahme: App laeuft nur lokal)

---

### 2026-03-09 — State in AppShell via useState/useReducer
- **Status:** Accepted
- **Context:**
  - Die App hat ca. 8-10 State-Werte die zusammengehoeren (Workflow-Step, Entities, Parts, ProjectInfo).
  - Alle State-Updates kommen von direkten User-Interaktionen (kein asynchroner Server-State).
- **Decision:**
  - Zentraler State in einer `AppShell` Client Component via `useState` oder `useReducer`.
  - Kein externer State-Manager (Zustand, Jotai, Redux).
  - State wird via Props und Callbacks an Child Components weitergegeben.
- **Alternatives:**
  - A) Zustand (leichtgewichtiger Store) -- unnoetig bei einer Single-Page App mit wenig State
  - B) React Context -- moeglich, aber Props sind transparenter bei flacher Hierarchie
  - C) useReducer -- gute Option falls die State-Logik komplex wird
- **Consequences:**
  - **Positive:** Kein zusaetzliches Paket, einfach zu verstehen, expliziter Datenfluss.
  - **Negative:** Bei wachsendem State koennten Props-Ketten lang werden. Dann auf useReducer oder Context umsteigen.

---

### 2026-03-09 — Wiederverwendung der 4-Schichten-Editor-Architektur
- **Status:** Accepted
- **Context:**
  - Im DXF-Kalkulator existiert bereits eine erprobte SVG-Editor-Architektur mit Zoom/Pan/Fit, Hit-Testing und React.memo-Optimierungen.
  - Diese Architektur ist in 9 Dateien gekapselt und laesst sich mit minimalen Aenderungen uebernehmen.
- **Decision:**
  - 9 Dateien werden 1:1 aus dem DXF-Kalkulator kopiert (siehe COPY_FROM_SOURCE.md).
  - DxfEditor.tsx wird angepasst (Box-Selektion, Klassifizierungs-Modus).
  - DxfEntityV2 Interface wird um `classification` und `partId` erweitert.
- **Alternatives:**
  - A) Alles neu schreiben -- Zeitverschwendung bei bewiesener Architektur
  - B) Canvas statt SVG -- bessere Performance bei >10k Entities, aber SVG reicht fuer 5000
- **Consequences:**
  - **Positive:** Tage an Entwicklungszeit gespart, bewiesene Performance-Patterns, konsistente UX.
  - **Negative:** Abhaengigkeit von der bestehenden Architektur. Aenderungen am Interface muessen in beiden Projekten nachgezogen werden (oder bewusst divergieren).
- **Related:** `docs/architecture/DXF_EDITOR_ARCHITECTURE_BRIEFING.md`, `COPY_FROM_SOURCE.md`

---

### 2026-03-10 — F3 Selection: Entfernung der automatischen Cluster-Expansion
- **Status:** Accepted
- **Context:**
  - F3 (Teile definieren) verwendet `expandSelectionToPartCluster()` nach Klick und Box-Selektion, um automatisch benachbarte Entities und innenliegende Geometrie mitzunehmen.
  - Bei Zeichnungen mit Rahmen, Schriftfeldern oder grossen umschliessenden Konturen fuehrt dies dazu, dass ein einzelner Klick die gesamte Zeichnung mitreisst ("Rahmen-Eskalationsproblem").
  - Der Bediener kann nicht vorhersagen, was das System nach seiner Auswahl tun wird.
- **Decision:**
  - `expandSelectionToPartCluster()` wird im Select-Modus (F3) nicht mehr aufgerufen.
  - Einzelklick liefert genau eine Entity-ID. Box-Selektion liefert nur intersectende Entities.
  - Die Funktion wird als `@deprecated` markiert und im Code belassen fuer moegliche spaetere Verwendung als optionaler Expertenmodus.
  - Abwahl erfolgt per Toggle-Klick (erneuter Klick auf selektierte Entity).
- **Alternatives:**
  - A) Richtung A: Kontur-/Komponentenbasierte Selektion (aufwaendig, spaetere Phase)
  - B) Toleranz/Schwellwert von `expandSelectionToPartCluster` anpassen (behebt das Grundproblem nicht)
  - C) Funktion komplett loeschen (verhindert spaetere Wiederverwendung)
- **Consequences:**
  - **Positive:** Vorhersagbares Verhalten, kein Rahmen-Eskalationsproblem, einfacherer Code, bessere Performance (O(n^2) Expansion entfaellt).
  - **Negative:** Bediener muss alle Entities manuell markieren (mehr Klicks bei komplexen Teilen). Wird durch Box-Selektion gemildert.
- **Related:** `docs/requirements/F3_SELECTION_REQUIREMENTS.md`, `docs/architecture/F3_SELECTION_ARCHITECTURE.md`

---

### 2026-03-10 — F3 Abwahl: Toggle via erneuten Klick statt Modifier-Taste
- **Status:** Accepted
- **Context:**
  - F3 braucht eine Moeglichkeit, einzelne Entities aus der Auswahl zu entfernen.
  - Optionen: Toggle (erneuter Klick), Ctrl+Klick, dedizierter Abwahl-Button.
- **Decision:**
  - Toggle: Ein Klick auf eine bereits selektierte Entity waehlt sie ab.
  - Box-Selektion ist immer additiv (kein Toggle bei Fensterauswahl).
  - Klick ins Leere leert nur die lokale visuelle Auswahl, nicht die Part-Zuordnung.
- **Alternatives:**
  - A) Ctrl+Klick: Erfordert Modifier-Wissen, plattformabhaengig (Cmd auf Mac)
  - B) Dedizierter Abwahl-Button: Zusaetzliche UI-Komplexitaet
  - C) Rechtsklick-Kontextmenu: Over-Engineering
- **Consequences:**
  - **Positive:** Intuitivster Mechanismus, kein Vorwissen noetig, konsistent mit additivem Klick-Modell.
  - **Negative:** Keine Moeglichkeit per Box mehrere Entities abzuwaehlen (nur einzeln per Klick). Akzeptabel fuer den Use Case.
- **Related:** `docs/architecture/F3_SELECTION_ARCHITECTURE.md` (Abschnitt 5)

---

## Best Practices
- **Scope:** Focus on decisions with long-term impact.
- **Clarity:** Use bullet points; add short snippets if they clarify.
- **Linking:** Reference related issues/PRs and DEVLOG entries when available.
- **Supersede, don’t delete:** Mark old decisions as **Superseded** and link to the replacement.

