# Debug Bug Workflow
# Goal: Systematically find and fix bugs (without chaos)

# Beschreibung (Deutsch):
# 1. Beschreibe den Bug in 1–2 Sätzen (Erwartetes vs. Tatsächliches Verhalten).
# 2. Nenne max. 3 Hypothesen zur Ursache.
# 3. Prüfe zuerst Logs, Inputs und Edge Cases (kleine, schnelle Checks).
# 4. Füge minimale Debug-Ausgaben hinzu (z. B. `console.log` oder `print`) – und entferne sie nach der Lösung.
# 5. Behebe den Bug in kleinen Schritten und verifiziere die Lösung.
# 6. Dokumentiere im DEVLOG: 3–6 Stichpunkte (Bug, Ursache, Fix, Test).

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
     - Session token not saved correctly in `auth.service.js`.
     - Route configuration missing in `router/index.js`.
     - Backend returns wrong redirect URL.
     ```

3. **Check logs, inputs, and edge cases first (quick checks).**
   - **Example:**
     ```markdown
     - Reviewed `nginx` error logs: No 500 errors found.
     - Tested with invalid credentials → Correctly shows error message.
     - Verified backend response with Postman: Returns `/dashboard`.
     ```

4. **Add minimal debug outputs (e.g., `console.log`, `print`) and remove them afterward.**
   - **Example:**
     ```javascript
     // In auth.service.js
     console.log("Session token after login:", sessionToken); // DEBUG: Remove after fix
     ```

5. **Fix the bug in small steps and verify the solution.**
   - **Example:**
     ```markdown
     - Fixed missing route in `router/index.js`:
       ~~~javascript
       { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } }
       ~~~
     - Verified: Login now redirects to `/dashboard`.
     ```

6. **Update `docs/DEVLOG.md` with 3–6 bullet points (bug, cause, fix, test).**
   - **Example:**
     ```markdown
     ## 2025-12-22
     - **Bug:** Login redirect failed (→ `/404` instead of `/dashboard`).
     - **Cause:** Missing route in `router/index.js`.
     - **Fix:** Added `/dashboard` route with `requiresAuth` meta.
     - **Test:** Manually tested login flow; verified redirect.
     ```

---

### Notes
- **Tools:** Use `scripts/debug-helper.sh` for automated log checks.
- **Integration:** Link this workflow in `AGENTS.md` for easy access.
- **Cleanup:** Always remove debug outputs (e.g., `console.log`) after fixing the bug.

---
### Why This Works
- **Systematic:** Forces structured debugging instead of trial-and-error.
- **Documented:** `DEVLOG.md` ensures knowledge is preserved.
- **Reproducible:** Clear steps help others (or future you) understand the fix.
