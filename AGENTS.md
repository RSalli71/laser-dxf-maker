# AGENTS.md — Regeln für AI/Agenten (universal)

## 1) So arbeiten wir (kleine, sichere Schritte)
- Arbeite in kleinen, überprüfbaren Schritten (max. 1–3 Dateien pro Schritt).
- Vor Änderungen: nenne kurz den Plan + welche Dateien du änderst.
- Nach Änderungen: kurzer Self-Check (Risiken/Edge-Cases) + wie ich es testen kann.

## 2) Qualität
- Bevorzuge einfache, robuste Lösungen statt “clever”.
- Keine Breaking Changes ohne Hinweis + kurze Migration/Alternative.
- Neue Dependencies nur, wenn wirklich nötig (kurz begründen).

## 3) Sicherheit
- Niemals Secrets (API Keys, Passwörter, Tokens) in Code, Logs oder Doku schreiben.
- Keine geheimen Dateien (.env, private Keys) in Antworten kopieren.

## 4) Doku-Pflicht bei relevanten Änderungen
- Bei wichtigen Änderungen: docs/DEVLOG.md aktualisieren (3–6 Bulletpoints).
- Wenn ein "Warum" wichtig ist: docs/DECISIONS.md kurz ergänzen.

## 5) Next.js Konventionen
- **App Router** verwenden (src/app/). Kein Pages Router.
- Unterscheide **Server Components** (default) und **Client Components** ("use client").
- "use client" nur wenn nötig: Event-Handler, Hooks (useState, useEffect), Browser-APIs, Framer Motion.
- Datenabfragen bevorzugt in Server Components (async/await, kein useEffect).
- Layouts (`layout.tsx`) für gemeinsame UI-Elemente, nicht in jeder Page wiederholen.
- Metadata via `export const metadata` oder `generateMetadata()` in Server Components.

## 6) Styling & UI
- **Tailwind CSS v4** für Styling. Keine inline-styles oder CSS-Module ohne Grund.
- **shadcn/ui** Komponenten via CLI installieren (`npx shadcn@latest add <component>`).
- shadcn/ui Komponenten liegen in `src/components/ui/` — dort nicht manuell editieren.
- Eigene Komponenten in `src/components/shared/`.
- `cn()` Helper aus `src/lib/utils.ts` für bedingte Klassen verwenden.

## 7) Animationen
- **Framer Motion** für Animationen. Nur in Client Components ("use client").
- Bevorzuge `motion.*` Komponenten statt CSS-Animationen für komplexe Übergänge.
- Einfache Hover/Focus-States mit Tailwind lösen, nicht mit Framer Motion.
