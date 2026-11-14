import { describe, expect, it } from "vitest";
import { BlacklineError } from "../errors.ts";
import { parseExtractionJson } from "./parseExtraction.ts";

describe("parseExtractionJson", () => {
  it("reads a JSON object and maps unknown categories to other", () => {
    const parsed = parseExtractionJson(
      JSON.stringify({
        transcript: "Patient: Alex Specimen",
        uncertain: false,
        flags: [
          { text: "Alex Specimen", category: "name" },
          { text: "mystery", category: "passport" },
        ],
      }),
    );
    expect(parsed.transcript).toBe("Patient: Alex Specimen");
    expect(parsed.uncertain).toBe(false);
    expect(parsed.flags).toEqual([
      { text: "Alex Specimen", category: "name" },
      { text: "mystery", category: "other" },
    ]);
  });

  it("accepts fenced JSON and a true uncertain flag", () => {
    const parsed = parseExtractionJson('```json\n{"transcript":"Line","uncertain":true,"flags":[]}\n```');
    expect(parsed).toEqual({ transcript: "Line", uncertain: true, flags: [] });
  });

  it("rejects an empty transcription", () => {
    expect(() => parseExtractionJson('{"transcript":"  ","uncertain":false,"flags":[]}')).toThrow(BlacklineError);
  });
});
