export const COLLECTIONS = {
  users: "users",
  unitKerja: "unit_kerja",
  jabatan: "jabatan",
  pangkat: "pangkat",
  tusi: "tusi",
  kompetensi: "kompetensi",
  kompetensiLevels: "kompetensi_levels",
  standarKompetensi: "standar_kompetensi",
  questions: "questions",
  questionnaires: "questionnaires",
  assessmentPeriods: "assessment_periods",
  assessments: "assessments",
  assessmentAnswers: "assessment_answers",
  trainingProposals: "training_proposals",
  tnaRecaps: "tna_recaps",
  systemParameters: "system_parameters",
  userInvitations: "user_invitations",
  questionAnswerKeys: "question_answer_keys",
  testSessions: "test_sessions",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
