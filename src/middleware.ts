import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_ROLE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { canAccessAdmin } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

const AUTH_PAGES = new Set(["/login", "/register"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
  const role = request.cookies.get(AUTH_ROLE_COOKIE_NAME)?.value as
    | UserRole
    | undefined;

  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_PAGES.has(pathname) && hasSession) {
    const target = request.nextUrl.clone();
    target.pathname = canAccessAdmin(role) ? "/admin" : "/dashboard";
    target.search = "";
    return NextResponse.redirect(target);
  }

  if (pathname.startsWith("/admin") && hasSession && role && !canAccessAdmin(role)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

function isProtectedPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
