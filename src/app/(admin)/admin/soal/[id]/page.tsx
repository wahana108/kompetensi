"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { useQuestionList } from "@/hooks/use-question";
import { useTusiList } from "@/hooks/use-tusi";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { QuestionForm } from "@/components/admin/question-form";
import { buttonVariants } from "@/components/ui/button";

export default function EditSoalPage() {
  const params = useParams<{ id: string }>();
  const { profile } = useAuth();
  const questions = useQuestionList();
  const kompetensi = useKompetensiList();
  const tusi = useTusiList();
  const item = questions.items.find((entry) => entry.id === params.id);

  if (!profile) {
    return null;
  }

  if (questions.loading || kompetensi.loading || tusi.loading) {
    return <p className="text-sm text-muted-foreground">Memuat soal...</p>;
  }

  if (questions.error || kompetensi.error || tusi.error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {questions.error ?? kompetensi.error ?? tusi.error}
      </p>
    );
  }

  if (!item) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Soal tidak ditemukan. Mungkin sudah dihapus atau ID tidak valid.
        </p>
        <Link href={ADMIN_ROUTES.soal} className={buttonVariants()}>
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  return (
    <QuestionForm
      mode="edit"
      actorId={profile.id}
      kompetensi={kompetensi.items}
      tusi={tusi.items}
      initial={item}
      defaultSortOrder={item.sortOrder}
    />
  );
}
