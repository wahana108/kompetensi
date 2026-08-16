import "server-only";

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  EMULATOR_HOSTS,
  EMULATOR_PORTS,
  readFirebaseAdminConfig,
  shouldUseFirebaseEmulator,
} from "./env";

const DEMO_PROJECT_ID = "demo-tna-kompetensi";

function applyEmulatorHosts() {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= `${EMULATOR_HOSTS.auth}:${EMULATOR_PORTS.auth}`;
  process.env.FIRESTORE_EMULATOR_HOST ??= `${EMULATOR_HOSTS.firestore}:${EMULATOR_PORTS.firestore}`;
  process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST ??= `${EMULATOR_HOSTS.functions}:${EMULATOR_PORTS.functions}`;
}

function getEmulatorProjectId(): string {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    DEMO_PROJECT_ID
  );
}

export function isAdminConfigured(): boolean {
  return shouldUseFirebaseEmulator() || readFirebaseAdminConfig() !== null;
}

export function getAdminApp(): App | null {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  if (shouldUseFirebaseEmulator()) {
    applyEmulatorHosts();
    return initializeApp({ projectId: getEmulatorProjectId() });
  }

  const config = readFirebaseAdminConfig();
  if (!config) {
    return null;
  }

  const serviceAccount: ServiceAccount = {
    projectId: config.projectId,
    clientEmail: config.clientEmail,
    privateKey: config.privateKey,
  };

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: config.projectId,
  });
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}
