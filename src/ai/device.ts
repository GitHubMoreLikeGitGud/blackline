import { InferenceMode } from "firebase/ai";
import { extractionModel } from "./models.ts";

export type PromptAvailability =
  | "unknown"
  | "missing"
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available"
  | "error";

interface PromptSessionOptions {
  expectedInputs?: { type: string; languages?: string[] }[];
  expectedOutputs?: { type: string; languages?: string[] }[];
}

type AvailabilityFn = (options?: PromptSessionOptions) => Promise<unknown>;

export async function probePromptAvailability(): Promise<PromptAvailability> {
  const availability = readAvailability();
  if (!availability) return "missing";
  try {
    const value = await availability({
      expectedInputs: [
        { type: "text", languages: ["en"] },
        { type: "image" },
      ],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    });
    return normalizeAvailability(value);
  } catch {
    return "error";
  }
}

let prepareInflight: Promise<void> | null = null;

export function initializeOnDevice(onProgress: (value: number) => void): Promise<void> {
  if (prepareInflight) return prepareInflight;
  const model = extractionModel(InferenceMode.PREFER_ON_DEVICE);
  prepareInflight = model.initializeDeviceModel(onProgress).catch((error: unknown) => {
    prepareInflight = null;
    throw error;
  });
  return prepareInflight;
}

function readAvailability(): AvailabilityFn | null {
  if (typeof window === "undefined" || !("LanguageModel" in window)) return null;
  return availabilityFrom(window.LanguageModel);
}

// Chrome exposes LanguageModel as a class, so typeof is "function", not "object".
export function availabilityFrom(candidate: unknown): AvailabilityFn | null {
  if ((typeof candidate !== "object" && typeof candidate !== "function") || candidate === null) return null;
  if (!("availability" in candidate)) return null;
  const availability = (candidate as { availability?: unknown }).availability;
  if (typeof availability !== "function") return null;
  return availability.bind(candidate) as AvailabilityFn;
}

function normalizeAvailability(value: unknown): PromptAvailability {
  switch (value) {
    case "available":
    case "downloadable":
    case "downloading":
    case "unavailable":
      return value;
    default:
      return "error";
  }
}
