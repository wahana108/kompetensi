import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  EMULATOR_HOSTS,
  EMULATOR_PORTS,
  readFirebaseClientConfig,
  shouldUseFirebaseEmulator,
  type FirebaseClientConfig,
} from "./env";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

export function getFirebaseClientConfig(): FirebaseClientConfig | null {
  return readFirebaseClientConfig();
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseClientConfig() !== null;
}

export function isUsingFirebaseEmulator(): boolean {
  return shouldUseFirebaseEmulator();
}

export function getFirebaseApp(): FirebaseApp | null {
  const config = getFirebaseClientConfig();
  if (!config) {
    return null;
  }

  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
  }

  return app;
}

export function getClientAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  if (!auth) {
    auth = getAuth(firebaseApp);
  }

  connectAuthEmulatorIfNeeded(auth);
  return auth;
}

export function getClientDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  if (!db) {
    db = getFirestore(firebaseApp);
  }

  connectFirestoreEmulatorIfNeeded(db);
  return db;
}

function connectAuthEmulatorIfNeeded(authInstance: Auth) {
  if (!shouldUseFirebaseEmulator() || typeof window === "undefined") {
    return;
  }

  if (authEmulatorConnected || authInstance.emulatorConfig) {
    authEmulatorConnected = true;
    return;
  }

  try {
    connectAuthEmulator(
      authInstance,
      `http://${EMULATOR_HOSTS.auth}:${EMULATOR_PORTS.auth}`,
      { disableWarnings: true }
    );
    authEmulatorConnected = true;
  } catch (error) {
    if (isAlreadyConnectedError(error)) {
      authEmulatorConnected = true;
      return;
    }
    throw error;
  }
}

function connectFirestoreEmulatorIfNeeded(dbInstance: Firestore) {
  if (!shouldUseFirebaseEmulator() || typeof window === "undefined") {
    return;
  }

  if (firestoreEmulatorConnected) {
    return;
  }

  try {
    connectFirestoreEmulator(
      dbInstance,
      EMULATOR_HOSTS.firestore,
      EMULATOR_PORTS.firestore
    );
    firestoreEmulatorConnected = true;
  } catch (error) {
    if (isAlreadyConnectedError(error)) {
      firestoreEmulatorConnected = true;
      return;
    }
    throw error;
  }
}

function isAlreadyConnectedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("already been called") ||
    message.includes("has already been initialized") ||
    message.includes("already connected")
  );
}
