import { useEffect, useState } from "react";
import { initializeOnDevice, probePromptAvailability, type PromptAvailability } from "../ai/device.ts";
import { messageFrom } from "../errors.ts";
import { ensureFirebase } from "../firebase/client.ts";
import type { FirebaseSetup } from "../firebase/config.ts";

export type DevicePhase = "idle" | "preparing" | "ready" | "error";

export function useDeviceModel(setup: FirebaseSetup) {
  const [availability, setAvailability] = useState<PromptAvailability>("unknown");
  const [phase, setPhase] = useState<DevicePhase>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void probePromptAvailability().then((value) => {
      if (!cancelled) setAvailability(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function prepare(): Promise<void> {
    if (!setup.ok) {
      setPhase("error");
      setError("Add your Firebase config before downloading the on-device model.");
      return;
    }
    setPhase("preparing");
    setProgress(0);
    setError(null);
    try {
      ensureFirebase(setup);
      await initializeOnDevice((value) => setProgress(value));
      setPhase("ready");
      setProgress(1);
      setAvailability("available");
    } catch (caught) {
      setPhase("error");
      setError(messageFrom(caught));
    }
  }

  const canReadOnDevice = phase !== "preparing" && (phase === "ready" || availability === "available");

  return {
    availability,
    phase,
    progress,
    error,
    prepare,
    canReadOnDevice,
    reportProgress: setProgress,
  };
}
