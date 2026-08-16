"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
                    : "Pilihan ganda belum punya editor opsi. Tipe disimpan untuk tahap berikutnya."}
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
