export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type FirebaseSetup =
  | {
      ok: true;
      config: FirebaseWebConfig;
      appCheckSiteKey: string | null;
    }
  | {
      ok: false;
      missing: string[];
    };

const FIELD_NAMES = [
  ["VITE_FIREBASE_API_KEY", "apiKey"],
  ["VITE_FIREBASE_AUTH_DOMAIN", "authDomain"],
  ["VITE_FIREBASE_PROJECT_ID", "projectId"],
  ["VITE_FIREBASE_STORAGE_BUCKET", "storageBucket"],
  ["VITE_FIREBASE_MESSAGING_SENDER_ID", "messagingSenderId"],
  ["VITE_FIREBASE_APP_ID", "appId"],
] as const;

export function isConfiguredValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 4) return false;
  if (/^your[-_]/i.test(trimmed)) return false;
  if (/placeholder|changeme|replace-?me|xxxx+/i.test(trimmed)) return false;
  if (/^0+$/.test(trimmed)) return false;
  if (trimmed.includes("your-project")) return false;
  if (trimmed.includes("000000000000")) return false;
  return true;
}

export function readFirebaseSetup(
  env: Record<string, unknown> = import.meta.env as Record<string, unknown>,
): FirebaseSetup {
  const missing: string[] = [];
  const config: Partial<FirebaseWebConfig> = {};
  for (const [envName, key] of FIELD_NAMES) {
    const value = env[envName];
    if (!isConfiguredValue(value)) {
      missing.push(envName);
      continue;
    }
    config[key] = value.trim();
  }
  if (missing.length > 0 || !isCompleteConfig(config)) {
    return { ok: false, missing };
  }
  const siteKey = env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  return {
    ok: true,
    config,
    appCheckSiteKey: isConfiguredValue(siteKey) ? siteKey.trim() : null,
  };
}

function isCompleteConfig(config: Partial<FirebaseWebConfig>): config is FirebaseWebConfig {
  return FIELD_NAMES.every(([, key]) => typeof config[key] === "string");
}
