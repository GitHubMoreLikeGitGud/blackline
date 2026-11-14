import { describe, expect, it } from "vitest";
import { buildQuestionPrompt } from "../ai/prompts.ts";
import { specimens } from "../specimens.ts";
import { addUserRedaction, buildBlackline, toggleSpan } from "./merge.ts";
import { applyRedaction } from "./redact.ts";

const secrets = [
  "alex.specimen@example.com",
  "+65 8123 4567",
  "S1234567D",
  "15 March 1990",
  "4242 4242 4242 4242",
  "001234567890",
];

describe("redacted cloud payload", () => {
  it("keeps structured specimen secrets out of the question payload", () => {
    const medical = specimens.find((specimen) => specimen.id === "medical");
    if (!medical) throw new Error("Missing medical specimen");
    const { spans } = buildBlackline(medical.text, [
      { text: "Alex Specimen", category: "name" },
      { text: "8 Placeholder Walk, Singapore 000000", category: "address" },
    ]);
    const redacted = applyRedaction(medical.text, spans);
    const payload = buildQuestionPrompt(redacted, "What is the amount due?");

    for (const secret of secrets) {
      expect(payload).not.toContain(secret);
    }
    expect(payload).not.toContain("Alex Specimen");
    expect(payload).not.toContain("8 Placeholder Walk, Singapore 000000");
    expect(payload).toContain("[redacted:email]");
    expect(payload).toContain("[redacted:phone]");
    expect(payload).toContain("[redacted:id]");
    expect(payload).toContain("[redacted:dob]");
    expect(payload).toContain("[redacted:card]");
    expect(payload).toContain("[redacted:account]");
    expect(payload).toContain("[redacted:name]");
    expect(payload).toContain("[redacted:address]");
    expect(payload).toContain("Question:\nWhat is the amount due?");
    expect(payload).toContain("70.50");
    expect(payload).not.toContain("inlineData");
  });

  it("includes a detail again only after the reader reveals it", () => {
    const medical = specimens.find((specimen) => specimen.id === "medical");
    if (!medical) throw new Error("Missing medical specimen");
    const { spans } = buildBlackline(medical.text, []);
    const email = spans.find((span) => span.category === "email");
    if (!email) throw new Error("Email span missing");
    const revealed = toggleSpan(spans, email.id);
    const payload = buildQuestionPrompt(applyRedaction(medical.text, revealed), "Who is billed?");
    expect(payload).toContain("alex.specimen@example.com");
    expect(payload).not.toContain("+65 8123 4567");
  });

  it("lets the reader blackline a name the patterns missed", () => {
    const medical = specimens.find((specimen) => specimen.id === "medical");
    if (!medical) throw new Error("Missing medical specimen");
    const name = "Alex Specimen";
    const start = medical.text.indexOf(name);
    const { spans } = buildBlackline(medical.text, []);
    const withName = addUserRedaction(medical.text, spans, start, start + name.length, "name");
    const payload = buildQuestionPrompt(applyRedaction(medical.text, withName), "Who is the patient?");
    expect(payload).not.toContain(name);
    expect(payload).toContain("[redacted:name]");
  });

  it("merges a model flag with a pattern hit instead of duplicating it", () => {
    const text = "Phone: +65 8123 4567";
    const { spans, unmatched } = buildBlackline(text, [{ text: "+65 8123 4567", category: "phone" }]);
    expect(unmatched).toBe(0);
    expect(spans).toHaveLength(1);
    expect(spans[0]?.source).toBe("both");
    expect(spans[0]?.category).toBe("phone");
  });

  it("counts a model quote that is not in the transcript", () => {
    const { unmatched } = buildBlackline("Hello", [{ text: "Not on the page", category: "name" }]);
    expect(unmatched).toBe(1);
  });
});
