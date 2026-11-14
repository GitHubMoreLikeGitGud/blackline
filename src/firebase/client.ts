import { type FirebaseApp, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { type AI, getAI, GoogleAIBackend } from "firebase/ai";
import { type FirebaseSetup } from "./config.ts";

const LOCAL_DEBUG_SITE_KEY = "localhost-debug-not-a-secret";

export interface FirebaseClient {
  app: FirebaseApp;
  ai: AI;
  appCheckMode: "debug" | "recaptcha";
  placeholderSiteKey: boolean;
}

let client: FirebaseClient | null = null;

export function getFirebaseClient(): FirebaseClient | null {
  return client;
}

export function ensureFirebase(setup: FirebaseSetup): FirebaseClient {
  if (!setup.ok) {
    throw new Error("Firebase config is missing.");
  }
  if (client) return client;

  const app = initializeApp(setup.config);
  const localhost = isLocalhost();
  const siteKey = setup.appCheckSiteKey ?? (localhost ? LOCAL_DEBUG_SITE_KEY : null);
  if (!siteKey) {
    throw new Error(
      "Add VITE_FIREBASE_APPCHECK_SITE_KEY. App Check outside localhost needs a reCAPTCHA Enterprise site key.",
    );
  }

  if (localhost) {
    // Debug provider: true prints a token in the console. Never assign a token string here.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  const ai = getAI(app, { backend: new GoogleAIBackend() });
  client = {
    app,
    ai,
    appCheckMode: localhost ? "debug" : "recaptcha",
    placeholderSiteKey: setup.appCheckSiteKey === null,
  };
  return client;
}

function isLocalhost(): boolean {
  if (typeof location === "undefined") return false;
  return (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "::1" ||
    location.hostname === "[::1]"
  );
}
