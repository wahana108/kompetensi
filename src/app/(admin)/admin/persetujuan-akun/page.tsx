"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useJabatanList } from "@/hooks/use-jabatan";
import { usePendingUserList, usePenggunaList } from "@/hooks/use-pengguna";
import { useUnitKerjaList } from "@/hooks/use-unit-kerja";
import { useInvitationList } from "@/hooks/use-user-invitation";
import { USER_ROLE_OPTIONS } from "@/lib/auth/roles";
import { formatUnitOption } from "@/components/admin/tusi-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveUser,
  mapPenggunaError,
  NO_ASSIGNMENT_VALUE,
  rejectUser,
} from "@/lib/services/pengguna";
import {
  createInvitation,
  mapUserInvitationError,
} from "@/lib/services/user-invitation";
import type { Jabatan, UnitKerja, UserProfile, UserRole } from "@/types";

export default function PersetujuanAkunPage() {
  const { profile } = useAuth();
  const pending = usePendingUserList();
  const invitations = useInvitationList();
  const units = useUnitKerjaList();
  const jabatan = useJabatanList();
  const users = usePenggunaList();

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6">
      <InvitationForm
        actorId={profile.id}
        units={units.units}
        jabatan={jabatan.items}
        users={users.items}
        onCreated={() => void invitations.reload()}
      />

      <PendingApprovalCard
        actorId={profile.id}
        pending={pending}
        units={units.units}
        jabatan={jabatan.items}
        users={users.items}
      />

      <InvitationListCard invitations={invitations} />
    </div>
  );
}

function InvitationForm({
  actorId,
  units,
  jabatan,
  users,
  onCreated,
}: {
  actorId: string;
  units: UnitKerja[];
  jabatan: Jabatan[];
  users: UserProfile[];
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [role, setRole] = useState<UserRole>("pegawai");
  const [unitKerjaId, setUnitKerjaId] = useState(NO_ASSIGNMENT_VALUE);
  const [jabatanId, setJabatanId] = useState(NO_ASSIGNMENT_VALUE);
  const [supervisorId, setSupervisorId] = useState(NO_ASSIGNMENT_VALUE);
  const [pending, setPending] = useState(false);

  const unitItems = useMemo(
    () => [
      { value: NO_ASSIGNMENT_VALUE, label: "Tidak ada" },
      ...units.map((item) => ({ value: item.id, label: formatUnitOption(item) })),
    ],
    [units]
  );
  const jabatanItems = useMemo(
    () => [
      { value: NO_ASSIGNMENT_VALUE, label: "Tidak ada" },
      ...jabatan.map((item) => ({ value: item.id, label: item.name })),
    ],
    [jabatan]
  );
  const supervisorItems = useMemo(
    () => [
      { value: NO_ASSIGNMENT_VALUE, label: "Tidak ada" },
      ...users.map((item) => ({
        value: item.id,
        label: `${item.displayName} · ${item.email}`,
      })),
    ],
    [users]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      await createInvitation(
        {
          email,
          namaLengkap,
          role,
          unitKerjaId: unitKerjaId === NO_ASSIGNMENT_VALUE ? null : unitKerjaId,
          jabatanId: jabatanId === NO_ASSIGNMENT_VALUE ? null : jabatanId,
          supervisorId:
            supervisorId === NO_ASSIGNMENT_VALUE ? null : supervisorId,
        },
        actorId
      );
      toast.success(`Undangan untuk ${email} dibuat.`);
      setEmail("");
      setNamaLengkap("");
      setRole("pegawai");
      setUnitKerjaId(NO_ASSIGNMENT_VALUE);
      setJabatanId(NO_ASSIGNMENT_VALUE);
      setSupervisorId(NO_ASSIGNMENT_VALUE);
      onCreated();
    } catch (error) {
      toast.error(mapUserInvitationError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            <CardTitle>Undang Pengguna Baru</CardTitle>
          </div>
          <CardDescription>
            Dipakai saat mode pendaftaran &quot;tertutup&quot; — hanya email yang
            diundang di sini yang boleh membuat akun sendiri.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-nama">Nama lengkap</Label>
            <Input
              id="invite-nama"
              value={namaLengkap}
              onChange={(event) => setNamaLengkap(event.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
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
              disabled={pending}
            >
              <SelectTrigger id="invite-role" className="w-full">
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
            <Label htmlFor="invite-unit">Unit kerja</Label>
            <Select
              value={unitKerjaId}
              onValueChange={(value) => value && setUnitKerjaId(value)}
              items={unitItems}
              disabled={pending}
            >
              <SelectTrigger id="invite-unit" className="w-full">
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
            <Label htmlFor="invite-jabatan">Jabatan</Label>
            <Select
              value={jabatanId}
              onValueChange={(value) => value && setJabatanId(value)}
              items={jabatanItems}
              disabled={pending}
            >
              <SelectTrigger id="invite-jabatan" className="w-full">
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
            <Label htmlFor="invite-supervisor">Atasan</Label>
            <Select
              value={supervisorId}
              onValueChange={(value) => value && setSupervisorId(value)}
              items={supervisorItems}
              disabled={pending}
            >
              <SelectTrigger id="invite-supervisor" className="w-full">
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
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Mengirim..." : "Buat Undangan"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function PendingApprovalCard({
  actorId,
  pending,
  units,
  jabatan,
  users,
}: {
  actorId: string;
  pending: ReturnType<typeof usePendingUserList>;
  units: UnitKerja[];
  jabatan: Jabatan[];
  users: UserProfile[];
}) {
  const [approveTarget, setApproveTarget] = useState<UserProfile | null>(null);
  const [rejectTarget, setRejectTarget] = useState<UserProfile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleReject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);

    try {
      await rejectUser(rejectTarget.id, actorId);
      toast.success(`${rejectTarget.displayName} ditolak.`);
      await pending.reload();
    } catch (error) {
      toast.error(mapPenggunaError(error));
    } finally {
      setBusyId(null);
      setRejectTarget(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Persetujuan Akun</CardTitle>
        <CardDescription>
          Akun berstatus &quot;pending&quot; belum bisa mengakses aplikasi
          sampai disetujui.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {pending.loading
            ? "Memuat..."
            : `${pending.items.length} akun menunggu persetujuan`}
        </p>

        {pending.error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {pending.error}
          </p>
        ) : null}

        {pending.loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Memuat data...
          </p>
        ) : pending.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada akun yang menunggu persetujuan.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tanggal daftar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">
                    {item.displayName}
                  </TableCell>
                  <TableCell className="max-w-56 truncate">{item.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => setApproveTarget(item)}
                      >
                        <CheckCircle2 />
                        Setujui
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busyId === item.id}
                        onClick={() => setRejectTarget(item)}
                      >
                        <XCircle />
                        Tolak
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {approveTarget ? (
        <ApproveDialog
          actorId={actorId}
          user={approveTarget}
          units={units}
          jabatan={jabatan}
          users={users}
          open={Boolean(approveTarget)}
          onOpenChange={(open) => {
            if (!open) setApproveTarget(null);
          }}
          onApproved={() => {
            setApproveTarget(null);
            void pending.reload();
          }}
        />
      ) : null}

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak pendaftaran?</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `${rejectTarget.displayName} (${rejectTarget.email}) akan berstatus nonaktif dan tidak bisa masuk.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(rejectTarget) && busyId === rejectTarget?.id}
              onClick={() => void handleReject()}
            >
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ApproveDialog({
  actorId,
  user,
  units,
  jabatan,
  users,
  open,
  onOpenChange,
  onApproved,
}: {
  actorId: string;
  user: UserProfile;
  units: UnitKerja[];
  jabatan: Jabatan[];
  users: UserProfile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}) {
  const [unitKerjaId, setUnitKerjaId] = useState(
    user.unitKerjaId ?? NO_ASSIGNMENT_VALUE
  );
  const [jabatanId, setJabatanId] = useState(
    user.jabatanId ?? NO_ASSIGNMENT_VALUE
  );
  const [supervisorId, setSupervisorId] = useState(
    user.supervisorId ?? NO_ASSIGNMENT_VALUE
  );
  const [pending, setPending] = useState(false);

  const unitItems = useMemo(
    () => [
      { value: NO_ASSIGNMENT_VALUE, label: "Tidak ada" },
      ...units.map((item) => ({ value: item.id, label: formatUnitOption(item) })),
    ],
    [units]
  );
  const jabatanItems = useMemo(
    () => [
      { value: NO_ASSIGNMENT_VALUE, label: "Tidak ada" },
      ...jabatan.map((item) => ({ value: item.id, label: item.name })),
    ],
    [jabatan]
  );
  const supervisorItems = useMemo(
    () => [
      { value: NO_ASSIGNMENT_VALUE, label: "Tidak ada" },
      ...users
        .filter((item) => item.id !== user.id)
        .map((item) => ({
          value: item.id,
          label: `${item.displayName} · ${item.email}`,
        })),
    ],
    [user.id, users]
  );

  async function handleApprove() {
    setPending(true);

    try {
      await approveUser(
        user.id,
        {
          unitKerjaId: unitKerjaId === NO_ASSIGNMENT_VALUE ? null : unitKerjaId,
          jabatanId: jabatanId === NO_ASSIGNMENT_VALUE ? null : jabatanId,
          supervisorId:
            supervisorId === NO_ASSIGNMENT_VALUE ? null : supervisorId,
        },
        actorId
      );
      toast.success(`${user.displayName} disetujui.`);
      onApproved();
    } catch (error) {
      toast.error(mapPenggunaError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Setujui {user.displayName}</DialogTitle>
          <DialogDescription>
            Atur penempatan sebelum menyetujui. Bisa diubah lagi nanti di menu
            Pengguna.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="approve-unit">Unit kerja</Label>
            <Select
              value={unitKerjaId}
              onValueChange={(value) => value && setUnitKerjaId(value)}
              items={unitItems}
              disabled={pending}
            >
              <SelectTrigger id="approve-unit" className="w-full">
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
            <Label htmlFor="approve-jabatan">Jabatan</Label>
            <Select
              value={jabatanId}
              onValueChange={(value) => value && setJabatanId(value)}
              items={jabatanItems}
              disabled={pending}
            >
              <SelectTrigger id="approve-jabatan" className="w-full">
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
            <Label htmlFor="approve-supervisor">Atasan</Label>
            <Select
              value={supervisorId}
              onValueChange={(value) => value && setSupervisorId(value)}
              items={supervisorItems}
              disabled={pending}
            >
              <SelectTrigger id="approve-supervisor" className="w-full">
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
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleApprove()}>
            {pending ? "Menyimpan..." : "Setujui"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvitationListCard({
  invitations,
}: {
  invitations: ReturnType<typeof useInvitationList>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Undangan</CardTitle>
        <CardDescription>
          Email yang sudah diundang untuk mode pendaftaran &quot;tertutup&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {invitations.error}
          </p>
        ) : null}

        {invitations.loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Memuat data...
          </p>
        ) : invitations.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada undangan.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.items.map((item) => (
                <TableRow key={item.email}>
                  <TableCell className="max-w-56 truncate">{item.email}</TableCell>
                  <TableCell>{item.namaLengkap}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.usedAt ? (
                      <Badge variant="outline">Sudah dipakai</Badge>
                    ) : (
                      <Badge variant="secondary">Belum dipakai</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
