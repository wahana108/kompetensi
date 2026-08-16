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
  createKompetensi,
  mapKompetensiError,
  updateKompetensi,
} from "@/lib/services/kompetensi";
import type { Kompetensi, KompetensiDimensi, KompetensiLevel } from "@/types";

type KompetensiFormProps = {
  mode: "create" | "edit";
  actorId: string;
  levels: KompetensiLevel[];
  initial?: Kompetensi;
};

export function KompetensiForm({
  mode,
  actorId,
  levels,
  initial,
}: KompetensiFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [dimensi, setDimensi] = useState<KompetensiDimensi>(
    initial?.dimensi ?? "pengetahuan"
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [levelIds, setLevelIds] = useState<string[]>(initial?.levelIds ?? []);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const activeLevels = useMemo(
    () => levels.filter((item) => item.isActive || levelIds.includes(item.id)),
    [levelIds, levels]
  );

  function toggleLevel(id: string) {
    setLevelIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);

    const payload = {
      name,
      code,
      description,
      dimensi,
      levelIds,
      isActive,
    };

    try {
      if (mode === "create") {
        await createKompetensi(payload, actorId);
        toast.success("Kompetensi ditambahkan.");
      } else if (initial) {
        await updateKompetensi(initial.id, payload, actorId);
        toast.success("Kompetensi diperbarui.");
      }

      router.push(ADMIN_ROUTES.kompetensi);
    } catch (error) {
      const message = mapKompetensiError(error);
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
          <CardTitle>
            {mode === "create" ? "Tambah Kompetensi" : "Edit Kompetensi"}
          </CardTitle>
          <CardDescription>
            Jika tidak ada level yang dicentang, kompetensi memakai semua level
            aktif.
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
              <Label htmlFor="kompetensi-name">Nama kompetensi</Label>
              <Input
                id="kompetensi-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Komunikasi efektif"
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kompetensi-code">Kode (opsional)</Label>
              <Input
                id="kompetensi-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Contoh: KOM-01"
                className="uppercase"
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kompetensi-dimensi">Dimensi</Label>
              <Select
                value={dimensi}
                onValueChange={(value) => {
                  if (
                    value === "pengetahuan" ||
                    value === "keterampilan" ||
                    value === "sikap_perilaku"
                  ) {
                    setDimensi(value);
                  }
                }}
                items={KOMPETENSI_DIMENSI_OPTIONS}
                disabled={pending}
              >
                <SelectTrigger id="kompetensi-dimensi" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KOMPETENSI_DIMENSI_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kompetensi-status">Status</Label>
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(value) => setIsActive(value === "active")}
                items={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
                disabled={pending}
              >
                <SelectTrigger id="kompetensi-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="kompetensi-description">Deskripsi</Label>
              <Textarea
                id="kompetensi-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Uraian kompetensi..."
                disabled={pending}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Level yang dipakai</Label>
              {activeLevels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada level. Buat skala di menu Level Kompetensi terlebih
                  dahulu.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeLevels.map((item) => {
                    const checked = levelIds.includes(item.id);

                    return (
                      <label
                        key={item.id}
                        className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          disabled={pending}
                          onChange={() => toggleLevel(item.id)}
                        />
                        <span>
                          <span className="font-medium">
                            {item.level}. {item.name}
                          </span>
                          {item.code ? (
                            <span className="ml-1 font-mono text-xs text-muted-foreground">
                              ({item.code})
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Link
            href={ADMIN_ROUTES.kompetensi}
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
