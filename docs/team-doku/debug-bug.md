# Debug Bug Workflow
# Goal: Systematically find and fix bugs (without chaos)

# Beschreibung (Deutsch):
# Nutze diesen Ablauf, wenn in der Developer-, QA- oder Review-Phase aus `docs/workflow.md` ein Bug auftaucht.
# 1. Beschreibe den Bug in 1–2 Sätzen (Erwartetes vs. Tatsächliches Verhalten).
# 2. Nenne max. 3 Hypothesen zur Ursache.
# 3. Prüfe zuerst Logs, Inputs und Edge Cases (kleine, schnelle Checks).
# 4. Füge minimale Debug-Ausgaben hinzu (z. B. `console.log` oder `print`) – und entferne sie nach der Lösung.
# 5. Behebe den Bug in kleinen Schritten und verifiziere die Lösung.
# 6. Dokumentiere im DEVLOG: 3–6 Stichpunkte (Bug, Ursache, Fix, Test) und aktualisiere bei Bedarf Tests unter `tests/`.

---

### Steps to Debug a Bug

1. **Describe the bug in 1–2 sentences (Expected vs Actual behavior).**
   - **Example:**
     ```markdown
     - **Expected:** User login redirects to `/dashboard`.
     - **Actual:** Redirects to `/404` after successful login.
     ```

2. **List hypotheses (max. 3) about the root cause.**
   - **Example:**
     ```markdown
     - Session token not saved correctly in `src/lib/auth.ts`.
     - Route configuration missing in `src/app/`.
     - Backend returns wrong redirect URL.
     ```

3. **Check logs, inputs, and edge cases first (quick checks).**
   - **Example:**
     ```markdown
     - Reviewed output from `bash scripts/debug-helper.sh`: no unexpected server errors found.
     - Tested with invalid credentials → Correctly shows error message.
     - Verified backend response from the responsible Route Handler in `src/app/api/`.
     ```

4. **Add minimal debug outputs (e.g., `console.log`, `print`) and remove them afterward.**
   - **Example:**
     ```javascript
     // In src/lib/auth.ts
     console.log("Session token after login:", sessionToken); // DEBUG: Remove after fix
     ```

5. **Fix the bug in small steps and verify the solution.**
   - **Example:**
     ```markdown
     - Fixed missing route in `src/app/dashboard/page.tsx`:
       ~~~javascript
       export default function DashboardPage() {
         return <Dashboard />
       }
       ~~~
     - Verified: Login now redirects to `/dashboard`.
     ```

6. **Update `docs/DEVLOG.md` with 3–6 bullet points (bug, cause, fix, test).**
   - **Example:**
     ```markdown
     ## 2025-12-22
     - **Bug:** Login redirect failed (→ `/404` instead of `/dashboard`).
     - **Cause:** Missing page under `src/app/dashboard/`.
     - **Fix:** Added dashboard route and aligned redirect target.
     - **Test:** Manually tested login flow and updated regression test in `tests/`.
     ```

7. **Re-run the relevant workflow checks.**
   - **Minimum:** run the smallest useful subset first, then `bash scripts/ship-safe.sh` before handoff or merge.
   - **Examples:**
     ```bash
     npm run lint
     npm run typecheck
     bash scripts/ship-safe.sh
     ```

---

### Notes
- **Tools:** Use `scripts/debug-helper.sh` for automated log checks.
- **Workflow fit:** Use this checklist together with `docs/workflow.md`, especially before returning a fix to QA or Review.
- **Ordnerregeln:** Produktivcode in `src/`, Debug-Utilities nur bei echtem Bedarf in `tools/`, Regressionstests in `tests/`.
- **Cleanup:** Always remove debug outputs (e.g., `console.log`) after fixing the bug.

---
### Why This Works
- **Systematic:** Forces structured debugging instead of trial-and-error.
- **Documented:** `DEVLOG.md` ensures knowledge is preserved.
- **Reproducible:** Clear steps help others (or future you) understand the fix.
