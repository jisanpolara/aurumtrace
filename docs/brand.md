# AurumTrace — Brand & Design System

> Upload this as system-level context for Claude Design. It is the single source of
> truth for the AurumTrace product UI. Pair it with `tokens.css`.

## What AurumTrace is
An AI compliance app that UAE gold and precious-metals dealers use to meet their AML
obligations (KYC, transaction reporting, responsible-sourcing due diligence, goAML
filing). It turns a fragmented, manual burden into one guided workflow.

**Users:** compliance officer / owner (desktop, full access) · counter staff (tablet,
fast intake) · auditor (read-only).

## Brand essence
Premium, trustworthy, calm, precise. Regulated fintech for the gold trade — "a private
bank that happens to be software," with a quiet gold-assay character. Never flashy,
never playful. Every screen should feel defensible and inspection-ready.

## Voice & tone (for UI copy)
- Plain, exact, reassuring. Short labels; no jargon the dealer wouldn't use.
- State facts and status, not hype. "Reportable — above AED 55,000" not "Uh-oh!".
- British/UAE English spelling. Numbers as AED with thousands separators.
- Bilingual: every string must have an Arabic counterpart; layouts must mirror (RTL).

## Colour
**Brand chrome (dark)** — sign-in, sidebar, brand surfaces only:
ink `#16181D`, panel `#23262F`, hairline `#31353F`.
**Product surfaces (light)** — the working app, for counter readability:
background `#F6F3EC`, cards `#FFFFFF` / `#FBFAF6`, hairline `#E7E2D6`,
text `#23262F`, muted `#6E727C`.
**Accent:** gold `#C9A24B` (primary), gold-light `#E3CB8B`. Use gold with restraint —
for emphasis, the wordmark, active states and the hallmark stamp, not large fills.
**Semantic:** risk/alert `#9B3B2E` · clear/success `#3B7A5E` · warning `#C9A24B`.
Status pills: *clear* (green), *flag* (red), *warn* (gold).

## Typography
- **Display & headings:** Fraunces (serif), weights 500–700. Used for the wordmark,
  page titles, big numbers and stage names.
- **UI & body:** Inter. All controls, labels, table text.
- **Mono:** a monospace for reference numbers, the goAML report preview and audit logs
  — it should read as "system of record".
- Wordmark: "Aurum" in ink/white + "Trace" in gold; never restyle the two halves
  differently from this.

## Shape & space
Rounded corners 12–14px on cards and inputs, 10px on buttons/pills. Soft, low shadows
(never harsh). Generous whitespace; let high-value actions breathe. Light product
cards sit on the warm off-white background with hairline borders.

## The hallmark motif (signature element)
A gold "hallmark stamp" — a small struck check — marks each completed compliance step,
echoing how gold purity is hallmarked. Use it on the stage rail and on completed
checklists. One motif, used consistently and sparingly; do not decorate with it.

## Core components
Buttons (primary = gold gradient on ink text; secondary = outline), inputs with clear
labels and focus rings, status pills (clear/flag/warn), cards, data tables (ink header
row, alternating light rows), the stage rail (numbered nodes that become hallmark
stamps when done), KPI cards, document-upload tiles, and a monospace report-preview
panel.

## Accessibility & RTL
- WCAG AA contrast minimum; visible keyboard focus states everywhere.
- Counter-tablet usable: large touch targets, scan-first, minimal typing.
- Fully mirror-able for Arabic (RTL): right-aligned, flipped layout, no baked-in
  left/right assumptions.

## Do / Don't
- DO keep the working app light; reserve dark for sign-in, sidebar and brand surfaces.
- DO lead with status and numbers; make "reportable" and risk states obvious.
- DON'T use gold as a large background fill or for body text.
- DON'T add illustration or playful flourishes; this is regulated software.
- DON'T auto-submit anything — every report is reviewed and filed by a human; design
  for a clear review-then-file moment.
