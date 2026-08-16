"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  KOMPETENSI_DIMENSI_OPTIONS,
  getKompetensiDimensiLabel,
} from "@/lib/services/kompetensi";
import {
  emptyDimensionScores,
  hasCompleteScores,
  mapSupervisorAssessmentError,
  saveSupervisorAssessment,
} from "@/lib/services/supervisor-assessment";
import type {
  Assessment,
  AssessmentAnswer,
  AssessmentPeriod,
  KompetensiDimensi,
  KompetensiLevel,
  Question,
  SupervisorDimensionScores,
  UserProfile,
} from "@/types";

type SupervisorAssessmentFormProps = {
  period: AssessmentPeriod;
  employee: UserProfile;
  supervisor: UserProfile;
  selfAssessment: Assessment;
  selfQuestions: Question[];
  selfAnswers: AssessmentAnswer[];
  levels: KompetensiLevel[];
  initial: Assessment | null;
};

export function SupervisorAssessmentForm({
  period,
  employee,
  supervisor,
  selfAssessment,
  selfQuestions,
  selfAnswers,
  levels,
  initial,
}: SupervisorAssessmentFormProps) {
  const [scores, setScores] = useState<SupervisorDimensionScores>(
    initial?.dimensionScores ?? emptyDimensionScores()
  );
  const [recommendation, setRecommendation] = useState(
    initial?.recommendationNote ?? ""
  );
  const [pending, setPending] = useState<"save" | "submit" | null>(null);
  const [submitted, setSubmitted] = useState(initial?.status === "submitted");
  const activeLevels = levels.filter((item) => item.isActive);
  const answersByQuestion = new Map(
    selfAnswers.map((item) => [item.questionId, item])
  );

  function setScore(dimensi: KompetensiDimensi, level: number) {
    setScores((current) => ({ ...current, [dimensi]: level }));
  }

  async function persist(submit: boolean) {
    setPending(submit ? "submit" : "save");

    try {
      const next = await saveSupervisorAssessment({
        periodId: period.id,
        employee,
        supervisor,
        scores,
        recommendationNote: recommendation,
        submit,
      });
      setSubmitted(next.status === "submitted");
      toast.success(
        submit ? "Penilaian atasan dikirim." : "Draft penilaian disimpan."
      );
    } catch (error) {
      toast.error(mapSupervisorAssessmentError(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{employee.displayName}</CardTitle>
          <CardDescription>
            {period.name} · {employee.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{period.year}</Badge>
          {submitted ? <Badge>Sudah dinilai</Badge> : <Badge variant="outline">Belum dikirim</Badge>}
          <Badge variant="outline">
            Self assessment:{" "}
            {selfAssessment.status === "submitted" ? "terkirim" : "draft"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hasil self assessment</CardTitle>
          <CardDescription>Hanya tampilan, tidak bisa diubah.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selfQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada jawaban self assessment yang bisa ditampilkan.
            </p>
          ) : (
            selfQuestions.map((question, index) => {
              const answer = answersByQuestion.get(question.id);
              return (
                <div
                  key={question.id}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium">
                    {index + 1}. {question.text}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Jawaban: {formatSelfAnswer(question, answer, levels)}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Penilaian atasan</CardTitle>
          <CardDescription>
            Nilai tiga dimensi memakai level kompetensi yang berlaku.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {activeLevels.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              Belum ada level kompetensi aktif. Minta admin mengisi Level
              Kompetensi terlebih dahulu.
            </p>
          ) : null}

          {KOMPETENSI_DIMENSI_OPTIONS.map((dimensi) => (
            <div key={dimensi.value} className="space-y-2">
              <Label>{getKompetensiDimensiLabel(dimensi.value)}</Label>
              <div className="grid gap-2">
                {activeLevels.map((level) => {
                  const selected = scores[dimensi.value] === level.level;

                  return (
                    <label
                      key={`${dimensi.value}-${level.id}`}
                      className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={`dimensi-${dimensi.value}`}
                        checked={selected}
                        disabled={submitted || pending !== null}
                        className="mt-1"
                        onChange={() => setScore(dimensi.value, level.level)}
                      />
                      <span>
                        <span className="font-medium">
                          {level.level}. {level.name}
                        </span>
                        {level.description ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {level.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="rekomendasi">Rekomendasi / usulan pelatihan</Label>
            <Textarea
              id="rekomendasi"
              value={recommendation}
              disabled={submitted || pending !== null}
              onChange={(event) => setRecommendation(event.target.value)}
              placeholder="Contoh: Pelatihan komunikasi efektif dan manajemen waktu."
            />
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <Link
            href={DASHBOARD_ROUTES.penilaianAtasan}
            className={buttonVariants({ variant: "outline" })}
          >
            Kembali
          </Link>
          {submitted ? null : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending !== null}
                onClick={() => void persist(false)}
              >
                {pending === "save" ? "Menyimpan..." : "Simpan draft"}
              </Button>
              <Button
                type="button"
                disabled={pending !== null || !hasCompleteScores(scores)}
                onClick={() => void persist(true)}
              >
                {pending === "submit" ? "Mengirim..." : "Kirim penilaian"}
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

function formatSelfAnswer(
  question: Question,
  answer: AssessmentAnswer | undefined,
  levels: KompetensiLevel[]
): string {
  if (!answer || answer.value === null) {
    return "Belum dijawab";
  }

  if (question.type === "likert" && typeof answer.value === "number") {
    const level = levels.find((item) => item.level === answer.value);
    return level ? `${level.level}. ${level.name}` : String(answer.value);
  }

  const option = question.options?.find(
    (item) => item.value === String(answer.value)
  );
  return option?.label ?? String(answer.value);
}
