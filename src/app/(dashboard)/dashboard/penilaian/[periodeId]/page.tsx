"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DASHBOARD_ROUTES } from "@/components/dashboard/nav";
import { SelfAssessmentForm } from "@/components/dashboard/self-assessment-form";
import { buttonVariants } from "@/components/ui/button";
import {
  getAssessmentPeriodById,
  isPeriodFillable,
  mapPeriodError,
} from "@/lib/services/assessment-period";
import { listKompetensiLevels } from "@/lib/services/kompetensi-level";
import { getUnitKerjaById } from "@/lib/services/unit-kerja";
import { listTusi } from "@/lib/services/tusi";
import {
  getOrCreateSelfAssessment,
  getSelfAssessment,
  listAssessmentAnswers,
  listQuestionsForSelfAssessment,
  mapSelfAssessmentError,
  type QuestionMatch,
} from "@/lib/services/self-assessment";
import type {
  Assessment,
  AssessmentAnswer,
  AssessmentPeriod,
  KompetensiLevel,
  Question,
} from "@/types";

type PageData = {
  period: AssessmentPeriod;
  assessment: Assessment | null;
  questions: Question[];
  matches: Record<string, QuestionMatch>;
  source: "tusi" | "campuran" | "semua";
  levels: KompetensiLevel[];
  answers: AssessmentAnswer[];
  fillable: boolean;
  unitName: string | null;
  tusiNames: string[];
};

export default function PenilaianFormPage() {
  const params = useParams<{ periodeId: string }>();
  const { profile } = useAuth();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const user = profile;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const period = await getAssessmentPeriodById(params.periodeId);
        if (!period) {
          throw new Error("Periode tidak ditemukan.");
        }

        const existing = await getSelfAssessment(period.id, user.id);
        const fillable = isPeriodFillable(period);
        const assessment =
          fillable && existing?.status !== "submitted"
            ? await getOrCreateSelfAssessment(period, user)
            : existing;

        const answers = assessment
          ? await listAssessmentAnswers(assessment.id)
          : [];
        const tusiIds =
          user.tusiIds.length > 0
            ? user.tusiIds
            : (assessment?.assignment.tusiIds ?? []);

        const [questionSet, levels, unit, tusiItems] = await Promise.all([
          listQuestionsForSelfAssessment({
            tusiIds,
            keepQuestionIds: answers.map((item) => item.questionId),
          }),
          listKompetensiLevels(),
          user.unitKerjaId
            ? getUnitKerjaById(user.unitKerjaId)
            : Promise.resolve(null),
          user.tusiIds.length > 0 ? listTusi() : Promise.resolve([]),
        ]);

        const tusiNames = tusiItems
          .filter((item) => tusiIds.includes(item.id))
          .map((item) => item.name);

        if (!cancelled) {
          setData({
            period,
            assessment,
            questions: questionSet.questions,
            matches: questionSet.matches,
            source: questionSet.source,
            levels,
            answers,
            fillable: fillable && assessment?.status !== "submitted",
            unitName: unit?.name ?? null,
            tusiNames,
          });
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
  }, [params.periodeId, profile]);

  if (!profile) {
    return null;
  }

  if (loading) {
    return (
      <CardLike>
        Memuat kuesioner dan data TUSI Anda...
      </CardLike>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ?? "Periode tidak ditemukan."}
        </p>
        <Link
          href={DASHBOARD_ROUTES.penilaian}
          className={buttonVariants({ variant: "outline" })}
        >
          Kembali
        </Link>
      </div>
    );
  }

  if (!data.assessment && !data.fillable) {
    return (
      <div className="space-y-3">
        <CardLike>
          Periode ini tidak sedang dibuka untuk pengisian. Hanya periode aktif
          dalam rentang tanggalnya yang bisa diisi.
        </CardLike>
        <Link
          href={DASHBOARD_ROUTES.penilaian}
          className={buttonVariants({ variant: "outline" })}
        >
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <SelfAssessmentForm
      period={data.period}
      assessment={data.assessment}
      questions={data.questions}
      matches={data.matches}
      source={data.source}
      levels={data.levels}
      initialAnswers={data.answers}
      actorId={profile.id}
      tusiIds={profile.tusiIds}
      fillable={data.fillable}
      unitName={data.unitName}
      tusiNames={data.tusiNames}
    />
  );
}

function CardLike({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
