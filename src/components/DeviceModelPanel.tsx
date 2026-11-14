import type { PromptAvailability } from "../ai/device.ts";
import type { DevicePhase } from "../hooks/useDeviceModel.ts";

interface DeviceModelPanelProps {
  configured: boolean;
  projectId: string | null;
  appCheckMode: "debug" | "recaptcha" | null;
  placeholderSiteKey: boolean;
  clientError: string | null;
  availability: PromptAvailability;
  phase: DevicePhase;
  progress: number | null;
  error: string | null;
  onPrepare: () => void;
}

export function DeviceModelPanel({
  configured,
  projectId,
  appCheckMode,
  placeholderSiteKey,
  clientError,
  availability,
  phase,
  progress,
  error,
  onPrepare,
}: DeviceModelPanelProps) {
  const percent = progress === null ? null : Math.max(0, Math.min(100, Math.round(progress * 100)));
  const preparing = phase === "preparing";
  const ready = phase === "ready";

  return (
    <section className="panel" aria-labelledby="device-title">
      <h2 id="device-title">On-device model</h2>
      <p className="lede">Gemini Nano through Firebase AI Logic. The download starts only after a click.</p>
      <p>
        <span className="kicker">Prompt API</span> {availabilityTitle(availability)}
      </p>
      <p>{availabilityDetail(availability)}</p>
      {configured && projectId ? (
        <p>
          Firebase project <strong>{projectId}</strong>. App Check{" "}
          {appCheckMode === "debug"
            ? "is using the debug provider on localhost."
            : appCheckMode === "recaptcha"
              ? "is using reCAPTCHA Enterprise."
              : "has not started yet."}
        </p>
      ) : (
        <p>Firebase is not configured, so the download button stays off.</p>
      )}
      {placeholderSiteKey && appCheckMode === "debug" ? (
        <p>
          No reCAPTCHA site key yet. Localhost still sets <code>self.FIREBASE_APPCHECK_DEBUG_TOKEN = true</code>.
          Register the token printed in the browser console. Do not commit it.
        </p>
      ) : null}
      {clientError ? (
        <p className="alert" role="alert">
          {clientError}
        </p>
      ) : null}
      <button type="button" className="button" onClick={onPrepare} disabled={!configured || preparing || ready}>
        {ready ? "On-device model ready" : preparing ? "Downloading the on-device model…" : "Prepare on-device model"}
      </button>
      {preparing || (percent !== null && percent < 100 && !ready) ? (
        <div
          className="progress"
          role="progressbar"
          aria-label="On-device model download"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
        >
          <span className="progress-fill" style={{ width: `${percent ?? 8}%` }} />
        </div>
      ) : null}
      {percent !== null && preparing ? <p>{percent}% downloaded. The first download can take several minutes.</p> : null}
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      <p className="fine">On-device calls are free. They need desktop Chrome 139 or newer. Some versions also need the multimodal Prompt API flag.</p>
    </section>
  );
}

function availabilityTitle(availability: PromptAvailability): string {
  switch (availability) {
    case "unknown":
      return "Checking this browser…";
    case "missing":
      return "Not in this browser";
    case "unavailable":
      return "Unavailable on this computer";
    case "downloadable":
      return "Ready to download";
    case "downloading":
      return "Downloading";
    case "available":
      return "Available";
    case "error":
      return "Availability check failed";
    default: {
      const exhaustive: never = availability;
      return exhaustive;
    }
  }
}

function availabilityDetail(availability: PromptAvailability): string {
  switch (availability) {
    case "unknown":
      return "Checking whether this browser can run Gemini Nano on a JPEG or PNG.";
    case "missing":
      return "On-device reading needs desktop Chrome 139 or newer. Some versions also need the Gemini Nano multimodal flag.";
    case "unavailable":
      return "Chrome answered, but the on-device model cannot run on this computer.";
    case "downloadable":
      return "Gemini Nano can be downloaded. The first download can take several minutes and waits for a click.";
    case "downloading":
      return "Gemini Nano is already downloading in this browser.";
    case "available":
      return "Gemini Nano is on this computer and can read a JPEG or PNG.";
    case "error":
      return "The Prompt API did not answer an availability check.";
    default: {
      const exhaustive: never = availability;
      return exhaustive;
    }
  }
}
