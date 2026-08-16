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
import { NO_JABATAN_VALUE, createTusi, mapTusiError, updateTusi } from "@/lib/services/tusi";
import type { Jabatan, Tusi, UnitKerja } from "@/types";

type TusiFormProps = {
  mode: "create" | "edit";
  actorId: string;
  units: UnitKerja[];
  jabatan: Jabatan[];
  initial?: Tusi;
  defaultUnitKerjaId?: string | null;
};

export function TusiForm({
  mode,
  actorId,
  units,
  jabatan,
  initial,
  defaultUnitKerjaId = null,
}: TusiFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [unitKerjaId, setUnitKerjaId] = useState(
    initial?.unitKerjaId ?? defaultUnitKerjaId ?? ""
  );
  const [jabatanId, setJabatanId] = useState(
    initial?.jabatanId ?? NO_JABATAN_VALUE
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const unitItems = useMemo(
    () =>
      units.map((unit) => ({
        value: unit.id,
        label: formatUnitOption(unit),
      })),
    [units]
  );

  const jabatanItems = useMemo(
    () => [
      { value: NO_JABATAN_VALUE, label: "Tidak ada" },
      ...jabatan.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.code})${item.isActive ? "" : " (nonaktif)"}`,
      })),
    ],
    [jabatan]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);

    const payload = {
      name,
      code,
      description,
      unitKerjaId,
      jabatanId: jabatanId === NO_JABATAN_VALUE ? null : jabatanId,
      isActive,
    };

    try {
      if (mode === "create") {
        await createTusi(payload, actorId);
        toast.success("TUSI ditambahkan.");
      } else if (initial) {
        await updateTusi(initial.id, payload, actorId);
        toast.success("TUSI diperbarui.");
      }

      router.push(ADMIN_ROUTES.tusi);
    } catch (error) {
      const message = mapTusiError(error);
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
          <CardTitle>{mode === "create" ? "Tambah TUSI" : "Edit TUSI"}</CardTitle>
          <CardDescription>
            Unit kerja wajib dipilih. Jabatan dan kode bersifat opsional. Relasi
            ke bank soal belum diatur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {units.length === 0 ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Belum ada unit kerja. Tambah unit kerja dulu sebelum membuat TUSI.
            </p>
          ) : null}

          {formError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tusi-name">Nama / judul</Label>
              <Input
                id="tusi-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Menyusun rencana kerja tahunan"
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tusi-code">Kode (opsional)</Label>
              <Input
                id="tusi-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Contoh: TUSI-01"
                className="uppercase"
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tusi-status">Status</Label>
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(value) => setIsActive(value === "active")}
                items={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
                disabled={pending}
              >
                <SelectTrigger id="tusi-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tusi-unit">Unit kerja</Label>
              <Select
                value={unitKerjaId || null}
                onValueChange={(value) => {
                  if (value) {
                    setUnitKerjaId(value);
                  }
                }}
                items={unitItems}
                disabled={pending || units.length === 0}
              >
                <SelectTrigger id="tusi-unit" className="w-full">
                  <SelectValue placeholder="Pilih unit kerja" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  {unitItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tusi-jabatan">Jabatan (opsional)</Label>
              <Select
                value={jabatanId}
                onValueChange={(value) => {
                  if (value) {
                    setJabatanId(value);
                  }
                }}
                items={jabatanItems}
                disabled={pending}
              >
                <SelectTrigger id="tusi-jabatan" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  {jabatanItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tusi-description">Deskripsi / uraian</Label>
              <Textarea
                id="tusi-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Uraian tugas dan fungsi..."
                disabled={pending}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Link
            href={ADMIN_ROUTES.tusi}
            className={cn(
              buttonVariants({ variant: "outline" }),
              pending && "pointer-events-none opacity-50"
            )}
            aria-disabled={pending}
            tabIndex={pending ? -1 : undefined}
          >
            Batal
          </Link>
          <Button type="submit" disabled={pending || units.length === 0}>
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

export function formatUnitOption(unit: UnitKerja) {
  const indent = unit.level > 1 ? `${"— ".repeat(unit.level - 1)}` : "";
  const status = unit.isActive ? "" : " (nonaktif)";
  return `${indent}${unit.name} (${unit.code})${status}`;
}
