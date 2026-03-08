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

## Best Practices
- **Scope:** Focus on decisions with long-term impact.
- **Clarity:** Use bullet points; add short snippets if they clarify.
- **Linking:** Reference related issues/PRs and DEVLOG entries when available.
- **Supersede, don’t delete:** Mark old decisions as **Superseded** and link to the replacement.

