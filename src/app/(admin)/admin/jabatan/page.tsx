"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useJabatanList } from "@/hooks/use-jabatan";
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
import { mapJabatanError, setJabatanActive } from "@/lib/services/jabatan";
import { cn } from "@/lib/utils";
import type { Jabatan } from "@/types";

type StatusFilter = "all" | "active" | "inactive";

export default function JabatanListPage() {
  const { profile } = useAuth();
  const { items, loading, error, reload } = useJabatanList();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Jabatan | null>(
    null
  );

  const visibleItems = useMemo(
    () => filterMasterItems(items, query, status),
    [items, query, status]
  );
  const activeCount = items.filter((item) => item.isActive).length;

  async function applyActive(item: Jabatan, isActive: boolean) {
    if (!profile) {
      return;
    }

    setPendingId(item.id);

    try {
      await setJabatanActive(item.id, isActive, profile.id);
      toast.success(
        isActive ? `${item.name} diaktifkan.` : `${item.name} dinonaktifkan.`
      );
      await reload();
    } catch (actionError) {
      toast.error(mapJabatanError(actionError));
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
            <CardTitle>Daftar Jabatan</CardTitle>
            <CardDescription>
              Nama, kode, dan eselon. Relasi ke unit kerja atau TUSI belum
              dihubungkan.
            </CardDescription>
          </div>
          <Link href={ADMIN_ROUTES.jabatanNew} className={buttonVariants()}>
            <Plus />
            Tambah Jabatan
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, kode, atau eselon..."
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
              ? "Memuat jabatan..."
              : `${items.length} jabatan • ${activeCount} aktif`}
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
              href={ADMIN_ROUTES.jabatanNew}
              emptyLabel="Belum ada jabatan. Tambah jabatan pertama, misalnya Kepala Bagian atau Analis."
              actionLabel="Tambah Jabatan"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Eselon</TableHead>
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
                      <TableCell>
                        <p className="font-medium text-foreground">{item.name}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.code}
                      </TableCell>
                      <TableCell>
                        {item.eselon ? `Eselon ${item.eselon}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "secondary" : "outline"}>
                          {item.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ItemActions
                          name={item.name}
                          editHref={ADMIN_ROUTES.jabatanEdit(item.id)}
                          busy={busy}
                          isActive={item.isActive}
                          onDeactivate={() => setDeactivateTarget(item)}
                          onActivate={() => void applyActive(item, true)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DeactivateDialog
        open={Boolean(deactivateTarget)}
        title="Nonaktifkan jabatan?"
        description={
          deactivateTarget
            ? `${deactivateTarget.name} tidak akan muncul sebagai pilihan aktif, tetapi datanya tetap tersimpan.`
            : null
        }
        pending={
          Boolean(deactivateTarget) && pendingId === deactivateTarget?.id
        }
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (deactivateTarget) {
            void applyActive(deactivateTarget, false);
          }
        }}
      />
    </div>
  );
}

function filterMasterItems(
  items: Jabatan[],
  query: string,
  status: StatusFilter
): Jabatan[] {
  const needle = query.trim().toLowerCase();

  return items.filter((item) => {
    const statusOk =
      status === "all" ||
      (status === "active" ? item.isActive : !item.isActive);
    const textOk =
      !needle ||
      item.name.toLowerCase().includes(needle) ||
      item.code.toLowerCase().includes(needle) ||
      (item.eselon ?? "").toLowerCase().includes(needle);

    return statusOk && textOk;
  });
}

function EmptyState({
  hasData,
  href,
  emptyLabel,
  actionLabel,
}: {
  hasData: boolean;
  href: string;
  emptyLabel: string;
  actionLabel: string;
}) {
  if (hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Tidak ada data yang cocok dengan pencarian atau filter.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      <Link href={href} className={buttonVariants()}>
        <Plus />
        {actionLabel}
      </Link>
    </div>
  );
}

function ItemActions({
  name,
  editHref,
  busy,
  isActive,
  onDeactivate,
  onActivate,
}: {
  name: string;
  editHref: string;
  busy: boolean;
  isActive: boolean;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  return (
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
        <span className="sr-only">Aksi {name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={editHref} />}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isActive ? (
          <DropdownMenuItem
            variant="destructive"
            disabled={busy}
            onClick={onDeactivate}
          >
            Nonaktifkan
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={busy} onClick={onActivate}>
            Aktifkan
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeactivateDialog({
  open,
  title,
  description,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            Nonaktifkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
