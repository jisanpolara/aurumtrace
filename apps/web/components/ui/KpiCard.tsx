const DOT: Record<string, string> = {
  neutral: "var(--at-text-muted)",
  warn: "var(--at-gold)",
  flag: "var(--at-flag)",
  clear: "var(--at-clear)",
};

const SUB: Record<string, string> = {
  neutral: "var(--at-text-muted)",
  warn: "var(--at-gold-deep)",
  flag: "var(--at-flag)",
  clear: "var(--at-clear)",
};

export function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "warn" | "flag" | "clear";
}) {
  return (
    <div className="at-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-[.72rem] font-semibold text-text-muted">{label}</div>
        <span
          className="h-[9px] w-[9px] flex-none rounded-full"
          style={{ background: DOT[tone] }}
        />
      </div>
      <div className="my-[14px] font-display text-[2.4rem] font-semibold leading-none text-text">
        {value}
      </div>
      <div className="text-[.78rem] font-medium" style={{ color: SUB[tone] }}>
        {sub}
      </div>
    </div>
  );
}
