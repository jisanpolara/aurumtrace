/** Line icons matching docs/design. 1.7 stroke, currentColor. */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    "aria-hidden": true as const,
    ...props,
  };
}

export const DashboardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

export const NewCaseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" strokeLinecap="round" />
  </svg>
);

export const CustomersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeLinecap="round" />
    <path d="M16 6.5a3 3 0 0 1 0 5.6M17.5 19c0-2.2-1-3.8-2.5-4.6" strokeLinecap="round" />
  </svg>
);

export const ReportsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 3h8l4 4v14H6z" strokeLinejoin="round" />
    <path d="M14 3v4h4M9 13h6M9 16.5h6M9 9.5h2" strokeLinecap="round" />
  </svg>
);

export const AuditIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6z" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path
      d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"
      strokeLinecap="round"
    />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" strokeLinejoin="round" />
    <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
  </svg>
);

export const PlusIcon = ({ size = 16, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    aria-hidden="true"
    {...p}
  >
    <path d="M12 6v12M6 12h12" strokeLinecap="round" />
  </svg>
);

/** Outline hallmark/shield used in the empty state. */
export const HallmarkOutline = ({ size = 28, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--at-gold)"
    strokeWidth={1.5}
    aria-hidden="true"
    {...p}
  >
    <path d="M12 3 L20 8 L17 20 L7 20 L4 8 Z" strokeLinejoin="round" />
  </svg>
);

export const AlertIcon = ({ size = 28, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--at-flag)"
    strokeWidth={1.7}
    aria-hidden="true"
    {...p}
  >
    <path d="M12 8v5" strokeLinecap="round" />
    <circle cx="12" cy="16.5" r=".4" fill="var(--at-flag)" />
    <path d="M12 3l9 16H3z" strokeLinejoin="round" />
  </svg>
);

/** Filled hallmark stamp — marks a completed compliance step. */
export function HallmarkStamp({ size = 30 }: { size?: number }) {
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: "var(--at-gold-gradient)",
        boxShadow:
          "0 3px 8px -3px rgba(201,162,75,.7), inset 0 0 0 2px rgba(255,255,255,.4)",
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 12.5l4 4 8-9"
          stroke="#1b1500"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
