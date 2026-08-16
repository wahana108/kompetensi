"use client";

import { useState } from "react";
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
  createKompetensiLevel,
  mapKompetensiLevelError,
  updateKompetensiLevel,
} from "@/lib/services/kompetensi-level";
import type { KompetensiLevel } from "@/types";

type KompetensiLevelFormProps = {
  mode: "create" | "edit";
  actorId: string;
  initial?: KompetensiLevel;
  defaultLevel: number;
};

export function KompetensiLevelForm({
  mode,
  actorId,
  initial,
  defaultLevel,
}: KompetensiLevelFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [level, setLevel] = useState(String(initial?.level ?? defaultLevel));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);

    const payload = {
      name,
      code,
      level: Number(level),
      description,
      isActive,
    };

    try {
      if (mode === "create") {
        await createKompetensiLevel(payload, actorId);
        toast.success("Level kompetensi ditambahkan.");
      } else if (initial) {
        await updateKompetensiLevel(initial.id, payload, actorId);
        toast.success("Level kompetensi diperbarui.");
      }

      router.push(ADMIN_ROUTES.levelKompetensi);
    } catch (error) {
      const message = mapKompetensiLevelError(error);
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
            {mode === "create" ? "Tambah Level" : "Edit Level"}
          </CardTitle>
          <CardDescription>
            Nilai / urutan dipakai untuk penskoran. Semakin besar, semakin tinggi
            kemampuan.
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
              <Label htmlFor="level-name">Nama</Label>
              <Input
                id="level-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Sangat Mampu"
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="level-code">Kode (opsional)</Label>
              <Input
                id="level-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Contoh: SM"
                className="uppercase"
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="level-value">Nilai / urutan</Label>
              <Input
                id="level-value"
                type="number"
                min={1}
                step={1}
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="level-status">Status</Label>
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(value) => setIsActive(value === "active")}
                items={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
                disabled={pending}
              >
                <SelectTrigger id="level-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="level-description">Deskripsi singkat</Label>
              <Textarea
                id="level-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Arti level ini dalam penilaian..."
                disabled={pending}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Link
            href={ADMIN_ROUTES.levelKompetensi}
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
