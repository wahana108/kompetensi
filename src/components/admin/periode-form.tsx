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
  PERIOD_STATUS_OPTIONS,
  createAssessmentPeriod,
  mapPeriodError,
  todayDateString,
  toDateInputValue,
  updateAssessmentPeriod,
} from "@/lib/services/assessment-period";
import type { AssessmentPeriod, AssessmentPeriodStatus } from "@/types";

type PeriodeFormProps = {
  mode: "create" | "edit";
  actorId: string;
  initial?: AssessmentPeriod;
};

export function PeriodeForm({ mode, actorId, initial }: PeriodeFormProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState(initial?.name ?? "");
  const [year, setYear] = useState(String(initial?.year ?? currentYear));
  const [startsAt, setStartsAt] = useState(
    toDateInputValue(initial?.startsAt) || todayDateString()
  );
  const [endsAt, setEndsAt] = useState(
    toDateInputValue(initial?.endsAt) || todayDateString()
  );
  const [status, setStatus] = useState<AssessmentPeriodStatus>(
    initial?.status ?? "draft"
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);

    const payload = {
      name,
      year: Number(year),
      startsAt,
      endsAt,
      status,
    };

    try {
      if (mode === "create") {
        await createAssessmentPeriod(payload, actorId);
        toast.success("Periode ditambahkan.");
      } else if (initial) {
        await updateAssessmentPeriod(initial.id, payload, actorId);
        toast.success("Periode diperbarui.");
      }

      router.push(ADMIN_ROUTES.periode);
    } catch (error) {
      const message = mapPeriodError(error);
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
            {mode === "create" ? "Tambah Periode" : "Edit Periode"}
          </CardTitle>
          <CardDescription>
            Hanya satu periode yang boleh berstatus Aktif. Mengaktifkan periode
            ini akan mengembalikan periode aktif lain ke Draft.
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
              <Label htmlFor="periode-name">Nama periode</Label>
              <Input
                id="periode-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Penilaian Kompetensi Semester I"
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periode-year">Tahun</Label>
              <Input
                id="periode-year"
                type="number"
                min={2000}
                max={2100}
                step={1}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periode-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  if (
                    value === "draft" ||
                    value === "active" ||
                    value === "closed"
                  ) {
                    setStatus(value);
                  }
                }}
                items={PERIOD_STATUS_OPTIONS}
                disabled={pending}
              >
                <SelectTrigger id="periode-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periode-start">Tanggal mulai</Label>
              <Input
                id="periode-start"
                type="date"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periode-end">Tanggal selesai</Label>
              <Input
                id="periode-end"
                type="date"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                required
                disabled={pending}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Link
            href={ADMIN_ROUTES.periode}
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
