"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DASHBOARD_ROUTES } from "@/components/dashboard/nav";
import { SupervisorAssessmentForm } from "@/components/dashboard/supervisor-assessment-form";
import { buttonVariants } from "@/components/ui/button";
import { getActiveAssessmentPeriod } from "@/lib/services/assessment-period";
import { listKompetensiLevels } from "@/lib/services/kompetensi-level";
import { getPenggunaById } from "@/lib/services/pengguna";
import {
  getSelfAssessment,
  listAssessmentAnswers,
  listQuestionsForSelfAssessment,
} from "@/lib/services/self-assessment";
import {
  getSupervisorAssessment,
  mapSupervisorAssessmentError,
} from "@/lib/services/supervisor-assessment";
import type {
  Assessment,
  AssessmentAnswer,
  AssessmentPeriod,
  KompetensiLevel,
  Question,
  UserProfile,
} from "@/types";

type PageData = {
  period: AssessmentPeriod;
  employee: UserProfile;
  selfAssessment: Assessment;
  supervisorAssessment: Assessment | null;
  questions: Question[];
  answers: AssessmentAnswer[];
  levels: KompetensiLevel[];
};

export default function PenilaianAtasanFormPage() {
  const params = useParams<{ employeeId: string }>();
  const { profile } = useAuth();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const supervisor = profile;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [period, employee] = await Promise.all([
          getActiveAssessmentPeriod(),
          getPenggunaById(params.employeeId),
        ]);

        if (!period) {
          throw new Error("Tidak ada periode aktif.");
        }

        if (!employee || employee.supervisorId !== supervisor.id) {
          throw new Error("Pegawai ini bukan bawahan Anda.");
        }

        const selfAssessment = await getSelfAssessment(period.id, employee.id);
        if (!selfAssessment) {
          throw new Error(
            "Bawahan ini belum mengisi self assessment pada periode aktif."
          );
        }

        const answers = await listAssessmentAnswers(selfAssessment.id);
        const [questionSet, levels, supervisorAssessment] = await Promise.all([
          listQuestionsForSelfAssessment({
            tusiIds:
              employee.tusiIds.length > 0
                ? employee.tusiIds
                : selfAssessment.assignment.tusiIds,
            keepQuestionIds: answers.map((item) => item.questionId),
          }),
          listKompetensiLevels(),
          getSupervisorAssessment(period.id, employee.id, supervisor.id),
        ]);

        if (!cancelled) {
          setData({
            period,
            employee,
            selfAssessment,
            supervisorAssessment,
            questions: questionSet.questions,
            answers,
            levels,
          });
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
  }, [params.employeeId, profile]);

  if (!profile) {
    return null;
  }

  if (loading) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        Memuat data penilaian bawahan...
      </p>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ?? "Data tidak ditemukan."}
        </p>
        <Link
          href={DASHBOARD_ROUTES.penilaianAtasan}
          className={buttonVariants({ variant: "outline" })}
        >
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <SupervisorAssessmentForm
      period={data.period}
      employee={data.employee}
      supervisor={profile}
      selfAssessment={data.selfAssessment}
      selfQuestions={data.questions}
      selfAnswers={data.answers}
      levels={data.levels}
      initial={data.supervisorAssessment}
    />
  );
}
