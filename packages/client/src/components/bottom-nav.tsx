"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/today", label: "Today" },
  { href: "/progress", label: "Progress" },
] as const;

function NavIcon({ href, active }: { href: string; active: boolean }) {
  const stroke = active ? "var(--glow)" : "var(--ink-faint)";
  const common = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (href === "/today") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
    );
  }
  if (href === "/rooms") {
    return (
      <svg {...common}>
        <path d="M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3.5" />
        <path d="M22 20v-2a4 4 0 0 0-3-3.87" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <line x1="4" y1="19" x2="4" y2="11" />
      <line x1="10" y1="19" x2="10" y2="5" />
      <line x1="16" y1="19" x2="16" y2="9" />
      <line x1="21" y1="19" x2="21" y2="14" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center border-t border-[#24202f] bg-[#191723] px-5 pt-3 pb-[max(1.6rem,env(safe-area-inset-bottom))]">
      {ITEMS.map((item) => {
        const active = pathname?.startsWith(item.href) ?? false;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`nav-${item.label.toLowerCase()}`}
            aria-current={active ? "page" : undefined}
            className="flex min-h-11 grow flex-col items-center gap-1.5"
          >
            <NavIcon href={item.href} active={active} />
            <span
              className={
                active
                  ? "text-[10.5px] font-medium text-glow"
                  : "text-[10.5px] text-ink-faint"
              }
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
