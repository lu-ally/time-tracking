"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
  { href: "/time", label: "Zeit" },
  { href: "/leave", label: "Urlaub" },
  { href: "/settings", label: "Einstellungen" },
  { href: "/admin", label: "Admin", adminOnly: true }
]

export function TopNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      {items
        .filter((item) => (item.adminOnly ? isAdmin : true))
        .map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`btn ${isActive ? "btn-primary" : "btn-ghost"}`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          )
        })}
    </nav>
  )
}
