"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/b2b",    label: "B2B" },
  { href: "/b2c",    label: "B2C" },
  { href: "/farmer", label: "Farmers" },
];

export default function NavTabs() {
  const path = usePathname();
  return (
    <nav className="nav-tabs">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`nav-tab${path.startsWith(t.href) ? " active" : ""}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
