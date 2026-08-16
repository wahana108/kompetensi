"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { DASHBOARD_ROUTES } from "@/components/dashboard/nav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getPeriodStatusLabel,
  mapPeriodError,
} from "@/lib/services/assessment-period";
import {
  listEmployeePeriodCards,
  mapSelfAssessmentError,
  type EmployeePeriodCard,
} from "@/lib/services/self-assessment";

export default function PenilaianListPage() {
  const { profile } = useAuth();
  const [cards, setCards] = useState<EmployeePeriodCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const employeeId = profile.id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const next = await listEmployeePeriodCards(employeeId);
        if (!cancelled) {
          setCards(next);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            mapSelfAssessmentError(loadError) || mapPeriodError(loadError)
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Periode penilaian</CardTitle>
          <CardDescription>
            Isi kuesioner pada periode aktif. Soal diprioritaskan sesuai TUSI
            yang diampu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Memuat periode penilaian...
            </p>
          ) : cards.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada periode yang bisa diisi. Tunggu admin mengaktifkan
              periode penilaian.
            </p>
          ) : (
            <div className="space-y-3">
              {cards.map(({ period, assessment, fillable }) => {
                const submitted = assessment?.status === "submitted";

                return (
                  <div
                    key={period.id}
                    className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{period.name}</p>
                        <Badge
                          variant={
                            period.status === "active" ? "default" : "secondary"
                          }
                        >
                          {getPeriodStatusLabel(period.status)}
                        </Badge>
                        {submitted ? (
                          <Badge variant="outline">Sudah dikirim</Badge>
                        ) : assessment ? (
                          <Badge variant="outline">Draft tersimpan</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {period.year} · {period.startsAt} s.d. {period.endsAt}
                      </p>
                    </div>
                    <Link
                      href={DASHBOARD_ROUTES.penilaianForm(period.id)}
                      className={buttonVariants({
                        variant: fillable ? "default" : "outline",
                      })}
                    >
                      {submitted
                        ? "Lihat jawaban"
                        : fillable
                          ? "Isi penilaian"
                          : "Buka"}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
