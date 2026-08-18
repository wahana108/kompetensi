"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ADMIN_ROUTES } from "@/components/admin/nav";
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
import { Textarea } from "@/components/ui/textarea";
import {
  KOMPETENSI_DIMENSI_OPTIONS,
  getKompetensiDimensiLabel,
} from "@/lib/services/kompetensi";
import { getQuestionAnswerKey } from "@/lib/services/question-answer-key";
import {
  NO_DIMENSI_VALUE,
  NO_RELATION_VALUE,
  QUESTION_TYPE_OPTIONS,
  createQuestion,
  mapQuestionError,
  updateQuestion,
} from "@/lib/services/question";
import type {
  Kompetensi,
  KompetensiDimensi,
  Question,
  QuestionType,
  Tusi,
} from "@/types";

type OptionRow = { id: string; label: string };

function createOptionId(): string {
  return `opt_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyOptionRows(): OptionRow[] {
  return [
    { id: createOptionId(), label: "" },
    { id: createOptionId(), label: "" },
  ];
}

type QuestionFormProps = {
  mode: "create" | "edit";
  actorId: string;
  kompetensi: Kompetensi[];
  tusi: Tusi[];
  initial?: Question;
  defaultKompetensiId?: string | null;
  defaultTusiId?: string | null;
  defaultSortOrder: number;
};

export function QuestionForm({
  mode,
  actorId,
  kompetensi,
  tusi,
  initial,
  defaultKompetensiId = null,
  defaultTusiId = null,
  defaultSortOrder,
}: QuestionFormProps) {
  const router = useRouter();
  const [text, setText] = useState(initial?.text ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [type, setType] = useState<QuestionType>(initial?.type ?? "likert");
  const [kompetensiId, setKompetensiId] = useState(
    initial?.kompetensiId ?? defaultKompetensiId ?? NO_RELATION_VALUE
  );
  const [tusiId, setTusiId] = useState(
    initial?.tusiId ?? defaultTusiId ?? NO_RELATION_VALUE
  );
  const [dimensi, setDimensi] = useState(
    initial?.dimensi ??
      resolveDimensiFromKompetensi(
        kompetensi,
        initial?.kompetensiId ?? defaultKompetensiId
      ) ??
      NO_DIMENSI_VALUE
  );
  const [sortOrder, setSortOrder] = useState(
    String(initial?.sortOrder ?? defaultSortOrder)
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [options, setOptions] = useState<OptionRow[]>(() =>
    initial?.type === "multiple_choice" && initial.options && initial.options.length > 0
      ? initial.options.map((item) => ({ id: item.value, label: item.label }))
      : emptyOptionRows()
  );
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null);
  const [loadingAnswerKey, setLoadingAnswerKey] = useState(
    initial?.type === "multiple_choice"
  );

  useEffect(() => {
    if (mode !== "edit" || initial?.type !== "multiple_choice") {
      setLoadingAnswerKey(false);
      return;
    }

    let cancelled = false;
    setLoadingAnswerKey(true);

    void getQuestionAnswerKey(initial.id)
      .then((key) => {
        if (!cancelled) {
          setCorrectOptionId(key?.correctValue ?? null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAnswerKey(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, initial]);

  function addOption() {
    setOptions((current) => [...current, { id: createOptionId(), label: "" }]);
  }

  function removeOption(id: string) {
    setOptions((current) => current.filter((item) => item.id !== id));
    setCorrectOptionId((current) => (current === id ? null : current));
  }

  function setOptionLabel(id: string, label: string) {
    setOptions((current) =>
      current.map((item) => (item.id === id ? { ...item, label } : item))
    );
  }

  const kompetensiItems = useMemo(
    () => [
      { value: NO_RELATION_VALUE, label: "Tidak ada" },
      ...kompetensi.map((item) => ({
        value: item.id,
        label: `${item.name}${item.code ? ` (${item.code})` : ""} — ${getKompetensiDimensiLabel(item.dimensi)}`,
      })),
    ],
    [kompetensi]
  );

  const tusiItems = useMemo(
    () => [
      { value: NO_RELATION_VALUE, label: "Tidak ada" },
      ...tusi.map((item) => ({
        value: item.id,
        label: `${item.name}${item.code ? ` (${item.code})` : ""}`,
      })),
    ],
    [tusi]
  );

  const dimensiItems = useMemo(
    () => [
      { value: NO_DIMENSI_VALUE, label: "Tidak ada" },
      ...KOMPETENSI_DIMENSI_OPTIONS,
    ],
    []
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (type === "multiple_choice") {
      const filled = options.filter((item) => item.label.trim().length > 0);
      if (filled.length < 2) {
        setFormError("Soal pilihan ganda butuh minimal 2 opsi.");
        return;
      }
      if (!correctOptionId || !filled.some((item) => item.id === correctOptionId)) {
        setFormError("Tandai satu opsi sebagai kunci jawaban sebelum menyimpan.");
        return;
      }
    }

    setPending(true);

    const payload = {
      text,
      code,
      type,
      kompetensiId:
        kompetensiId === NO_RELATION_VALUE ? null : kompetensiId,
      tusiId: tusiId === NO_RELATION_VALUE ? null : tusiId,
      dimensi:
        dimensi === NO_DIMENSI_VALUE
          ? null
          : (dimensi as KompetensiDimensi),
      sortOrder: Number(sortOrder),
      isActive,
      multipleChoiceOptions:
        type === "multiple_choice"
          ? options
              .filter((item) => item.label.trim().length > 0)
              .map((item) => ({ value: item.id, label: item.label.trim() }))
          : undefined,
      multipleChoiceCorrectValue:
        type === "multiple_choice" ? correctOptionId : undefined,
    };

    try {
      if (mode === "create") {
        await createQuestion(payload, actorId);
        toast.success("Soal ditambahkan.");
      } else if (initial) {
        await updateQuestion(initial.id, payload, actorId);
        toast.success("Soal diperbarui.");
      }

      router.push(ADMIN_ROUTES.soal);
    } catch (error) {
      const message = mapQuestionError(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Tambah Soal" : "Edit Soal"}</CardTitle>
          <CardDescription>
            Tipe default adalah skala, selaras dengan level kompetensi. Relasi ke
            kuesioner belum diatur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="soal-text">Teks soal / pertanyaan</Label>
              <Textarea
                id="soal-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Contoh: Saya mampu menyampaikan informasi secara jelas kepada rekan kerja."
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soal-code">Kode (opsional)</Label>
              <Input
                id="soal-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Contoh: SOAL-01"
                className="uppercase"
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soal-type">Tipe soal</Label>
              <Select
                value={type}
                onValueChange={(value) => {
                  if (
                    value === "likert" ||
                    value === "multiple_choice" ||
                    value === "yes_no"
                  ) {
                    setType(value);
                  }
                }}
                items={QUESTION_TYPE_OPTIONS}
                disabled={pending}
              >
                <SelectTrigger id="soal-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {type === "likert"
                  ? "Jawaban memakai skala level kompetensi yang sudah dibuat."
                  : type === "yes_no"
                    ? "Jawaban tetap: Ya / Tidak."
                    : "Atur opsi jawaban dan kunci jawabannya di bawah."}
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="soal-kompetensi">Kompetensi (opsional)</Label>
              <Select
                value={kompetensiId}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setKompetensiId(value);
                  const selected = kompetensi.find((item) => item.id === value);
                  if (selected) {
                    setDimensi(selected.dimensi);
                  }
                }}
                items={kompetensiItems}
                disabled={pending}
              >
                <SelectTrigger id="soal-kompetensi" className="w-full">
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
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="soal-tusi">TUSI (opsional)</Label>
              <Select
                value={tusiId}
                onValueChange={(value) => {
                  if (value) {
                    setTusiId(value);
                  }
                }}
                items={tusiItems}
                disabled={pending}
              >
                <SelectTrigger id="soal-tusi" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  {tusiItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soal-dimensi">Dimensi</Label>
              <Select
                value={dimensi}
                onValueChange={(value) => {
                  if (value) {
                    setDimensi(value);
                  }
                }}
                items={dimensiItems}
                disabled={pending}
              >
                <SelectTrigger id="soal-dimensi" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dimensiItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Terisi otomatis saat kompetensi dipilih, dan tetap bisa diubah.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soal-sort">Urutan</Label>
              <Input
                id="soal-sort"
                type="number"
                min={1}
                step={1}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soal-status">Status</Label>
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(value) => setIsActive(value === "active")}
                items={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
                disabled={pending}
              >
                <SelectTrigger id="soal-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "multiple_choice" ? (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <Label>Opsi jawaban</Label>
                {loadingAnswerKey ? (
                  <span className="text-xs text-muted-foreground">
                    Memuat kunci jawaban...
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Tandai satu opsi (radio) sebagai kunci jawaban. Minimal 2 opsi.
              </p>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="soal-correct-option"
                      aria-label={`Tandai opsi ${index + 1} sebagai kunci jawaban`}
                      checked={correctOptionId === option.id}
                      disabled={pending || loadingAnswerKey}
                      onChange={() => setCorrectOptionId(option.id)}
                    />
                    <Input
                      value={option.label}
                      onChange={(event) => setOptionLabel(option.id, event.target.value)}
                      placeholder={`Opsi ${index + 1}`}
                      disabled={pending}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending || options.length <= 2}
                      onClick={() => removeOption(option.id)}
                    >
                      <Trash2 />
                      <span className="sr-only">Hapus opsi</span>
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={addOption}
              >
                <Plus />
                Tambah opsi
              </Button>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Link
            href={ADMIN_ROUTES.soal}
            className={cn(
              buttonVariants({ variant: "outline" }),
              pending && "pointer-events-none opacity-50"
            )}
            aria-disabled={pending}
            tabIndex={pending ? -1 : undefined}
          >
            Batal
          </Link>
          <Button type="submit" disabled={pending}>
            {pending
              ? "Menyimpan..."
              : mode === "create"
                ? "Simpan"
                : "Perbarui"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function resolveDimensiFromKompetensi(
  items: Kompetensi[],
  kompetensiId: string | null | undefined
): KompetensiDimensi | null {
  if (!kompetensiId) {
    return null;
  }

  return items.find((item) => item.id === kompetensiId)?.dimensi ?? null;
}
