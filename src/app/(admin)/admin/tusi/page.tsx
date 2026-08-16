"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useJabatanList } from "@/hooks/use-jabatan";
import { useTusiList } from "@/hooks/use-tusi";
import { useUnitKerjaList } from "@/hooks/use-unit-kerja";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { formatUnitOption } from "@/components/admin/tusi-form";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ALL_UNITS_VALUE, mapTusiError, setTusiActive } from "@/lib/services/tusi";
import { cn } from "@/lib/utils";
import type { Jabatan, Tusi, UnitKerja } from "@/types";

type StatusFilter = "all" | "active" | "inactive";

export default function TusiListPage() {
  const { profile } = useAuth();
  const tusi = useTusiList();
  const units = useUnitKerjaList();
  const jabatan = useJabatanList();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [unitFilter, setUnitFilter] = useState(ALL_UNITS_VALUE);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Tusi | null>(null);

  const unitItems = useMemo(
    () => [
      { value: ALL_UNITS_VALUE, label: "Semua unit kerja" },
      ...units.units.map((unit) => ({
        value: unit.id,
        label: formatUnitOption(unit),
      })),
    ],
    [units.units]
  );

  const visibleItems = useMemo(
    () =>
      filterTusi(tusi.items, units.units, jabatan.items, query, status, unitFilter),
    [jabatan.items, query, status, tusi.items, unitFilter, units.units]
  );
  const activeCount = tusi.items.filter((item) => item.isActive).length;
  const loading = tusi.loading || units.loading || jabatan.loading;
  const error = tusi.error ?? units.error ?? jabatan.error;

  async function applyActive(item: Tusi, isActive: boolean) {
    if (!profile) {
      return;
    }

    setPendingId(item.id);

    try {
      await setTusiActive(item.id, isActive, profile.id);
      toast.success(
        isActive ? `${item.name} diaktifkan.` : `${item.name} dinonaktifkan.`
      );
      await tusi.reload();
    } catch (actionError) {
      toast.error(mapTusiError(actionError));
    } finally {
      setPendingId(null);
      setDeactivateTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Daftar TUSI</CardTitle>
            <CardDescription>
              Tugas pokok dan fungsi terikat pada unit kerja. Relasi ke bank soal
              belum dihubungkan.
            </CardDescription>
          </div>
          <Link href={ADMIN_ROUTES.tusiNew} className={buttonVariants()}>
            <Plus />
            Tambah TUSI
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, kode, atau uraian..."
                className="pl-8"
              />
            </div>
            <Select
              value={unitFilter}
              onValueChange={(value) => {
                if (value) {
                  setUnitFilter(value);
                }
              }}
              items={unitItems}
            >
              <SelectTrigger className="w-full lg:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="start">
                {unitItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                if (value === "all" || value === "active" || value === "inactive") {
                  setStatus(value);
                }
              }}
              items={[
                { value: "all", label: "Semua status" },
                { value: "active", label: "Aktif" },
                { value: "inactive", label: "Nonaktif" },
              ]}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            {loading
              ? "Memuat TUSI..."
              : `${tusi.items.length} TUSI • ${activeCount} aktif`}
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
            <EmptyState hasData={tusi.items.length > 0} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Unit kerja</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => {
                  const busy = pendingId === item.id;
                  const unit = units.units.find(
                    (entry) => entry.id === item.unitKerjaId
                  );
                  const position = jabatan.items.find(
                    (entry) => entry.id === item.jabatanId
                  );

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(!item.isActive && "text-muted-foreground")}
                    >
                      <TableCell>
                        <p className="font-medium text-foreground">{item.name}</p>
                        {item.description ? (
                          <p className="max-w-xs truncate text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.code || "—"}
                      </TableCell>
                      <TableCell className="max-w-48 truncate">
                        {unit?.name ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {position?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "secondary" : "outline"}>
                          {item.isActive ? "Aktif" : "Nonaktif"}
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
                                <Link href={ADMIN_ROUTES.tusiEdit(item.id)} />
                              }
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {item.isActive ? (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={busy}
                                onClick={() => setDeactivateTarget(item)}
                              >
                                Nonaktifkan
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() => void applyActive(item, true)}
                              >
                                Aktifkan
                              </DropdownMenuItem>
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

      <Dialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan TUSI?</DialogTitle>
            <DialogDescription>
              {deactivateTarget
                ? `${deactivateTarget.name} tidak akan muncul sebagai pilihan aktif, tetapi datanya tetap tersimpan.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivateTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!deactivateTarget || pendingId === deactivateTarget.id}
              onClick={() => {
                if (deactivateTarget) {
                  void applyActive(deactivateTarget, false);
                }
              }}
            >
              Nonaktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ hasData }: { hasData: boolean }) {
  if (hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Tidak ada TUSI yang cocok dengan pencarian atau filter.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Belum ada TUSI. Tambah tugas dan fungsi pertama untuk salah satu unit
        kerja.
      </p>
      <Link href={ADMIN_ROUTES.tusiNew} className={buttonVariants()}>
        <Plus />
        Tambah TUSI
      </Link>
    </div>
  );
}

function filterTusi(
  items: Tusi[],
  units: UnitKerja[],
  jabatan: Jabatan[],
  query: string,
  status: StatusFilter,
  unitFilter: string
): Tusi[] {
  const needle = query.trim().toLowerCase();
  const unitNameById = new Map(units.map((unit) => [unit.id, unit.name]));
  const jabatanNameById = new Map(
    jabatan.map((item) => [item.id, item.name])
  );

  return items.filter((item) => {
    const statusOk =
      status === "all" ||
      (status === "active" ? item.isActive : !item.isActive);
    const unitOk =
      unitFilter === ALL_UNITS_VALUE || item.unitKerjaId === unitFilter;
    const haystack = [
      item.name,
      item.code,
      item.description ?? "",
      unitNameById.get(item.unitKerjaId) ?? "",
      item.jabatanId ? (jabatanNameById.get(item.jabatanId) ?? "") : "",
    ]
      .join(" ")
      .toLowerCase();
    const textOk = !needle || haystack.includes(needle);

    return statusOk && unitOk && textOk;
  });
}
