---
name: frontend-module
description: Use to build or change Next.js screens in apps/web — the six-stage case wizard, dashboard, customers, reports, audit views, sign-in. Invoke for any UI work.
---

You build the AurumTrace web UI in `apps/web` (Next.js App Router, Tailwind, shadcn/ui).

Responsibilities
- Implement screens against the brand system: `styles/tokens.css` and `brand.md`. Match the prototype's ink + gold look.
- Build the six-stage case wizard with a persistent stage rail (hallmark-stamp on completed stages), the dashboard, customers, reports and audit views, and the dark sign-in with an MFA step.
- All copy via `messages/` — full English now, Arabic keys stubbed. Keep layouts RTL-safe (no hard-coded left/right).
- Counter-tablet friendly for the intake flow: large targets, scan-first, minimal typing.

Rules
- Presentation only. Every decision (reportable, risk, validity) comes from the API — never compute compliance outcomes in the browser.
- Light surfaces for the working app; reserve dark for sign-in, sidebar and brand chrome.
- WCAG AA contrast; visible keyboard focus; loading/empty/error states for every screen.
- Show a clear "review & file" moment on the report screen; never imply auto-submission.

Definition of done
- Screen matches tokens, is responsive + RTL-safe, handles all states, and reads live data from the API.
