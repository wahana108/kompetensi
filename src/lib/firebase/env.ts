import { z } from "zod";

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const requiredString = z.preprocess(emptyToUndefined, z.string().min(1));
const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional()
);

export const firebaseClientEnvSchema = z.object({
  apiKey: requiredString,
  authDomain: requiredString,
  projectId: requiredString,
  appId: requiredString,
  storageBucket: optionalString,
  messagingSenderId: optionalString,
});

export type FirebaseClientConfig = z.infer<typeof firebaseClientEnvSchema>;

export const firebaseAdminEnvSchema = z.object({
  projectId: requiredString,
  clientEmail: z.preprocess(emptyToUndefined, z.email()),
  privateKey: requiredString,
});

export type FirebaseAdminConfig = z.infer<typeof firebaseAdminEnvSchema>;

/** Nilai dummy yang cukup untuk init SDK saat mode emulator. */
export const EMULATOR_FALLBACK_CLIENT_CONFIG: FirebaseClientConfig = {
  apiKey: "demo-tna-kompetensi-api-key",
  authDomain: "demo-tna-kompetensi.firebaseapp.com",
  projectId: "demo-tna-kompetensi",
  appId: "1:0:web:demo-tna-kompetensi",
};

function fallbackWhenEmpty(
  value: string | undefined,
  fallback: string
): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function readFirebaseClientConfig(): FirebaseClientConfig | null {
  const raw = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };

  const parsed = firebaseClientEnvSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  if (shouldUseFirebaseEmulator()) {
    return {
      apiKey: fallbackWhenEmpty(
        raw.apiKey,
        EMULATOR_FALLBACK_CLIENT_CONFIG.apiKey
      ),
      authDomain: fallbackWhenEmpty(
        raw.authDomain,
        EMULATOR_FALLBACK_CLIENT_CONFIG.authDomain
      ),
      projectId: fallbackWhenEmpty(
        raw.projectId,
        EMULATOR_FALLBACK_CLIENT_CONFIG.projectId
      ),
      appId: fallbackWhenEmpty(raw.appId, EMULATOR_FALLBACK_CLIENT_CONFIG.appId),
      storageBucket: emptyToUndefined(raw.storageBucket) as string | undefined,
      messagingSenderId: emptyToUndefined(raw.messagingSenderId) as
        | string
        | undefined,
    };
  }

  return null;
}

export function readFirebaseAdminConfig(): FirebaseAdminConfig | null {
  const parsed = firebaseAdminEnvSchema.safeParse({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  });

  return parsed.success ? parsed.data : null;
}

export function shouldUseFirebaseEmulator(): boolean {
  return (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" ||
    process.env.FIREBASE_ADMIN_USE_EMULATOR === "true"
  );
}

export const EMULATOR_HOSTS = {
  auth: "127.0.0.1",
  firestore: "127.0.0.1",
  functions: "127.0.0.1",
} as const;

export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
  ui: 4000,
} as const;
