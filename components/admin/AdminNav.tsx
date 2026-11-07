"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const LINKS = [
  { href: "/admin", label: "Today" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/tax", label: "Taxes" },
  { href: "/admin/requests", label: "Requests" },
];

export default function AdminNav({ newRequests = 0 }: { newRequests?: number }) {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null);

  // On phones the menu scrolls sideways; keep the current page's tab in view.
  useEffect(() => {
    const el = nav.current;
    const active = el?.querySelector<HTMLElement>("a.active");
    if (el && active) el.scrollLeft = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
  }, [path]);

  return (
    <nav className="admin-nav" aria-label="Admin" ref={nav}>
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            {l.label}
            {l.href === "/admin/requests" && newRequests > 0 && (
              <span className="nav-count" aria-label={`${newRequests} new`}>{newRequests}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
