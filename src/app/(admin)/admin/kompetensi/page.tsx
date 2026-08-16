"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { useKompetensiLevelList } from "@/hooks/use-kompetensi-level";
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
  KOMPETENSI_DIMENSI_OPTIONS,
  getKompetensiDimensiLabel,
  mapKompetensiError,
  setKompetensiActive,
} from "@/lib/services/kompetensi";
import { cn } from "@/lib/utils";
import type { Kompetensi, KompetensiDimensi } from "@/types";

type StatusFilter = "all" | "active" | "inactive";
type DimensiFilter = "all" | KompetensiDimensi;

export default function KompetensiListPage() {
  const { profile } = useAuth();
  const kompetensi = useKompetensiList();
  const levels = useKompetensiLevelList();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dimensi, setDimensi] = useState<DimensiFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Kompetensi | null>(
    null
  );

  const visibleItems = useMemo(
    () => filterKompetensi(kompetensi.items, query, status, dimensi),
    [dimensi, kompetensi.items, query, status]
  );
  const activeCount = kompetensi.items.filter((item) => item.isActive).length;
  const loading = kompetensi.loading || levels.loading;
  const error = kompetensi.error ?? levels.error;

  async function applyActive(item: Kompetensi, isActive: boolean) {
    if (!profile) {
      return;
    }

    setPendingId(item.id);

    try {
      await setKompetensiActive(item.id, isActive, profile.id);
      toast.success(
        isActive ? `${item.name} diaktifkan.` : `${item.name} dinonaktifkan.`
      );
      await kompetensi.reload();
    } catch (actionError) {
      toast.error(mapKompetensiError(actionError));
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
            <CardTitle>Daftar Kompetensi</CardTitle>
            <CardDescription>
              Standar kompetensi per dimensi. Relasi ke jabatan dan bank soal
              belum dihubungkan.
            </CardDescription>
          </div>
          <Link href={ADMIN_ROUTES.kompetensiNew} className={buttonVariants()}>
            <Plus />
            Tambah Kompetensi
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
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
              value={dimensi}
              onValueChange={(value) => {
                if (
                  value === "all" ||
                  value === "pengetahuan" ||
                  value === "keterampilan" ||
                  value === "sikap_perilaku"
                ) {
                  setDimensi(value);
                }
              }}
              items={[
                { value: "all", label: "Semua dimensi" },
                ...KOMPETENSI_DIMENSI_OPTIONS,
              ]}
            >
              <SelectTrigger className="w-full lg:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua dimensi</SelectItem>
                {KOMPETENSI_DIMENSI_OPTIONS.map((item) => (
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
              ? "Memuat kompetensi..."
              : `${kompetensi.items.length} kompetensi • ${activeCount} aktif`}
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
            <EmptyState hasData={kompetensi.items.length > 0} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Dimensi</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => {
                  const busy = pendingId === item.id;
                  const linkedCount =
                    item.levelIds.length === 0
                      ? levels.items.filter((level) => level.isActive).length
                      : item.levelIds.length;

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
                      <TableCell>
                        {getKompetensiDimensiLabel(item.dimensi)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.levelIds.length === 0
                          ? `${linkedCount} level aktif`
                          : `${linkedCount} level terpilih`}
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
                                <Link
                                  href={ADMIN_ROUTES.kompetensiEdit(item.id)}
                                />
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
            <DialogTitle>Nonaktifkan kompetensi?</DialogTitle>
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
        Tidak ada kompetensi yang cocok dengan pencarian atau filter.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Belum ada kompetensi. Tambah standar pertama, misalnya Komunikasi
        efektif.
      </p>
      <Link href={ADMIN_ROUTES.kompetensiNew} className={buttonVariants()}>
        <Plus />
        Tambah Kompetensi
      </Link>
    </div>
  );
}

function filterKompetensi(
  items: Kompetensi[],
  query: string,
  status: StatusFilter,
  dimensi: DimensiFilter
): Kompetensi[] {
  const needle = query.trim().toLowerCase();

  return items.filter((item) => {
    const statusOk =
      status === "all" ||
      (status === "active" ? item.isActive : !item.isActive);
    const dimensiOk = dimensi === "all" || item.dimensi === dimensi;
    const textOk =
      !needle ||
      item.name.toLowerCase().includes(needle) ||
      item.code.toLowerCase().includes(needle);

    return statusOk && dimensiOk && textOk;
  });
}
