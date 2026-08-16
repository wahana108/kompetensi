import type { LucideIcon } from "lucide-react";
import { ClipboardCheck, LayoutDashboard, UserCheck } from "lucide-react";

export const DASHBOARD_ROUTES = {
  home: "/dashboard",
  penilaian: "/dashboard/penilaian",
  penilaianForm: (periodeId: string) => `/dashboard/penilaian/${periodeId}`,
  penilaianAtasan: "/dashboard/penilaian-atasan",
  penilaianAtasanForm: (employeeId: string) =>
    `/dashboard/penilaian-atasan/${employeeId}`,
} as const;

export type DashboardNavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  requiresSubordinates?: boolean;
};

export const DASHBOARD_NAV: DashboardNavLink[] = [
  {
    href: DASHBOARD_ROUTES.home,
    label: "Beranda",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: DASHBOARD_ROUTES.penilaian,
    label: "Penilaian Diri",
    icon: ClipboardCheck,
  },
  {
    href: DASHBOARD_ROUTES.penilaianAtasan,
    label: "Penilaian Atasan",
    icon: UserCheck,
    requiresSubordinates: true,
  },
];

export function isDashboardNavActive(
  pathname: string,
  href: string,
  exact?: boolean
) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getDashboardPageMeta(pathname: string): {
  title: string;
  description?: string;
} {
  if (pathname === DASHBOARD_ROUTES.home) {
    return {
      title: "Beranda",
      description: "Ringkasan akun pegawai",
    };
  }

  if (pathname === DASHBOARD_ROUTES.penilaian) {
    return {
      title: "Penilaian Diri",
      description: "Periode self assessment yang dapat diisi",
    };
  }

  if (pathname.startsWith(`${DASHBOARD_ROUTES.penilaian}/`)) {
    return {
      title: "Isi Penilaian",
      description: "Kuesioner penilaian diri",
    };
  }

  if (pathname === DASHBOARD_ROUTES.penilaianAtasan) {
    return {
      title: "Penilaian Atasan",
      description: "Nilai bawahan pada periode aktif",
    };
  }

  if (pathname.startsWith(`${DASHBOARD_ROUTES.penilaianAtasan}/`)) {
    return {
      title: "Nilai Bawahan",
      description: "Penilaian atasan dan rekomendasi",
    };
  }

  return { title: "Dashboard" };
}
