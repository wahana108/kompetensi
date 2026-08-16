"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getRoleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import {
  ADMIN_NAV,
  getAdminPageMeta,
  isAdminNavActive,
} from "@/components/admin/nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const page = getAdminPageMeta(pathname);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sidebarOpen]);

  const initials = getInitials(profile?.displayName ?? "Admin");

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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/admin" className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold tracking-tight">
              Admin Panel
            </span>
            <span className="truncate text-xs text-muted-foreground">
              TNA Kompetensi
            </span>
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

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {ADMIN_NAV.map((item) => {
            if (item.type === "link") {
              return (
                <AdminNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isAdminNavActive(pathname, item.href, item.exact)}
                />
              );
            }

            return (
              <div key={item.label} className="space-y-1">
                <p className="px-2.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                  {item.label}
                </p>
                {item.items.map((child) => (
                  <AdminNavLink
                    key={child.href}
                    href={child.href}
                    label={child.label}
                    icon={child.icon}
                    active={isAdminNavActive(pathname, child.href, child.exact)}
                  />
                ))}
              </div>
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

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 gap-2 px-1.5 sm:px-2"
                />
              }
            >
              <Avatar size="sm">
                {profile?.photoURL ? (
                  <AvatarImage src={profile.photoURL} alt={profile.displayName} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[140px] truncate text-sm sm:inline">
                {profile?.displayName}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <span className="truncate font-medium text-foreground">
                      {profile?.displayName}
                    </span>
                    <span className="truncate text-xs font-normal">
                      {profile?.email}
                    </span>
                    <Badge variant="secondary" className="w-fit">
                      {getRoleLabel(profile?.role)}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href="/dashboard" />}
              >
                <UserRound />
                Dashboard pegawai
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void signOut()}>
                <LogOut />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "AD";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
