import { useState } from "react";
import type { PromptAvailability } from "../ai/device.ts";
import { imageKind } from "../ai/imagePart.ts";
import { specimens } from "../specimens.ts";
import type { LoadedFile } from "../session.ts";

interface IntakePanelProps {
  file: LoadedFile | null;
  readingWhere: "device" | "cloud" | null;
  configured: boolean;
  online: boolean;
  canReadOnDevice: boolean;
  availability: PromptAvailability;
  readError: string | null;
  sentToCloud: boolean;
  onChooseFile: (file: File) => void;
  onChooseSpecimen: (id: string) => void;
  onReadDevice: () => void;
  onReadCloud: () => void;
  onPatternCheck: () => void;
}

export function IntakePanel({
  file,
  readingWhere,
  configured,
  online,
  canReadOnDevice,
  availability,
  readError,
  sentToCloud,
  onChooseFile,
  onChooseSpecimen,
  onReadDevice,
  onReadCloud,
  onPatternCheck,
}: IntakePanelProps) {
  const [reject, setReject] = useState<string | null>(null);
  const reading = readingWhere !== null;
  const showCloudConsent = Boolean(file) && configured && online && !canReadOnDevice && !reading && !sentToCloud;

  function take(list: FileList | null) {
    const next = list?.[0];
    if (!next) return;
    if (!imageKind(next)) {
      setReject("Blackline reads JPEG and PNG only. On-device Gemini Nano does not accept PDFs or other formats.");
      return;
    }
    setReject(null);
    onChooseFile(next);
  }

  return (
    <section className="panel" aria-labelledby="intake-title">
      <h2 id="intake-title">The page</h2>
      <label
        className="drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          take(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
        />
        <span>Drop a JPEG or PNG scan, or choose a file</span>
      </label>
      <div className="samples" role="group" aria-label="Synthetic specimen documents">
        {specimens.map((specimen) => (
          <button
            key={specimen.id}
            type="button"
            className="sample"
            aria-pressed={file?.specimenId === specimen.id}
            onClick={() => onChooseSpecimen(specimen.id)}
          >
            <span className="sample-title">{specimen.title}</span>
            <span className="sample-blurb">{specimen.blurb}</span>
          </button>
        ))}
      </div>
      {file ? (
        <figure className="preview">
          <img src={file.previewUrl} alt={`Preview of ${file.name}`} />
          <figcaption>{file.name}</figcaption>
        </figure>
      ) : (
        <p>Nothing is sent when you drop a file. A read starts only from the buttons below.</p>
      )}
      {file?.specimenId ? (
        <button type="button" className="button secondary" onClick={onPatternCheck} disabled={reading}>
          Pattern-check the specimen text
        </button>
      ) : null}
      <button
        type="button"
        className="button"
        onClick={onReadDevice}
        disabled={!file || !configured || !canReadOnDevice || reading}
      >
        {readingWhere === "device" ? "Reading on this device…" : online ? "Read on this device" : "Read on this device offline"}
      </button>
      {!configured && file ? (
        <p>Add Firebase config before a model can read this scan. Specimen text can still be pattern-checked.</p>
      ) : null}
      {configured && file && !canReadOnDevice && !online ? (
        <p className="callout device">
          You are offline, and the on-device model is not ready, so this photo cannot be read and it will not be sent.
          Prepare Gemini Nano while you have a connection.
        </p>
      ) : null}
      {showCloudConsent ? (
        <div className="callout cloud" role="region" aria-label="Cloud read consent">
          <p>
            <strong>No on-device model is ready.</strong> {consentReason(availability)} Sending the photo to the cloud
            uploads the image. Personal details in the picture leave with it.
          </p>
          <button type="button" className="button cloud" onClick={onReadCloud} disabled={reading}>
            {readingWhere === "cloud" ? "Sending the image…" : "I understand — send this image to the cloud"}
          </button>
        </div>
      ) : null}
      {sentToCloud && !reading ? (
        <p className="callout cloud">
          This image was already sent to the cloud for the read shown here. Choose another page to read a new one.
        </p>
      ) : null}
      {reading ? (
        <p role="status">
          {readingWhere === "cloud" ? "The image is being read in the cloud." : "The image is being read on this device."}
        </p>
      ) : null}
      {reject ? (
        <p className="alert" role="alert">
          {reject}
        </p>
      ) : null}
      {readError ? (
        <p className="alert" role="alert">
          {readError}
        </p>
      ) : null}
    </section>
  );
}

function consentReason(availability: PromptAvailability): string {
  switch (availability) {
    case "missing":
      return "This browser has no Prompt API.";
    case "unavailable":
      return "Gemini Nano is unavailable on this computer.";
    case "downloadable":
    case "downloading":
      return "Download the on-device model first if you want the photo to stay here.";
    case "unknown":
      return "This browser has not confirmed an on-device model.";
    case "error":
      return "The on-device availability check failed.";
    case "available":
      return "Prepare the on-device model if you want the photo to stay here.";
    default: {
      const exhaustive: never = availability;
      return exhaustive;
    }
  }
}
