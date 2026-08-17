import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  Medal,
  ScrollText,
  Target,
  Users,
} from "lucide-react";

export const ADMIN_ROUTES = {
  home: "/admin",
  unitKerja: "/admin/unit-kerja",
  unitKerjaNew: "/admin/unit-kerja/baru",
  unitKerjaEdit: (id: string) => `/admin/unit-kerja/${id}`,
  jabatan: "/admin/jabatan",
  jabatanNew: "/admin/jabatan/baru",
  jabatanEdit: (id: string) => `/admin/jabatan/${id}`,
  pangkat: "/admin/pangkat",
  pangkatNew: "/admin/pangkat/baru",
  pangkatEdit: (id: string) => `/admin/pangkat/${id}`,
  tusi: "/admin/tusi",
  tusiNew: "/admin/tusi/baru",
  tusiEdit: (id: string) => `/admin/tusi/${id}`,
  levelKompetensi: "/admin/level-kompetensi",
  levelKompetensiNew: "/admin/level-kompetensi/baru",
  levelKompetensiEdit: (id: string) => `/admin/level-kompetensi/${id}`,
  kompetensi: "/admin/kompetensi",
  kompetensiNew: "/admin/kompetensi/baru",
  kompetensiEdit: (id: string) => `/admin/kompetensi/${id}`,
  soal: "/admin/soal",
  soalNew: "/admin/soal/baru",
  soalEdit: (id: string) => `/admin/soal/${id}`,
  standarKompetensi: "/admin/standar-kompetensi",
  periode: "/admin/periode",
  periodeNew: "/admin/periode/baru",
  periodeEdit: (id: string) => `/admin/periode/${id}`,
  pengguna: "/admin/pengguna",
  penggunaEdit: (id: string) => `/admin/pengguna/${id}`,
  tna: "/admin/tna",
  tnaDetail: (id: string) => `/admin/tna/${id}`,
} as const;

export type AdminNavLink = {
  type: "link";
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type AdminNavGroup = {
  type: "group";
  label: string;
  items: Array<Omit<AdminNavLink, "type">>;
};

export type AdminNavItem = AdminNavLink | AdminNavGroup;

export const ADMIN_NAV: AdminNavItem[] = [
  {
    type: "link",
    href: ADMIN_ROUTES.home,
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    type: "link",
    href: ADMIN_ROUTES.pengguna,
    label: "Pengguna",
    icon: Users,
  },
  {
    type: "group",
    label: "Master Data",
    items: [
      {
        href: ADMIN_ROUTES.unitKerja,
        label: "Unit Kerja",
        icon: Building2,
      },
      {
        href: ADMIN_ROUTES.jabatan,
        label: "Jabatan",
        icon: Briefcase,
      },
      {
        href: ADMIN_ROUTES.pangkat,
        label: "Pangkat / Golongan",
        icon: Medal,
      },
      {
        href: ADMIN_ROUTES.tusi,
        label: "TUSI",
        icon: ClipboardList,
      },
      {
        href: ADMIN_ROUTES.levelKompetensi,
        label: "Level Kompetensi",
        icon: Gauge,
      },
      {
        href: ADMIN_ROUTES.kompetensi,
        label: "Kompetensi",
        icon: Target,
      },
      {
        href: ADMIN_ROUTES.soal,
        label: "Bank Soal",
        icon: CircleHelp,
      },
      {
        href: ADMIN_ROUTES.standarKompetensi,
        label: "Standar Kompetensi",
        icon: ScrollText,
      },
    ],
  },
  {
    type: "group",
    label: "Penilaian",
    items: [
      {
        href: ADMIN_ROUTES.periode,
        label: "Periode",
        icon: CalendarDays,
      },
      {
        href: ADMIN_ROUTES.tna,
        label: "Rekap TNA",
        icon: FileSpreadsheet,
      },
    ],
  },
];

export function isAdminNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getAdminPageMeta(pathname: string): {
  title: string;
  description?: string;
} {
  if (pathname === ADMIN_ROUTES.home) {
    return {
      title: "Dashboard",
      description: "Ringkasan panel administrasi",
    };
  }

  if (pathname === ADMIN_ROUTES.unitKerja) {
    return {
      title: "Unit Kerja",
      description: "Master data struktur organisasi",
    };
  }

  if (pathname === ADMIN_ROUTES.unitKerjaNew) {
    return {
      title: "Tambah Unit Kerja",
      description: "Buat unit kerja baru",
    };
  }

  if (pathname.startsWith(`${ADMIN_ROUTES.unitKerja}/`)) {
    return {
      title: "Edit Unit Kerja",
      description: "Ubah data unit kerja",
    };
  }

  if (pathname === ADMIN_ROUTES.jabatan) {
    return {
      title: "Jabatan",
      description: "Master data jabatan",
    };
  }

  if (pathname === ADMIN_ROUTES.jabatanNew) {
    return {
      title: "Tambah Jabatan",
      description: "Buat jabatan baru",
    };
  }

  if (pathname.startsWith(`${ADMIN_ROUTES.jabatan}/`)) {
    return {
      title: "Edit Jabatan",
      description: "Ubah data jabatan",
    };
  }

  if (pathname === ADMIN_ROUTES.pangkat) {
    return {
      title: "Pangkat / Golongan",
      description: "Master data kepangkatan",
    };
  }

  if (pathname === ADMIN_ROUTES.pangkatNew) {
    return {
      title: "Tambah Pangkat",
      description: "Buat pangkat / golongan baru",
    };
  }

  if (pathname.startsWith(`${ADMIN_ROUTES.pangkat}/`)) {
    return {
      title: "Edit Pangkat",
      description: "Ubah data pangkat / golongan",
    };
  }

  if (pathname === ADMIN_ROUTES.tusi) {
    return {
      title: "TUSI",
      description: "Tugas pokok dan fungsi",
    };
  }

  if (pathname === ADMIN_ROUTES.tusiNew) {
    return {
      title: "Tambah TUSI",
      description: "Buat tugas dan fungsi baru",
    };
  }

  if (pathname.startsWith(`${ADMIN_ROUTES.tusi}/`)) {
    return {
      title: "Edit TUSI",
      description: "Ubah tugas dan fungsi",
    };
  }

  if (pathname === ADMIN_ROUTES.levelKompetensi) {
    return {
      title: "Level Kompetensi",
      description: "Skala penilaian kompetensi",
    };
  }

  if (pathname === ADMIN_ROUTES.levelKompetensiNew) {
    return {
      title: "Tambah Level",
      description: "Buat level kompetensi baru",
    };
  }

  if (pathname.startsWith(`${ADMIN_ROUTES.levelKompetensi}/`)) {
    return {
      title: "Edit Level",
      description: "Ubah level kompetensi",
    };
  }

  if (pathname === ADMIN_ROUTES.kompetensi) {
    return {
      title: "Kompetensi",
      description: "Standar kompetensi dan dimensi",
    };
  }

  if (pathname === ADMIN_ROUTES.kompetensiNew) {
    return {
      title: "Tambah Kompetensi",
      description: "Buat standar kompetensi baru",
    };
  }

  if (pathname.startsWith(`${ADMIN_ROUTES.kompetensi}/`)) {
    return {
      title: "Edit Kompetensi",
      description: "Ubah standar kompetensi",
    };
  }

  if (pathname === ADMIN_ROUTES.soal) {
    return {
      title: "Bank Soal",
      description: "Kumpulan pertanyaan penilaian",
    };
  }

  if (pathname === ADMIN_ROUTES.soalNew) {
    return {
      title: "Tambah Soal",
      description: "Buat pertanyaan baru",
    };
  }

  if (pathname.startsWith(`${ADMIN_ROUTES.soal}/`)) {
    return {
      title: "Edit Soal",
      description: "Ubah pertanyaan",
    };
  }

  if (pathname === ADMIN_ROUTES.standarKompetensi) {
    return {
      title: "Standar Kompetensi",
      description: "Level target kompetensi per jabatan",
    };
  }

  if (pathname === ADMIN_ROUTES.periode) {
    return {
      title: "Periode Penilaian",
      description: "Jadwal self assessment",
    };
  }

  if (pathname === ADMIN_ROUTES.periodeNew) {
    return {
      title: "Tambah Periode",
      description: "Buat periode penilaian baru",
    };
  }

  if (pathname.startsWith(`${ADMIN_ROUTES.periode}/`)) {
    return {
      title: "Edit Periode",
      description: "Ubah periode penilaian",
    };
  }

  if (pathname === ADMIN_ROUTES.pengguna) {
    return {
      title: "Pengguna",
      description: "Kelola akun, penempatan, dan atasan",
    };
  }

  if (pathname.startsWith(`${ADMIN_ROUTES.pengguna}/`)) {
    return {
      title: "Edit Pengguna",
      description: "Ubah role dan penempatan",
    };
  }

  if (pathname === ADMIN_ROUTES.tna) {
    return {
      title: "Rekap TNA",
      description: "Ringkasan penilaian dan usulan pelatihan per periode",
    };
  }

  if (pathname.startsWith(`${ADMIN_ROUTES.tna}/`)) {
    return {
      title: "Detail Rekap TNA",
      description: "Daftar penilaian pegawai dan usulan pelatihan dari atasan",
    };
  }

  return { title: "Admin" };
}

