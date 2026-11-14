import {
  InferenceMode,
  InferenceSource,
  type InferenceMode as InferenceModeName,
  type InferenceSource as InferenceSourceName,
} from "firebase/ai";
import { EXTRACTION_PROMPT } from "./prompts.ts";
import { fileToInlinePart } from "./imagePart.ts";
import { extractionModel } from "./models.ts";
import { parseExtractionJson, type ParsedExtraction } from "./parseExtraction.ts";

export interface Extraction extends ParsedExtraction {
  mode: InferenceModeName;
  inferenceSource: InferenceSourceName | null;
}

export async function extractDocument(
  file: File,
  mode: InferenceModeName,
  onProgress?: (value: number) => void,
): Promise<Extraction> {
  const model = extractionModel(mode);
  if (mode === InferenceMode.PREFER_ON_DEVICE || mode === InferenceMode.ONLY_ON_DEVICE) {
    await model.initializeDeviceModel(onProgress);
  }
  const image = await fileToInlinePart(file);
  const result = await model.generateContent([EXTRACTION_PROMPT, image]);
  const parsed = parseExtractionJson(result.response.text());
  return { ...parsed, mode, inferenceSource: normalizeSource(result.response.inferenceSource) };
}

function normalizeSource(source: InferenceSourceName | undefined): InferenceSourceName | null {
  if (source === InferenceSource.ON_DEVICE || source === InferenceSource.IN_CLOUD) return source;
  return null;
}
