"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useAssessmentPeriodList } from "@/hooks/use-assessment-period";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { useQuestionList } from "@/hooks/use-question";
import { useTestSession } from "@/hooks/use-test-session";
import { DASHBOARD_ROUTES } from "@/components/dashboard/nav";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mapTestSessionError, submitTestSession } from "@/lib/services/test-session";
import type { Question, TestSession } from "@/types";

export default function TesPengetahuanPage() {
  const { profile } = useAuth();
  const periods = useAssessmentPeriodList();
  const questions = useQuestionList();
  const kompetensi = useKompetensiList();

  const activePeriod = useMemo(
    () => periods.items.find((item) => item.status === "active") ?? null,
    [periods.items]
  );
  const session = useTestSession(profile?.id ?? null, activePeriod?.id ?? null);

  const testQuestions = useMemo(
    () =>
      questions.items.filter(
        (item) => item.type === "multiple_choice" && item.isActive
      ),
    [questions.items]
  );

  const kompetensiName = useMemo(
    () => new Map(kompetensi.items.map((item) => [item.id, item.name])),
    [kompetensi.items]
  );

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!profile) {
    return null;
  }

  const loading = periods.loading || questions.loading || session.loading;
  const allAnswered =
    testQuestions.length > 0 && testQuestions.every((item) => Boolean(answers[item.id]));

  async function handleSubmit() {
    if (!profile || !activePeriod) {
      return;
    }

    setSubmitting(true);

    try {
      await submitTestSession({
        employeeId: profile.id,
        periodId: activePeriod.id,
        answers: testQuestions.map((item) => ({
          questionId: item.id,
          kompetensiId: item.kompetensiId,
          selectedValue: answers[item.id],
        })),
      });
      toast.success("Tes pengetahuan terkirim.");
      await session.reload();
    } catch (error) {
      toast.error(mapTestSessionError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tes Pengetahuan</CardTitle>
          <CardDescription>
            Opsional. Hasilnya dipakai atasan sebagai validasi tambahan —{" "}
            <strong>tidak</strong> memengaruhi skor penilaian kompetensi Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activePeriod ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada periode penilaian aktif saat ini.
            </p>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat...
            </p>
          ) : session.item ? (
            <TestResultSummary
              session={session.item}
              kompetensiName={kompetensiName}
            />
          ) : testQuestions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada soal pilihan ganda aktif.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {Object.keys(answers).length} / {testQuestions.length} soal dijawab
              </p>
              {testQuestions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  index={index + 1}
                  question={question}
                  value={answers[question.id]}
                  disabled={submitting}
                  onChange={(value) =>
                    setAnswers((current) => ({ ...current, [question.id]: value }))
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <Link
            href={DASHBOARD_ROUTES.home}
            className={buttonVariants({ variant: "outline" })}
          >
            {session.item ? "Kembali" : "Lewati untuk sekarang"}
          </Link>
          {!session.item && activePeriod && testQuestions.length > 0 ? (
            <Button
              type="button"
              disabled={!allAnswered || submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Mengirim..." : "Kirim Tes"}
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  value,
  disabled,
  onChange,
}: {
  index: number;
  question: Question;
  value: string | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-sm font-medium">
        {index}. {question.text}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(question.options ?? []).map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name={question.id}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function TestResultSummary({
  session,
  kompetensiName,
}: {
  session: TestSession;
  kompetensiName: Map<string, string>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border border-green-600/30 bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
        <CheckCircle2 className="size-4 shrink-0" />
        Tes sudah dikirim untuk periode ini dan tidak bisa diulang.
      </div>

      {session.skorPerKompetensi === null ? (
        <p className="text-sm text-muted-foreground">Menghitung hasil...</p>
      ) : session.skorPerKompetensi.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tidak ada soal yang tertaut ke kompetensi tertentu.
        </p>
      ) : (
        <div className="space-y-2">
          {session.skorPerKompetensi.map((item) => (
            <div
              key={item.kompetensiId}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>{kompetensiName.get(item.kompetensiId) ?? item.kompetensiId}</span>
              <Badge variant="secondary">
                {item.jumlahBenar}/{item.jumlahSoal} benar ({item.persenBenar}%)
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
