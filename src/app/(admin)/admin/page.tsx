"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  Medal,
  Plus,
  Target,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAssessmentPeriodList } from "@/hooks/use-assessment-period";
import { useJabatanList } from "@/hooks/use-jabatan";
import { usePenggunaList } from "@/hooks/use-pengguna";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { useKompetensiLevelList } from "@/hooks/use-kompetensi-level";
import { usePangkatList } from "@/hooks/use-pangkat";
import { useQuestionList } from "@/hooks/use-question";
import { useTusiList } from "@/hooks/use-tusi";
import { useUnitKerjaList } from "@/hooks/use-unit-kerja";
import { getRoleLabel } from "@/lib/auth/roles";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const { units, loading, error } = useUnitKerjaList();
  const jabatan = useJabatanList();
  const pangkat = usePangkatList();
  const tusi = useTusiList();
  const kompetensi = useKompetensiList();
  const levels = useKompetensiLevelList();
  const questions = useQuestionList();
  const periods = useAssessmentPeriodList();
  const users = usePenggunaList();

  if (!profile) {
    return null;
  }

  const unitActive = units.filter((unit) => unit.isActive).length;
  const jabatanActive = jabatan.items.filter((item) => item.isActive).length;
  const pangkatActive = pangkat.items.filter((item) => item.isActive).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selamat datang, {profile.displayName}</CardTitle>
          <CardDescription>
            Panel ini untuk mengelola data master, bank soal, dan periode
            penilaian.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">{getRoleLabel(profile.role)}</Badge>
          <span className="text-muted-foreground">{profile.email}</span>
        </CardContent>
      </Card>

      {error ||
      jabatan.error ||
      pangkat.error ||
      tusi.error ||
      kompetensi.error ||
      levels.error ||
      questions.error ||
      periods.error ||
      users.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ??
            jabatan.error ??
            pangkat.error ??
            tusi.error ??
            kompetensi.error ??
            levels.error ??
            questions.error ??
            periods.error ??
            users.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Unit kerja"
          value={loading ? "…" : String(units.length)}
          hint={loading ? "Memuat..." : `${unitActive} aktif`}
        />
        <StatCard
          label="Jabatan"
          value={jabatan.loading ? "…" : String(jabatan.items.length)}
          hint={jabatan.loading ? "Memuat..." : `${jabatanActive} aktif`}
        />
        <StatCard
          label="Pangkat / Golongan"
          value={pangkat.loading ? "…" : String(pangkat.items.length)}
          hint={pangkat.loading ? "Memuat..." : `${pangkatActive} aktif`}
        />
        <StatCard
          label="TUSI"
          value={tusi.loading ? "…" : String(tusi.items.length)}
          hint={
            tusi.loading
              ? "Memuat..."
              : `${tusi.items.filter((item) => item.isActive).length} aktif`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleCard
          icon={Building2}
          title="Unit Kerja"
          description="Struktur organisasi hierarkis."
          countLabel={
            loading ? "Memuat..." : `${units.length} unit`
          }
          listHref={ADMIN_ROUTES.unitKerja}
          createHref={ADMIN_ROUTES.unitKerjaNew}
          createLabel="Tambah unit"
        />
        <ModuleCard
          icon={Briefcase}
          title="Jabatan"
          description="Nama, kode, dan eselon opsional."
          countLabel={
            jabatan.loading ? "Memuat..." : `${jabatan.items.length} jabatan`
          }
          listHref={ADMIN_ROUTES.jabatan}
          createHref={ADMIN_ROUTES.jabatanNew}
          createLabel="Tambah jabatan"
        />
        <ModuleCard
          icon={Medal}
          title="Pangkat / Golongan"
          description="Nama, golongan, dan urutan."
          countLabel={
            pangkat.loading ? "Memuat..." : `${pangkat.items.length} pangkat`
          }
          listHref={ADMIN_ROUTES.pangkat}
          createHref={ADMIN_ROUTES.pangkatNew}
          createLabel="Tambah pangkat"
        />
        <ModuleCard
          icon={ClipboardList}
          title="TUSI"
          description="Tugas pokok dan fungsi per unit kerja."
          countLabel={
            tusi.loading ? "Memuat..." : `${tusi.items.length} TUSI`
          }
          listHref={ADMIN_ROUTES.tusi}
          createHref={ADMIN_ROUTES.tusiNew}
          createLabel="Tambah TUSI"
        />
        <ModuleCard
          icon={Gauge}
          title="Level Kompetensi"
          description="Skala penilaian global."
          countLabel={
            levels.loading ? "Memuat..." : `${levels.items.length} level`
          }
          listHref={ADMIN_ROUTES.levelKompetensi}
          createHref={ADMIN_ROUTES.levelKompetensiNew}
          createLabel="Tambah level"
        />
        <ModuleCard
          icon={Target}
          title="Kompetensi"
          description="Standar per dimensi PK/Sikap."
          countLabel={
            kompetensi.loading
              ? "Memuat..."
              : `${kompetensi.items.length} kompetensi`
          }
          listHref={ADMIN_ROUTES.kompetensi}
          createHref={ADMIN_ROUTES.kompetensiNew}
          createLabel="Tambah kompetensi"
        />
        <ModuleCard
          icon={CircleHelp}
          title="Bank Soal"
          description="Pertanyaan penilaian, prioritas skala."
          countLabel={
            questions.loading
              ? "Memuat..."
              : `${questions.items.length} soal`
          }
          listHref={ADMIN_ROUTES.soal}
          createHref={ADMIN_ROUTES.soalNew}
          createLabel="Tambah soal"
        />
        <ModuleCard
          icon={CalendarDays}
          title="Periode Penilaian"
          description="Jadwal self assessment pegawai."
          countLabel={
            periods.loading
              ? "Memuat..."
              : `${periods.items.length} periode`
          }
          listHref={ADMIN_ROUTES.periode}
          createHref={ADMIN_ROUTES.periodeNew}
          createLabel="Tambah periode"
        />
        <ModuleCard
          icon={Users}
          title="Pengguna"
          description="Role, unit, jabatan, atasan, dan TUSI."
          countLabel={
            users.loading ? "Memuat..." : `${users.items.length} pengguna`
          }
          listHref={ADMIN_ROUTES.pengguna}
        />
        <ModuleCard
          icon={FileSpreadsheet}
          title="Rekap TNA"
          description="Hasil penilaian pegawai & usulan pelatihan."
          countLabel="Buka rekap per periode"
          listHref={ADMIN_ROUTES.tna}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function ModuleCard({
  icon: Icon,
  title,
  description,
  countLabel,
  listHref,
  createHref,
  createLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  countLabel: string;
  listHref: string;
  createHref?: string;
  createLabel?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
            <p className="mt-1 text-xs text-muted-foreground">{countLabel}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href={listHref} className={buttonVariants()}>
          Buka daftar
        </Link>
        {createHref && createLabel ? (
          <Link href={createHref} className={buttonVariants({ variant: "outline" })}>
            <Plus />
            {createLabel}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
