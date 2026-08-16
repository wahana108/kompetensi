"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { resolveAreaGuard, type GuardArea } from "@/lib/auth/guards";
import {
  LOGIN_PATH,
  safeNextPath,
  signOutCurrentUser,
} from "@/lib/auth/session";

export function AuthGate({
  area,
  children,
}: {
  area: GuardArea;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<StatusMessage>Memuat sesi...</StatusMessage>}>
      <AuthGateInner area={area}>{children}</AuthGateInner>
    </Suspense>
  );
}

function AuthGateInner({
  area,
  children,
}: {
  area: GuardArea;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, loading, configured, error } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!configured && area !== "guest") {
      router.replace(LOGIN_PATH);
      return;
    }

    if (profile && !profile.isActive) {
      void signOutCurrentUser();
      router.replace(`${LOGIN_PATH}?error=inactive`);
      return;
    }

    const result = resolveAreaGuard(area, profile);
    if (result.ok) {
      return;
    }

    if (area === "guest" && profile) {
      const next = searchParams.get("next");
      router.replace(safeNextPath(next, profile.role));
      return;
    }

    if (result.redirectTo === LOGIN_PATH) {
      const next = pathname || DASHBOARD_FALLBACK;
      router.replace(`${LOGIN_PATH}?next=${encodeURIComponent(next)}`);
      return;
    }

    router.replace(result.redirectTo);
  }, [area, configured, loading, pathname, profile, router, searchParams]);

  if (!configured && area !== "guest") {
    return <StatusMessage>Firebase belum dikonfigurasi.</StatusMessage>;
  }

  if (loading) {
    return <StatusMessage>Memuat sesi...</StatusMessage>;
  }

  if (error && area !== "guest") {
    return <StatusMessage>{error}</StatusMessage>;
  }

  const result = resolveAreaGuard(area, profile);
  if (!result.ok) {
    return <StatusMessage>Mengalihkan...</StatusMessage>;
  }

  return children;
}

const DASHBOARD_FALLBACK = "/dashboard";

function StatusMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
