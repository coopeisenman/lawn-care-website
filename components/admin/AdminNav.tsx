"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Today" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/invoices", label: "Invoices" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Admin">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : ""}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
