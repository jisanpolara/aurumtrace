# goAML Mapping — Source of Truth (TEMPLATE)

> **This document is the single source of truth for all regulatory values in AurumTrace.**
> The `compliance-logic` agent and the report builder read ONLY from here. Nothing in the
> codebase may hard-code a threshold, code, field or retention value that is not confirmed
> in this document.
>
> **It must be completed and signed off by a qualified UAE AML / compliance advisor before
> the report module (Step 8) is built.** Every field below marked **[ADVISOR TO CONFIRM]**
> is a placeholder, not a fact. Claude must not fill these in from memory — where a value is
> missing, the code emits `// TODO(compliance)` and stops.
>
> Authoritative sources are the UAE FIU / goAML documentation and the relevant law
> (Federal Decree-Law and its executive regulations). Attach or link the exact schema the
> FIU publishes; do not transcribe from memory.

---

## 0. Sign-off
- Advisor name & credentials: **[ADVISOR TO CONFIRM]**
- Date reviewed: **[ADVISOR TO CONFIRM]**
- goAML schema version this maps to: **[ADVISOR TO CONFIRM]**
- Source documents referenced (links/attachments): **[ADVISOR TO CONFIRM]**

---

## 1. Which report types apply to a gold dealer (DPMS)?
List every report type the dealer may need to file, and when each applies.

| Report type | When it applies | In pilot scope? |
|---|---|---|
| **[ADVISOR TO CONFIRM]** (e.g. the cash-transaction report for DPMS) | [ADVISOR TO CONFIRM] | Y / N |
| **[ADVISOR TO CONFIRM]** (suspicious-transaction report) | [ADVISOR TO CONFIRM] | Y / N |
| **[ADVISOR TO CONFIRM]** | [ADVISOR TO CONFIRM] | Y / N |

> Note: pilot builds only the report type(s) marked "Y". Confirm the exact goAML report-type
> codes/names. **[verify]**

---

## 2. Reporting triggers & thresholds
| Trigger | Value / rule | Notes |
|---|---|---|
| Cash/wire single-transaction threshold | **[ADVISOR TO CONFIRM — commonly cited as AED 55,000]** | Confirm exact amount + which transaction types it covers. |
| Linked / aggregated transactions | **[ADVISOR TO CONFIRM]** — window length (e.g. rolling days) + how to aggregate | Drives the aggregation engine. |
| Suspicion-based trigger (no threshold) | **[ADVISOR TO CONFIRM]** | When must an STR be filed regardless of amount? |
| Currency / unit | AED, integer fils internally | Confirm rounding rules. |

---

## 3. Field mapping (per report type in scope)
For each report type marked "Y" above, complete one table. Map our internal field → the exact
goAML XML element/path → format/code list. **[ADVISOR TO CONFIRM]** all XML paths and codes.

### Report type: **[ADVISOR TO CONFIRM]**
| Our field (packages/shared) | goAML XML element / path | Required? | Format / code list | Source of value |
|---|---|---|---|---|
| reportReference | [ADVISOR TO CONFIRM] | [Y/N] | [ADVISOR] | system-generated |
| reportingEntity (the dealer) | [ADVISOR TO CONFIRM] | [Y/N] | [ADVISOR] | tenant profile |
| submissionDate | [ADVISOR TO CONFIRM] | [Y/N] | [ADVISOR] | system |
| subject / customer identity | [ADVISOR TO CONFIRM] | [Y/N] | [ADVISOR] | customer record |
| customer ID type & number | [ADVISOR TO CONFIRM] | [Y/N] | [ADVISOR — code list] | KYC |
| transaction date | [ADVISOR TO CONFIRM] | [Y/N] | [ADVISOR] | case |
| transaction type / direction | [ADVISOR TO CONFIRM] | [Y/N] | [ADVISOR — code list] | case |
| amount (AED) | [ADVISOR TO CONFIRM] | [Y/N] | [ADVISOR] | case |
| goods description (gold, karat, weight) | [ADVISOR TO CONFIRM] | [Y/N] | [ADVISOR] | item |
| reason / indicator code | [ADVISOR TO CONFIRM] | [Y/N] | [ADVISOR — code list] | threshold/risk |
| narrative | [ADVISOR TO CONFIRM] | [Y/N] | free text — see §5 | generated, human-reviewed |
| ... add all remaining required fields ... | [ADVISOR TO CONFIRM] | | | |

> Repeat this table for each in-scope report type.

---

## 4. Code lists
goAML uses controlled code lists (transaction types, ID types, country codes, etc.).
Paste or link the authoritative lists; do not invent codes.
- ID / document types: **[ADVISOR TO CONFIRM]**
- Transaction types: **[ADVISOR TO CONFIRM]**
- Indicator / reason codes: **[ADVISOR TO CONFIRM]**
- Other required code lists: **[ADVISOR TO CONFIRM]**

---

## 5. Narrative requirements
The LLM drafts the narrative; a human reviews before filing. Define:
- Mandatory content the narrative must contain: **[ADVISOR TO CONFIRM]**
- Length / format constraints: **[ADVISOR TO CONFIRM]**
- Prohibited content / tone rules: **[ADVISOR TO CONFIRM]**

---

## 6. Submission method
- Pilot: generate goAML-compliant **XML**, validate against the schema, dealer uploads to the
  goAML portal manually. Confirm this is acceptable. **[ADVISOR TO CONFIRM]**
- Any machine submission interface available? **[ADVISOR TO CONFIRM]**

---

## 7. Record retention & deletion
- Statutory retention period for these records: **[ADVISOR TO CONFIRM — commonly cited as 5 years; confirm trigger date]**
- What must be retained (documents, the report, the audit log): **[ADVISOR TO CONFIRM]**
- Deletion rules after the period: **[ADVISOR TO CONFIRM]**

---

## 8. Responsible-sourcing (Decree 68 / OECD) evidence
- Exact documentation the dealer must capture and retain: **[ADVISOR TO CONFIRM]**
- How (if at all) it feeds the goAML report vs. is kept on file: **[ADVISOR TO CONFIRM]**

---

## 9. Open questions / parking lot
Log anything unresolved here so the build can stub it cleanly rather than guess.
- [ ] …
- [ ] …

---

## 10. Golden-file fixtures
For each in-scope report type, attach at least one **fully worked example report**
(realistic but synthetic data) in `docs/sample-reports/`. These become the golden-file tests
the `test-writer` agent diffs generated XML against. **[ADVISOR TO CONFIRM each example.]**

---

*Until sections 1–7 are completed and signed off, the report module (Step 8) does not start.
The build can proceed on all non-report modules in the meantime.*
