import type { CSSProperties } from "react";
export type IconName =
  | "arrow"
  | "bolt"
  | "home"
  | "building"
  | "meter"
  | "chart"
  | "shield"
  | "wallet"
  | "check"
  | "menu"
  | "close"
  | "chevron"
  | "sun"
  | "moon"
  | "plug"
  | "bulb"
  | "snow"
  | "kettle"
  | "settings"
  | "bell"
  | "help"
  | "history"
  | "logout";
const paths: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-8z" />,
  home: (
    <>
      <path d="m3 10 9-7 9 7v11H3zM9 21v-8h6v8" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3" />
    </>
  ),
  meter: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <path d="M8 7h8v5H8zM9 17h6M12 12v3" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18M6 15l4-5 4 3 6-8" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5z" />
      <path d="m8 11 3 3 5-6" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 8V5H5a3 3 0 0 1 0-6" transform="translate(0 3)" />
      <rect x="3" y="7" width="18" height="14" rx="3" />
      <path d="M16 12h5v5h-5z" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevron: <path d="m8 4 8 8-8 8" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
    </>
  ),
  moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
  plug: (
    <>
      <path d="M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v5" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6m-6 3h6M8 14a7 7 0 1 1 8 0l-1 2H9z" />
    </>
  ),
  snow: (
    <>
      <path d="M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3" />
    </>
  ),
  kettle: (
    <>
      <path d="M6 8h10l2 11H4zM9 5h4M8 8V5h6v3M16 10h5v5h-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" />
    </>
  ),
  bell: (
    <>
      <path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4zM10 21h4" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9a3 3 0 1 1 4 3v2m-1 3h.01" />
    </>
  ),
  history: (
    <>
      <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4" />
    </>
  ),
};
export default function Icon({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-symbol">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M19 4A12 12 0 1 0 28 17"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="m19 2-8 15h8l-3 12L29 11H18z" fill="currentColor" />
        </svg>
      </span>
      {!compact && (
        <span>
          smartclamp<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
