"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useTnaPeriodSummaries } from "@/hooks/use-tna";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPeriodStatusLabel } from "@/lib/services/assessment-period";
import { generateTnaRecap, mapTnaError, type TnaPeriodSummary } from "@/lib/services/tna";

export default function TnaListPage() {
  const { profile } = useAuth();
  const { items, loading, error, reload } = useTnaPeriodSummaries();
  const [query, setQuery] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const visibleItems = useMemo(
    () => filterSummaries(items, query),
    [items, query]
  );

  const totalProposals = items.reduce((sum, item) => sum + item.proposalCount, 0);
  const totalSelf = items.reduce((sum, item) => sum + item.selfSubmittedCount, 0);
  const totalSup = items.reduce((sum, item) => sum + item.supervisorSubmittedCount, 0);

  async function handleGenerate(periodId: string, periodName: string) {
    if (!profile) {
      toast.error("Sesi pengguna tidak valid.");
      return;
    }

    setGeneratingId(periodId);
    try {
      const result = await generateTnaRecap(periodId, profile.id);
      toast.success(
        `Rekap TNA "${periodName}" berhasil dibuat! (${result.proposalCount} usulan pelatihan, ${result.recapCount} rekap unit).`
      );
      await reload();
    } catch (err) {
      toast.error(mapTnaError(err));
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              <CardTitle>Rekap Training Needs Analysis (TNA)</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Ringkasan hasil evaluasi diri pegawai, penilaian atasan, dan usulan program pelatihan per periode.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void reload()}
            disabled={loading}
            className="self-start"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Muat Ulang
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ringkasan Statistik Global */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox
              label="Total Periode"
              value={loading ? "…" : String(items.length)}
              hint={`${items.filter((i) => i.period.status === "active").length} aktif`}
            />
            <StatBox
              label="Self Assessment Selesai"
              value={loading ? "…" : String(totalSelf)}
              hint="Dari seluruh periode"
            />
            <StatBox
              label="Penilaian Atasan Selesai"
              value={loading ? "…" : String(totalSup)}
              hint="Telah dievaluasi atasan"
            />
            <StatBox
              label="Usulan Pelatihan"
              value={loading ? "…" : String(totalProposals)}
              hint="Rekomendasi tertulis"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama periode atau tahun..."
                className="pl-8"
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Memuat data rekap TNA...
            </p>
          ) : visibleItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? "Belum ada periode penilaian. Buat periode penilaian terlebih dahulu."
                : "Tidak ada periode yang cocok dengan pencarian."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status Periode</TableHead>
                    <TableHead className="text-center">Self Assessment</TableHead>
                    <TableHead className="text-center">Penilaian Atasan</TableHead>
                    <TableHead className="text-center">Usulan Pelatihan</TableHead>
                    <TableHead>Status Rekap TNA</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleItems.map((item) => {
                    const isBusy = generatingId === item.period.id;
                    const canGenerate = item.supervisorSubmittedCount > 0;

                    return (
                      <TableRow key={item.period.id}>
                        <TableCell>
                          <p className="font-medium">{item.period.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="size-3.5" />
                            <span>
                              {item.period.startsAt} s.d. {item.period.endsAt}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.period.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {getPeriodStatusLabel(item.period.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          <span className="font-medium text-foreground">
                            {item.selfSubmittedCount}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            / {item.totalPegawai}
                          </span>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          <span className="font-medium text-foreground">
                            {item.supervisorSubmittedCount}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            / {item.totalPegawai}
                          </span>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          <Badge variant="outline" className="font-medium">
                            {item.proposalCount} Usulan
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.isGenerated ? (
                            <div className="space-y-0.5">
                              <Badge variant="secondary" className="gap-1 border-green-600/30 text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-300">
                                <CheckCircle2 className="size-3" />
                                Sudah Digenerate
                              </Badge>
                              {item.generatedAt ? (
                                <p className="text-[11px] text-muted-foreground">
                                  {new Date(item.generatedAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Belum Digenerate
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isBusy || !canGenerate}
                              onClick={() => void handleGenerate(item.period.id, item.period.name)}
                              title={
                                !canGenerate
                                  ? "Memerlukan minimal satu penilaian atasan yang sudah dikirim."
                                  : item.isGenerated
                                    ? "Generate ulang rekapitulasi data TNA terbaru."
                                    : "Generate rekapitulasi TNA sekarang."
                              }
                            >
                              <Sparkles className={isBusy ? "animate-spin" : ""} />
                              {item.isGenerated ? "Perbarui" : "Generate"}
                            </Button>
                            <Link
                              href={ADMIN_ROUTES.tnaDetail(item.period.id)}
                              className={buttonVariants({ size: "sm" })}
                            >
                              Detail
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({
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

function filterSummaries(
  items: TnaPeriodSummary[],
  query: string
): TnaPeriodSummary[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;

  return items.filter(
    (item) =>
      item.period.name.toLowerCase().includes(needle) ||
      String(item.period.year).includes(needle)
  );
}
