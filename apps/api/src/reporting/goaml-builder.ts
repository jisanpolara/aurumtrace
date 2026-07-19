/**
 * Module 5 — goAML DPMSR draft builder. PURE, framework-free, unit-tested.
 *
 * ⚠️ PROVISIONAL STRUCTURE. docs/goaml-mapping.md §3 (the authoritative field
 * mapping) is still "[ADVISOR TO CONFIRM]". Per CLAUDE.md we do not invent a
 * final goAML schema: this produces a commonly-cited DPMSR shape, marks every
 * draft PROVISIONAL, and `provisional:true` propagates to the caller, the stored
 * report, and the UI. It is NOT fit for filing until the advisor signs off the
 * mapping and supplies the official goAML XSD.
 *
 * The XML party block legitimately contains the subject's name + ID — that is
 * the purpose of the report (filed to the FIU). Money is rendered as AED from
 * integer fils. Output is deterministic (golden-file tested).
 */

export type GoamlDraftInput = {
  reference: string;
  reportingEntity: { legalName: string; licence: string; goamlOrgId: string | null };
  transaction: {
    date: string; // YYYY-MM-DD
    itemType: string;
    purityKarat: number | null;
    weightGrams: number;
    valueFils: number;
    aggregateFils: number;
    reportable: boolean;
  };
  party: { name: string; idNumber: string | null; riskBand: string | null };
};

export type GoamlDraft = {
  xml: string;
  /** Always true until the advisor-approved mapping + XSD land. */
  provisional: boolean;
};

const PROVISIONAL_BANNER =
  "PROVISIONAL goAML DPMSR draft — structure pending advisor confirmation (docs/goaml-mapping.md §3). Not for filing as-is.";

function aed(fils: number): string {
  return (fils / 100).toFixed(2);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildGoamlDraft(input: GoamlDraftInput): GoamlDraft {
  const { reportingEntity: e, transaction: t, party: p } = input;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ${PROVISIONAL_BANNER} -->`,
    "<report>",
    "  <report_type>DPMSR</report_type>",
    `  <reference>${esc(input.reference)}</reference>`,
    "  <reporting_entity>",
    `    <legal_name>${esc(e.legalName)}</legal_name>`,
    `    <licence>${esc(e.licence)}</licence>`,
    `    <goaml_org_id>${e.goamlOrgId ? esc(e.goamlOrgId) : ""}</goaml_org_id>`,
    "  </reporting_entity>",
    "  <transaction>",
    `    <date>${esc(t.date)}</date>`,
    `    <item type="${esc(t.itemType)}" purity_karat="${t.purityKarat ?? ""}" weight_grams="${t.weightGrams}"/>`,
    `    <value_aed>${aed(t.valueFils)}</value_aed>`,
    `    <aggregate_aed>${aed(t.aggregateFils)}</aggregate_aed>`,
    `    <reportable>${t.reportable}</reportable>`,
    "  </transaction>",
    '  <party role="conductor">',
    `    <name>${esc(p.name)}</name>`,
    `    <id_number>${p.idNumber ? esc(p.idNumber) : ""}</id_number>`,
    `    <risk_band>${p.riskBand ? esc(p.riskBand) : ""}</risk_band>`,
    "  </party>",
    "</report>",
    "",
  ].join("\n");

  return { xml, provisional: true };
}

/**
 * Build the LLM narrative prompt. Deliberately takes NO identity fields (name /
 * ID) — the narrative is PII-free by construction, not merely by the regex PII
 * guard (which cannot detect names). Unit-tested to contain no PII.
 */
export type NarrativeFacts = {
  date: string;
  itemType: string;
  purityKarat: number | null;
  weightGrams: number;
  valueFils: number;
  aggregateFils: number;
  reportable: boolean;
  riskBand: string | null;
};

export function buildNarrativePrompt(f: NarrativeFacts): string {
  return (
    `Draft a neutral, factual AML report narrative. On ${f.date}, a customer ` +
    `${f.reportable ? "conducted a reportable transaction" : "conducted a transaction"}: ` +
    `a ${f.weightGrams} g ${f.purityKarat ?? "?"}K gold ${f.itemType} valued at ` +
    `AED ${aed(f.valueFils)}. Aggregated total AED ${aed(f.aggregateFils)}; ` +
    `risk assessed ${f.riskBand ?? "n/a"}.`
  );
}

/** Required elements for a structurally-complete draft (provisional checklist). */
const REQUIRED = [
  "<report_type>",
  "<reference>",
  "<legal_name>",
  "<date>",
  "<value_aed>",
  "<reportable>",
  "<name>",
];

export type DraftValidation = { valid: boolean; missing: string[]; provisional: true };

/**
 * Structural validation only — real goAML XSD validation is pending the
 * advisor-supplied schema. Checks required elements are present + non-empty.
 */
export function validateGoamlDraft(xml: string): DraftValidation {
  const missing = REQUIRED.filter((tag) => {
    const close = tag.replace("<", "</");
    const m = xml.match(new RegExp(`${tag}(.*?)${close}`, "s"));
    // present and (for elements) non-empty
    return !m || m[1]!.trim() === "";
  });
  return { valid: missing.length === 0, missing, provisional: true };
}
