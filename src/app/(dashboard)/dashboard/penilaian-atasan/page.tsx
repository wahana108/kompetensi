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
  listSupervisorReviewCards,
  mapSupervisorAssessmentError,
  type SupervisorReviewCard,
} from "@/lib/services/supervisor-assessment";
import type { AssessmentPeriod } from "@/types";

export default function PenilaianAtasanListPage() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<AssessmentPeriod | null>(null);
  const [cards, setCards] = useState<SupervisorReviewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const supervisorId = profile.id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const next = await listSupervisorReviewCards(supervisorId);
        if (!cancelled) {
          setPeriod(next.period);
          setCards(next.cards);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(mapSupervisorAssessmentError(loadError));
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
          <CardTitle>Penilaian bawahan</CardTitle>
          <CardDescription>
            {period
              ? `Periode aktif: ${period.name} (${period.startsAt} s.d. ${period.endsAt}).`
              : "Belum ada periode aktif. Penilaian atasan menunggu admin mengaktifkan periode."}
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
              Memuat daftar bawahan...
            </p>
          ) : !period ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Tidak ada periode penilaian yang aktif saat ini.
            </p>
          ) : cards.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada bawahan yang mengisi self assessment pada periode ini.
            </p>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => {
                const selfSubmitted = card.selfAssessment.status === "submitted";

                return (
                  <div
                    key={card.employee.id}
                    className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">{card.employee.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {card.employee.email}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={card.reviewed ? "default" : "outline"}>
                          {card.reviewed ? "Sudah dinilai" : "Belum dinilai"}
                        </Badge>
                        <Badge variant="secondary">
                          {selfSubmitted
                            ? "Self assessment terkirim"
                            : "Self assessment draft"}
                        </Badge>
                      </div>
                    </div>
                    <Link
                      href={DASHBOARD_ROUTES.penilaianAtasanForm(
                        card.employee.id
                      )}
                      className={buttonVariants({
                        variant: card.reviewed ? "outline" : "default",
                      })}
                    >
                      {card.reviewed ? "Lihat penilaian" : "Nilai"}
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
