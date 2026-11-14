import { BlacklineError } from "../errors.ts";
import { asCategory } from "../redaction/categories.ts";
import type { ModelFlag } from "../redaction/types.ts";

export interface ParsedExtraction {
  transcript: string;
  uncertain: boolean;
  flags: ModelFlag[];
}

export function parseExtractionJson(raw: string): ParsedExtraction {
  const data = parseJsonObject(raw);
  if (typeof data !== "object" || data === null) {
    throw new BlacklineError("The model returned an unexpected transcription.");
  }
  const record = data as Record<string, unknown>;
  if (typeof record.transcript !== "string" || record.transcript.trim().length === 0) {
    throw new BlacklineError("The model returned an empty transcription.");
  }
  return {
    transcript: record.transcript,
    uncertain: record.uncertain === true,
    flags: parseFlags(record.flags),
  };
}

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
      } catch {
        throw new BlacklineError("The model did not return JSON for the transcription.");
      }
    }
    throw new BlacklineError("The model did not return JSON for the transcription.");
  }
}

function parseFlags(value: unknown): ModelFlag[] {
  if (!Array.isArray(value)) return [];
  const flags: ModelFlag[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.text !== "string") continue;
    flags.push({ text: record.text, category: asCategory(record.category) });
  }
  return flags;
}
