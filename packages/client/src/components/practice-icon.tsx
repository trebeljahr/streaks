import type { PracticeIcon as IconKey } from "@starter/shared";

type PracticeIconProps = {
  icon: IconKey;
  color: string;
  size?: number;
};

/**
 * Stroke icons on a 24px grid. Drawn rather than pulled from a font so they
 * scale and recolour cleanly, and never fall back to a tofu box.
 */
export function PracticeIcon({ icon, color, size = 20 }: PracticeIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (icon) {
    case "writing":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      );
    case "deepWork":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15.5 14" />
        </svg>
      );
    case "learning":
      return (
        <svg {...common}>
          <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H20v14H5.5A2.5 2.5 0 0 0 3 20.5z" />
          <line x1="8" y1="8.5" x2="15" y2="8.5" />
        </svg>
      );
    case "piano":
      return (
        <svg {...common}>
          <rect x="2.5" y="7" width="19" height="10" rx="1.6" />
          <line x1="7" y1="7" x2="7" y2="13" />
          <line x1="12" y1="7" x2="12" y2="13" />
          <line x1="17" y1="7" x2="17" y2="13" />
        </svg>
      );
    case "drawing":
      return (
        <svg {...common}>
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
  }
}
