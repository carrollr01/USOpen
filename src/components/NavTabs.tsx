"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/me", label: "My Team" },
  { href: "/league", label: "League" },
];

export function NavTabs() {
  const path = usePathname();
  return (
    <nav className="flex gap-6">
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-1 py-2.5 text-sm font-medium transition ${
              active
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
