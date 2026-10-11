"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signOut } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string };

function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({
  eyebrow,
  links,
  children,
}: {
  eyebrow: string;
  links: NavLink[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setOpen(false)}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-semibold",
            isCurrent(pathname, link.href) ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-6xl">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-card p-4 md:block">
          <p className="text-lg font-bold text-primary">AquaOS</p>
          <p className="mt-1 text-sm text-muted-foreground">{eyebrow}</p>
          <div className="mt-6">{nav}</div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="md:hidden" onClick={() => setOpen(true)}>
                Menu
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary md:hidden">AquaOS</p>
                <p className="text-sm text-muted-foreground">{eyebrow}</p>
              </div>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </header>
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setOpen(false)}>
          <div
            className="h-full w-72 bg-card p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-lg font-bold text-primary">AquaOS</p>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">{eyebrow}</p>
            {nav}
          </div>
        </div>
      ) : null}
    </div>
  );
}
