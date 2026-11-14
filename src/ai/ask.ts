import {
  InferenceMode,
  type InferenceMode as InferenceModeName,
  type InferenceSource as InferenceSourceName,
} from "firebase/ai";
import { BlacklineError } from "../errors.ts";
import { buildQuestionPrompt } from "./prompts.ts";
import { questionModel } from "./models.ts";

export interface Answer {
  answer: string;
  payload: string;
  mode: InferenceModeName;
  inferenceSource: InferenceSourceName | null;
}

export async function askQuestion(input: {
  redactedText: string;
  question: string;
  mode:
    | typeof InferenceMode.ONLY_IN_CLOUD
    | typeof InferenceMode.PREFER_IN_CLOUD
    | typeof InferenceMode.ONLY_ON_DEVICE;
  onProgress?: (value: number) => void;
  simulateCloudFailure?: boolean;
}): Promise<Answer> {
  const question = input.question.trim();
  if (!question) throw new BlacklineError("Write a question first.");
  const payload = buildQuestionPrompt(input.redactedText, question);
  const model = questionModel(input.mode, { simulateCloudFailure: input.simulateCloudFailure });
  if (input.mode === InferenceMode.ONLY_ON_DEVICE) {
    await model.initializeDeviceModel(input.onProgress);
  }
  // Text only. The image and the unredacted transcript are not arguments to this call.
  const result = await model.generateContent(payload);
  const answer = result.response.text().trim();
  if (!answer) throw new BlacklineError("The model returned an empty answer.");
  return {
    answer,
    payload,
    mode: input.mode,
    inferenceSource: result.response.inferenceSource ?? null,
  };
}
