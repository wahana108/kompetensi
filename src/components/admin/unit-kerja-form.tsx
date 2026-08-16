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
  ROOT_PARENT_VALUE,
  computeUnitLevel,
  createUnitKerja,
  getSelectableParents,
  mapUnitKerjaError,
  updateUnitKerja,
} from "@/lib/services/unit-kerja";
import type { UnitKerja } from "@/types";

type UnitKerjaFormProps = {
  mode: "create" | "edit";
  units: UnitKerja[];
  actorId: string;
  initial?: UnitKerja;
  defaultParentId?: string | null;
};

export function UnitKerjaForm({
  mode,
  units,
  actorId,
  initial,
  defaultParentId = null,
}: UnitKerjaFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [parentId, setParentId] = useState(
    initial?.parentId ?? defaultParentId ?? ROOT_PARENT_VALUE
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const parentOptions = useMemo(
    () => getSelectableParents(units, initial?.id),
    [initial?.id, units]
  );

  const selectedParent =
    parentId && parentId !== ROOT_PARENT_VALUE
      ? parentOptions.find((unit) => unit.id === parentId) ?? null
      : null;
  const previewLevel = computeUnitLevel(selectedParent);

  const parentItems = useMemo(
    () => [
      { value: ROOT_PARENT_VALUE, label: "Tidak ada (unit root)" },
      ...parentOptions.map((unit) => ({
        value: unit.id,
        label: formatParentOption(unit),
      })),
    ],
    [parentOptions]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);

    const payload = {
      name,
      code,
      parentId: parentId === ROOT_PARENT_VALUE ? null : parentId,
      isActive,
    };

    try {
      if (mode === "create") {
        await createUnitKerja(payload, actorId);
        toast.success("Unit kerja ditambahkan.");
      } else if (initial) {
        await updateUnitKerja(initial.id, payload, actorId);
        toast.success("Unit kerja diperbarui.");
      }

      router.push(ADMIN_ROUTES.unitKerja);
    } catch (error) {
      const message = mapUnitKerjaError(error);
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
            {mode === "create" ? "Tambah Unit Kerja" : "Edit Unit Kerja"}
          </CardTitle>
          <CardDescription>
            Level dihitung otomatis dari unit induk. Root memakai level 1.
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
              <Label htmlFor="unit-name">Nama</Label>
              <Input
                id="unit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Direktorat SDM"
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit-code">Kode</Label>
              <Input
                id="unit-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Contoh: DIT-SDM"
                className="uppercase"
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit-level">Level</Label>
              <Input
                id="unit-level"
                value={String(previewLevel)}
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                {selectedParent
                  ? `Anak dari ${selectedParent.name} (level ${selectedParent.level})`
                  : "Unit root"}
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="unit-parent">Unit induk</Label>
              <Select
                value={parentId}
                onValueChange={(value) => {
                  if (value) {
                    setParentId(value);
                  }
                }}
                items={parentItems}
                disabled={pending}
              >
                <SelectTrigger id="unit-parent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  {parentItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit-status">Status</Label>
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(value) => setIsActive(value === "active")}
                items={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
                disabled={pending}
              >
                <SelectTrigger id="unit-status" className="w-full">
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
            href={ADMIN_ROUTES.unitKerja}
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

function formatParentOption(unit: UnitKerja) {
  const indent = unit.level > 1 ? `${"— ".repeat(unit.level - 1)}` : "";
  const status = unit.isActive ? "" : " (nonaktif)";
  return `${indent}${unit.name} (${unit.code})${status}`;
}
