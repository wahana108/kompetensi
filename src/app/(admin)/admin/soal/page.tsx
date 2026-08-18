"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { useQuestionList } from "@/hooks/use-question";
import { useTusiList } from "@/hooks/use-tusi";
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
import { getKompetensiDimensiLabel } from "@/lib/services/kompetensi";
import {
  NO_RELATION_VALUE,
  QUESTION_TYPE_OPTIONS,
  getQuestionTypeLabel,
  mapQuestionError,
  setQuestionActive,
} from "@/lib/services/question";
import { cn } from "@/lib/utils";
import type { Kompetensi, Question, QuestionType, Tusi } from "@/types";

type StatusFilter = "all" | "active" | "inactive";
type TypeFilter = "all" | QuestionType;

export default function SoalListPage() {
  const { profile } = useAuth();
  const questions = useQuestionList();
  const kompetensi = useKompetensiList();
  const tusi = useTusiList();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [kompetensiFilter, setKompetensiFilter] = useState(NO_RELATION_VALUE);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Question | null>(
    null
  );

  const kompetensiItems = useMemo(
    () => [
      { value: NO_RELATION_VALUE, label: "Semua kompetensi" },
      ...kompetensi.items.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    ],
    [kompetensi.items]
  );

  const visibleItems = useMemo(
    () =>
      filterQuestions(
        questions.items,
        kompetensi.items,
        tusi.items,
        query,
        status,
        type,
        kompetensiFilter
      ),
    [
      kompetensi.items,
      kompetensiFilter,
      query,
      questions.items,
      status,
      tusi.items,
      type,
    ]
  );
  const activeCount = questions.items.filter((item) => item.isActive).length;
  const loading = questions.loading || kompetensi.loading || tusi.loading;
  const error = questions.error ?? kompetensi.error ?? tusi.error;

  async function applyActive(item: Question, isActive: boolean) {
    if (!profile) {
      return;
    }

    setPendingId(item.id);

    try {
      await setQuestionActive(item.id, isActive, profile.id);
      toast.success(
        isActive ? "Soal diaktifkan." : "Soal dinonaktifkan."
      );
      await questions.reload();
    } catch (actionError) {
      toast.error(mapQuestionError(actionError));
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
            <CardTitle>Bank Soal</CardTitle>
            <CardDescription>
              Pertanyaan penilaian. Penyusunan kuesioner lengkap belum dibuat.
            </CardDescription>
          </div>
          <Link href={ADMIN_ROUTES.soalNew} className={buttonVariants()}>
            <Plus />
            Tambah Soal
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari teks soal atau kode..."
                className="pl-8"
              />
            </div>
            <Select
              value={type}
              onValueChange={(value) => {
                if (
                  value === "all" ||
                  value === "likert" ||
                  value === "multiple_choice" ||
                  value === "yes_no"
                ) {
                  setType(value);
                }
              }}
              items={[
                { value: "all", label: "Semua tipe" },
                ...QUESTION_TYPE_OPTIONS,
              ]}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                {QUESTION_TYPE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={kompetensiFilter}
              onValueChange={(value) => {
                if (value) {
                  setKompetensiFilter(value);
                }
              }}
              items={kompetensiItems}
            >
              <SelectTrigger className="w-full lg:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="start">
                {kompetensiItems.map((item) => (
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
              ? "Memuat soal..."
              : `${questions.items.length} soal • ${activeCount} aktif`}
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
            <EmptyState hasData={questions.items.length > 0} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Urutan</TableHead>
                  <TableHead>Pertanyaan</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Kompetensi</TableHead>
                  <TableHead>TUSI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => {
                  const busy = pendingId === item.id;
                  const linkedKompetensi = kompetensi.items.find(
                    (entry) => entry.id === item.kompetensiId
                  );
                  const linkedTusi = tusi.items.find(
                    (entry) => entry.id === item.tusiId
                  );

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(!item.isActive && "text-muted-foreground")}
                    >
                      <TableCell className="tabular-nums">
                        {item.sortOrder}
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <p
                          className="truncate font-medium text-foreground"
                          title={item.text}
                        >
                          {item.text}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.code ? `${item.code} · ` : ""}
                          {item.dimensi
                            ? getKompetensiDimensiLabel(item.dimensi)
                            : "Tanpa dimensi"}
                        </p>
                      </TableCell>
                      <TableCell>{getQuestionTypeLabel(item.type)}</TableCell>
                      <TableCell className="max-w-40 truncate">
                        {linkedKompetensi?.name ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {linkedTusi?.name ?? "—"}
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
                            <span className="sr-only">Aksi soal</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              render={
                                <Link href={ADMIN_ROUTES.soalEdit(item.id)} />
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
            <DialogTitle>Nonaktifkan soal?</DialogTitle>
            <DialogDescription>
              Soal tidak akan masuk kuesioner baru, tetapi datanya tetap
              tersimpan.
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
        Tidak ada soal yang cocok dengan pencarian atau filter.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Belum ada soal. Tambah pertanyaan pertama, misalnya pernyataan skala
        penilaian diri.
      </p>
      <Link href={ADMIN_ROUTES.soalNew} className={buttonVariants()}>
        <Plus />
        Tambah Soal
      </Link>
    </div>
  );
}

function filterQuestions(
  items: Question[],
  kompetensi: Kompetensi[],
  tusi: Tusi[],
  query: string,
  status: StatusFilter,
  type: TypeFilter,
  kompetensiFilter: string
): Question[] {
  const needle = query.trim().toLowerCase();
  const kompetensiName = new Map(kompetensi.map((item) => [item.id, item.name]));
  const tusiName = new Map(tusi.map((item) => [item.id, item.name]));

  return items.filter((item) => {
    const statusOk =
      status === "all" ||
      (status === "active" ? item.isActive : !item.isActive);
    const typeOk = type === "all" || item.type === type;
    const kompetensiOk =
      kompetensiFilter === NO_RELATION_VALUE ||
      item.kompetensiId === kompetensiFilter;
    const haystack = [
      item.text,
      item.code,
      item.kompetensiId ? (kompetensiName.get(item.kompetensiId) ?? "") : "",
      item.tusiId ? (tusiName.get(item.tusiId) ?? "") : "",
    ]
      .join(" ")
      .toLowerCase();
    const textOk = !needle || haystack.includes(needle);

    return statusOk && typeOk && kompetensiOk && textOk;
  });
}
