"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { canChangeUserRole, USER_ROLE_OPTIONS } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { formatUnitOption } from "@/components/admin/tusi-form";
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
  NO_ASSIGNMENT_VALUE,
  mapPenggunaError,
  updatePengguna,
} from "@/lib/services/pengguna";
import type { Jabatan, Pangkat, Tusi, UnitKerja, UserProfile, UserRole } from "@/types";

type PenggunaFormProps = {
  actor: Pick<UserProfile, "id" | "role">;
  users: UserProfile[];
  units: UnitKerja[];
  jabatan: Jabatan[];
  pangkat: Pangkat[];
  tusi: Tusi[];
  initial: UserProfile;
};

export function PenggunaForm({
  actor,
  users,
  units,
  jabatan,
  pangkat,
  tusi,
  initial,
}: PenggunaFormProps) {
  const router = useRouter();
  const canEditRole = canChangeUserRole(actor.role);
  const [role, setRole] = useState<UserRole>(initial.role);
  const [unitKerjaId, setUnitKerjaId] = useState(
    initial.unitKerjaId ?? NO_ASSIGNMENT_VALUE
  );
  const [jabatanId, setJabatanId] = useState(
    initial.jabatanId ?? NO_ASSIGNMENT_VALUE
  );
  const [pangkatId, setPangkatId] = useState(
    initial.pangkatId ?? NO_ASSIGNMENT_VALUE
  );
  const [supervisorId, setSupervisorId] = useState(
    initial.supervisorId ?? NO_ASSIGNMENT_VALUE
  );
  const [tusiIds, setTusiIds] = useState<string[]>(initial.tusiIds);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const unitItems = useMemo(
    () => [
      { value: NO_ASSIGNMENT_VALUE, label: "Tidak ada" },
      ...units.map((item) => ({
        value: item.id,
        label: formatUnitOption(item),
      })),
    ],
    [units]
  );

  const jabatanItems = useMemo(
    () => [
      { value: NO_ASSIGNMENT_VALUE, label: "Tidak ada" },
      ...jabatan.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.code})`,
      })),
    ],
    [jabatan]
  );

  const pangkatItems = useMemo(
    () => [
      { value: NO_ASSIGNMENT_VALUE, label: "Tidak ada" },
      ...pangkat.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.golongan})`,
      })),
    ],
    [pangkat]
  );

  const supervisorItems = useMemo(
    () => [
      { value: NO_ASSIGNMENT_VALUE, label: "Tidak ada" },
      ...users
        .filter((item) => item.id !== initial.id)
        .map((item) => ({
          value: item.id,
          label: `${item.displayName} · ${item.email}`,
        })),
    ],
    [initial.id, users]
  );

  function toggleTusi(id: string) {
    setTusiIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);

    try {
      await updatePengguna(
        initial.id,
        {
          role,
          unitKerjaId:
            unitKerjaId === NO_ASSIGNMENT_VALUE ? null : unitKerjaId,
          jabatanId: jabatanId === NO_ASSIGNMENT_VALUE ? null : jabatanId,
          pangkatId: pangkatId === NO_ASSIGNMENT_VALUE ? null : pangkatId,
          supervisorId:
            supervisorId === NO_ASSIGNMENT_VALUE ? null : supervisorId,
          tusiIds,
        },
        actor
      );
      toast.success("Data pengguna diperbarui.");
      router.push(ADMIN_ROUTES.pengguna);
    } catch (error) {
      const message = mapPenggunaError(error);
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
          <CardTitle>Edit pengguna</CardTitle>
          <CardDescription>
            Nama dan email tidak diubah dari sini.{" "}
            {canEditRole
              ? "Anda Super Admin, jadi role bisa diubah."
              : "Hanya Super Admin yang boleh mengubah role."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Nama</Label>
              <Input id="user-name" value={initial.displayName} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" value={initial.email} readOnly disabled />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => {
                  if (
                    value === "super_admin" ||
                    value === "admin" ||
                    value === "moderator" ||
                    value === "pegawai"
                  ) {
                    setRole(value);
                  }
                }}
                items={USER_ROLE_OPTIONS}
                disabled={pending || !canEditRole}
              >
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-unit">Unit kerja</Label>
              <Select
                value={unitKerjaId}
                onValueChange={(value) => {
                  if (value) {
                    setUnitKerjaId(value);
                  }
                }}
                items={unitItems}
                disabled={pending}
              >
                <SelectTrigger id="user-unit" className="w-full">
                  <SelectValue />
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

            <div className="space-y-1.5">
              <Label htmlFor="user-jabatan">Jabatan</Label>
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
                <SelectTrigger id="user-jabatan" className="w-full">
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

            <div className="space-y-1.5">
              <Label htmlFor="user-pangkat">Pangkat</Label>
              <Select
                value={pangkatId}
                onValueChange={(value) => {
                  if (value) {
                    setPangkatId(value);
                  }
                }}
                items={pangkatItems}
                disabled={pending}
              >
                <SelectTrigger id="user-pangkat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  {pangkatItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="user-supervisor">Atasan</Label>
              <Select
                value={supervisorId}
                onValueChange={(value) => {
                  if (value) {
                    setSupervisorId(value);
                  }
                }}
                items={supervisorItems}
                disabled={pending}
              >
                <SelectTrigger id="user-supervisor" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  {supervisorItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>TUSI yang diampu</Label>
              {tusi.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada TUSI. Tambah TUSI di menu Master Data.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {tusi.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={tusiIds.includes(item.id)}
                        disabled={pending}
                        onChange={() => toggleTusi(item.id)}
                      />
                      <span>
                        <span className="font-medium">{item.name}</span>
                        {item.code ? (
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            ({item.code})
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Link
            href={ADMIN_ROUTES.pengguna}
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
            {pending ? "Menyimpan..." : "Perbarui"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
