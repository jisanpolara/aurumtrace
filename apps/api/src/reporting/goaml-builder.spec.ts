import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scanForPii } from "@aurumtrace/integrations";
import {
  buildGoamlDraft,
  buildNarrativePrompt,
  type GoamlDraftInput,
  validateGoamlDraft,
} from "./goaml-builder";

const INPUT: GoamlDraftInput = {
  reference: "AT-2026-000148",
  reportingEntity: {
    legalName: "Al Noor Gold Trading LLC",
    licence: "DMCC-7741",
    goamlOrgId: "UAE-FIU-44821",
  },
  transaction: {
    date: "2026-06-22",
    itemType: "bar",
    purityKarat: 24,
    weightGrams: 250,
    valueFils: 6_140_000,
    aggregateFils: 9_140_000,
    reportable: true,
  },
  party: { name: "Rashid Al Maktoum", idNumber: "784-1987-3456712-9", riskBand: "medium" },
};

const GOLDEN = resolve(__dirname, "../../../../docs/sample-reports/dpmsr-sample.xml");

describe("goAML draft builder", () => {
  it("matches the golden sample XML byte-for-byte", () => {
    const { xml } = buildGoamlDraft(INPUT);
    expect(xml).toBe(readFileSync(GOLDEN, "utf8"));
  });

  it("always marks the draft provisional", () => {
    const draft = buildGoamlDraft(INPUT);
    expect(draft.provisional).toBe(true);
    expect(draft.xml).toMatch(/PROVISIONAL goAML DPMSR draft/);
  });

  it("renders money as AED from fils", () => {
    const { xml } = buildGoamlDraft(INPUT);
    expect(xml).toContain("<value_aed>61400.00</value_aed>");
    expect(xml).toContain("<aggregate_aed>91400.00</aggregate_aed>");
  });

  it("escapes XML-significant characters in text", () => {
    const { xml } = buildGoamlDraft({
      ...INPUT,
      party: { ...INPUT.party, name: "Tom & <Jerry>" },
    });
    expect(xml).toContain("<name>Tom &amp; &lt;Jerry&gt;</name>");
  });

  it("builds a narrative prompt that contains no PII", () => {
    const prompt = buildNarrativePrompt({
      date: "2026-06-22",
      itemType: "bar",
      purityKarat: 24,
      weightGrams: 250,
      valueFils: 6_140_000,
      aggregateFils: 9_140_000,
      reportable: true,
      riskBand: "medium",
    });
    expect(scanForPii(prompt)).toEqual([]); // no Emirates ID / email / phone / long digits
    expect(prompt).toContain("AED 61400.00");
  });

  it("validates a complete draft and flags missing required fields", () => {
    expect(validateGoamlDraft(buildGoamlDraft(INPUT).xml).valid).toBe(true);
    const broken = buildGoamlDraft(INPUT).xml.replace(/<value_aed>.*?<\/value_aed>/, "<value_aed></value_aed>");
    const v = validateGoamlDraft(broken);
    expect(v.valid).toBe(false);
    expect(v.missing).toContain("<value_aed>");
  });
});
