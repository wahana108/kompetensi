"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useAssessmentPeriodList } from "@/hooks/use-assessment-period";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  getPeriodStatusLabel,
  isPeriodFillable,
  mapPeriodError,
  updateAssessmentPeriod,
} from "@/lib/services/assessment-period";
import type { AssessmentPeriod, AssessmentPeriodStatus } from "@/types";

type StatusFilter = "all" | AssessmentPeriodStatus;

export default function PeriodeListPage() {
  const { profile } = useAuth();
  const { items, loading, error, reload } = useAssessmentPeriodList();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const visibleItems = useMemo(
    () => filterPeriods(items, query, status),
    [items, query, status]
  );
  const activeCount = items.filter((item) => item.status === "active").length;

  async function changeStatus(
    item: AssessmentPeriod,
    nextStatus: AssessmentPeriodStatus
  ) {
    if (!profile) {
      return;
    }

    setPendingId(item.id);

    try {
      await updateAssessmentPeriod(
        item.id,
        {
          name: item.name,
          year: item.year,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          status: nextStatus,
        },
        profile.id
      );
      toast.success(
        nextStatus === "active"
          ? `${item.name} diaktifkan.`
          : `${item.name} ditandai selesai.`
      );
      await reload();
    } catch (actionError) {
      toast.error(mapPeriodError(actionError));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Periode Penilaian</CardTitle>
            <CardDescription>
              Hanya satu periode yang boleh aktif. Pegawai mengisi self
              assessment pada periode aktif di rentang tanggalnya.
            </CardDescription>
          </div>
          <Link href={ADMIN_ROUTES.periodeNew} className={buttonVariants()}>
            <Plus />
            Tambah Periode
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau tahun..."
                className="pl-8"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                if (
                  value === "all" ||
                  value === "draft" ||
                  value === "active" ||
                  value === "closed"
                ) {
                  setStatus(value);
                }
              }}
              items={[
                { value: "all", label: "Semua status" },
                { value: "draft", label: "Draft" },
                { value: "active", label: "Aktif" },
                { value: "closed", label: "Selesai" },
              ]}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="closed">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            {loading
              ? "Memuat periode..."
              : `${items.length} periode • ${activeCount} aktif`}
          </p>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat data...
            </p>
          ) : visibleItems.length === 0 ? (
            <EmptyState hasData={items.length > 0} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tahun</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Selesai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => {
                  const busy = pendingId === item.id;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.name}</p>
                        {item.status === "active" && !isPeriodFillable(item) ? (
                          <p className="text-xs text-muted-foreground">
                            Di luar rentang tanggal hari ini
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular-nums">{item.year}</TableCell>
                      <TableCell className="tabular-nums">
                        {item.startsAt}
                      </TableCell>
                      <TableCell className="tabular-nums">{item.endsAt}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "active" ? "default" : "secondary"
                          }
                        >
                          {getPeriodStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={busy}
                              />
                            }
                          >
                            <MoreHorizontal />
                            <span className="sr-only">Aksi {item.name}</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              render={
                                <Link href={ADMIN_ROUTES.periodeEdit(item.id)} />
                              }
                            >
                              Edit
                            </DropdownMenuItem>
                            {item.status !== "active" ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={busy}
                                  onClick={() => void changeStatus(item, "active")}
                                >
                                  Aktifkan
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={busy}
                                  onClick={() => void changeStatus(item, "closed")}
                                >
                                  Tandai selesai
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ hasData }: { hasData: boolean }) {
  if (hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Tidak ada periode yang cocok dengan pencarian atau filter.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Belum ada periode. Tambah periode pertama, misalnya penilaian tahunan.
      </p>
      <Link href={ADMIN_ROUTES.periodeNew} className={buttonVariants()}>
        <Plus />
        Tambah Periode
      </Link>
    </div>
  );
}

function filterPeriods(
  items: AssessmentPeriod[],
  query: string,
  status: StatusFilter
): AssessmentPeriod[] {
  const needle = query.trim().toLowerCase();

  return items.filter((item) => {
    const statusOk = status === "all" || item.status === status;
    const textOk =
      !needle ||
      item.name.toLowerCase().includes(needle) ||
      String(item.year).includes(needle);

    return statusOk && textOk;
  });
}
