import { afterEach, describe, expect, it, vi } from "vitest";
import { isOffDevice, startNetworkWatch, summarize } from "./watch.ts";

describe("isOffDevice", () => {
  it("keeps loopback, data: and blob: on this computer", () => {
    expect(isOffDevice("http://127.0.0.1:43123/samples/invoice.png")).toBe(false);
    expect(isOffDevice("ws://localhost:43123/")).toBe(false);
    expect(isOffDevice("http://[::1]:5173/src/main.tsx")).toBe(false);
    expect(isOffDevice("http://app.localhost/")).toBe(false);
    expect(isOffDevice("data:image/png;base64,iVBORw0KGgo=")).toBe(false);
    expect(isOffDevice("blob:http://127.0.0.1:43123/0b1c")).toBe(false);
  });

  it("counts any other host, including a hosted copy of the app", () => {
    expect(isOffDevice("https://firebasevertexai.googleapis.com/v1beta/projects/x:generateContent")).toBe(true);
    expect(isOffDevice("https://blackline-7c4df.web.app/assets/index.js")).toBe(true);
    expect(isOffDevice("http://192.168.1.20/")).toBe(true);
  });

  it("counts an unparseable address, so the total never understates", () => {
    expect(isOffDevice("not a url")).toBe(true);
  });
});

describe("summarize", () => {
  it("counts every off-device request and lists each host once", () => {
    const report = summarize([
      "https://firebaseappcheck.googleapis.com/v1/projects/p/apps/a:exchangeDebugToken",
      "http://127.0.0.1:43123/samples/lease.png",
      "https://firebasevertexai.googleapis.com/v1beta/a",
      "https://firebasevertexai.googleapis.com/v1beta/b",
    ]);
    expect(report.offDevice).toBe(3);
    expect(report.hosts).toEqual(["firebaseappcheck.googleapis.com", "firebasevertexai.googleapis.com"]);
  });

  it("reports zero for a local-only list", () => {
    expect(summarize(["http://127.0.0.1:43123/a", "data:text/plain,hi"])).toEqual({ offDevice: 0, hosts: [] });
  });
});

describe("startNetworkWatch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("says so when the browser cannot count requests", () => {
    vi.stubGlobal("PerformanceObserver", undefined);
    const stop = startNetworkWatch();
    expect(stop()).toEqual({ supported: false, offDevice: 0, hosts: [] });
  });

  it("returns the same report when stopped twice", () => {
    const stop = startNetworkWatch();
    expect(stop()).toBe(stop());
  });
});
