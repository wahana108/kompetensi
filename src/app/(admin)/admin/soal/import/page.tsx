"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCopy, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useAssessmentPeriodList } from "@/hooks/use-assessment-period";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { useQuestionList } from "@/hooks/use-question";
import { useSystemParameters } from "@/hooks/use-system-parameter";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { createQuestionsBatch, mapQuestionError } from "@/lib/services/question";
import {
  IMPORT_TYPE_OPTIONS,
  assemblePromptSoal,
  parseImportPayload,
  validateImportRows,
  type ImportRowResult,
  type ImportTipeSoal,
} from "@/lib/services/question-import";
import { cn } from "@/lib/utils";

export default function ImportSoalPage() {
  const { profile } = useAuth();
  const kompetensi = useKompetensiList();
  const questions = useQuestionList();
  const periods = useAssessmentPeriodList();
  const systemParams = useSystemParameters();

  const [selectedKompetensiIds, setSelectedKompetensiIds] = useState<string[]>([]);
  const [tipe, setTipe] = useState<ImportTipeSoal>("likert");
  const [jumlahPerKompetensi, setJumlahPerKompetensi] = useState("5");
  const [konteks, setKonteks] = useState("");

  const [rawJson, setRawJson] = useState("");
  const [rows, setRows] = useState<ImportRowResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const kompetensiWithCode = useMemo(
    () => kompetensi.items.filter((item) => item.code.trim().length > 0),
    [kompetensi.items]
  );
  const kompetensiWithoutCodeCount =
    kompetensi.items.length - kompetensiWithCode.length;

  const selectedKompetensi = useMemo(
    () => kompetensiWithCode.filter((item) => selectedKompetensiIds.includes(item.id)),
    [kompetensiWithCode, selectedKompetensiIds]
  );

  const jumlahNumber = Number(jumlahPerKompetensi);
  const jumlahValid = Number.isInteger(jumlahNumber) && jumlahNumber >= 1 && jumlahNumber <= 20;

  const assembledPrompt = useMemo(() => {
    const template = systemParams.item?.templatePromptSoal ?? "";
    if (!template) {
      return "";
    }
    return assemblePromptSoal({
      template,
      kompetensiList: selectedKompetensi,
      tipe,
      jumlahPerKompetensi: jumlahValid ? jumlahNumber : 0,
      konteks,
    });
  }, [systemParams.item, selectedKompetensi, tipe, jumlahValid, jumlahNumber, konteks]);

  function toggleKompetensi(id: string) {
    setSelectedKompetensiIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function copyPrompt() {
    if (!assembledPrompt) {
      return;
    }
    try {
      await navigator.clipboard.writeText(assembledPrompt);
      toast.success("Prompt disalin ke clipboard.");
    } catch {
      toast.error("Gagal menyalin otomatis — salin manual dari kotak teks di bawah.");
    }
  }

  function handleValidate() {
    setSaveError(null);
    const parsed = parseImportPayload(rawJson);
    if (!parsed.ok) {
      setParseError(parsed.error);
      setRows(null);
      return;
    }

    setParseError(null);
    setRows(
      validateImportRows(parsed.data.soal, {
        kompetensiList: kompetensi.items,
        existingQuestions: questions.items,
      })
    );
  }

  function handleRawJsonChange(value: string) {
    setRawJson(value);
    // Hasil pratinjau lama jadi tidak relevan begitu teks diubah — cegah admin
    // menyimpan berdasarkan pratinjau yang sudah basi.
    setRows(null);
    setParseError(null);
  }

  const allValid = rows !== null && rows.length > 0 && rows.every((item) => item.valid);
  const validCount = rows?.filter((item) => item.valid).length ?? 0;
  const hasMultipleChoiceRows =
    rows?.some((item) => item.writeInput?.type === "multiple_choice") ?? false;
  const activePeriod = periods.items.find((item) => item.status === "active") ?? null;
  const canSave = allValid && (!hasMultipleChoiceRows || Boolean(activePeriod)) && !saving;

  async function handleSave() {
    if (!profile || !rows) {
      return;
    }
    const inputs = rows
      .map((item) => item.writeInput)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (inputs.length === 0) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const created = await createQuestionsBatch(inputs, profile.id);
      toast.success(`${created.length} soal berhasil disimpan ke Bank Soal.`);
      setRawJson("");
      setRows(null);
      await questions.reload();
    } catch (error) {
      setSaveError(mapQuestionError(error));
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Langkah 1 — Rakit Prompt</CardTitle>
          <CardDescription>
            Pilih kompetensi, tipe soal, dan jumlah per kompetensi. Prompt di
            bawah dirakit otomatis dari template di Parameter Sistem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kompetensi (bisa lebih dari satu)</Label>
            {kompetensi.loading ? (
              <p className="text-sm text-muted-foreground">Memuat kompetensi...</p>
            ) : kompetensiWithCode.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada kompetensi dengan kode. Isi kode di{" "}
                <Link href={ADMIN_ROUTES.kompetensi} className="underline">
                  halaman Kompetensi
                </Link>{" "}
                dulu — kode dipakai AI untuk menandai soal per kompetensi.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {kompetensiWithCode.map((item) => {
                  const checked = selectedKompetensiIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleKompetensi(item.id)}
                      />
                      <span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.code}
                        </span>{" "}
                        <span className="font-medium">{item.name}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {kompetensiWithoutCodeCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {kompetensiWithoutCodeCount} kompetensi lain belum punya kode,
                jadi belum bisa dipilih di sini.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tipe-soal">Tipe soal</Label>
              <Select
                value={tipe}
                onValueChange={(value) => {
                  if (value === "likert" || value === "yes_no" || value === "pilihan_ganda") {
                    setTipe(value);
                  }
                }}
                items={IMPORT_TYPE_OPTIONS}
              >
                <SelectTrigger id="tipe-soal" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TYPE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jumlah-soal">Jumlah soal per kompetensi</Label>
              <Input
                id="jumlah-soal"
                type="number"
                min={1}
                max={20}
                value={jumlahPerKompetensi}
                onChange={(event) => setJumlahPerKompetensi(event.target.value)}
              />
              {!jumlahValid ? (
                <p className="text-xs text-destructive">
                  Isi angka bulat antara 1 dan 20.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="konteks">
              Konteks tambahan (opsional)
            </Label>
            <Textarea
              id="konteks"
              value={konteks}
              onChange={(event) => setKonteks(event.target.value)}
              placeholder="Mis. uraian TUSI unit kerja, jenis layanan yang ditangani, istilah lokal yang sering dipakai..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="assembled-prompt">Prompt yang dirakit</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedKompetensi.length === 0 || !jumlahValid}
                onClick={() => void copyPrompt()}
              >
                <ClipboardCopy />
                Salin Prompt
              </Button>
            </div>
            <Textarea
              id="assembled-prompt"
              value={assembledPrompt}
              readOnly
              rows={14}
              className="font-mono text-xs"
            />
            {selectedKompetensi.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Pilih minimal satu kompetensi dulu.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Langkah 2 — Tempel Hasil</CardTitle>
          <CardDescription>
            Tempel balasan JSON dari AI di sini. Kalau AI membungkusnya dengan
            ```json ... ```, tidak masalah — akan dibersihkan otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={rawJson}
            onChange={(event) => handleRawJsonChange(event.target.value)}
            placeholder='{"schemaVersion": "1.0", "soal": [...]}'
            rows={10}
            className="font-mono text-xs"
          />
          {parseError ? (
            <p className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <XCircle className="mt-0.5 size-4 shrink-0" />
              {parseError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="button" onClick={handleValidate} disabled={rawJson.trim().length === 0}>
            Validasi
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Langkah 3 — Pratinjau &amp; Simpan</CardTitle>
          <CardDescription>
            Semua baris harus valid sebelum bisa disimpan. Penyimpanan bersifat
            semua-atau-tidak-sama-sekali — kalau satu gagal, tidak ada yang
            tersimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!rows ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tempel JSON di Langkah 2 lalu klik Validasi.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {validCount} dari {rows.length} soal valid.
              </p>

              {hasMultipleChoiceRows ? (
                <p className="flex items-start gap-2 rounded-md border border-amber-600/30 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Kunci jawaban soal pilihan ganda akan ditandai untuk periode
                    aktif saat ini
                    {activePeriod ? ` (${activePeriod.name})` : ""}. Soalnya
                    sendiri tersimpan permanen di Bank Soal, tapi kalau periode
                    ini nanti ditutup dan periode baru dibuka, kunci jawaban
                    soal-soal ini perlu di-refresh (buka lewat menu Bank Soal,
                    edit, simpan ulang) supaya bisa dibuka pegawai yang
                    mengerjakan tes di periode baru. Proses impor ini tidak
                    melakukan itu secara otomatis.
                    {!activePeriod
                      ? " Tidak ada periode aktif saat ini — aktifkan satu periode dulu sebelum menyimpan soal pilihan ganda."
                      : ""}
                  </span>
                </p>
              ) : null}

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Kompetensi</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Pertanyaan</TableHead>
                      <TableHead className="text-center">Opsi</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((item) => (
                      <TableRow
                        key={item.row}
                        className={cn(!item.valid && "bg-destructive/5")}
                      >
                        <TableCell className="tabular-nums">{item.row}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.kompetensiKode || "—"}
                        </TableCell>
                        <TableCell className="text-xs">{item.tipeRaw}</TableCell>
                        <TableCell className="max-w-sm">
                          <p className="truncate" title={item.pertanyaan}>
                            {item.pertanyaan || "(kosong)"}
                          </p>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {item.opsiCount > 0 ? item.opsiCount : "—"}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {item.valid ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 border-green-600/30 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            >
                              <CheckCircle2 className="size-3" />
                              Valid
                            </Badge>
                          ) : (
                            <div className="space-y-1">
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="size-3" />
                                Bermasalah
                              </Badge>
                              <ul className="list-disc space-y-0.5 pl-4 text-xs text-destructive">
                                {item.errors.map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {saveError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {saveError}
                </p>
              ) : null}
            </>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <Link href={ADMIN_ROUTES.soal} className={buttonVariants({ variant: "outline" })}>
            Kembali ke Bank Soal
          </Link>
          <Button type="button" disabled={!canSave} onClick={() => void handleSave()}>
            {saving ? "Menyimpan..." : `Simpan ${rows?.length ?? 0} Soal`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
