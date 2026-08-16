"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
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
import {
  countDirectChildren,
  getParentName,
  mapUnitKerjaError,
  setUnitKerjaActive,
} from "@/lib/services/unit-kerja";
import { cn } from "@/lib/utils";
import type { UnitKerja } from "@/types";

type StatusFilter = "all" | "active" | "inactive";

export default function UnitKerjaListPage() {
  const { profile } = useAuth();
  const { units, loading, error, reload } = useUnitKerjaList();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UnitKerja | null>(
    null
  );

  const visibleUnits = useMemo(
    () => filterUnitKerja(units, query, status),
    [query, status, units]
  );

  const activeCount = units.filter((unit) => unit.isActive).length;

  async function applyActive(unit: UnitKerja, isActive: boolean) {
    if (!profile) {
      return;
    }

    setPendingId(unit.id);

    try {
      await setUnitKerjaActive(unit.id, isActive, profile.id);
      toast.success(
        isActive ? `${unit.name} diaktifkan.` : `${unit.name} dinonaktifkan.`
      );
      await reload();
    } catch (actionError) {
      toast.error(mapUnitKerjaError(actionError));
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
            <CardTitle>Daftar Unit Kerja</CardTitle>
            <CardDescription>
              Struktur hierarkis. Tambah subunit dari menu aksi, atau buat unit
              root baru.
            </CardDescription>
          </div>
          <Link
            href={ADMIN_ROUTES.unitKerjaNew}
            className={buttonVariants()}
          >
            <Plus />
            Tambah Unit Kerja
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau kode..."
                className="pl-8"
              />
            </div>
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
              <SelectTrigger className="w-full sm:w-44">
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
              ? "Memuat unit kerja..."
              : `${units.length} unit • ${activeCount} aktif`}
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
          ) : visibleUnits.length === 0 ? (
            <EmptyState hasData={units.length > 0} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Induk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUnits.map((unit) => {
                  const parentName = getParentName(units, unit.parentId);
                  const busy = pendingId === unit.id;

                  return (
                    <TableRow
                      key={unit.id}
                      className={cn(!unit.isActive && "text-muted-foreground")}
                    >
                      <TableCell>
                        <div
                          className="min-w-40"
                          style={{ paddingLeft: (unit.level - 1) * 16 }}
                        >
                          <p className="font-medium text-foreground">
                            {unit.name}
                          </p>
                          {countDirectChildren(units, unit.id) > 0 ? (
                            <p className="text-xs text-muted-foreground">
                              {countDirectChildren(units, unit.id)} subunit
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {unit.code}
                      </TableCell>
                      <TableCell>{unit.level}</TableCell>
                      <TableCell className="max-w-48 truncate">
                        {parentName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={unit.isActive ? "secondary" : "outline"}>
                          {unit.isActive ? "Aktif" : "Nonaktif"}
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
                            <span className="sr-only">Aksi {unit.name}</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              render={
                                <Link href={ADMIN_ROUTES.unitKerjaEdit(unit.id)} />
                              }
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              render={
                                <Link
                                  href={`${ADMIN_ROUTES.unitKerjaNew}?parentId=${unit.id}`}
                                />
                              }
                            >
                              Tambah subunit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {unit.isActive ? (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={busy}
                                onClick={() => setDeactivateTarget(unit)}
                              >
                                Nonaktifkan
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() => void applyActive(unit, true)}
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
            <DialogTitle>Nonaktifkan unit kerja?</DialogTitle>
            <DialogDescription>
              {deactivateTarget
                ? describeDeactivate(units, deactivateTarget)
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
        Tidak ada unit yang cocok dengan pencarian atau filter.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Belum ada unit kerja. Tambah unit pertama, misalnya instansi atau
        direktorat.
      </p>
      <Link href={ADMIN_ROUTES.unitKerjaNew} className={buttonVariants()}>
        <Plus />
        Tambah Unit Kerja
      </Link>
    </div>
  );
}

function filterUnitKerja(
  units: UnitKerja[],
  query: string,
  status: StatusFilter
): UnitKerja[] {
  const needle = query.trim().toLowerCase();
  const matched = new Set<string>();
  const byId = new Map(units.map((unit) => [unit.id, unit]));

  for (const unit of units) {
    const statusOk =
      status === "all" ||
      (status === "active" ? unit.isActive : !unit.isActive);
    const textOk =
      !needle ||
      unit.name.toLowerCase().includes(needle) ||
      unit.code.toLowerCase().includes(needle);

    if (!statusOk || !textOk) {
      continue;
    }

    matched.add(unit.id);
    let parentId = unit.parentId;
    while (parentId) {
      matched.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  }

  return units.filter((unit) => matched.has(unit.id));
}

function describeDeactivate(units: UnitKerja[], unit: UnitKerja) {
  const children = countDirectChildren(units, unit.id);
  if (children > 0) {
    return `${unit.name} memiliki ${children} subunit. Menonaktifkan unit ini tidak menonaktifkan subunit secara otomatis.`;
  }

  return `${unit.name} tidak akan muncul sebagai pilihan aktif, tetapi datanya tetap tersimpan.`;
}
