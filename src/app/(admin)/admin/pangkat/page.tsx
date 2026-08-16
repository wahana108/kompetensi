"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { usePangkatList } from "@/hooks/use-pangkat";
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
import { mapPangkatError, setPangkatActive } from "@/lib/services/pangkat";
import { cn } from "@/lib/utils";
import type { Pangkat } from "@/types";

type StatusFilter = "all" | "active" | "inactive";

export default function PangkatListPage() {
  const { profile } = useAuth();
  const { items, loading, error, reload } = usePangkatList();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Pangkat | null>(
    null
  );

  const visibleItems = useMemo(
    () => filterPangkat(items, query, status),
    [items, query, status]
  );
  const activeCount = items.filter((item) => item.isActive).length;

  async function applyActive(item: Pangkat, isActive: boolean) {
    if (!profile) {
      return;
    }

    setPendingId(item.id);

    try {
      await setPangkatActive(item.id, isActive, profile.id);
      toast.success(
        isActive ? `${item.name} diaktifkan.` : `${item.name} dinonaktifkan.`
      );
      await reload();
    } catch (actionError) {
      toast.error(mapPangkatError(actionError));
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
            <CardTitle>Daftar Pangkat / Golongan</CardTitle>
            <CardDescription>
              Nama, golongan, dan urutan tampil. Relasi ke pegawai belum
              dihubungkan.
            </CardDescription>
          </div>
          <Link href={ADMIN_ROUTES.pangkatNew} className={buttonVariants()}>
            <Plus />
            Tambah Pangkat
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau golongan..."
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
              ? "Memuat pangkat..."
              : `${items.length} pangkat • ${activeCount} aktif`}
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
                  <TableHead>Urutan</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Golongan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => {
                  const busy = pendingId === item.id;

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(!item.isActive && "text-muted-foreground")}
                    >
                      <TableCell className="tabular-nums">
                        {item.sortOrder}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{item.name}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.golongan}
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
                                <Link href={ADMIN_ROUTES.pangkatEdit(item.id)} />
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
            <DialogTitle>Nonaktifkan pangkat?</DialogTitle>
            <DialogDescription>
              {deactivateTarget
                ? `${deactivateTarget.name} (${deactivateTarget.golongan}) tidak akan muncul sebagai pilihan aktif, tetapi datanya tetap tersimpan.`
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
        Tidak ada data yang cocok dengan pencarian atau filter.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Belum ada pangkat. Tambah pangkat pertama, misalnya Penata Muda
        (III/a).
      </p>
      <Link href={ADMIN_ROUTES.pangkatNew} className={buttonVariants()}>
        <Plus />
        Tambah Pangkat
      </Link>
    </div>
  );
}

function filterPangkat(
  items: Pangkat[],
  query: string,
  status: StatusFilter
): Pangkat[] {
  const needle = query.trim().toLowerCase();

  return items.filter((item) => {
    const statusOk =
      status === "all" ||
      (status === "active" ? item.isActive : !item.isActive);
    const textOk =
      !needle ||
      item.name.toLowerCase().includes(needle) ||
      item.golongan.toLowerCase().includes(needle);

    return statusOk && textOk;
  });
}
