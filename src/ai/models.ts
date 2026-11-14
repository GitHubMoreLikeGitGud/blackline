import {
  getGenerativeModel,
  InferenceMode,
  type GenerativeModel,
  type InferenceMode as InferenceModeName,
} from "firebase/ai";
import { getFirebaseClient } from "../firebase/client.ts";
import { BlacklineError } from "../errors.ts";
import { extractionSchema } from "./schema.ts";

/** Default cloud model documented for Firebase JS SDK 13 hybrid inference. */
export const CLOUD_MODEL = "gemini-3.5-flash-lite";

export function extractionModel(mode: InferenceModeName): GenerativeModel {
  return getGenerativeModel(requireAI(), {
    mode,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
      },
    },
    onDeviceParams: {
      createOptions: {
        expectedInputs: [
          { type: "text", languages: ["en"] },
          { type: "image" },
        ],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      },
      promptOptions: {
        responseConstraint: extractionSchema,
      },
    },
  });
}

/**
 * Port 9 on this computer. Browsers refuse to connect to it (a restricted port), so the model request
 * fails before it leaves the device and the SDK's own PREFER_IN_CLOUD fallback runs. An App Check
 * token refresh can still go out first.
 */
export const SIMULATED_OUTAGE_BASE_URL = "http://127.0.0.1:9";

export function questionModel(
  mode: InferenceModeName,
  options: { simulateCloudFailure?: boolean } = {},
): GenerativeModel {
  return getGenerativeModel(
    requireAI(),
    {
      mode,
      inCloudParams: {
        model: CLOUD_MODEL,
        generationConfig: {
          maxOutputTokens: 800,
        },
      },
      onDeviceParams: {
        createOptions: {
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }],
        },
      },
    },
    options.simulateCloudFailure ? { baseUrl: SIMULATED_OUTAGE_BASE_URL } : undefined,
  );
}

export function requireAI() {
  const current = getFirebaseClient();
  if (!current) {
    throw new BlacklineError("Firebase is not ready. Add the web config, then try again.");
  }
  return current.ai;
}

export { InferenceMode };
