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
import {
  JABATAN_ESELON_OPTIONS,
  NO_ESELON_VALUE,
  createJabatan,
  mapJabatanError,
  updateJabatan,
} from "@/lib/services/jabatan";
import type { Jabatan } from "@/types";

type JabatanFormProps = {
  mode: "create" | "edit";
  actorId: string;
  initial?: Jabatan;
};

export function JabatanForm({ mode, actorId, initial }: JabatanFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [eselon, setEselon] = useState(initial?.eselon ?? NO_ESELON_VALUE);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const eselonItems = useMemo(
    () => [
      { value: NO_ESELON_VALUE, label: "Tidak ada" },
      ...JABATAN_ESELON_OPTIONS.map((value) => ({
        value,
        label: `Eselon ${value}`,
      })),
    ],
    []
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);

    const payload = {
      name,
      code,
      eselon: eselon === NO_ESELON_VALUE ? null : eselon,
      isActive,
    };

    try {
      if (mode === "create") {
        await createJabatan(payload, actorId);
        toast.success("Jabatan ditambahkan.");
      } else if (initial) {
        await updateJabatan(initial.id, payload, actorId);
        toast.success("Jabatan diperbarui.");
      }

      router.push(ADMIN_ROUTES.jabatan);
    } catch (error) {
      const message = mapJabatanError(error);
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
            {mode === "create" ? "Tambah Jabatan" : "Edit Jabatan"}
          </CardTitle>
          <CardDescription>
            Eselon bersifat opsional. Relasi ke unit kerja dan TUSI belum diatur
            di tahap ini.
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
              <Label htmlFor="jabatan-name">Nama</Label>
              <Input
                id="jabatan-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Kepala Subbagian Kepegawaian"
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jabatan-code">Kode</Label>
              <Input
                id="jabatan-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Contoh: KASUBAG-PEG"
                className="uppercase"
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jabatan-eselon">Eselon</Label>
              <Select
                value={eselon}
                onValueChange={(value) => {
                  if (value) {
                    setEselon(value);
                  }
                }}
                items={eselonItems}
                disabled={pending}
              >
                <SelectTrigger id="jabatan-eselon" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eselonItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jabatan-status">Status</Label>
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(value) => setIsActive(value === "active")}
                items={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
                disabled={pending}
              >
                <SelectTrigger id="jabatan-status" className="w-full">
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
            href={ADMIN_ROUTES.jabatan}
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
