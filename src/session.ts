import type { InferenceMode, InferenceSource } from "firebase/ai";
import type { NetworkReport } from "./net/watch.ts";
import type { RedactionSpan } from "./redaction/types.ts";

export interface LoadedFile {
  file: File;
  name: string;
  previewUrl: string;
  specimenId: string | null;
}

export type ReadOrigin =
  | { kind: "patterns" }
  | {
      kind: "model";
      mode: InferenceMode;
      inferenceSource: InferenceSource | null;
      uncertain: boolean;
      unmatchedFlags: number;
      network: NetworkReport | null;
    };

export interface BlacklineDocument {
  transcript: string;
  spans: RedactionSpan[];
  origin: ReadOrigin;
}

export interface AskResult {
  question: string;
  answer: string;
  payload: string;
  mode: InferenceMode;
  inferenceSource: InferenceSource | null;
  leftDevice: boolean;
  limited: "offline" | "fallback" | "simulated" | null;
}
