"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { HallmarkStamp } from "@/components/icons";
import { aedFromFils } from "@/lib/format";
import { createCaseAction, type IntakeActionResult } from "./actions";

const inputCls =
  "w-full rounded-[10px] border border-hairline bg-card-alt px-[13px] py-[11px] text-[.9rem] text-text outline-none focus:border-gold";
const labelCls = "at-label mb-[6px] block";

export function IntakeForm() {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<IntakeActionResult | null>(null);
  const [form, setForm] = useState({
    itemType: "bar",
    purityKarat: 24,
    weightGrams: 250,
    transactionType: "buy_from_customer",
  });

  const submit = () =>
    start(async () => {
      setRes(
        await createCaseAction({
          idImageRef: "scan://counter",
          item: {
            itemType: form.itemType,
            purityKarat: Number(form.purityKarat),
            weightGrams: Number(form.weightGrams),
            transactionType: form.transactionType,
          },
        }),
      );
    });

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-[18px]">
      {/* Capture */}
      <div className="at-card p-[22px]">
        <h3 className="m-0 mb-4 font-display text-[1.08rem] font-semibold text-text">Item</h3>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <label>
            <span className={labelCls}>Type</span>
            <select
              className={inputCls}
              value={form.itemType}
              onChange={(e) => setForm({ ...form, itemType: e.target.value })}
            >
              <option value="bar">Gold bar</option>
              <option value="coins">Coins</option>
              <option value="jewellery">Jewellery</option>
              <option value="scrap">Scrap</option>
            </select>
          </label>
          <label>
            <span className={labelCls}>Purity (karat)</span>
            <input
              type="number"
              min={1}
              max={24}
              className={inputCls}
              value={form.purityKarat}
              onChange={(e) => setForm({ ...form, purityKarat: Number(e.target.value) })}
            />
          </label>
          <label>
            <span className={labelCls}>Weight (g)</span>
            <input
              type="number"
              min={0}
              step="0.001"
              className={inputCls}
              value={form.weightGrams}
              onChange={(e) => setForm({ ...form, weightGrams: Number(e.target.value) })}
            />
          </label>
          <label>
            <span className={labelCls}>Transaction</span>
            <select
              className={inputCls}
              value={form.transactionType}
              onChange={(e) => setForm({ ...form, transactionType: e.target.value })}
            >
              <option value="buy_from_customer">Buy from customer</option>
              <option value="sell_to_customer">Sell to customer</option>
            </select>
          </label>
        </div>
        <div className="mb-4 text-[.8rem] text-text-muted">
          Scanning the Emirates ID extracts the customer automatically (mock OCR in this build).
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="at-btn at-btn-primary w-full"
        >
          {pending ? "Valuing…" : "Scan ID & value item"}
        </button>
      </div>

      {/* Result */}
      <div className="at-card p-[22px]">
        <h3 className="m-0 mb-4 font-display text-[1.08rem] font-semibold text-text">Valuation</h3>

        {!res && (
          <div className="text-[.85rem] text-text-muted">
            Submit to create the case, run OCR and value the item against the live gold price.
          </div>
        )}

        {res && !res.ok && (
          <div
            className="rounded-[10px] p-[13px] text-[.85rem]"
            style={{ background: "var(--at-flag-wash)", color: "var(--at-flag)" }}
          >
            {res.error}
          </div>
        )}

        {res && res.ok && (
          <div className="animate-at-rise">
            <div className="mb-4 flex items-center gap-3">
              <HallmarkStamp size={34} />
              <div>
                <div className="font-display text-[1.05rem] font-semibold text-text">
                  {res.result.customer.fullName}
                </div>
                <div className="at-mono text-[.78rem] text-text-muted">
                  {res.result.case.reference}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-[10px] border-t border-hairline pt-4">
              <Row label="Gold price">
                AED {aedFromFils(res.result.valuation.filsPerGram)} / g ·{" "}
                {res.result.valuation.purityKarat}K
              </Row>
              <Row label="Computed value">
                <span className="at-mono font-semibold text-text">
                  AED {aedFromFils(res.result.item.valueFils)}
                </span>
              </Row>
              <Row label="Stage">{res.result.case.stage} of 6 · {res.result.case.status}</Row>
            </div>
            <Link
              href={`/cases/${res.result.case.id}/kyc`}
              className="at-btn at-btn-primary mt-4 w-full"
            >
              Continue to KYC →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[.85rem] text-text-muted">{label}</span>
      <span className="text-[.88rem] text-text">{children}</span>
    </div>
  );
}
