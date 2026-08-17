"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useAssessmentPeriodList } from "@/hooks/use-assessment-period";
import { useEmployeeCompetencyScores } from "@/hooks/use-competency-score";
import { useJabatanList } from "@/hooks/use-jabatan";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { usePenggunaList } from "@/hooks/use-pengguna";
import { useTnaEmployeeDetails } from "@/hooks/use-tna";
import { useUnitKerjaList } from "@/hooks/use-unit-kerja";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getKompetensiDimensiLabel } from "@/lib/services/kompetensi";
import { generateTnaRecap, mapTnaError, type TnaEmployeeDetail } from "@/lib/services/tna";
import { cn } from "@/lib/utils";
import type { Jabatan, UnitKerja, UserProfile } from "@/types";

type StatusFilter =
  | "all"
  | "complete"
  | "pending_self"
  | "pending_supervisor"
  | "has_proposal";

export default function TnaDetailPage({
  params,
}: {
  params: Promise<{ periodeId: string }>;
}) {
  const { periodeId } = use(params);
  const { profile } = useAuth();
  const periods = useAssessmentPeriodList();
  const units = useUnitKerjaList();
  const jabatan = useJabatanList();
  const allUsers = usePenggunaList();
  const { items, loading, error, reload } = useTnaEmployeeDetails(periodeId);

  const [query, setQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<TnaEmployeeDetail | null>(null);

  const currentPeriod = periods.items.find((p) => p.id === periodeId) ?? null;

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search Query (Name or Email)
      const needle = query.trim().toLowerCase();
      const matchSearch =
        !needle ||
        item.employee.displayName.toLowerCase().includes(needle) ||
        item.employee.email.toLowerCase().includes(needle);

      // 2. Unit Kerja Filter
      const unitId =
        item.employee.unitKerjaId ??
        item.selfAssessment?.assignment?.unitKerjaId ??
        item.supervisorAssessment?.assignment?.unitKerjaId;
      const matchUnit = selectedUnit === "all" || unitId === selectedUnit;

      // 3. Status Filter
      const selfDone = item.selfAssessment?.status === "submitted";
      const supDone = item.supervisorAssessment?.status === "submitted";
      const hasProposal = Boolean(
        item.supervisorAssessment?.recommendationNote &&
          item.supervisorAssessment.recommendationNote.trim() !== ""
      );

      let matchStatus = true;
      if (statusFilter === "complete") {
        matchStatus = selfDone && supDone;
      } else if (statusFilter === "pending_self") {
        matchStatus = !selfDone;
      } else if (statusFilter === "pending_supervisor") {
        matchStatus = !supDone;
      } else if (statusFilter === "has_proposal") {
        matchStatus = hasProposal;
      }

      return matchSearch && matchUnit && matchStatus;
    });
  }, [items, query, selectedUnit, statusFilter]);

  // Statistik ringkas periode ini
  const totalEmployees = items.length;
  const selfSubmitted = items.filter(
    (i) => i.selfAssessment?.status === "submitted"
  ).length;
  const supervisorSubmitted = items.filter(
    (i) => i.supervisorAssessment?.status === "submitted"
  ).length;
  const proposalCount = items.filter(
    (i) =>
      i.supervisorAssessment?.status === "submitted" &&
      i.supervisorAssessment?.recommendationNote &&
      i.supervisorAssessment.recommendationNote.trim() !== ""
  ).length;

  async function handleGenerate() {
    if (!profile) {
      toast.error("Sesi pengguna tidak valid.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateTnaRecap(periodeId, profile.id);
      toast.success(
        `Rekap TNA berhasil digenerate! (${result.proposalCount} usulan pelatihan diproses untuk ${result.recapCount} unit).`
      );
      await reload();
    } catch (err) {
      toast.error(mapTnaError(err));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={ADMIN_ROUTES.tna}
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
          >
            <ArrowLeft />
            <span className="sr-only">Kembali ke Rekap TNA</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {currentPeriod ? currentPeriod.name : "Detail Rekap TNA"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentPeriod
                ? `Tahun ${currentPeriod.year} • ${currentPeriod.startsAt} s.d. ${currentPeriod.endsAt}`
                : "Memuat info periode..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void reload()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Muat Ulang
          </Button>
          <Button
            size="sm"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || supervisorSubmitted === 0}
            title={
              supervisorSubmitted === 0
                ? "Memerlukan minimal 1 penilaian atasan yang sudah diserahkan."
                : "Generate / Perbarui dokumen usulan pelatihan dan rekap TNA"
            }
          >
            <Sparkles className={isGenerating ? "animate-spin" : ""} />
            {isGenerating ? "Memproses..." : "Generate Rekap TNA"}
          </Button>
        </div>
      </div>

      {/* Ringkasan Statistik Kartu */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Pegawai"
          value={loading ? "…" : String(totalEmployees)}
          hint="Terdaftar dalam sistem"
        />
        <StatCard
          label="Self Assessment Selesai"
          value={loading ? "…" : `${selfSubmitted} / ${totalEmployees}`}
          hint={
            totalEmployees > 0
              ? `${Math.round((selfSubmitted / totalEmployees) * 100)}% selesai`
              : "0%"
          }
        />
        <StatCard
          label="Penilaian Atasan Selesai"
          value={loading ? "…" : `${supervisorSubmitted} / ${totalEmployees}`}
          hint={
            totalEmployees > 0
              ? `${Math.round((supervisorSubmitted / totalEmployees) * 100)}% selesai`
              : "0%"
          }
        />
        <StatCard
          label="Usulan Pelatihan"
          value={loading ? "…" : String(proposalCount)}
          hint="Rekomendasi dari atasan"
        />
      </div>

      {/* Filter & Tabel Data Pegawai */}
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>Daftar Penilaian Pegawai</CardTitle>
            <CardDescription>
              Status pengisian kuesioner mandiri, evaluasi 3 dimensi dari atasan langsung, dan usulan diklat/pelatihan.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama atau email pegawai..."
                className="pl-8"
              />
            </div>

            {/* Filter Unit Kerja */}
            <Select
              value={selectedUnit}
              onValueChange={(val) => {
                if (val) setSelectedUnit(val);
              }}
              items={[
                { value: "all", label: "Semua Unit Kerja" },
                ...units.units.map((u) => ({
                  value: u.id,
                  label: u.name,
                })),
              ]}
            >
              <SelectTrigger className="w-full md:w-56">
                <Building2 className="mr-1.5 size-4 text-muted-foreground" />
                <SelectValue placeholder="Semua Unit Kerja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Unit Kerja</SelectItem>
                {units.units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Status */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                if (val) setStatusFilter(val as StatusFilter);
              }}
              items={[
                { value: "all", label: "Semua Status" },
                { value: "complete", label: "Lengkap (Self + Atasan)" },
                { value: "pending_self", label: "Belum Self Assessment" },
                { value: "pending_supervisor", label: "Belum Dinilai Atasan" },
                { value: "has_proposal", label: "Ada Usulan Pelatihan" },
              ]}
            >
              <SelectTrigger className="w-full md:w-52">
                <Filter className="mr-1.5 size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="complete">Lengkap (Self + Atasan)</SelectItem>
                <SelectItem value="pending_self">Belum Self Assessment</SelectItem>
                <SelectItem value="pending_supervisor">Belum Dinilai Atasan</SelectItem>
                <SelectItem value="has_proposal">Ada Usulan Pelatihan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Memuat data pegawai..."
              : `Menampilkan ${visibleItems.length} dari ${items.length} pegawai`}
          </p>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Memuat data penilaian pegawai...
            </p>
          ) : visibleItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? "Tidak ada data pegawai pada periode ini."
                : "Tidak ada pegawai yang sesuai dengan filter."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-48">Pegawai</TableHead>
                    <TableHead className="min-w-36">Unit & Jabatan</TableHead>
                    <TableHead className="text-center">Self Assessment</TableHead>
                    <TableHead className="text-center">Penilaian Atasan</TableHead>
                    <TableHead className="min-w-44 text-center">
                      Skor Dimensi Atasan
                    </TableHead>
                    <TableHead className="min-w-56">Usulan Pelatihan</TableHead>
                    <TableHead className="w-16 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleItems.map((item) => (
                    <EmployeeTnaRow
                      key={item.employee.id}
                      item={item}
                      units={units.units}
                      jabatan={jabatan.items}
                      users={allUsers.items}
                      onViewDetail={() => setSelectedDetail(item)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detail Rekap Pegawai */}
      {selectedDetail ? (
        <EmployeeDetailDialog
          item={selectedDetail}
          periodId={periodeId}
          units={units.units}
          jabatan={jabatan.items}
          users={allUsers.items}
          open={Boolean(selectedDetail)}
          onOpenChange={(open) => {
            if (!open) setSelectedDetail(null);
          }}
        />
      ) : null}
    </div>
  );
}

function EmployeeTnaRow({
  item,
  units,
  jabatan,
  users,
  onViewDetail,
}: {
  item: TnaEmployeeDetail;
  units: UnitKerja[];
  jabatan: Jabatan[];
  users: UserProfile[];
  onViewDetail: () => void;
}) {
  const unitId =
    item.employee.unitKerjaId ??
    item.selfAssessment?.assignment?.unitKerjaId ??
    item.supervisorAssessment?.assignment?.unitKerjaId;
  const unit = units.find((u) => u.id === unitId);

  const jabatanId =
    item.employee.jabatanId ??
    item.selfAssessment?.assignment?.jabatanId ??
    item.supervisorAssessment?.assignment?.jabatanId;
  const pos = jabatan.find((j) => j.id === jabatanId);

  const supervisor = users.find(
    (u) =>
      u.id === item.supervisorAssessment?.assessorId ||
      u.id === item.employee.supervisorId
  );

  const selfStatus = item.selfAssessment?.status;
  const supStatus = item.supervisorAssessment?.status;
  const scores = item.supervisorAssessment?.dimensionScores;
  const overall = item.supervisorAssessment?.overallScore;
  const note = item.supervisorAssessment?.recommendationNote?.trim();

  return (
    <TableRow>
      {/* Kolom 1: Profil Pegawai */}
      <TableCell>
        <p className="font-medium text-foreground">{item.employee.displayName}</p>
        <p className="text-xs text-muted-foreground">{item.employee.email}</p>
      </TableCell>

      {/* Kolom 2: Penempatan */}
      <TableCell>
        <p className="text-xs font-medium text-foreground">{unit?.name ?? "—"}</p>
        <p className="text-[11px] text-muted-foreground">{pos?.name ?? "—"}</p>
      </TableCell>

      {/* Kolom 3: Status Self Assessment */}
      <TableCell className="text-center">
        {selfStatus === "submitted" ? (
          <Badge variant="secondary" className="gap-1 border-green-600/30 text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-300">
            <CheckCircle2 className="size-3" />
            Selesai
          </Badge>
        ) : selfStatus === "draft" ? (
          <Badge variant="outline" className="gap-1 border-amber-600/30 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="size-3" />
            Draft
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Belum Mengisi
          </Badge>
        )}
      </TableCell>

      {/* Kolom 4: Status Penilaian Atasan */}
      <TableCell className="text-center">
        {supStatus === "submitted" ? (
          <div className="space-y-0.5">
            <Badge variant="secondary" className="gap-1 border-blue-600/30 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300">
              <CheckCircle2 className="size-3" />
              Selesai
            </Badge>
            {supervisor ? (
              <p className="text-[10px] text-muted-foreground truncate max-w-28 mx-auto">
                Oleh: {supervisor.displayName}
              </p>
            ) : null}
          </div>
        ) : supStatus === "draft" ? (
          <Badge variant="outline" className="gap-1 border-amber-600/30 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="size-3" />
            Draft
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Belum Dinilai
          </Badge>
        )}
      </TableCell>

      {/* Kolom 5: Skor Dimensi */}
      <TableCell>
        {supStatus === "submitted" && scores ? (
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Pengetahuan:</span>
              <span className="font-semibold tabular-nums">
                {scores.pengetahuan ?? "—"} / 5
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Keterampilan:</span>
              <span className="font-semibold tabular-nums">
                {scores.keterampilan ?? "—"} / 5
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Sikap Perilaku:</span>
              <span className="font-semibold tabular-nums">
                {scores.sikap_perilaku ?? "—"} / 5
              </span>
            </div>
            {overall !== null ? (
              <div className="pt-0.5 border-t flex items-center justify-between font-medium text-primary">
                <span>Rata-rata:</span>
                <span className="tabular-nums font-bold">{overall}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">—</p>
        )}
      </TableCell>

      {/* Kolom 6: Usulan Pelatihan dari Atasan */}
      <TableCell>
        {note ? (
          <div className="rounded-md bg-muted/60 p-2 text-xs text-foreground line-clamp-3">
            {note}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
      </TableCell>

      {/* Kolom 7: Aksi */}
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={onViewDetail}>
          Detail
        </Button>
      </TableCell>
    </TableRow>
  );
}

function EmployeeDetailDialog({
  item,
  periodId,
  units,
  jabatan,
  users,
  open,
  onOpenChange,
}: {
  item: TnaEmployeeDetail;
  periodId: string;
  units: UnitKerja[];
  jabatan: Jabatan[];
  users: UserProfile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const unitId =
    item.employee.unitKerjaId ??
    item.selfAssessment?.assignment?.unitKerjaId ??
    item.supervisorAssessment?.assignment?.unitKerjaId;
  const unit = units.find((u) => u.id === unitId);

  const jabatanId =
    item.employee.jabatanId ??
    item.selfAssessment?.assignment?.jabatanId ??
    item.supervisorAssessment?.assignment?.jabatanId;
  const pos = jabatan.find((j) => j.id === jabatanId);

  const supervisor = users.find(
    (u) =>
      u.id === item.supervisorAssessment?.assessorId ||
      u.id === item.employee.supervisorId
  );

  const scores = item.supervisorAssessment?.dimensionScores;
  const note = item.supervisorAssessment?.recommendationNote?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg space-y-4">
        <DialogHeader>
          <DialogTitle>Detail Penilaian & Usulan Pelatihan</DialogTitle>
          <DialogDescription>
            Informasi lengkap penilaian kompetensi pegawai.
          </DialogDescription>
        </DialogHeader>

        {/* Profil Singkat */}
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nama Pegawai:</span>
            <span className="font-semibold text-foreground">
              {item.employee.displayName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span>{item.employee.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit Kerja:</span>
            <span>{unit?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jabatan:</span>
            <span>{pos?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Atasan Langsung:</span>
            <span>{supervisor?.displayName ?? "—"}</span>
          </div>
        </div>

        {/* Status Self Assessment */}
        <div className="space-y-1.5 text-xs">
          <p className="font-semibold text-foreground">Self Assessment</p>
          <div className="flex items-center justify-between rounded-md border p-2">
            <span>Status Pengisian</span>
            <Badge
              variant={
                item.selfAssessment?.status === "submitted"
                  ? "default"
                  : "secondary"
              }
            >
              {item.selfAssessment?.status === "submitted"
                ? "Selesai Dikirim"
                : item.selfAssessment?.status === "draft"
                  ? "Draft"
                  : "Belum Mengisi"}
            </Badge>
          </div>
        </div>

        {/* Evaluasi Atasan 3 Dimensi */}
        <div className="space-y-1.5 text-xs">
          <p className="font-semibold text-foreground">
            Penilaian Atasan (3 Dimensi)
          </p>
          {item.supervisorAssessment?.status === "submitted" && scores ? (
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensi Pengetahuan:</span>
                <span className="font-semibold">{scores.pengetahuan ?? "—"} / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensi Keterampilan:</span>
                <span className="font-semibold">{scores.keterampilan ?? "—"} / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensi Sikap & Perilaku:</span>
                <span className="font-semibold">{scores.sikap_perilaku ?? "—"} / 5</span>
              </div>
              <div className="pt-2 border-t flex justify-between font-bold text-primary text-sm">
                <span>Skor Rata-rata:</span>
                <span>{item.supervisorAssessment.overallScore ?? "—"}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-md border p-3 text-center text-muted-foreground">
              {item.supervisorAssessment?.status === "draft"
                ? "Atasan sedang mengisi draft penilaian."
                : "Belum ada penilaian dari atasan."}
            </div>
          )}
        </div>

        {/* Analisis Gap Kompetensi (hasil hitung sistem) */}
        <CompetencyGapSection periodId={periodId} employee={item.employee} />

        {/* Usulan Pelatihan */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-foreground">Usulan Pelatihan</p>
            <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
              Input manual atasan
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Teks bebas yang ditulis atasan saat menilai — bukan hasil hitung sistem.
          </p>
          <div className="rounded-md border p-3 bg-muted/20">
            {note ? (
              <p className="text-foreground whitespace-pre-wrap">{note}</p>
            ) : (
              <p className="text-muted-foreground italic">
                Tidak ada rekomendasi pelatihan tertulis dari atasan.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompetencyGapSection({
  periodId,
  employee,
}: {
  periodId: string;
  employee: UserProfile;
}) {
  const { items, loading, error } = useEmployeeCompetencyScores(periodId, employee);
  const kompetensi = useKompetensiList();

  const kompetensiById = useMemo(
    () => new Map(kompetensi.items.map((entry) => [entry.id, entry])),
    [kompetensi.items]
  );

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0)),
    [items]
  );

  const busy = loading || kompetensi.loading;

  return (
    <div className="space-y-1.5 text-xs">
      <p className="font-semibold text-foreground">Analisis Gap Kompetensi</p>
      {busy ? (
        <div className="rounded-md border p-3 text-center text-muted-foreground">
          Menghitung gap kompetensi...
        </div>
      ) : error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
          {error}
        </p>
      ) : sorted.length === 0 ? (
        <div className="rounded-md border p-3 text-center text-muted-foreground">
          Belum bisa dianalisis: pegawai belum menjawab soal skala (likert)
          untuk kompetensi yang ada di Standar Kompetensi jabatannya, atau
          jabatannya belum punya Standar Kompetensi.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kompetensi</TableHead>
                <TableHead>Dimensi</TableHead>
                <TableHead className="text-center">Standar</TableHead>
                <TableHead className="text-center">Skor Tercapai</TableHead>
                <TableHead className="text-center">Gap</TableHead>
                <TableHead className="text-center">Butuh Pelatihan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((score) => {
                const entry = kompetensiById.get(score.kompetensiId);

                return (
                  <TableRow
                    key={score.kompetensiId}
                    className={cn(
                      score.butuhPelatihan && "bg-destructive/10 dark:bg-destructive/15"
                    )}
                  >
                    <TableCell className="font-medium text-foreground">
                      {entry?.name ?? score.kompetensiId}
                    </TableCell>
                    <TableCell>
                      {entry ? getKompetensiDimensiLabel(entry.dimensi) : "—"}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {score.requiredLevel}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {(score.actualLevel ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums font-semibold">
                      {(score.gap ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {score.butuhPelatihan ? (
                        <Badge variant="destructive">Ya</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Tidak
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
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
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-xs">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
