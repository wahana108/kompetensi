"use client";

import { useMemo, useState } from "react";
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
import { getPeriodStatusLabel } from "@/lib/services/assessment-period";
import {
  isAnswerableQuestion,
  mapSelfAssessmentError,
  saveSelfAssessmentAnswer,
  submitSelfAssessment,
  type QuestionMatch,
} from "@/lib/services/self-assessment";
import type {
  Assessment,
  AssessmentAnswer,
  AssessmentPeriod,
  KompetensiLevel,
  Question,
} from "@/types";

type SelfAssessmentFormProps = {
  period: AssessmentPeriod;
  assessment: Assessment | null;
  questions: Question[];
  matches: Record<string, QuestionMatch>;
  source: "tusi" | "campuran" | "semua";
  levels: KompetensiLevel[];
  initialAnswers: AssessmentAnswer[];
  actorId: string;
  tusiIds: string[];
  fillable: boolean;
  unitName: string | null;
  tusiNames: string[];
};

export function SelfAssessmentForm({
  period,
  assessment,
  questions,
  matches,
  source,
  levels,
  initialAnswers,
  actorId,
  tusiIds,
  fillable,
  unitName,
  tusiNames,
}: SelfAssessmentFormProps) {
  const [current, setCurrent] = useState(assessment);
  const [answers, setAnswers] = useState<Record<string, string | number>>(() => {
    const next: Record<string, string | number> = {};
    for (const item of initialAnswers) {
      if (item.value !== null) {
        next[item.questionId] = item.value;
      }
    }
    return next;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = current?.status === "submitted";
  const editable = Boolean(current) && fillable && !submitted;
  const answerable = useMemo(
    () => questions.filter(isAnswerableQuestion),
    [questions]
  );
  const answeredCount = answerable.filter(
    (item) => answers[item.id] !== undefined
  ).length;

  async function handleAnswer(question: Question, value: string | number) {
    if (!current || !editable) {
      return;
    }

    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setSavingId(question.id);

    try {
      await saveSelfAssessmentAnswer({
        assessment: current,
        question,
        value,
        actorId,
      });
    } catch (error) {
      toast.error(mapSelfAssessmentError(error));
    } finally {
      setSavingId(null);
    }
  }

  async function handleSubmit() {
    if (!current) {
      return;
    }

    setSubmitting(true);

    try {
      const next = await submitSelfAssessment(current, actorId, tusiIds);
      setCurrent(next);
      toast.success("Penilaian diri dikirim.");
    } catch (error) {
      toast.error(mapSelfAssessmentError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{period.name}</CardTitle>
            <Badge
              variant={period.status === "active" ? "default" : "secondary"}
            >
              {getPeriodStatusLabel(period.status)}
            </Badge>
            {submitted ? <Badge variant="outline">Sudah dikirim</Badge> : null}
          </div>
          <CardDescription>
            {period.year} · {period.startsAt} s.d. {period.endsAt}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Unit kerja: </span>
              {unitName ?? "Belum diatur"}
            </p>
            <p>
              <span className="text-muted-foreground">TUSI: </span>
              {tusiNames.length > 0 ? tusiNames.join(", ") : "Belum diatur"}
            </p>
          </div>
          <p>
            <span className="text-muted-foreground">Soal yang harus diisi: </span>
            {answerable.length}
            {answerable.length > 0
              ? ` · ${answeredCount} sudah dijawab`
              : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {sourceLabel(source, tusiNames.length > 0)}. Jawaban tersimpan otomatis
            per soal.
          </p>
        </CardContent>
      </Card>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {tusiNames.length > 0
              ? "Belum ada soal aktif yang cocok dengan TUSI, kompetensi terkait, atau soal umum. Hubungi admin untuk menambahkan soal."
              : "Belum ada soal aktif di Bank Soal. Hubungi admin untuk menambahkan soal."}
          </CardContent>
        </Card>
      ) : (
        questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            index={index + 1}
            question={question}
            match={matches[question.id]}
            levels={levels}
            value={answers[question.id]}
            saving={savingId === question.id}
            disabled={!editable}
            onChange={(value) => void handleAnswer(question, value)}
          />
        ))
      )}

      <Card>
        <CardFooter className="justify-between gap-2">
          <Link
            href={DASHBOARD_ROUTES.penilaian}
            className={buttonVariants({ variant: "outline" })}
          >
            Kembali
          </Link>
          {editable ? (
            <Button
              type="button"
              disabled={
                submitting ||
                answerable.length === 0 ||
                answeredCount < answerable.length
              }
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Mengirim..." : "Kirim penilaian"}
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
  match,
  levels,
  value,
  saving,
  disabled,
  onChange,
}: {
  index: number;
  question: Question;
  match?: QuestionMatch;
  levels: KompetensiLevel[];
  value: string | number | undefined;
  saving: boolean;
  disabled: boolean;
  onChange: (value: string | number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-sm">
            {index}. {question.text}
          </CardTitle>
          {match ? (
            <Badge variant="outline">{matchLabel(match)}</Badge>
          ) : null}
        </div>
        <CardDescription>
          {saving
            ? "Menyimpan..."
            : value !== undefined
              ? "Tersimpan"
              : "Belum dijawab"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {question.type === "likert" ? (
          <ScaleOptions
            name={question.id}
            levels={levels}
            min={question.scaleMin}
            max={question.scaleMax}
            value={value}
            disabled={disabled}
            onChange={onChange}
          />
        ) : question.type === "yes_no" ||
          (question.options && question.options.length > 0) ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {(question.options ?? []).map((option) => {
              const selected = String(value) === option.value;

              return (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.value}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onChange(option.value)}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tipe soal ini belum bisa diisi. Opsi belum diatur.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ScaleOptions({
  name,
  levels,
  min,
  max,
  value,
  disabled,
  onChange,
}: {
  name: string;
  levels: KompetensiLevel[];
  min: number | null;
  max: number | null;
  value: string | number | undefined;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const options =
    levels.length > 0
      ? levels
          .filter((item) => item.isActive)
          .filter((item) => {
            if (min !== null && item.level < min) {
              return false;
            }

            if (max !== null && item.level > max) {
              return false;
            }

            return true;
          })
      : fallbackLevels(min, max);

  return (
    <div className="grid gap-2">
      {options.map((item) => {
        const selected = Number(value) === item.level;

        return (
          <label
            key={item.level}
            className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name={name}
              value={item.level}
              checked={selected}
              disabled={disabled}
              className="mt-1"
              onChange={() => onChange(item.level)}
            />
            <span>
              <span className="font-medium">
                {item.level}. {item.name}
              </span>
              {"description" in item && item.description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {item.description}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function sourceLabel(
  source: "tusi" | "campuran" | "semua",
  hasTusi: boolean
): string {
  if (source === "tusi") {
    return "Soal dipilih berdasarkan TUSI Anda";
  }

  if (source === "campuran") {
    return "Soal TUSI dilengkapi soal kompetensi terkait atau soal umum";
  }

  return hasTusi
    ? "Soal TUSI belum tersedia, menampilkan soal aktif yang ada"
    : "TUSI belum diatur, menampilkan semua soal aktif";
}

function matchLabel(match: QuestionMatch): string {
  switch (match) {
    case "tusi":
      return "TUSI";
    case "kompetensi":
      return "Kompetensi";
    case "umum":
      return "Umum";
    case "tersimpan":
      return "Tersimpan";
    default:
      return "Lainnya";
  }
}

function fallbackLevels(min: number | null, max: number | null) {
  const start = min ?? 1;
  const end = max ?? 5;
  const items: Array<{ level: number; name: string; description?: string }> = [];

  for (let level = start; level <= end; level += 1) {
    items.push({ level, name: `Nilai ${level}` });
  }

  return items;
}


