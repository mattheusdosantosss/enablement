"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/b2b", label: "B2B" },
  { href: "/b2c", label: "B2C" },
  { href: "/farmer", label: "Farmers" },
];

export default function Nav() {
  const path = usePathname();

  return (
    <header className="border-b border-brand-border bg-brand-surface sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-8 h-14">
        <span className="font-bold text-brand-orange tracking-wide text-sm uppercase mr-4">
          PSA · Comercial
        </span>
        <nav className="flex gap-1">
          {tabs.map((t) => {
            const active = path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-orange text-white"
                    : "text-brand-muted hover:text-brand-text hover:bg-white/5"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
