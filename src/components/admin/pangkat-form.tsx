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
import {
  createPangkat,
  mapPangkatError,
  updatePangkat,
} from "@/lib/services/pangkat";
import type { Pangkat } from "@/types";

type PangkatFormProps = {
  mode: "create" | "edit";
  actorId: string;
  initial?: Pangkat;
  defaultSortOrder: number;
};

export function PangkatForm({
  mode,
  actorId,
  initial,
  defaultSortOrder,
}: PangkatFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [golongan, setGolongan] = useState(initial?.golongan ?? "");
  const [sortOrder, setSortOrder] = useState(
    String(initial?.sortOrder ?? defaultSortOrder)
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);

    const payload = {
      name,
      golongan,
      sortOrder: Number(sortOrder),
      isActive,
    };

    try {
      if (mode === "create") {
        await createPangkat(payload, actorId);
        toast.success("Pangkat ditambahkan.");
      } else if (initial) {
        await updatePangkat(initial.id, payload, actorId);
        toast.success("Pangkat diperbarui.");
      }

      router.push(ADMIN_ROUTES.pangkat);
    } catch (error) {
      const message = mapPangkatError(error);
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
            {mode === "create" ? "Tambah Pangkat" : "Edit Pangkat"}
          </CardTitle>
          <CardDescription>
            Urutan dipakai untuk menampilkan daftar dari golongan terendah ke
            tertinggi, atau sebaliknya sesuai kesepakatan admin.
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
              <Label htmlFor="pangkat-name">Nama</Label>
              <Input
                id="pangkat-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Penata Muda"
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pangkat-golongan">Golongan</Label>
              <Input
                id="pangkat-golongan"
                value={golongan}
                onChange={(event) => setGolongan(event.target.value)}
                placeholder="Contoh: III/a"
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pangkat-sort">Urutan</Label>
              <Input
                id="pangkat-sort"
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
              <Label htmlFor="pangkat-status">Status</Label>
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(value) => setIsActive(value === "active")}
                items={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
                disabled={pending}
              >
                <SelectTrigger id="pangkat-status" className="w-full">
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
            href={ADMIN_ROUTES.pangkat}
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
