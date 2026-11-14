import { InferenceMode, InferenceSource } from "firebase/ai";
import { documentLeftDevice, modeLabel } from "../ai/labels.ts";
import type { NetworkReport } from "../net/watch.ts";
import type { ReadOrigin } from "../session.ts";
import { StepBadge } from "./StepBadge.tsx";

export function ReadNote({
  origin,
  canOfferCloud,
  onRequestCloud,
}: {
  origin: ReadOrigin;
  canOfferCloud: boolean;
  onRequestCloud: () => void;
}) {
  if (origin.kind === "patterns") {
    return (
      <div className="callout device">
        <p className="badge-row">
          <span className="badge device">ON DEVICE</span>
          <span>Pattern check. No model call.</span>
        </p>
        <p>
          This is the specimen text stored in the repo, not a model transcription. The image was not read and nothing
          was sent. Names and street addresses are not caught by patterns — select them below, or read the scan with
          Firebase AI Logic.
        </p>
      </div>
    );
  }

  const left = documentLeftDevice(origin);
  return (
    <div className={left ? "callout cloud" : "callout device"}>
      <p className="badge-row">
        <StepBadge source={origin.inferenceSource} />
        <span>Requested {modeLabel(origin.mode)}.</span>
      </p>
      <p>{modelExplanation(origin, left)}</p>
      {origin.network ? <p className="fine">{networkLine(origin.network)}</p> : null}
      {origin.unmatchedFlags > 0 ? (
        <p>
          {origin.unmatchedFlags} model {origin.unmatchedFlags === 1 ? "flag" : "flags"} could not be lined up with the
          transcription. The pattern check still ran.
        </p>
      ) : null}
      {origin.uncertain && !left && canOfferCloud ? (
        <>
          <p>
            This read was marked uncertain. Check every line before you ask a question. A cloud read sends the photo
            off this device.
          </p>
          <button type="button" className="button cloud" onClick={onRequestCloud}>
            Send the image for a cloud read
          </button>
        </>
      ) : null}
    </div>
  );
}

function networkLine(report: NetworkReport): string {
  if (!report.supported) {
    return "This browser could not count the page's network requests during the read.";
  }
  if (report.offDevice === 0) {
    return "The browser's Resource Timing API recorded no requests from this page to another computer during the read. It cannot see requests still running when the read ended, requests from embedded frames or workers, or Chrome's own traffic such as a model download.";
  }
  const noun = report.offDevice === 1 ? "request" : "requests";
  return `The browser's Resource Timing API recorded at least ${report.offDevice} ${noun} from this page to other computers during the read: ${report.hosts.join(", ")}.`;
}

function modelExplanation(
  origin: Extract<ReadOrigin, { kind: "model" }>,
  left: boolean,
): string {
  if (origin.inferenceSource === InferenceSource.ON_DEVICE) {
    return "The image was transcribed on this computer. The pattern check also ran here. Held items stay on this device.";
  }
  if (origin.mode === InferenceMode.ONLY_IN_CLOUD && left) {
    return "You agreed to send this photo to the cloud. The image left this device. The pattern check then ran locally on the transcription.";
  }
  if (origin.mode === InferenceMode.PREFER_ON_DEVICE && origin.inferenceSource === InferenceSource.IN_CLOUD) {
    return "The request preferred the on-device model, but Firebase AI Logic reported a cloud read. This photo left your device.";
  }
  if (left) {
    return "Firebase AI Logic reported a cloud read. This photo left your device.";
  }
  return "Firebase AI Logic did not report an inference source for this read. Treat the page as if it may have left the device until you confirm the badge.";
}
