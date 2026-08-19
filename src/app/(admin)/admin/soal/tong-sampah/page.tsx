"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { useQuestionList } from "@/hooks/use-question";
import { isSuperAdmin } from "@/lib/auth/roles";
import { ADMIN_ROUTES } from "@/components/admin/nav";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getKompetensiDimensiLabel } from "@/lib/services/kompetensi";
import {
  deleteQuestionsPermanently,
  getQuestionTypeLabel,
  hasQuestionBeenAnswered,
  mapQuestionError,
  restoreQuestionsInBatch,
} from "@/lib/services/question";

export default function TongSampahSoalPage() {
  const { profile } = useAuth();
  const questions = useQuestionList();
  const kompetensi = useKompetensiList();

  const trashedItems = useMemo(
    () => questions.items.filter((item) => item.trashedAt),
    [questions.items]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [answeredById, setAnsweredById] = useState<Record<string, boolean>>({});
  const [checkingAnswered, setCheckingAnswered] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDeletePermanently = isSuperAdmin(profile?.role);

  useEffect(() => {
    let cancelled = false;

    async function checkAll() {
      if (trashedItems.length === 0) {
        setAnsweredById({});
        return;
      }

      setCheckingAnswered(true);
      const entries = await Promise.all(
        trashedItems.map(async (item) => {
          try {
            return [item.id, await hasQuestionBeenAnswered(item)] as const;
          } catch {
            // Gagal cek = anggap sudah pernah dijawab (aman secara default,
            // tombol hapus permanen disembunyikan daripada salah izinkan).
            return [item.id, true] as const;
          }
        })
      );

      if (!cancelled) {
        setAnsweredById(Object.fromEntries(entries));
        setCheckingAnswered(false);
      }
    }

    void checkAll();
    return () => {
      cancelled = true;
    };
  }, [trashedItems]);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  const deletableSelectedIds = selectedIds.filter((id) => answeredById[id] === false);
  const selectedHasUndeletable = selectedIds.some((id) => answeredById[id] !== false);

  async function handleRestore(ids: string[]) {
    if (!profile || ids.length === 0) {
      return;
    }

    setRestoring(true);
    try {
      await restoreQuestionsInBatch(ids, profile.id);
      toast.success(
        ids.length === 1
          ? "Soal dipulihkan (berstatus Nonaktif — aktifkan lagi kalau perlu)."
          : `${ids.length} soal dipulihkan (berstatus Nonaktif — aktifkan lagi kalau perlu).`
      );
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      await questions.reload();
    } catch (restoreError) {
      toast.error(mapQuestionError(restoreError));
    } finally {
      setRestoring(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!profile || !deleteTargetIds || deleteTargetIds.length === 0) {
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteQuestionsPermanently(deleteTargetIds, profile.role);
      toast.success(
        result.deletedCount === 1
          ? "Soal dihapus permanen."
          : `${result.deletedCount} soal dihapus permanen.`
      );
      setSelectedIds((current) => current.filter((id) => !deleteTargetIds.includes(id)));
      await questions.reload();
    } catch (deleteError) {
      toast.error(mapQuestionError(deleteError));
    } finally {
      setDeleting(false);
      setDeleteTargetIds(null);
    }
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Tong Sampah Soal</CardTitle>
            <CardDescription>
              Soal yang dibuang. Pulihkan kapan saja, atau hapus permanen
              kalau memang tidak lagi diperlukan.
            </CardDescription>
          </div>
          <Link
            href={ADMIN_ROUTES.soal}
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft />
            Kembali ke Bank Soal
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span>{selectedIds.length} soal dipilih</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                >
                  Batalkan Pilihan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={restoring}
                  onClick={() => void handleRestore([...selectedIds])}
                >
                  <RotateCcw />
                  Pulihkan Terpilih
                </Button>
                {canDeletePermanently ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deletableSelectedIds.length === 0 || selectedHasUndeletable}
                    title={
                      selectedHasUndeletable
                        ? "Ada soal terpilih yang sudah pernah dijawab — tidak bisa dihapus massal. Hapus satu-satu atau batalkan pilihan yang sudah dijawab."
                        : undefined
                    }
                    onClick={() => setDeleteTargetIds([...selectedIds])}
                  >
                    <Trash2 />
                    Hapus Permanen Terpilih
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {questions.loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat data...
            </p>
          ) : trashedItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Tong sampah kosong.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Pertanyaan</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kompetensi</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trashedItems.map((item) => {
                    const linkedKompetensi = kompetensi.items.find(
                      (entry) => entry.id === item.kompetensiId
                    );
                    const answered = answeredById[item.id];
                    const stillChecking = checkingAnswered && answered === undefined;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Pilih ${item.text}`}
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelected(item.id)}
                          />
                        </TableCell>
                        <TableCell className="max-w-sm">
                          <p className="truncate font-medium text-foreground" title={item.text}>
                            {item.text}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.dimensi
                              ? getKompetensiDimensiLabel(item.dimensi)
                              : "Tanpa dimensi"}
                          </p>
                        </TableCell>
                        <TableCell>{getQuestionTypeLabel(item.type)}</TableCell>
                        <TableCell className="max-w-40 truncate">
                          {linkedKompetensi?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={restoring}
                              onClick={() => void handleRestore([item.id])}
                            >
                              <RotateCcw />
                              Pulihkan
                            </Button>
                            {!canDeletePermanently ? (
                              <p className="text-[11px] text-muted-foreground">
                                Hanya Super Admin yang bisa menghapus permanen.
                              </p>
                            ) : stillChecking ? (
                              <p className="text-[11px] text-muted-foreground">
                                Memeriksa riwayat jawaban...
                              </p>
                            ) : answered ? (
                              <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
                                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                                Sudah pernah dijawab pegawai — tidak bisa
                                dihapus permanen.
                              </p>
                            ) : (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={deleting}
                                onClick={() => setDeleteTargetIds([item.id])}
                              >
                                <Trash2 />
                                Hapus Permanen
                              </Button>
                            )}
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

      <Dialog
        open={Boolean(deleteTargetIds)}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTargetIds(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Hapus {deleteTargetIds?.length ?? 0} soal permanen?
            </DialogTitle>
            <DialogDescription>
              Tindakan ini TIDAK BISA dibatalkan. Soal beserta kunci
              jawabannya (kalau pilihan ganda) akan hilang selamanya. Sistem
              sudah memeriksa ulang bahwa soal ini belum pernah dijawab
              siapa pun sebelum menghapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTargetIds(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDeleteConfirmed()}
            >
              {deleting ? "Menghapus..." : "Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
