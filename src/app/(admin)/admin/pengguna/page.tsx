"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useJabatanList } from "@/hooks/use-jabatan";
import { usePenggunaList } from "@/hooks/use-pengguna";
import { useUnitKerjaList } from "@/hooks/use-unit-kerja";
import { getRoleLabel } from "@/lib/auth/roles";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { countSubordinates } from "@/lib/services/pengguna";
import type { Jabatan, UnitKerja, UserProfile } from "@/types";

export default function PenggunaListPage() {
  const users = usePenggunaList();
  const units = useUnitKerjaList();
  const jabatan = useJabatanList();
  const [query, setQuery] = useState("");

  const visibleItems = useMemo(
    () => filterPengguna(users.items, query),
    [query, users.items]
  );
  const loading = users.loading || units.loading || jabatan.loading;
  const error = users.error ?? units.error ?? jabatan.error;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pengguna</CardTitle>
          <CardDescription>
            Kelola role, penempatan, atasan, dan TUSI pegawai. Nama dan email
            tidak diubah dari sini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau email..."
              className="pl-8"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {loading ? "Memuat pengguna..." : `${users.items.length} pengguna`}
          </p>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat data...
            </p>
          ) : visibleItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {users.items.length === 0
                ? "Belum ada pengguna. Akun muncul setelah login atau daftar."
                : "Tidak ada pengguna yang cocok."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Unit kerja</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Atasan</TableHead>
                  <TableHead className="w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => (
                  <UserRow
                    key={item.id}
                    user={item}
                    users={users.items}
                    units={units.units}
                    jabatan={jabatan.items}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({
  user,
  users,
  units,
  jabatan,
}: {
  user: UserProfile;
  users: UserProfile[];
  units: UnitKerja[];
  jabatan: Jabatan[];
}) {
  const unit = units.find((item) => item.id === user.unitKerjaId);
  const position = jabatan.find((item) => item.id === user.jabatanId);
  const supervisor = users.find((item) => item.id === user.supervisorId);
  const subordinates = countSubordinates(users, user.id);

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{user.displayName}</p>
        {subordinates > 0 ? (
          <p className="text-xs text-muted-foreground">
            {subordinates} bawahan
          </p>
        ) : null}
      </TableCell>
      <TableCell className="max-w-48 truncate">{user.email}</TableCell>
      <TableCell>
        <Badge variant="secondary">{getRoleLabel(user.role)}</Badge>
      </TableCell>
      <TableCell className="max-w-40 truncate">{unit?.name ?? "—"}</TableCell>
      <TableCell className="max-w-40 truncate">{position?.name ?? "—"}</TableCell>
      <TableCell className="max-w-40 truncate">
        {supervisor?.displayName ?? "—"}
      </TableCell>
      <TableCell className="text-right">
        <Link
          href={ADMIN_ROUTES.penggunaEdit(user.id)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Edit
        </Link>
      </TableCell>
    </TableRow>
  );
}

function filterPengguna(items: UserProfile[], query: string): UserProfile[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return items;
  }

  return items.filter(
    (item) =>
      item.displayName.toLowerCase().includes(needle) ||
      item.email.toLowerCase().includes(needle)
  );
}
