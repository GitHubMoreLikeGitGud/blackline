import { useEffect, useMemo, useState } from "react";
import { AIError, InferenceMode, InferenceSource } from "firebase/ai";
import { askQuestion } from "./ai/ask.ts";
import { SIMULATED_OUTAGE_BASE_URL } from "./ai/models.ts";
import { documentLeftDevice } from "./ai/labels.ts";
import { extractDocument } from "./ai/extract.ts";
import { AskPanel } from "./components/AskPanel.tsx";
import { BlacklineView } from "./components/BlacklineView.tsx";
import { ConfigNotice } from "./components/ConfigNotice.tsx";
import { DeviceModelPanel } from "./components/DeviceModelPanel.tsx";
import { IntakePanel } from "./components/IntakePanel.tsx";
import { ReadNote } from "./components/ReadNote.tsx";
import { messageFrom } from "./errors.ts";
import { ensureFirebase, getFirebaseClient } from "./firebase/client.ts";
import { readFirebaseSetup } from "./firebase/config.ts";
import { useDeviceModel } from "./hooks/useDeviceModel.ts";
import { useOnline } from "./hooks/useOnline.ts";
import { startNetworkWatch } from "./net/watch.ts";
import { applyRedaction } from "./redaction/redact.ts";
import { addUserRedaction, buildBlackline, toggleSpan } from "./redaction/merge.ts";
import type { Category } from "./redaction/categories.ts";
import { specimenById } from "./specimens.ts";
import type { AskResult, BlacklineDocument, LoadedFile } from "./session.ts";

const FALLBACK_QUESTION = "What is this document asking me to do?";

export default function App() {
  const setup = useMemo(() => readFirebaseSetup(), []);
  const browserOnline = useOnline();
  const [pretendOffline, setPretendOffline] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const online = browserOnline && !pretendOffline;
  const device = useDeviceModel(setup);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [doc, setDoc] = useState<BlacklineDocument | null>(null);
  const [readingWhere, setReadingWhere] = useState<"device" | "cloud" | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [ask, setAsk] = useState<AskResult | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const block = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (file) URL.revokeObjectURL(file.previewUrl);
    };
  }, [file]);

  if (setup.ok && !getFirebaseClient() && bootError === null) {
    try {
      ensureFirebase(setup);
    } catch (error) {
      setBootError(messageFrom(error));
    }
  }

  const client = getFirebaseClient();
  const heldCount = doc ? doc.spans.filter((span) => span.redacted).length : 0;
  const releasedCount = doc ? doc.spans.length - heldCount : 0;
  const redactedText = doc ? applyRedaction(doc.transcript, doc.spans) : "";
  const suggestion = (file?.specimenId ? specimenById(file.specimenId)?.suggestion : undefined) ?? FALLBACK_QUESTION;

  function takeFile(next: File, specimenId: string | null) {
    const previewUrl = URL.createObjectURL(next);
    setFile({ file: next, name: next.name, previewUrl, specimenId });
    setDoc(null);
    setAsk(null);
    setAskError(null);
    setReadError(null);
  }

  async function loadSpecimen(id: string) {
    const specimen = specimenById(id);
    if (!specimen) return;
    try {
      const response = await fetch(`/samples/${specimen.filename}`);
      if (!response.ok) throw new Error("The specimen image did not load.");
      const blob = await response.blob();
      takeFile(new File([blob], specimen.filename, { type: "image/png" }), specimen.id);
    } catch (error) {
      setReadError(messageFrom(error));
    }
  }

  function startPatternCheck() {
    if (!file?.specimenId) return;
    const specimen = specimenById(file.specimenId);
    if (!specimen) return;
    const built = buildBlackline(specimen.text, []);
    setDoc({ transcript: specimen.text, spans: built.spans, origin: { kind: "patterns" } });
    setAsk(null);
    setAskError(null);
    setReadError(null);
  }

  async function startRead(where: "device" | "cloud") {
    if (!file || !setup.ok) return;
    if (where === "device" && !device.canReadOnDevice) return;
    if (where === "cloud" && !online) return;
    setReadingWhere(where);
    setReadError(null);
    setDoc(null);
    setAsk(null);
    setAskError(null);
    const stopWatch = startNetworkWatch();
    try {
      ensureFirebase(setup);
      // A device read never falls back to the cloud: the photo leaves only through the consent button.
      const mode = where === "cloud" ? InferenceMode.ONLY_IN_CLOUD : InferenceMode.ONLY_ON_DEVICE;
      const extraction = await extractDocument(file.file, mode, device.reportProgress);
      const network = stopWatch();
      const built = buildBlackline(extraction.transcript, extraction.flags);
      setDoc({
        transcript: extraction.transcript,
        spans: built.spans,
        origin: {
          kind: "model",
          mode: extraction.mode,
          inferenceSource: extraction.inferenceSource,
          uncertain: extraction.uncertain,
          unmatchedFlags: built.unmatched,
          network,
        },
      });
    } catch (error) {
      setReadError(messageFrom(error));
    } finally {
      stopWatch();
      setReadingWhere(null);
    }
  }

  function toggle(id: string) {
    setDoc((current) => (current ? { ...current, spans: toggleSpan(current.spans, id) } : current));
  }

  function addSelection(start: number, end: number, category: Category) {
    setDoc((current) =>
      current
        ? { ...current, spans: addUserRedaction(current.transcript, current.spans, start, end, category) }
        : current,
    );
  }

  async function submitQuestion(question: string) {
    if (!doc || !setup.ok) {
      setAskError("Add your Firebase config before a question can be sent. Every model call goes through Firebase AI Logic.");
      return;
    }
    const redacted = applyRedaction(doc.transcript, doc.spans);
    setAsking(true);
    setAskError(null);
    try {
      ensureFirebase(setup);
      if (!online) {
        if (!device.canReadOnDevice) {
          setAskError("You are offline, and the on-device model is not ready. The blackline stays here. Reconnect to ask the cloud.");
          return;
        }
        const answer = await askQuestion({
          redactedText: redacted,
          question,
          mode: InferenceMode.ONLY_ON_DEVICE,
          onProgress: device.reportProgress,
        });
        setAsk({ ...answer, question, leftDevice: documentLeftDevice(answer), limited: "offline" });
        return;
      }
      // Only redacted text is sent, so letting the SDK fall back to Gemini Nano is safe here.
      const answer = await askQuestion({
        redactedText: redacted,
        question,
        mode: InferenceMode.PREFER_IN_CLOUD,
        simulateCloudFailure: simulateFailure,
      });
      const fellBack = answer.inferenceSource === InferenceSource.ON_DEVICE;
      const limited = fellBack ? (simulateFailure ? "simulated" : "fallback") : null;
      setAsk({ ...answer, question, leftDevice: documentLeftDevice(answer), limited });
    } catch (error) {
      const simulating = online && simulateFailure;
      const simulatedFetch =
        simulating && error instanceof AIError && error.message.includes(SIMULATED_OUTAGE_BASE_URL);
      setAskError(
        simulatedFetch
          ? "Simulated cloud failure: the cloud call went to a blocked port on this computer and failed there, and Gemini Nano was not ready to answer instead. The question did not leave this device."
          : simulating
            ? `Cloud failure simulation was on. ${messageFrom(error)}`
            : messageFrom(error),
      );
    } finally {
      setAsking(false);
    }
  }

  const connection = !browserOnline
    ? "Browser offline"
    : pretendOffline
      ? "Demo offline"
      : simulateFailure
        ? "Demo cloud outage (questions only)"
        : "Browser online";
  const imageLeftDevice = Boolean(doc && doc.origin.kind === "model" && documentLeftDevice(doc.origin));

  return (
    <>
      <a className="skip" href="#main">
        Skip to the document
      </a>
      <header className="top">
        <div>
          <p className="eyebrow">Firebase AI Logic · hybrid inference</p>
          <h1 className="wordmark">Blackline</h1>
          <p className="pitch">The cloud only sees what you let through.</p>
        </div>
        <div className="connection">
          <p role="status">{connection}</p>
          <label className="switch">
            <input
              type="checkbox"
              checked={pretendOffline}
              onChange={(event) => setPretendOffline(event.target.checked)}
            />
            <span>Act as if offline</span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(event) => setSimulateFailure(event.target.checked)}
            />
            <span>Simulate a cloud failure for questions</span>
          </label>
        </div>
      </header>
      <main id="main">
        <p className="intro">
          Drop a scan of a bill, a lease, or a payslip. Gemini Nano reads it on this computer, you confirm the
          blackline, and only the redacted text can leave with your question.
        </p>
        {!setup.ok ? <ConfigNotice missing={setup.missing} /> : null}
        <div className="workspace">
          <div className="side">
            <DeviceModelPanel
              configured={setup.ok}
              projectId={setup.ok ? setup.config.projectId : null}
              appCheckMode={client?.appCheckMode ?? null}
              placeholderSiteKey={client?.placeholderSiteKey ?? false}
              clientError={bootError}
              availability={device.availability}
              phase={device.phase}
              progress={device.progress}
              error={device.error}
              onPrepare={() => void device.prepare()}
            />
            <IntakePanel
              file={file}
              readingWhere={readingWhere}
              configured={setup.ok}
              online={online}
              canReadOnDevice={device.canReadOnDevice}
              availability={device.availability}
              readError={readError}
              sentToCloud={imageLeftDevice}
              onChooseFile={(next) => takeFile(next, null)}
              onChooseSpecimen={(id) => void loadSpecimen(id)}
              onReadDevice={() => void startRead("device")}
              onReadCloud={() => void startRead("cloud")}
              onPatternCheck={startPatternCheck}
            />
          </div>
          <div className="stage">
            {doc ? (
              <>
                <ReadNote
                  origin={doc.origin}
                  canOfferCloud={setup.ok && online && readingWhere === null}
                  onRequestCloud={() => void startRead("cloud")}
                />
                <BlacklineView
                  transcript={doc.transcript}
                  spans={doc.spans}
                  heldCount={heldCount}
                  imageLeftDevice={imageLeftDevice}
                  onToggle={toggle}
                  onAdd={addSelection}
                />
                <AskPanel
                  redactedText={redactedText}
                  heldCount={heldCount}
                  releasedCount={releasedCount}
                  suggestion={suggestion}
                  configured={setup.ok}
                  online={online}
                  simulateFailure={simulateFailure}
                  deviceReady={device.canReadOnDevice}
                  asking={asking}
                  error={askError}
                  sent={ask}
                  onAsk={(question) => void submitQuestion(question)}
                />
              </>
            ) : (
              <section className="sheet empty">
                <h2>The blackline appears here</h2>
                <p>
                  Open a specimen or drop a scan. Struck-out details stay on this device until you reveal them. A
                  question sends only the redacted text.
                </p>
                {readingWhere ? (
                  <p role="status">
                    {readingWhere === "cloud"
                      ? "Reading the image in the cloud. You agreed it could leave."
                      : "Reading the image on this device."}
                  </p>
                ) : null}
              </section>
            )}
          </div>
        </div>
      </main>
      <footer>
        <p>
          Built for Google&apos;s #BuildHybridAI hackathon. On-device calls are free. Names and addresses still need a
          look from you — the pattern check covers emails, phones, IDs, cards, IBANs, accounts, and dates of birth.
        </p>
      </footer>
    </>
  );
}
