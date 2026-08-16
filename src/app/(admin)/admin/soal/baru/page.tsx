"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { useQuestionList } from "@/hooks/use-question";
import { useTusiList } from "@/hooks/use-tusi";
import { QuestionForm } from "@/components/admin/question-form";
import { nextQuestionSortOrder } from "@/lib/services/question";

export default function NewSoalPage() {
  return (
    <Suspense fallback={<FormStatus>Memuat formulir...</FormStatus>}>
      <NewSoalForm />
    </Suspense>
  );
}

function NewSoalForm() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const questions = useQuestionList();
  const kompetensi = useKompetensiList();
  const tusi = useTusiList();
  const requestedKompetensiId = searchParams.get("kompetensiId");
  const requestedTusiId = searchParams.get("tusiId");

  if (!profile) {
    return null;
  }

  if (questions.loading || kompetensi.loading || tusi.loading) {
    return <FormStatus>Memuat data master...</FormStatus>;
  }

  if (questions.error || kompetensi.error || tusi.error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {questions.error ?? kompetensi.error ?? tusi.error}
      </p>
    );
  }

  const defaultKompetensiId =
    requestedKompetensiId &&
    kompetensi.items.some((item) => item.id === requestedKompetensiId)
      ? requestedKompetensiId
      : null;
  const defaultTusiId =
    requestedTusiId && tusi.items.some((item) => item.id === requestedTusiId)
      ? requestedTusiId
      : null;

  return (
    <QuestionForm
      mode="create"
      actorId={profile.id}
      kompetensi={kompetensi.items}
      tusi={tusi.items}
      defaultKompetensiId={defaultKompetensiId}
      defaultTusiId={defaultTusiId}
      defaultSortOrder={nextQuestionSortOrder(questions.items)}
    />
  );
}

function FormStatus({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
