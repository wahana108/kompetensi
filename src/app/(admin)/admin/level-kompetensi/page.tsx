"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
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
  mapKompetensiLevelError,
  moveKompetensiLevel,
  seedDefaultKompetensiLevels,
  setKompetensiLevelActive,
} from "@/lib/services/kompetensi-level";
import { cn } from "@/lib/utils";
import type { KompetensiLevel } from "@/types";

type StatusFilter = "all" | "active" | "inactive";

export default function LevelKompetensiListPage() {
  const { profile } = useAuth();
  const { items, loading, error, reload } = useKompetensiLevelList();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [deactivateTarget, setDeactivateTarget] =
    useState<KompetensiLevel | null>(null);

  const visibleItems = useMemo(
    () => filterLevels(items, query, status),
    [items, query, status]
  );
  const activeCount = items.filter((item) => item.isActive).length;

  async function applyActive(item: KompetensiLevel, isActive: boolean) {
    if (!profile) {
      return;
    }

    setPendingId(item.id);

    try {
      await setKompetensiLevelActive(item.id, isActive, profile.id);
      toast.success(
        isActive ? `${item.name} diaktifkan.` : `${item.name} dinonaktifkan.`
      );
      await reload();
    } catch (actionError) {
      toast.error(mapKompetensiLevelError(actionError));
    } finally {
      setPendingId(null);
      setDeactivateTarget(null);
    }
  }

  async function handleMove(item: KompetensiLevel, direction: "up" | "down") {
    if (!profile) {
      return;
    }

    setPendingId(item.id);

    try {
      await moveKompetensiLevel(item.id, direction, profile.id);
      await reload();
    } catch (actionError) {
      toast.error(mapKompetensiLevelError(actionError));
    } finally {
      setPendingId(null);
    }
  }

  async function handleSeed() {
    if (!profile) {
      return;
    }

    setSeeding(true);

    try {
      await seedDefaultKompetensiLevels(profile.id);
      toast.success("5 level default ditambahkan.");
      await reload();
    } catch (actionError) {
      toast.error(mapKompetensiLevelError(actionError));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Daftar Level Kompetensi</CardTitle>
            <CardDescription>
              Skala global untuk penilaian. Default: Sangat Tidak Mampu (1)
              sampai Sangat Mampu (5).
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {items.length === 0 && !loading ? (
              <Button
                type="button"
                variant="outline"
                disabled={seeding}
                onClick={() => void handleSeed()}
              >
                {seeding ? "Mengisi..." : "Isi 5 level default"}
              </Button>
            ) : null}
            <Link
              href={ADMIN_ROUTES.levelKompetensiNew}
              className={buttonVariants()}
            >
              <Plus />
              Tambah Level
            </Link>
          </div>
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
              ? "Memuat level..."
              : `${items.length} level • ${activeCount} aktif`}
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
            <EmptyState
              hasData={items.length > 0}
              seeding={seeding}
              onSeed={() => void handleSeed()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => {
                  const busy = pendingId === item.id;
                  const fullIndex = items.findIndex((entry) => entry.id === item.id);

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(!item.isActive && "text-muted-foreground")}
                    >
                      <TableCell className="tabular-nums font-medium">
                        {item.level}
                      </TableCell>
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
                        <Badge variant={item.isActive ? "secondary" : "outline"}>
                          {item.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={busy || fullIndex <= 0}
                            onClick={() => void handleMove(item, "up")}
                          >
                            <ChevronUp />
                            <span className="sr-only">Naikkan {item.name}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={busy || fullIndex < 0 || fullIndex >= items.length - 1}
                            onClick={() => void handleMove(item, "down")}
                          >
                            <ChevronDown />
                            <span className="sr-only">Turunkan {item.name}</span>
                          </Button>
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
                                    href={ADMIN_ROUTES.levelKompetensiEdit(
                                      item.id
                                    )}
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
                        </div>
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
            <DialogTitle>Nonaktifkan level?</DialogTitle>
            <DialogDescription>
              {deactivateTarget
                ? `${deactivateTarget.name} tidak akan dipakai kompetensi baru, tetapi datanya tetap tersimpan.`
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

function EmptyState({
  hasData,
  seeding,
  onSeed,
}: {
  hasData: boolean;
  seeding: boolean;
  onSeed: () => void;
}) {
  if (hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Tidak ada level yang cocok dengan pencarian atau filter.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Belum ada level. Isi 5 level default, atau tambah satu per satu.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" disabled={seeding} onClick={onSeed}>
          {seeding ? "Mengisi..." : "Isi 5 level default"}
        </Button>
        <Link href={ADMIN_ROUTES.levelKompetensiNew} className={buttonVariants()}>
          <Plus />
          Tambah Level
        </Link>
      </div>
    </div>
  );
}

function filterLevels(
  items: KompetensiLevel[],
  query: string,
  status: StatusFilter
): KompetensiLevel[] {
  const needle = query.trim().toLowerCase();

  return items.filter((item) => {
    const statusOk =
      status === "all" ||
      (status === "active" ? item.isActive : !item.isActive);
    const textOk =
      !needle ||
      item.name.toLowerCase().includes(needle) ||
      item.code.toLowerCase().includes(needle);

    return statusOk && textOk;
  });
}
