"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Shield, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useHasSubordinates } from "@/hooks/use-subordinates";
import { canAccessAdmin, getRoleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_NAV,
  getDashboardPageMeta,
  isDashboardNavActive,
} from "@/components/dashboard/nav";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const hasSubordinates = useHasSubordinates(profile?.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const page = getDashboardPageMeta(pathname);
  const navItems = DASHBOARD_NAV.filter(
    (item) => !item.requiresSubordinates || hasSubordinates
  );

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="min-w-0">
            <BrandMark title="Pegawai" />
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X />
            <span className="sr-only">Tutup sidebar</span>
          </Button>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isDashboardNavActive(pathname, item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate px-1 text-xs text-muted-foreground">
            {profile?.displayName}
          </p>
          <p className="truncate px-1 text-[11px] text-muted-foreground">
            {getRoleLabel(profile?.role)}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu />
            <span className="sr-only">Buka menu</span>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-medium">{page.title}</h1>
            {page.description ? (
              <p className="truncate text-xs text-muted-foreground">
                {page.description}
              </p>
            ) : null}
          </div>
          {profile && canAccessAdmin(profile.role) ? (
            <Link
              href="/admin"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Shield />
              Admin
            </Link>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
          >
            <LogOut />
            Keluar
          </Button>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
