import { useState } from "react";
import { CLOUD_MODEL } from "../ai/models.ts";
import { buildQuestionPrompt } from "../ai/prompts.ts";
import { modeLabel } from "../ai/labels.ts";
import type { AskResult } from "../session.ts";
import { StepBadge } from "./StepBadge.tsx";

interface AskPanelProps {
  redactedText: string;
  heldCount: number;
  releasedCount: number;
  suggestion: string;
  configured: boolean;
  online: boolean;
  simulateFailure: boolean;
  deviceReady: boolean;
  asking: boolean;
  error: string | null;
  sent: AskResult | null;
  onAsk: (question: string) => void;
}

export function AskPanel({
  redactedText,
  heldCount,
  releasedCount,
  suggestion,
  configured,
  online,
  simulateFailure,
  deviceReady,
  asking,
  error,
  sent,
  onAsk,
}: AskPanelProps) {
  const [question, setQuestion] = useState("");
  const trimmed = question.trim();
  const livePayload = trimmed ? buildQuestionPrompt(redactedText, trimmed) : "";
  const triedCloud = Boolean(sent && (sent.leftDevice || sent.limited === "fallback"));
  const changedSinceSend = Boolean(sent && triedCloud && livePayload && livePayload !== sent.payload);
  const canAsk = configured && trimmed.length > 0 && !asking && (online || deviceReady);

  return (
    <section className="sheet ask" aria-labelledby="ask-title">
      <h2 id="ask-title">Ask</h2>
      {!online ? (
        <p className="callout device" role="status">
          You are offline. A question can stay on this device only if Gemini Nano is ready, and that answer is more
          limited than the cloud model. Nothing is sent while you are offline.
        </p>
      ) : simulateFailure ? (
        <p className="callout device" role="status">
          Cloud failure simulation is on for questions. The question goes to a blocked port on this computer instead
          of Google, so the call fails here. If Gemini Nano is ready, Firebase AI Logic answers with it instead; if
          not, the question ends with an error. The question and the redacted text do not leave this device.
        </p>
      ) : (
        <p>The cloud receives the redacted text and your question. The photo is not attached.</p>
      )}
      <p>
        {heldCount === 0
          ? "Nothing is held back. The cloud will see the page as it is shown."
          : releasedCount > 0
            ? `${releasedCount} revealed ${releasedCount === 1 ? "item" : "items"} will be included in the text that leaves this device.`
            : "Held items are replaced with labels such as [redacted:email] before the question is sent."}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!canAsk) return;
          onAsk(trimmed);
        }}
      >
        <label htmlFor="question">Question about the redacted page</label>
        <textarea
          id="question"
          value={question}
          maxLength={500}
          rows={4}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={suggestion}
        />
        <div className="ask-actions">
          <button type="button" className="button secondary" onClick={() => setQuestion(suggestion)}>
            Use a sample question
          </button>
          <button type="submit" className="button" disabled={!canAsk}>
            {asking
              ? "Asking…"
              : !online
                ? "Ask on this device"
                : simulateFailure
                  ? "Ask (cloud failure simulated)"
                  : "Send the redacted text to the cloud"}
          </button>
          <span className="fine">
            {question.length}/500
          </span>
        </div>
      </form>
      {!configured ? <p>Add your Firebase config before a question can be sent. Every model call goes through Firebase AI Logic.</p> : null}
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      {sent ? (
        <article className="answer" aria-live="polite">
          <p className="badge-row">
            <StepBadge source={sent.inferenceSource} />
            <span>Requested {modeLabel(sent.mode)}.</span>
          </p>
          {sent.limited === "offline" ? (
            <p>Limited on-device answer. You are offline, so the cloud model was not asked.</p>
          ) : sent.limited === "fallback" ? (
            <p>Limited on-device answer. The cloud call failed, so Gemini Nano answered on this device.</p>
          ) : sent.limited === "simulated" ? (
            <p>
              Limited on-device answer. Simulated cloud failure: the cloud call failed on this computer, so Gemini Nano
              answered here.
            </p>
          ) : null}
          <p className="answer-text">{sent.answer}</p>
        </article>
      ) : null}
      <details className="payload">
        <summary>
          {sent?.leftDevice
            ? "What the cloud saw"
            : sent?.limited === "fallback"
              ? "What was sent toward the cloud"
              : online && simulateFailure
                ? "What a cloud question would contain (simulation on: not sent)"
                : "What the cloud will see"}
        </summary>
        {sent && !triedCloud ? (
          <p>
            {sent.limited === "simulated"
              ? "The cloud call was simulated to fail on this computer, so the question never left it. Google's model endpoint did not receive it."
              : "The last answer stayed on this device. The cloud saw nothing."}
          </p>
        ) : null}
        {sent && triedCloud ? (
          <>
            {sent.leftDevice ? (
              <p>
                Exact string passed to Firebase AI Logic in {modeLabel(sent.mode)} with {CLOUD_MODEL}. The image was not
                part of this call.
              </p>
            ) : (
              <p>
                Exact string passed to Firebase AI Logic in {modeLabel(sent.mode)} with {CLOUD_MODEL}. The cloud call
                failed, so it may or may not have arrived. Gemini Nano answered on this device instead. The image was not
                part of this call.
              </p>
            )}
            {changedSinceSend ? (
              <p>
                The blackline changed after this was sent. The block below is what{" "}
                {sent.leftDevice ? "already left" : "was sent"}.
              </p>
            ) : null}
            <pre>{sent.payload}</pre>
          </>
        ) : livePayload ? (
          <>
            <p>
              {online && simulateFailure
                ? "Simulation on: this is the exact string a cloud question would use, but it will not leave this device. The image is not included."
                : "Not sent yet. This is the exact string a cloud question would use. The image is not included."}
            </p>
            <pre>{livePayload}</pre>
          </>
        ) : (
          <p>Write a question to preview the exact text. Held details are already replaced.</p>
        )}
      </details>
    </section>
  );
}
