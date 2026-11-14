import { describe, expect, it } from "vitest";
import { isConfiguredValue, readFirebaseSetup } from "./config.ts";

describe("isConfiguredValue", () => {
  it("rejects empty and example placeholders", () => {
    expect(isConfiguredValue(undefined)).toBe(false);
    expect(isConfiguredValue("")).toBe(false);
    expect(isConfiguredValue("your-api-key")).toBe(false);
    expect(isConfiguredValue("your-project.firebaseapp.com")).toBe(false);
    expect(isConfiguredValue("your-project.firebasestorage.app")).toBe(false);
    expect(isConfiguredValue("000000000000")).toBe(false);
    expect(isConfiguredValue("your-recaptcha-v3-site-key")).toBe(false);
    expect(isConfiguredValue("replace-me")).toBe(false);
  });

  it("accepts a filled value", () => {
    expect(isConfiguredValue("AIzaSyExampleValueNotReal123")).toBe(true);
  });
});

describe("readFirebaseSetup", () => {
  it("stays unconfigured when the example file is copied unchanged", () => {
    const setup = readFirebaseSetup({
      VITE_FIREBASE_API_KEY: "your-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "your-project.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "your-project-id",
      VITE_FIREBASE_STORAGE_BUCKET: "your-project.firebasestorage.app",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "your-sender-id",
      VITE_FIREBASE_APP_ID: "your-app-id",
      VITE_FIREBASE_APPCHECK_SITE_KEY: "your-recaptcha-v3-site-key",
    });
    expect(setup.ok).toBe(false);
    if (setup.ok) return;
    expect(setup.missing).toEqual([
      "VITE_FIREBASE_API_KEY",
      "VITE_FIREBASE_AUTH_DOMAIN",
      "VITE_FIREBASE_PROJECT_ID",
      "VITE_FIREBASE_STORAGE_BUCKET",
      "VITE_FIREBASE_MESSAGING_SENDER_ID",
      "VITE_FIREBASE_APP_ID",
    ]);
  });

  it("accepts real-looking web config and leaves a placeholder site key unset", () => {
    const setup = readFirebaseSetup({
      VITE_FIREBASE_API_KEY: "AIzaSyExampleValueNotReal123",
      VITE_FIREBASE_AUTH_DOMAIN: "blackline-demo.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "blackline-demo",
      VITE_FIREBASE_STORAGE_BUCKET: "blackline-demo.firebasestorage.app",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "123456789012",
      VITE_FIREBASE_APP_ID: "1:123456789012:web:abcdef123456",
      VITE_FIREBASE_APPCHECK_SITE_KEY: "your-recaptcha-v3-site-key",
    });
    expect(setup.ok).toBe(true);
    if (!setup.ok) return;
    expect(setup.config.projectId).toBe("blackline-demo");
    expect(setup.appCheckSiteKey).toBeNull();
  });
});
