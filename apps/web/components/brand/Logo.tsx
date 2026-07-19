/** The struck-shield "assay" mark and the Aurum·Trace wordmark. */

export function BrandMark({ size = 30 }: { size?: number }) {
  const inner = Math.round(size * 0.6);
  return (
    <div
      className="flex flex-none items-center justify-center rounded-[9px]"
      style={{
        width: size,
        height: size,
        background: "var(--at-gold-gradient)",
        boxShadow: "0 4px 14px -4px rgba(201,162,75,.55)",
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3 L20 8 L17 20 L7 20 L4 8 Z" fill="#16181D" opacity=".85" />
        <path
          d="M9 12.5 l2 2 l4-4.5"
          stroke="#E3CB8B"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Wordmark({
  size = "1.22rem",
  onDark = true,
}: {
  size?: string;
  onDark?: boolean;
}) {
  return (
    <span
      className="at-wordmark"
      style={{ fontSize: size, color: onDark ? "var(--at-on-ink)" : "var(--at-text)" }}
    >
      Aurum<span className="trace">Trace</span>
    </span>
  );
}
